
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Document } from "@/utils/auth/types";
import { useAuth } from "@/contexts/AuthContext";

export const useDocumentActions = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loadingDocumentIds, setLoadingDocumentIds] = useState<Set<string>>(new Set());

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

  const handleDownload = async (docItem: Document): Promise<void> => {
    if (!user?.id) {
      toast({
        variant: "destructive",
        title: "Erro de autenticação",
        description: "Usuário não autenticado. Por favor, faça login novamente."
      });
      return;
    }
    
    // Mark as viewed when downloaded
    await markAsViewed(docItem);
    
    try {
      setLoadingDocumentIds(prev => new Set([...prev, docItem.id]));
      
      // Verificar se o documento pertence ao usuário autenticado
      if (docItem.user_id !== user.id) {
        throw new Error("Você não tem permissão para baixar este documento.");
      }
      
      let storagePath = "";
      
      // Se temos o storage_key, usamos ele como base para construir o path
      if (docItem.storage_key) {
        // Verificar se o storage_key começa com o ID do usuário para garantir segurança
        if (!docItem.storage_key.startsWith(`${user.id}/`)) {
          throw new Error("Caminho de armazenamento inválido para este usuário.");
        }
        storagePath = docItem.storage_key;
      } else {
        // Fallback para construir um caminho baseado no ID do usuário e nome do arquivo
        const filename = docItem.filename || docItem.original_filename || docItem.name;
        storagePath = `${user.id}/${filename}`;
        console.warn("Usando caminho alternativo para download:", storagePath);
      }
      
      console.log('Tentando baixar documento com path:', storagePath);
      
      // Baixar o arquivo do storage
      const { data, error } = await supabase.storage
        .from('documents')
        .download(storagePath);
      
      if (error) {
        console.error("Erro de download do Supabase:", error);
        throw new Error(`Erro ao baixar documento: ${error.message}`);
      }
      
      if (data) {
        // Criar URL do blob e iniciar download
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = docItem.filename || docItem.original_filename || docItem.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        toast({
          title: "Sucesso",
          description: "Documento baixado com sucesso!"
        });
      } else {
        throw new Error("Arquivo não encontrado no storage.");
      }
    } catch (error: any) {
      console.error('Erro ao baixar documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao baixar documento",
        description: error.message || "Ocorreu um erro ao tentar baixar o documento."
      });
    } finally {
      setLoadingDocumentIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(docItem.id);
        return newSet;
      });
    }
  };

  return {
    loadingDocumentIds,
    setLoadingDocumentIds,
    markAsViewed,
    handleDownload
  };
};
