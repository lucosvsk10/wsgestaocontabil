import { useEffect, useState } from 'react';
import { ArrowLeft, BookOpen, CircleAlert, RotateCcw } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ClientLancamentosDetail } from '@/components/admin/lancamentos/ClientLancamentosDetail';
import { CompanySelectorTop } from '@/components/admin/lancamentos/CompanySelectorTop';
import { FolhaPagamentoDetail } from '@/components/admin/lancamentos/folha/FolhaPagamentoDetail';
import { ComprasDetail } from '@/components/admin/lancamentos/compras/ComprasDetail';
import { FaturamentoDetail } from '@/components/admin/lancamentos/faturamento/FaturamentoDetail';
import { BalanceteDetail } from '@/components/admin/lancamentos/balancete/BalanceteDetail';
import { LancamentosCompetenciaPicker } from '@/components/admin/lancamentos/LancamentosCompetenciaPicker';
import { LancamentosOverview } from '@/components/admin/lancamentos/LancamentosOverview';
import { LancamentosWorkflow } from '@/components/admin/lancamentos/LancamentosWorkflow';
import { PlanoContasModal } from '@/components/admin/lancamentos/PlanoContasModal';
import { Button } from '@/components/ui/button';
import { useLancamentosWorkspace } from '@/hooks/lancamentos/useLancamentosWorkspace';
import type { LancamentoModuleKey } from '@/types/lancamentos-workspace';
import { toast } from 'sonner';

const CLIENT_STORAGE_KEY = 'admin.lancamentos.selectedClientId';
const COMPETENCIA_STORAGE_KEY = 'admin.lancamentos.competencia';

type View = 'overview' | 'balancete' | LancamentoModuleKey;

const currentCompetencia = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
};

const VIEW_LABELS: Record<LancamentoModuleKey, string> = {
  despesas: 'Despesas',
  compras: 'Compras',
  faturamento: 'Faturamento',
  folha: 'Folha de pagamento',
};

const viewLabel = (view: Exclude<View, 'overview'>) =>
  view === 'balancete' ? 'Conferência e exportação' : VIEW_LABELS[view];

const AdminLancamentos = () => {
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [competencia, setCompetencia] = useState(currentCompetencia);
  const [view, setView] = useState<View>('overview');
  const [isPlanoContasOpen, setIsPlanoContasOpen] = useState(false);

  const { data, isLoading, error, refresh, markNoMovement, clearNoMovement } =
    useLancamentosWorkspace(selectedClientId, competencia);

  useEffect(() => {
    const storedClient = localStorage.getItem(CLIENT_STORAGE_KEY);
    const storedCompetencia = localStorage.getItem(COMPETENCIA_STORAGE_KEY);
    if (storedClient) setSelectedClientId(storedClient);
    if (storedCompetencia?.match(/^\d{4}-\d{2}$/)) setCompetencia(storedCompetencia);
  }, []);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setView('overview');
    localStorage.setItem(CLIENT_STORAGE_KEY, clientId);
  };

  const handleCompetenciaChange = (nextCompetencia: string) => {
    setCompetencia(nextCompetencia);
    setView('overview');
    localStorage.setItem(COMPETENCIA_STORAGE_KEY, nextCompetencia);
  };

  const handleBack = () => {
    setView('overview');
    void refresh();
  };

  const handleNoMovement = async (module: LancamentoModuleKey) => {
    try {
      await markNoMovement(module);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Não foi possível salvar';
      toast.error(message);
    }
  };

  const handleClearNoMovement = async (module: LancamentoModuleKey) => {
    try {
      await clearNoMovement(module);
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : 'Não foi possível desfazer';
      toast.error(message);
    }
  };

  const companyName = data.company?.name || null;

  return (
    <AdminLayout>
      <div className="mx-auto w-full max-w-[1560px] px-4 pb-12 pt-6 sm:px-6 lg:px-8 lg:pt-8">
        <header className="mb-5 flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Operação contábil
            </p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Central de Lançamentos
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Organize documentos, acompanhe o processamento, revise a classificação contábil e
              prepare o balancete em um único fluxo.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <CompanySelectorTop
              selectedClientId={selectedClientId}
              selectedClientName={companyName}
              onSelectClient={handleSelectClient}
            />
            <LancamentosCompetenciaPicker value={competencia} onChange={handleCompetenciaChange} />
          </div>
        </header>

        <LancamentosWorkflow currentStep={selectedClientId ? data.currentStep : 0} />

        {error && (
          <div className="mt-4 flex items-center gap-3 border border-red-500/20 bg-red-500/[0.05] px-4 py-3 text-sm text-red-700 dark:text-red-300">
            <CircleAlert className="h-4 w-4 shrink-0" />
            <span className="flex-1">Não foi possível atualizar todos os dados: {error}</span>
            <Button type="button" size="sm" variant="ghost" className="h-8 gap-1.5" onClick={refresh}>
              <RotateCcw className="h-3.5 w-3.5" /> Tentar novamente
            </Button>
          </div>
        )}

        {view === 'overview' ? (
          <div className="mt-5">
            <LancamentosOverview
              data={data}
              disabled={!selectedClientId}
              isLoading={isLoading}
              onOpenModule={setView}
              onOpenChartOfAccounts={() => setIsPlanoContasOpen(true)}
              onOpenBalancete={() => setView('balancete')}
              onRefresh={refresh}
              onMarkNoMovement={handleNoMovement}
              onClearNoMovement={handleClearNoMovement}
            />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-9 w-9"
                  onClick={handleBack}
                  aria-label="Voltar à visão geral"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {companyName || 'Empresa'}
                  </p>
                  <h2 className="mt-0.5 text-xl font-semibold text-foreground">
                    {viewLabel(view)}
                  </h2>
                </div>
              </div>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={() => setIsPlanoContasOpen(true)}
              >
                <BookOpen className="h-3.5 w-3.5" />
                Plano de contas
              </Button>
            </div>

            {selectedClientId && view === 'despesas' && (
              <ClientLancamentosDetail clientId={selectedClientId} competencia={competencia} />
            )}
            {selectedClientId && view === 'compras' && (
              <ComprasDetail
                clientId={selectedClientId}
                clientName={companyName || 'Empresa'}
                competencia={competencia}
              />
            )}
            {selectedClientId && view === 'faturamento' && (
              <FaturamentoDetail
                clientId={selectedClientId}
                clientName={companyName || 'Empresa'}
                competencia={competencia}
              />
            )}
            {selectedClientId && view === 'folha' && (
              <FolhaPagamentoDetail
                clientId={selectedClientId}
                clientName={companyName || 'Empresa'}
                competencia={competencia}
              />
            )}
            {selectedClientId && view === 'balancete' && (
              <BalanceteDetail
                clientId={selectedClientId}
                clientName={companyName || 'Empresa'}
                competencia={competencia}
              />
            )}
          </div>
        )}
      </div>

      {selectedClientId && (
        <PlanoContasModal
          isOpen={isPlanoContasOpen}
          onClose={() => {
            setIsPlanoContasOpen(false);
            void refresh();
          }}
          clientId={selectedClientId}
          clientName={companyName || 'Empresa'}
        />
      )}
    </AdminLayout>
  );
};

export default AdminLancamentos;
