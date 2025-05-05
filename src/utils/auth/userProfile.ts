
import { supabase } from '@/integrations/supabase/client';
import { UserData } from './types';

// Fetch user data from database
export const fetchUserDataFromDB = async (userId: string) => {
  return await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
};

// Ensure user exists in users table with better error handling
export const ensureUserProfile = async (userId: string, email: string, name: string = "Usuário") => {
  try {
    if (!userId) {
      console.error("ensureUserProfile called with empty userId");
      return { error: new Error("ID de usuário não fornecido"), data: null };
    }

    console.log("Verificando/criando perfil para usuário:", userId, email, name);

    // Primeiro verifica se o usuário já existe
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);
    
    if (checkError) {
      console.error("Error checking user profile:", checkError);
      // Tentativa direta de inserção caso a verificação falhe
      await createUserProfileDirectly(userId, email, name);
      
      return { 
        data: { 
          id: userId, 
          email, 
          name, 
          role: 'client',
          created_at: new Date().toISOString()
        }, 
        error: null 
      };
    }
    
    // Se o usuário não existe ou não há dados retornados, cria o perfil
    if (!existingUsers || existingUsers.length === 0) {
      console.log("Creating new user profile for:", userId, email, name);
      
      // Obtem sessão atual para garantir privilégios de inserção
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        console.warn("No active session found when creating user profile");
      } else {
        console.log("Creating profile using session:", sessionData.session.user.email);
      }
      
      // Tenta inserir o usuário usando a API
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          name,
          role: 'client'
        });
      
      if (createError) {
        console.error("Error creating user profile via API:", createError);
        // Se falhar, tenta método alternativo
        await createUserProfileDirectly(userId, email, name);
      }
      
      // Busca o usuário recém-criado
      const { data: newUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .maybeSingle();
        
      if (fetchError) {
        console.error("Error fetching newly created user:", fetchError);
      }
      
      return { 
        data: newUser || { 
          id: userId, 
          email, 
          name, 
          role: 'client',
          created_at: new Date().toISOString()
        }, 
        error: null 
      };
    }
    
    console.log("User profile exists:", existingUsers[0]);
    return { data: existingUsers[0], error: null };
  } catch (error) {
    console.error("Error in ensureUserProfile:", error);
    // Tenta método alternativo em caso de erro geral
    await createUserProfileDirectly(userId, email, name);
    
    return { 
      data: { 
        id: userId, 
        email, 
        name, 
        role: 'client',
        created_at: new Date().toISOString()
      }, 
      error: null 
    };
  }
};

// Função auxiliar para tentar criação direta se outros métodos falharem
const createUserProfileDirectly = async (userId: string, email: string, name: string) => {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData.session?.access_token;

    if (!accessToken) {
      console.error("Cannot create user profile: No active session");
      return;
    }

    // Call the Supabase Edge Function to create the user profile
    const response = await fetch('https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/create-user-profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        userId,
        email,
        name
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Error from create-user-profile function:", errorData);
    } else {
      const result = await response.json();
      console.log("User profile created via Edge Function:", result);
    }
  } catch (error) {
    console.error("Failed to create user profile directly:", error);
  }
};
