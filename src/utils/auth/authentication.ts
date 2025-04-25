
import { supabase } from '@/integrations/supabase/client';
import { ensureUserProfile } from './userProfile';

// Sign in with email and password
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: {
        captchaToken: undefined // Will be required if user fails multiple login attempts
      }
    });

    // Check if MFA challenge is required
    if (data?.session === null && data?.user !== null) {
      // Get the MFA factors for the user
      const { data: factorsData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const factorId = factorsData?.currentLevel?.factors?.[0]?.id || null;
      
      return { 
        data: { 
          requiresMFA: true, 
          factorId
        }, 
        error: null 
      };
    }

    return { data, error };
  } catch (error) {
    console.error("Error in signIn:", error);
    return { error, data: null };
  }
};

// Sign out user
export const signOutUser = async () => {
  try {
    await supabase.auth.signOut();
    // Note: The actual redirection is handled in the Navbar component
    return { error: null };
  } catch (error) {
    console.error("Error in signOut:", error);
    return { error };
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
