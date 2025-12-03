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

    // Get auth token from request
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Verify the calling user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check if caller is admin
    const { data: callerData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    const isAdmin = callerData?.role === 'admin';
    
    if (!isAdmin) {
      console.log(`User ${user.id} attempted to reopen month without admin privileges`);
      return new Response(JSON.stringify({ error: 'Only administrators can reopen months' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_id, competencia } = await req.json();

    if (!user_id || !competencia) {
      return new Response(JSON.stringify({ error: 'Missing user_id or competencia' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Admin ${user.id} reopening month ${competencia} for user ${user_id}`);

    // Delete from fechamentos_exportados
    const { error: fechamentoError } = await supabase
      .from('fechamentos_exportados')
      .delete()
      .eq('user_id', user_id)
      .eq('competencia', competencia);

    if (fechamentoError) {
      console.error('Error deleting fechamento:', fechamentoError);
    }

    // Parse competencia to get month and year
    const [year, month] = competencia.split('-');
    const monthNames: { [key: string]: string } = {
      '01': 'Janeiro', '02': 'Fevereiro', '03': 'Março', '04': 'Abril',
      '05': 'Maio', '06': 'Junho', '07': 'Julho', '08': 'Agosto',
      '09': 'Setembro', '10': 'Outubro', '11': 'Novembro', '12': 'Dezembro'
    };
    const monthName = monthNames[month] || month;

    // Delete from month_closures
    const { error: closureError } = await supabase
      .from('month_closures')
      .delete()
      .eq('user_id', user_id)
      .eq('month', monthName)
      .eq('year', parseInt(year));

    if (closureError) {
      console.error('Error deleting month_closure:', closureError);
    }

    // Get user info for notification
    const { data: targetUser } = await supabase
      .from('users')
      .select('name, email')
      .eq('id', user_id)
      .single();

    // Notify user about reopening
    await supabase
      .from('notifications')
      .insert({
        user_id: user_id,
        message: `O mês ${monthName}/${year} foi reaberto pelo administrador. Novos documentos podem ser enviados.`,
        type: 'mes_reaberto'
      });

    console.log(`Month ${competencia} reopened successfully for user ${user_id}`);

    return new Response(JSON.stringify({ 
      success: true,
      message: `Mês ${monthName}/${year} reaberto com sucesso`,
      user_name: targetUser?.name,
      competencia
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error reopening month:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
