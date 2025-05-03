
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
  refreshDocuments
}: DocumentActionsProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const handleDownload = async () => {
    if (isDocumentExpired(doc.expires_at)) {
      toast({
        variant: "destructive",
        title: "Documento expirado",
        description: "Não é possível baixar um documento expirado."
      });
      return;
    }
    
    try {
      setIsLoading(true);
      
      // Mark document as viewed when downloaded
      if (!doc.viewed) {
        await markAsViewed(doc.id);
      }
      
      if (doc.storage_key) {
        // Se temos o storage_key, usar o método de download
        const { data, error } = await supabase.storage
          .from('documents')
          .download(doc.storage_key);
        
        if (error) throw error;
        
        if (data) {
          // Criar URL do blob e iniciar download
          const url = URL.createObjectURL(data);
          const a = document.createElement('a');
          a.href = url;
          a.download = doc.filename || doc.original_filename || doc.name;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          // Refresh documents list
          refreshDocuments();
        }
      } else if (doc.file_url) {
        // Fallback para URL pública
        window.open(doc.file_url, '_blank');
      }
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  const markAsViewed = async (documentId: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', documentId);
        
      if (error) throw error;
    } catch (error: any) {
      console.error('Error marking document as viewed:', error);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      disabled={isDocumentExpired(doc.expires_at) || isLoading} 
      onClick={handleDownload} 
      className="flex-1 bg-orange-300/50 dark:bg-navy-light/50 border-gold/20 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold-light dark:hover:text-navy flex items-center justify-center gap-1"
    >
      <Download size={14} />
      <span className="truncate">{isLoading ? "Baixando..." : (doc.filename || doc.original_filename || "Baixar")}</span>
    </Button>
  );
};
