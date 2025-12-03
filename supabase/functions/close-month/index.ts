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

    // Get all processed lancamentos for this month (already aligned)
    const { data: lancamentos, error: lancError } = await supabase
      .from('lancamentos_processados')
      .select('*')
      .eq('user_id', user_id)
      .eq('competencia', competencia);

    if (lancError) {
      console.error('Error fetching lancamentos:', lancError);
      throw lancError;
    }

    if (!lancamentos || lancamentos.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum lançamento processado para fechar' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Found ${lancamentos.length} lancamentos for closing`);

    // Generate CSV content
    const csvHeader = 'Data,Valor,Historico,Debito,Credito\n';
    const csvContent = csvHeader + lancamentos.map((l: any) => 
      `${l.data || ''},${l.valor || ''},${(l.historico || '').replace(/,/g, ';')},${l.debito || ''},${l.credito || ''}`
    ).join('\n');

    // Upload CSV to storage
    const csvFileName = `${user_id}/${competencia}/lancamentos_${competencia}.csv`;
    const { error: uploadError } = await supabase.storage
      .from('lancamentos')
      .upload(csvFileName, csvContent, {
        contentType: 'text/csv',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading CSV:', uploadError);
      throw uploadError;
    }

    const { data: csvUrlData } = supabase.storage
      .from('lancamentos')
      .getPublicUrl(csvFileName);

    // Create fechamento record
    const { data: fechamento, error: fechError } = await supabase
      .from('fechamentos_exportados')
      .insert({
        user_id,
        user_name: userInfo?.name,
        user_email: userInfo?.email,
        competencia,
        status: 'concluido',
        total_lancamentos: lancamentos.length,
        arquivo_csv_url: csvUrlData.publicUrl
      })
      .select()
      .single();

    if (fechError) {
      console.error('Error creating fechamento:', fechError);
      throw fechError;
    }

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
        message: `Mês ${competencia} fechado com sucesso! ${lancamentos.length} lançamentos exportados.`,
        type: 'mes_fechado'
      });

    console.log(`Month ${competencia} closed successfully with ${lancamentos.length} lancamentos`);

    return new Response(JSON.stringify({ 
      success: true, 
      fechamento_id: fechamento.id,
      total_lancamentos: lancamentos.length,
      csv_url: csvUrlData.publicUrl
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
