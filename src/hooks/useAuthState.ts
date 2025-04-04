
import { useState, useEffect } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { UserData, fetchUserDataFromDB } from '@/utils/authUtils';

export const useAuthState = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Function to fetch user data from database
  const fetchUserData = async (userId: string) => {
    try {
      const { data, error } = await fetchUserDataFromDB(userId);

      if (error) {
        console.error("Error fetching user data:", error);
        setUserData(null);
        setIsLoading(false);
      } else {
        setUserData(data);
        
        // Store user data in localStorage
        localStorage.setItem('user', JSON.stringify(data));
        
        setIsLoading(false);
      }
    } catch (error) {
      console.error("Error in fetchUserData:", error);
      setUserData(null);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, currentSession) => {
        console.log("Auth state changed:", event, currentSession?.user?.email);
        setSession(currentSession);
        setUser(currentSession?.user || null);

        if (currentSession?.user) {
          // Use setTimeout to avoid supabase auth deadlock
          setTimeout(() => {
            fetchUserData(currentSession.user.id);
          }, 0);
        } else {
          setUserData(null);
          setIsLoading(false);
          
          // Remove user data from localStorage on signOut
          if (event === 'SIGNED_OUT') {
            localStorage.removeItem('user');
          }
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      console.log("Initial session check:", currentSession?.user?.email);
      setSession(currentSession);
      setUser(currentSession?.user || null);
      
      if (currentSession?.user) {
        fetchUserData(currentSession.user.id);
      } else {
        // Check if we have stored user data in localStorage
        const storedUser = localStorage.getItem('user');
        
        if (storedUser) {
          try {
            const parsedUser = JSON.parse(storedUser);
            setUserData(parsedUser);
          } catch (error) {
            console.error('Error parsing stored user data:', error);
            localStorage.removeItem('user');
          }
        }
        
        setIsLoading(false);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    session,
    user,
    userData,
    isLoading,
    setUserData
  };
};
