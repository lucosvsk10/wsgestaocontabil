
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Autenticação inválida" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Criar cliente Supabase com service role key
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Obter JWT do cabeçalho de autorização
    const jwt = authHeader.replace("Bearer ", "");
    
    // Verificar o token e obter o usuário
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Usuário não autenticado" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Verificar se o usuário tem permissão (apenas emails específicos)
    if (caller.email !== "wsgestao@gmail.com" && caller.email !== "l09022007@gmail.com") {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores específicos podem acessar esta função." }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Obter dados da requisição
    const requestData = await req.json();
    const { operation } = requestData;

    // Executar operação solicitada
    if (operation === "change_role") {
      const { userId, role } = requestData;

      if (!userId) {
        return new Response(JSON.stringify({ error: "ID do usuário não fornecido" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      if (!role || !["admin", "fiscal", "contabil", "geral"].includes(role)) {
        return new Response(JSON.stringify({ error: "Função inválida fornecida" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Atualizar a função do usuário na tabela users
      const { error: updateError } = await supabaseAdmin
        .from('users')
        .update({ role: role })
        .eq('id', userId);

      if (updateError) {
        return new Response(JSON.stringify({ error: "Erro ao atualizar função do usuário", details: updateError }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      return new Response(JSON.stringify({ 
        message: "Função do usuário atualizada com sucesso", 
        userId, 
        role 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    } else {
      return new Response(JSON.stringify({ error: "Operação não suportada" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(JSON.stringify({ error: "Erro interno no servidor", details: String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
