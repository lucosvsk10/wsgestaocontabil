
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Create Supabase admin client
const createSupabaseAdmin = () => {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
};

// Authenticate the calling user
const authenticateUser = async (authHeader: string | null) => {
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Autenticação inválida");
  }

  const supabaseAdmin = createSupabaseAdmin();
  const jwt = authHeader.replace("Bearer ", "");
  
  const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(jwt);
  
  if (authError || !caller) {
    throw new Error("Usuário não autenticado");
  }

  // Verify if user has permission (only specific emails)
  if (caller.email !== "wsgestao@gmail.com" && caller.email !== "l09022007@gmail.com") {
    throw new Error("Acesso negado. Apenas administradores específicos podem acessar esta função.");
  }

  return { caller, supabaseAdmin };
};

// Handler for changing user roles
const handleChangeRole = async (supabaseAdmin, userId, role) => {
  if (!userId) {
    throw new Error("ID do usuário não fornecido");
  }

  if (!role || !["fiscal", "contabil", "geral", "client"].includes(role)) {
    throw new Error("Função inválida fornecida");
  }

  // Check if the user exists in the users table
  const { data: existingUser, error: getUserError } = await supabaseAdmin
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();

  if (getUserError && getUserError.code !== 'PGRST116') {
    console.error("Error checking for existing user:", getUserError);
  }

  // Get auth user information
  const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(userId);
  
  if (authUserError) {
    console.error("Error getting auth user:", authUserError);
    throw new Error("Erro ao obter informações do usuário");
  }

  // Update or create the user role
  let updateResult;
  if (existingUser) {
    updateResult = await supabaseAdmin
      .from('users')
      .update({ role: role })
      .eq('id', userId);
  } else {
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
    throw new Error("Erro ao atualizar função do usuário");
  }

  // Special case for julia@gmail.com
  handleJuliaSpecialCase(supabaseAdmin, authUser, userId, role);

  return { userId, role };
};

// Special case handler for julia@gmail.com
const handleJuliaSpecialCase = async (supabaseAdmin, authUser, userId, role) => {
  if (authUser.user?.email === "julia@gmail.com" && role !== "fiscal") {
    console.log("Setting julia@gmail.com to fiscal role regardless of requested role");
    
    const juliaUpdateResult = await supabaseAdmin
      .from('users')
      .update({ role: 'fiscal' })
      .eq('id', userId);
      
    if (juliaUpdateResult.error) {
      console.error("Error setting Julia's role to fiscal:", juliaUpdateResult.error);
    }
  }
};

// Handler for deleting a user
const handleDeleteUser = async (supabaseAdmin, userId) => {
  if (!userId) {
    throw new Error("ID do usuário não fornecido");
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
    throw new Error("Erro ao excluir usuário");
  }
  
  return { userId };
};

// Handler for changing a user's password
const handleChangePassword = async (supabaseAdmin, userId, newPassword) => {
  if (!userId) {
    throw new Error("ID do usuário não fornecido");
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Senha inválida. A senha deve ter pelo menos 6 caracteres.");
  }

  // Update the user's password
  const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );

  if (passwordError) {
    console.error("Error changing user password:", passwordError);
    throw new Error("Erro ao alterar senha do usuário");
  }

  return { userId };
};

// Alternative handler for changing a user's password by email
const handleChangePasswordByEmail = async (supabaseAdmin, email, newPassword) => {
  if (!email) {
    throw new Error("Email do usuário não fornecido");
  }

  if (!newPassword || newPassword.length < 6) {
    throw new Error("Senha inválida. A senha deve ter pelo menos 6 caracteres.");
  }

  // Get user by email
  const { data: users, error: emailError } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('email', email)
    .limit(1);

  if (emailError) {
    console.error("Error getting user by email:", emailError);
    throw new Error("Erro ao buscar usuário pelo email");
  }

  if (!users || users.length === 0) {
    throw new Error("Usuário não encontrado com este email");
  }

  const userId = users[0].id;

  // Update the user's password
  const { error: passwordError } = await supabaseAdmin.auth.admin.updateUserById(
    userId,
    { password: newPassword }
  );

  if (passwordError) {
    console.error("Error changing user password:", passwordError);
    throw new Error("Erro ao alterar senha do usuário");
  }

  return { userId, email };
};

// Main request handler
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the user
    const authHeader = req.headers.get("Authorization");
    const { supabaseAdmin } = await authenticateUser(authHeader);

    // Get request data
    const requestData = await req.json();
    const { operation } = requestData;

    // Execute requested operation
    let result;
    
    if (operation === "change_role") {
      const { userId, role } = requestData;
      result = await handleChangeRole(supabaseAdmin, userId, role);
      return new Response(JSON.stringify({ 
        message: "Função do usuário atualizada com sucesso", 
        ...result
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    } 
    else if (operation === "delete_user") {
      const { userId } = requestData;
      result = await handleDeleteUser(supabaseAdmin, userId);
      return new Response(JSON.stringify({ 
        message: "Usuário excluído com sucesso", 
        ...result
      }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    } 
    else if (operation === "changePassword") {
      // Handle password change by userId
      if (requestData.userId) {
        const { userId, newPassword } = requestData;
        result = await handleChangePassword(supabaseAdmin, userId, newPassword);
        return new Response(JSON.stringify({ 
          message: "Senha do usuário alterada com sucesso", 
          ...result
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      } 
      // Handle password change by email
      else if (requestData.email) {
        const { email, newPassword } = requestData;
        result = await handleChangePasswordByEmail(supabaseAdmin, email, newPassword);
        return new Response(JSON.stringify({ 
          message: "Senha do usuário alterada com sucesso", 
          ...result
        }), { 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        });
      }
      else {
        throw new Error("É necessário fornecer userId ou email do usuário");
      }
    }
    else {
      return new Response(JSON.stringify({ error: "Operação não suportada" }), { 
        status: 400, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      });
    }
  } catch (error) {
    console.error("Erro na função:", error);
    return new Response(JSON.stringify({ 
      error: "Erro interno no servidor", 
      details: String(error) 
    }), { 
      status: error.message.includes("Acesso negado") || 
             error.message.includes("Autenticação inválida") || 
             error.message.includes("Usuário não autenticado") ? 403 : 500, 
      headers: { ...corsHeaders, "Content-Type": "application/json" } 
    });
  }
});
