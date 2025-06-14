
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/utils/auth/types";
import { useAuth } from "@/contexts/AuthContext";
import { hasDocumentAccess } from "@/utils/auth/userChecks";

interface DocumentActionsProps {
  doc: Document;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  refreshDocuments?: () => void;
  loadingDocumentIds?: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
}

export const DocumentActions = ({
  doc,
  isDocumentExpired,
  handleDownload
}: DocumentActionsProps) => {
  const { user } = useAuth();
  const isExpired = isDocumentExpired(doc.expires_at);
  
  // Security checks for download:
  // 1. User is authenticated
  // 2. Document is not expired (for clients)
  // 3. Document belongs to current user (via user_id or storage_key)
  const canDownload = user && !isExpired && 
    hasDocumentAccess(user.id, doc.user_id, doc.storage_key);
  
  // If document can't be downloaded due to permissions (doesn't belong to user)
  const isPermissionDenied = user && doc.user_id !== user.id && 
    (!doc.storage_key || !doc.storage_key.startsWith(`${user.id}/`));
  
  return (
    <>
      {isExpired ? (
        <div className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-sm py-2 px-4 flex items-center justify-center gap-1">
          <AlertTriangle size={14} />
          <span>Expirado</span>
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          disabled={!canDownload} 
          onClick={() => handleDownload(doc)} 
          title={isPermissionDenied ? "Você não tem permissão para baixar este documento" : 
                 !user ? "Faça login para baixar" : "Baixar documento"}
          className="flex-1 bg-orange-200/70 dark:bg-transparent dark:border-gold dark:border-opacity-30 text-navy dark:text-gold hover:bg-gold/70 hover:text-navy dark:hover:bg-gold/10 dark:hover:text-gold flex items-center justify-center gap-1"
        >
          <Download size={14} />
          <span className="truncate">{doc.filename || doc.original_filename || "Baixar"}</span>
        </Button>
      )}
    </>
  );
};
