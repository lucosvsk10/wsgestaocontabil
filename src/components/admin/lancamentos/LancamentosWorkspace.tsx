import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Download, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";
import { AccountingModuleKey, emptyMonthStatuses, loadDynamicYearStatuses, MonthModuleStatus, YearModuleStatuses } from "@/lib/lancamentos/accountingMonthState";
import { exportAccountingMonthsBatch } from "@/lib/lancamentos/batchAccountingExport";
import { exportCompleteAccountingMonth } from "@/lib/lancamentos/completeMonthExport";
import { saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";
import { AccountingYearPicker } from "./AccountingYearPicker";
import { AccountingImportPrerequisites } from "./AccountingImportPrerequisites";
import { ComprasWorkspace } from "./ComprasWorkspace";
import { DespesasWorkspace, WorkspaceStatus } from "./DespesasWorkspace";
import { FaturamentoWorkspace } from "./FaturamentoWorkspace";
import { FolhaWorkspace } from "./FolhaWorkspace";

type ModuleKey = AccountingModuleKey;
interface MonthItem { key: string; label: string; }
interface ModuleItem { key: ModuleKey; label: string; }
interface LastContext { year: string; selectedMonth: string; selectedModule: ModuleKey; activeTab: string; }

const months: MonthItem[] = [
  { key: "01", label: "Janeiro" }, { key: "02", label: "Fevereiro" }, { key: "03", label: "Março" }, { key: "04", label: "Abril" },
  { key: "05", label: "Maio" }, { key: "06", label: "Junho" }, { key: "07", label: "Julho" }, { key: "08", label: "Agosto" },
  { key: "09", label: "Setembro" }, { key: "10", label: "Outubro" }, { key: "11", label: "Novembro" }, { key: "12", label: "Dezembro" },
];

const modules: ModuleItem[] = [
  { key: "despesas", label: "Despesas" },
  { key: "folha", label: "Folha de pagamento" },
  { key: "compras", label: "Compras" },
  { key: "faturamento", label: "Faturamento" },
];

const contextKey = (companyId: string) => `ws:lancamentos:last-context:${companyId}`;

function readLastContext(companyId: string): LastContext | null {
  try {
    const raw = localStorage.getItem(contextKey(companyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastContext>;
    if (!parsed.year || !/^20\d{2}$/.test(parsed.year) || !parsed.selectedMonth || !months.some(month => month.key === parsed.selectedMonth) || !parsed.selectedModule || !modules.some(module => module.key === parsed.selectedModule)) return null;
    return { year: parsed.year, selectedMonth: parsed.selectedMonth, selectedModule: parsed.selectedModule, activeTab: parsed.activeTab || "transcricao" };
  } catch {
    return null;
  }
}

function statusLabel(status: MonthModuleStatus) {
  if (status === "done") return "Conferido";
  if (status === "review") return "Em andamento";
  if (status === "error") return "Revisar erro";
  return "Aguardando importação";
}

function progressBarClass(status: MonthModuleStatus) {
  if (status === "done") return "bg-emerald-500";
  if (status === "review") return "bg-amber-400";
  if (status === "error") return "bg-red-500";
  return "bg-muted-foreground/20";
}

export function LancamentosWorkspace() {
  const currentYear = new Date().getFullYear();
  const currentMonth = String(new Date().getMonth() + 1).padStart(2, "0");
  const { company } = useAccountingCompany();
  const initialContext = readLastContext(company.id);
  const [year, setYear] = useState(() => initialContext?.year ?? String(currentYear));
  const [selectedMonth, setSelectedMonth] = useState(() => initialContext?.selectedMonth ?? currentMonth);
  const [selectedModule, setSelectedModule] = useState<ModuleKey>(() => initialContext?.selectedModule ?? "despesas");
  const [yearStatuses, setYearStatuses] = useState<YearModuleStatuses>({});
  const [expenseFileCount, setExpenseFileCount] = useState(0);
  const [exportingMonth, setExportingMonth] = useState<string | null>(null);
  const [batchDialogOpen, setBatchDialogOpen] = useState(false);
  const [selectedBatchMonths, setSelectedBatchMonths] = useState<string[]>([]);
  const [exportingBatch, setExportingBatch] = useState(false);
  const previousCompanyRef = useRef(company.id);
  const skipContextSaveRef = useRef(false);

  useEffect(() => {
    if (previousCompanyRef.current === company.id) return;
    previousCompanyRef.current = company.id;
    skipContextSaveRef.current = true;
    const saved = readLastContext(company.id);
    setYear(saved?.year ?? String(currentYear));
    setSelectedMonth(saved?.selectedMonth ?? currentMonth);
    setSelectedModule(saved?.selectedModule ?? "despesas");
    setBatchDialogOpen(false);
    setSelectedBatchMonths([]);
  }, [company.id, currentMonth, currentYear]);

  useEffect(() => {
    if (skipContextSaveRef.current) {
      skipContextSaveRef.current = false;
      return;
    }
    localStorage.setItem(contextKey(company.id), JSON.stringify({ year, selectedMonth, selectedModule, activeTab: "transcricao" } satisfies LastContext));
  }, [company.id, selectedModule, selectedMonth, year]);

  useEffect(() => {
    setBatchDialogOpen(false);
    setSelectedBatchMonths([]);
  }, [year]);

  const selectedMonthLabel = useMemo(() => months.find(month => month.key === selectedMonth)?.label ?? "Competência", [selectedMonth]);
  const completedMonths = useMemo(() => months.filter(month => Object.values(yearStatuses[month.key] ?? emptyMonthStatuses()).every(status => status === "done")), [yearStatuses]);
  const statusKey = `${company.id}:${year}:module-statuses`;

  const refreshStatuses = useCallback(async () => {
    try {
      setYearStatuses(await loadDynamicYearStatuses(company.id, year));
    } catch (error) {
      console.error("Não foi possível atualizar os indicadores mensais.", error);
    }
  }, [company.id, year]);

  useEffect(() => { void refreshStatuses(); }, [refreshStatuses]);

  useEffect(() => {
    const channel = supabase
      .channel(`accounting-month-status-${company.id}-${year}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "accounting_workspace_data", filter: `company_key=eq.${company.id}` }, () => { void refreshStatuses(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "accounting_workspace_documents", filter: `company_key=eq.${company.id}` }, () => { void refreshStatuses(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [company.id, refreshStatuses, year]);

  const setModuleStatus = useCallback((module: ModuleKey, status: WorkspaceStatus) => {
    setYearStatuses(current => {
      const next: YearModuleStatuses = {
        ...current,
        [selectedMonth]: { ...(current[selectedMonth] ?? emptyMonthStatuses()), [module]: status },
      };
      const confirmations = Object.fromEntries(Object.entries(next).map(([month, statuses]) => [
        month,
        Object.fromEntries(modules.map(item => [item.key, statuses[item.key] === "done" ? "done" : "waiting"])) as Record<ModuleKey, WorkspaceStatus>,
      ]));
      void saveWorkspaceData(statusKey, confirmations);
      return next;
    });
  }, [selectedMonth, statusKey]);

  const changeCompetence = (nextMonth: string, nextYear: string) => {
    setYear(nextYear);
    setSelectedMonth(nextMonth);
    void loadDynamicYearStatuses(company.id, nextYear)
      .then(setYearStatuses)
      .catch(error => console.error("Não foi possível atualizar imediatamente os indicadores da nova competência.", error));
  };

  const exportCompleteMonth = async (month: string) => {
    const statuses = yearStatuses[month] ?? emptyMonthStatuses();
    if (!Object.values(statuses).every(status => status === "done")) return;
    setExportingMonth(month);
    try {
      await exportCompleteAccountingMonth(company.id, month, year);
    } catch (error) {
      console.error("Falha ao exportar a competência completa.", error);
    } finally {
      setExportingMonth(null);
    }
  };

  const openBatchDialog = () => {
    setSelectedBatchMonths([]);
    setBatchDialogOpen(true);
  };

  const toggleBatchMonth = (month: string) => {
    setSelectedBatchMonths(current => current.includes(month) ? current.filter(item => item !== month) : [...current, month]);
  };

  const exportBatch = async () => {
    const allowedMonths = selectedBatchMonths.filter(month => completedMonths.some(item => item.key === month));
    if (!allowedMonths.length || exportingBatch) return;
    setExportingBatch(true);
    try {
      await exportAccountingMonthsBatch(company.id, allowedMonths, year);
      setBatchDialogOpen(false);
      setSelectedBatchMonths([]);
    } catch (error) {
      console.error("Falha ao exportar as competências em lote.", error);
    } finally {
      setExportingBatch(false);
    }
  };

  return <TooltipProvider delayDuration={180}><div className="mx-auto w-full max-w-[1720px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Operação contábil</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Lançamentos</h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">{company.name}<span className="px-2 text-border">/</span>{selectedMonthLabel} de {year}</p>
      </div>
      
    </header>

    <div className="grid min-h-[720px] lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside className="border-b border-border py-5 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:border-b-0 lg:border-r lg:pr-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Competências</p>
          <AccountingYearPicker value={year} onChange={setYear} />
        </div>
        <nav className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-1" aria-label="Competências">
          {months.map(month => {
            const active = selectedMonth === month.key;
            const statuses = yearStatuses[month.key] ?? emptyMonthStatuses();
            const complete = Object.values(statuses).filter(status => status === "done").length;
            const errors = Object.values(statuses).filter(status => status === "error").length;
            const monthDone = complete === 4;
            return <div key={month.key} className={cn("group/month flex min-h-14 items-center gap-1 rounded-sm transition-colors", active ? "bg-cyan-500/15" : "hover:bg-cyan-500/10")}>
              <button type="button" onClick={() => setSelectedMonth(month.key)} className={cn("min-w-0 flex-1 px-3 py-2 text-left transition-colors", active ? "text-cyan-800 dark:text-cyan-200" : "text-cyan-700/80 hover:text-cyan-800 dark:text-cyan-300/75 dark:hover:text-cyan-200")}>
                <span className="flex items-center justify-between gap-2">
                  <span className="text-sm">{month.label}</span>
                  <span className={cn("h-2.5 w-2.5 shrink-0 rounded-full transition-colors", monthDone ? "bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.12)]" : "bg-muted-foreground/25")} title={monthDone ? "Mês totalmente conferido" : "Mês ainda não concluído"} />
                </span>
                <span className="mt-1 grid grid-cols-4 gap-1" aria-label={`Andamento de ${month.label}`}>
                  {modules.map(module => <span key={module.key} className={cn("h-1 rounded-full transition-colors", progressBarClass(statuses[module.key]))} title={`${module.label}: ${statusLabel(statuses[module.key])}`} />)}
                </span>
                <span className="mt-1 block text-[10px] text-muted-foreground">{complete} de 4 conferidos{errors ? ` · ${errors} com erro` : ""}</span>
              </button>
              {monthDone && <Tooltip>
                <TooltipTrigger asChild><Button type="button" variant="ghost" size="icon" className="mr-1 h-8 w-8 shrink-0 text-blue-600 hover:bg-blue-500/10 hover:text-blue-700 dark:text-blue-400" disabled={exportingMonth === month.key} onClick={() => void exportCompleteMonth(month.key)} aria-label={`Exportar ${month.label} completo`}><Info className="h-3.5 w-3.5" /></Button></TooltipTrigger>
                <TooltipContent side="right" className="max-w-56"><p className="font-medium">Exportar mês completo</p><p className="mt-0.5 text-xs opacity-80">Liberado porque Despesas, Folha, Compras e Faturamento estão conferidos.</p></TooltipContent>
              </Tooltip>}
            </div>;
          })}
        </nav>
        {completedMonths.length > 0 && <div className="mt-4 space-y-2">
          <Button type="button" variant="outline" size="sm" className="w-full gap-2" onClick={openBatchDialog}><Download className="h-3.5 w-3.5" />Baixar em lote</Button>
          {Object.values(yearStatuses[selectedMonth] ?? emptyMonthStatuses()).every(status => status === "done") && <Button type="button" variant="outline" size="sm" className="w-full gap-2" disabled={exportingMonth === selectedMonth} onClick={() => void exportCompleteMonth(selectedMonth)}><Download className="h-3.5 w-3.5" />{exportingMonth === selectedMonth ? "Gerando..." : "Exportar mês completo"}</Button>}
        </div>}
      </aside>

      <main className="min-w-0 py-5 lg:pl-6">
        <h2 className="text-xl font-semibold tracking-tight text-cyan-800 dark:text-cyan-200">{selectedMonthLabel} de {year}</h2>
        <AccountingImportPrerequisites company={company.id} />
        <nav className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Módulos contábeis">
          {modules.map(module => {
            const status = (yearStatuses[selectedMonth] ?? emptyMonthStatuses())[module.key];
            const label = statusLabel(status);
            const fileInfo = module.key === "despesas" && expenseFileCount ? `${expenseFileCount} arquivo(s)` : label;
            return <button key={module.key} type="button" onClick={() => setSelectedModule(module.key)} className={cn("grid min-h-24 grid-cols-[minmax(0,1fr)_30%] overflow-hidden rounded-md bg-background text-left transition-colors", selectedModule === module.key ? "bg-muted/80" : "hover:bg-muted/45")}>
              <span className="flex flex-col justify-center px-4 py-3"><span className="text-sm font-medium text-foreground">{module.label}</span><span className="mt-1 text-xs text-muted-foreground">{fileInfo}</span></span>
              <span className={cn("flex items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-wide", status === "done" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : status === "review" ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" : status === "error" ? "bg-red-500/15 text-red-700 dark:text-red-300" : "bg-muted text-muted-foreground")}>{label}</span>
            </button>;
          })}
        </nav>

        {selectedModule === "despesas" ? (
          <DespesasWorkspace key={`${company.id}-${year}-${selectedMonth}`} company={company.id} month={selectedMonth} year={year} onFileCountChange={setExpenseFileCount} onStatusChange={status => setModuleStatus("despesas", status)} onCompetenceChange={changeCompetence} />
        ) : selectedModule === "folha" ? (
          <FolhaWorkspace key={`${company.id}-${year}-${selectedMonth}`} company={company.id} month={selectedMonth} year={year} onStatusChange={status => setModuleStatus("folha", status)} onCompetenceChange={changeCompetence} />
        ) : selectedModule === "compras" ? (
          <ComprasWorkspace key={`${company.id}-${year}-${selectedMonth}`} company={company.id} month={selectedMonth} year={year} onStatusChange={status => setModuleStatus("compras", status)} onCompetenceChange={changeCompetence} />
        ) : (
          <FaturamentoWorkspace key={`${company.id}-${year}-${selectedMonth}`} company={company.id} month={selectedMonth} year={year} onStatusChange={status => setModuleStatus("faturamento", status)} onCompetenceChange={changeCompetence} />
        )}
      </main>
    </div>

    <Dialog open={batchDialogOpen} onOpenChange={open => { if (!exportingBatch) setBatchDialogOpen(open); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Baixar lançamentos em lote</DialogTitle>
          <DialogDescription>Selecione as competências concluídas de {year}. O arquivo será gerado somente para este ano.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 py-2 sm:grid-cols-2">
          {completedMonths.map(month => {
            const checked = selectedBatchMonths.includes(month.key);
            return <label key={month.key} className={cn("flex cursor-pointer items-center gap-3 rounded-md border px-3 py-3 text-sm transition-colors", checked ? "border-cyan-500/50 bg-cyan-500/10" : "border-border hover:bg-muted/50")}>
              <input type="checkbox" checked={checked} onChange={() => toggleBatchMonth(month.key)} className="h-4 w-4 accent-cyan-600" />
              <span className="flex-1">{month.label}</span>
              <span className="text-xs tabular-nums text-muted-foreground">{Number(month.key)}/{year}</span>
            </label>;
          })}
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
          <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setSelectedBatchMonths(selectedBatchMonths.length === completedMonths.length ? [] : completedMonths.map(month => month.key))}>
            {selectedBatchMonths.length === completedMonths.length ? "Desmarcar todos" : "Selecionar todos"}
          </button>
          <span className="text-xs text-muted-foreground">{selectedBatchMonths.length} selecionado(s)</span>
        </div>
        <DialogFooter>
          <Button type="button" variant="ghost" disabled={exportingBatch} onClick={() => setBatchDialogOpen(false)}>Cancelar</Button>
          <Button type="button" disabled={!selectedBatchMonths.length || exportingBatch} onClick={() => void exportBatch()}>{exportingBatch ? "Gerando..." : "Gerar documento"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div></TooltipProvider>;
}
