import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export type CompetenciaStatus = 'fechado' | 'erro' | 'processando' | 'em_andamento' | 'vazio';

export interface CompetenciaOverview {
  competencia: string;
  documentos: number;
  lancamentos: number;
  fechado: boolean;
  erros: number;
  processando: number;
  status: CompetenciaStatus;
}

const getStatus = (item: Omit<CompetenciaOverview, 'status'>): CompetenciaStatus => {
  if (item.fechado) return 'fechado';
  if (item.erros > 0) return 'erro';
  if (item.processando > 0) return 'processando';
  if (item.documentos > 0 || item.lancamentos > 0) return 'em_andamento';
  return 'vazio';
};

export const useLancamentosOverview = (clientId: string | null, year: string) => {
  const [items, setItems] = useState<CompetenciaOverview[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchOverview = useCallback(async () => {
    if (!clientId) {
      setItems([]);
      return;
    }

    setIsLoading(true);
    const start = `${year}-01`;
    const end = `${year}-12`;

    try {
      const [
        docsResult,
        alignedResult,
        closedResult,
        folhaUploadsResult,
        folhaLancamentosResult,
        comprasUploadsResult,
        comprasLancamentosResult,
      ] = await Promise.all([
        supabase
          .from('documentos_brutos')
          .select('competencia, status_processamento, status_alinhamento')
          .eq('user_id', clientId)
          .gte('competencia', start)
          .lte('competencia', end),
        supabase
          .from('lancamentos_alinhados')
          .select('competencia')
          .eq('user_id', clientId)
          .gte('competencia', start)
          .lte('competencia', end),
        supabase
          .from('fechamentos_exportados')
          .select('competencia')
          .eq('user_id', clientId)
          .gte('competencia', start)
          .lte('competencia', end),
        supabase
          .from('folha_uploads')
          .select('competencia, status')
          .eq('client_id', clientId)
          .gte('competencia', start)
          .lte('competencia', end),
        supabase
          .from('folha_lancamentos')
          .select('competencia')
          .eq('client_id', clientId)
          .gte('competencia', start)
          .lte('competencia', end),
        supabase
          .from('compras_uploads')
          .select('competencia, status')
          .eq('client_id', clientId)
          .gte('competencia', start)
          .lte('competencia', end),
        supabase
          .from('compras_lancamentos')
          .select('competencia')
          .eq('client_id', clientId)
          .gte('competencia', start)
          .lte('competencia', end),
      ]);

      const months: Record<string, Omit<CompetenciaOverview, 'status'>> = {};
      for (let month = 1; month <= 12; month += 1) {
        const competencia = `${year}-${String(month).padStart(2, '0')}`;
        months[competencia] = {
          competencia,
          documentos: 0,
          lancamentos: 0,
          fechado: false,
          erros: 0,
          processando: 0,
        };
      }

      const addDocument = (
        row: Record<string, unknown> & { competencia?: string | null },
        statusFields: string[]
      ) => {
        if (!row.competencia) return;
        const month = months[row.competencia];
        if (!month) return;
        month.documentos += 1;
        const combined = statusFields
          .map(field => String(row[field] || '').toLowerCase())
          .join(' ');
        if (combined.includes('erro')) month.erros += 1;
        if (
          combined.includes('process') ||
          combined.includes('transcrev') ||
          combined.includes('aguardando')
        )
          month.processando += 1;
      };

      (docsResult.data || []).forEach(row =>
        addDocument(row, ['status_processamento', 'status_alinhamento'])
      );
      (folhaUploadsResult.data || []).forEach(row => addDocument(row, ['status']));
      (comprasUploadsResult.data || []).forEach(row => addDocument(row, ['status']));

      [alignedResult.data, folhaLancamentosResult.data, comprasLancamentosResult.data].forEach(
        rows => {
          (rows || []).forEach((row: { competencia?: string | null }) => {
            if (row.competencia && months[row.competencia])
              months[row.competencia].lancamentos += 1;
          });
        }
      );

      (closedResult.data || []).forEach(row => {
        if (months[row.competencia]) months[row.competencia].fechado = true;
      });

      setItems(Object.values(months).map(item => ({ ...item, status: getStatus(item) })));
    } catch (error) {
      console.error('Erro ao carregar visão anual de lançamentos:', error);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, year]);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const totals = useMemo(
    () => ({
      documentos: items.reduce((sum, item) => sum + item.documentos, 0),
      lancamentos: items.reduce((sum, item) => sum + item.lancamentos, 0),
      mesesFechados: items.filter(item => item.fechado).length,
      pendencias: items.reduce((sum, item) => sum + item.erros + item.processando, 0),
    }),
    [items]
  );

  return { items, totals, isLoading, refetch: fetchOverview };
};
