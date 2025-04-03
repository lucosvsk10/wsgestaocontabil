
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

interface Document {
  id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any, data: any }>;
  uploadDocument: (userId: string, file: File, documentName?: string) => Promise<{ error: any, data: any }>;
  getUserDocuments: (userId: string) => Promise<{ data: Document[] | null, error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userData: null,
  isLoading: true,
  isAdmin: false,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  signUp: async () => ({ error: null, data: null }),
  uploadDocument: async () => ({ error: null, data: null }),
  getUserDocuments: async () => ({ data: null, error: null }),
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

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      return { error };
    } catch (error) {
      console.error("Error in signIn:", error);
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error("Error in signOut:", error);
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
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

  // New function to upload document for a specific user
  const uploadDocument = async (userId: string, file: File, documentName?: string) => {
    try {
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

  // New function to get documents for a specific user
  const getUserDocuments = async (userId: string) => {
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

  const value = {
    session,
    user,
    userData,
    isLoading,
    isAdmin,
    signIn,
    signOut,
    signUp,
    uploadDocument,
    getUserDocuments
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
