import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";
import { CompanySelector } from "./CompanySelector";
import { ComprasWorkspace } from "./ComprasWorkspace";
import { DespesasWorkspace, WorkspaceStatus } from "./DespesasWorkspace";
import { FaturamentoWorkspace } from "./FaturamentoWorkspace";
import { FolhaWorkspace } from "./FolhaWorkspace";

type ModuleKey = "folha" | "compras" | "faturamento" | "despesas";
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

const emptyStatuses = (): Record<ModuleKey, WorkspaceStatus> => ({ despesas: "waiting", folha: "waiting", compras: "waiting", faturamento: "waiting" });
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

export function LancamentosWorkspace() {
  const today = new Date();
  const { company, companies, selectCompany } = useAccountingCompany();
  const initialContext = readLastContext(company.id);
  const [year, setYear] = useState(() => initialContext?.year ?? String(today.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(() => initialContext?.selectedMonth ?? String(today.getMonth() + 1).padStart(2, "0"));
  const [selectedModule, setSelectedModule] = useState<ModuleKey>(() => initialContext?.selectedModule ?? "despesas");
  const [yearStatuses, setYearStatuses] = useState<Record<string, Record<ModuleKey, WorkspaceStatus>>>({});
  const [expenseFileCount, setExpenseFileCount] = useState(0);
  const previousCompanyRef = useRef(company.id);
  const skipContextSaveRef = useRef(false);

  useEffect(() => {
    if (previousCompanyRef.current === company.id) return;
    previousCompanyRef.current = company.id;
    skipContextSaveRef.current = true;
    const saved = readLastContext(company.id);
    setYear(saved?.year ?? String(today.getFullYear()));
    setSelectedMonth(saved?.selectedMonth ?? String(today.getMonth() + 1).padStart(2, "0"));
    setSelectedModule(saved?.selectedModule ?? "despesas");
  }, [company.id]);

  useEffect(() => {
    if (skipContextSaveRef.current) {
      skipContextSaveRef.current = false;
      return;
    }
    localStorage.setItem(contextKey(company.id), JSON.stringify({ year, selectedMonth, selectedModule, activeTab: "transcricao" } satisfies LastContext));
  }, [company.id, selectedModule, selectedMonth, year]);

  const selectedMonthLabel = useMemo(() => months.find(month => month.key === selectedMonth)?.label ?? "Competência", [selectedMonth]);
  const statusKey = `${company.id}:${year}:module-statuses`;

  useEffect(() => {
    void loadWorkspaceData<Record<string, Record<ModuleKey, WorkspaceStatus>>>(statusKey).then(saved => setYearStatuses(saved ?? {}));
  }, [statusKey]);

  const setModuleStatus = useCallback((module: ModuleKey, status: WorkspaceStatus) => {
    setYearStatuses(current => {
      const next = { ...current, [selectedMonth]: { ...(current[selectedMonth] ?? emptyStatuses()), [module]: status } };
      void saveWorkspaceData(statusKey, next);
      return next;
    });
  }, [selectedMonth, statusKey]);

  const changeCompetence = (nextMonth: string, nextYear: string) => {
    setYear(nextYear);
    setSelectedMonth(nextMonth);
  };

  return <div className="mx-auto w-full max-w-[1720px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Operação contábil</p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Lançamentos</h1>
        <p className="mt-1 truncate text-sm text-muted-foreground">{company.name}<span className="px-2 text-border">/</span>{selectedMonthLabel} de {year}</p>
      </div>
      <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto"><CompanySelector company={company} companies={companies} onSelect={selectCompany} /></div>
    </header>

    <div className="grid min-h-[720px] lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-b border-border py-5 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:border-b-0 lg:border-r lg:pr-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Competências</p>
          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-8 w-24 border-border bg-transparent text-xs shadow-none"><SelectValue /></SelectTrigger>
            <SelectContent>{[today.getFullYear() - 2, today.getFullYear() - 1, today.getFullYear()].map(item => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <nav className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-1" aria-label="Competências">
          {months.map(month => {
            const active = selectedMonth === month.key;
            const statuses = yearStatuses[month.key] ?? emptyStatuses();
            const complete = Object.values(statuses).filter(status => status === "done").length;
            const hasWork = Object.values(statuses).some(status => status !== "waiting");
            return <button key={month.key} type="button" onClick={() => setSelectedMonth(month.key)} className={cn("group flex min-h-10 flex-col justify-center rounded-sm px-3 py-2 text-left text-sm transition-all duration-200", active ? "bg-cyan-500/15 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200" : "text-cyan-700/80 hover:bg-cyan-500/10 hover:text-cyan-800 dark:text-cyan-300/75 dark:hover:text-cyan-200")}>
              <span className="flex w-full items-center justify-between"><span>{month.label}</span><span className={cn("h-2 w-2 rounded-full", complete === 4 ? "bg-emerald-500" : hasWork ? "bg-amber-400" : "bg-muted-foreground/25")} /></span>
              <span className="grid grid-rows-[0fr] text-[10px] opacity-0 transition-all group-hover:mt-1 group-hover:grid-rows-[1fr] group-hover:opacity-100"><span className="overflow-hidden">{complete} de 4 módulos concluídos</span></span>
            </button>;
          })}
        </nav>
      </aside>

      <main className="min-w-0 py-5 lg:pl-6">
        <h2 className="text-xl font-semibold tracking-tight text-cyan-800 dark:text-cyan-200">{selectedMonthLabel} de {year}</h2>
        <nav className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Módulos contábeis">
          {modules.map(module => {
            const status = (yearStatuses[selectedMonth] ?? emptyStatuses())[module.key];
            const statusLabel = status === "done" ? "Concluído" : status === "review" ? "Aguardando conferência" : "Aguardando importação";
            const fileInfo = module.key === "despesas" && expenseFileCount ? `${expenseFileCount} arquivo(s)` : statusLabel;
            return <button key={module.key} type="button" onClick={() => setSelectedModule(module.key)} className={cn("grid min-h-24 grid-cols-[minmax(0,1fr)_30%] overflow-hidden rounded-md bg-background text-left transition-colors", selectedModule === module.key ? "bg-muted/80" : "hover:bg-muted/45")}>
              <span className="flex flex-col justify-center px-4 py-3"><span className="text-sm font-medium text-foreground">{module.label}</span><span className="mt-1 text-xs text-muted-foreground">{fileInfo}</span></span>
              <span className={cn("flex items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-wide", status === "done" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : status === "review" ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground")}>{statusLabel}</span>
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
  </div>;
}
