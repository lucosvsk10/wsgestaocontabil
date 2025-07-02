import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FiscalNote {
  note_type: string;
  access_key: string;
  issue_date: string;
  value: number;
  issuer_cnpj: string;
  recipient_cnpj: string;
  xml_content: string;
}

// Função para simular busca de notas de VENDA (NF-e emitidas pela empresa)
async function fetchSaleNotes(cnpj: string, certificate: string, password: string): Promise<FiscalNote[]> {
  // Simular timeout de rede e possíveis erros
  await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
  
  if (Math.random() > 0.9) {
    throw new Error('Timeout na comunicação com SEFAZ');
  }
  
  // Simular parsing de resposta da SEFAZ
  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<infNFe>
  <ide>
    <cUF>35</cUF>
    <cNF>12345678</cNF>
    <natOp>Venda</natOp>
    <mod>55</mod>
    <serie>1</serie>
    <nNF>000000001</nNF>
    <dhEmi>${new Date().toISOString()}</dhEmi>
  </ide>
  <emit>
    <CNPJ>${cnpj}</CNPJ>
    <xNome>Empresa Emitente</xNome>
  </emit>
  <dest>
    <CNPJ>12345678901234</CNPJ>
    <xNome>Cliente Destinatário</xNome>
  </dest>
  <total>
    <ICMSTot>
      <vNF>1500.00</vNF>
    </ICMSTot>
  </total>
</infNFe>`;

  // Em produção: aqui faria requisições reais para SEFAZ com o certificado
  // usando bibliotecas específicas para comunicação com webservices SOAP
  
  return [
    {
      note_type: 'NF-e',
      access_key: generateAccessKey(),
      issue_date: new Date().toISOString().split('T')[0],
      value: 1500.00,
      issuer_cnpj: cnpj,
      recipient_cnpj: '12345678901234',
      xml_content: mockXml
    },
    {
      note_type: 'NF-e', 
      access_key: generateAccessKey(),
      issue_date: new Date(Date.now() - 86400000).toISOString().split('T')[0], // ontem
      value: 850.50,
      issuer_cnpj: cnpj,
      recipient_cnpj: '98765432109876',
      xml_content: mockXml.replace('1500.00', '850.50')
    }
  ];
}

// Função para simular busca de notas de COMPRA (Distribuição DF-e da RF)
async function fetchPurchaseNotes(cnpj: string, certificate: string, password: string): Promise<FiscalNote[]> {
  // Simular timeout de rede e possíveis erros
  await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 2500));
  
  if (Math.random() > 0.85) {
    throw new Error('Erro de autenticação com Receita Federal');
  }
  
  // Simular parsing de resposta da Distribuição DF-e
  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<infNFe>
  <ide>
    <cUF>35</cUF>
    <cNF>87654321</cNF>
    <natOp>Compra</natOp>
    <mod>55</mod>
    <serie>1</serie>
    <nNF>000000002</nNF>
    <dhEmi>${new Date().toISOString()}</dhEmi>
  </ide>
  <emit>
    <CNPJ>11111111111111</CNPJ>
    <xNome>Fornecedor Emitente</xNome>
  </emit>
  <dest>
    <CNPJ>${cnpj}</CNPJ>
    <xNome>Empresa Destinatária</xNome>
  </dest>
  <total>
    <ICMSTot>
      <vNF>2300.00</vNF>
    </ICMSTot>
  </total>
</infNFe>`;

  // Placeholder para NFS-e (Notas de Serviço) - futuras integrações por prefeitura
  // TODO: Implementar integrações específicas para NFS-e conforme cada prefeitura
  // Cada município tem sua própria API e padrões para consulta de NFS-e
  
  return [
    {
      note_type: 'NF-e',
      access_key: generateAccessKey(),
      issue_date: new Date().toISOString().split('T')[0],
      value: 2300.00,
      issuer_cnpj: '11111111111111',
      recipient_cnpj: cnpj,
      xml_content: mockXml
    },
    {
      note_type: 'NF-e',
      access_key: generateAccessKey(), 
      issue_date: new Date(Date.now() - 172800000).toISOString().split('T')[0], // 2 dias atrás
      value: 975.25,
      issuer_cnpj: '22222222222222',
      recipient_cnpj: cnpj,
      xml_content: mockXml.replace('2300.00', '975.25')
    }
  ];
}

// Função auxiliar para gerar chave de acesso válida (44 dígitos)
function generateAccessKey(): string {
  const timestamp = Date.now().toString();
  const random = Math.random().toString().slice(2);
  return (timestamp + random + '0000000000000000000000000000').slice(0, 44);
}

// Função para parsing de XML (simulada - em produção usar parser XML real)
function parseXMLContent(xmlContent: string): Partial<FiscalNote> {
  // Em produção: usar DOMParser ou biblioteca XML para extrair dados
  // Aqui é apenas uma simulação básica
  
  const accessKeyMatch = xmlContent.match(/<chNFe>(.*?)<\/chNFe>/);
  const valueMatch = xmlContent.match(/<vNF>(.*?)<\/vNF>/);
  const issuerMatch = xmlContent.match(/<emit>[\s\S]*?<CNPJ>(.*?)<\/CNPJ>/);
  const recipientMatch = xmlContent.match(/<dest>[\s\S]*?<CNPJ>(.*?)<\/CNPJ>/);
  
  return {
    access_key: accessKeyMatch?.[1] || generateAccessKey(),
    value: parseFloat(valueMatch?.[1] || '0'),
    issuer_cnpj: issuerMatch?.[1] || '',
    recipient_cnpj: recipientMatch?.[1] || ''
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { companyId, cnpj, type } = await req.json();

    if (!companyId || !cnpj || !type) {
      return new Response(
        JSON.stringify({ success: false, message: 'Dados obrigatórios não fornecidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!['purchase', 'sale'].includes(type)) {
      return new Response(
        JSON.stringify({ success: false, message: 'Tipo deve ser "purchase" ou "sale"' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Buscando notas fiscais de ${type} para CNPJ: ${cnpj}`);

    // Buscar dados da empresa e certificado
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('certificate_data, certificate_password')
      .eq('id', companyId)
      .single();

    if (companyError || !company.certificate_data) {
      return new Response(
        JSON.stringify({ success: false, message: 'Empresa não encontrada ou certificado não configurado' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Descriptografar certificado (simulação - em produção usar criptografia real)
    const decryptedCertificate = atob(company.certificate_data);
    const decryptedPassword = atob(company.certificate_password);

    let notesFound = [];
    let errorMessage = '';

    try {
      if (type === 'sale') {
        // Simulação de comunicação com SEFAZ para notas de VENDA (NF-e emitidas)
        console.log('Simulando comunicação com SEFAZ para notas de venda...');
        
        // Em produção: usar certificado para autenticar com SEFAZ
        // e consultar NF-e emitidas pela empresa
        notesFound = await fetchSaleNotes(cnpj, decryptedCertificate, decryptedPassword);
        
      } else if (type === 'purchase') {
        // Simulação de comunicação com RF para notas de COMPRA (Distribuição DF-e)
        console.log('Simulando comunicação com Receita Federal para notas de compra...');
        
        // Em produção: usar certificado para autenticar com RF
        // e consultar NF-e recebidas via Distribuição DF-e
        notesFound = await fetchPurchaseNotes(cnpj, decryptedCertificate, decryptedPassword);
      }
    } catch (error) {
      console.error(`Erro na comunicação com ${type === 'sale' ? 'SEFAZ' : 'Receita Federal'}:`, error);
      errorMessage = error.message || 'Erro na comunicação com os órgãos fiscais';
    }

    if (errorMessage) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: errorMessage 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Processar e salvar as notas encontradas
    let newNotesCount = 0;
    let duplicatesCount = 0;

    for (const note of notesFound) {
      try {
        // Verificar se a nota já existe para evitar duplicatas
        const { data: existingNote } = await supabase
          .from('fiscal_notes')
          .select('id')
          .eq('access_key', note.access_key)
          .eq('company_id', companyId)
          .single();

        if (existingNote) {
          duplicatesCount++;
          console.log(`Nota ${note.access_key} já existe, ignorando...`);
          continue;
        }

        // Inserir nova nota
        const { error: insertError } = await supabase
          .from('fiscal_notes')
          .insert({
            company_id: companyId,
            note_type: note.note_type,
            access_key: note.access_key,
            issue_date: note.issue_date,
            value: note.value,
            issuer_cnpj: note.issuer_cnpj,
            recipient_cnpj: note.recipient_cnpj,
            xml_url: null, // XML será armazenado na coluna xml_url se necessário
            status: 'issued'
          });

        if (insertError) {
          console.error('Erro ao salvar nota fiscal:', insertError);
        } else {
          newNotesCount++;
        }
      } catch (error) {
        console.error('Erro ao processar nota:', error);
      }
    }

    console.log(`Processamento concluído: ${newNotesCount} novas notas, ${duplicatesCount} duplicatas ignoradas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: newNotesCount,
        duplicates: duplicatesCount,
        total_found: notesFound.length,
        message: `${newNotesCount} novas notas fiscais encontradas e salvas`
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro ao buscar notas fiscais:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro na comunicação com SEFAZ' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});