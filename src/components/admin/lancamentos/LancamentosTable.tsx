import { useCallback, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Checkbox } from '@/components/ui/checkbox';
import { lookupPlanoContasDescricao } from '@/lib/planoContas';

interface Lancamento {
  id: string;
  data: string | null;
  historico: string | null;
  debito: string | null;
  credito: string | null;
  valor: number | null;
  centro_custo_debito: string | null;
  centro_custo_credito: string | null;
  created_at: string;
}

export type PlanoContasMap = Record<string, string>;

interface LancamentosTableProps {
  lancamentos: Lancamento[];
  planoContas?: PlanoContasMap;
  viewMode: 'data' | 'conta';
  isLoading?: boolean;
  isSelectionMode?: boolean;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onSelectAll?: () => void;
}

export const LancamentosTable = ({ lancamentos, planoContas = {}, viewMode, isLoading, isSelectionMode = false, selectedIds = new Set(), onToggleSelect, onSelectAll }: LancamentosTableProps) => {
  const formatCurrency = (value: number | null) => value === null ? '-' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    try { return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR }); } catch { return dateStr; }
  };
  const getDescription = useCallback((code: string | null) => code ? lookupPlanoContasDescricao(planoContas, code) || '-' : '-', [planoContas]);
  const total = lancamentos.reduce((sum, item) => sum + (item.valor || 0), 0);
  const allSelected = lancamentos.length > 0 && selectedIds.size === lancamentos.length;
  const groupedByAccount = useMemo(() => {
    if (viewMode !== 'conta') return [];
    const groups: Record<string, { account: string; description: string; items: Lancamento[] }> = {};
    lancamentos.forEach(item => {
      const key = item.debito || 'sem-conta';
      if (!groups[key]) groups[key] = { account: item.debito || 'Sem conta', description: getDescription(item.debito), items: [] };
      groups[key].items.push(item);
    });
    return Object.values(groups).sort((a, b) => a.account.localeCompare(b.account, undefined, { numeric: true }));
  }, [getDescription, lancamentos, viewMode]);

  if (isLoading) return <div className="admin-empty min-h-48"><span className="text-xs">Carregando lançamentos...</span></div>;
  if (!lancamentos.length) return <div className="admin-empty"><strong className="text-sm text-[var(--admin-ink)]">Nenhum lançamento alinhado</strong><span className="mt-1 text-xs">As partidas contábeis aparecerão aqui após o processamento.</span></div>;

  const header = (
    <thead><tr>
      {isSelectionMode && <th className="w-10"><Checkbox checked={allSelected} onCheckedChange={() => onSelectAll?.()} /></th>}
      <th>Data</th><th>Histórico variável</th><th>Débito</th><th>Descrição débito</th><th>Crédito</th><th>Descrição crédito</th><th>CC débito</th><th>CC crédito</th><th className="text-right">Valor</th>
    </tr></thead>
  );

  const row = (item: Lancamento) => (
    <tr key={item.id} className={selectedIds.has(item.id) ? 'bg-[var(--admin-blue-soft)]' : ''}>
      {isSelectionMode && <td className="w-10"><Checkbox checked={selectedIds.has(item.id)} onCheckedChange={() => onToggleSelect?.(item.id)} /></td>}
      <td className="whitespace-nowrap tabular-nums">{formatDate(item.data)}</td>
      <td className="max-w-[300px] font-medium"><span className="block truncate" title={item.historico || ''}>{item.historico || '-'}</span></td>
      <td className="font-mono text-[11px]">{item.debito || '-'}</td>
      <td className="max-w-[180px] text-[var(--admin-muted)]"><span className="block truncate" title={getDescription(item.debito)}>{getDescription(item.debito)}</span></td>
      <td className="font-mono text-[11px]">{item.credito || '-'}</td>
      <td className="max-w-[180px] text-[var(--admin-muted)]"><span className="block truncate" title={getDescription(item.credito)}>{getDescription(item.credito)}</span></td>
      <td className="whitespace-nowrap text-[var(--admin-muted)]">{item.centro_custo_debito || '-'}</td>
      <td className="whitespace-nowrap text-[var(--admin-muted)]">{item.centro_custo_credito || '-'}</td>
      <td className="whitespace-nowrap text-right font-semibold tabular-nums">{formatCurrency(item.valor)}</td>
    </tr>
  );

  if (viewMode === 'data') {
    return <div className="admin-table-wrap border border-[var(--admin-line)]"><table className="admin-data-table">{header}<tbody>{lancamentos.map(row)}</tbody><tfoot><tr className="bg-[var(--admin-canvas)]"><td colSpan={isSelectionMode ? 9 : 8} className="font-semibold">Total da competência · {lancamentos.length} lançamentos</td><td className="text-right text-sm font-bold tabular-nums">{formatCurrency(total)}</td></tr></tfoot></table></div>;
  }

  return <div className="space-y-4">{groupedByAccount.map(group => {
    const subtotal = group.items.reduce((sum, item) => sum + (item.valor || 0), 0);
    return <section key={group.account} className="overflow-hidden border border-[var(--admin-line)]"><div className="flex items-center justify-between gap-4 border-b border-[var(--admin-line)] bg-[var(--admin-blue-soft)] px-4 py-2.5"><div><span className="font-mono text-xs font-bold text-blue-600 dark:text-blue-400">D {group.account}</span><span className="ml-3 text-xs font-semibold text-[var(--admin-ink)]">{group.description === '-' ? 'Sem descrição no plano de contas' : group.description}</span></div><span className="text-xs font-bold tabular-nums text-[var(--admin-ink)]">{formatCurrency(subtotal)}</span></div><div className="admin-table-wrap"><table className="admin-data-table">{header}<tbody>{group.items.map(row)}</tbody></table></div></section>;
  })}<div className="admin-surface flex items-center justify-between px-4 py-3"><span className="text-xs font-semibold text-[var(--admin-ink)]">Total geral · {lancamentos.length} lançamentos</span><span className="text-sm font-bold tabular-nums text-[var(--admin-ink)]">{formatCurrency(total)}</span></div></div>;
};
