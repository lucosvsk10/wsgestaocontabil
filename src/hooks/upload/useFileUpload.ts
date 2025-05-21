
import { useState } from 'react';
import { FileWithPreview } from '@/types/upload';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export const useFileUpload = (userId: string, userName: string) => {
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const onDrop = (acceptedFiles: File[], globalCategory: string, globalObservations: string, noExpiration: boolean, globalExpirationDate: Date | null) => {
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file),
        id: crypto.randomUUID(),
        documentName: file.name.split('.')[0],
        documentCategory: globalCategory,
        documentObservations: globalObservations,
        expirationDate: noExpiration ? null : globalExpirationDate,
      })
    ) as FileWithPreview[];
    
    setFiles(prev => [...prev, ...newFiles]);
  };

  const removeFile = (id: string) => {
    setFiles(files => {
      const filteredFiles = files.filter(file => file.id !== id);
      return filteredFiles;
    });
  };

  const updateFileField = (id: string, field: 'documentName' | 'documentCategory' | 'documentObservations', value: string) => {
    setFiles(files => files.map(file => 
      file.id === id 
        ? { ...file, [field]: value } 
        : file
    ));
  };

  const updateFileExpirationDate = (id: string, date: Date | null) => {
    setFiles(files => files.map(file => 
      file.id === id 
        ? { ...file, expirationDate: date } 
        : file
    ));
  };

  const applyGlobalSettingsToAll = (globalCategory: string, globalObservations: string, noExpiration: boolean, globalExpirationDate: Date | null) => {
    setFiles(files => files.map(file => ({
      ...file,
      documentCategory: globalCategory,
      documentObservations: globalObservations,
      expirationDate: noExpiration ? null : globalExpirationDate,
    })));
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione pelo menos um arquivo para upload.",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file names
    const filesWithoutNames = files.filter(file => !file.documentName);
    if (filesWithoutNames.length > 0) {
      toast({
        title: "Nome de documento faltando",
        description: "Por favor, forneça um nome para todos os documentos.",
        variant: "destructive",
      });
      return;
    }
    
    setIsUploading(true);
    const uploadedFiles: string[] = [];
    const failedUploads: string[] = [];
    
    try {
      // Upload files one by one
      for (const file of files) {
        try {
          const fileExt = file.name.split('.').pop();
          const fileName = `${crypto.randomUUID()}.${fileExt}`;
          const filePath = `${userId}/${fileName}`;
          
          // Upload file to storage
          const { error: storageError } = await supabase.storage
            .from('documents')
            .upload(filePath, file);
            
          if (storageError) throw storageError;
          
          // Get file URL
          const { data: urlData } = supabase.storage
            .from('documents')
            .getPublicUrl(filePath);
            
          if (!urlData?.publicUrl) {
            throw new Error('Erro ao obter URL pública do arquivo');
          }
          
          // Format the expiration date as ISO string if it exists
          const expirationDate = file.expirationDate 
            ? file.expirationDate.toISOString() 
            : null;
          
          // Insert document record
          const { error: dbError } = await supabase
            .from('documents')
            .insert({
              user_id: userId,
              name: file.documentName || file.name.split('.')[0],
              original_filename: file.name,
              filename: fileName,
              category: file.documentCategory,
              observations: file.documentObservations,
              expires_at: expirationDate,
              file_url: urlData.publicUrl,
              storage_key: filePath,
              size: file.size
            });
            
          if (dbError) throw dbError;
          
          uploadedFiles.push(file.name);
        } catch (error) {
          console.error(`Erro ao fazer upload do arquivo ${file.name}:`, error);
          failedUploads.push(file.name);
        }
      }
      
      // Success toast
      if (uploadedFiles.length > 0) {
        toast({
          title: "Upload concluído com sucesso!",
          description: `${uploadedFiles.length} documento(s) foi/foram enviado(s) para ${userName}.`,
        });
      }
      
      // Alert for failed uploads if any
      if (failedUploads.length > 0) {
        toast({
          title: "Alguns uploads falharam",
          description: `${failedUploads.length} documento(s) não puderam ser enviados.`,
          variant: "destructive",
        });
      }
      
      // Remove successful uploads from the files state
      const successfulUploadIds = files
        .filter(file => uploadedFiles.includes(file.name))
        .map(file => file.id);
      
      setFiles(files => files.filter(file => !successfulUploadIds.includes(file.id)));
      
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Ocorreu um erro ao fazer upload dos documentos.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return {
    files,
    isUploading,
    onDrop,
    removeFile,
    updateFileField,
    updateFileExpirationDate,
    applyGlobalSettingsToAll,
    handleUpload,
  };
};
