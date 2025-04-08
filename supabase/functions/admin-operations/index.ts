
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

      if (!role || !["fiscal", "contabil", "geral", "client"].includes(role)) {
        return new Response(JSON.stringify({ error: "Função inválida fornecida" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Verificar se o usuário existe na tabela users
      const { data: existingUser, error: getUserError } = await supabaseAdmin
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (getUserError && getUserError.code !== 'PGRST116') {
        console.error("Error checking for existing user:", getUserError);
      }

      // Obter informações do usuário auth
      const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
      
      if (authUserError) {
        console.error("Error getting auth user:", authUserError);
        return new Response(JSON.stringify({ error: "Erro ao obter informações do usuário", details: authUserError }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      let updateResult;
      if (existingUser) {
        // Atualizar a função do usuário na tabela users
        updateResult = await supabaseAdmin
          .from('users')
          .update({ role: role })
          .eq('id', userId);
      } else {
        // Criar novo registro na tabela users
        updateResult = await supabaseAdmin
          .from('users')
          .insert({
            id: userId,
            name: authUser.user?.user_metadata?.name || null,
            email: authUser.user?.email || null,
            role: role
          });
      }

      if (updateResult.error) {
        return new Response(JSON.stringify({ error: "Erro ao atualizar função do usuário", details: updateResult.error }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }

      // Especial: Se o usuário for julia@gmail.com, certifique-se de que a função é 'fiscal'
      if (authUser.user?.email === "julia@gmail.com" && role !== "fiscal") {
        // Log para debug
        console.log("Setting julia@gmail.com to fiscal role regardless of requested role");
        
        const juliaUpdateResult = await supabaseAdmin
          .from('users')
          .update({ role: 'fiscal' })
          .eq('id', userId);
          
        if (juliaUpdateResult.error) {
          console.error("Error setting Julia's role to fiscal:", juliaUpdateResult.error);
        }
      }

      return new Response(JSON.stringify({ 
        message: "Função do usuário atualizada com sucesso", 
        userId, 
        role 
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    } else if (operation === "delete_user") {
      // Handle user deletion
      const { userId } = requestData;
      
      if (!userId) {
        return new Response(JSON.stringify({ error: "ID do usuário não fornecido" }), { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      // First delete from users table
      const { error: deleteUserError } = await supabaseAdmin
        .from('users')
        .delete()
        .eq('id', userId);
        
      if (deleteUserError) {
        console.error("Error deleting from users table:", deleteUserError);
      }
      
      // Then delete the auth user
      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId);
      
      if (deleteAuthError) {
        return new Response(JSON.stringify({ 
          error: "Erro ao excluir usuário", 
          details: deleteAuthError 
        }), { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      
      return new Response(JSON.stringify({ 
        message: "Usuário excluído com sucesso", 
        userId 
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
