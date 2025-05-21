
import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectItem, SelectTrigger, SelectValue, SelectContent } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Check, FileIcon, FileX, Loader2, UploadCloud, X } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar as CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from 'uuid';

type FileWithPreview = {
  id: string;
  file: File;
  name: string;
  category: string;
  observations: string;
  expirationDate: Date | null;
  noExpiration: boolean;
};

interface ImprovedDocumentUploadProps {
  userName: string;
  userId: string;
  documentCategories?: string[];
  multipleFiles?: boolean;
}

export const ImprovedDocumentUpload: React.FC<ImprovedDocumentUploadProps> = ({
  userName,
  userId,
  documentCategories = ["Imposto de Renda", "Documentações", "Certidões", "Contratos", "Notas Fiscais", "Impostos"],
  multipleFiles = false
}) => {
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadQueue, setUploadQueue] = useState<FileWithPreview[]>([]);
  const { toast } = useToast();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: uuidv4(),
      file,
      name: file.name.split('.')[0] || "",
      category: "",
      observations: "",
      expirationDate: null,
      noExpiration: false,
    }));

    setUploadQueue((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: multipleFiles,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    }
  });

  const removeFile = (id: string) => {
    setUploadQueue((prev) => prev.filter((f) => f.id !== id));
  };

  const updateFileName = (id: string, name: string) => {
    setUploadQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, name } : f))
    );
  };

  const updateFileCategory = (id: string, category: string) => {
    setUploadQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, category } : f))
    );
  };

  const updateFileObservations = (id: string, observations: string) => {
    setUploadQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, observations } : f))
    );
  };

  const updateFileExpirationDate = (id: string, date: Date | null) => {
    setUploadQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, expirationDate: date } : f))
    );
  };

  const updateFileNoExpiration = (id: string, noExpiration: boolean) => {
    setUploadQueue((prev) =>
      prev.map((f) => (f.id === id ? { ...f, noExpiration, expirationDate: noExpiration ? null : f.expirationDate } : f))
    );
  };

  const handleUpload = async () => {
    // Validate required fields
    const invalidFiles = uploadQueue.filter(
      (f) => !f.name || !f.category
    );

    if (invalidFiles.length > 0) {
      toast({
        variant: "destructive",
        title: "Campos obrigatórios",
        description: "Nome e categoria são obrigatórios para todos os documentos.",
      });
      return;
    }

    if (uploadQueue.length === 0) {
      toast({
        variant: "destructive",
        title: "Nenhum arquivo",
        description: "Adicione pelo menos um arquivo para upload.",
      });
      return;
    }

    setIsUploading(true);
    setUploadProgress({});

    try {
      for (const fileItem of uploadQueue) {
        try {
          const fileExt = fileItem.file.name.split('.').pop();
          const fileName = `${uuidv4()}.${fileExt}`;
          const fileKey = `${userId}/${fileName}`;
          
          // Upload file to storage
          setUploadProgress(prev => ({ ...prev, [fileItem.id]: 10 }));
          
          const { data: fileData, error: uploadError } = await supabase.storage
            .from('documents')
            .upload(fileKey, fileItem.file);
          
          if (uploadError) throw uploadError;
          
          setUploadProgress(prev => ({ ...prev, [fileItem.id]: 50 }));
          
          // Get file URL
          const { data: { publicUrl } } = supabase.storage
            .from('documents')
            .getPublicUrl(fileKey);
          
          setUploadProgress(prev => ({ ...prev, [fileItem.id]: 70 }));
          
          // Calculate expiration date if applicable
          let expiresAt = null;
          if (!fileItem.noExpiration && fileItem.expirationDate) {
            expiresAt = fileItem.expirationDate.toISOString();
          }
          
          // Create document record in the database
          const { data: documentData, error: documentError } = await supabase
            .from('documents')
            .insert([
              {
                user_id: userId,
                name: fileItem.name,
                category: fileItem.category,
                observations: fileItem.observations,
                file_url: publicUrl,
                storage_key: fileKey,
                original_filename: fileItem.file.name,
                size: fileItem.file.size,
                filename: fileName,
                type: fileItem.file.type,
                expires_at: expiresAt
              }
            ])
            .select()
            .single();
          
          if (documentError) throw documentError;
          
          setUploadProgress(prev => ({ ...prev, [fileItem.id]: 100 }));
        } catch (error: any) {
          console.error(`Erro ao fazer upload do arquivo ${fileItem.name}:`, error);
          toast({
            variant: "destructive",
            title: `Erro no upload de ${fileItem.name}`,
            description: error.message || "Ocorreu um erro ao enviar o documento."
          });
        }
      }
      
      toast({
        title: "Upload concluído",
        description: `${uploadQueue.length} documento(s) enviado(s) com sucesso.`
      });
      
      // Clear the upload queue after successful upload
      setUploadQueue([]);
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

  const formatFileSize = (size: number) => {
    if (size < 1024) return `${size} bytes`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <Card className="w-full border border-gray-200 dark:border-navy-lighter/30 bg-white dark:bg-navy-dark rounded-xl shadow-md overflow-hidden">
      <CardHeader className="bg-gray-50 dark:bg-navy-deeper border-b border-gray-200 dark:border-navy-lighter/30 px-6 py-4">
        <div className="flex flex-col">
          <CardTitle className="text-navy dark:text-gold font-medium text-xl">
            Enviar Documentos para {userName}
          </CardTitle>
        </div>
      </CardHeader>

      <CardContent className="p-6 space-y-6">
        {/* Drag & Drop Area */}
        <div
          {...getRootProps()}
          className={cn(
            "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-colors cursor-pointer",
            isDragActive
              ? "border-blue-500 bg-blue-50 dark:border-gold/40 dark:bg-navy-light/20"
              : "border-gray-300 dark:border-navy-light/30 hover:border-blue-400 dark:hover:border-gold/40 hover:bg-gray-50 dark:hover:bg-navy-light/10"
          )}
        >
          <input {...getInputProps()} />
          <UploadCloud size={48} className="text-gray-400 dark:text-gray-500 mb-2" />
          <p className="text-gray-600 dark:text-gray-300 mb-1 text-center">
            {isDragActive ? "Solte os arquivos aqui..." : "Arraste e solte arquivos aqui ou clique para selecionar"}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
            PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 10MB)
          </p>
        </div>

        {/* File Queue */}
        {uploadQueue.length > 0 && (
          <Card className="border border-gray-200 dark:border-navy-lighter/30">
            <CardHeader className="py-3 px-4 bg-gray-50 dark:bg-navy-deeper border-b border-gray-200 dark:border-navy-lighter/30">
              <CardTitle className="text-sm font-medium flex items-center">
                <FileIcon className="h-4 w-4 mr-2" />
                Arquivos Selecionados ({uploadQueue.length})
              </CardTitle>
            </CardHeader>
            <ScrollArea className="max-h-[350px]">
              <CardContent className="p-4 space-y-4">
                {uploadQueue.map((fileItem) => (
                  <div
                    key={fileItem.id}
                    className="border border-gray-200 dark:border-navy-lighter/20 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileIcon size={18} className="text-blue-500 dark:text-blue-400" />
                        <span className="text-sm font-medium truncate max-w-[180px]">
                          {fileItem.file.name}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({formatFileSize(fileItem.file.size)})
                        </span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(fileItem.id)}
                        className="h-8 w-8 p-0 rounded-full"
                      >
                        <X size={16} className="text-red-500 dark:text-red-400" />
                        <span className="sr-only">Remover arquivo</span>
                      </Button>
                    </div>

                    {/* Progress Bar for Uploading */}
                    {isUploading && uploadProgress[fileItem.id] !== undefined && (
                      <div className="w-full bg-gray-200 dark:bg-navy-light/20 rounded-full h-2">
                        <div
                          className="bg-blue-500 dark:bg-gold h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadProgress[fileItem.id]}%` }}
                        />
                      </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Document Name */}
                      <div className="space-y-1">
                        <Label htmlFor={`name-${fileItem.id}`} className="text-xs text-gray-500 dark:text-gray-400">
                          Nome do Documento *
                        </Label>
                        <Input
                          id={`name-${fileItem.id}`}
                          value={fileItem.name}
                          onChange={(e) => updateFileName(fileItem.id, e.target.value)}
                          className="h-9"
                          required
                        />
                      </div>

                      {/* Document Category */}
                      <div className="space-y-1">
                        <Label htmlFor={`category-${fileItem.id}`} className="text-xs text-gray-500 dark:text-gray-400">
                          Categoria *
                        </Label>
                        <Select
                          value={fileItem.category}
                          onValueChange={(value) => updateFileCategory(fileItem.id, value)}
                        >
                          <SelectTrigger id={`category-${fileItem.id}`} className="h-9">
                            <SelectValue placeholder="Selecione uma categoria" />
                          </SelectTrigger>
                          <SelectContent>
                            {documentCategories.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Document Observations */}
                    <div className="space-y-1">
                      <Label htmlFor={`observations-${fileItem.id}`} className="text-xs text-gray-500 dark:text-gray-400">
                        Observações (opcional)
                      </Label>
                      <Textarea
                        id={`observations-${fileItem.id}`}
                        value={fileItem.observations}
                        onChange={(e) => updateFileObservations(fileItem.id, e.target.value)}
                        className="resize-none h-20"
                        placeholder="Adicione observações relevantes sobre o documento"
                      />
                    </div>

                    {/* Expiration Date */}
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <Checkbox
                          id={`no-expiration-${fileItem.id}`}
                          checked={fileItem.noExpiration}
                          onCheckedChange={(checked) => updateFileNoExpiration(fileItem.id, checked === true)}
                          className="data-[state=checked]:bg-blue-500 dark:data-[state=checked]:bg-gold"
                        />
                        <label
                          htmlFor={`no-expiration-${fileItem.id}`}
                          className="text-sm font-medium text-gray-700 dark:text-gray-300 leading-none"
                        >
                          Este documento não tem data de expiração
                        </label>
                      </div>

                      {!fileItem.noExpiration && (
                        <div className="space-y-1">
                          <Label htmlFor={`expiration-${fileItem.id}`} className="text-xs text-gray-500 dark:text-gray-400">
                            Data de Expiração
                          </Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                id={`expiration-${fileItem.id}`}
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left h-9",
                                  !fileItem.expirationDate && "text-gray-500 dark:text-gray-400"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {fileItem.expirationDate ? (
                                  format(fileItem.expirationDate, "dd/MM/yyyy")
                                ) : (
                                  <span>Selecione uma data</span>
                                )}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 dark:bg-navy-deeper">
                              <Calendar
                                mode="single"
                                selected={fileItem.expirationDate || undefined}
                                onSelect={(date) => updateFileExpirationDate(fileItem.id, date)}
                                disabled={(date) => date < new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </ScrollArea>
          </Card>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={isUploading || uploadQueue.length === 0}
          className="w-full bg-navy hover:bg-navy/90 dark:bg-gold/90 dark:hover:bg-gold dark:text-navy text-white font-medium shadow-md transition-colors py-2.5"
        >
          {isUploading ? (
            <div className="flex items-center justify-center">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando Documentos...
            </div>
          ) : (
            <div className="flex items-center justify-center">
              <UploadCloud className="mr-2 h-5 w-5" />
              Enviar {uploadQueue.length > 0 ? `${uploadQueue.length} Documento${uploadQueue.length > 1 ? 's' : ''}` : 'Documentos'}
            </div>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
