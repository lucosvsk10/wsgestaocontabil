import {
  ArrowRight,
  Check,
  CircleAlert,
  Clock3,
  FileText,
  ReceiptText,
  ShoppingCart,
  WalletCards,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type {
  LancamentoModuleKey,
  LancamentoModuleStatus,
  LancamentoModuleSummary,
} from '@/types/lancamentos-workspace';

interface LancamentoModulesGridProps {
  disabled: boolean;
  modules: Record<LancamentoModuleKey, LancamentoModuleSummary>;
  onOpen: (module: LancamentoModuleKey) => void;
  onMarkNoMovement: (module: LancamentoModuleKey) => Promise<void>;
  onClearNoMovement: (module: LancamentoModuleKey) => Promise<void>;
}

const MODULES = [
  {
    key: 'despesas' as const,
    title: 'Despesas',
    description: 'Documentos, classificação contábil, conferência e fechamento.',
    icon: ReceiptText,
  },
  {
    key: 'compras' as const,
    title: 'Compras',
    description: 'Registro de entradas, CFOPs e contas de mercadorias ou materiais.',
    icon: ShoppingCart,
  },
  {
    key: 'faturamento' as const,
    title: 'Faturamento',
    description: 'Serviços, revenda de mercadorias e apuração do Simples Nacional.',
    icon: FileText,
  },
  {
    key: 'folha' as const,
    title: 'Folha de pagamento',
    description: 'Proventos, descontos, encargos e obrigações da competência.',
    icon: WalletCards,
  },
];

const STATUS_LABELS: Record<LancamentoModuleStatus, string> = {
  bloqueado: 'Configuração pendente',
  nao_iniciado: 'Não iniciado',
  recebido: 'Documento recebido',
  processando: 'Processando',
  revisar: 'Revisão necessária',
  lancado: 'Lançado',
  sem_movimento: 'Sem movimento',
  erro: 'Atenção necessária',
};

const statusStyle = (status: LancamentoModuleStatus) => {
  if (status === 'lancado' || status === 'sem_movimento') {
    return 'border-emerald-500/25 bg-emerald-500/[0.07] text-emerald-700 dark:text-emerald-300';
  }
  if (status === 'erro') {
    return 'border-red-500/25 bg-red-500/[0.07] text-red-700 dark:text-red-300';
  }
  if (status === 'processando' || status === 'revisar' || status === 'recebido') {
    return 'border-foreground/15 bg-foreground/[0.04] text-foreground';
  }
  return 'border-border bg-muted/40 text-muted-foreground';
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);

export const LancamentoModulesGrid = ({
  disabled,
  modules,
  onOpen,
  onMarkNoMovement,
  onClearNoMovement,
}: LancamentoModulesGridProps) => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
    {MODULES.map(module => {
      const summary = modules[module.key];
      const Icon = module.icon;
      const resolved = summary.status === 'lancado' || summary.status === 'sem_movimento';
      const canMarkNoMovement =
        !disabled && summary.documents === 0 && summary.entries === 0 && !resolved;

      return (
        <article
          key={module.key}
          className={cn(
            'group flex min-h-[245px] flex-col border border-border bg-card p-5 transition-colors',
            disabled ? 'opacity-55' : 'hover:border-foreground/30'
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center border border-border text-foreground">
                <Icon className="h-4.5 w-4.5" strokeWidth={1.7} />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-foreground">{module.title}</h3>
                <p className="mt-1 max-w-md text-sm leading-5 text-muted-foreground">
                  {module.description}
                </p>
              </div>
            </div>

            <span
              className={cn(
                'inline-flex shrink-0 items-center gap-1.5 border px-2.5 py-1 text-[11px] font-medium',
                statusStyle(summary.status)
              )}
            >
              {resolved ? (
                <Check className="h-3 w-3" />
              ) : summary.status === 'erro' ? (
                <CircleAlert className="h-3 w-3" />
              ) : (
                <Clock3 className="h-3 w-3" />
              )}
              {STATUS_LABELS[summary.status]}
            </span>
          </div>

          <div className="mt-6 grid grid-cols-3 divide-x divide-border border-y border-border py-3">
            <div className="px-3 first:pl-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Documentos
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {summary.documents}
              </p>
            </div>
            <div className="px-3">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Lançamentos
              </p>
              <p className="mt-1 text-lg font-semibold tabular-nums text-foreground">
                {summary.entries}
              </p>
            </div>
            <div className="px-3 pr-0">
              <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
                Valor
              </p>
              <p className="mt-1 truncate text-sm font-semibold tabular-nums text-foreground">
                {formatCurrency(summary.total)}
              </p>
            </div>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-5">
            <div className="min-w-0 text-xs text-muted-foreground">
              {summary.errors > 0
                ? `${summary.errors} item(ns) com erro`
                : summary.pending > 0
                  ? `${summary.pending} item(ns) pendente(s)`
                  : summary.status === 'sem_movimento'
                    ? 'Competência classificada sem movimentação'
                    : disabled
                      ? 'Selecione uma empresa para continuar'
                      : 'Nenhuma pendência identificada'}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {canMarkNoMovement && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => void onMarkNoMovement(module.key)}
                >
                  Sem movimento
                </Button>
              )}
              {summary.status === 'sem_movimento' && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-8 px-2 text-xs text-muted-foreground"
                  onClick={() => void onClearNoMovement(module.key)}
                >
                  Desfazer
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={disabled}
                className="h-8 gap-1.5 px-3 text-xs"
                onClick={() => onOpen(module.key)}
              >
                Abrir módulo
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </article>
      );
    })}
  </div>
);
