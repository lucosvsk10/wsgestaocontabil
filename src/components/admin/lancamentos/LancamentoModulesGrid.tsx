import { motion } from 'framer-motion';
import {
  ArrowUpRight,
  BadgeDollarSign,
  Calculator,
  Landmark,
  Receipt,
  ShoppingCart,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface LancamentoModulesGridProps {
  disabled: boolean;
  competenciaLabel?: string;
  onOpenDespesas: () => void;
  onOpenFolha: () => void;
  onOpenCompras: () => void;
}

export const LancamentoModulesGrid = ({
  disabled,
  competenciaLabel,
  onOpenDespesas,
  onOpenFolha,
  onOpenCompras,
}: LancamentoModulesGridProps) => {
  const modules = [
    {
      key: 'folha',
      eyebrow: 'Departamento pessoal',
      title: 'Folha de pagamento',
      description: 'Folha, férias, 13º, encargos e obrigações do período.',
      icon: Wallet,
      active: true,
      onClick: onOpenFolha,
      tone: 'bg-violet-500/10 text-violet-600 dark:text-violet-300',
    },
    {
      key: 'compras',
      eyebrow: 'Entradas',
      title: 'Compras',
      description: 'Registro de entradas, CFOP e mercadorias para revenda.',
      icon: ShoppingCart,
      active: true,
      onClick: onOpenCompras,
      tone: 'bg-blue-500/10 text-blue-600 dark:text-blue-300',
    },
    {
      key: 'despesas',
      eyebrow: 'Movimentação',
      title: 'Despesas e pagamentos',
      description: 'Documentos livres, fornecedores e pagamentos mensais.',
      icon: Receipt,
      active: true,
      onClick: onOpenDespesas,
      tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-300',
    },
    {
      key: 'faturamento',
      eyebrow: 'Receitas',
      title: 'Faturamento',
      description: 'Serviços, revenda, clientes e receitas por competência.',
      icon: BadgeDollarSign,
      active: false,
      onClick: () => undefined,
      tone: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300',
    },
    {
      key: 'tributos',
      eyebrow: 'Apuração',
      title: 'Tributos',
      description: 'PGDAS, Simples Nacional e demais obrigações tributárias.',
      icon: Calculator,
      active: false,
      onClick: () => undefined,
      tone: 'bg-rose-500/10 text-rose-600 dark:text-rose-300',
    },
    {
      key: 'conciliacao',
      eyebrow: 'Conferência final',
      title: 'Conciliação e balancete',
      description: 'Bancos, caixa, saldos, pendências e fechamento do mês.',
      icon: Landmark,
      active: false,
      onClick: () => undefined,
      tone: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-300',
    },
  ];

  return (
    <section>
      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-[#a47b13] dark:text-[#efc349]">
            Etapas do fechamento
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900 dark:text-white">
            Módulos da competência
          </h2>
        </div>
        {competenciaLabel && (
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Trabalhando em {competenciaLabel}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module, index) => {
          const Icon = module.icon;
          const isDisabled = disabled || !module.active;
          return (
            <motion.button
              key={module.key}
              type="button"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              disabled={isDisabled}
              onClick={module.onClick}
              className={cn(
                'group relative min-h-[168px] overflow-hidden rounded-2xl border bg-white p-5 text-left shadow-sm transition-all duration-200 dark:bg-white/[0.035]',
                isDisabled
                  ? 'cursor-not-allowed border-slate-200/80 opacity-70 dark:border-white/[0.08]'
                  : 'border-slate-200/80 hover:-translate-y-0.5 hover:border-[#d7aa2f]/60 hover:shadow-lg dark:border-white/10 dark:hover:border-[#efc349]/50'
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <div
                  className={cn(
                    'flex h-11 w-11 items-center justify-center rounded-xl',
                    module.tone
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {module.active ? (
                  <ArrowUpRight className="h-4 w-4 text-slate-300 transition-all group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-[#b18416] dark:text-slate-600 dark:group-hover:text-[#efc349]" />
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[9px] font-semibold uppercase tracking-wide text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">
                    <Sparkles className="h-3 w-3" /> Próxima etapa
                  </span>
                )}
              </div>
              <p className="mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                {module.eyebrow}
              </p>
              <h3 className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                {module.title}
              </h3>
              <p className="mt-1.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                {module.description}
              </p>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
};
