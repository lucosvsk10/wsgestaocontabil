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

    const { user_id, competencia } = await req.json();

    console.log(`Closing month ${competencia} for user ${user_id}`);

    // Get user info
    const { data: userInfo } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user_id)
      .single();

    // Check if already closed
    const { data: existingFechamento } = await supabase
      .from('fechamentos_exportados')
      .select('id')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .single();

    if (existingFechamento) {
      return new Response(JSON.stringify({ error: 'Mês já foi fechado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Get all processed documents for this month
    const { data: documents, error: docsError } = await supabase
      .from('documentos_conciliacao')
      .select('*')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .eq('status_processamento', 'processado');

    if (docsError) throw docsError;

    if (!documents || documents.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum documento processado para fechar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create initial fechamento record
    const { data: fechamento, error: fechError } = await supabase
      .from('fechamentos_exportados')
      .insert({
        user_id,
        user_name: userInfo?.name,
        user_email: userInfo?.email,
        competencia,
        status: 'processando',
        total_lancamentos: 0
      })
      .select()
      .single();

    if (fechError) throw fechError;

    // Collect all extracted data
    const dadosBrutos = documents.map(doc => ({
      documento_id: doc.id,
      tipo: doc.tipo_documento,
      nome_arquivo: doc.nome_arquivo,
      dados_extraidos: doc.dados_extraidos
    }));

    // Send to n8n for final processing
    try {
      const n8nResponse = await fetch(N8N_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'fechar-mes',
          fechamento_id: fechamento.id,
          user_id,
          user_name: userInfo?.name,
          user_email: userInfo?.email,
          competencia,
          dados_brutos: dadosBrutos,
          timestamp: new Date().toISOString()
        })
      });

      if (!n8nResponse.ok) {
        throw new Error(`n8n returned ${n8nResponse.status}`);
      }

      const n8nData = await n8nResponse.json();
      console.log('n8n close-month response:', n8nData);

      // Process the cleaned data from n8n
      const lancamentos = n8nData.lancamentos || [];

      if (lancamentos.length > 0) {
        // Insert lancamentos into lancamentos_processados
        const lancamentosToInsert = lancamentos.map((l: any) => ({
          user_id,
          competencia,
          data: l.data,
          valor: l.valor,
          historico: l.historico,
          debito: l.debito,
          credito: l.credito
        }));

        await supabase
          .from('lancamentos_processados')
          .insert(lancamentosToInsert);
      }

      // Generate CSV content
      const csvHeader = 'Data,Valor,Historico,Debito,Credito\n';
      const csvContent = csvHeader + lancamentos.map((l: any) => 
        `${l.data || ''},${l.valor || ''},${(l.historico || '').replace(/,/g, ';')},${l.debito || ''},${l.credito || ''}`
      ).join('\n');

      // Upload CSV to storage
      const csvFileName = `${user_id}/${competencia}/lancamentos_${competencia}.csv`;
      await supabase.storage
        .from('lancamentos')
        .upload(csvFileName, csvContent, {
          contentType: 'text/csv',
          upsert: true
        });

      const { data: csvUrlData } = supabase.storage
        .from('lancamentos')
        .getPublicUrl(csvFileName);

      // Update fechamento with results
      await supabase
        .from('fechamentos_exportados')
        .update({
          status: 'concluido',
          total_lancamentos: lancamentos.length,
          arquivo_csv_url: csvUrlData.publicUrl,
          arquivo_excel_url: n8nData.excel_url || null // n8n can provide Excel URL if it generates one
        })
        .eq('id', fechamento.id);

      // Record in month_closures
      await supabase
        .from('month_closures')
        .insert({
          user_id,
          user_name: userInfo?.name || '',
          user_email: userInfo?.email || '',
          month: competencia.split('-')[1],
          year: parseInt(competencia.split('-')[0]),
          status: 'fechado'
        });

      // Notify user
      await supabase
        .from('notifications')
        .insert({
          user_id,
          message: `Mês ${competencia} fechado com sucesso! ${lancamentos.length} lançamentos processados.`,
          type: 'mes_fechado'
        });

      return new Response(JSON.stringify({ 
        success: true, 
        fechamento_id: fechamento.id,
        total_lancamentos: lancamentos.length,
        csv_url: csvUrlData.publicUrl
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });

    } catch (n8nError: any) {
      console.error('n8n error:', n8nError);

      // Update fechamento as error
      await supabase
        .from('fechamentos_exportados')
        .update({
          status: 'erro'
        })
        .eq('id', fechamento.id);

      throw n8nError;
    }

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
