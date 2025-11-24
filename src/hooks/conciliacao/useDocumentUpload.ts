import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { v4 as uuidv4 } from 'uuid';

export const useDocumentUpload = (userId: string, competencia: string, onSuccess: () => void) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const uploadDocument = async (file: File) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${uuidv4()}.${fileExt}`;
      const filePath = `${userId}/${fileName}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('comprovantes')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      setUploadProgress(50);

      const { data: { publicUrl } } = supabase.storage
        .from('comprovantes')
        .getPublicUrl(filePath);

      const { data: documentData, error: insertError } = await supabase
        .from('documentos_conciliacao')
        .insert({
          user_id: userId,
          nome_arquivo: file.name,
          url_storage: publicUrl,
          status_processamento: 'nao_processado',
          competencia: competencia
        })
        .select()
        .single();

      if (insertError) throw insertError;

      setUploadProgress(75);

      // Disparar webhook n8n se configurado
      const webhookUrl = import.meta.env.VITE_N8N_WEBHOOK_VALIDACAO_URL;
      if (webhookUrl) {
        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              documento_id: documentData.id,
              url_storage: publicUrl,
              competencia: competencia
            })
          });
        } catch (webhookError) {
          console.error('Erro ao chamar webhook n8n:', webhookError);
        }
      }

      setUploadProgress(100);

      toast({
        title: "Upload realizado com sucesso",
        description: "O documento será processado em instantes."
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro no upload",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return {
    uploadDocument,
    isUploading,
    uploadProgress
  };
};
