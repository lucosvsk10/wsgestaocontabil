
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppDocument } from "@/types/admin";

export const useDocumentManagement = (users: any[], supabaseUsers: any[]) => {
  const [documents, setDocuments] = useState<AppDocument[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  // Fetch documents function
  const fetchUserDocuments = async (userId: string) => {
    if (!userId) return;
    
    setIsLoadingDocuments(true);
    
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false });
        
      if (error) throw error;
      
      setDocuments(data || []);
    } catch (error: any) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Erro ao carregar documentos",
        description: error.message || "Ocorreu um erro ao carregar os documentos.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  };

  // Download document function
  const handleDownload = async (doc: AppDocument) => {
    if (!doc || !doc.id) return;
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, doc.id]));
      
      // If we already have a file_url, use it directly
      if (doc.file_url) {
        const response = await fetch(doc.file_url);
        const blob = await response.blob();
        
        // Create download link
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.original_filename || doc.filename || 'document';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } 
      // Otherwise, get from storage
      else if (doc.storage_key) {
        const { data, error } = await supabase.storage
          .from('documents')
          .download(doc.storage_key);
          
        if (error) throw error;
        
        // Create download link
        const url = window.URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = doc.original_filename || doc.filename || 'document';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        a.remove();
      } else {
        throw new Error('Nenhuma informação de arquivo disponível para download');
      }
      
      // Mark document as viewed if not already
      if (!doc.viewed) {
        await supabase
          .from('documents')
          .update({ 
            viewed: true,
            viewed_at: new Date().toISOString()
          })
          .eq('id', doc.id);
      }
      
      toast({
        title: "Download iniciado",
        description: "O documento será baixado em instantes.",
      });
      
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        title: "Erro ao baixar o documento",
        description: error.message || "Ocorreu um erro ao baixar o documento.",
        variant: "destructive"
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(doc.id);
        return newSet;
      });
    }
  };

  // Delete document function
  const handleDeleteDocument = async (documentId: string) => {
    if (!documentId || !selectedUserId) return;
    
    // Ask for confirmation
    if (!confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, documentId]));
      
      // Find the document to get the storage key
      const documentToDelete = documents.find(doc => doc.id === documentId);
      
      if (documentToDelete?.storage_key) {
        // Delete from storage first
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([documentToDelete.storage_key]);
          
        if (storageError) {
          console.warn('Error deleting file from storage:', storageError);
          // Continue with database deletion even if storage delete fails
        }
      }
      
      // Delete from database
      const { error: dbError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
        
      if (dbError) throw dbError;
      
      // Update local state
      setDocuments(documents.filter(doc => doc.id !== documentId));
      
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído com sucesso.",
      });
      
    } catch (error: any) {
      console.error('Error deleting document:', error);
      toast({
        title: "Erro ao excluir o documento",
        description: error.message || "Ocorreu um erro ao excluir o documento.",
        variant: "destructive"
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
  };

  // Setup realtime subscription for documents
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDocuments(selectedUserId);
      
      // Subscribe to realtime changes
      const channel = supabase
        .channel(`admin-documents-${selectedUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `user_id=eq.${selectedUserId}`,
          },
          (payload) => {
            console.log("Document change detected:", payload);
            fetchUserDocuments(selectedUserId);
          }
        )
        .subscribe();
      
      // Cleanup on unmount or when selectedUserId changes
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUserId]);

  return {
    documents,
    selectedUserId,
    setSelectedUserId,
    isLoadingDocuments,
    loadingDocumentIds,
    fetchUserDocuments,
    handleDownload,
    handleDeleteDocument
  };
};
