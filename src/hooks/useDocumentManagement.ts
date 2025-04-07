
import { useState } from "react";
import { useDocumentFetch } from "./useDocumentFetch";
import { useDocumentDelete } from "./useDocumentDelete";
import { useDocumentUpload } from "./useDocumentUpload";
import { useUserManagement } from "@/hooks/useUserManagement";

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
  
  // Fix the missing variables in the upload hook
  const uploadHandleUpload = async (e: React.FormEvent) => {
    if (!handleUpload) return;
    
    // Create a wrapper for the original handleUpload function
    const event = { ...e, preventDefault: e.preventDefault } as React.FormEvent;
    
    // Call the original function with the required context
    await handleUpload.call(
      { selectedUserId, supabaseUsers, users, fetchUserDocuments },
      event
    );
  };
  
  // Wrapper for handleDeleteDocument to include selectedUserId
  const handleDeleteDocument = async (documentId: string) => {
    await deleteDocument(documentId, selectedUserId);
  };
  
  // When selectedUserId changes, fetch documents
  useState(() => {
    if (selectedUserId) {
      fetchUserDocuments(selectedUserId);
    }
  });

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
