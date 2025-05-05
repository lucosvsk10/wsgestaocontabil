
import { supabase } from '@/integrations/supabase/client';
import { UserData } from './types';

// Fetch user data from database
export const fetchUserDataFromDB = async (userId: string) => {
  if (!userId) {
    console.error("fetchUserDataFromDB called with empty userId");
    return { data: null, error: new Error("ID de usuário não fornecido") };
  }

  try {
    return await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
  } catch (error) {
    console.error("Error in fetchUserDataFromDB:", error);
    return { data: null, error };
  }
};

// Ensure user exists in users table with better error handling
export const ensureUserProfile = async (userId: string, email: string, name: string = "Usuário") => {
  try {
    if (!userId) {
      console.error("ensureUserProfile called with empty userId");
      return { error: new Error("ID de usuário não fornecido"), data: null };
    }

    console.log("Verificando/criando perfil para usuário:", userId, email, name);

    // First check if the user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    
    if (checkError) {
      console.error("Error checking user profile:", checkError);
    }
    
    // If the user doesn't exist or there was an error, create profile
    if (!existingUser) {
      console.log("Creating new user profile for:", userId, email, name);
      
      // Try to insert the user
      const { data: newUser, error: insertError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          name,
          role: 'client'
        })
        .select()
        .maybeSingle();
      
      if (insertError) {
        console.error("Error creating user profile:", insertError);
        return { data: null, error: insertError };
      }
      
      return { data: newUser, error: null };
    }
    
    console.log("User profile exists:", existingUser);
    return { data: existingUser, error: null };
  } catch (error) {
    console.error("Error in ensureUserProfile:", error);
    return { data: null, error };
  }
};
