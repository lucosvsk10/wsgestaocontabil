
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { AppDocument } from "@/types/admin";

export const useDocumentActions = () => {
  const { toast } = useToast();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());

  // Handle document download
  const handleDownload = async (document: AppDocument) => {
    try {
      setLoadingDocumentIds(prev => new Set([...prev, document.id]));
      
      if (document.storage_key) {
        // Download using storage_key
        const { data, error } = await supabase.storage
          .from('documents')
          .download(document.storage_key);
        
        if (error) throw error;
        
        if (data) {
          const url = URL.createObjectURL(data);
          const a = window.document.createElement('a');
          a.href = url;
          a.download = document.filename || document.original_filename || document.name;
          window.document.body.appendChild(a);
          a.click();
          window.document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast({
            title: "Download concluído",
            description: "O documento foi baixado com sucesso."
          });
          
          return;
        }
      }

      // Fallback to public URL
      if (document.file_url) {
        window.open(document.file_url, '_blank');
      } else {
        throw new Error("URL do documento não encontrada");
      }
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(document.id);
        return newSet;
      });
    }
  };
  
  // Mark document as viewed
  const markDocumentAsViewed = async (documentId: string, userId: string) => {
    try {
      const { error } = await supabase
        .from('visualized_documents')
        .insert({ document_id: documentId, user_id: userId })
        .select();
        
      if (error && error.code !== '23505') { // Ignora erro de chave duplicada
        throw error;
      }
      
      // Atualiza também o flag viewed no document
      const { error: updateError } = await supabase
        .from('documents')
        .update({ viewed: true, viewed_at: new Date().toISOString() })
        .eq('id', documentId);
        
      if (updateError) {
        throw updateError;
      }
      
    } catch (error: any) {
      console.error('Erro ao marcar documento como visualizado:', error);
    }
  };

  return {
    loadingDocumentIds,
    handleDownload,
    markDocumentAsViewed
  };
};
