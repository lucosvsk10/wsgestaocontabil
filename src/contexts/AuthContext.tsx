
import React, { createContext, useContext } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { useAuthState } from '@/hooks/useAuthState';
import { 
  UserData, 
  Document, 
  signInWithEmail, 
  signOutUser, 
  signUpNewUser, 
  uploadUserDocument, 
  getUserDocumentsFromDB 
} from '@/utils/authUtils';

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
  const { 
    session, 
    user, 
    userData, 
    isLoading, 
    isAdmin 
  } = useAuthState();

  const signIn = async (email: string, password: string) => {
    return await signInWithEmail(email, password);
  };

  const signOut = async () => {
    await signOutUser();
  };

  const signUp = async (email: string, password: string, name: string) => {
    return await signUpNewUser(email, password, name);
  };

  const uploadDocument = async (userId: string, file: File, documentName?: string) => {
    return await uploadUserDocument(userId, file, documentName);
  };

  const getUserDocuments = async (userId: string) => {
    return await getUserDocumentsFromDB(userId);
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
