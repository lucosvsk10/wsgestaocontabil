
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/utils/auth/types";

interface DocumentActionsProps {
  doc: Document;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  handleDownload?: (doc: Document) => Promise<void>;
}

export const DocumentActions = ({
  doc,
  isDocumentExpired,
  handleDownload
}: DocumentActionsProps) => {
  return (
    <Button 
      variant="outline" 
      size="sm" 
      disabled={isDocumentExpired(doc.expires_at)} 
      onClick={() => handleDownload && handleDownload(doc)} 
      className="flex-1 bg-orange-300/50 dark:bg-navy-light/50 border-gold/20 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold-light dark:hover:text-navy flex items-center justify-center gap-1"
    >
      <Download size={14} />
      <span className="truncate">{doc.filename || doc.original_filename || "Baixar"}</span>
    </Button>
  );
};
