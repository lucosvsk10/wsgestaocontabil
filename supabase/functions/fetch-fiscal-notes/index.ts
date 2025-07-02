import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Descriptografar certificado (simulação)
    const decryptedCertificate = atob(company.certificate_data);
    const decryptedPassword = atob(company.certificate_password);

    // Simulação de comunicação com SEFAZ/RF
    // Em produção, aqui você faria a comunicação real com os webservices
    console.log('Simulando comunicação com SEFAZ...');
    
    // Simular algumas notas fiscais encontradas
    const mockNotes = [
      {
        note_type: 'NF-e',
        access_key: '12345678901234567890123456789012345678901234',
        issue_date: new Date().toISOString().split('T')[0],
        value: 1500.00,
        issuer_cnpj: type === 'purchase' ? '12345678901234' : cnpj,
        recipient_cnpj: type === 'purchase' ? cnpj : '12345678901234',
        is_purchase: type === 'purchase',
        xml_content: '<xml>Conteúdo simulado do XML</xml>'
      },
      {
        note_type: 'NFC-e',
        access_key: '12345678901234567890123456789012345678901235',
        issue_date: new Date().toISOString().split('T')[0],
        value: 850.50,
        issuer_cnpj: type === 'purchase' ? '12345678901234' : cnpj,
        recipient_cnpj: type === 'purchase' ? cnpj : '12345678901234',
        is_purchase: type === 'purchase',
        xml_content: '<xml>Conteúdo simulado do XML</xml>'
      }
    ];

    // Salvar as notas no banco de dados
    for (const note of mockNotes) {
      const { error: insertError } = await supabase
        .from('fiscal_notes')
        .upsert({
          ...note,
          company_id: companyId
        }, {
          onConflict: 'access_key'
        });

      if (insertError) {
        console.error('Erro ao salvar nota fiscal:', insertError);
      }
    }

    console.log(`${mockNotes.length} notas fiscais processadas`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        count: mockNotes.length,
        message: `${mockNotes.length} notas fiscais encontradas e salvas`
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