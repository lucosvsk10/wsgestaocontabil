
import { supabase } from '@/integrations/supabase/client';
import { ensureUserProfile } from '../auth/userProfile';

// Upload document
export const uploadUserDocument = async (userId: string, file: File, documentName?: string) => {
  try {
    // Ensure user profile exists before uploading
    const { error: profileError } = await ensureUserProfile(userId, '', 'Usuário');
    if (profileError) {
      console.error("Error ensuring user profile:", profileError);
      throw new Error("Erro ao verificar perfil do usuário. Por favor, tente novamente.");
    }

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
