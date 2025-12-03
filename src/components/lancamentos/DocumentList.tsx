import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Clock, CheckCircle, AlertCircle, Loader2, Trash2, Zap } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  onDelete?: (documentId: string) => Promise<void>;
  deletingIds?: Set<string>;
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

export const DocumentList = ({ documents, isLoading, onDelete, deletingIds = new Set() }: DocumentListProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [aligningIds, setAligningIds] = useState<Set<string>>(new Set());
  
  const isTestUser = user?.email === 'teste@gmail.com';
  
  const canDelete = (doc: Document) => {
    return doc.status_processamento === 'erro' || 
           (doc.tentativas_processamento && doc.tentativas_processamento > 0);
  };

  const canAlign = (doc: Document) => {
    return isTestUser && doc.status_processamento === 'concluido';
  };

  const handleForceAlign = async (doc: Document) => {
    setAligningIds(prev => new Set(prev).add(doc.id));
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/align-document`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ document_id: doc.id })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao alinhar documento');
      }

      toast({
        title: "Alinhamento iniciado",
        description: `${result.lancamentos_count || 0} lançamentos processados.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setAligningIds(prev => {
        const next = new Set(prev);
        next.delete(doc.id);
        return next;
      });
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!onDelete) return;
    if (!window.confirm(`Tem certeza que deseja excluir "${doc.nome_arquivo}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    await onDelete(doc.id);
  };

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
          const showDelete = canDelete(doc);
          const isDeleting = deletingIds.has(doc.id);

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
                  {doc.tentativas_processamento && doc.tentativas_processamento > 0 && (
                    <>
                      <span className="opacity-40">•</span>
                      <span className="text-destructive">{doc.tentativas_processamento} tentativa{doc.tentativas_processamento > 1 ? 's' : ''}</span>
                    </>
                  )}
                </div>
                {doc.ultimo_erro && (
                  <p className="text-xs text-destructive truncate mt-0.5">{doc.ultimo_erro}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1 ${status.className}`}>
                  <StatusIcon className={`w-3 h-3 ${status.spin ? 'animate-spin' : ''}`} />
                  <span className="text-xs">{status.label}</span>
                </div>

                {canAlign(doc) && (
                  <button
                    onClick={() => handleForceAlign(doc)}
                    disabled={aligningIds.has(doc.id)}
                    className="px-2 py-1 rounded text-xs bg-primary/10 hover:bg-primary/20 text-primary transition-colors disabled:opacity-50 flex items-center gap-1"
                    title="Forçar alinhamento IA"
                  >
                    {aligningIds.has(doc.id) ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <Zap className="w-3 h-3" />
                    )}
                    <span>Forçar Alinhamento</span>
                  </button>
                )}

                {showDelete && onDelete && (
                  <button
                    onClick={() => handleDelete(doc)}
                    disabled={isDeleting}
                    className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    title="Excluir documento"
                  >
                    {isDeleting ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
