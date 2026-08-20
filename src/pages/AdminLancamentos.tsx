import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ClientLancamentosDetail } from '@/components/admin/lancamentos/ClientLancamentosDetail';
import { CompanySelectorTop } from '@/components/admin/lancamentos/CompanySelectorTop';
import { LancamentoModulesGrid } from '@/components/admin/lancamentos/LancamentoModulesGrid';
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
  <div className="grid gap-0 border-t border-black/10 dark:border-white/10 lg:grid-cols-2">
    <section className="min-h-56 border-b border-black/10 p-6 dark:border-white/10 lg:border-b-0 lg:border-r">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/45 dark:text-white/40">
        Documentos da competência
      </p>
      <h3 className="mt-3 text-base font-medium">Nenhum documento importado</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-black/50 dark:text-white/45">
        A estrutura de processamento de {name.toLowerCase()} será conectada à próxima etapa do
        desenvolvimento.
      </p>
    </section>
    <section className="min-h-56 p-6">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-black/45 dark:text-white/40">
        Lançamentos contábeis
      </p>
      <h3 className="mt-3 text-base font-medium">Aguardando processamento</h3>
      <p className="mt-2 max-w-md text-sm leading-relaxed text-black/50 dark:text-white/45">
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

  const handleMonthChange = (month: string) => {
    setSelectedCompetencia(`${selectedYear}-${month}`);
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
      <div className="space-y-6">
        <header className="border-b border-black/15 pb-5 dark:border-white/15">
          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-black/45 dark:text-white/40">
            Escrituração
          </p>
          <h1 className="mt-2 text-2xl font-semibold tracking-[-0.025em]">Lançamentos contábeis</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-black/55 dark:text-white/50">
            Centralize a documentação da empresa, confira os lançamentos e conclua a competência
            com a apuração do balancete.
          </p>
        </header>

        <section className="grid gap-4 border border-black/15 bg-white p-5 dark:border-white/15 dark:bg-[#111214] lg:grid-cols-[minmax(320px,1fr)_160px_120px]">
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.09em] text-black/45 dark:text-white/40">
              Empresa
            </label>
            <CompanySelectorTop
              selectedClientId={selectedClientId}
              selectedClientName={selectedClientName}
              onSelectClient={handleSelectClient}
            />
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.09em] text-black/45 dark:text-white/40">
              Competência
            </label>
            <Select value={selectedMonth} onValueChange={handleMonthChange} disabled={!selectedClientId}>
              <SelectTrigger className="h-11 rounded-none border-black/15 bg-white dark:border-white/15 dark:bg-[#151618]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.09em] text-black/45 dark:text-white/40">
              Ano
            </label>
            <Select value={selectedYear} onValueChange={handleYearChange} disabled={!selectedClientId}>
              <SelectTrigger className="h-11 rounded-none border-black/15 bg-white dark:border-white/15 dark:bg-[#151618]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </section>

        {view === 'hub' ? (
          <>
            {!selectedClientId && (
              <div className="border border-dashed border-black/20 px-5 py-10 text-center dark:border-white/20">
                <p className="text-sm font-medium">Selecione uma empresa para continuar</p>
                <p className="mt-1 text-xs text-black/45 dark:text-white/40">
                  Os processos contábeis serão liberados após a seleção.
                </p>
              </div>
            )}
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
          <section className="border border-black/15 bg-white dark:border-white/15 dark:bg-[#111214]">
            <div className="flex flex-col gap-4 border-b border-black/10 px-5 py-5 dark:border-white/10 md:flex-row md:items-start md:justify-between">
              <div>
                <button
                  type="button"
                  onClick={() => setView('hub')}
                  className="mb-4 text-[11px] font-semibold uppercase tracking-[0.08em] text-black/45 hover:text-black dark:text-white/40 dark:hover:text-white"
                >
                  Voltar aos processos
                </button>
                <h2 className="text-xl font-semibold tracking-[-0.02em]">{MODULE_INFO[view].title}</h2>
                <p className="mt-1 text-sm text-black/50 dark:text-white/45">
                  {MODULE_INFO[view].description}
                </p>
              </div>
              <div className="text-left text-xs leading-relaxed text-black/50 dark:text-white/45 md:text-right">
                <p className="font-medium text-black dark:text-white">{selectedClientName}</p>
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
