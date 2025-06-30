
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CertificateUploadRequest {
  certificateData: string; // base64
  password: string;
  fileName: string;
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

    // Verificar autenticação
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authorization header required');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { certificateData, password, fileName }: CertificateUploadRequest = await req.json();

    if (!certificateData || !password || !fileName) {
      throw new Error('Missing required fields');
    }

    // Obter dados da empresa do usuário
    const { data: companyData, error: companyError } = await supabase
      .from('company_data')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (companyError || !companyData) {
      throw new Error('Company data not found');
    }

    // Encontrar a empresa correspondente
    const { data: company, error: companyFindError } = await supabase
      .from('companies')
      .select('id')
      .eq('cnpj', companyData.cnpj)
      .single();

    if (companyFindError || !company) {
      throw new Error('Company not found in fiscal system');
    }

    // Simular validação do certificado (em produção, usar bibliotecas crypto apropriadas)
    const certificateInfo = await validateCertificate(certificateData, password);

    // Criptografar dados do certificado (exemplo simplificado)
    const encryptedData = await encryptCertificateData(certificateData);
    const passwordHash = await hashPassword(password);

    // Desativar certificados antigos
    await supabase
      .from('fiscal_certificates')
      .update({ is_active: false })
      .eq('company_id', company.id);

    // Inserir novo certificado
    const { data: certificate, error: insertError } = await supabase
      .from('fiscal_certificates')
      .insert({
        company_id: company.id,
        certificate_name: fileName,
        certificate_data: encryptedData,
        password_hash: passwordHash,
        valid_from: certificateInfo.valid_from,
        valid_until: certificateInfo.valid_until,
        is_active: true,
        created_by: user.id
      })
      .select()
      .single();

    if (insertError) {
      throw new Error(`Failed to save certificate: ${insertError.message}`);
    }

    console.log(`Certificate uploaded successfully for company ${company.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        certificate: {
          id: certificate.id,
          name: certificate.certificate_name,
          valid_from: certificate.valid_from,
          valid_until: certificate.valid_until
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );

  } catch (error) {
    console.error('Certificate upload error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// Função simplificada para validar certificado (em produção, usar bibliotecas adequadas)
async function validateCertificate(certificateData: string, password: string) {
  // Simular validação do certificado
  // Em produção, usar bibliotecas como node-forge ou crypto para validar o .pfx
  console.log('Validating certificate...');
  
  // Simular datas de validade (extrair do certificado real)
  const now = new Date();
  const validFrom = new Date(now.getFullYear(), now.getMonth(), 1);
  const validUntil = new Date(now.getFullYear() + 3, now.getMonth(), 1);

  return {
    valid_from: validFrom.toISOString().split('T')[0],
    valid_until: validUntil.toISOString().split('T')[0],
    subject: 'Certificado Simulado',
    issuer: 'Autoridade Certificadora Simulada'
  };
}

// Função para criptografar dados do certificado
async function encryptCertificateData(certificateData: string): Promise<Uint8Array> {
  // Implementação simplificada - em produção usar criptografia adequada
  const encoder = new TextEncoder();
  const data = encoder.encode(certificateData);
  
  // Simular criptografia (em produção, usar AES ou similar)
  return data;
}

// Função para fazer hash da senha
async function hashPassword(password: string): Promise<string> {
  // Implementação simplificada - em produção usar bcrypt ou similar
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
