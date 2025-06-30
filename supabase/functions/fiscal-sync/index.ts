
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface FiscalNote {
  noteType: string;
  accessKey: string;
  issueDate: string;
  value: number;
  cfop?: string;
  issuerCnpj: string;
  recipientCnpj: string;
  status: string;
  xmlContent: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    ncm?: string;
    cst?: string;
    cfop?: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { companyId, startDate, endDate } = await req.json();

    // Get company details
    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .single();

    if (companyError) {
      throw new Error(`Company not found: ${companyError.message}`);
    }

    console.log(`Starting fiscal sync for company: ${company.company_name}`);

    // Simulate API calls to SEFAZ and Receita Federal
    const fiscalNotes = await simulateFiscalApiCall(company, startDate, endDate);

    let processedCount = 0;
    let errorCount = 0;

    for (const note of fiscalNotes) {
      try {
        // Check if note already exists
        const { data: existingNote } = await supabase
          .from('fiscal_notes')
          .select('id')
          .eq('access_key', note.accessKey)
          .single();

        if (existingNote) {
          console.log(`Note ${note.accessKey} already exists, skipping`);
          continue;
        }

        // Upload XML to storage
        const xmlFileName = `${note.accessKey}.xml`;
        const { data: xmlUpload, error: xmlError } = await supabase.storage
          .from('fiscal-documents')
          .upload(`xml/${xmlFileName}`, note.xmlContent, {
            contentType: 'application/xml'
          });

        if (xmlError) {
          console.error(`Error uploading XML: ${xmlError.message}`);
          errorCount++;
          continue;
        }

        const xmlUrl = supabase.storage
          .from('fiscal-documents')
          .getPublicUrl(`xml/${xmlFileName}`).data.publicUrl;

        // Insert fiscal note
        const { data: insertedNote, error: noteError } = await supabase
          .from('fiscal_notes')
          .insert({
            company_id: companyId,
            note_type: note.noteType,
            access_key: note.accessKey,
            xml_url: xmlUrl,
            issue_date: note.issueDate,
            value: note.value,
            cfop: note.cfop,
            issuer_cnpj: note.issuerCnpj,
            recipient_cnpj: note.recipientCnpj,
            status: note.status
          })
          .select()
          .single();

        if (noteError) {
          console.error(`Error inserting note: ${noteError.message}`);
          errorCount++;
          continue;
        }

        // Insert note items
        if (note.items && note.items.length > 0) {
          const noteItems = note.items.map(item => ({
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
            console.error(`Error inserting note items: ${itemsError.message}`);
          }
        }

        processedCount++;
        console.log(`Processed note: ${note.accessKey}`);

      } catch (error) {
        console.error(`Error processing note ${note.accessKey}:`, error);
        errorCount++;
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedCount,
        errorCount,
        totalFound: fiscalNotes.length
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Fiscal sync error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Simulate API calls to fiscal services
async function simulateFiscalApiCall(company: any, startDate: string, endDate: string): Promise<FiscalNote[]> {
  // This is a simulation - in production, this would make real API calls to SEFAZ and Receita Federal
  console.log(`Simulating API calls for ${company.company_name} from ${startDate} to ${endDate}`);
  
  // Generate some sample fiscal notes
  const sampleNotes: FiscalNote[] = [];
  
  for (let i = 1; i <= 5; i++) {
    const accessKey = `35240${company.cnpj.replace(/\D/g, '')}${String(i).padStart(9, '0')}`;
    const issueDate = new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    sampleNotes.push({
      noteType: Math.random() > 0.5 ? 'NF-e' : 'NFC-e',
      accessKey,
      issueDate,
      value: Math.round((Math.random() * 10000 + 100) * 100) / 100,
      cfop: '5102',
      issuerCnpj: Math.random() > 0.5 ? company.cnpj : generateRandomCnpj(),
      recipientCnpj: Math.random() > 0.5 ? generateRandomCnpj() : company.cnpj,
      status: 'issued',
      xmlContent: generateSampleXml(accessKey),
      items: [
        {
          description: `Produto ${i}`,
          quantity: Math.ceil(Math.random() * 10),
          unitPrice: Math.round((Math.random() * 100 + 10) * 100) / 100,
          totalPrice: Math.round((Math.random() * 1000 + 100) * 100) / 100,
          ncm: '12345678',
          cst: '00',
          cfop: '5102'
        }
      ]
    });
  }
  
  return sampleNotes;
}

function generateRandomCnpj(): string {
  const base = Math.floor(Math.random() * 100000000);
  return `${String(base).padStart(8, '0')}0001${Math.floor(Math.random() * 100)}`;
}

function generateSampleXml(accessKey: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<nfeProc>
  <NFe>
    <infNFe Id="NFe${accessKey}">
      <ide>
        <cUF>35</cUF>
        <cNF>${accessKey.slice(-8)}</cNF>
        <natOp>Venda</natOp>
        <mod>55</mod>
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
    </infNFe>
  </NFe>
</nfeProc>`;
}
