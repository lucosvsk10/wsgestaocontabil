
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";

    // Verificar autenticação
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.log("No auth header or invalid format");
      return new Response(JSON.stringify({ error: "Autenticação inválida" }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const jwt = authHeader.replace("Bearer ", "");
    console.log("JWT received, validating...");

    // Criar cliente Supabase com o token do usuário para validar a sessão
    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: `Bearer ${jwt}` },
      },
    });

    // Verificar o token e obter o usuário
    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    
    if (authError || !caller) {
      console.error("Auth error:", authError);
      return new Response(JSON.stringify({ error: "Usuário não autenticado", details: authError?.message }), { 
        status: 401, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    console.log("User authenticated:", caller.id, caller.email);

    // Criar cliente admin para operações privilegiadas
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar se o usuário tem permissão usando role do banco de dados
    const isAdmin = await checkIsAdmin(supabaseAdmin, caller.id);
    console.log("Is admin:", isAdmin);
    
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
      console.error("Error fetching documents:", documentsError);
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
      console.error("Error fetching users:", usersError);
      return new Response(JSON.stringify({ error: "Erro ao obter usuários", details: usersError }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    // Obter limite de armazenamento configurado
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('system_settings')
      .select('storage_limit_gb')
      .single();

    if (settingsError) {
      console.warn("Erro ao obter configurações do sistema:", settingsError);
    }

    const storageLimitGB = settings?.storage_limit_gb || 100;

    // Obter todos os usuários do auth
    const { data: authData, error: authUsersError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (authUsersError) {
      console.error("Error fetching auth users:", authUsersError);
      return new Response(JSON.stringify({ error: "Erro ao obter usuários autenticados", details: authUsersError }), { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }

    const authUsers = authData.users;

    // Calcular uso de armazenamento por usuário com contagem de documentos
    const storageByUser: Record<string, { size: number; name: string | null; email: string | null; count: number }> = {};
    
    documents.forEach(doc => {
      if (!doc.user_id || !doc.size) return;
      
      if (!storageByUser[doc.user_id]) {
        const user = users.find(u => u.id === doc.user_id);
        const authUser = authUsers.find(u => u.id === doc.user_id);
        
        storageByUser[doc.user_id] = {
          size: 0,
          name: user?.name || authUser?.user_metadata?.name || null,
          email: user?.email || authUser?.email || null,
          count: 0
        };
      }
      
      storageByUser[doc.user_id].size += doc.size || 0;
      storageByUser[doc.user_id].count += 1;
    });

    // Transformar em array para facilitar o uso no frontend
    const storageStats = Object.entries(storageByUser).map(([userId, data]) => ({
      userId,
      userName: data.name || 'Usuário sem nome',
      userEmail: data.email || 'Sem email',
      name: data.name,
      email: data.email,
      sizeBytes: data.size,
      sizeKB: Math.round(data.size / 1024 * 100) / 100,
      sizeMB: Math.round(data.size / (1024 * 1024) * 100) / 100,
      documentsCount: data.count
    }));

    // Calcular o uso total
    const totalStorageBytes = storageStats.reduce((sum, item) => sum + item.sizeBytes, 0);

    console.log("Returning storage stats");
    return new Response(JSON.stringify({ 
      totalStorageBytes,
      totalStorageKB: Math.round(totalStorageBytes / 1024 * 100) / 100,
      totalStorageMB: Math.round(totalStorageBytes / (1024 * 1024) * 100) / 100,
      totalStorageGB: Math.round(totalStorageBytes / (1024 * 1024 * 1024) * 100) / 100,
      storageLimitGB,
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
