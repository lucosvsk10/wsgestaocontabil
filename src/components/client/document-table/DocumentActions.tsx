
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/utils/auth/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";

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

  const markAsViewed = async (docItem: Document): Promise<boolean> => {
    if (docItem.viewed) return true;

    try {
      setIsLoading(true);
      const { error } = await supabase
        .from("documents")
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq("id", docItem.id);

      if (error) throw error;
      
      refreshDocuments();
      return true;
    } catch (error: any) {
      console.error("Erro ao marcar como visualizado:", error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível marcar o documento como visualizado."
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    const viewSuccess = await markAsViewed(doc);
    if (!viewSuccess) return;

    try {
      if (doc.storage_key) {
        const { data, error } = await supabase.storage
          .from("documents")
          .download(doc.storage_key);

        if (error) throw error;

        if (data) {
          const url = URL.createObjectURL(data);
          const a = document.createElement("a");
          a.href = url;
          a.download = doc.filename || doc.original_filename || doc.name || "documento";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else if (doc.file_url) {
        try {
          const response = await fetch(doc.file_url);
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = doc.filename || doc.original_filename || doc.name || "documento";
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } catch (fetchError) {
          console.warn("Could not fetch for download, opening in new tab instead:", fetchError);
          window.open(doc.file_url, "_blank");
        }
      }
    } catch (error: any) {
      console.error("Erro ao baixar documento:", error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message
      });
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
