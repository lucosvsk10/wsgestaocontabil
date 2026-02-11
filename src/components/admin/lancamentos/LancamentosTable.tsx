import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FileSpreadsheet, Trash2, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

interface Lancamento {
  id: string;
  data: string | null;
  historico: string | null;
  debito: string | null;
  credito: string | null;
  valor: number | null;
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

export const LancamentosTable = ({
  lancamentos,
  planoContas = {},
  viewMode,
  isLoading,
  isSelectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectAll,
}: LancamentosTableProps) => {
  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    // Parse YYYY-MM-DD manually to avoid UTC timezone shift
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      return `${match[3]}/${match[2]}/${match[1]}`;
    }
    try {
      return format(new Date(dateStr), 'dd/MM/yyyy', { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getDescricao = (codigo: string | null) => {
    if (!codigo) return '-';
    return planoContas[codigo] || '-';
  };

  const groupedByAccount = useMemo(() => {
    if (viewMode !== 'conta') return null;
    const groups: Record<string, { conta: string; descricao: string; items: Lancamento[] }> = {};
    for (const l of lancamentos) {
      const key = l.debito || 'sem-conta';
      if (!groups[key]) {
        groups[key] = {
          conta: l.debito || 'Sem conta',
          descricao: getDescricao(l.debito),
          items: [],
        };
      }
      groups[key].items.push(l);
    }
    // Sort groups by account code
    return Object.values(groups).sort((a, b) => a.conta.localeCompare(b.conta, undefined, { numeric: true }));
  }, [lancamentos, viewMode, planoContas]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-pulse text-muted-foreground text-sm">Carregando...</div>
      </div>
    );
  }

  if (lancamentos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-3">
          <FileSpreadsheet className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-muted-foreground text-sm">Nenhum lançamento alinhado</p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          Os lançamentos aparecerão aqui após o alinhamento
        </p>
      </div>
    );
  }

  const allSelected = lancamentos.length > 0 && selectedIds.size === lancamentos.length;

  const renderTableHead = () => (
    <thead>
      <tr className="text-left bg-muted/50">
        {isSelectionMode && (
          <th className="py-3 px-3 rounded-tl-xl w-10">
            <Checkbox
              checked={allSelected}
              onCheckedChange={() => onSelectAll?.()}
              className="border-muted-foreground/40"
            />
          </th>
        )}
        <th className={`py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide ${!isSelectionMode ? 'rounded-tl-xl' : ''}`}>Data</th>
        <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Histórico</th>
        <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Débito</th>
        <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Desc. Débito</th>
        <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Crédito</th>
        <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Desc. Crédito</th>
        <th className="py-3 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide text-right rounded-tr-xl">Valor</th>
      </tr>
    </thead>
  );

  const renderRow = (lancamento: Lancamento, index: number) => (
    <motion.tr
      key={lancamento.id}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: index * 0.01 }}
      className={`hover:bg-muted/40 transition-colors ${selectedIds.has(lancamento.id) ? 'bg-primary/5' : ''}`}
    >
      {isSelectionMode && (
        <td className="py-3 px-3">
          <Checkbox
            checked={selectedIds.has(lancamento.id)}
            onCheckedChange={() => onToggleSelect?.(lancamento.id)}
            className="border-muted-foreground/40"
          />
        </td>
      )}
      <td className="py-3 px-4 text-foreground whitespace-nowrap text-sm">
        {formatDate(lancamento.data)}
      </td>
      <td className="py-3 px-4 text-foreground max-w-[200px] truncate text-sm">
        {lancamento.historico || '-'}
      </td>
      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
        {lancamento.debito || '-'}
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground max-w-[150px] truncate">
        {getDescricao(lancamento.debito)}
      </td>
      <td className="py-3 px-4 font-mono text-xs text-muted-foreground">
        {lancamento.credito || '-'}
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground max-w-[150px] truncate">
        {getDescricao(lancamento.credito)}
      </td>
      <td className="py-3 px-4 text-right font-medium text-foreground whitespace-nowrap text-sm">
        {formatCurrency(lancamento.valor)}
      </td>
    </motion.tr>
  );

  const colSpan = isSelectionMode ? 8 : 7;

  // View by date
  if (viewMode === 'data') {
    return (
      <div className="overflow-x-auto rounded-xl bg-muted/30">
        <table className="w-full text-sm">
          {renderTableHead()}
          <tbody className="divide-y divide-border/20">
            {lancamentos.map((l, i) => renderRow(l, i))}
          </tbody>
          <tfoot>
            <tr className="bg-muted/50">
              <td colSpan={colSpan - 1} className="py-3 px-4 font-medium text-foreground text-sm rounded-bl-xl">
                Total ({lancamentos.length} lançamentos)
              </td>
              <td className="py-3 px-4 text-right font-bold text-foreground rounded-br-xl">
                {formatCurrency(lancamentos.reduce((sum, l) => sum + (l.valor || 0), 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    );
  }

  // View by account
  return (
    <div className="space-y-6">
      {groupedByAccount?.map((group) => {
        const groupTotal = group.items.reduce((sum, l) => sum + (l.valor || 0), 0);
        return (
          <motion.div
            key={group.conta}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl overflow-hidden border border-border/30"
          >
            {/* Group Header */}
            <div className="flex items-center gap-3 px-5 py-3 bg-primary/10 border-l-4 border-l-primary">
              {isSelectionMode && (
                <Checkbox
                  checked={group.items.every(i => selectedIds.has(i.id))}
                  onCheckedChange={() => {
                    const groupIds = group.items.map(i => i.id);
                    const allSelected = groupIds.every(id => selectedIds.has(id));
                    if (allSelected) {
                      // Deselect all in group
                      groupIds.forEach(id => {
                        if (selectedIds.has(id)) onToggleSelect?.(id);
                      });
                    } else {
                      // Select all in group
                      groupIds.forEach(id => {
                        if (!selectedIds.has(id)) onToggleSelect?.(id);
                      });
                    }
                  }}
                  className="border-muted-foreground/40"
                />
              )}
              <div className="font-bold text-foreground text-sm">
                Conta: {group.conta}
              </div>
              <div className="text-muted-foreground text-sm">|</div>
              <div className="text-muted-foreground text-sm font-medium">
                {group.descricao !== '-' ? group.descricao : 'Sem descrição'}
              </div>
            </div>

            <div className="overflow-x-auto bg-muted/20">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left bg-muted/40">
                    {isSelectionMode && (
                      <th className="py-2 px-3 w-10"></th>
                    )}
                    <th className="py-2 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Data</th>
                    <th className="py-2 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Histórico</th>
                    <th className="py-2 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Débito</th>
                    <th className="py-2 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Desc. Débito</th>
                    <th className="py-2 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Crédito</th>
                    <th className="py-2 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide">Desc. Crédito</th>
                    <th className="py-2 px-4 font-medium text-muted-foreground text-xs uppercase tracking-wide text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {group.items.map((l, i) => renderRow(l, i))}
                </tbody>
                <tfoot>
                  <tr className="bg-primary/5">
                    <td colSpan={colSpan - 1} className="py-2.5 px-4 font-medium text-foreground text-xs">
                      Subtotal: {group.items.length} lançamento(s)
                    </td>
                    <td className="py-2.5 px-4 text-right font-bold text-foreground text-sm">
                      {formatCurrency(groupTotal)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </motion.div>
        );
      })}

      {/* Grand Total */}
      <div className="rounded-xl bg-muted/50 p-4 flex items-center justify-between">
        <span className="font-medium text-foreground text-sm">
          Total Geral ({lancamentos.length} lançamentos)
        </span>
        <span className="font-bold text-foreground text-base">
          {formatCurrency(lancamentos.reduce((sum, l) => sum + (l.valor || 0), 0))}
        </span>
      </div>
    </div>
  );
};
