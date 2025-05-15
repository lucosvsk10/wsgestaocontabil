
import { useState, useEffect } from "react";
import { useDocumentFetch } from "../useDocumentFetch";
import { useDocumentActions } from "./useDocumentActions";
import { useDocumentDelete } from "../useDocumentDelete";
import { useDocumentUpload } from "../useDocumentUpload";
import { triggerExpiredDocumentsCleanup } from "@/utils/documents/documentCleanup";
import { UserType } from "@/types/admin";
import { supabase } from "@/integrations/supabase/client";

export const useDocumentManager = (users: any[], supabaseUsers: any[]) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const {
    documents,
    isLoadingDocuments,
    fetchUserDocuments
  } = useDocumentFetch();
  
  const {
    loadingDocumentIds,
    handleDownload
  } = useDocumentActions();
  
  // Uso do hook de exclusão de documentos
  const { handleDeleteDocument: deleteDocument } = useDocumentDelete(fetchUserDocuments);
  
  const {
    isUploading,
    documentName,
    setDocumentName,
    documentCategory,
    setDocumentCategory,
    documentObservations,
    setDocumentObservations,
    selectedFile,
    setSelectedFile,
    expirationDate,
    setExpirationDate,
    noExpiration,
    setNoExpiration,
    handleFileChange,
    handleUpload
  } = useDocumentUpload(fetchUserDocuments);
  
  // Wrapper function for handleUpload that includes the required parameters
  const uploadHandleUpload = async (e: React.FormEvent) => {
    if (!selectedUserId) return;
    
    await handleUpload(e, selectedUserId, supabaseUsers, users as UserType[]);
  };
  
  // Wrapper for handleDeleteDocument to include selectedUserId
  const handleDeleteDocument = async (documentId: string) => {
    await deleteDocument(documentId, selectedUserId);
  };
  
  // Effect to fetch documents when selectedUserId changes
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDocuments(selectedUserId);
      
      // Run cleanup of expired documents
      triggerExpiredDocumentsCleanup().catch(error => {
        console.error("Error during expired documents cleanup:", error);
      });

      // Adicionar canal de tempo real para esse usuário específico
      const channel = supabase
        .channel(`admin-documents-${selectedUserId}`)
        .on(
          'postgres_changes',
          {
            event: '*',  // Monitorar todos os eventos (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'documents',
            filter: `user_id=eq.${selectedUserId}`,
          },
          (payload) => {
            console.log("Mudança detectada em documentos:", payload);
            // Atualizar a lista de documentos
            fetchUserDocuments(selectedUserId);
          }
        )
        .subscribe();
      
      // Limpar inscrição quando o componente desmontar ou o usuário mudar
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [selectedUserId, fetchUserDocuments]);

  return {
    documents,
    selectedUserId,
    setSelectedUserId,
    isUploading,
    documentName,
    setDocumentName,
    documentCategory,
    setDocumentCategory,
    documentObservations,
    setDocumentObservations,
    selectedFile,
    setSelectedFile,
    isLoadingDocuments,
    expirationDate,
    setExpirationDate,
    noExpiration,
    setNoExpiration,
    loadingDocumentIds,
    fetchUserDocuments,
    handleFileChange,
    handleUpload: uploadHandleUpload,
    handleDeleteDocument,
    downloadDocument: handleDownload
  };
};
