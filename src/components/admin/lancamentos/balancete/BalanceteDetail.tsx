import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { exportCalimaXlsx, type CalimaRow } from '../exportCalima';
import { fetchPlanoContas, lookupPlanoContasDescricao, type PlanoContasMap } from '@/lib/planoContas';

type Origem = 'Despesas' | 'Compras' | 'Faturamento' | 'Folha de pagamento';

interface ConsolidatedRow extends CalimaRow {
  id: string;
  origem: Origem;
}

interface BalanceteDetailProps {
  clientId: string;
  clientName: string;
  competencia: string;
}

const ORIGENS: Origem[] = ['Despesas', 'Compras', 'Faturamento', 'Folha de pagamento'];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

const formatDate = (value: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || '—';
};

const filenameSafe = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '');

export const BalanceteDetail = ({ clientId, clientName, competencia }: BalanceteDetailProps) => {
  const [rows, setRows] = useState<ConsolidatedRow[]>([]);
  const [plano, setPlano] = useState<PlanoContasMap>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [planResult, documentsResult, genericResult, comprasResult, folhaResult] =
        await Promise.all([
          fetchPlanoContas(clientId),
          supabase
            .from('documentos_brutos')
            .select('id, tipo_documento')
            .eq('user_id', clientId)
            .eq('competencia', competencia),
          supabase
            .from('lancamentos_alinhados')
            .select('id, data, valor, debito, credito, historico, centro_custo_debito, centro_custo_credito, documento_origem_id')
            .eq('user_id', clientId)
            .eq('competencia', competencia),
          supabase
            .from('compras_lancamentos')
            .select('id, data, valor, conta_debito, conta_credito, historico')
            .eq('client_id', clientId)
            .eq('competencia', competencia),
          supabase
            .from('folha_lancamentos')
            .select('id, data, valor, conta_debito, conta_credito, historico')
            .eq('client_id', clientId)
            .eq('competencia', competencia),
        ]);

      const queryError =
        documentsResult.error || genericResult.error || comprasResult.error || folhaResult.error;
      if (queryError) throw queryError;

      const documentTypes = new Map(
        (documentsResult.data || []).map(document => [document.id, document.tipo_documento])
      );
      const genericRows: ConsolidatedRow[] = (genericResult.data || []).map(row => ({
        id: row.id,
        origem:
          row.documento_origem_id && documentTypes.get(row.documento_origem_id) === 'faturamento'
            ? 'Faturamento'
            : 'Despesas',
        data: row.data,
        valor: row.valor,
        conta_debito: row.debito,
        conta_credito: row.credito,
        historico: row.historico,
        cc_debito: row.centro_custo_debito,
        cc_credito: row.centro_custo_credito,
      }));
      const comprasRows: ConsolidatedRow[] = (comprasResult.data || []).map(row => ({
        id: row.id,
        origem: 'Compras',
        data: row.data,
        valor: row.valor,
        conta_debito: row.conta_debito,
        conta_credito: row.conta_credito,
        historico: row.historico,
      }));
      const folhaRows: ConsolidatedRow[] = (folhaResult.data || []).map(row => ({
        id: row.id,
        origem: 'Folha de pagamento',
        data: row.data,
        valor: row.valor,
        conta_debito: row.conta_debito,
        conta_credito: row.conta_credito,
        historico: row.historico,
      }));

      setPlano(planResult.map);
      setRows(
        [...genericRows, ...comprasRows, ...folhaRows].sort((a, b) =>
          `${a.data || ''}-${a.origem}-${a.id}`.localeCompare(`${b.data || ''}-${b.origem}-${b.id}`)
        )
      );
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Falha ao consolidar lançamentos');
    } finally {
      setIsLoading(false);
    }
  }, [clientId, competencia]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const issues = useMemo(
    () =>
      rows.flatMap(row => {
        const current: string[] = [];
        if (!row.data) current.push('sem data');
        if (!row.conta_debito) current.push('sem débito');
        if (!row.conta_credito) current.push('sem crédito');
        if (!row.historico?.trim()) current.push('sem histórico');
        if (!row.valor || Number(row.valor) <= 0) current.push('valor inválido');
        if (row.conta_debito && !lookupPlanoContasDescricao(plano, row.conta_debito))
          current.push('débito fora do plano');
        if (row.conta_credito && !lookupPlanoContasDescricao(plano, row.conta_credito))
          current.push('crédito fora do plano');
        return current.length ? [{ id: row.id, labels: current }] : [];
      }),
    [plano, rows]
  );
  const issuesById = useMemo(
    () => new Map(issues.map(issue => [issue.id, issue.labels])),
    [issues]
  );
  const total = rows.reduce((sum, row) => sum + Number(row.valor || 0), 0);
  const totalsByOrigin = Object.fromEntries(
    ORIGENS.map(origin => [
      origin,
      rows
        .filter(row => row.origem === origin)
        .reduce((sum, row) => sum + Number(row.valor || 0), 0),
    ])
  ) as Record<Origem, number>;

  const exportRows = () => {
    exportCalimaXlsx(
      rows,
      plano,
      `lancamentos_${filenameSafe(clientName)}_${competencia}`
    );
  };

  return (
    <div className="space-y-5">
      <section className="grid border border-border bg-card sm:grid-cols-3">
        <div className="p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Lançamentos consolidados
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">{rows.length}</p>
        </div>
        <div className="border-t border-border p-5 sm:border-l sm:border-t-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Movimento da competência
          </p>
          <p className="mt-2 text-2xl font-semibold tabular-nums text-foreground">
            {formatCurrency(total)}
          </p>
        </div>
        <div className="border-t border-border p-5 sm:border-l sm:border-t-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Validação
          </p>
          <div className="mt-2 flex items-center gap-2">
            {issues.length === 0 ? (
              <CheckCircle2 className="h-5 w-5 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            )}
            <p className="text-sm font-semibold text-foreground">
              {issues.length === 0 ? 'Partidas consistentes' : `${issues.length} item(ns) para revisar`}
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 border border-border bg-card lg:grid-cols-4">
        {ORIGENS.map((origin, index) => (
          <div
            key={origin}
            className={`p-4 ${index > 0 ? 'border-l border-border' : ''} ${index > 1 ? 'border-t border-border lg:border-t-0' : ''}`}
          >
            <p className="text-xs text-muted-foreground">{origin}</p>
            <p className="mt-1 text-sm font-semibold tabular-nums text-foreground">
              {formatCurrency(totalsByOrigin[origin])}
            </p>
          </div>
        ))}
      </section>

      <section className="border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Conferência antes da importação</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Todos os módulos reunidos na estrutura final esperada pelo Calima.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="outline" onClick={fetchData} disabled={isLoading}>
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={exportRows}
              disabled={isLoading || rows.length === 0 || issues.length > 0}
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Exportar XLSX
            </Button>
          </div>
        </div>

        {error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : isLoading ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Consolidando lançamentos
          </div>
        ) : rows.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-medium text-foreground">Nenhum lançamento nesta competência</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Conclua os módulos ou classifique-os como sem movimento.
            </p>
          </div>
        ) : (
          <div className="max-h-[620px] overflow-auto">
            <table className="w-full min-w-[1120px] text-left text-xs">
              <thead className="sticky top-0 z-10 bg-muted/95 text-[10px] uppercase tracking-[0.08em] text-muted-foreground backdrop-blur">
                <tr>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Histórico</th>
                  <th className="px-4 py-3 font-medium">Débito</th>
                  <th className="px-4 py-3 font-medium">Descrição débito</th>
                  <th className="px-4 py-3 font-medium">Crédito</th>
                  <th className="px-4 py-3 font-medium">Descrição crédito</th>
                  <th className="px-4 py-3 text-right font-medium">Valor</th>
                  <th className="px-4 py-3 font-medium">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map(row => {
                  const rowIssues = issuesById.get(row.id) || [];
                  return (
                    <tr key={`${row.origem}-${row.id}`} className="align-top hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{row.origem}</td>
                      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted-foreground">{formatDate(row.data)}</td>
                      <td className="max-w-[310px] px-4 py-3 text-foreground">{row.historico || '—'}</td>
                      <td className="px-4 py-3 font-medium tabular-nums">{row.conta_debito || '—'}</td>
                      <td className="max-w-[220px] px-4 py-3 text-muted-foreground">
                        {lookupPlanoContasDescricao(plano, row.conta_debito) || '—'}
                      </td>
                      <td className="px-4 py-3 font-medium tabular-nums">{row.conta_credito || '—'}</td>
                      <td className="max-w-[220px] px-4 py-3 text-muted-foreground">
                        {lookupPlanoContasDescricao(plano, row.conta_credito) || '—'}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-semibold tabular-nums">
                        {formatCurrency(Number(row.valor || 0))}
                      </td>
                      <td className="px-4 py-3">
                        {rowIssues.length === 0 ? (
                          <span className="text-emerald-700 dark:text-emerald-400">Pronto</span>
                        ) : (
                          <span className="text-amber-700 dark:text-amber-400">{rowIssues.join(', ')}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
