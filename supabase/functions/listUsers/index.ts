
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Check if user has admin privileges using user_roles table
const checkIsAdmin = async (supabaseAdmin: any, userId: string): Promise<boolean> => {
  const { data: roles, error } = await supabaseAdmin
    .from('user_roles')
    .select('role')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error checking admin role:', error);
    return false;
  }
  
  const adminRoles = ['admin', 'fiscal', 'contabil', 'geral'];
  return roles?.some(r => adminRoles.includes(r.role)) || false;
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

    // Verificar se o usuário tem permissão usando role do banco de dados
    const isAdmin = await checkIsAdmin(supabaseAdmin, caller.id);
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores podem acessar esta função." }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Listar usuários do auth.users
    const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      return new Response(JSON.stringify({ error: "Erro ao buscar usuários", details: usersError }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    // Filtrar apenas os campos necessários
    const filteredUsers = data.users.map(user => ({
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      user_metadata: user.user_metadata
    }));
    
    return new Response(JSON.stringify({ users: filteredUsers }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(JSON.stringify({ error: "Erro interno no servidor", details: String(error) }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
