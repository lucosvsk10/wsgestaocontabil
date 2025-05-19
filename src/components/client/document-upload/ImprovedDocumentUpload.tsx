
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileDropzone } from "./FileDropzone";
import { DocumentCategorySelect } from "@/components/admin/document-upload/DocumentCategorySelect";
import { DocumentExpirationFields } from "@/components/admin/document-upload/DocumentExpirationFields";
import { DocumentObservations } from "@/components/admin/document-upload/DocumentObservations";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuidv4 } from 'uuid';

interface ImprovedDocumentUploadProps {
  userName: string;
  userId: string;
}

export const ImprovedDocumentUpload: React.FC<ImprovedDocumentUploadProps> = ({
  userName,
  userId
}) => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [documentCategory, setDocumentCategory] = useState("Documentações");
  const [documentObservations, setDocumentObservations] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [noExpiration, setNoExpiration] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (selectedFiles.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione pelo menos um arquivo para enviar."
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
      
      const uploadPromises = selectedFiles.map(async (file) => {
        try {
          // Generate a unique filename to prevent collisions
          const fileExt = file.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const fileKey = `${userId}/${fileName}`;
          
          // Upload file to storage
          const { data: fileData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileKey, file);
          
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
                user_id: userId,
                name: file.name.split('.')[0], // Use filename as document name
                category: documentCategory,
                observations: documentObservations,
                file_url: publicUrl,
                storage_key: fileKey,
                original_filename: file.name,
                size: file.size,
                filename: fileName,
                type: file.type,
                expires_at: expiresAt
              }
            ]);
          
          if (documentError) {
            throw documentError;
          }
          
          return { success: true, fileName: file.name };
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          return { success: false, fileName: file.name, error };
        }
      });
      
      const results = await Promise.all(uploadPromises);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);
      
      if (successful.length > 0) {
        toast({
          title: "Upload realizado com sucesso",
          description: `${successful.length} ${successful.length === 1 ? 'arquivo foi enviado' : 'arquivos foram enviados'} com sucesso.`
        });
        
        // Reset form
        setSelectedFiles([]);
        setDocumentObservations("");
      }
      
      if (failed.length > 0) {
        toast({
          variant: "destructive",
          title: "Erro no upload",
          description: `${failed.length} ${failed.length === 1 ? 'arquivo não pôde ser enviado' : 'arquivos não puderam ser enviados'}.`
        });
      }
      
    } catch (error: any) {
      console.error("Erro no upload:", error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error.message || "Ocorreu um erro ao enviar os documentos."
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full border border-gray-200 dark:border-navy-lighter/30 bg-white dark:bg-navy-medium rounded-lg shadow-lg overflow-hidden">
      <CardHeader className="space-y-1 rounded-t-md pb-4 bg-gray-50 dark:bg-navy-deeper border-b border-gray-200 dark:border-navy-lighter/30">
        <CardTitle className="text-navy dark:text-gold/90 font-medium text-xl">
          Enviar documentos para {userName}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        <form onSubmit={handleUpload} className="space-y-6">
          <div className="grid gap-5">
            <FileDropzone
              selectedFiles={selectedFiles}
              onFilesChange={setSelectedFiles}
              maxSize={20 * 1024 * 1024} // 20MB
              maxFiles={10}
            />
            
            <DocumentCategorySelect 
              documentCategory={documentCategory} 
              setDocumentCategory={setDocumentCategory} 
              documentCategories={["Imposto de Renda", "Documentações", "Certidões", "Contratos", "Notas Fiscais"]} 
            />
            
            <DocumentObservations 
              documentObservations={documentObservations} 
              setDocumentObservations={setDocumentObservations} 
            />

            <DocumentExpirationFields 
              noExpiration={noExpiration} 
              setNoExpiration={setNoExpiration} 
              expirationDate={expirationDate} 
              setExpirationDate={setExpirationDate} 
            />
          </div>

          <Button 
            type="submit" 
            className="w-full bg-navy hover:bg-navy/90 dark:bg-gold/90 dark:hover:bg-gold dark:text-navy text-white font-medium shadow-md transition-colors py-2.5"
            disabled={isUploading || selectedFiles.length === 0}
          >
            {isUploading ? (
              <div className="flex items-center justify-center">
                <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-background border-t-foreground"></div>
                Enviando...
              </div>
            ) : (
              `Enviar ${selectedFiles.length} ${selectedFiles.length === 1 ? 'Documento' : 'Documentos'}`
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
