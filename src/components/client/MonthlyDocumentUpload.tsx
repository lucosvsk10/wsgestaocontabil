/**
 * ENVIO DE DOCUMENTOS MENSAIS - Cliente
 * 
 * IMPORTANTE N8N CONFIG:
 * - Field Name for Binary Data no webhook n8n = 'file'
 * - Configurar CORS no n8n para permitir origem do Lovable
 * - Aumentar N8N_PAYLOAD_SIZE_MAX se necessário (atual: 25MB por arquivo)
 */

import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Upload, FileText, CheckCircle2, XCircle, Loader2, Lock, AlertTriangle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { callEdgeFunction } from "@/utils/edgeFunctions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Webhook do n8n - TROCAR AQUI se necessário
const WEBHOOK_URL = "https://pre-studiolx-n8n.zmdnad.easypanel.host/webhook/ws-site";
const WEBHOOK_CLOSE_MONTH_URL = "https://pre-studiolx-n8n.zmdnad.easypanel.host/webhook/ws-site-out";

// Tipos de documento permitidos
const ALLOWED_TYPES = [
  'application/pdf'
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
  const { user, userData } = useAuth();
  const { toast } = useToast();
  const [files, setFiles] = useState<FileUploadStatus[]>([]);
  const [docType, setDocType] = useState<string>("");
  const [month, setMonth] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isClosingMonth, setIsClosingMonth] = useState(false);
  const [isMonthClosed, setIsMonthClosed] = useState(false);
  const [uploadCount, setUploadCount] = useState(0);

  // Verificar se o mês atual está fechado
  useEffect(() => {
    const checkMonthStatus = async () => {
      if (!user || !month) return;

      const [year, monthNum] = month.split('-');
      const { data } = await supabase
        .from('month_closures')
        .select('*')
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', parseInt(year))
        .maybeSingle();

      setIsMonthClosed(!!data);
    };

    checkMonthStatus();
  }, [user, month]);

  // Contar uploads do mês atual
  useEffect(() => {
    const countUploads = async () => {
      if (!user || !month) return;

      const [year, monthNum] = month.split('-');
      const { count } = await supabase
        .from('processed_documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('month', month)
        .eq('year', parseInt(year));

      setUploadCount(count || 0);
    };

    countUploads();
  }, [user, month, files]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;

    const selectedFiles = Array.from(e.target.files);
    const validFiles: FileUploadStatus[] = [];

    selectedFiles.forEach(file => {
      // Validar tipo
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast({
          title: "Arquivo inválido",
          description: `${file.name}: apenas arquivos PDF são permitidos`,
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

        // Criar FormData com dados do usuário
        const formData = new FormData();
        formData.append('file', fileStatus.file); // CAMPO DEVE SER 'file' no n8n
        formData.append('clientId', user?.id || ''); // {{client.id}} do Lovable
        formData.append('docType', docType);
        formData.append('month', month);
        
        // Informações do arquivo
        const fileExtension = fileStatus.file.name.split('.').pop()?.toLowerCase() || '';
        formData.append('fileType', fileStatus.file.type); // MIME type (ex: application/pdf, image/jpeg)
        formData.append('fileExtension', fileExtension); // Extensão (ex: pdf, jpg, png)
        formData.append('fileName', fileStatus.file.name); // Nome completo do arquivo
        formData.append('fileSize', fileStatus.file.size.toString()); // Tamanho em bytes
        
        // Dados do usuário logado
        formData.append('userEmail', user?.email || '');
        formData.append('userName', userData?.name || userData?.fullname || user?.email?.split('@')[0] || 'Usuário');
        formData.append('userId', user?.id || '');
        formData.append('timestamp', new Date().toISOString());

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

        // Salvar no banco de dados
        const [year, monthNum] = month.split('-');
        await supabase.from('processed_documents').insert({
          user_id: user?.id || '',
          user_email: user?.email || '',
          user_name: userData?.name || userData?.fullname || user?.email?.split('@')[0] || 'Usuário',
          file_name: fileStatus.file.name,
          file_url: result.storageUrl || result.url || '',
          storage_key: result.storageKey || result.key || '',
          protocol_id: result.protocolId || result.id || '',
          doc_type: docType,
          month: month,
          year: parseInt(year),
          processing_status: 'processed'
        });

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
    // Validação de autenticação
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para enviar documentos",
        variant: "destructive"
      });
      return;
    }

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

    // Criar/verificar bucket do usuário para este mês
    try {
      const [year, monthNum] = month.split('-');
      const bucketResult = await callEdgeFunction('manage-user-bucket', {
        userId: user.id,
        month: monthNum,
        year: year
      });
      
      console.log('✅ Bucket preparado:', bucketResult.bucketName);
      toast({
        title: bucketResult.created ? "📦 Bucket criado" : "📦 Bucket verificado",
        description: bucketResult.message,
      });
    } catch (bucketError) {
      console.error('Erro ao preparar bucket:', bucketError);
      toast({
        title: "⚠️ Aviso",
        description: "Não foi possível criar o bucket, mas o upload continuará.",
        variant: "destructive"
      });
    }

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

  const handleCloseMonth = async () => {
    // Validação de autenticação
    if (!user) {
      toast({
        title: "Erro de autenticação",
        description: "Você precisa estar logado para fechar o mês",
        variant: "destructive"
      });
      return;
    }

    if (!month) {
      toast({
        title: "Selecione um mês",
        description: "Por favor, selecione o mês que deseja fechar",
        variant: "destructive"
      });
      return;
    }

    setIsClosingMonth(true);

    try {
      const payload = {
        action: "fechar_mes",
        userEmail: user?.email || '',
        userName: userData?.name || userData?.fullname || user?.email?.split('@')[0] || 'Usuário',
        userId: user?.id || '',
        timestamp: new Date().toISOString()
      };

      const response = await fetch(WEBHOOK_CLOSE_MONTH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      // Salvar fechamento no banco de dados
      const [year, monthNum] = month.split('-');
      await supabase.from('month_closures').insert({
        user_id: user.id,
        user_email: user.email || '',
        user_name: userData?.name || userData?.fullname || user?.email?.split('@')[0] || 'Usuário',
        month: month,
        year: parseInt(year),
        status: 'fechado'
      });

      setIsMonthClosed(true);

      toast({
        title: "Mês fechado com sucesso!",
        description: "A operação foi concluída.",
      });

    } catch (error: any) {
      toast({
        title: "Erro ao fechar o mês",
        description: "Tente novamente mais tarde.",
        variant: "destructive"
      });
      console.error('Erro ao fechar mês:', error);
    } finally {
      setIsClosingMonth(false);
    }
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Status do mês e botão fechar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          {month && (
            <>
              <div className="flex items-center gap-2">
                {isMonthClosed ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                    <span className="text-sm font-medium">Status do mês: <span className="text-green-600">Fechado</span></span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-yellow-500" />
                    <span className="text-sm font-medium">Status do mês: <span className="text-yellow-600">Em Aberto</span></span>
                  </>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Você enviou {uploadCount} arquivo(s) este mês
              </p>
            </>
          )}
        </div>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button
              variant="default"
              size="lg"
              className="bg-[#F5C441] hover:bg-[#F5C441]/90 text-black font-semibold"
              disabled={isClosingMonth || !user || !month || isMonthClosed}
            >
              {isClosingMonth ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 mr-2" />
                  Fechar Mês
                </>
              )}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar fechamento do mês</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja fechar o mês {month}? Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleCloseMonth}
                className="bg-[#F5C441] hover:bg-[#F5C441]/90 text-black"
              >
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Aviso se o mês estiver fechado */}
      {isMonthClosed && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Atenção: O mês selecionado já está fechado! Confirme antes de fazer novos uploads.
          </AlertDescription>
        </Alert>
      )}

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
              accept="application/pdf,.pdf"
              onChange={handleFileSelect}
              disabled={isUploading}
            />
            <p className="text-xs text-muted-foreground">
              Apenas arquivos PDF (máx 25MB cada)
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
