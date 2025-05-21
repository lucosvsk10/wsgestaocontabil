
import React, { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarIcon, UploadCloud, X, Plus, File } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { callEdgeFunction } from "@/utils/edgeFunctions";

interface AdminDocumentUploadProps {
  userId: string;
  documentCategories: string[];
}

interface FileWithPreview extends File {
  preview?: string;
  id: string;
}

export const AdminDocumentUpload: React.FC<AdminDocumentUploadProps> = ({
  userId,
  documentCategories
}) => {
  const { toast } = useToast();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [observations, setObservations] = useState("");
  const [expirationDate, setExpirationDate] = useState<Date | null>(null);
  const [noExpiration, setNoExpiration] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => 
      Object.assign(file, {
        preview: URL.createObjectURL(file),
        id: uuidv4()
      })
    );
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    },
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setFiles(files => {
      const fileToRemove = files.find(file => file.id === fileId);
      if (fileToRemove?.preview) {
        URL.revokeObjectURL(fileToRemove.preview);
      }
      return files.filter(file => file.id !== fileId);
    });
  };
  
  const handleExpirationCheckChange = (checked: boolean) => {
    setNoExpiration(checked);
    if (checked) {
      setExpirationDate(null);
    }
  };

  const notifyNewDocumentViaEdgeFunction = async (userId: string, documentName: string) => {
    try {
      console.log(`Chamando edge function para notificação do usuário ${userId} sobre documento: ${documentName}`);
      
      const result = await callEdgeFunction<any>('notify_new_document', {
        user_id: userId,
        document_name: documentName
      });
      
      return result;
    } catch (error: any) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  };

  const handleUpload = async () => {
    if (files.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um arquivo para upload.",
        variant: "destructive"
      });
      return;
    }

    if (!category) {
      toast({
        title: "Erro",
        description: "A categoria é obrigatória.",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    try {
      const uploadedDocuments = [];

      for (const file of files) {
        // Generate a unique filename
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
        
        // Get file public URL
        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileKey);
        
        // Calculate expiration date if applicable
        let expiresAt = null;
        if (!noExpiration && expirationDate) {
          expiresAt = expirationDate.toISOString();
        }
        
        // Create document record in the database
        const { data: documentData, error: documentError } = await supabase
          .from('documents')
          .insert([
            {
              user_id: userId,
              name: file.name.split('.')[0], // Use filename as document name by default
              category: category,
              subcategory: subcategory || null,
              observations: observations || null,
              file_url: publicUrl,
              storage_key: fileKey,
              original_filename: file.name,
              size: file.size,
              filename: fileName,
              type: file.type,
              expires_at: expiresAt
            }
          ])
          .select()
          .single();
        
        if (documentError) {
          throw documentError;
        }
        
        uploadedDocuments.push(documentData);
        
        // Create a notification for the user about the new document
        try {
          await notifyNewDocumentViaEdgeFunction(userId, file.name.split('.')[0]);
        } catch (notifError) {
          console.error('Erro ao criar notificação:', notifError);
          // Continue with the flow even if notification fails
        }
      }
      
      // Success message
      toast({
        title: "Sucesso",
        description: `${files.length} documento${files.length > 1 ? 's' : ''} enviado${files.length > 1 ? 's' : ''} com sucesso!`
      });
      
      // Reset form
      setFiles([]);
      setSubcategory("");
      setObservations("");
      setExpirationDate(null);
      
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

  return (
    <div className="space-y-6">
      {/* File dropzone */}
      <div className="space-y-2">
        <Label className="text-navy-dark dark:text-gold font-medium">Arquivos</Label>
        <div 
          {...getRootProps()} 
          className={cn(
            "border-2 border-dashed rounded-lg p-6 cursor-pointer transition-all text-center",
            isDragActive 
              ? "border-gold/70 bg-gold/10" 
              : "border-gray-300 dark:border-navy-lighter/40 hover:border-gold/40 dark:hover:border-gold/40 bg-gray-50 dark:bg-navy-deeper"
          )}
        >
          <input {...getInputProps()} />
          <div className="flex flex-col items-center justify-center space-y-2 py-4">
            <UploadCloud className="h-12 w-12 text-gray-400 dark:text-gold/60" />
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {isDragActive
                ? "Solte os arquivos aqui..."
                : "Arraste e solte arquivos aqui ou clique para selecionar"
              }
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Suporta PDF, DOC, DOCX, XLS, XLSX, JPG, PNG até 10MB
            </p>
          </div>
        </div>
      </div>

      {/* Selected files */}
      {files.length > 0 && (
        <div className="space-y-3">
          <Label className="text-navy-dark dark:text-gold font-medium">Arquivos selecionados ({files.length})</Label>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {files.map(file => (
              <div 
                key={file.id} 
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-navy-lighter/40 bg-white dark:bg-navy-light/10"
              >
                <div className="flex items-center space-x-3 overflow-hidden">
                  <File className="h-8 w-8 flex-shrink-0 text-navy-dark dark:text-gold" />
                  <div className="truncate">
                    <p className="truncate text-sm font-medium text-gray-800 dark:text-white">
                      {file.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {(file.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                </div>
                <Button 
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400"
                  onClick={() => removeFile(file.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Document details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Category (required) */}
        <div className="space-y-2">
          <Label htmlFor="category" className="text-navy-dark dark:text-gold font-medium required">
            Categoria
          </Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full rounded-lg border border-gray-300 dark:border-navy-lighter/40 bg-white dark:bg-navy-deeper text-gray-900 dark:text-white px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy dark:focus:ring-gold/50"
            required
          >
            <option value="">Selecione uma categoria</option>
            {documentCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Subcategory (optional) */}
        <div className="space-y-2">
          <Label htmlFor="subcategory" className="text-navy-dark dark:text-gold font-medium">
            Subcategoria (opcional)
          </Label>
          <Input
            id="subcategory"
            value={subcategory}
            onChange={(e) => setSubcategory(e.target.value)}
            placeholder="Ex: IRPF 2023, Contrato de Aluguel"
            className="w-full dark:bg-navy-deeper dark:border-navy-lighter/40"
          />
        </div>
      </div>

      {/* Expiration date fields */}
      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="no-expiration"
            checked={noExpiration}
            onCheckedChange={handleExpirationCheckChange}
            className="border-gray-300 dark:border-navy-lighter/40 data-[state=checked]:bg-navy data-[state=checked]:border-navy dark:data-[state=checked]:bg-gold dark:data-[state=checked]:border-gold"
          />
          <Label 
            htmlFor="no-expiration"
            className="text-sm font-medium text-gray-700 dark:text-gray-200"
          >
            Este documento não tem data de expiração
          </Label>
        </div>

        {!noExpiration && (
          <div className="space-y-2">
            <Label 
              htmlFor="expiration-date"
              className="text-navy-dark dark:text-gold font-medium"
            >
              Data de Expiração (opcional)
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="expiration-date"
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal bg-white dark:bg-navy-deeper border-gray-300 dark:border-navy-lighter/40",
                    !expirationDate && "text-gray-500 dark:text-gray-400"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-navy-dark dark:text-gold" />
                  {expirationDate ? (
                    format(expirationDate, "dd/MM/yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecionar data de expiração</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0 bg-white dark:bg-navy-deeper border dark:border-navy-lighter/40">
                <Calendar
                  mode="single"
                  selected={expirationDate || undefined}
                  onSelect={setExpirationDate}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
          </div>
        )}
      </div>

      {/* Observations (optional) */}
      <div className="space-y-2">
        <Label htmlFor="observations" className="text-navy-dark dark:text-gold font-medium">
          Observações (opcional)
        </Label>
        <Textarea
          id="observations"
          value={observations}
          onChange={(e) => setObservations(e.target.value)}
          placeholder="Adicione informações importantes sobre os documentos"
          className="w-full dark:bg-navy-deeper dark:border-navy-lighter/40"
          rows={4}
        />
      </div>

      {/* Upload button */}
      <div className="flex justify-end">
        <Button
          onClick={handleUpload}
          disabled={isUploading || files.length === 0}
          className="bg-navy-dark text-white hover:bg-navy dark:bg-gold dark:text-navy-dark dark:hover:bg-gold-light font-medium px-6"
        >
          {isUploading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white dark:text-navy-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Enviando...
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4 mr-2" />
              Enviar documentos
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
