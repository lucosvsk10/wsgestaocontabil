import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = "https://basilisk-coop-n8n.zmdnad.easypanel.host/webhook/ws-site";
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 10 * 60 * 1000; // 10 minutes
const SIGNED_URL_EXPIRY = 3600; // 1 hour

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, competencia, file_url, file_name, event, document_id } = await req.json();

    console.log(`Processing document: ${file_name} for user ${user_id}`);

    // If document_id is provided, this is a retry
    let docId = document_id;
    let storagePath = file_url; // file_url now contains the storage path

    if (!docId) {
      // Find the document that was just inserted (using storage path)
      const { data: doc, error: docError } = await supabase
        .from('documentos_conciliacao')
        .select('id, url_storage, tentativas_processamento')
        .eq('user_id', user_id)
        .eq('competencia', competencia)
        .eq('url_storage', file_url)
        .single();

      if (docError) {
        console.error('Error finding document:', docError);
        return new Response(JSON.stringify({ error: 'Document not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      docId = doc.id;
      storagePath = doc.url_storage;
    } else {
      // This is a retry - fetch the storage path from DB
      const { data: doc, error: docError } = await supabase
        .from('documentos_conciliacao')
        .select('url_storage')
        .eq('id', docId)
        .single();

      if (docError) {
        console.error('Error fetching document for retry:', docError);
        return new Response(JSON.stringify({ error: 'Document not found for retry' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      storagePath = doc.url_storage;
    }

    // Generate a FRESH signed URL for this attempt
    console.log(`Generating fresh signed URL for storage path: ${storagePath}`);
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('lancamentos')
      .createSignedUrl(storagePath, SIGNED_URL_EXPIRY);

    if (signedUrlError) {
      console.error('Error generating signed URL:', signedUrlError);
      return new Response(JSON.stringify({ error: 'Failed to generate signed URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const freshSignedUrl = signedUrlData.signedUrl;
    console.log(`Fresh signed URL generated, valid for ${SIGNED_URL_EXPIRY} seconds`);

    // Update status to processing
    await supabase
      .from('documentos_conciliacao')
      .update({ status_processamento: 'processando' })
      .eq('id', docId);

    // Send to n8n with FRESH signed URL
    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: event || 'arquivos-brutos',
          document_id: docId,
          user_id,
          competencia,
          file_url: freshSignedUrl, // Always a fresh signed URL!
          storage_path: storagePath, // Also send path for reference
          file_name,
          timestamp: new Date().toISOString()
        })
      });

      if (!n8nResponse.ok) {
        throw new Error(`n8n returned ${n8nResponse.status}`);
      }

      const n8nData = await n8nResponse.json();
      console.log('n8n response:', n8nData);

      // Update document as processed
      await supabase
        .from('documentos_conciliacao')
        .update({
          status_processamento: 'processado',
          processado_em: new Date().toISOString(),
          dados_extraidos: n8nData.extracted_data || null,
          tentativas_processamento: 0 // Reset on success
        })
        .eq('id', docId);

      return new Response(JSON.stringify({ success: true, data: n8nData }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (n8nError: any) {
      console.error('n8n error:', n8nError);

      // Get current retry count
      const { data: currentDoc } = await supabase
        .from('documentos_conciliacao')
        .select('tentativas_processamento')
        .eq('id', docId)
        .single();

      const currentRetries = (currentDoc?.tentativas_processamento || 0) + 1;

      if (currentRetries >= MAX_RETRIES) {
        // Max retries reached - mark as error
        await supabase
          .from('documentos_conciliacao')
          .update({
            status_processamento: 'erro',
            tentativas_processamento: currentRetries,
            ultimo_erro: `Falha após ${MAX_RETRIES} tentativas: ${n8nError.message}`
          })
          .eq('id', docId);

        // Create notification for admin and user
        await supabase
          .from('notifications')
          .insert([
            {
              user_id,
              message: `Erro no processamento do arquivo: ${file_name}. Entre em contato com o suporte.`,
              type: 'erro_processamento'
            }
          ]);

        console.log(`Document ${docId} failed after ${MAX_RETRIES} retries`);

        return new Response(JSON.stringify({ 
          success: false, 
          error: 'Max retries reached',
          document_id: docId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      } else {
        // Schedule retry
        await supabase
          .from('documentos_conciliacao')
          .update({
            status_processamento: 'pendente',
            tentativas_processamento: currentRetries,
            ultimo_erro: `Tentativa ${currentRetries}/${MAX_RETRIES}: ${n8nError.message}`
          })
          .eq('id', docId);

        console.log(`Document ${docId} will retry (attempt ${currentRetries}/${MAX_RETRIES})`);

        // Use waitUntil for background retry scheduling
        EdgeRuntime.waitUntil(
          new Promise(resolve => {
            setTimeout(async () => {
              try {
                // Trigger retry
                await fetch(`${supabaseUrl}/functions/v1/process-document-queue`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${supabaseServiceKey}`
                  },
                  body: JSON.stringify({
                    user_id,
                    competencia,
                    file_url,
                    file_name,
                    event,
                    document_id: docId
                  })
                });
              } catch (e) {
                console.error('Retry scheduling error:', e);
              }
              resolve(true);
            }, RETRY_DELAY_MS);
          })
        );

        return new Response(JSON.stringify({ 
          success: false, 
          retrying: true,
          attempt: currentRetries,
          document_id: docId
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }
    }

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
