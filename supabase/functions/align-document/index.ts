import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const N8N_WEBHOOK_URL = "https://basilisk-coop-n8n.zmdnad.easypanel.host/webhook/ws-site";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { document_id } = await req.json();

    console.log(`Starting alignment for document ${document_id}`);

    // Get document data from renamed table
    const { data: doc, error: docError } = await supabase
      .from('documentos_brutos')
      .select('*')
      .eq('id', document_id)
      .single();

    if (docError || !doc) {
      console.error('Document not found:', docError);
      return new Response(JSON.stringify({ error: 'Document not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Only align documents that are already processed (transcribed)
    if (doc.status_processamento !== 'concluido') {
      console.log(`Document ${document_id} not ready for alignment (status: ${doc.status_processamento})`);
      return new Response(JSON.stringify({ error: 'Document not ready for alignment' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Update alignment status to processing
    await supabase
      .from('documentos_brutos')
      .update({ status_alinhamento: 'processando' })
      .eq('id', document_id);

    // Get user info
    const { data: userInfo } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', doc.user_id)
      .single();

    // Get plano de contas (REQUIRED)
    const { data: planoData, error: planoError } = await supabase
      .from('planos_contas')
      .select('conteudo')
      .eq('user_id', doc.user_id)
      .single();

    if (planoError || !planoData) {
      console.error('Plano de contas not found for user:', doc.user_id);
      
      // Update alignment status to error
      await supabase
        .from('documentos_brutos')
        .update({ 
          status_alinhamento: 'erro',
          tentativas_alinhamento: (doc.tentativas_alinhamento || 0) + 1
        })
        .eq('id', document_id);

      // Notify user about missing plano de contas
      await supabase
        .from('notifications')
        .insert({
          user_id: doc.user_id,
          message: `Documento ${doc.nome_arquivo} não pode ser alinhado: Plano de Contas não cadastrado. Entre em contato com o escritório.`,
          type: 'erro_alinhamento'
        });

      return new Response(JSON.stringify({ 
        error: 'Plano de contas não cadastrado para este cliente' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found plano de contas for user ${doc.user_id} (${planoData.conteudo.length} chars)`);

    // Send to n8n for AI alignment
    try {
      console.log(`Sending document ${document_id} to n8n for alignment`);
      
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'alinhamento-documento',
          document_id: doc.id,
          user_id: doc.user_id,
          user_name: userInfo?.name,
          user_email: userInfo?.email,
          competencia: doc.competencia,
          tipo_documento: doc.tipo_documento,
          nome_arquivo: doc.nome_arquivo,
          dados_extraidos: doc.dados_extraidos,
          plano_contas: planoData.conteudo,
          timestamp: new Date().toISOString()
        })
      });

      if (!n8nResponse.ok) {
        throw new Error(`n8n returned ${n8nResponse.status}`);
      }

      const n8nData = await n8nResponse.json();
      console.log('n8n alignment response:', n8nData);

      // Process and save lancamentos
      const lancamentos = n8nData.lancamentos || [];

      if (lancamentos.length > 0) {
        const lancamentosToInsert = lancamentos.map((l: any) => ({
          user_id: doc.user_id,
          competencia: doc.competencia,
          documento_origem_id: doc.id,
          data: l.data,
          valor: l.valor,
          historico: l.historico,
          debito: l.debito,
          credito: l.credito
        }));

        // Insert into renamed table
        const { error: insertError } = await supabase
          .from('lancamentos_alinhados')
          .insert(lancamentosToInsert);

        if (insertError) {
          console.error('Error inserting lancamentos:', insertError);
          throw insertError;
        }

        console.log(`Inserted ${lancamentos.length} lancamentos for document ${document_id}`);
      }

      // Update document as aligned
      await supabase
        .from('documentos_brutos')
        .update({
          status_alinhamento: 'alinhado',
          alinhado_em: new Date().toISOString(),
          tentativas_alinhamento: 0
        })
        .eq('id', document_id);

      // Notify user
      await supabase
        .from('notifications')
        .insert({
          user_id: doc.user_id,
          message: `Documento ${doc.nome_arquivo} alinhado com sucesso! ${lancamentos.length} lançamentos processados.`,
          type: 'documento_alinhado'
        });

      return new Response(JSON.stringify({ 
        success: true, 
        document_id,
        lancamentos_count: lancamentos.length
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (n8nError: any) {
      console.error('n8n alignment error:', n8nError);
      
      // Update alignment status to error
      await supabase
        .from('documentos_brutos')
        .update({
          status_alinhamento: 'erro',
          tentativas_alinhamento: (doc.tentativas_alinhamento || 0) + 1
        })
        .eq('id', document_id);

      // Notify about error
      await supabase
        .from('notifications')
        .insert({
          user_id: doc.user_id,
          message: `Erro ao alinhar documento ${doc.nome_arquivo}. O sistema tentará novamente.`,
          type: 'erro_alinhamento'
        });

      return new Response(JSON.stringify({ 
        success: false, 
        error: n8nError.message 
      }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});