
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

    // Verificar se o usuário tem permissão (apenas emails específicos ou admins)
    const { data: userData, error: userError } = await supabaseAdmin
      .from('users')
      .select('role')
      .eq('id', caller.id)
      .single();

    if (userError) {
      return new Response(JSON.stringify({ error: "Erro ao verificar função do usuário" }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const isAdmin = caller.email === "wsgestao@gmail.com" || 
                   caller.email === "l09022007@gmail.com" ||
                   ['fiscal', 'contabil', 'geral'].includes(userData?.role || '');
    
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Acesso negado. Apenas administradores podem acessar esta função." }), { 
        status: 403, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Obter estatísticas de armazenamento por usuário
    const { data: documents, error: documentsError } = await supabaseAdmin
      .from('documents')
      .select('user_id, size');

    if (documentsError) {
      return new Response(JSON.stringify({ error: "Erro ao obter documentos", details: documentsError }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Obter informações dos usuários
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, name, email');

    if (usersError) {
      return new Response(JSON.stringify({ error: "Erro ao obter usuários", details: usersError }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Obter todos os usuários do auth
    const { data: authData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authUsersError) {
      return new Response(JSON.stringify({ error: "Erro ao obter usuários autenticados", details: authUsersError }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const authUsers = authData.users;

    // Calcular uso de armazenamento por usuário
    const storageByUser: Record<string, { size: number; name: string | null; email: string | null }> = {};
    
    documents.forEach(doc => {
      if (!doc.user_id || !doc.size) return;
      
      if (!storageByUser[doc.user_id]) {
        const user = users.find(u => u.id === doc.user_id);
        const authUser = authUsers.find(u => u.id === doc.user_id);
        
        storageByUser[doc.user_id] = {
          size: 0,
          name: user?.name || authUser?.user_metadata?.name || null,
          email: user?.email || authUser?.email || null
        };
      }
      
      storageByUser[doc.user_id].size += doc.size || 0;
    });

    // Transformar em array para facilitar o uso no frontend
    const storageStats = Object.entries(storageByUser).map(([userId, data]) => ({
      userId,
      name: data.name,
      email: data.email,
      sizeBytes: data.size,
      sizeKB: Math.round(data.size / 1024 * 100) / 100,
      sizeMB: Math.round(data.size / (1024 * 1024) * 100) / 100
    }));

    // Calcular o uso total
    const totalStorageBytes = storageStats.reduce((sum, item) => sum + item.sizeBytes, 0);

    return new Response(JSON.stringify({ 
      totalStorageBytes,
      totalStorageKB: Math.round(totalStorageBytes / 1024 * 100) / 100,
      totalStorageMB: Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100,
      userStorage: storageStats 
    }), { 
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
