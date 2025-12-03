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

const STATUS_CONFIG: Record<string, { icon: typeof Clock; label: string; className: string; spin?: boolean }> = {
  nao_processado: { icon: Clock, label: "Aguardando", className: "text-muted-foreground" },
  processando: { icon: Loader2, label: "Processando", className: "text-blue-500", spin: true },
  concluido: { icon: CheckCircle, label: "Processado", className: "text-green-500" },
  erro: { icon: AlertCircle, label: "Erro", className: "text-destructive" }
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
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-sm text-muted-foreground">Nenhum documento neste mês</p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-foreground">Documentos</span>
        <span className="text-xs text-muted-foreground">{documents.length}</span>
      </div>

      <div className="divide-y divide-border/40">
        {documents.map((doc, index) => {
          const status = STATUS_CONFIG[doc.status_processamento] || STATUS_CONFIG.nao_processado;
          const StatusIcon = status.icon;

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.02 }}
              className="py-2.5 flex items-center gap-2.5"
            >
              <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
              
              <div className="flex-1 min-w-0">
                <p className="text-sm text-foreground truncate">{doc.nome_arquivo}</p>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <span>{TYPE_LABELS[doc.tipo_documento] || doc.tipo_documento}</span>
                  <span className="opacity-40">•</span>
                  <span>{format(new Date(doc.created_at), "dd/MM", { locale: ptBR })}</span>
                </div>
                {doc.ultimo_erro && (
                  <p className="text-xs text-destructive truncate mt-0.5">{doc.ultimo_erro}</p>
                )}
              </div>

              <div className={`flex items-center gap-1 ${status.className}`}>
                <StatusIcon className={`w-3 h-3 ${status.spin ? 'animate-spin' : ''}`} />
                <span className="text-xs">{status.label}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
