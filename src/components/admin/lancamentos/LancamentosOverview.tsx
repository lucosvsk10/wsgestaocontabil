import {
  AlertTriangle,
  ArrowRight,
  BookOpenCheck,
  Check,
  FileStack,
  ListChecks,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { LancamentoModulesGrid } from './LancamentoModulesGrid';
import type {
  LancamentoModuleKey,
  LancamentosWorkspaceData,
} from '@/types/lancamentos-workspace';
import { isResolvedModule, LANCAMENTO_MODULE_KEYS } from '@/types/lancamentos-workspace';

interface LancamentosOverviewProps {
  data: LancamentosWorkspaceData;
  disabled: boolean;
  isLoading: boolean;
  onOpenModule: (module: LancamentoModuleKey) => void;
  onOpenChartOfAccounts: () => void;
  onOpenBalancete: () => void;
  onRefresh: () => void;
  onMarkNoMovement: (module: LancamentoModuleKey) => Promise<void>;
  onClearNoMovement: (module: LancamentoModuleKey) => Promise<void>;
}

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
  }).format(value);

export const LancamentosOverview = ({
  data,
  disabled,
  isLoading,
  onOpenModule,
  onOpenChartOfAccounts,
  onOpenBalancete,
  onRefresh,
  onMarkNoMovement,
  onClearNoMovement,
}: LancamentosOverviewProps) => {
  const resolved = LANCAMENTO_MODULE_KEYS.filter(key =>
    isResolvedModule(data.modules[key].status)
  ).length;
  const firstErrorModule = LANCAMENTO_MODULE_KEYS.find(key => data.modules[key].errors > 0);
  const firstUnresolvedModule = LANCAMENTO_MODULE_KEYS.find(
    key => !isResolvedModule(data.modules[key].status)
  );
  const nextAction = !data.hasChartOfAccounts
    ? {
        title: 'Cadastre o plano de contas',
        description:
          'A classificação automática só começa quando os C.R.s da empresa estiverem disponíveis.',
        action: 'Configurar plano',
        onClick: onOpenChartOfAccounts,
      }
    : data.totals.errors > 0
      ? {
          title: 'Corrija os itens com erro',
          description: `${data.totals.errors} item(ns) interrompem a conclusão da competência.`,
          action: 'Revisar módulos',
          onClick: () => onOpenModule(firstErrorModule || 'despesas'),
        }
      : data.totals.pending > 0
        ? {
            title: 'Acompanhe o processamento',
            description: `${data.totals.pending} item(ns) ainda não chegaram à conferência.`,
            action: 'Atualizar agora',
            onClick: onRefresh,
          }
        : resolved === 4
          ? {
              title: 'Competência pronta para o balancete',
              description: 'Todos os módulos foram lançados ou classificados sem movimento.',
              action: 'Conferir consolidação',
              onClick: onOpenBalancete,
            }
          : {
              title: 'Inicie pelos documentos disponíveis',
              description:
                'Abra um módulo, envie os arquivos e confira a classificação proposta pelo sistema.',
              action: 'Abrir próximo módulo',
              onClick: () => onOpenModule(firstUnresolvedModule || 'despesas'),
            };

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 border border-border bg-card sm:grid-cols-4">
        {[
          { label: 'Documentos', value: String(data.totals.documents) },
          { label: 'Lançamentos', value: String(data.totals.entries) },
          { label: 'Pendências', value: String(data.totals.pending + data.totals.errors) },
          { label: 'Valor processado', value: formatCurrency(data.totals.value) },
        ].map((item, index) => (
          <div
            key={item.label}
            className={`p-4 sm:p-5 ${index > 0 ? 'border-l border-border' : ''} ${index > 1 ? 'border-t sm:border-t-0' : ''}`}
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {item.label}
            </p>
            <p className="mt-1.5 truncate text-xl font-semibold tabular-nums text-foreground">
              {isLoading ? '—' : item.value}
            </p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1fr)_340px]">
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Rotinas da competência
              </p>
              <h2 className="mt-1 text-lg font-semibold text-foreground">
                Classificação por módulo
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 gap-1.5 text-xs text-muted-foreground"
              onClick={onRefresh}
              disabled={isLoading || disabled}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
          <LancamentoModulesGrid
            disabled={disabled}
            modules={data.modules}
            onOpen={onOpenModule}
            onMarkNoMovement={onMarkNoMovement}
            onClearNoMovement={onClearNoMovement}
          />
        </section>

        <aside className="space-y-4">
          <section className="border border-border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Progresso mensal
                </p>
                <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">
                  {data.progress}%
                </p>
              </div>
              <ListChecks className="h-5 w-5 text-muted-foreground" strokeWidth={1.7} />
            </div>
            <Progress value={data.progress} className="mt-4 h-1.5" />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">
              {resolved} de 4 módulos concluídos ou classificados sem movimento.
            </p>
          </section>

          <section className="border border-border bg-card p-5">
            <div className="flex items-start gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center border border-border">
                <ArrowRight className="h-4 w-4" />
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  Próximo passo
                </p>
                <h3 className="mt-1.5 text-sm font-semibold text-foreground">{nextAction.title}</h3>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                  {nextAction.description}
                </p>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              className="mt-4 h-9 w-full justify-between"
              onClick={nextAction.onClick}
              disabled={disabled}
            >
              {nextAction.action}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </section>

          <section className="border border-border bg-card p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Base inteligente</h3>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-start gap-2.5">
                {data.hasChartOfAccounts ? (
                  <Check className="mt-0.5 h-3.5 w-3.5 text-emerald-600" />
                ) : (
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 text-amber-600" />
                )}
                <div>
                  <p className="text-xs font-medium text-foreground">Plano de contas</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {data.hasChartOfAccounts
                      ? `${data.chartOfAccountsCount} contas disponíveis para classificação`
                      : 'Obrigatório antes do processamento'}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <BookOpenCheck className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Mapeamentos confirmados</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {data.confirmedMappings} regra(s) específicas desta empresa
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-2.5">
                <FileStack className="mt-0.5 h-3.5 w-3.5 text-muted-foreground" />
                <div>
                  <p className="text-xs font-medium text-foreground">Aprendizado por confirmação</p>
                  <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                    As correções serão associadas à lógica contábil e à empresa, sem sobrepor prompts.
                  </p>
                </div>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-4 h-8 w-full text-xs"
              onClick={onOpenChartOfAccounts}
              disabled={disabled}
            >
              Gerenciar plano de contas
            </Button>
          </section>
        </aside>
      </div>
    </div>
  );
};
