
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useDocumentActions = (fetchUserDocuments: (userId: string) => Promise<void>) => {
  const { toast } = useToast();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());

  const markAsViewed = async (documentId: string): Promise<{ success: boolean; documentId: string | null }> => {
    try {
      setLoadingDocumentIds(prev => new Set([...prev, documentId]));
      
      // Check if document is already viewed
      const { data: docData, error: checkError } = await supabase
        .from('documents')
        .select('viewed')
        .eq('id', documentId)
        .single();
      
      if (checkError) throw checkError;
      
      // Only update if not already viewed
      if (!docData.viewed) {
        const { error } = await supabase
          .from('documents')
          .update({ viewed: true, viewed_at: new Date().toISOString() })
          .eq('id', documentId);
          
        if (error) throw error;
      }
      
      return { success: true, documentId };
    } catch (error: any) {
      console.error('Error marking document as viewed:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: error.message || "Não foi possível marcar o documento como visualizado."
      });
      return { success: false, documentId: null };
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const downloadDocument = async (documentId: string, storageKey: string, filename: string, userId?: string) => {
    try {
      setLoadingDocumentIds(prev => new Set([...prev, documentId]));
      
      // Mark document as viewed when downloaded
      await markAsViewed(documentId);
      
      console.log('Attempting to download document with storage key:', storageKey);
      
      // Try to generate a signed URL for security
      try {
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('documents')
          .createSignedUrl(storageKey, 60);
          
        if (signedUrlError) {
          console.warn("Could not create signed URL:", signedUrlError);
          throw signedUrlError;
        }
        
        if (signedUrlData?.signedUrl) {
          console.log('Successfully generated signed URL');
          // Download using the signed URL
          const response = await fetch(signedUrlData.signedUrl);
          if (!response.ok) {
            throw new Error(`Erro ao baixar: ${response.status} ${response.statusText}`);
          }
          
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename || 'documento';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Refresh documents if userId provided
          if (userId) {
            await fetchUserDocuments(userId);
          }
          
          return { success: true };
        }
      } catch (signedUrlError: any) {
        console.warn("Signed URL failed, trying public URL:", signedUrlError);
        
        // Fallback to public URL
        try {
          const { data: publicUrlData } = supabase.storage
            .from('documents')
            .getPublicUrl(storageKey);
            
          if (publicUrlData?.publicUrl) {
            console.log('Using public URL as fallback');
            const response = await fetch(publicUrlData.publicUrl);
            if (!response.ok) {
              throw new Error(`Erro ao baixar: ${response.status} ${response.statusText}`);
            }
            
            const blob = await response.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || 'documento';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Refresh documents if userId provided
            if (userId) {
              await fetchUserDocuments(userId);
            }
            
            return { success: true };
          } else {
            throw new Error("Não foi possível gerar URL pública para o arquivo");
          }
        } catch (publicUrlError: any) {
          console.error("Public URL download failed:", publicUrlError);
          throw publicUrlError;
        }
      }
      
      // Last resort: direct download
      console.log('Attempting direct download as last resort');
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storageKey);
        
      if (error) {
        // Provide more descriptive error messages based on error code
        if (error.message.includes("404") || error.message.includes("not found")) {
          throw new Error("Documento não encontrado. Verifique se ele ainda está disponível no sistema.");
        } else if (error.message.includes("403") || error.message.includes("permission")) {
          throw new Error("Sem permissão para acessar este documento.");
        } else {
          throw error;
        }
      }
      
      if (data) {
        // Create URL and initiate download
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename || 'documento';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        throw new Error("Não foi possível baixar o arquivo (conteúdo vazio).");
      }
      
      // Refresh documents if userId provided
      if (userId) {
        await fetchUserDocuments(userId);
      }
      
      return { success: true };
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message || "Documento não encontrado. Verifique se ele ainda está disponível no sistema."
      });
      return { success: false };
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  const deleteDocument = async (documentId: string, selectedUserId: string | null) => {
    if (!window.confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, documentId]));
      
      // Get document to retrieve storage_key
      const { data: docData, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
        
      if (fetchError) throw fetchError;

      // Delete document record from database
      const { error: deleteDbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
        
      if (deleteDbError) throw deleteDbError;

      // Delete file from storage if we have a storage_key
      if (docData?.storage_key) {
        const { error: deleteStorageError } = await supabase.storage
          .from('documents')
          .remove([docData.storage_key]);
          
        if (deleteStorageError) {
          console.error('Error deleting file from storage:', deleteStorageError);
        }
      }

      // Update document list
      if (selectedUserId) {
        await fetchUserDocuments(selectedUserId);
      }
      
      toast({
        title: "Documento excluído com sucesso",
        description: "O documento foi removido permanentemente."
      });
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir documento",
        description: error.message || "Ocorreu um erro ao excluir o documento."
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  return {
    loadingDocumentIds,
    markAsViewed,
    downloadDocument,
    deleteDocument
  };
};
