
import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { useToast } from "@/hooks/use-toast";
import { Document as DocumentType } from "@/utils/auth/types";
import { v4 as uuidv4 } from 'uuid';
import { useNotifications } from "@/hooks/useNotifications";

interface DocumentMetadata {
  name: string;
  category: string;
  observations?: string;
  expires_at?: string | null;
}

export const useDocumentUploader = () => {
  const [uploading, setUploading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const { createNotification } = useNotifications();

  const uploadDocument = async (file: File, metadata: DocumentMetadata) => {
    if (!user) {
      toast({
        title: "Não autenticado",
        description: "Você precisa estar logado para enviar documentos.",
        variant: "destructive",
      });
      return false;
    }

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `${user.id}/${fileName}`;

    try {
      const { data, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      const file_url = `https://nadtoitgkukzbghtbohm.supabase.co/storage/v1/object/public/documents/${filePath}`;

      const { error: dbError } = await supabase
        .from('documents')
        .insert<DocumentType>({
          id: uuidv4(),
          user_id: user.id,
          name: metadata.name,
          filename: fileName,
          original_filename: file.name,
          category: metadata.category,
          file_url: file_url,
          observations: metadata.observations,
          uploaded_at: new Date().toISOString(),
          expires_at: metadata.expires_at,
          storage_key: filePath,
          size: file.size,
          type: file.type,
        });

      if (dbError) {
        // Delete the file from storage if DB insert fails
        await supabase.storage.from('documents').remove([filePath]);
        throw dbError;
      }

      await createNotification(`Novo documento enviado: ${metadata.name}`, "document");
      
      toast({
        title: "Sucesso!",
        description: `${metadata.name} enviado com sucesso.`,
      });
      setUploading(false);
      return true;
    } catch (error: any) {
      console.error("Erro ao enviar o documento:", error);
      toast({
        title: "Erro!",
        description: `Falha ao enviar ${file.name}: ${error.message || error}`,
        variant: "destructive",
      });
      setUploading(false);
      return false;
    }
  };

  return {
    uploading,
    uploadDocument,
  };
};
