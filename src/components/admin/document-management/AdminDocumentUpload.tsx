
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Upload } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CategoryManagementModal } from "./CategoryManagementModal";
import { useDocumentCategories } from "@/hooks/document-management/useDocumentCategories";
import { DocumentUploadArea } from "./DocumentUploadArea";
import { DocumentMetadataForm } from "./DocumentMetadataForm";
import { DocumentProgressBar } from "./DocumentProgressBar";

interface AdminDocumentUploadProps {
  userId: string;
  onDocumentUploaded?: () => void;
}

export const AdminDocumentUpload: React.FC<AdminDocumentUploadProps> = ({
  userId,
  onDocumentUploaded
}) => {
  const [documentName, setDocumentName] = useState("");
  const [documentCategory, setDocumentCategory] = useState("");
  const [documentSubcategory, setDocumentSubcategory] = useState("");
  const [documentObservations, setDocumentObservations] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [noExpiration, setNoExpiration] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { toast } = useToast();

  const {
    categories,
    isModalOpen,
    setIsModalOpen,
    addCategory,
    updateCategory,
    deleteCategory
  } = useDocumentCategories();

  const filesArray = selectedFiles ? Array.from(selectedFiles) : [];

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setSelectedFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  const handleDropAreaClick = () => {
    document.getElementById('fileInput')?.click();
  };
  
  const resetForm = () => {
    setDocumentName("");
    setDocumentCategory("");
    setDocumentSubcategory("");
    setDocumentObservations("");
    setExpirationDate(null);
    setNoExpiration(false);
    setSelectedFiles(null);

    const fileInput = document.getElementById('fileInput') as HTMLInputElement;
    if (fileInput) fileInput.value = "";
    setUploadProgress(0);
  };
  
  const handleUpload = async () => {
    if (!selectedFiles || !selectedFiles.length) {
      toast({
        variant: "destructive",
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para enviar."
      });
      return;
    }
    if (!documentName.trim()) {
      toast({
        variant: "destructive",
        title: "Nome não definido",
        description: "Por favor, forneça um nome para o documento."
      });
      return;
    }
    if (!documentCategory) {
      toast({
        variant: "destructive",
        title: "Categoria não selecionada",
        description: "Por favor, selecione uma categoria para o documento."
      });
      return;
    }
    
    try {
      setIsUploading(true);
      setUploadProgress(10);

      let successCount = 0;
      const totalFiles = filesArray.length;
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];

        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const storageKey = `${userId}/${fileName}`;

        const { error: uploadError } = await supabase.storage.from('documents').upload(storageKey, file);
        if (uploadError) throw uploadError;
        setUploadProgress(30 + i / totalFiles * 40);

        const { data: urlData } = await supabase.storage.from('documents').createSignedUrl(storageKey, 31536000);

        if (!urlData?.signedUrl) {
          throw new Error('Não foi possível obter URL para o arquivo');
        }

        let expiresAt = null;
        if (!noExpiration && expirationDate) {
          expiresAt = expirationDate.toISOString();
        }

        const docName = totalFiles > 1 ? `${documentName} (${i + 1}/${totalFiles})` : documentName;
        const { error: dbError } = await supabase.from('documents').insert({
          user_id: userId,
          name: docName,
          file_url: urlData.signedUrl,
          storage_key: storageKey,
          category: documentCategory,
          subcategory: documentSubcategory || null,
          observations: documentObservations || null,
          expires_at: expiresAt,
          original_filename: file.name,
          size: file.size
        });
        if (dbError) throw dbError;
        successCount++;
        setUploadProgress(70 + i / totalFiles * 30);
      }
      setUploadProgress(100);
      toast({
        title: `${successCount} ${successCount === 1 ? 'documento enviado' : 'documentos enviados'}`,
        description: "Upload concluído com sucesso."
      });

      resetForm();

      if (onDocumentUploaded) {
        onDocumentUploaded();
      }
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        variant: "destructive",
        title: "Erro no upload",
        description: error.message
      });
    } finally {
      setIsUploading(false);
    }
  };
  
  return (
    <div className="space-y-6">
      <Card className="border-[#e6e6e6] dark:border-navy-lighter/30 shadow-sm">
        <CardContent className="pt-6">
          <DocumentUploadArea
            selectedFiles={selectedFiles}
            isUploading={isUploading}
            onDrop={handleDrop}
            onFileChange={handleFileChange}
            onDropAreaClick={handleDropAreaClick}
          />

          {isUploading && <DocumentProgressBar uploadProgress={uploadProgress} />}

          <DocumentMetadataForm
            documentName={documentName}
            setDocumentName={setDocumentName}
            documentCategory={documentCategory}
            setDocumentCategory={setDocumentCategory}
            documentSubcategory={documentSubcategory}
            setDocumentSubcategory={setDocumentSubcategory}
            documentObservations={documentObservations}
            setDocumentObservations={setDocumentObservations}
            expirationDate={expirationDate}
            setExpirationDate={setExpirationDate}
            noExpiration={noExpiration}
            setNoExpiration={setNoExpiration}
            categories={categories}
            isUploading={isUploading}
            onOpenCategoryModal={() => setIsModalOpen(true)}
          />

          <div className="mt-8 flex justify-end">
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || !selectedFiles || selectedFiles.length === 0 || !documentName || !documentCategory} 
              className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-gold dark:text-[#d9d9d9] dark:hover:bg-gold/10"
            >
              {isUploading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Enviar {selectedFiles && selectedFiles.length > 1 ? `(${selectedFiles.length} arquivos)` : ''}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <CategoryManagementModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        categories={categories} 
        isLoading={false} 
        onAdd={addCategory} 
        onUpdate={updateCategory} 
        onDelete={deleteCategory} 
      />
    </div>
  );
};
