import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Document {
  id: string;
  nome_arquivo: string;
  tipo_documento: string;
  status_processamento: string;
  created_at: string;
  tentativas_processamento?: number;
  ultimo_erro?: string;
}

interface DocumentListProps {
  documents: Document[];
  isLoading: boolean;
}

const STATUS_CONFIG: Record<string, { icon: typeof Clock; label: string; color: string; animate?: boolean }> = {
  nao_processado: {
    icon: Clock,
    label: "Aguardando",
    color: "text-muted-foreground"
  },
  processando: {
    icon: Loader2,
    label: "Processando",
    color: "text-blue-500",
    animate: true
  },
  concluido: {
    icon: CheckCircle,
    label: "Processado",
    color: "text-green-500"
  },
  erro: {
    icon: AlertCircle,
    label: "Erro",
    color: "text-destructive"
  }
};

const TYPE_LABELS: Record<string, string> = {
  compra: "Compra",
  extrato: "Extrato",
  comprovante: "Comprovante",
  observacao: "Outros"
};

export const DocumentList = ({ documents, isLoading }: DocumentListProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="py-12 text-center">
        <FileText className="h-8 w-8 mx-auto text-muted-foreground/50 mb-3" />
        <p className="text-sm text-muted-foreground">
          Nenhum documento enviado
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-sm font-medium text-foreground">
          Documentos
        </h3>
        <span className="text-xs text-muted-foreground">
          {documents.length} arquivo(s)
        </span>
      </div>

      <div className="space-y-1">
        {documents.map((doc, index) => {
          const status = STATUS_CONFIG[doc.status_processamento as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.nao_processado;
          const StatusIcon = status.icon;

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.03 }}
              className="flex items-center gap-3 py-3 px-3 rounded-lg hover:bg-muted/30 transition-colors group"
            >
              <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />

              <div className="flex-1 min-w-0">
                <p className="text-sm truncate text-foreground">
                  {doc.nome_arquivo}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {TYPE_LABELS[doc.tipo_documento] || doc.tipo_documento}
                  </span>
                  <span className="text-xs text-muted-foreground/50">•</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(doc.created_at), "dd/MM HH:mm", { locale: ptBR })}
                  </span>
                </div>
                {doc.ultimo_erro && (
                  <p className="text-xs text-destructive mt-1 truncate">
                    {doc.ultimo_erro}
                  </p>
                )}
              </div>

              <div className={`flex items-center gap-1.5 ${status.color}`}>
                <StatusIcon className={`h-3.5 w-3.5 ${status.animate ? 'animate-spin' : ''}`} />
                <span className="text-xs">{status.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
