
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
      const { data: docData, error: fetchError } = await supabase.from('documents').select('*').eq('id', documentId).single();
      if (fetchError) throw fetchError;

      const { error: deleteDbError } = await supabase.from('documents').delete().eq('id', documentId);
      if (deleteDbError) throw deleteDbError;

      if (docData) {
        let storagePath;
        
        if (docData.storage_key) {
          storagePath = docData.storage_key;
        } else if (docData.file_url) {
          const url = new URL(docData.file_url);
          const pathArray = url.pathname.split('/');
          storagePath = pathArray.slice(pathArray.indexOf('documents') + 1).join('/');
        }
        
        if (storagePath) {
          const { error: deleteStorageError } = await supabase.storage.from('documents').remove([storagePath]);
          if (deleteStorageError) {
            console.error('Erro ao excluir arquivo do storage:', deleteStorageError);
          }
        }
      }

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
