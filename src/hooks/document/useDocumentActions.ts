
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useDocumentActions = (fetchUserDocuments: (userId: string) => Promise<void>) => {
  const { toast } = useToast();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());

  const markAsViewed = async (documentId: string): Promise<{ success: boolean; documentId: string | null }> => {
    try {
      setLoadingDocumentIds(prev => new Set([...prev, documentId]));
      
      const { error } = await supabase
        .from('documents')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', documentId);
        
      if (error) throw error;
      
      return { success: true, documentId };
    } catch (error: any) {
      console.error('Error marking document as viewed:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível marcar o documento como visualizado."
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
      
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storageKey);
        
      if (error) throw error;
      
      if (data) {
        // Create URL and initiate download
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
      
      // Refresh documents if userId provided
      if (userId) {
        await fetchUserDocuments(userId);
      }
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message
      });
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
        description: error.message
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
