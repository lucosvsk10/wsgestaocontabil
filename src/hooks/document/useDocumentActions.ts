import { useState, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { Document } from "@/utils/auth/types";
import { useToast } from "@/hooks/use-toast";

// Atualize a importação de useNotifications
import { useNotifications } from "@/hooks/useNotifications";

interface DocumentMetadata {
  name: string;
  category: string;
  subcategory?: string;
  observations?: string;
  expires_at?: string | null;
}

export const useDocumentActions = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const { createNotification } = useNotifications();

  // Marcar documento como lido
  const markAsViewed = async (documentId: string) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return false;
    }

    try {
      const { data: document, error: documentError } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (documentError) {
        throw documentError;
      }

      const { error } = await supabase
        .from("visualized_documents")
        .upsert(
          { user_id: user.id, document_id: documentId, viewed_at: new Date().toISOString() },
          { onConflict: ['user_id', 'document_id'], ignoreDuplicates: false }
        );

      if (error) {
        throw error;
      }

      // Aqui está a correção - use createNotification em vez de markDocumentNotificationAsRead
      await createNotification(`Documento ${document?.name || 'desconhecido'} visualizado`, "document");
      
      toast({
        title: "Sucesso",
        description: "Documento marcado como visualizado.",
      });
      return true;
    } catch (error: any) {
      console.error("Erro ao marcar documento como visualizado:", error);
      toast({
        title: "Erro",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  // Função para obter o número de visualizações de um documento
  const getDocumentViews = useCallback(async (documentId: string): Promise<number> => {
    try {
      const { count, error } = await supabase
        .from('visualized_documents')
        .select('*', { count: 'exact', head: false })
        .eq('document_id', documentId);

      if (error) {
        console.error("Erro ao obter número de visualizações:", error);
        return 0;
      }

      return count || 0;
    } catch (error) {
      console.error("Erro ao obter número de visualizações:", error);
      return 0;
    }
  }, []);

  return {
    getDocumentViews,
    markAsViewed,
  };
};
