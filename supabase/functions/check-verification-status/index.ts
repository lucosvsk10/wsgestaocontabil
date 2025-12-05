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

    // Verify authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Authorization required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { verification_id } = await req.json();

    if (!verification_id) {
      return new Response(JSON.stringify({ error: 'verification_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    console.log(`Checking verification status for: ${verification_id}`);

    // Get fechamento by verification_id
    const { data: fechamento, error: fetchError } = await supabase
      .from('fechamentos_exportados')
      .select('*')
      .eq('verification_id', verification_id)
      .single();

    if (fetchError || !fechamento) {
      return new Response(JSON.stringify({ 
        error: 'Verificação não encontrada',
        status: 'erro'
      }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Return the current status
    const response: any = {
      status: fechamento.n8n_status || 'verificando',
      competencia: fechamento.competencia,
      total_lancamentos: fechamento.total_lancamentos
    };

    // If completed, include download info
    if (fechamento.n8n_status === 'concluido') {
      response.arquivo_excel_url = fechamento.arquivo_excel_url;
      response.arquivo_csv_url = fechamento.arquivo_csv_url;
      response.message = 'Fechamento concluído com sucesso';
    } else if (fechamento.n8n_status === 'erro') {
      response.message = 'Erro na verificação do n8n';
    } else {
      response.message = 'Aguardando resposta do n8n...';
    }

    console.log(`Verification status for ${verification_id}: ${response.status}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error: any) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message, status: 'erro' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
