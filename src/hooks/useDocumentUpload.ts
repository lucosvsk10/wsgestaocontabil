
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserType } from "@/types/admin";
import { generateDocumentStorageKey } from "@/utils/fileUtils";

export const useDocumentUpload = (
  fetchUserDocuments: (userId: string) => Promise<void>
) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [documentName, setDocumentName] = useState("");
  const [documentCategory, setDocumentCategory] = useState("Documentações");
  const [documentObservations, setDocumentObservations] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [noExpiration, setNoExpiration] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async (
    e: React.FormEvent,
    selectedUserId: string,
    supabaseUsers: any[],
    users: UserType[]
  ): Promise<{ success: boolean; documentId: string | null }> => {
    e.preventDefault();
    
    if (!selectedFile || !selectedUserId) {
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: "Por favor, selecione um arquivo e um usuário.",
      });
      return { success: false, documentId: null };
    }

    setIsUploading(true);

    try {
      // Generate a clean storage key with userId/normalized_filename
      const storageKey = generateDocumentStorageKey(selectedUserId, selectedFile.name);
      
      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("documents")
        .upload(storageKey, selectedFile);
        
      if (uploadError) throw uploadError;

      // Get public URL for fallback
      const { data: urlData } = await supabase.storage
        .from("documents")
        .getPublicUrl(storageKey);

      // Get user email for reference
      const userEmail = 
        supabaseUsers.find((u: any) => u.id === selectedUserId)?.email || 
        users.find(u => u.id === selectedUserId)?.email || 
        "Usuário sem email";

      // Convert expirationDate to ISO string if it exists and noExpiration is false
      const expiresAt = noExpiration ? null : expirationDate ? expirationDate.toISOString() : null;

      // Insert document record in database
      const { data: docData, error: docError } = await supabase
        .from("documents")
        .insert({
          name: documentName || selectedFile.name,
          file_url: urlData?.publicUrl || "",
          storage_key: storageKey,
          filename: selectedFile.name,
          original_filename: selectedFile.name,
          size: selectedFile.size,
          user_id: selectedUserId,
          category: documentCategory,
          observations: documentObservations,
          expires_at: expiresAt,
          viewed: false
        })
        .select("*")
        .single();
        
      if (docError) throw docError;

      toast({
        title: "Documento enviado com sucesso",
        description: `O documento foi enviado para ${userEmail}`,
      });

      // Reset form fields
      setDocumentName("");
      setDocumentObservations("");
      setSelectedFile(null);
      
      // Refresh documents list
      await fetchUserDocuments(selectedUserId);
      
      return { success: true, documentId: docData.id };
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast({
        variant: "destructive",
        title: "Erro ao enviar documento",
        description: error.message,
      });
      return { success: false, documentId: null };
    } finally {
      setIsUploading(false);
    }
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
