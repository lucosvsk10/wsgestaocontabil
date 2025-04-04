
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

export interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

export interface Document {
  id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
}

// Check if user is admin by role or email
export const checkIsAdmin = (userData: UserData | null, userEmail: string | null): boolean => {
  return (
    userData?.role === 'admin' || 
    userEmail === 'wsgestao@gmail.com' ||
    userEmail === 'l09022007@gmail.com'
  );
};

// Fetch user data from database
export const fetchUserDataFromDB = async (userId: string) => {
  return await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
};

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

// Upload document
export const uploadUserDocument = async (userId: string, file: File, documentName?: string) => {
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

// Get user documents
export const getUserDocumentsFromDB = async (userId: string) => {
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
