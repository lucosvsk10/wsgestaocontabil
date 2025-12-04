
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

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
  console.log("=== listUsers function called ===");
  
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    
    console.log("Creating admin client...");

    // Criar cliente admin para todas as operações
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar autenticação usando o JWT do header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No auth header");
      return new Response(JSON.stringify({ error: "Autenticação inválida" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const jwt = authHeader.replace("Bearer ", "");
    console.log("Validating JWT...");
    
    // Validar o JWT e obter o usuário
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (authError) {
      console.error("Auth error:", authError.message);
      return new Response(JSON.stringify({ error: "Usuário não autenticado", details: authError.message }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
    
    if (!caller) {
      console.error("No user returned");
      return new Response(JSON.stringify({ error: "Usuário não encontrado" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log("User authenticated:", caller.id, caller.email);

    // Verificar se o usuário tem permissão usando role do banco de dados
    const isAdmin = await checkIsAdmin(supabaseAdmin, caller.id);
    console.log("Is admin:", isAdmin);
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores podem acessar esta função." }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Listar usuários do auth.users
    const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (usersError) {
      console.error("Error listing users:", usersError);
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
    
    console.log("Returning", filteredUsers.length, "users");
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
