import { useState, useCallback, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/types/admin";
import { useDocumentCategories } from "./useDocumentCategories";

export const useDocumentManagement = (users: any[], supabaseUsers: any[]) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());
  const { toast } = useToast();
  const { categories, fetchCategories } = useDocumentCategories();

  // Function to fetch documents for a selected user
  const fetchDocuments = useCallback(async (userId: string) => {
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
        variant: "destructive",
        title: "Erro ao carregar documentos",
        description: error.message
      });
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [toast]);

  // Handle document download
  const handleDownload = async (document: Document) => {
    try {
      setLoadingDocumentIds(prev => new Set([...prev, document.id]));
      
      if (document.storage_key) {
        // Download using storage_key
        const { data, error } = await supabase.storage
          .from('documents')
          .download(document.storage_key);
        
        if (error) throw error;
        
        if (data) {
          const url = URL.createObjectURL(data);
          const a = window.document.createElement('a') as HTMLAnchorElement;
          a.href = url;
          a.download = document.filename || document.original_filename || document.name;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({
            title: "Download concluído",
            description: "O documento foi baixado com sucesso."
          });
          
          return;
        }
      }

      // Fallback to public URL
      if (document.file_url) {
        window.open(document.file_url, '_blank');
      } else {
        throw new Error("URL do documento não encontrada");
      }
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  };
  
  // Handle document deletion
  const handleDeleteDocument = async (documentId: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, documentId]));
      
      // Get the document details first
      const { data, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();
      
      if (fetchError) throw fetchError;
      
      // Delete from database
      const { error: deleteError } = await supabase
        .from('documents')
        .delete()
        .eq('id', documentId);
      
      if (deleteError) throw deleteError;
      
      // Delete from storage if we have storage_key
      if (data && data.storage_key) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove([data.storage_key]);
        
        if (storageError) {
          console.error('Error deleting file from storage:', storageError);
          // We continue anyway to keep the database clean
        }
      }
      
      // Update the documents list
      setDocuments(docs => docs.filter(doc => doc.id !== documentId));
      
      toast({
        title: "Documento excluído",
        description: "O documento foi excluído com sucesso."
      });
    } catch (error: any) {
      console.error('Erro ao excluir documento:', error);
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
  
  // Group documents by category
  const documentsByCategory = useCallback(() => {
    const result: Record<string, Document[]> = {};
    categories.forEach(category => {
      result[category.id] = documents.filter(doc => doc.category === category.id);
    });
    return result;
  }, [documents, categories]);
  
  // Fetch documents and categories when selected user changes
  useEffect(() => {
    if (selectedUserId) {
      fetchDocuments(selectedUserId);
      fetchCategories();
    } else {
      setDocuments([]);
    }
  }, [selectedUserId, fetchDocuments, fetchCategories]);
  
  // Setup real-time subscription for document changes
  useEffect(() => {
    if (selectedUserId) {
      const channel = supabase
        .channel(`documents-${selectedUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'documents',
            filter: `user_id=eq.${selectedUserId}`,
          },
          () => {
            // Refresh the documents when there's a change
            fetchDocuments(selectedUserId);
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUserId, fetchDocuments]);

  return {
    selectedUserId,
    setSelectedUserId,
    documents,
    documentsByCategory,
    categories,
    isLoadingDocuments,
    loadingDocumentIds,
    fetchDocuments,
    handleDownload,
    handleDeleteDocument
  };
};
