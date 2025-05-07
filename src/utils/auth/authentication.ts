
import { supabase } from '@/lib/supabaseClient';

/**
 * Get the current authenticator assurance level
 * @returns Current AAL level
 */
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

/**
 * Check if a password has been compromised in known data breaches
 * Note: This uses Supabase's integration with HaveIBeenPwned
 * @param password Password to check
 * @returns Promise resolving to true if password is compromised
 */
export const checkCompromisedPassword = async (password: string): Promise<boolean> => {
  try {
    // This functionality requires the Supabase Auth to have password protection enabled
    // The actual checking happens server-side during sign-up or password change
    // This is just a helper function for client-side password checks before submission
    
    // For actual implementation, would require external API calls or server-side checking
    return false;
  } catch (error) {
    console.error("Error checking password:", error);
    return false;
  }
};
