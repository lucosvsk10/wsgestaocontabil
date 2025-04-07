
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useDocumentDelete = (fetchUserDocuments: (userId: string) => Promise<void>) => {
  const { toast } = useToast();

  const handleDeleteDocument = async (documentId: string, selectedUserId: string | null) => {
    if (!window.confirm("Tem certeza que deseja excluir este documento?")) {
      return;
    }
    try {
      // Buscar o documento para obter o storage_key
      const { data: docData, error: fetchError } = await supabase.from('documents').select('*').eq('id', documentId).single();
      if (fetchError) throw fetchError;

      // Excluir o registro do documento do banco de dados
      const { error: deleteDbError } = await supabase.from('documents').delete().eq('id', documentId);
      if (deleteDbError) throw deleteDbError;

      // Excluir o arquivo do storage se tivermos um storage_key
      if (docData) {
        let storagePath;
        
        if (docData.storage_key) {
          // Usar o storage_key diretamente se disponível
          storagePath = docData.storage_key;
        } else if (docData.file_url) {
          // Tentar extrair o caminho da URL (fallback)
          try {
            const url = new URL(docData.file_url);
            const pathArray = url.pathname.split('/');
            // Extrair o caminho após 'documents/' na URL
            const documentsIndex = pathArray.indexOf('documents');
            if (documentsIndex !== -1 && documentsIndex + 1 < pathArray.length) {
              storagePath = pathArray.slice(documentsIndex + 1).join('/');
            }
          } catch (e) {
            console.error('Erro ao analisar URL do arquivo:', e);
          }
        }
        
        if (storagePath) {
          console.log('Removendo arquivo do storage:', storagePath);
          const { error: deleteStorageError } = await supabase.storage
            .from('documents')
            .remove([storagePath]);
            
          if (deleteStorageError) {
            console.error('Erro ao excluir arquivo do storage:', deleteStorageError);
          }
        } else {
          console.warn('Não foi possível determinar o caminho do storage para exclusão');
        }
      }

      // Atualizar a lista de documentos
      if (selectedUserId) {
        await fetchUserDocuments(selectedUserId);
      }
      
      toast({
        title: "Documento excluído com sucesso",
        description: "O documento foi removido permanentemente."
      });
    } catch (error: any) {
      console.error('Erro ao excluir documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir documento",
        description: error.message
      });
    }
  };

  return {
    handleDeleteDocument
  };
};
