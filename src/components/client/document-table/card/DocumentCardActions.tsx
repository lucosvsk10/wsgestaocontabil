
import { Download, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/utils/auth/types";

interface DocumentCardActionsProps {
  doc: Document;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
  isDocumentExpired: (expiresAt: string | null) => boolean;
}

export const DocumentCardActions = ({ 
  doc, 
  loadingDocumentIds, 
  handleDownload,
  isDocumentExpired 
}: DocumentCardActionsProps) => {
  const isExpired = isDocumentExpired(doc.expires_at);
  
  return (
    <div className="mt-4">
      {isExpired ? (
        <div className="w-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-300 dark:border-gray-600 rounded-md font-medium text-sm py-2 px-4 flex items-center justify-center gap-1">
          <AlertTriangle size={14} />
          <span>Expirado</span>
        </div>
      ) : (
        <Button 
          variant="outline" 
          size="sm" 
          onClick={() => handleDownload(doc)} 
          disabled={loadingDocumentIds.has(doc.id)} 
          className="w-full bg-white dark:bg-navy-light/30 border-gold/20 text-navy dark:text-gold hover:bg-gold/10 hover:text-navy dark:hover:bg-gold/20 dark:hover:text-navy flex items-center justify-center gap-1"
        >
          <Download size={14} />
          <span className="truncate">
            {loadingDocumentIds.has(doc.id) ? "Baixando..." : "Baixar documento"}
          </span>
        </Button>
      )}
    </div>
  );
};
