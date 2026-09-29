
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/utils/auth/types";
import { useAuth } from "@/contexts/AuthContext";
import { downloadDocument } from "@/utils/documents/documentManagement";
import { supabase } from "@/integrations/supabase/client";
import { useNotifications } from "@/hooks/useNotifications";

/**
 * Hook for document-related actions like download and marking as viewed
 */
export const useDocumentActions = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());
  const { markDocumentNotificationAsRead } = useNotifications();

  /**
   * Mark a document as viewed
   * @param docItem Document to mark as viewed
   */
  const markAsViewed = async (docItem: Document) => {
    // If already viewed, no need to update
    if (docItem.viewed) return;
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, docItem.id]));
      
      // Insert record in visualized_documents table
      const { error: viewError } = await supabase
        .from('visualized_documents')
        .insert({
          user_id: user?.id,
          document_id: docItem.id,
        })
        .select()
        .single();
        
      if (viewError) throw viewError;
      

    } catch (error: any) {
      console.error('Error marking document as viewed:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível marcar o documento como visualizado."
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(docItem.id);
        return newSet;
      });
    }
  };

  /**
   * Download a document
   * @param docItem Document to download
   */
  const handleDownload = async (docItem: Document): Promise<void> => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Usuário não autenticado. Por favor, faça login novamente."
      });
      return;
    }
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, docItem.id]));
      
      // Authorization is enforced by database/storage RLS through the company link.
      // Legacy files may physically remain inside the previous portal user's folder.
      let storagePath = "";
      if (docItem.storage_key) {
        storagePath = docItem.storage_key;
      } else {
        const filename = docItem.filename || docItem.original_filename || docItem.name;
        storagePath = `${docItem.user_id}/${filename}`;
        console.warn("Using legacy document path fallback:", storagePath);
      }
      
      console.log('Attempting to download document with path:', storagePath);
      
      // Download file from storage
      const { data, error } = await downloadDocument(storagePath);
      
      if (error) {
        console.error("Supabase download error:", error);
        throw new Error(`Error downloading document: ${error.message}`);
      }
      
      if (data) {
        // Create blob URL and start download
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = docItem.filename || docItem.original_filename || docItem.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Sucesso",
          description: "Documento baixado com sucesso!"
        });
        
        // Only mark as viewed AFTER successful download
        await markAsViewed(docItem);
        
        // Mark notification related to this document as read
        await markDocumentNotificationAsRead(docItem.id);
      } else {
        throw new Error("Arquivo não encontrado no storage.");
      }
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message || "Ocorreu um erro ao tentar baixar o documento."
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(docItem.id);
        return newSet;
      });
    }
  };

  return {
    loadingDocumentIds,
    setLoadingDocumentIds,
    markAsViewed,
    handleDownload
  };
};
