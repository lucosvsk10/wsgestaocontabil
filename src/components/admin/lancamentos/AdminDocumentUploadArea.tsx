import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
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
      } catch (error: unknown) {
        console.error("Upload error:", error);
        const message = error instanceof Error ? error.message : "Erro desconhecido";
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id ? { ...f, status: "error", error: message, progress: 0 } : f
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
    <div className="admin-process space-y-3">
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-lg border border-dashed p-7 text-center transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-500/5"
            : "border-[var(--admin-line)] hover:border-blue-400 hover:bg-[var(--admin-blue-soft)]"
        }`}
      >
        <input {...getInputProps()} />
        <p className="text-sm font-medium text-foreground">
          {isDragActive ? "Solte os arquivos aqui" : `Adicionar documentos de ${clientName}`}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Competência {monthLabel} · PDF, imagem ou planilha
        </p>
      </div>

      {files.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-[var(--admin-line)]">
          <div className="divide-y divide-[var(--admin-line)]">
            {files.map(fileData => (
              <div key={fileData.id} className="px-4 py-3">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground">{fileData.file.name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {formatFileSize(fileData.file.size)}
                      {fileData.status === "uploading" && " · Enviando"}
                      {fileData.status === "processing" && " · Processando"}
                      {fileData.status === "success" && " · Concluído"}
                      {fileData.status === "pending" && " · Aguardando envio"}
                      {fileData.error && (
                        <span className="ml-1 text-destructive">· {fileData.error}</span>
                      )}
                    </p>
                  </div>

                  {fileData.status === "pending" && (
                    <button
                      type="button"
                      onClick={() => removeFile(fileData.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Remover
                    </button>
                  )}
                  {fileData.status === "error" && (
                    <button
                      type="button"
                      onClick={() => retryFile(fileData.id)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Tentar novamente
                    </button>
                  )}
                </div>

                {(fileData.status === "uploading" || fileData.status === "processing") && (
                  <Progress value={fileData.progress} className="mt-3 h-1" />
                )}
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-[var(--admin-line)] bg-[var(--admin-canvas)]/50 p-3">
            {pendingCount > 0 && !isUploading && (
              <button
                type="button"
                onClick={uploadFiles}
                className="admin-button-primary px-4 py-2 text-xs"
              >
                Enviar {pendingCount} arquivo{pendingCount > 1 ? "s" : ""}
              </button>
            )}

            {isUploading && (
              <>
                <span className="px-2 text-xs text-muted-foreground">
                  Enviando {uploadingCount} de {files.filter(file => file.status !== "success").length}
                </span>
                <button
                  type="button"
                  onClick={cancelUpload}
                  className="border border-border px-4 py-2 text-xs font-medium hover:bg-muted"
                >
                  Cancelar
                </button>
              </>
            )}

            {!isUploading && (
              <button
                type="button"
                onClick={() => setFiles([])}
                className="px-3 py-2 text-xs text-muted-foreground hover:text-foreground"
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
