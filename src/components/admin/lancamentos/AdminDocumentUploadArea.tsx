import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Upload, X, FileText, Loader2, AlertCircle, RefreshCw, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { Progress } from "@/components/ui/progress";

interface FileWithMeta {
  id: string;
  file: File;
  status: "pending" | "uploading" | "processing" | "success" | "error";
  progress: number;
  error?: string;
  docId?: string;
}

interface AdminDocumentUploadAreaProps {
  clientId: string;
  clientName: string;
  competencia: string;
  monthLabel: string;
  onUploadComplete: () => void;
}

export const AdminDocumentUploadArea = ({
  clientId,
  clientName,
  competencia,
  monthLabel,
  onUploadComplete,
}: AdminDocumentUploadAreaProps) => {
  const [files, setFiles] = useState<FileWithMeta[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map((file) => ({
      id: uuidv4(),
      file,
      status: "pending" as const,
      progress: 0,
    }));
    setFiles((prev) => [...prev, ...newFiles]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".png", ".jpg", ".jpeg", ".webp"],
      "application/pdf": [".pdf"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "text/csv": [".csv"],
    },
  });

  const removeFile = (fileId: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
  };

  const retryFile = async (fileId: string) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: "pending" as const, error: undefined, progress: 0 } : f
      )
    );
  };

  const cancelUpload = () => {
    setFiles((prev) => prev.filter((f) => f.status === "success"));
    setIsUploading(false);
    toast.info("Upload cancelado");
  };

  const uploadFiles = async () => {
    const pendingFiles = files.filter((f) => f.status === "pending");
    if (pendingFiles.length === 0) return;

    setIsUploading(true);
    const { data: { session } } = await supabase.auth.getSession();

    for (const fileData of pendingFiles) {
      // Check if cancelled (file removed)
      const current = files.find((f) => f.id === fileData.id);
      if (!current || current.status === "success") continue;

      // Upload phase
      setFiles((prev) =>
        prev.map((f) => (f.id === fileData.id ? { ...f, status: "uploading", progress: 10 } : f))
      );

      try {
        const fileExt = fileData.file.name.split(".").pop();
        const fileName = `${Date.now()}_${uuidv4().slice(0, 8)}.${fileExt}`;
        const storagePath = `${clientId}/${competencia}/${fileName}`;

        // Upload to storage
        const { error: uploadError } = await supabase.storage
          .from("lancamentos")
          .upload(storagePath, fileData.file);

        if (uploadError) throw uploadError;

        setFiles((prev) =>
          prev.map((f) => (f.id === fileData.id ? { ...f, progress: 40 } : f))
        );

        // Insert into documentos_brutos
        const { data: docData, error: docError } = await supabase
          .from("documentos_brutos")
          .insert({
            user_id: clientId,
            competencia,
            nome_arquivo: fileData.file.name,
            url_storage: storagePath,
            status_processamento: "nao_processado",
            status_alinhamento: "pendente",
          })
          .select("id")
          .single();

        if (docError) throw docError;

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, status: "processing", progress: 60, docId: docData.id } : f
          )
        );

        // Trigger processing
        await fetch(
          "https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/process-document-queue",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token}`,
            },
            body: JSON.stringify({
              user_id: clientId,
              competencia,
              file_url: storagePath,
              file_name: fileData.file.name,
              event: "arquivos-brutos",
              document_id: docData.id,
            }),
          }
        );

        setFiles((prev) =>
          prev.map((f) => (f.id === fileData.id ? { ...f, status: "success", progress: 100 } : f))
        );
      } catch (error: any) {
        console.error("Upload error:", error);
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, status: "error", error: error.message, progress: 0 } : f
          )
        );
      }
    }

    setIsUploading(false);
    onUploadComplete();
    toast.success("Documentos enviados!");

    setTimeout(() => {
      setFiles((prev) => prev.filter((f) => f.status !== "success"));
    }, 3000);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const pendingCount = files.filter((f) => f.status === "pending").length;
  const uploadingCount = files.filter((f) => f.status === "uploading" || f.status === "processing").length;

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          rounded-xl border border-dashed p-5 text-center cursor-pointer transition-all duration-200
          ${isDragActive
            ? "border-primary bg-primary/5"
            : "border-border/50 hover:border-primary/40 hover:bg-muted/20"
          }
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-muted/60 flex items-center justify-center">
            <Upload className={`w-4.5 h-4.5 ${isDragActive ? "text-primary" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {isDragActive ? "Solte aqui" : `Upload para ${clientName}`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Competência: {monthLabel} • Arraste ou clique para selecionar
            </p>
          </div>
        </div>
      </div>

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileData) => (
            <div
              key={fileData.id}
              className={`
                p-3 rounded-lg transition-colors
                ${fileData.status === "success" ? "bg-green-500/5 border border-green-500/20" :
                  fileData.status === "error" ? "bg-destructive/5 border border-destructive/20" :
                  fileData.status === "uploading" || fileData.status === "processing" ? "bg-primary/5 border border-primary/20" :
                  "bg-muted/40 border border-border/30"}
              `}
            >
              <div className="flex items-center gap-2.5">
                {/* Status icon */}
                {fileData.status === "uploading" || fileData.status === "processing" ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                ) : fileData.status === "success" ? (
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                ) : fileData.status === "error" ? (
                  <AlertCircle className="w-4 h-4 text-destructive shrink-0" />
                ) : (
                  <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                )}

                {/* File info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground truncate">{fileData.file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(fileData.file.size)}
                    {fileData.status === "uploading" && " • Enviando..."}
                    {fileData.status === "processing" && " • Processando..."}
                    {fileData.error && (
                      <span className="text-destructive ml-1.5">• {fileData.error}</span>
                    )}
                  </p>
                </div>

                {/* Actions */}
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

              {/* Progress bar */}
              {(fileData.status === "uploading" || fileData.status === "processing") && (
                <div className="mt-2">
                  <Progress value={fileData.progress} className="h-1.5" />
                </div>
              )}
            </div>
          ))}

          {/* Action buttons */}
          <div className="flex items-center gap-2 mt-3">
            {pendingCount > 0 && !isUploading && (
              <button
                onClick={uploadFiles}
                className="
                  flex-1 py-2.5 px-4 rounded-lg text-sm font-medium
                  bg-primary text-primary-foreground
                  hover:bg-primary/90
                  transition-all duration-200
                "
              >
                Enviar {pendingCount} arquivo{pendingCount > 1 ? "s" : ""}
              </button>
            )}

            {isUploading && (
              <>
                <div className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-muted/50 text-sm text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Enviando {uploadingCount} de {files.filter((f) => f.status !== "success").length}...
                </div>
                <button
                  onClick={cancelUpload}
                  className="py-2.5 px-4 rounded-lg text-sm font-medium bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors"
                >
                  Cancelar
                </button>
              </>
            )}

            {files.length > 0 && !isUploading && (
              <button
                onClick={() => setFiles([])}
                className="py-2.5 px-3 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
              >
                Limpar lista
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
