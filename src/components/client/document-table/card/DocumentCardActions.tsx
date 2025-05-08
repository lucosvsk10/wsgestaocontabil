
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/utils/auth/types";

interface DocumentCardActionsProps {
  doc: Document;
  loadingDocumentIds: Set<string>;
  handleDownload: (doc: Document) => Promise<void>;
}

export const DocumentCardActions = ({ doc, loadingDocumentIds, handleDownload }: DocumentCardActionsProps) => {
  return (
    <div className="mt-4">
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
    </div>
  );
};
