
import React, { createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useAuthState } from '@/hooks/useAuthState';
import { 
  UserData, 
  Document, 
  signInWithEmail, 
  signOutUser, 
  getUserDocumentsFromDB 
} from '@/utils/authUtils';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  userData: UserData | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  getUserDocuments: (userId: string) => Promise<{ data: Document[] | null, error: any }>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  userData: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signOut: async () => {},
  getUserDocuments: async () => ({ data: null, error: null }),
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    session, 
    user, 
    userData, 
    isLoading
  } = useAuthState();

  const signIn = async (email: string, password: string) => {
    return await signInWithEmail(email, password);
  };

  const signOut = async () => {
    await signOutUser();
  };

  const getUserDocuments = async (userId: string) => {
    return await getUserDocumentsFromDB(userId);
  };

  const value = {
    session,
    user,
    userData,
    isLoading,
    signIn,
    signOut,
    getUserDocuments
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
