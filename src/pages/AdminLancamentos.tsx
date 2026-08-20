import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ClientLancamentosDetail } from '@/components/admin/lancamentos/ClientLancamentosDetail';
import { CompanySelectorTop } from '@/components/admin/lancamentos/CompanySelectorTop';
import { CompetenceCalendar } from '@/components/admin/lancamentos/CompetenceCalendar';
import { LancamentoModulesGrid } from '@/components/admin/lancamentos/LancamentoModulesGrid';
import { FolhaPagamentoDetail } from '@/components/admin/lancamentos/folha/FolhaPagamentoDetail';
import { ComprasDetail } from '@/components/admin/lancamentos/compras/ComprasDetail';
import { useLancamentosOverview } from '@/hooks/lancamentos/useLancamentosOverview';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  FileStack,
  FileText,
  Layers3,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
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

type View = 'hub' | 'despesas' | 'folha' | 'compras';

const MONTH_NAMES = [
  'Janeiro',
  'Fevereiro',
  'Março',
  'Abril',
  'Maio',
  'Junho',
  'Julho',
  'Agosto',
  'Setembro',
  'Outubro',
  'Novembro',
  'Dezembro',
];

const AdminLancamentos = () => {
  const now = new Date();
  const defaultCompetencia = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const storedCompetencia = localStorage.getItem(COMPETENCIA_KEY) || defaultCompetencia;
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedClientName, setSelectedClientName] = useState<string | null>(null);
  const [selectedCompetencia, setSelectedCompetencia] = useState(storedCompetencia);
  const [view, setView] = useState<View>('hub');

  const selectedYear = selectedCompetencia.slice(0, 4);
  const years = Array.from({ length: 7 }, (_, index) => String(now.getFullYear() - 4 + index));
  const { items, totals, isLoading, refetch } = useLancamentosOverview(
    selectedClientId,
    selectedYear
  );

  const competenciaLabel = useMemo(() => {
    const month = Number(selectedCompetencia.slice(5, 7));
    return `${MONTH_NAMES[month - 1]} de ${selectedYear}`;
  }, [selectedCompetencia, selectedYear]);

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
    setSelectedCompetencia(`${year}-${selectedCompetencia.slice(5, 7)}`);
  };

  const selectedMonthData = items.find(item => item.competencia === selectedCompetencia);

  const summaryCards = [
    {
      label: 'Documentos no ano',
      value: totals.documentos,
      icon: FileText,
      tone: 'text-blue-600 bg-blue-500/10',
    },
    {
      label: 'Lançamentos gerados',
      value: totals.lancamentos,
      icon: Layers3,
      tone: 'text-violet-600 bg-violet-500/10',
    },
    {
      label: 'Meses fechados',
      value: totals.mesesFechados,
      icon: CheckCircle2,
      tone: 'text-emerald-600 bg-emerald-500/10',
    },
    {
      label: 'Pontos de atenção',
      value: totals.pendencias,
      icon: CircleAlert,
      tone: 'text-rose-600 bg-rose-500/10',
    },
  ];

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="space-y-6"
      >
        <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="mb-2 flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#a47b13] dark:text-[#efc349]">
              <FileStack className="h-3.5 w-3.5" /> Central contábil
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Gestão de lançamentos
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              Organize documentos, processamento, conferência e exportação por empresa e
              competência.
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Select value={selectedYear} onValueChange={handleYearChange}>
              <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white sm:w-[118px] dark:border-white/10 dark:bg-white/5">
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
            <Button
              variant="outline"
              onClick={refetch}
              disabled={!selectedClientId || isLoading}
              className="h-11 rounded-xl border-slate-200 bg-white dark:border-white/10 dark:bg-white/5"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} /> Atualizar
              visão
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035]">
          <div className="grid gap-4 xl:grid-cols-[minmax(300px,420px)_1fr] xl:items-center">
            <CompanySelectorTop
              selectedClientId={selectedClientId}
              selectedClientName={selectedClientName}
              onSelectClient={handleSelectClient}
            />
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
              {summaryCards.map(card => {
                const Icon = card.icon;
                return (
                  <div
                    key={card.label}
                    className="rounded-xl bg-slate-50 p-3 dark:bg-white/[0.035]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {card.label}
                      </p>
                      <span
                        className={`flex h-7 w-7 items-center justify-center rounded-lg ${card.tone}`}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                    </div>
                    <p className="mt-2 text-xl font-semibold text-slate-900 dark:text-white">
                      {selectedClientId ? card.value : '—'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {view === 'hub' ? (
          <>
            <CompetenceCalendar
              year={selectedYear}
              items={items}
              selectedCompetencia={selectedCompetencia}
              isLoading={isLoading}
              disabled={!selectedClientId}
              onSelect={setSelectedCompetencia}
            />

            {selectedClientId && (
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-[#101a2a] p-4 text-white shadow-sm sm:flex-row sm:items-center sm:justify-between dark:border-white/10">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#efc349] text-[#101827]">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400">Contexto selecionado</p>
                    <p className="text-sm font-semibold">
                      {selectedClientName}{' '}
                      <span className="font-normal text-slate-400">• {competenciaLabel}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span>{selectedMonthData?.documentos || 0} documentos</span>
                  <ChevronRight className="h-3.5 w-3.5 text-[#efc349]" />
                  <span>{selectedMonthData?.lancamentos || 0} lançamentos</span>
                </div>
              </div>
            )}

            <LancamentoModulesGrid
              disabled={!selectedClientId}
              competenciaLabel={selectedClientId ? competenciaLabel : undefined}
              onOpenDespesas={() => selectedClientId && setView('despesas')}
              onOpenFolha={() => selectedClientId && setView('folha')}
              onOpenCompras={() => selectedClientId && setView('compras')}
            />
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-white/[0.035] sm:flex-row sm:items-center sm:justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setView('hub');
                  refetch();
                }}
                className="w-fit gap-2 rounded-lg"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar à central
              </Button>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {selectedClientName} • {competenciaLabel}
              </p>
            </div>
            {selectedClientId && view === 'despesas' && (
              <ClientLancamentosDetail
                clientId={selectedClientId}
                initialCompetencia={selectedCompetencia}
              />
            )}
            {selectedClientId && view === 'folha' && (
              <FolhaPagamentoDetail
                clientId={selectedClientId}
                clientName={selectedClientName || 'Empresa'}
                initialCompetencia={selectedCompetencia}
              />
            )}
            {selectedClientId && view === 'compras' && (
              <ComprasDetail
                clientId={selectedClientId}
                clientName={selectedClientName || 'Empresa'}
                initialCompetencia={selectedCompetencia}
              />
            )}
          </div>
        )}
      </motion.div>
    </AdminLayout>
  );
};

export default AdminLancamentos;
