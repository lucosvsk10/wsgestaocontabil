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
  
  return roles?.some(r => r.role === 'admin') || false;
};

// Count duplicates
const countDuplicates = (lancamentos: any[]): number => {
  const seen = new Set<string>();
  let duplicateCount = 0;

  for (const l of lancamentos) {
    const key = `${l.data}|${l.valor}|${l.historico}|${l.debito}|${l.credito}`;
    if (seen.has(key)) {
      duplicateCount++;
    } else {
      seen.add(key);
    }
  }

  return duplicateCount;
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

    // Check if calling user is admin
    const isAdmin = await checkIsAdmin(supabase, callingUser.id);

    if (!isAdmin) {
      return new Response(JSON.stringify({ error: 'Apenas administradores podem verificar status' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { user_id, competencia } = await req.json();

    console.log(`Checking close month status for user ${user_id}, competencia ${competencia}`);

    // Check if already closed
    const { data: existingFechamento } = await supabase
      .from('fechamentos_exportados')
      .select('id, created_at')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .single();

    if (existingFechamento) {
      return new Response(JSON.stringify({ 
        can_close: false,
        is_closed: true,
        message: 'Mês já está fechado'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Check for unprocessed documents
    const { data: pendingDocs } = await supabase
      .from('documentos_brutos')
      .select('id, nome_arquivo, status_processamento')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .in('status_processamento', ['nao_processado', 'processando']);

    // Check for documents with alignment errors
    const { data: errorDocs } = await supabase
      .from('documentos_brutos')
      .select('id, nome_arquivo, ultimo_erro')
      .eq('user_id', user_id)
      .eq('competencia', competencia)
      .eq('status_alinhamento', 'erro');

    // Get lancamentos to count duplicates
    const { data: lancamentos } = await supabase
      .from('lancamentos_alinhados')
      .select('id, data, valor, historico, debito, credito')
      .eq('user_id', user_id)
      .eq('competencia', competencia);

    const totalLancamentos = lancamentos?.length || 0;
    const duplicatesCount = lancamentos ? countDuplicates(lancamentos) : 0;
    const pendingDocsCount = pendingDocs?.length || 0;
    const errorDocsCount = errorDocs?.length || 0;

    const canClose = totalLancamentos > 0 && pendingDocsCount === 0 && errorDocsCount === 0;

    const response = {
      can_close: canClose,
      is_closed: false,
      total_lancamentos: totalLancamentos,
      duplicates_count: duplicatesCount,
      pending_docs: pendingDocs?.map(d => ({ id: d.id, nome: d.nome_arquivo, status: d.status_processamento })) || [],
      error_docs: errorDocs?.map(d => ({ id: d.id, nome: d.nome_arquivo, erro: d.ultimo_erro })) || [],
      warnings: [] as string[]
    };

    if (pendingDocsCount > 0) {
      response.warnings.push(`${pendingDocsCount} documento(s) pendente(s) de processamento`);
    }
    if (errorDocsCount > 0) {
      response.warnings.push(`${errorDocsCount} documento(s) com erro de alinhamento`);
    }
    if (duplicatesCount > 0) {
      response.warnings.push(`${duplicatesCount} lançamento(s) duplicado(s) serão removidos`);
    }
    if (totalLancamentos === 0) {
      response.warnings.push('Nenhum lançamento alinhado para este mês');
    }

    return new Response(JSON.stringify(response), {
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
