import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { ExtratoBancario, DocumentoConciliacao, ConciliacaoStats } from '@/types/conciliacao';
import { useToast } from '@/hooks/use-toast';

export const useConciliacaoData = (userId: string, competencia: string) => {
  const [extratos, setExtratos] = useState<ExtratoBancario[]>([]);
  const [documentos, setDocumentos] = useState<DocumentoConciliacao[]>([]);
  const [stats, setStats] = useState<ConciliacaoStats>({
    totalTransacoes: 0,
    pendentesComprovante: 0,
    conciliados: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: extratosData, error: extratosError } = await supabase
        .from('extrato_bancario')
        .select('*')
        .eq('user_id', userId)
        .eq('competencia', competencia)
        .order('data_transacao', { ascending: false });

      if (extratosError) throw extratosError;

      const { data: documentosData, error: documentosError } = await supabase
        .from('documentos_conciliacao')
        .select('*')
        .eq('user_id', userId)
        .eq('competencia', competencia)
        .in('status_processamento', ['nao_processado', 'processando', 'pendente_manual'])
        .order('created_at', { ascending: false });

      if (documentosError) throw documentosError;

      setExtratos((extratosData || []) as ExtratoBancario[]);
      setDocumentos((documentosData || []) as DocumentoConciliacao[]);

      const total = extratosData?.length || 0;
      const conciliados = extratosData?.filter(e => e.status === 'conciliado').length || 0;
      const pendentes = total - conciliados;

      setStats({
        totalTransacoes: total,
        pendentesComprovante: pendentes,
        conciliados: conciliados
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (userId && competencia) {
      fetchData();
    }
  }, [userId, competencia]);

  useEffect(() => {
    const extratosChannel = supabase
      .channel('extrato-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'extrato_bancario',
          filter: `user_id=eq.${userId}`
        }, 
        () => fetchData()
      )
      .subscribe();

    const documentosChannel = supabase
      .channel('documentos-changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'documentos_conciliacao',
          filter: `user_id=eq.${userId}`
        }, 
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(extratosChannel);
      supabase.removeChannel(documentosChannel);
    };
  }, [userId]);

  return {
    extratos,
    documentos,
    stats,
    isLoading,
    refetch: fetchData
  };
};
