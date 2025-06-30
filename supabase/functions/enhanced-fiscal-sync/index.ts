
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FiscalSyncRequest {
  companyId: string;
  startDate: string;
  endDate: string;
  documentTypes?: string[]; // ['nfe', 'nfce', 'nfse', 'cte', 'mdfe']
}

interface SyncResult {
  processedCount: number;
  errorCount: number;
  totalFound: number;
  errors: string[];
  syncLogId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let syncLogId: string | null = null;

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { companyId, startDate, endDate, documentTypes = ['nfe', 'nfce'] }: FiscalSyncRequest = await req.json();

    // Buscar dados da empresa e certificado
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      throw new Error('Company not found');
    }

    // Buscar certificado ativo
    const { data: certificate, error: certError } = await supabase
      .from('fiscal_certificates')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .single();

    if (certError || !certificate) {
      throw new Error('Active certificate not found for company');
    }

    // Criar log de sincronização
    const { data: syncLog, error: logError } = await supabase
      .from('fiscal_sync_logs')
      .insert({
        company_id: companyId,
        sync_type: 'api_call',
        periodo_inicio: startDate,
        periodo_fim: endDate,
        status: 'iniciado',
        created_by: '00000000-0000-0000-0000-000000000000' // System user
      })
      .select()
      .single();

    if (logError || !syncLog) {
      throw new Error('Failed to create sync log');
    }

    syncLogId = syncLog.id;
    console.log(`Starting enhanced fiscal sync for company ${company.company_name} (${syncLogId})`);

    const syncStartTime = Date.now();
    let processedCount = 0;
    let errorCount = 0;
    let totalFound = 0;
    const errors: string[] = [];

    // Processar cada tipo de documento
    for (const docType of documentTypes) {
      try {
        const result = await syncDocumentType(supabase, company, certificate, docType, startDate, endDate);
        processedCount += result.processed;
        errorCount += result.errors;
        totalFound += result.found;
        
        if (result.errorMessages.length > 0) {
          errors.push(...result.errorMessages);
        }
      } catch (error) {
        console.error(`Error syncing ${docType}:`, error);
        errorCount++;
        errors.push(`Erro ao sincronizar ${docType}: ${error.message}`);
      }
    }

    const syncDuration = Math.floor((Date.now() - syncStartTime) / 1000);

    // Atualizar log de sincronização
    await supabase
      .from('fiscal_sync_logs')
      .update({
        status: errorCount > 0 ? 'concluido_com_erros' : 'concluido',
        documentos_encontrados: totalFound,
        documentos_processados: processedCount,
        documentos_erro: errorCount,
        mensagem_erro: errors.length > 0 ? errors.join('; ') : null,
        tempo_duracao: syncDuration,
        completed_at: new Date().toISOString()
      })
      .eq('id', syncLogId);

    const result: SyncResult = {
      processedCount,
      errorCount,
      totalFound,
      errors,
      syncLogId
    };

    console.log(`Sync completed: ${processedCount} processed, ${errorCount} errors`);

    return new Response(
      JSON.stringify({ success: true, ...result }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Enhanced fiscal sync error:', error);

    // Atualizar log com erro se existe
    if (syncLogId) {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      );

      await supabase
        .from('fiscal_sync_logs')
        .update({
          status: 'erro',
          mensagem_erro: error.message,
          completed_at: new Date().toISOString()
        })
        .eq('id', syncLogId);
    }

    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

async function syncDocumentType(supabase: any, company: any, certificate: any, docType: string, startDate: string, endDate: string) {
  console.log(`Syncing ${docType} for company ${company.company_name}`);

  let processed = 0;
  let errors = 0;
  let found = 0;
  const errorMessages: string[] = [];

  try {
    // Simular consulta às APIs fiscais baseada no tipo de documento
    const documents = await queryFiscalAPI(company, certificate, docType, startDate, endDate);
    found = documents.length;

    for (const doc of documents) {
      try {
        // Verificar se já existe
        const { data: existing } = await supabase
          .from('fiscal_notes')
          .select('id')
          .eq('access_key', doc.accessKey)
          .single();

        if (existing) {
          console.log(`Document ${doc.accessKey} already exists, skipping`);
          continue;
        }

        // Processar XML e extrair dados
        const xmlData = await parseXMLDocument(doc.xml);

        // Upload do XML para storage
        const xmlFileName = `${doc.accessKey}.xml`;
        const { data: xmlUpload } = await supabase.storage
          .from('fiscal-documents')
          .upload(`xml/${xmlFileName}`, doc.xml, {
            contentType: 'application/xml'
          });

        const xmlUrl = xmlUpload ? supabase.storage
          .from('fiscal-documents')
          .getPublicUrl(`xml/${xmlFileName}`).data.publicUrl : null;

        // Inserir nota fiscal
        const { data: insertedNote, error: noteError } = await supabase
          .from('fiscal_notes')
          .insert({
            company_id: company.id,
            note_type: docType.toUpperCase(),
            access_key: doc.accessKey,
            xml_url: xmlUrl,
            issue_date: doc.issueDate,
            value: doc.value,
            cfop: xmlData.cfop,
            issuer_cnpj: doc.issuerCnpj,
            recipient_cnpj: doc.recipientCnpj,
            status: 'issued'
          })
          .select()
          .single();

        if (noteError) {
          throw new Error(`Failed to insert note: ${noteError.message}`);
        }

        // Inserir itens da nota se existirem
        if (xmlData.items && xmlData.items.length > 0) {
          const noteItems = xmlData.items.map(item => ({
            note_id: insertedNote.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unitPrice,
            total_price: item.totalPrice,
            ncm: item.ncm,
            cst: item.cst,
            cfop: item.cfop
          }));

          const { error: itemsError } = await supabase
            .from('note_items')
            .insert(noteItems);

          if (itemsError) {
            console.error(`Error inserting items for note ${doc.accessKey}:`, itemsError);
          }
        }

        processed++;
        console.log(`Processed ${docType} document: ${doc.accessKey}`);

      } catch (docError) {
        console.error(`Error processing document ${doc.accessKey}:`, docError);
        errors++;
        errorMessages.push(`${doc.accessKey}: ${docError.message}`);
      }
    }

  } catch (typeError) {
    console.error(`Error syncing document type ${docType}:`, typeError);
    errors++;
    errorMessages.push(`Erro geral ${docType}: ${typeError.message}`);
  }

  return { processed, errors, found, errorMessages };
}

// Simular consulta às APIs fiscais com retry logic
async function queryFiscalAPI(company: any, certificate: any, docType: string, startDate: string, endDate: string, retryCount = 0) {
  const maxRetries = 3;
  const baseDelay = 1000; // 1 segundo

  try {
    console.log(`Querying ${docType} API for company ${company.cnpj} (attempt ${retryCount + 1})`);

    // Simular delay de API
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // Simular falha ocasional para demonstrar retry logic
    if (Math.random() < 0.1 && retryCount < maxRetries) {
      throw new Error('Temporary API failure');
    }

    // Gerar documentos simulados baseados no tipo
    const documents = generateSimulatedDocuments(company, docType, startDate, endDate);
    
    console.log(`Found ${documents.length} ${docType} documents`);
    return documents;

  } catch (error) {
    console.error(`API query failed for ${docType} (attempt ${retryCount + 1}):`, error);

    if (retryCount < maxRetries) {
      const delay = baseDelay * Math.pow(2, retryCount); // Exponential backoff
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return queryFiscalAPI(company, certificate, docType, startDate, endDate, retryCount + 1);
    }

    throw error;
  }
}

// Gerar documentos simulados baseados no tipo
function generateSimulatedDocuments(company: any, docType: string, startDate: string, endDate: string) {
  const documents = [];
  const count = Math.floor(Math.random() * 5) + 1; // 1-5 documentos

  for (let i = 1; i <= count; i++) {
    const accessKey = generateAccessKey(company.cnpj, docType, i);
    const issueDate = generateRandomDate(startDate, endDate);
    
    documents.push({
      accessKey,
      issueDate,
      value: Math.round((Math.random() * 10000 + 100) * 100) / 100,
      issuerCnpj: Math.random() > 0.5 ? company.cnpj : generateRandomCnpj(),
      recipientCnpj: Math.random() > 0.5 ? generateRandomCnpj() : company.cnpj,
      xml: generateSampleXML(accessKey, docType)
    });
  }

  return documents;
}

function generateAccessKey(cnpj: string, docType: string, sequence: number) {
  const cleanCnpj = cnpj.replace(/\D/g, '');
  const typeCode = getDocumentTypeCode(docType);
  const year = new Date().getFullYear().toString().slice(-2);
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  return `35${year}${month}${cleanCnpj}${typeCode}001${String(sequence).padStart(9, '0')}`;
}

function getDocumentTypeCode(docType: string): string {
  const codes = {
    'nfe': '55',
    'nfce': '65',
    'nfse': '99', // Simplificado
    'cte': '57',
    'mdfe': '58'
  };
  return codes[docType] || '55';
}

function generateRandomDate(startDate: string, endDate: string): string {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const randomTime = start.getTime() + Math.random() * (end.getTime() - start.getTime());
  return new Date(randomTime).toISOString().split('T')[0];
}

function generateRandomCnpj(): string {
  const base = Math.floor(Math.random() * 100000000);
  return `${String(base).padStart(8, '0')}0001${Math.floor(Math.random() * 100)}`;
}

async function parseXMLDocument(xmlContent: string) {
  // Simular parsing de XML - em produção usar parser XML adequado
  return {
    cfop: '5102',
    items: [
      {
        description: 'Produto simulado',
        quantity: Math.ceil(Math.random() * 10),
        unitPrice: Math.round((Math.random() * 100 + 10) * 100) / 100,
        totalPrice: Math.round((Math.random() * 1000 + 100) * 100) / 100,
        ncm: '12345678',
        cst: '00',
        cfop: '5102'
      }
    ]
  };
}

function generateSampleXML(accessKey: string, docType: string): string {
  const docTypeUpper = docType.toUpperCase();
  return `<?xml version="1.0" encoding="UTF-8"?>
<${docTypeUpper}Proc>
  <${docTypeUpper}>
    <inf${docTypeUpper} Id="${docTypeUpper}${accessKey}">
      <ide>
        <cUF>35</cUF>
        <cNF>${accessKey.slice(-8)}</cNF>
        <natOp>Venda</natOp>
        <mod>${getDocumentTypeCode(docType)}</mod>
        <serie>1</serie>
        <nNF>${accessKey.slice(-9)}</nNF>
        <dhEmi>${new Date().toISOString()}</dhEmi>
        <tpNF>1</tpNF>
        <idDest>1</idDest>
        <cMunFG>3550308</cMunFG>
        <tpImp>1</tpImp>
        <tpEmis>1</tpEmis>
        <cDV>0</cDV>
        <tpAmb>2</tpAmb>
        <finNFe>1</finNFe>
        <indFinal>1</indFinal>
        <indPres>1</indPres>
      </ide>
    </inf${docTypeUpper}>
  </${docTypeUpper}>
</${docTypeUpper}Proc>`;
}
