import { useState, useEffect } from "react";
import { useDocumentFetch } from "./useDocumentFetch";
import { useDocumentDelete } from "./useDocumentDelete";
import { useDocumentUpload } from "./useDocumentUpload";
import { useUserManagement } from "@/hooks/useUserManagement";
import { triggerExpiredDocumentsCleanup } from "@/utils/documents/documentCleanup";

export const useDocumentManagement = () => {
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { supabaseUsers, users } = useUserManagement();
  
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
    await deleteDocument(documentId, selectedUserId);
  };
  
  // When selectedUserId changes, fetch documents and trigger cleanup
  useEffect(() => {
    if (selectedUserId) {
      fetchUserDocuments(selectedUserId);
      
      // Run cleanup of expired documents when loading documents for a user
      // This helps keep the database clean without needing a separate cron job
      triggerExpiredDocumentsCleanup().then(result => {
        if (result.deleted > 0) {
          console.log(`Cleanup completed: ${result.deleted} expired documents removed`);
        }
      });
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
