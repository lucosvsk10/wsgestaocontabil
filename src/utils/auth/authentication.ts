
import { supabase } from "@/integrations/supabase/client";

export const getAuthenticatorAssuranceLevel = () => {
  return 'aal1' as const;
};

/**
 * Sign in a user using email and password
 * @param email User's email
 * @param password User's password
 * @returns An object with data and error properties
 */
export const signInWithEmail = async (email: string, password: string) => {
  try {
    // Check if MFA is required
    const { data: mfaData, error: mfaError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    
    // Perform the sign in
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    // Check if MFA is required for this user
    if (data?.user && mfaData?.currentLevel !== 'aal2' && mfaData?.nextLevel === 'aal2') {
      const { data: factorData } = await supabase.auth.mfa.listFactors();
      const totp = factorData?.totp?.[0];
      
      if (totp) {
        return {
          data: {
            requiresMFA: true,
            factorId: totp.id
          },
          error: null
        };
      }
    }
    
    return { data, error };
  } catch (error) {
    console.error("Error in signInWithEmail:", error);
    return { data: null, error: error as Error };
  }
};

/**
 * Sign out the current user
 * @returns An object with error property
 */
export const signOutUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    console.error("Error in signOutUser:", error);
    return { error: error as Error };
  }
};
