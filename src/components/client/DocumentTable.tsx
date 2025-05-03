import { useState } from "react";
import { Download, Clock, Tag, Bell, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Document } from "@/utils/auth/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";

interface DocumentTableProps {
  documents: Document[];
  formatDate: (dateStr: string) => string;
  isDocumentExpired: (expiresAt: string | null) => boolean;
  daysUntilExpiration: (expiresAt: string | null) => string | null;
  refreshDocuments: () => void;
}

export const DocumentTable = ({ 
  documents, 
  formatDate, 
  isDocumentExpired, 
  daysUntilExpiration,
  refreshDocuments
}: DocumentTableProps) => {
  const { toast } = useToast();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  const markAsViewed = async (docItem: Document) => {
    if (docItem.viewed) return;
    try {
      setLoadingDocumentIds(prev => new Set([...prev, docItem.id]));
      const { error } = await supabase
        .from('documents')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', docItem.id);
      if (error) throw error;
      refreshDocuments();
    } catch (error: any) {
      console.error('Error marking document as viewed:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível marcar o documento como visualizado."
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(docItem.id);
        return newSet;
      });
    }
  };

  const handleDownload = async (docItem: Document) => {
    markAsViewed(docItem);
    try {
      if (docItem.storage_key) {
        const { data: signedUrlData, error: signedUrlError } = await supabase
          .storage
          .from('documents')
          .createSignedUrl(docItem.storage_key, 60);

        if (signedUrlError) throw signedUrlError;

        if (signedUrlData?.signedUrl) {
          window.open(signedUrlData.signedUrl, '_blank');
        } else {
          throw new Error('URL de download não pôde ser gerada.');
        }
      } else if (docItem.file_url) {
        window.open(docItem.file_url, '_blank');
      }
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message
      });
    }
  };

  // ... (restante do componente permanece igual, incluindo versão mobile e desktop)
