
import { supabase } from '@/lib/supabaseClient';
import { UserData } from '@/utils/auth/types';

/**
 * Fetch user data from database
 * @param userId The user's ID
 * @returns Promise with user data from the database
 */
export const fetchUserDataFromDB = async (userId: string) => {
  return await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
};

/**
 * Ensure user exists in users table with better error handling
 * @param userId User ID to check
 * @param email User's email
 * @param name User's name (defaults to "Usuário")
 * @returns Promise with user data or error
 */
export const ensureUserProfile = async (userId: string, email: string, name: string = "Usuário") => {
  try {
    if (!userId) {
      console.error("ensureUserProfile called with empty userId");
      return { error: new Error("ID de usuário não fornecido"), data: null };
    }

    console.log("Verificando/criando perfil para usuário:", userId, email, name);

    // First check if user already exists
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);
    
    if (checkError) {
      console.error("Error checking user profile:", checkError);
      // Direct insertion attempt if verification fails
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
    
    // If user doesn't exist or no data returned, create profile
    if (!existingUsers || existingUsers.length === 0) {
      console.log("Creating new user profile for:", userId, email, name);
      
      // Get current session to ensure insertion privileges
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        console.warn("No active session found when creating user profile");
      } else {
        console.log("Creating profile using session:", sessionData.session.user.email);
      }
      
      // Try inserting user using API
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
        // Try alternative method if failed
        await createUserProfileDirectly(userId, email, name);
      }
      
      // Fetch newly created user
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
    // Try alternative method in case of general error
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

/**
 * Helper function to try direct creation if other methods fail
 * @param userId User ID
 * @param email User email
 * @param name User name
 */
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
