
import { supabase } from '@/lib/supabaseClient';
import { ensureUserProfile } from '../auth/userProfile';
import { hasDocumentAccess } from '../auth/userChecks';

/**
 * Upload a document for a specific user
 * @param userId User ID who will own the document
 * @param file File object to upload
 * @param documentName Optional document name (defaults to file name)
 * @returns Promise with upload result
 */
export const uploadUserDocument = async (userId: string, file: File, documentName?: string) => {
  try {
    // Ensure user profile exists before uploading
    const { error: profileError } = await ensureUserProfile(userId, '', 'Usuário');
    if (profileError) {
      console.error("Error ensuring user profile:", profileError);
      throw new Error("Erro ao verificar perfil do usuário. Por favor, tente novamente.");
    }

    // 1. Upload file to storage - always use userId in path for security
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
        storage_key: fileName // Store full path including userId/
      })
      .select();
      
    if (dbError) throw dbError;
    
    return { data, error: null };
  } catch (error) {
    console.error("Error uploading document:", error);
    return { data: null, error };
  }
};

/**
 * Get documents for a specific user
 * @param userId User ID to fetch documents for
 * @returns Promise with user documents
 */
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

/**
 * Download a document
 * @param storagePath Storage path of the document
 * @param userId Current user ID (for security check)
 * @returns Promise with download result
 */
export const downloadDocument = async (storagePath: string, userId: string) => {
  try {
    // Security check: ensure the storage path includes userId for security
    if (!storagePath.startsWith(`${userId}/`)) {
      // If not, add userId to path
      const filename = storagePath.split('/').pop();
      storagePath = `${userId}/${filename}`;
    }
    
    // Debug log
    console.log(`Attempting to download file with secure path: ${storagePath}`);
    
    // Download using Supabase Storage
    const { data, error } = await supabase.storage
      .from('documents')
      .download(storagePath);
      
    if (error) {
      console.error("Storage download error:", error);
      throw error;
    }
    
    return { data, error: null };
  } catch (error) {
    console.error("Error downloading document:", error);
    return { data: null, error };
  }
};

/**
 * Delete a document by ID
 * @param documentId Document ID to delete
 * @param userId Current user ID (for security check)
 * @returns Promise with deletion result
 */
export const deleteDocument = async (documentId: string, userId: string) => {
  try {
    // First, fetch the document to get the storage_key
    const { data: document, error: fetchError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();
    
    if (fetchError) throw fetchError;
    
    // Security check: Ensure current user has access to this document
    if (!document || !hasDocumentAccess(userId, document.user_id, document.storage_key)) {
      throw new Error("You don't have permission to delete this document");
    }
    
    // Delete from database first
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .eq('id', documentId);
      
    if (deleteError) throw deleteError;
    
    // If we have the storage key, also delete the file
    if (document.storage_key) {
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([document.storage_key]);
        
      if (storageError) {
        console.error("Error deleting file from storage:", storageError);
      }
    }
    
    return { success: true, error: null };
  } catch (error) {
    console.error("Error deleting document:", error);
    return { success: false, error };
  }
};
