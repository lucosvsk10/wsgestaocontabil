
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/utils/auth/types";
import { useAuth } from "@/contexts/AuthContext";

interface DocumentActionsProps {
  doc: Document;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
}

export const DocumentActions = ({
  doc,
  isDocumentExpired,
  handleDownload
}: DocumentActionsProps) => {
  const { user } = useAuth();
  
  // Verificações de segurança para download:
  // 1. Usuário está autenticado
  // 2. O documento não está expirado
  // 3. O documento pertence ao usuário atual (via user_id ou storage_key)
  const canDownload = user && !isDocumentExpired(doc.expires_at) && 
    (doc.user_id === user.id || (doc.storage_key && doc.storage_key.startsWith(`${user.id}/`)));
  
  // Se o documento não pode ser baixado por questões de permissão (não pertence ao usuário)
  const isPermissionDenied = user && doc.user_id !== user.id && 
    (!doc.storage_key || !doc.storage_key.startsWith(`${user.id}/`));
  
  return (
    <Button 
      variant="outline" 
      size="sm" 
      disabled={!canDownload} 
      onClick={() => handleDownload(doc)} 
      title={isPermissionDenied ? "Você não tem permissão para baixar este documento" : 
             !user ? "Faça login para baixar" : 
             isDocumentExpired(doc.expires_at) ? "Documento expirado" : "Baixar documento"}
      className="flex-1 bg-orange-300/50 dark:bg-navy-light/50 border-gold/20 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold-light dark:hover:text-navy flex items-center justify-center gap-1"
    >
      <Download size={14} />
      <span className="truncate">{doc.filename || doc.original_filename || "Baixar"}</span>
    </Button>
  );
};
