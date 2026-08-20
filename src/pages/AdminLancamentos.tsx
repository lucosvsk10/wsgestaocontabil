import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ClientLancamentosDetail } from '@/components/admin/lancamentos/ClientLancamentosDetail';
import { CompanySelectorTop } from '@/components/admin/lancamentos/CompanySelectorTop';
import { LancamentoModulesGrid } from '@/components/admin/lancamentos/LancamentoModulesGrid';
import { CompetenceCalendar } from '@/components/admin/lancamentos/CompetenceCalendar';
import { FolhaPagamentoDetail } from '@/components/admin/lancamentos/folha/FolhaPagamentoDetail';
import { ComprasDetail } from '@/components/admin/lancamentos/compras/ComprasDetail';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useLancamentosOverview } from '@/hooks/lancamentos/useLancamentosOverview';
import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

const STORAGE_KEY = 'admin.lancamentos.selectedClientId';
const COMPETENCIA_KEY = 'admin.lancamentos.competencia';

type View =
  | 'hub'
  | 'despesas'
  | 'compras'
  | 'faturamento'
  | 'folha'
  | 'tributos'
  | 'balancete';

const MONTHS = [
  { value: '01', label: 'Janeiro' },
  { value: '02', label: 'Fevereiro' },
  { value: '03', label: 'Março' },
  { value: '04', label: 'Abril' },
  { value: '05', label: 'Maio' },
  { value: '06', label: 'Junho' },
  { value: '07', label: 'Julho' },
  { value: '08', label: 'Agosto' },
  { value: '09', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

const MODULE_INFO: Record<Exclude<View, 'hub'>, { title: string; description: string }> = {
  despesas: {
    title: 'Despesas e pagamentos',
    description: 'Importação, classificação, conferência e fechamento das despesas.',
  },
  compras: {
    title: 'Compras',
    description: 'Entradas por CFOP e mercadorias destinadas à revenda.',
  },
  faturamento: {
    title: 'Faturamento',
    description: 'Prestação de serviços e revenda de mercadorias.',
  },
  folha: {
    title: 'Folha de pagamento',
    description: 'Folha, pró-labore, férias, décimo terceiro e encargos.',
  },
  tributos: {
    title: 'Tributos',
    description: 'Apuração do PGDAS, Simples Nacional e demais obrigações.',
  },
  balancete: {
    title: 'Balancete',
    description: 'Conferência de saldos e ajustes finais da competência.',
  },
};

const PendingModule = ({ name }: { name: string }) => (
  <div className="grid gap-0 lg:grid-cols-2">
    <section className="min-h-56 border-b border-[var(--admin-line)] p-6 lg:border-b-0 lg:border-r">
      <p className="admin-eyebrow">
        Documentos da competência
      </p>
      <h3 className="mt-3 text-base font-medium">Nenhum documento importado</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--admin-muted)]">
        A estrutura de processamento de {name.toLowerCase()} será conectada à próxima etapa do
        desenvolvimento.
      </p>
    </section>
    <section className="min-h-56 p-6">
      <p className="admin-eyebrow">
        Lançamentos contábeis
      </p>
      <h3 className="mt-3 text-base font-medium">Aguardando processamento</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-[var(--admin-muted)]">
        Os lançamentos serão apresentados em tabela para conferência antes de seguirem ao
        balancete.
      </p>
    </section>
  </div>
);

const AdminLancamentos = () => {
  const now = new Date();
  const defaultCompetencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const storedCompetencia = localStorage.getItem(COMPETENCIA_KEY) || defaultCompetencia;

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedCompetencia, setSelectedCompetencia] = useState(storedCompetencia);
  const [view, setView] = useState<View>('hub');

  const selectedMonth = selectedCompetencia.slice(5, 7);
  const selectedYear = selectedCompetencia.slice(0, 4);
  const years = Array.from({ length: 7 }, (_, index) => String(now.getFullYear() - 4 + index));
  const { items, totals, isLoading, refetch } = useLancamentosOverview(selectedClientId, selectedYear);
  const selectedMonthData = items.find(item => item.competencia === selectedCompetencia);

  const competenciaLabel = useMemo(() => {
    const month = MONTHS.find(item => item.value === selectedMonth)?.label || selectedMonth;
    return `${month} de ${selectedYear}`;
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setSelectedClientId(stored);
  }, []);

  useEffect(() => {
    localStorage.setItem(COMPETENCIA_KEY, selectedCompetencia);
  }, [selectedCompetencia]);

  useEffect(() => {
    if (!selectedClientId) {
      setSelectedClientName(null);
      return;
    }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from('users')
        .select('name, email')
        .eq('id', selectedClientId)
        .maybeSingle();

      if (!cancelled) setSelectedClientName(data?.name || data?.email || 'Empresa');
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedClientId]);

  const handleSelectClient = (clientId: string) => {
    setSelectedClientId(clientId);
    setView('hub');
    localStorage.setItem(STORAGE_KEY, clientId);
  };

  const handleYearChange = (year: string) => {
    setSelectedCompetencia(`${year}-${selectedMonth}`);
  };

  const renderModule = () => {
    if (!selectedClientId || view === 'hub') return null;

    if (view === 'despesas') {
      return (
        <ClientLancamentosDetail
          clientId={selectedClientId}
          initialCompetencia={selectedCompetencia}
          embedded
        />
      );
    }

    if (view === 'compras') {
      return (
        <ComprasDetail
          clientId={selectedClientId}
          clientName={selectedClientName || 'Empresa'}
          initialCompetencia={selectedCompetencia}
          embedded
        />
      );
    }

    if (view === 'folha') {
      return (
        <FolhaPagamentoDetail
          clientId={selectedClientId}
          clientName={selectedClientName || 'Empresa'}
          initialCompetencia={selectedCompetencia}
          embedded
        />
      );
    }

    return <PendingModule name={MODULE_INFO[view].title} />;
  };

  return (
    <AdminLayout>
      <div className="admin-page">
        <header className="admin-page-header">
          <div>
            <p className="admin-eyebrow">Escrituração e conferência</p>
            <h1 className="admin-title">Central de lançamentos</h1>
            <p className="admin-subtitle">Acompanhe o ano contábil da empresa, processe cada competência e avance até a conferência do balancete.</p>
          </div>
          <Button className="admin-button-secondary h-9" onClick={refetch} disabled={!selectedClientId || isLoading}><RefreshCw className={`mr-2 h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />Atualizar visão</Button>
        </header>

        <section className="admin-surface p-4">
          <div className="grid gap-4 lg:grid-cols-[minmax(320px,1fr)_150px] lg:items-end">
            <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--admin-muted)]">Empresa em processamento</label><CompanySelectorTop selectedClientId={selectedClientId} selectedClientName={selectedClientName} onSelectClient={handleSelectClient} /></div>
            <div><label className="mb-2 block text-[10px] font-bold uppercase tracking-[0.09em] text-[var(--admin-muted)]">Exercício</label><Select value={selectedYear} onValueChange={handleYearChange} disabled={!selectedClientId}><SelectTrigger className="h-11 border-[var(--admin-line)] bg-transparent shadow-none"><SelectValue /></SelectTrigger><SelectContent>{years.map(year => <SelectItem key={year} value={year}>{year}</SelectItem>)}</SelectContent></Select></div>
          </div>
        </section>

        {view === 'hub' ? (
          <>
            {!selectedClientId && (
              <div className="admin-surface admin-empty border-dashed">
                <strong className="text-sm text-[var(--admin-ink)]">Selecione uma empresa para iniciar</strong>
                <span className="mt-1 text-xs">O calendário anual e os processos serão carregados com os dados reais da empresa.</span>
              </div>
            )}
            {selectedClientId && (
              <section className="admin-kpi-grid">
                <div className="admin-kpi"><p className="admin-kpi-label">Documentos no ano</p><p className="admin-kpi-value">{totals.documentos}</p><p className="admin-kpi-meta">Arquivos processados ou pendentes</p></div>
                <div className="admin-kpi"><p className="admin-kpi-label">Lançamentos gerados</p><p className="admin-kpi-value">{totals.lancamentos}</p><p className="admin-kpi-meta">Linhas contábeis consolidadas</p></div>
                <div className="admin-kpi"><p className="admin-kpi-label">Competências fechadas</p><p className="admin-kpi-value">{totals.mesesFechados}/12</p><p className="admin-kpi-meta">Meses concluídos no exercício</p></div>
                <div className="admin-kpi"><p className="admin-kpi-label">Pontos de atenção</p><p className="admin-kpi-value">{totals.pendencias}</p><p className="admin-kpi-meta">Erros ou processamentos pendentes</p></div>
              </section>
            )}
            <CompetenceCalendar year={selectedYear} items={items} selectedCompetencia={selectedCompetencia} isLoading={isLoading} disabled={!selectedClientId} onSelect={setSelectedCompetencia} />
            {selectedClientId && <div className="admin-surface flex flex-col gap-3 border-l-[3px] border-l-blue-600 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-xs font-semibold text-[var(--admin-ink)]">{selectedClientName}</p><p className="mt-0.5 text-[11px] text-[var(--admin-muted)]">Competência selecionada: {competenciaLabel}</p></div><div className="flex gap-5 text-[11px] text-[var(--admin-muted)]"><span><strong className="text-[var(--admin-ink)]">{selectedMonthData?.documentos || 0}</strong> documentos</span><span><strong className="text-[var(--admin-ink)]">{selectedMonthData?.lancamentos || 0}</strong> lançamentos</span></div></div>}
            <LancamentoModulesGrid
              disabled={!selectedClientId}
              onOpenDespesas={() => setView('despesas')}
              onOpenCompras={() => setView('compras')}
              onOpenFaturamento={() => setView('faturamento')}
              onOpenFolha={() => setView('folha')}
              onOpenTributos={() => setView('tributos')}
              onOpenBalancete={() => setView('balancete')}
            />
          </>
        ) : (
          <section className="admin-surface">
            <div className="flex flex-col gap-4 border-b border-[var(--admin-line)] px-5 py-5 md:flex-row md:items-start md:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => { setView('hub'); refetch(); }}
                  className="mb-4 text-[11px] font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400"
                >
                  ← Voltar ao calendário
                </button>
                <h2 className="text-xl font-semibold tracking-[-0.02em] text-[var(--admin-ink)]">{MODULE_INFO[view].title}</h2>
                <p className="mt-1 text-sm text-[var(--admin-muted)]">
                  {MODULE_INFO[view].description}
                </p>
              </div>
              <div className="text-left text-xs leading-relaxed text-[var(--admin-muted)] md:text-right">
                <p className="font-semibold text-[var(--admin-ink)]">{selectedClientName}</p>
                <p>{competenciaLabel}</p>
              </div>
            </div>
            {renderModule()}
          </section>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLancamentos;
