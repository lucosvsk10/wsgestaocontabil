import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Check if user has admin privileges using user_roles table
const checkIsAdmin = async (supabase: any, userId: string): Promise<boolean> => {
  const { data: roles, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
  
  // Only database role determines admin status
  return roles?.some(r => r.role === 'admin') || false;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get Authorization header to verify admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization header required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the calling user is an admin
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: callingUser }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !callingUser) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if calling user is admin using database role only (NO hardcoded emails)
    const isAdmin = await checkIsAdmin(supabase, callingUser.id);

    if (!isAdmin) {
      console.log(`User ${callingUser.email} attempted to close month but is not admin`);
      return new Response(JSON.stringify({ error: 'Apenas administradores podem fechar meses' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_id, competencia } = await req.json();

    console.log(`Admin ${callingUser.email} closing month ${competencia} for user ${user_id}`);

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

    // Get all aligned lancamentos for this month (using correct table name)
    const { data: lancamentos, error: lancError } = await supabase
      .from('lancamentos_alinhados')
      .select('*')
      .eq('user_id', user_id)
      .eq('competencia', competencia);

    if (lancError) {
      console.error('Error fetching lancamentos:', lancError);
      throw lancError;
    }

    if (!lancamentos || lancamentos.length === 0) {
      return new Response(JSON.stringify({ error: 'Nenhum lançamento alinhado para fechar' }), {
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
