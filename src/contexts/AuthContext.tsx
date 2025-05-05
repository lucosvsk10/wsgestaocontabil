
import React, { createContext, useState, useContext, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { UserData, AuthContextType } from "@/utils/auth/types";
import { checkIsAdmin } from "@/utils/auth/userChecks";
import { signInWithEmail, signOutUser } from "@/utils/auth/authentication";

// Create context
export const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider component
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check if user is admin
  const isAdmin = checkIsAdmin(userData, user?.email);

  // Sign in function
  const signIn = async (email: string, password: string) => {
    try {
      const response = await signInWithEmail(email, password);
      // Check if response has data property before accessing it
      return { 
        error: response.error as Error | null, 
        data: response.data || null 
      };
    } catch (error) {
      return { error: error as Error, data: null };
    }
  };

  // Sign out function
  const signOut = async () => {
    try {
      const result = await signOutUser();
      // Clear user data and state immediately
      setUser(null);
      setUserData(null);
      return { error: result.error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  useEffect(() => {
    // Check active session
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user || null);
      } catch (error) {
        console.error("Erro ao verificar sessão:", error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user || null);
        setIsLoading(false);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch user data when user changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        try {
          setIsLoading(true);
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error("Erro ao buscar dados do usuário:", error);
            setUserData(null);
          } else {
            setUserData(data);
          }
        } catch (error) {
          console.error("Erro ao buscar dados do usuário:", error);
          setUserData(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setUserData(null);
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [user]);

  const contextValue: AuthContextType = {
    user,
    userData,
    isLoading,
    isAdmin,
    signIn,
    signOut,
    setUser,
    setUserData,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook to use the auth context
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
