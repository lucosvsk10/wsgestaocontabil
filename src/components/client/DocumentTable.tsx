
import { useState } from "react";
import { Document } from "@/utils/auth/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import { MobileDocumentCard, DesktopDocumentTable } from "./document-table";

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
  const { user } = useAuth();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());
  const isMobile = useIsMobile();

  const markAsViewed = async (docItem: Document) => {
    // If already viewed, no need to update
    if (docItem.viewed) return;
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, docItem.id]));
      
      const { error } = await supabase
        .from('documents')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', docItem.id);
        
      if (error) throw error;
      
      // Refresh the documents list
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
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Usuário não autenticado."
      });
      return;
    }
    
    // Mark as viewed when downloaded
    markAsViewed(docItem);
    
    try {
      let storagePath = docItem.storage_key;
      
      // Verify and fix storage path to include user ID
      if (storagePath && !storagePath.startsWith(`${user.id}/`)) {
        const filename = storagePath.split('/').pop();
        storagePath = `${user.id}/${filename}`;
      }
      
      if (storagePath) {
        console.log('Downloading with storage path:', storagePath);
        
        // Se temos o storage_key, usar o método de download
        const { data, error } = await supabase.storage
          .from('documents')
          .download(storagePath);
        
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
      } else {
        throw new Error("Não foi possível encontrar o arquivo para download.");
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

  if (isMobile) {
    return (
      <div className="space-y-4">
        {documents.map(doc => (
          <MobileDocumentCard
            key={doc.id}
            doc={doc}
            formatDate={formatDate}
            isDocumentExpired={isDocumentExpired}
            daysUntilExpiration={daysUntilExpiration}
            refreshDocuments={refreshDocuments}
            loadingDocumentIds={loadingDocumentIds}
            setLoadingDocumentIds={setLoadingDocumentIds}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <DesktopDocumentTable
        documents={documents}
        formatDate={formatDate}
        isDocumentExpired={isDocumentExpired}
        daysUntilExpiration={daysUntilExpiration}
        refreshDocuments={refreshDocuments}
        loadingDocumentIds={loadingDocumentIds}
        setLoadingDocumentIds={setLoadingDocumentIds}
      />
    </div>
  );
};
