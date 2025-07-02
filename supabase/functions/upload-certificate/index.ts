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
    const { companyId, certificateData, password } = await req.json();

    if (!companyId || !certificateData || !password) {
      return new Response(
        JSON.stringify({ success: false, message: 'Dados obrigatórios não fornecidos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Inicializar cliente Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log(`Processando upload de certificado para empresa: ${companyId}`);

    // Para fins de demonstração, vamos simular a criptografia
    // Em produção, use uma biblioteca de criptografia adequada
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    // Simulação de criptografia (base64 encode)
    const encryptedCertificate = btoa(certificateData);
    const encryptedPassword = btoa(password);

    // Salvar no banco de dados
    const { error } = await supabase
      .from('companies')
      .update({
        certificate_data: encryptedCertificate,
        certificate_password: encryptedPassword,
        updated_at: new Date().toISOString()
      })
      .eq('id', companyId);

    if (error) {
      console.error('Erro ao salvar certificado:', error);
      throw new Error('Erro ao salvar certificado no banco de dados');
    }

    console.log('Certificado salvo com sucesso');

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Certificado salvo com sucesso'
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Erro no upload do certificado:', error);
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Erro interno do servidor' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});