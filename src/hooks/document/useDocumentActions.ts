
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/utils/auth/types";
import { useAuth } from "@/contexts/AuthContext";
import { downloadDocument } from "@/utils/documents/documentManagement";
import { hasDocumentAccess } from "@/utils/auth/userChecks";
import { supabase } from "@/integrations/supabase/client";

/**
 * Hook for document-related actions like download and marking as viewed
 */
export const useDocumentActions = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());

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
      
      // Also update viewed flag in documents table for consistency
      const { error } = await supabase
        .from('documents')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', docItem.id);
        
      if (error) throw error;
      
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
    
    // Mark as viewed when downloaded
    await markAsViewed(docItem);
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, docItem.id]));
      
      // Check if document belongs to authenticated user
      if (!hasDocumentAccess(user.id, docItem.user_id, docItem.storage_key)) {
        throw new Error("Você não tem permissão para baixar este documento.");
      }
      
      let storagePath = "";
      
      // If we have storage_key, use it as base to build the path
      if (docItem.storage_key) {
        // Verify storage_key starts with user ID for security
        if (!docItem.storage_key.startsWith(`${user.id}/`)) {
          throw new Error("Caminho de armazenamento inválido para este usuário.");
        }
        storagePath = docItem.storage_key;
      } else {
        // Fallback to build a path based on user ID and filename
        const filename = docItem.filename || docItem.original_filename || docItem.name;
        storagePath = `${user.id}/${filename}`;
        console.warn("Using alternative path for download:", storagePath);
      }
      
      console.log('Attempting to download document with path:', storagePath);
      
      // Download file from storage
      const { data, error } = await downloadDocument(storagePath, user.id);
      
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
