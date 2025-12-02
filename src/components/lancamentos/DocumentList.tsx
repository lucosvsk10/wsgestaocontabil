import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
  pendente: {
    icon: Clock,
    label: "Pendente",
    color: "bg-yellow-500/10 text-yellow-600 border-yellow-500/30"
  },
  processando: {
    icon: Loader2,
    label: "Processando",
    color: "bg-blue-500/10 text-blue-600 border-blue-500/30",
    animate: true
  },
  processado: {
    icon: CheckCircle,
    label: "Processado",
    color: "bg-green-500/10 text-green-600 border-green-500/30"
  },
  erro: {
    icon: AlertCircle,
    label: "Erro",
    color: "bg-destructive/10 text-destructive border-destructive/30"
  }
};

const TYPE_LABELS: Record<string, string> = {
  compra: "Nota de Compra",
  extrato: "Extrato",
  comprovante: "Comprovante",
  observacao: "Observação"
};

export const DocumentList = ({ documents, isLoading }: DocumentListProps) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (documents.length === 0) {
    return (
      <div className="bg-card rounded-xl border border-border p-8 text-center">
        <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium text-foreground mb-2">
          Nenhum documento enviado
        </h3>
        <p className="text-sm text-muted-foreground">
          Arraste seus documentos para a área acima para começar
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-foreground">
          Documentos Enviados
        </h2>
        <Badge variant="outline">
          {documents.length} documento(s)
        </Badge>
      </div>

      <div className="grid gap-3">
        {documents.map((doc, index) => {
          const status = STATUS_CONFIG[doc.status_processamento as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.pendente;
          const StatusIcon = status.icon;

          return (
            <motion.div
              key={doc.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 bg-card rounded-xl border border-border hover:border-primary/30 transition-colors"
            >
              <div className="flex-shrink-0">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">
                  {doc.nome_arquivo}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-muted-foreground">
                    {TYPE_LABELS[doc.tipo_documento] || doc.tipo_documento}
                  </span>
                  <span className="text-xs text-muted-foreground">•</span>
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

              <Badge className={`${status.color} border`}>
                <StatusIcon className={`h-3 w-3 mr-1 ${status.animate ? 'animate-spin' : ''}`} />
                {status.label}
              </Badge>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
