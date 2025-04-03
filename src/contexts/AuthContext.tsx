
import React, { createContext, useContext, useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userData: null,
  isLoading: true,
  isAdmin: false
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          // Use setTimeout to avoid supabase auth deadlock
          setTimeout(() => {
            fetchUserData(currentSession.user.id);
          }, 0);
        } else {
          setUserData(null);
          setIsAdmin(false);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        fetchUserData(currentSession.user.id);
      } else {
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error("Error fetching user data:", error);
        setUserData(null);
      } else {
        setUserData(data);
        
        // Check if admin by role or specific email
        const userEmail = user?.email;
        setIsAdmin(
          data?.role === 'admin' || 
          userEmail === 'wsgestao@gmail.com'
        );
      }
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      setUserData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    session,
    user,
    userData,
    isLoading,
    isAdmin
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
