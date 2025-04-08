
import { useState } from "react";
import { Download, Eye, Check, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Document } from "@/utils/auth/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface DocumentActionsProps {
  doc: Document;
  isDocumentExpired: (expirationDate: string | null) => boolean;
  refreshDocuments: () => void;
  loadingDocumentIds: Set<string>;
  setLoadingDocumentIds: React.Dispatch<React.SetStateAction<Set<string>>>;
}

export const DocumentActions = ({
  doc,
  isDocumentExpired,
  refreshDocuments,
  loadingDocumentIds,
  setLoadingDocumentIds
}: DocumentActionsProps) => {
  const { toast } = useToast();

  const formatViewedDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return format(date, "dd/MM/yyyy 'às' HH:mm", { locale: pt });
  };

  const markAsViewed = async (docItem: Document) => {
    // If already viewed, no need to update
    if (docItem.viewed) return;
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, docItem.id]));
      
      const currentTime = new Date().toISOString();
      const { error } = await supabase
        .from('documents')
        .update({ 
          viewed: true,
          viewed_at: currentTime 
        })
        .eq('id', docItem.id);
        
      if (error) throw error;

      // Refresh the documents list to update UI in all places
      refreshDocuments();
      toast({
        title: "Documento marcado como visualizado",
        description: "A notificação foi removida com sucesso."
      });
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
    try {
      if (docItem.storage_key) {
        // Se temos o storage_key, usar o método de download
        const { data, error } = await supabase.storage
          .from('documents')
          .download(docItem.storage_key);
          
        if (error) throw error;
        
        if (data) {
          // Criar URL do blob e iniciar download
          const url = URL.createObjectURL(data);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = docItem.filename || docItem.original_filename || docItem.name;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }
      } else if (docItem.file_url) {
        // Fallback para URL pública
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

  return (
    <>
      {!doc.viewed ? (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isDocumentExpired(doc.expires_at) || loadingDocumentIds.has(doc.id)} 
            onClick={() => handleDownload(doc)} 
            className="flex-1 bg-[#393532] border-gold/20 text-gold hover:bg-gold hover:text-navy flex items-center justify-center gap-1"
          >
            <Download size={14} />
            <span>{doc.filename || doc.original_filename || "Baixar"}</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm" 
            disabled={loadingDocumentIds.has(doc.id)} 
            onClick={() => markAsViewed(doc)} 
            className="flex-1 bg-[#393532] border-gold/20 text-gold hover:bg-gold hover:text-navy flex items-center justify-center gap-1"
          >
            <Bell size={14} className="text-red-500 mr-1" />
            <span>Visualizar</span>
          </Button>
        </>
      ) : (
        <>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isDocumentExpired(doc.expires_at)} 
            onClick={() => handleDownload(doc)} 
            className="flex-1 bg-[#393532] border-gold/20 text-gold hover:bg-gold hover:text-navy flex items-center justify-center gap-1"
          >
            <Download size={14} />
            <span>{doc.filename || doc.original_filename || "Baixar"}</span>
          </Button>
          
          <div className="flex-1 px-3 py-1.5 bg-[#393532] border border-gold/20 rounded-md text-sm text-green-400 flex items-center justify-center gap-1">
            <Check size={14} />
            <span>Visualizado {formatViewedDate(doc.viewed_at)}</span>
          </div>
        </>
      )}
    </>
  );
};
