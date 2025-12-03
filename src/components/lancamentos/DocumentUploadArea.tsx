import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface FileWithMeta {
  id: string;
  file: File;
  tipo: string;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface DocumentUploadAreaProps {
  userId: string;
  competencia: string;
  onUploadComplete: () => void;
  isMonthClosed: boolean;
}

const DOCUMENT_TYPES = [
  { value: "compra", label: "Nota de Compra" },
  { value: "extrato", label: "Extrato Bancário" },
  { value: "comprovante", label: "Comprovante de Pagamento" },
  { value: "observacao", label: "Observação / Outros" },
];

export const DocumentUploadArea = ({
  userId,
  competencia,
  onUploadComplete,
  isMonthClosed
}: DocumentUploadAreaProps) => {
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      id: uuidv4(),
      file,
      tipo: "comprovante",
      status: "pending" as const
    }));
    setFiles(prev => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp'],
      'application/pdf': ['.pdf'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
      'application/msword': ['.doc'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
    },
    disabled: isMonthClosed
  });

  const updateFileType = (fileId: string, tipo: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, tipo } : f
    ));
  };

  const removeFile = (fileId: string) => {
    setFiles(prev => prev.filter(f => f.id !== fileId));
  };

  const retryFile = (fileId: string) => {
    setFiles(prev => prev.map(f => 
      f.id === fileId ? { ...f, status: "pending" as const, error: undefined } : f
    ));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return;
    
    setIsUploading(true);
    
    for (const fileData of files) {
      if (fileData.status === "success") continue;
      
      setFiles(prev => prev.map(f => 
        f.id === fileData.id ? { ...f, status: "uploading" } : f
      ));

      try {
        const fileExt = fileData.file.name.split('.').pop();
        const fileName = `${uuidv4()}.${fileExt}`;
        const storagePath = `${userId}/${competencia}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from('lancamentos')
          .upload(storagePath, fileData.file);

        if (uploadError) throw uploadError;

        // Create signed URL for download (valid for 1 hour)
        const { data: signedUrlData, error: signedUrlError } = await supabase.storage
          .from('lancamentos')
          .createSignedUrl(storagePath, 3600);

        if (signedUrlError) throw signedUrlError;

        // Insert into database - save the storage path, not the URL
        const { error: dbError } = await supabase
          .from('documentos_conciliacao')
          .insert({
            user_id: userId,
            competencia,
            nome_arquivo: fileData.file.name,
            url_storage: storagePath, // Save path instead of URL
            tipo_documento: fileData.tipo,
            arquivo_original: fileData.file.name,
            status_processamento: 'nao_processado'
          });

        if (dbError) throw dbError;

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: "success" } : f
        ));

        // Trigger n8n processing with signed URL
        await triggerN8nProcessing(userId, competencia, signedUrlData.signedUrl, fileData.file.name);

      } catch (error: any) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: "error", error: error.message } : f
        ));
      }
    }

    setIsUploading(false);
    onUploadComplete();
    toast.success("Documentos enviados com sucesso!");
    
    // Clear successful uploads after 2 seconds
    setTimeout(() => {
      setFiles(prev => prev.filter(f => f.status !== "success"));
    }, 2000);
  };

  const triggerN8nProcessing = async (userId: string, competencia: string, fileUrl: string, fileName: string) => {
    try {
      await supabase.functions.invoke('process-document-queue', {
        body: {
          user_id: userId,
          competencia,
          file_url: fileUrl,
          file_name: fileName,
          event: 'arquivos-brutos'
        }
      });
    } catch (error) {
      console.error('Error triggering n8n:', error);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (isMonthClosed) {
    return (
      <div className="bg-muted/50 rounded-2xl border-2 border-dashed border-border p-8 text-center">
        <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
        <p className="text-muted-foreground">
          Este mês já foi fechado. Não é possível enviar novos documentos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          relative overflow-hidden rounded-2xl border-2 border-dashed transition-all duration-300 cursor-pointer hover:scale-[1.01] active:scale-[0.99]
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 bg-card'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="p-12 text-center">
          <div className={`transform transition-transform duration-200 ${isDragActive ? '-translate-y-1' : ''}`}>
            <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">
              {isDragActive ? "Solte os arquivos aqui" : "Arraste seus documentos"}
            </h3>
            <p className="text-sm text-muted-foreground mb-4">
              ou clique para selecionar
            </p>
            <p className="text-xs text-muted-foreground">
              PNG, JPG, PDF, Excel, CSV, Word
            </p>
          </div>
        </div>
      </div>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3"
          >
            {files.map((fileData) => (
              <motion.div
                key={fileData.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className={`
                  flex items-center gap-4 p-4 rounded-xl border transition-colors
                  ${fileData.status === "success" ? "bg-green-500/10 border-green-500/30" : 
                    fileData.status === "error" ? "bg-destructive/10 border-destructive/30" :
                    "bg-card border-border"}
                `}
              >
                <div className="flex-shrink-0">
                  {fileData.status === "uploading" ? (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  ) : fileData.status === "success" ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : fileData.status === "error" ? (
                    <AlertCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <FileText className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate text-foreground">
                    {fileData.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileData.file.size)}
                    {fileData.error && (
                      <span className="text-destructive ml-2">{fileData.error}</span>
                    )}
                  </p>
                </div>

                {fileData.status === "pending" && (
                  <>
                    <Select
                      value={fileData.tipo}
                      onValueChange={(value) => updateFileType(fileData.id, value)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DOCUMENT_TYPES.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(fileData.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                )}

                {fileData.status === "error" && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => retryFile(fileData.id)}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Tentar Novamente
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeFile(fileData.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </motion.div>
            ))}

            {/* Upload Button */}
            {files.some(f => f.status === "pending") && (
              <Button
                onClick={uploadFiles}
                disabled={isUploading}
                className="w-full"
                size="lg"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar {files.filter(f => f.status === "pending").length} documento(s)
                  </>
                )}
              </Button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
