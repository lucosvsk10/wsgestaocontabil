/**
 * ENVIO DE DOCUMENTOS MENSAIS - Cliente
 * 
 * IMPORTANTE N8N CONFIG:
 * - Field Name for Binary Data no webhook n8n = 'file'
 * - Configurar CORS no n8n para permitir origem do Lovable
 * - Aumentar N8N_PAYLOAD_SIZE_MAX se necessário (atual: 25MB por arquivo)
 */

import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Webhook do n8n - TROCAR AQUI se necessário
const WEBHOOK_URL = "https://pre-studiolx-n8n.zmdnad.easypanel.host/webhook/ws-site";

// Tipos de documento permitidos
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'application/zip',
  'application/vnd.oasis.opendocument.text',
  'text/plain'
];

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB

interface FileUploadStatus {
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  error?: string;
  protocolId?: string;
  storageUrl?: string;
  retries: number;
}

export const MonthlyDocumentUpload = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [docType, setDocType] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const validFiles: FileUploadStatus[] = [];

    selectedFiles.forEach(file => {
      // Validar tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name}: tipo não permitido`,
          variant: "destructive"
        });
        return;
      }

      // Validar tamanho
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: "Arquivo muito grande",
          description: `${file.name}: máximo 25MB por arquivo`,
          variant: "destructive"
        });
        return;
      }

      validFiles.push({
        file,
        status: 'pending',
        progress: 0,
        retries: 0
      });
    });

    setFiles(prev => [...prev, ...validFiles]);
  };

  const uploadSingleFile = async (fileStatus: FileUploadStatus, index: number): Promise<void> => {
    const maxRetries = 2;

    const attemptUpload = async (attempt: number): Promise<void> => {
      try {
        // Atualizar status para uploading
        setFiles(prev => prev.map((f, i) => 
          i === index ? { ...f, status: 'uploading', progress: 0 } : f
        ));

        // Criar FormData
        const formData = new FormData();
        formData.append('file', fileStatus.file); // CAMPO DEVE SER 'file' no n8n
        formData.append('clientId', user?.id || ''); // {{client.id}} do Lovable
        formData.append('docType', docType);
        formData.append('month', month);

        // Enviar via fetch
        const response = await fetch(WEBHOOK_URL, {
          method: 'POST',
          body: formData,
          // NÃO setar Content-Type manualmente - deixar browser definir com boundary
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        // Atualizar com sucesso
        setFiles(prev => prev.map((f, i) => 
          i === index ? { 
            ...f, 
            status: 'success', 
            progress: 100,
            protocolId: result.protocolId || result.id,
            storageUrl: result.storageUrl || result.url
          } : f
        ));

      } catch (error: any) {
        if (attempt < maxRetries) {
          // Retry com delay
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          setFiles(prev => prev.map((f, i) => 
            i === index ? { ...f, retries: attempt + 1 } : f
          ));
          return attemptUpload(attempt + 1);
        } else {
          // Falha após retries
          setFiles(prev => prev.map((f, i) => 
            i === index ? { 
              ...f, 
              status: 'error', 
              progress: 0,
              error: error.message || 'Erro ao enviar arquivo'
            } : f
          ));
        }
      }
    };

    await attemptUpload(0);
  };

  const handleSubmit = async () => {
    // Validações
    if (files.length === 0) {
      toast({
        title: "Nenhum arquivo selecionado",
        variant: "destructive"
      });
      return;
    }

    if (!docType || !month) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha o tipo de documento e o mês",
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    // Enviar cada arquivo individualmente
    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'pending') {
        await uploadSingleFile(files[i], i);
      }
    }

    setIsUploading(false);

    // Resumo final
    const successful = files.filter(f => f.status === 'success').length;
    const failed = files.filter(f => f.status === 'error').length;

    toast({
      title: "Envio concluído",
      description: `${successful} arquivo(s) enviado(s) com sucesso. ${failed > 0 ? `${failed} falharam.` : ''}`,
    });
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setFiles([]);
    setDocType("");
    setMonth("");
  };

  const globalProgress = files.length > 0 
    ? (files.filter(f => f.status === 'success').length / files.length) * 100 
    : 0;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-6 h-6" />
            Envio de Documentos Mensais
          </CardTitle>
          <CardDescription>
            Envie seus documentos contábeis mensais (máximo 25MB por arquivo)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Campos obrigatórios */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="docType">Tipo de Documento *</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Extrato">Extrato</SelectItem>
                  <SelectItem value="Comprovante">Comprovante</SelectItem>
                  <SelectItem value="Outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="month">Mês de Referência *</Label>
              <Input
                id="month"
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              />
            </div>
          </div>

          {/* Seleção de arquivos */}
          <div className="space-y-2">
            <Label htmlFor="files">Selecionar Arquivos</Label>
            <Input
              id="files"
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.xls,.xlsx,.csv,.zip,.odt,.txt"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Formatos: PDF, JPG, PNG, XLS, XLSX, CSV, ZIP, ODT, TXT (máx 25MB cada)
            </p>
          </div>

          {/* Lista de arquivos */}
          {files.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Arquivos ({files.length})</h3>
                <Progress value={globalProgress} className="w-32" />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {files.map((fileStatus, index) => (
                  <div
                    key={index}
                    className="flex items-center gap-3 p-3 border rounded-lg"
                  >
                    <FileText className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                    
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {fileStatus.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(fileStatus.file.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      {fileStatus.error && (
                        <p className="text-xs text-destructive">{fileStatus.error}</p>
                      )}
                      {fileStatus.protocolId && (
                        <p className="text-xs text-muted-foreground">
                          Protocolo: {fileStatus.protocolId}
                        </p>
                      )}
                    </div>

                    {/* Status icons */}
                    {fileStatus.status === 'pending' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        disabled={isUploading}
                      >
                        <XCircle className="w-4 h-4" />
                      </Button>
                    )}
                    {fileStatus.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        {fileStatus.retries > 0 && (
                          <span className="text-xs">Retry {fileStatus.retries}</span>
                        )}
                      </div>
                    )}
                    {fileStatus.status === 'success' && (
                      <CheckCircle2 className="w-5 h-5 text-green-500" />
                    )}
                    {fileStatus.status === 'error' && (
                      <XCircle className="w-5 h-5 text-destructive" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Botões de ação */}
          <div className="flex gap-3">
            <Button
              onClick={handleSubmit}
              disabled={isUploading || files.length === 0 || !docType || !month}
              className="flex-1"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Enviar Documentos
                </>
              )}
            </Button>

            {!isUploading && files.length > 0 && (
              <Button variant="outline" onClick={resetForm}>
                Limpar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
