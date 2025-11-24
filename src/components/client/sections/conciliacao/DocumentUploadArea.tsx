import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useDocumentUpload } from '@/hooks/conciliacao/useDocumentUpload';
import { DocumentoConciliacao } from '@/types/conciliacao';
import { Upload, FileText, Loader2 } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { useDrag } from 'react-dnd';

interface DocumentUploadAreaProps {
  documentos: DocumentoConciliacao[];
  userId: string;
  competencia: string;
  onRefetch: () => void;
}

export const DocumentUploadArea = ({ documentos, userId, competencia, onRefetch }: DocumentUploadAreaProps) => {
  const { uploadDocument, isUploading, uploadProgress } = useDocumentUpload(userId, competencia, onRefetch);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      uploadDocument(acceptedFiles[0]);
    }
  }, [uploadDocument]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/png': ['.png'],
      'image/jpeg': ['.jpg', '.jpeg']
    },
    multiple: false,
    disabled: isUploading
  });

  return (
    <Card className="h-[600px] flex flex-col">
      <CardHeader className="border-b">
        <CardTitle className="text-lg font-light">Upload de Comprovantes</CardTitle>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col p-4 space-y-4">
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
            transition-all
            ${isDragActive 
              ? 'border-primary bg-primary/10' 
              : 'border-border hover:border-primary/50'
            }
            ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          {isUploading ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Enviando arquivo...</p>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground mb-2">
                {isDragActive 
                  ? 'Solte o arquivo aqui' 
                  : 'Arraste e solte ou clique para selecionar'
                }
              </p>
              <p className="text-xs text-muted-foreground">
                PDF, PNG ou JPG (máx. 10MB)
              </p>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto space-y-2">
          <h3 className="text-sm font-medium text-foreground mb-2">
            Documentos Pendentes
          </h3>
          {documentos.map(doc => (
            <DraggableDocument key={doc.id} documento={doc} />
          ))}
          {documentos.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum documento pendente
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

interface DraggableDocumentProps {
  documento: DocumentoConciliacao;
}

const DraggableDocument = ({ documento }: DraggableDocumentProps) => {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: 'documento',
    item: { id: documento.id },
    canDrag: documento.status_processamento !== 'processando',
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  }));

  const getStatusColor = () => {
    switch (documento.status_processamento) {
      case 'processando':
        return 'border-blue-300 bg-blue-50 dark:bg-blue-950/20';
      case 'pendente_manual':
        return 'border-amber-300 bg-amber-50 dark:bg-amber-950/20';
      case 'erro':
        return 'border-red-300 bg-red-50 dark:bg-red-950/20';
      default:
        return 'border-border bg-card';
    }
  };

  return (
    <div
      ref={drag}
      className={`
        p-3 rounded-lg border cursor-move transition-all
        ${getStatusColor()}
        ${isDragging ? 'opacity-50 scale-95' : 'hover:shadow-md'}
      `}
    >
      <div className="flex items-center gap-2">
        <FileText className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{documento.nome_arquivo}</p>
          <div className="flex items-center gap-2 mt-1">
            {documento.status_processamento === 'processando' && (
              <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
            )}
            <p className="text-xs text-muted-foreground">
              {getStatusLabel(documento.status_processamento)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    nao_processado: 'Aguardando processamento',
    processando: 'Processando...',
    concluido: 'Processado',
    pendente_manual: 'Requer ação manual',
    erro: 'Erro no processamento'
  };
  return labels[status] || status;
}
