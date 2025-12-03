import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Document {
  id: string;
  nome_arquivo: string;
  tipo_documento: string;
  status_processamento: string;
  status_alinhamento?: string;
  created_at: string;
  processado_em?: string;
  tentativas_processamento?: number;
  ultimo_erro?: string;
  url_storage?: string;
}

interface Fechamento {
  id: string;
  arquivo_excel_url?: string;
  arquivo_csv_url?: string;
  total_lancamentos: number;
  created_at: string;
}

export const useLancamentosData = (userId: string | undefined, competencia: string) => {
  const { toast } = useToast();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Fetch documents with new fields from renamed table
      const { data: docs, error: docsError } = await supabase
        .from('documentos_brutos')
        .select('id, nome_arquivo, tipo_documento, status_processamento, status_alinhamento, created_at, processado_em, tentativas_processamento, ultimo_erro, url_storage')
        .eq('user_id', userId)
        .eq('competencia', competencia)
        .order('created_at', { ascending: false });

      if (docsError) throw docsError;
      setDocuments(docs || []);

      // Fetch fechamento
      const { data: fech, error: fechError } = await supabase
        .from('fechamentos_exportados')
        .select('*')
        .eq('user_id', userId)
        .eq('competencia', competencia)
        .maybeSingle();

      if (fechError) throw fechError;
      setFechamento(fech);

    } catch (error) {
      console.error('Error fetching lancamentos data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [userId, competencia]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscription for documents
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('documentos-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documentos_brutos',
          filter: `user_id=eq.${userId}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, fetchData]);

  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      setDeletingIds(prev => new Set(prev).add(documentId));

      // Buscar dados do documento para obter a URL do storage
      const { data: doc, error: fetchError } = await supabase
        .from('documentos_brutos')
        .select('url_storage')
        .eq('id', documentId)
        .single();

      if (fetchError) throw fetchError;

      // Excluir do storage se houver URL
      if (doc?.url_storage) {
        let storagePath = doc.url_storage;
        
        // Se for uma URL completa, extrair o path
        if (doc.url_storage.startsWith('http')) {
          try {
            const url = new URL(doc.url_storage);
            const pathParts = url.pathname.split('/');
            const bucketIndex = pathParts.findIndex(p => p === 'lancamentos');
            if (bucketIndex !== -1) {
              storagePath = pathParts.slice(bucketIndex + 1).join('/');
            }
          } catch (e) {
            console.error('Erro ao parsear URL:', e);
          }
        }
        
        // Tentar excluir do storage
        const { error: storageError } = await supabase.storage
          .from('lancamentos')
          .remove([storagePath]);
        
        if (storageError) {
          console.error('Erro ao excluir arquivo do storage:', storageError);
        }
      }

      // Excluir lançamentos alinhados relacionados
      await supabase
        .from('lancamentos_alinhados')
        .delete()
        .eq('documento_origem_id', documentId);

      // Excluir do banco de dados
      const { error: deleteError } = await supabase
        .from('documentos_brutos')
        .delete()
        .eq('id', documentId);

      if (deleteError) throw deleteError;

      // Atualizar lista local
      setDocuments(prev => prev.filter(d => d.id !== documentId));

      toast({
        title: "Documento excluído",
        description: "O documento foi removido com sucesso."
      });

    } catch (error: any) {
      console.error('Erro ao excluir documento:', error);
      toast({
        variant: "destructive",
        title: "Erro ao excluir",
        description: error.message || "Não foi possível excluir o documento."
      });
    } finally {
      setDeletingIds(prev => {
        const next = new Set(prev);
        next.delete(documentId);
        return next;
      });
    }
  }, [toast]);

  return {
    documents,
    fechamento,
    isLoading,
    deletingIds,
    deleteDocument,
    refetch: fetchData
  };
};