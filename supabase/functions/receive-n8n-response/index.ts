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

    const body = await req.json();
    const { document_id, success, extracted_data, error_message, event } = body;

    console.log(`Received n8n response for document ${document_id}:`, { success, event });

    if (event === 'arquivos-brutos') {
      // Update document with extracted data
      if (success) {
        await supabase
          .from('documentos_conciliacao')
          .update({
            status_processamento: 'processado',
            processado_em: new Date().toISOString(),
            dados_extraidos: extracted_data,
            tentativas_processamento: 0
          })
          .eq('id', document_id);

        console.log(`Document ${document_id} marked as processed`);

      } else {
        // Get current retry count to decide if we should mark as error
        const { data: doc } = await supabase
          .from('documentos_conciliacao')
          .select('tentativas_processamento, user_id, nome_arquivo')
          .eq('id', document_id)
          .single();

        const currentRetries = (doc?.tentativas_processamento || 0) + 1;

        if (currentRetries >= 5) {
          await supabase
            .from('documentos_conciliacao')
            .update({
              status_processamento: 'erro',
              tentativas_processamento: currentRetries,
              ultimo_erro: error_message || 'Erro no processamento n8n'
            })
            .eq('id', document_id);

          // Notify user
          if (doc?.user_id) {
            await supabase
              .from('notifications')
              .insert({
                user_id: doc.user_id,
                message: `Erro no processamento do arquivo: ${doc.nome_arquivo}`,
                type: 'erro_processamento'
              });
          }
        } else {
          await supabase
            .from('documentos_conciliacao')
            .update({
              status_processamento: 'pendente',
              tentativas_processamento: currentRetries,
              ultimo_erro: error_message || 'Erro temporário'
            })
            .eq('id', document_id);
        }
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
