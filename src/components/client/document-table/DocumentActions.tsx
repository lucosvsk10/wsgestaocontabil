
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/utils/auth/types";
import { useState } from "react";
import { useDocumentActions } from "@/hooks/document/useDocumentActions";
import { useToast } from "@/hooks/use-toast";

interface DocumentActionsProps {
  doc: Document;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
}

export const DocumentActions = ({
  doc,
  isDocumentExpired,
  refreshDocuments,
  loadingDocumentIds
}: DocumentActionsProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  // Create a no-op function to pass to useDocumentActions since we're refreshing manually
  const noopFetchDocuments = async () => {};
  const { downloadDocument, downloadByUrl } = useDocumentActions(noopFetchDocuments);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      let success = false;
      
      if (doc.storage_key) {
        console.log('Original storage key:', doc.storage_key);
        const result = await downloadDocument(
          doc.id, 
          doc.storage_key, 
          doc.filename || doc.original_filename || doc.name || "documento"
        );
        success = result.success;
      } else if (doc.file_url) {
        const result = await downloadByUrl(
          doc.id, 
          doc.file_url, 
          doc.filename || doc.original_filename || doc.name || "documento"
        );
        success = result.success;
      } else {
        toast({
          variant: "destructive",
          title: "Erro",
          description: "Não foi possível baixar o documento: informações insuficientes."
        });
        return;
      }
      
      if (success) {
        refreshDocuments(); // Refresh document list to update viewed status
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      disabled={isDocumentExpired(doc.expires_at) || loadingDocumentIds.has(doc.id) || isLoading} 
      onClick={handleDownload} 
      className="flex-1 bg-orange-300/50 dark:bg-navy-light/50 border-gold/20 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold-light dark:hover:text-navy flex items-center justify-center gap-1"
    >
      <Download size={14} />
      <span className="truncate">{doc.filename || doc.original_filename || "Baixar"}</span>
    </Button>
  );
};
