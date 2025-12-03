import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Loader2, AlertCircle, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

interface FileWithMeta {
  id: string;
  file: File;
  status: "pending" | "uploading" | "success" | "error";
  error?: string;
}

interface DocumentUploadAreaProps {
  userId: string;
  competencia: string;
  onUploadComplete: () => void;
  isMonthClosed: boolean;
}

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
    },
    disabled: isMonthClosed
  });

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

        const { error: uploadError } = await supabase.storage
          .from('lancamentos')
          .upload(storagePath, fileData.file);

        if (uploadError) throw uploadError;

        const { error: dbError } = await supabase
          .from('documentos_conciliacao')
          .insert({
            user_id: userId,
            competencia,
            nome_arquivo: fileData.file.name,
            url_storage: storagePath,
            tipo_documento: "arquivo",
            arquivo_original: fileData.file.name,
            status_processamento: 'nao_processado'
          });

        if (dbError) throw dbError;

        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: "success" } : f
        ));

        await supabase.functions.invoke('process-document-queue', {
          body: {
            user_id: userId,
            competencia,
            file_url: storagePath,
            file_name: fileData.file.name,
            event: 'arquivos-brutos'
          }
        });

      } catch (error: any) {
        console.error('Upload error:', error);
        setFiles(prev => prev.map(f => 
          f.id === fileData.id ? { ...f, status: "error", error: error.message } : f
        ));
      }
    }

    setIsUploading(false);
    onUploadComplete();
    toast.success("Documentos enviados!");
    
    setTimeout(() => {
      setFiles(prev => prev.filter(f => f.status !== "success"));
    }, 2000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (isMonthClosed) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p className="text-sm">Este mês já foi fechado</p>
      </div>
    );
  }

  const pendingCount = files.filter(f => f.status === "pending").length;

  return (
    <div className="space-y-3">
      {/* Dropzone minimalista */}
      <div
        {...getRootProps()}
        className={`
          rounded-xl border border-dashed p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border/60 hover:border-primary/50 hover:bg-muted/20'
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-muted/60 flex items-center justify-center">
            <Upload className={`w-4 h-4 ${isDragActive ? 'text-primary' : 'text-muted-foreground'}`} />
          </div>
          <div>
            <p className="text-sm text-foreground">
              {isDragActive ? "Solte aqui" : "Arraste documentos"}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              ou clique para selecionar
            </p>
          </div>
        </div>
      </div>

      {/* Lista de arquivos */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map(fileData => (
            <div
              key={fileData.id}
              className={`
                flex items-center gap-2.5 py-2.5 px-3 rounded-lg transition-colors
                ${fileData.status === "success" ? "bg-green-500/5" : 
                  fileData.status === "error" ? "bg-destructive/5" : "bg-muted/40"}
              `}
            >
              {fileData.status === "uploading" ? (
                <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              ) : fileData.status === "success" ? (
                <span className="w-4 h-4 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 bg-white rounded-full" />
                </span>
              ) : fileData.status === "error" ? (
                <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
              ) : (
                <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{fileData.file.name}</p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(fileData.file.size)}
                  {fileData.error && <span className="text-destructive ml-1.5">• {fileData.error}</span>}
                </p>
              </div>

              {fileData.status === "pending" && (
                <button 
                  onClick={() => removeFile(fileData.id)} 
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {fileData.status === "error" && (
                <button 
                  onClick={() => retryFile(fileData.id)} 
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}

          {pendingCount > 0 && (
            <button
              onClick={uploadFiles}
              disabled={isUploading}
              className="
                w-full mt-3 py-2.5 px-4 rounded-lg text-sm font-medium
                bg-muted/50 hover:bg-muted/80 
                text-foreground border border-border/40
                transition-all duration-200
                disabled:opacity-50 disabled:cursor-not-allowed
              "
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enviando...
                </span>
              ) : (
                `Enviar ${pendingCount} arquivo${pendingCount > 1 ? 's' : ''}`
              )}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
