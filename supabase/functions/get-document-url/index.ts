import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { document_id, storage_path, expires_in = 3600 } = await req.json();

    console.log(`Generating signed URL for document: ${document_id || storage_path}`);

    let path = storage_path;

    // If document_id is provided, fetch the storage path from DB
    if (document_id && !storage_path) {
      const { data: doc, error: docError } = await supabase
        .from('documentos_conciliacao')
        .select('url_storage')
        .eq('id', document_id)
        .single();

      if (docError || !doc) {
        console.error('Document not found:', docError);
        return new Response(JSON.stringify({ error: 'Document not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      path = doc.url_storage;
    }

    if (!path) {
      return new Response(JSON.stringify({ error: 'No storage path provided' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Generate signed URL
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('lancamentos')
      .createSignedUrl(path, expires_in);

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      return new Response(JSON.stringify({ error: signedUrlError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Signed URL generated successfully for path: ${path}`);

    return new Response(JSON.stringify({ 
      signed_url: signedUrlData.signedUrl,
      expires_in,
      path
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
