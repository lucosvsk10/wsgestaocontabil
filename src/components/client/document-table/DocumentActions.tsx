
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/utils/auth/types";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

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
  loadingDocumentIds,
}: DocumentActionsProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  
  const markAsViewed = async (docItem: Document): Promise<boolean> => {
    // If already viewed, no need to update
    if (docItem.viewed) return true;
    
    try {
      setIsLoading(true);
      
      const { error } = await supabase
        .from('documents')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', docItem.id);
        
      if (error) throw error;
      
      // Refresh the documents list
      refreshDocuments();
      
      return true;
    } catch (error: any) {
      console.error('Error marking document as viewed:', error);
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
    // Mark as viewed when downloaded
    const viewResult = await markAsViewed(doc);
    if (!viewResult) return;
    
    try {
      setIsLoading(true);
      
      if (doc.storage_key) {
        // If we have the storage_key, use the download method
        const { data, error } = await supabase.storage
          .from('documents')
          .download(doc.storage_key);
        
        if (error) throw error;
        
        if (data) {
          // Create blob URL and start download
          const url = URL.createObjectURL(data);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = doc.filename || doc.original_filename || doc.name;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else if (doc.file_url) {
        // Fallback to public URL
        window.open(doc.file_url, '_blank');
      }
    } catch (error: any) {
      console.error('Error downloading document:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      size="sm" 
      disabled={isDocumentExpired(doc.expires_at) || isLoading || loadingDocumentIds.has(doc.id)} 
      onClick={handleDownload} 
      className="flex-1 bg-orange-300/50 dark:bg-navy-light/50 border-gold/20 text-navy dark:text-gold hover:bg-gold hover:text-navy dark:hover:bg-gold-light dark:hover:text-navy flex items-center justify-center gap-1"
    >
      <Download size={14} />
      <span className="truncate">{doc.filename || doc.original_filename || "Baixar"}</span>
    </Button>
  );
};
