
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
  const { isUploading, uploadDocument } = useDocumentUploader(fetchUserDocuments);

  // Wrapper function for handleUpload that includes the required parameters
  const handleUpload = async (
    e: React.FormEvent,
    selectedUserId: string,
    supabaseUsers: any[],
    users: UserType[]
  ) => {
    await uploadDocument(
      e,
      {
        selectedUserId,
        documentName,
        documentCategory,
        documentObservations,
        selectedFile,
        expirationDate,
        noExpiration
      },
      {
        supabaseUsers,
        userProfiles: users
      }
    );

    // Reset form after successful upload
    setSelectedFile(null);
    setDocumentName("");
    setDocumentObservations("");
    setExpirationDate(null);
    setNoExpiration(false);
    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
  };

  return {
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
  };
};
