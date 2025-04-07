
import { supabase } from '@/integrations/supabase/client';
import { ensureUserProfile } from './userProfile';

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
