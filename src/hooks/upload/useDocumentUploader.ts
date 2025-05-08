
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

interface DocumentUploadProps {
  selectedUserId: string;
  documentName: string;
  documentCategory: string;
  documentObservations: string;
  selectedFile: File | null;
  expirationDate: Date | null;
  noExpiration: boolean;
}

interface UserData {
  supabaseUsers: any[];
  userProfiles: any[];
}

export const useDocumentUploader = (fetchUserDocuments: (userId: string) => Promise<void>) => {
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { notifyNewDocument } = useNotifications();
  
  const uploadDocument = async (
    e: React.FormEvent,
    documentData: DocumentUploadProps,
    userData: UserData
  ) => {
    e.preventDefault();
    
    const {
      selectedUserId,
      documentName,
      documentCategory,
      documentObservations,
      selectedFile,
      expirationDate,
      noExpiration
    } = documentData;
    
    if (!selectedFile || !documentName || !documentCategory || !selectedUserId) {
      toast({
        title: "Erro",
        description: "Por favor, preencha todos os campos obrigatórios.",
        variant: "destructive"
      });
      return;
    }
    
    try {
      setIsUploading(true);
      
      // Calculate expiration date if applicable
      let expiresAt = null;
      if (!noExpiration && expirationDate) {
        expiresAt = expirationDate.toISOString();
      }
      
      // Generate a unique filename to prevent collisions
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const fileKey = `${selectedUserId}/${fileName}`;
      
      // Upload file to storage
      const { data: fileData, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileKey, selectedFile);
      
      if (uploadError) {
        throw uploadError;
      }
      
      // Get file URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileKey);
      
      // Create document record in the database
      const { data: documentData, error: documentError } = await supabase
        .from('documents')
        .insert([
          {
            user_id: selectedUserId,
            name: documentName,
            category: documentCategory,
            observations: documentObservations,
            file_url: publicUrl,
            storage_key: fileKey,
            original_filename: selectedFile.name,
            size: selectedFile.size,
            filename: fileName,
            type: selectedFile.type,
            expires_at: expiresAt
          }
        ])
        .select()
        .single();
      
      if (documentError) {
        throw documentError;
      }
      
      // Create a notification for the user about the new document
      try {
        console.log(`Tentando criar notificação para o usuário ${selectedUserId} sobre documento: ${documentName}`);
        const notificationResult = await notifyNewDocument(selectedUserId, documentName);
        console.log('Notificação criada:', notificationResult);
      } catch (notifError) {
        console.error('Erro ao criar notificação de documento:', notifError);
        // Não interrompemos o fluxo por causa de erro na notificação
      }
      
      // Refresh documents list
      await fetchUserDocuments(selectedUserId);
      
      toast({
        title: "Sucesso",
        description: "Documento enviado com sucesso!"
      });
      
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast({
        title: "Erro no upload",
        description: error.message || "Ocorreu um erro ao enviar o documento.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return {
    isUploading,
    uploadDocument
  };
};
