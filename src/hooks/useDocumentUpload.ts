
import { useFileSelection } from "./upload/useFileSelection";
import { useDocumentMetadata } from "./upload/useDocumentMetadata";
import { useDocumentUploader } from "./upload/useDocumentUploader";
import { UserType } from "@/types/admin";

export const useDocumentUpload = (fetchUserDocuments: (userId: string) => Promise<void>) => {
  // File selection hook
  const {
    selectedFile,
    setSelectedFile,
    documentName,
    setDocumentName,
    handleFileChange
  } = useFileSelection();

  // Document metadata hook
  const {
    documentCategory,
    setDocumentCategory,
    documentObservations,
    setDocumentObservations,
    expirationDate,
    setExpirationDate,
    noExpiration,
    setNoExpiration
  } = useDocumentMetadata();

  // Document upload hook
  const { uploading, uploadDocument } = useDocumentUploader();

  // Wrapper function for handleUpload that includes the required parameters
  const handleUpload = async (
    e: React.FormEvent,
    selectedUserId: string,
    supabaseUsers: any[]
  ) => {
    e.preventDefault();
    
    if (!selectedFile) {
      console.error("No file selected");
      return;
    }
    
    // Calculate expiration date based on user selection
    const finalExpirationDate = noExpiration ? null : expirationDate?.toISOString();
    
    // Prepare metadata
    const metadata = {
      name: documentName,
      category: documentCategory,
      observations: documentObservations,
      expires_at: finalExpirationDate,
    };
    
    // Upload the document
    const success = await uploadDocument(selectedFile, metadata);
    
    if (success) {
      // Refresh documents list
      if (fetchUserDocuments) {
        await fetchUserDocuments(selectedUserId);
      }
      
      // Reset form after successful upload
      setSelectedFile(null);
      setDocumentName("");
      setDocumentObservations("");
      setExpirationDate(null);
      setNoExpiration(false);
      const fileInput = document.getElementById('fileInput') as HTMLInputElement;
      if (fileInput) fileInput.value = "";
    }
  };

  return {
    isUploading: uploading,
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
  };
};
