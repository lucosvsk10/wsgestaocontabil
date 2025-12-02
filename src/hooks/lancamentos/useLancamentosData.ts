import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Document {
  id: string;
  nome_arquivo: string;
  tipo_documento: string;
  status_processamento: string;
  created_at: string;
  tentativas_processamento?: number;
  ultimo_erro?: string;
}

interface Fechamento {
  id: string;
  arquivo_excel_url?: string;
  arquivo_csv_url?: string;
  total_lancamentos: number;
  created_at: string;
}

export const useLancamentosData = (userId: string | undefined, competencia: string) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [fechamento, setFechamento] = useState<Fechamento | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!userId) return;

    setIsLoading(true);
    try {
      // Fetch documents
      const { data: docs, error: docsError } = await supabase
        .from('documentos_conciliacao')
        .select('id, nome_arquivo, tipo_documento, status_processamento, created_at, tentativas_processamento, ultimo_erro')
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
          table: 'documentos_conciliacao',
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

  return {
    documents,
    fechamento,
    isLoading,
    refetch: fetchData
  };
};
