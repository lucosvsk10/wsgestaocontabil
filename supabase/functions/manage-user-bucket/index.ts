import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, month, year } = await req.json();
    
    if (!userId || !month || !year) {
      throw new Error('Missing required fields: userId, month, year');
    }

    // Criar nome do bucket: user_123abc_lancamentos_2025_01
    const bucketName = `user_${userId}_lancamentos_${year}_${month}`;
    
    console.log(`📦 Verificando/criando bucket: ${bucketName}`);
    
    // Usar service role para gerenciar buckets
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se bucket já existe
    const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
    
    if (listError) {
      console.error('Error listing buckets:', listError);
      throw listError;
    }

    const bucketExists = buckets?.some(b => b.id === bucketName);
    
    if (!bucketExists) {
      // Criar novo bucket privado
      const { data, error: createError } = await supabaseAdmin.storage.createBucket(bucketName, {
        public: false,
        fileSizeLimit: 52428800, // 50MB
        allowedMimeTypes: [
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'application/vnd.ms-excel',
          'text/csv'
        ]
      });

      if (createError) {
        console.error('Error creating bucket:', createError);
        throw createError;
      }

      console.log(`✅ Bucket created: ${bucketName}`);
      
      return new Response(
        JSON.stringify({ 
          bucketName, 
          created: true,
          message: `Bucket ${bucketName} criado com sucesso`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`ℹ️ Bucket já existe: ${bucketName}`);
    
    return new Response(
      JSON.stringify({ 
        bucketName, 
        created: false,
        message: `Bucket ${bucketName} já existe`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in manage-user-bucket:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
