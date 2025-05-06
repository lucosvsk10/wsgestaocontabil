
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

    // 1. Upload file to storage - sempre usando o userId no caminho para garantir segurança
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
        type: file.type,
        storage_key: fileName // Armazenar o caminho completo incluindo userId/
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

// Função para fazer download de um documento
export const downloadDocument = async (storagePath: string, userId: string) => {
  try {
    // Garantir que o caminho de armazenamento inclua o userId para segurança
    if (!storagePath.startsWith(`${userId}/`)) {
      // Se não, adicionar o userId ao caminho
      const filename = storagePath.split('/').pop();
      storagePath = `${userId}/${filename}`;
    }
    
    // Log para debug
    console.log(`Tentando baixar arquivo com path seguro: ${storagePath}`);
    
    // Fazer o download usando o Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .download(storagePath);
      
    if (error) {
      console.error("Erro no download do storage:", error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Error downloading document:", error);
    return { data: null, error };
  }
};
