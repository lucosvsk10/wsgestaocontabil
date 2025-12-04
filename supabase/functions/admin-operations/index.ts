
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new Error("Autenticação inválida");
    }

    // Create Supabase client with service role key
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

    // Verify JWT from auth header
    const jwt = authHeader.replace("Bearer ", "");
    
    // Get user from JWT
    const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
    
    if (authError || !caller) {
      throw new Error("Usuário não autenticado");
    }

    // Check if user is admin using database role only (NO hardcoded emails)
    const isAdmin = await checkIsAdmin(supabaseAdmin, caller.id);
    
    if (!isAdmin) {
      throw new Error("Permissão negada. Apenas administradores podem realizar esta operação.");
    }
    
    // Parse request data
    const requestData = await req.json();
    
    // Handler for each operation
    switch(requestData.operation) {
      case "delete_user": {
        // Delete user from auth.users
        const { error } = await supabaseAdmin.auth.admin.deleteUser(requestData.userId);
        
        if (error) {
          console.error("Error deleting user:", error);
          throw new Error(`Erro ao excluir usuário: ${error.message}`);
        }
        
        return new Response(
          JSON.stringify({ success: true, message: "Usuário excluído com sucesso" }),
          { 
            status: 200, 
            headers: { ...corsHeaders, "Content-Type": "application/json" } 
          }
        );
      }
      
      default: {
        throw new Error("Operação não suportada");
      }
    }
    
  } catch (error) {
    console.error("Admin operations error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message || "Erro ao executar operação administrativa" }),
      { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
