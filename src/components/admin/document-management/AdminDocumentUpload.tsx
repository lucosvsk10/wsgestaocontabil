
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Calendar as CalendarIcon, Upload, Settings, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CategoryManagementModal } from "./CategoryManagementModal";
import { useDocumentCategories } from "@/hooks/document-management/useDocumentCategories";

interface AdminDocumentUploadProps {
  userId: string;
  onDocumentUploaded?: () => void;
}

export const AdminDocumentUpload: React.FC<AdminDocumentUploadProps> = ({ userId, onDocumentUploaded }) => {
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

  // Gerenciamento de categorias
  const {
    categories,
    isModalOpen,
    setIsModalOpen,
    addCategory,
    updateCategory,
    deleteCategory
  } = useDocumentCategories();

  // Convert files to an array
  const filesArray = selectedFiles ? Array.from(selectedFiles) : [];

  // Função para lidar com o file drop
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files) {
      setSelectedFiles(e.dataTransfer.files);
    }
  };

  // Função para lidar com a seleção de arquivo
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(e.target.files);
    }
  };

  // Prevenção de comportamento padrão para eventos de arrastar
  const preventDefaults = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const resetForm = () => {
    setDocumentName("");
    setDocumentCategory("");
    setDocumentSubcategory("");
    setDocumentObservations("");
    setExpirationDate(null);
    setNoExpiration(false);
    setSelectedFiles(null);
    
    // Reset file input field
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
      setUploadProgress(10); // Iniciar progresso

      let successCount = 0;
      const totalFiles = filesArray.length;
      
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        
        // Gerar um nome de arquivo único
        const fileExt = file.name.split('.').pop();
        const fileName = `${userId}/${Date.now()}-${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const storageKey = `${userId}/${fileName}`;
        
        // Upload do arquivo para o Storage do Supabase
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storageKey, file);
        
        if (uploadError) throw uploadError;
        
        setUploadProgress(30 + (i / totalFiles) * 40); // Progresso intermediário
        
        // Obter URL do arquivo
        const { data: urlData } = await supabase.storage
          .from('documents')
          .createSignedUrl(storageKey, 31536000); // URL válida por 1 ano
        
        if (!urlData?.signedUrl) {
          throw new Error('Não foi possível obter URL para o arquivo');
        }
        
        // Definir data de expiração
        let expiresAt = null;
        if (!noExpiration && expirationDate) {
          expiresAt = expirationDate.toISOString();
        }
        
        // Salvar registro na tabela de documentos
        const docName = totalFiles > 1 ? 
          `${documentName} (${i+1}/${totalFiles})` : documentName;
        
        const { error: dbError } = await supabase
          .from('documents')
          .insert({
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
        
        setUploadProgress(70 + (i / totalFiles) * 30); // Progresso final
      }
      
      setUploadProgress(100);
      
      toast({
        title: `${successCount} ${successCount === 1 ? 'documento enviado' : 'documentos enviados'}`,
        description: "Upload concluído com sucesso."
      });
      
      // Reset form
      resetForm();
      
      // Notificar componente pai para atualizar a lista de documentos
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

  // Renderização do indicador de progresso
  const renderProgressBar = () => {
    return (
      <div className="w-full bg-gray-200 dark:bg-navy-light/30 rounded-full h-2 mt-4">
        <div 
          className="bg-gold h-2 rounded-full" 
          style={{ width: `${uploadProgress}%` }}
        ></div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card className="border-gray-200 dark:border-navy-lighter/30 shadow-sm">
        <CardContent className="pt-6">
          {/* Área de upload */}
          <div 
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              ${isUploading ? 
                'border-gold/50 bg-gold/5 dark:bg-gold/10' : 
                'border-gray-300 dark:border-navy-lighter/50 hover:border-gold hover:bg-gold/5 dark:hover:bg-gold/10'}
            `}
            onDrop={handleDrop}
            onDragOver={preventDefaults}
            onDragEnter={preventDefaults}
            onDragLeave={preventDefaults}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            {isUploading ? (
              <div className="flex flex-col items-center">
                <LoadingSpinner />
                <p className="mt-2 text-navy-dark dark:text-white">Enviando documento(s)...</p>
                {renderProgressBar()}
              </div>
            ) : selectedFiles && selectedFiles.length > 0 ? (
              <div>
                <div className="mb-4 flex items-center justify-center">
                  <Check className="h-10 w-10 text-green-500 dark:text-green-400" />
                </div>
                <h3 className="font-medium text-lg text-navy-dark dark:text-white mb-1">
                  {selectedFiles.length} {selectedFiles.length === 1 ? 'arquivo selecionado' : 'arquivos selecionados'}
                </h3>
                <ul className="max-h-32 overflow-auto text-sm text-gray-600 dark:text-gray-300 mt-2">
                  {filesArray.map((file, index) => (
                    <li key={index} className="truncate">{file.name}</li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">
                  Clique para selecionar outros arquivos
                </p>
              </div>
            ) : (
              <>
                <Upload className="h-10 w-10 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                <h3 className="font-medium text-lg text-navy-dark dark:text-white">
                  Arraste e solte arquivos aqui
                </h3>
                <p className="text-gray-500 dark:text-gray-400 mt-1">
                  ou clique para selecionar
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                  Suporta múltiplos arquivos
                </p>
              </>
            )}
            <Input 
              id="fileInput"
              type="file"
              multiple
              className="hidden"
              onChange={handleFileChange}
              disabled={isUploading}
            />
          </div>

          {/* Formulário de metadados */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <Label htmlFor="documentName" className="text-gray-700 dark:text-gray-300">
                Nome do Documento*
              </Label>
              <Input
                id="documentName"
                value={documentName}
                onChange={(e) => setDocumentName(e.target.value)}
                placeholder="Nome que será exibido para o cliente"
                className="mt-1 border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20 dark:text-white"
                disabled={isUploading}
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center">
                <Label htmlFor="documentCategory" className="text-gray-700 dark:text-gray-300">
                  Categoria*
                </Label>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 text-gray-500 hover:text-navy dark:hover:text-gold"
                  onClick={() => setIsModalOpen(true)}
                >
                  <Settings className="h-4 w-4 mr-1" />
                  Gerenciar
                </Button>
              </div>
              <select
                id="documentCategory"
                value={documentCategory}
                onChange={(e) => setDocumentCategory(e.target.value)}
                className="mt-1 w-full rounded-md border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20 dark:text-white"
                disabled={isUploading}
                required
              >
                <option value="">Selecione uma categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="documentSubcategory" className="text-gray-700 dark:text-gray-300">
                Subcategoria (opcional)
              </Label>
              <Input
                id="documentSubcategory"
                value={documentSubcategory}
                onChange={(e) => setDocumentSubcategory(e.target.value)}
                placeholder="Ex: Termo de aceite, Contra-cheque, etc"
                className="mt-1 border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20 dark:text-white"
                disabled={isUploading}
              />
            </div>

            <div>
              <Label htmlFor="documentExpiration" className="text-gray-700 dark:text-gray-300">
                Data de Expiração (opcional)
              </Label>
              <div className="flex items-center mt-1 space-x-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20",
                        !expirationDate && !noExpiration && "text-gray-500 dark:text-gray-400"
                      )}
                      disabled={isUploading || noExpiration}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expirationDate ? (
                        format(expirationDate, "PPP", { locale: ptBR })
                      ) : (
                        "Selecione uma data"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-white dark:bg-navy-deeper">
                    <Calendar
                      mode="single"
                      selected={expirationDate || undefined}
                      onSelect={setExpirationDate}
                      initialFocus
                      disabled={(date) => date < new Date()}
                      className="bg-white dark:bg-navy-deeper"
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="noExpiration"
                  checked={noExpiration}
                  onChange={(e) => {
                    setNoExpiration(e.target.checked);
                    if (e.target.checked) setExpirationDate(null);
                  }}
                  className="rounded border-gray-300 dark:border-navy-lighter/40"
                  disabled={isUploading}
                />
                <label htmlFor="noExpiration" className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                  Sem data de expiração
                </label>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="documentObservations" className="text-gray-700 dark:text-gray-300">
                Observações (opcional)
              </Label>
              <Textarea
                id="documentObservations"
                value={documentObservations}
                onChange={(e) => setDocumentObservations(e.target.value)}
                placeholder="Informações adicionais sobre o documento"
                className="mt-1 border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/20 dark:text-white"
                disabled={isUploading}
                rows={3}
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <Button
              onClick={handleUpload}
              disabled={isUploading || !selectedFiles || selectedFiles.length === 0 || !documentName || !documentCategory}
              className="bg-gold hover:bg-gold/80 text-navy dark:text-navy-dark"
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

      {/* Modal para gerenciar categorias */}
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
