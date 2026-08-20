import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { parsePlanoContasContent } from '@/lib/planoContas';
import type {
  LancamentoModuleKey,
  LancamentoModuleStatus,
  LancamentoModuleSummary,
  LancamentosWorkspaceData,
} from '@/types/lancamentos-workspace';
import { isResolvedModule, LANCAMENTO_MODULE_KEYS } from '@/types/lancamentos-workspace';
import { toast } from 'sonner';

const emptyModule = (key: LancamentoModuleKey): LancamentoModuleSummary => ({
  key,
  documents: 0,
  entries: 0,
  pending: 0,
  errors: 0,
  total: 0,
  status: 'nao_iniciado',
  lastActivity: null,
});

const EMPTY_DATA: LancamentosWorkspaceData = {
  company: null,
  hasChartOfAccounts: false,
  chartOfAccountsCount: 0,
  confirmedMappings: 0,
  isMonthClosed: false,
  modules: {
    despesas: emptyModule('despesas'),
    compras: emptyModule('compras'),
    faturamento: emptyModule('faturamento'),
    folha: emptyModule('folha'),
  },
  totals: { documents: 0, entries: 0, pending: 0, errors: 0, value: 0 },
  progress: 0,
  currentStep: 0,
};

const getLastActivity = (rows: Array<{ created_at?: string | null; updated_at?: string | null }>) => {
  const values = rows
    .flatMap(row => [row.updated_at, row.created_at])
    .filter((value): value is string => Boolean(value))
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime());
  return values[0] || null;
};

const resolveStatus = ({
  hasChartOfAccounts,
  noMovement,
  documents,
  entries,
  pending,
  processing,
  errors,
  launched,
}: {
  hasChartOfAccounts: boolean;
  noMovement: boolean;
  documents: number;
  entries: number;
  pending: number;
  processing: number;
  errors: number;
  launched: boolean;
}): LancamentoModuleStatus => {
  if (noMovement) return 'sem_movimento';
  if (!hasChartOfAccounts) return 'bloqueado';
  if (errors > 0) return 'erro';
  if (processing > 0) return 'processando';
  if (pending > 0) return 'recebido';
  if (launched) return 'lancado';
  if (entries > 0) return 'revisar';
  if (documents > 0) return 'recebido';
  return 'nao_iniciado';
};

const sumValues = (rows: Array<{ valor: number | null }>) =>
  rows.reduce((sum, row) => sum + Number(row.valor || 0), 0);

export const useLancamentosWorkspace = (clientId: string | null, competencia: string) => {
  const [data, setData] = useState<LancamentosWorkspaceData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchWorkspace = useCallback(async () => {
    if (!clientId) {
      setData(EMPTY_DATA);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const year = Number(competencia.slice(0, 4));
      const month = competencia.slice(5, 7);

      const [
        companyResult,
        planResult,
        despesasDocsResult,
        despesasEntriesResult,
        comprasUploadsResult,
        comprasEntriesResult,
        folhaUploadsResult,
        folhaEntriesResult,
        closuresResult,
        exportedClosureResult,
        mappingsResult,
      ] = await Promise.all([
        supabase.from('users').select('id, name, email').eq('id', clientId).maybeSingle(),
        supabase.from('planos_contas').select('conteudo').eq('user_id', clientId).maybeSingle(),
        supabase
          .from('documentos_brutos')
          .select('id, tipo_documento, status_processamento, status_alinhamento, created_at, updated_at')
          .eq('user_id', clientId)
          .eq('competencia', competencia),
        supabase
          .from('lancamentos_alinhados')
          .select('documento_origem_id, valor, created_at')
          .eq('user_id', clientId)
          .eq('competencia', competencia),
        supabase
          .from('compras_uploads')
          .select('status, created_at, updated_at')
          .eq('client_id', clientId)
          .eq('competencia', competencia),
        supabase
          .from('compras_lancamentos')
          .select('valor, created_at, updated_at')
          .eq('client_id', clientId)
          .eq('competencia', competencia),
        supabase
          .from('folha_uploads')
          .select('status, created_at, updated_at')
          .eq('client_id', clientId)
          .eq('competencia', competencia),
        supabase
          .from('folha_lancamentos')
          .select('valor, created_at, updated_at')
          .eq('client_id', clientId)
          .eq('competencia', competencia),
        supabase
          .from('month_closures')
          .select('tipo, status, closed_at')
          .eq('user_id', clientId)
          .eq('year', year)
          .eq('month', month),
        supabase
          .from('fechamentos_exportados')
          .select('id, status, created_at')
          .eq('user_id', clientId)
          .eq('competencia', competencia)
          .maybeSingle(),
        supabase
          .from('compras_cfop_mapping')
          .select('*', { count: 'exact', head: true })
          .eq('client_id', clientId),
      ]);

      const firstError = [
        companyResult.error,
        planResult.error,
        despesasDocsResult.error,
        despesasEntriesResult.error,
        comprasUploadsResult.error,
        comprasEntriesResult.error,
        folhaUploadsResult.error,
        folhaEntriesResult.error,
      ].find(Boolean);
      if (firstError) throw firstError;

      const planItems = planResult.data?.conteudo
        ? parsePlanoContasContent(planResult.data.conteudo).items
        : [];
      const hasChartOfAccounts = planItems.length > 0;
      const closures = closuresResult.data || [];
      const isNoMovement = (key: LancamentoModuleKey) =>
        closures.some(row => row.tipo === key && row.status === 'sem_movimento');

      const allGenericDocs = despesasDocsResult.data || [];
      const faturamentoDocs = allGenericDocs.filter(row => row.tipo_documento === 'faturamento');
      const faturamentoDocIds = new Set(faturamentoDocs.map(row => row.id));
      const despesasDocs = allGenericDocs.filter(row => row.tipo_documento !== 'faturamento');
      const allGenericEntries = despesasEntriesResult.data || [];
      const faturamentoEntries = allGenericEntries.filter(
        row => row.documento_origem_id && faturamentoDocIds.has(row.documento_origem_id)
      );
      const despesasEntries = allGenericEntries.filter(
        row => !row.documento_origem_id || !faturamentoDocIds.has(row.documento_origem_id)
      );
      const despesasPending = despesasDocs.filter(
        row =>
          row.status_processamento === 'nao_processado' ||
          row.status_alinhamento === 'pendente' ||
          row.status_alinhamento === 'aguardando_retry'
      ).length;
      const despesasProcessing = despesasDocs.filter(
        row =>
          row.status_processamento === 'processando' || row.status_alinhamento === 'processando'
      ).length;
      const despesasErrors = despesasDocs.filter(
        row => row.status_processamento === 'erro' || row.status_alinhamento === 'erro'
      ).length;
      const faturamentoPending = faturamentoDocs.filter(
        row =>
          row.status_processamento === 'nao_processado' ||
          row.status_alinhamento === 'pendente' ||
          row.status_alinhamento === 'aguardando_retry'
      ).length;
      const faturamentoProcessing = faturamentoDocs.filter(
        row =>
          row.status_processamento === 'processando' || row.status_alinhamento === 'processando'
      ).length;
      const faturamentoErrors = faturamentoDocs.filter(
        row => row.status_processamento === 'erro' || row.status_alinhamento === 'erro'
      ).length;

      const comprasUploads = comprasUploadsResult.data || [];
      const comprasEntries = comprasEntriesResult.data || [];
      const comprasPending = comprasUploads.filter(row => row.status === 'pendente').length;
      const comprasProcessing = comprasUploads.filter(row => row.status === 'processando').length;
      const comprasErrors = comprasUploads.filter(row => row.status === 'erro').length;

      const folhaUploads = folhaUploadsResult.data || [];
      const folhaEntries = folhaEntriesResult.data || [];
      const folhaPending = folhaUploads.filter(row =>
        ['pendente', 'transcrito', 'aguardando_contabilizacao'].includes(row.status)
      ).length;
      const folhaProcessing = folhaUploads.filter(row =>
        ['processando', 'transcrevendo', 'contabilizando'].includes(row.status)
      ).length;
      const folhaErrors = folhaUploads.filter(row => row.status.includes('erro')).length;

      const modules: Record<LancamentoModuleKey, LancamentoModuleSummary> = {
        despesas: {
          key: 'despesas',
          documents: despesasDocs.length,
          entries: despesasEntries.length,
          pending: despesasPending + despesasProcessing,
          errors: despesasErrors,
          total: sumValues(despesasEntries),
          status: resolveStatus({
            hasChartOfAccounts,
            noMovement: isNoMovement('despesas'),
            documents: despesasDocs.length,
            entries: despesasEntries.length,
            pending: despesasPending,
            processing: despesasProcessing,
            errors: despesasErrors,
            launched: Boolean(exportedClosureResult.data),
          }),
          lastActivity: getLastActivity([...despesasDocs, ...despesasEntries]),
        },
        compras: {
          key: 'compras',
          documents: comprasUploads.length,
          entries: comprasEntries.length,
          pending: comprasPending + comprasProcessing,
          errors: comprasErrors,
          total: sumValues(comprasEntries),
          status: resolveStatus({
            hasChartOfAccounts,
            noMovement: isNoMovement('compras'),
            documents: comprasUploads.length,
            entries: comprasEntries.length,
            pending: comprasPending,
            processing: comprasProcessing,
            errors: comprasErrors,
            launched:
              comprasUploads.length > 0 && comprasUploads.every(row => row.status === 'lancado'),
          }),
          lastActivity: getLastActivity([...comprasUploads, ...comprasEntries]),
        },
        faturamento: {
          key: 'faturamento',
          documents: faturamentoDocs.length,
          entries: faturamentoEntries.length,
          pending: faturamentoPending + faturamentoProcessing,
          errors: faturamentoErrors,
          total: sumValues(faturamentoEntries),
          status: resolveStatus({
            hasChartOfAccounts,
            noMovement: isNoMovement('faturamento'),
            documents: faturamentoDocs.length,
            entries: faturamentoEntries.length,
            pending: faturamentoPending,
            processing: faturamentoProcessing,
            errors: faturamentoErrors,
            launched:
              faturamentoDocs.length > 0 &&
              faturamentoEntries.length > 0 &&
              faturamentoPending === 0 &&
              faturamentoProcessing === 0 &&
              faturamentoErrors === 0,
          }),
          lastActivity: getLastActivity([...faturamentoDocs, ...faturamentoEntries]),
        },
        folha: {
          key: 'folha',
          documents: folhaUploads.length,
          entries: folhaEntries.length,
          pending: folhaPending + folhaProcessing,
          errors: folhaErrors,
          total: sumValues(folhaEntries),
          status: resolveStatus({
            hasChartOfAccounts,
            noMovement: isNoMovement('folha'),
            documents: folhaUploads.length,
            entries: folhaEntries.length,
            pending: folhaPending,
            processing: folhaProcessing,
            errors: folhaErrors,
            launched:
              folhaUploads.length > 0 &&
              folhaUploads.every(row => ['contabilizado', 'lancado'].includes(row.status)),
          }),
          lastActivity: getLastActivity([...folhaUploads, ...folhaEntries]),
        },
      };

      const moduleList = LANCAMENTO_MODULE_KEYS.map(key => modules[key]);
      const totals = moduleList.reduce(
        (acc, module) => ({
          documents: acc.documents + module.documents,
          entries: acc.entries + module.entries,
          pending: acc.pending + module.pending,
          errors: acc.errors + module.errors,
          value: acc.value + module.total,
        }),
        { documents: 0, entries: 0, pending: 0, errors: 0, value: 0 }
      );
      const resolvedModules = moduleList.filter(module => isResolvedModule(module.status)).length;
      const progress = Math.round((hasChartOfAccounts ? 20 : 0) + resolvedModules * 20);
      const hasProcessing = moduleList.some(module => module.status === 'processando');
      const needsReview = moduleList.some(module =>
        ['revisar', 'erro', 'recebido'].includes(module.status)
      );
      const currentStep = !hasChartOfAccounts
        ? 0
        : hasProcessing
          ? 2
          : needsReview
            ? 3
            : resolvedModules === moduleList.length
              ? 4
              : 1;

      setData({
        company: companyResult.data
          ? {
              id: companyResult.data.id,
              name: companyResult.data.name || companyResult.data.email || 'Empresa',
              email: companyResult.data.email || '',
            }
          : null,
        hasChartOfAccounts,
        chartOfAccountsCount: planItems.length,
        confirmedMappings: mappingsResult.count || 0,
        isMonthClosed: Boolean(exportedClosureResult.data),
        modules,
        totals,
        progress,
        currentStep,
      });
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Falha ao carregar lançamentos';
      console.error('Erro ao carregar central de lançamentos:', caughtError);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [clientId, competencia]);

  useEffect(() => {
    fetchWorkspace();
  }, [fetchWorkspace]);

  const markNoMovement = useCallback(
    async (module: LancamentoModuleKey) => {
      if (!clientId || !data.company) return;
      const year = Number(competencia.slice(0, 4));
      const month = competencia.slice(5, 7);
      const { data: existing, error: findError } = await supabase
        .from('month_closures')
        .select('id')
        .eq('user_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .eq('tipo', module)
        .maybeSingle();
      if (findError) throw findError;

      const result = existing
        ? await supabase
            .from('month_closures')
            .update({ status: 'sem_movimento', closed_at: new Date().toISOString() })
            .eq('id', existing.id)
        : await supabase.from('month_closures').insert({
            user_id: clientId,
            user_name: data.company.name,
            user_email: data.company.email,
            year,
            month,
            tipo: module,
            status: 'sem_movimento',
          });
      if (result.error) throw result.error;
      toast.success('Módulo marcado como sem movimento');
      await fetchWorkspace();
    },
    [clientId, competencia, data.company, fetchWorkspace]
  );

  const clearNoMovement = useCallback(
    async (module: LancamentoModuleKey) => {
      if (!clientId) return;
      const year = Number(competencia.slice(0, 4));
      const month = competencia.slice(5, 7);
      const { error: deleteError } = await supabase
        .from('month_closures')
        .delete()
        .eq('user_id', clientId)
        .eq('year', year)
        .eq('month', month)
        .eq('tipo', module)
        .eq('status', 'sem_movimento');
      if (deleteError) throw deleteError;
      toast.success('Marcação removida');
      await fetchWorkspace();
    },
    [clientId, competencia, fetchWorkspace]
  );

  return useMemo(
    () => ({ data, isLoading, error, refresh: fetchWorkspace, markNoMovement, clearNoMovement }),
    [data, isLoading, error, fetchWorkspace, markNoMovement, clearNoMovement]
  );
};
