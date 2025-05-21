
import { useState, useEffect } from "react";
import { useDocumentFetch } from "@/hooks/useDocumentFetch";
import { useDocumentDelete } from "@/hooks/useDocumentDelete";
import { useDocumentUpload } from "@/hooks/useDocumentUpload";
import { supabase } from "@/integrations/supabase/client";

export const useDocumentManager = (users: any[], supabaseUsers: any[]) => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  
  const {
    documents,
    isLoadingDocuments,
    fetchUserDocuments
  } = useDocumentFetch();
  
  const {
    handleDeleteDocument: deleteDocument
  } = useDocumentDelete(fetchUserDocuments);
  
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
    
    await handleUpload(e, selectedUserId, supabaseUsers, users);
  };
  
  // Wrapper for handleDeleteDocument to include selectedUserId
  const handleDeleteDocument = async (documentId: string) => {
    if (!selectedUserId) return;
    await deleteDocument(documentId, selectedUserId);
  };
  
  // Effect to fetch documents when selectedUserId changes
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDocuments(selectedUserId);
      
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
    fetchUserDocuments,
    handleFileChange,
    handleUpload: uploadHandleUpload,
    handleDeleteDocument
  };
};
