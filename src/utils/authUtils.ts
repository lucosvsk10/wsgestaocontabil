import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

export interface Document {
  id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
}

// Check if user is admin by role or email
export const checkIsAdmin = (userData: UserData | null, userEmail: string | null): boolean => {
  return (
    userData?.role === 'admin' || 
    userEmail === 'wsgestao@gmail.com' ||
    userEmail === 'l09022007@gmail.com'
  );
};

// Fetch user data from database
export const fetchUserDataFromDB = async (userId: string) => {
  return await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
};

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    return await supabase.auth.signInWithPassword({
      email,
      password
    });
  } catch (error) {
    console.error("Error in signIn:", error);
    return { error };
  }
};

// Sign out user
export const signOutUser = async () => {
  try {
    await supabase.auth.signOut();
  } catch (error) {
    console.error("Error in signOut:", error);
  }
};

// Sign up new user
export const signUpNewUser = async (email: string, password: string, name: string) => {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name }
      }
    });
    
    if (!error && data.user) {
      // Create user profile in the users table
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: data.user.id,
          email,
          name,
          role: 'client'
        });
      
      if (profileError) {
        console.error("Error creating user profile:", profileError);
        return { error: profileError, data };
      }
    }
    
    return { data, error };
  } catch (error) {
    console.error("Error in signUp:", error);
    return { error, data: null };
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

    // First check if the user exists (using .select() is more reliable than .maybeSingle())
    const { data: existingUsers, error: checkError } = await supabase
      .from('users')
      .select('*')
      .eq('id', userId);
    
    if (checkError) {
      console.error("Error checking user profile:", checkError);
      return { 
        data: { 
          id: userId, 
          email, 
          name, 
          role: 'client',
          created_at: new Date().toISOString()
        }, 
        error: checkError 
      };
    }
    
    // If user doesn't exist or no data returned, create profile
    if (!existingUsers || existingUsers.length === 0) {
      console.log("Creating new user profile for:", userId, email, name);
      
      // Get current session to ensure we're using admin privileges
      const { data: sessionData } = await supabase.auth.getSession();
      
      if (!sessionData.session) {
        console.warn("No active session found when creating user profile");
      } else {
        console.log("Creating profile using session:", sessionData.session.user.email);
      }
      
      const { error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          email,
          name,
          role: 'client'
        });
      
      if (createError) {
        console.error("Error creating user profile:", createError);
        return { 
          data: { 
            id: userId, 
            email, 
            name, 
            role: 'client',
            created_at: new Date().toISOString()
          }, 
          error: createError 
        };
      }
      
      // Fetch the newly created user
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
    return { 
      data: { 
        id: userId, 
        email, 
        name, 
        role: 'client',
        created_at: new Date().toISOString()
      }, 
      error: error instanceof Error ? error : new Error('Erro desconhecido ao verificar perfil do usuário')
    };
  }
};

// Upload document
export const uploadUserDocument = async (userId: string, file: File, documentName?: string) => {
  try {
    // Ensure user profile exists before uploading
    const { error: profileError } = await ensureUserProfile(userId, '', 'Usuário');
    if (profileError) {
      console.error("Error ensuring user profile:", profileError);
      throw new Error("Erro ao verificar perfil do usuário. Por favor, tente novamente.");
    }

    // 1. Upload file to storage
    const fileName = `${userId}/${Date.now()}_${file.name}`;
    const { data: fileData, error: uploadError } = await supabase.storage
      .from('documents')
      .upload(fileName, file);
      
    if (uploadError) throw uploadError;

    // 2. Get the public URL
    const { data: urlData } = supabase.storage
      .from('documents')
      .getPublicUrl(fileName);

    // 3. Save document record in database
    const { data, error: dbError } = await supabase
      .from('documents')
      .insert({
        user_id: userId,
        name: documentName || file.name,
        file_url: urlData.publicUrl,
        original_filename: file.name,
        size: file.size,
        type: file.type
      })
      .select();
      
    if (dbError) throw dbError;
    
    return { data, error: null };
  } catch (error) {
    console.error("Error uploading document:", error);
    return { data: null, error };
  }
};

// Get user documents
export const getUserDocumentsFromDB = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('uploaded_at', { ascending: false });
      
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error("Error fetching user documents:", error);
    return { data: null, error };
  }
};
