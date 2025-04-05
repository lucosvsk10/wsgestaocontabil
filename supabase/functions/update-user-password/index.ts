
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

    // Verificar se o usuário tem permissão de admin
    const { data: userData, error: userError } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("id", caller.id)
      .single();
    
    const isAdmin = 
      userData?.role === "admin" || 
      caller.email === "wsgestao@gmail.com" || 
      caller.email === "l09022007@gmail.com";

    if (userError || !isAdmin) {
      return new Response(JSON.stringify({ error: "Permissão negada" }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Obter dados da requisição
    const { userId, newPassword } = await req.json();
    
    if (!userId || !newPassword || newPassword.length < 6) {
      return new Response(JSON.stringify({ error: "Dados inválidos. A senha deve ter pelo menos 6 caracteres." }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Atualizar a senha do usuário
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Erro ao atualizar senha:", updateError);
      return new Response(JSON.stringify({ error: "Erro ao atualizar senha" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    return new Response(JSON.stringify({ success: true }), { 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(JSON.stringify({ error: "Erro interno no servidor" }), { 
      status: 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
