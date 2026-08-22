import { ChangeEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";
import { detectWorkbookCompetence } from "@/lib/lancamentos/expenseWorkbook";
import { loadWorkspaceData, loadWorkspaceFiles, saveWorkspaceData, saveWorkspaceFiles } from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";
import { AccountingWorkflowSteps, AccountCodeHover } from "./AccountingWorkflowUI";
import { CompanySelector } from "./CompanySelector";
import { ComprasWorkspace } from "./ComprasWorkspace";
import { DespesasWorkspace, WorkspaceStatus } from "./DespesasWorkspace";
import { FolhaWorkspace } from "./FolhaWorkspace";

type ModuleKey = "folha" | "compras" | "faturamento" | "despesas";
interface MonthItem { key: string; label: string; }
interface ModuleItem { key: ModuleKey; label: string; acceptedFiles: string; }
interface TranscriptionRow { id: number; code: string; description: string; value: string; classification: string; }
interface LaunchRow { id: number; date: string; history: string; debit: string; credit: string; debitDescription: string; debitCostCenter: string; creditDescription: string; creditCostCenter: string; value: string; }
interface LastContext { year: string; selectedMonth: string; selectedModule: ModuleKey; activeTab: string; }

const months: MonthItem[] = [
  { key: "01", label: "Janeiro" }, { key: "02", label: "Fevereiro" }, { key: "03", label: "Março" }, { key: "04", label: "Abril" },
  { key: "05", label: "Maio" }, { key: "06", label: "Junho" }, { key: "07", label: "Julho" }, { key: "08", label: "Agosto" },
  { key: "09", label: "Setembro" }, { key: "10", label: "Outubro" }, { key: "11", label: "Novembro" }, { key: "12", label: "Dezembro" },
];

const modules: ModuleItem[] = [
  { key: "despesas", label: "Despesas", acceptedFiles: ".pdf,.xlsx,.xls,.csv" },
  { key: "folha", label: "Folha de pagamento", acceptedFiles: ".pdf,.xlsx,.xls" },
  { key: "compras", label: "Compras", acceptedFiles: ".pdf" },
  { key: "faturamento", label: "Faturamento", acceptedFiles: ".pdf,.xlsx,.xls,.csv" },
];

const emptyStatuses = (): Record<ModuleKey, WorkspaceStatus> => ({ despesas: "waiting", folha: "waiting", compras: "waiting", faturamento: "waiting" });
const inputCellClass = "h-8 rounded-none border-0 bg-transparent px-2 text-xs shadow-none focus:border-foreground/30 focus:ring-foreground/10 focus-visible:ring-1 focus-visible:ring-foreground/30 dark:bg-transparent dark:focus:border-white/30 dark:focus:ring-white/10";
const contextKey = (companyId: string) => `ws:lancamentos:last-context:${companyId}`;

function readLastContext(companyId: string): LastContext | null {
  try {
    const raw = localStorage.getItem(contextKey(companyId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<LastContext>;
    if (!parsed.year || !/^20\d{2}$/.test(parsed.year) || !parsed.selectedMonth || !months.some(month => month.key === parsed.selectedMonth) || !parsed.selectedModule || !modules.some(module => module.key === parsed.selectedModule)) return null;
    return { year: parsed.year, selectedMonth: parsed.selectedMonth, selectedModule: parsed.selectedModule, activeTab: parsed.activeTab || "transcricao" };
  } catch { return null; }
}

export function LancamentosWorkspace() {
  const today = new Date();
  const { company, companies, selectCompany } = useAccountingCompany();
  const initialContext = readLastContext(company.id);
  const [year, setYear] = useState(() => initialContext?.year ?? String(today.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(() => initialContext?.selectedMonth ?? String(today.getMonth() + 1).padStart(2, "0"));
  const [selectedModule, setSelectedModule] = useState<ModuleKey>(() => initialContext?.selectedModule ?? "despesas");
  const [activeTab, setActiveTab] = useState(() => initialContext?.activeTab ?? "transcricao");
  const previousCompanyRef = useRef(company.id);
  const skipContextSaveRef = useRef(false);
  const [filesByModule, setFilesByModule] = useState<Record<ModuleKey, File[]>>({ folha: [], compras: [], faturamento: [], despesas: [] });
  const [yearStatuses, setYearStatuses] = useState<Record<string, Record<ModuleKey, WorkspaceStatus>>>({});
  const [persistedModuleCounts, setPersistedModuleCounts] = useState<Record<ModuleKey, number>>({ despesas: 0, folha: 0, compras: 0, faturamento: 0 });
  const [transcriptionRows, setTranscriptionRows] = useState<TranscriptionRow[]>([]);
  const [launchRows, setLaunchRows] = useState<LaunchRow[]>([]);
  const [moduleCompetenceWarning, setModuleCompetenceWarning] = useState<{ module: ModuleKey; files: File[]; month: string; year: string } | null>(null);
  const [genericLoaded, setGenericLoaded] = useState(false);

  useEffect(() => {
    if (previousCompanyRef.current === company.id) return;
    previousCompanyRef.current = company.id;
    skipContextSaveRef.current = true;
    const saved = readLastContext(company.id);
    setYear(saved?.year ?? String(today.getFullYear()));
    setSelectedMonth(saved?.selectedMonth ?? String(today.getMonth() + 1).padStart(2, "0"));
    setSelectedModule(saved?.selectedModule ?? "despesas");
    setActiveTab(saved?.activeTab ?? "transcricao");
  }, [company.id]);

  useEffect(() => {
    if (skipContextSaveRef.current) { skipContextSaveRef.current = false; return; }
    localStorage.setItem(contextKey(company.id), JSON.stringify({ year, selectedMonth, selectedModule, activeTab } satisfies LastContext));
  }, [activeTab, company.id, selectedModule, selectedMonth, year]);

  const handleExpenseFileCount = useCallback((count: number) => setPersistedModuleCounts(current => current.despesas === count ? current : { ...current, despesas: count }), []);
  const selectedMonthLabel = useMemo(() => months.find(month => month.key === selectedMonth)?.label ?? "Competência", [selectedMonth]);
  const activeModuleLabel = useMemo(() => modules.find(module => module.key === selectedModule)?.label ?? "Faturamento", [selectedModule]);

  const statusKey = `${company.id}:${year}:module-statuses`;
  useEffect(() => { void loadWorkspaceData<Record<string, Record<ModuleKey, WorkspaceStatus>>>(statusKey).then(saved => setYearStatuses(saved ?? {})); }, [statusKey]);
  const setModuleStatus = useCallback((module: ModuleKey, status: WorkspaceStatus) => {
    setYearStatuses(current => {
      const next = { ...current, [selectedMonth]: { ...(current[selectedMonth] ?? emptyStatuses()), [module]: status } };
      void saveWorkspaceData(statusKey, next);
      return next;
    });
  }, [selectedMonth, statusKey]);

  const genericScope = `${company.id}:${year}:${selectedMonth}:faturamento`;
  const genericDataKey = `${genericScope}:workspace`;
  useEffect(() => {
    if (selectedModule !== "faturamento") return;
    setGenericLoaded(false);
    Promise.all([loadWorkspaceData<{ transcriptionRows: TranscriptionRow[]; launchRows: LaunchRow[] }>(genericDataKey), loadWorkspaceFiles(genericScope)]).then(([saved, storedFiles]) => {
      setTranscriptionRows(saved?.transcriptionRows ?? []);
      setLaunchRows(saved?.launchRows ?? []);
      setFilesByModule(current => ({ ...current, faturamento: storedFiles }));
      setGenericLoaded(true);
    });
  }, [genericDataKey, genericScope, selectedModule]);
  useEffect(() => {
    if (genericLoaded && selectedModule === "faturamento") void saveWorkspaceData(genericDataKey, { transcriptionRows, launchRows });
  }, [genericDataKey, genericLoaded, launchRows, selectedModule, transcriptionRows]);

  const applyModuleFiles = (module: ModuleKey, selectedFiles: File[], target?: { month: string; year: string }) => {
    setFilesByModule(current => ({ ...current, [module]: [...current[module], ...selectedFiles] }));
    setSelectedModule(module);
    setActiveTab("transcricao");
    if (target && (target.month !== selectedMonth || target.year !== year)) {
      void saveWorkspaceFiles(`${company.id}:${target.year}:${target.month}:${module}`, selectedFiles);
      const targetKey = `${company.id}:${target.year}:module-statuses`;
      void loadWorkspaceData<Record<string, Record<ModuleKey, WorkspaceStatus>>>(targetKey).then(saved => saveWorkspaceData(targetKey, { ...(saved ?? {}), [target.month]: { ...(saved?.[target.month] ?? emptyStatuses()), [module]: "review" } }));
    } else {
      void saveWorkspaceFiles(`${company.id}:${year}:${selectedMonth}:${module}`, selectedFiles);
      setModuleStatus(module, "review");
    }
  };

  const handleModuleFiles = async (module: ModuleKey, event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    const detected = (await Promise.all(selectedFiles.map(detectWorkbookCompetence))).find(Boolean);
    if (detected && (detected.month !== selectedMonth || detected.year !== year)) {
      setModuleCompetenceWarning({ module, files: selectedFiles, ...detected });
      return;
    }
    applyModuleFiles(module, selectedFiles);
  };

  const updateTranscription = (id: number, field: keyof TranscriptionRow, value: string) => setTranscriptionRows(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  const updateLaunch = (id: number, field: keyof LaunchRow, value: string) => setLaunchRows(rows => rows.map(row => row.id === id ? { ...row, [field]: value } : row));
  const addTranscriptionRow = () => setTranscriptionRows(rows => [...rows, { id: Date.now(), code: "", description: "", value: "", classification: "" }]);
  const addLaunchRow = () => setLaunchRows(rows => [...rows, { id: Date.now(), date: "", history: "", debit: "", credit: "", debitDescription: "", debitCostCenter: "", creditDescription: "", creditCostCenter: "", value: "" }]);

  return <div className="mx-auto w-full max-w-[1720px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
    <header className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
      <div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Operação contábil</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Lançamentos</h1><p className="mt-1 truncate text-sm text-muted-foreground">{company.name}<span className="px-2 text-border">/</span>{selectedMonthLabel} de {year}</p></div>
      <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto"><CompanySelector company={company} companies={companies} onSelect={selectCompany} /></div>
    </header>

    <div className="grid min-h-[720px] lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="border-b border-border py-5 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:border-b-0 lg:border-r lg:pr-4">
        <div className="mb-3 flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-cyan-700 dark:text-cyan-300">Competências</p><Select value={year} onValueChange={setYear}><SelectTrigger className="h-8 w-24 border-border bg-transparent text-xs shadow-none"><SelectValue /></SelectTrigger><SelectContent>{[today.getFullYear() - 2, today.getFullYear() - 1, today.getFullYear()].map(item => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent></Select></div>
        <nav className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-1" aria-label="Competências">
          {months.map(month => {
            const active = selectedMonth === month.key;
            const statuses = yearStatuses[month.key] ?? emptyStatuses();
            const complete = Object.values(statuses).filter(status => status === "done").length;
            const hasWork = Object.values(statuses).some(status => status !== "waiting");
            return <button key={month.key} type="button" onClick={() => setSelectedMonth(month.key)} className={cn("group flex min-h-10 flex-col justify-center rounded-sm px-3 py-2 text-left text-sm transition-all duration-200", active ? "bg-cyan-500/15 text-cyan-800 dark:bg-cyan-400/15 dark:text-cyan-200" : "text-cyan-700/80 hover:bg-cyan-500/10 hover:text-cyan-800 dark:text-cyan-300/75 dark:hover:text-cyan-200")}><span className="flex w-full items-center justify-between"><span>{month.label}</span><span className={cn("h-2 w-2 rounded-full", complete === 4 ? "bg-emerald-500" : hasWork ? "bg-amber-400" : "bg-muted-foreground/25")} /></span><span className="grid grid-rows-[0fr] text-[10px] opacity-0 transition-all group-hover:mt-1 group-hover:grid-rows-[1fr] group-hover:opacity-100"><span className="overflow-hidden">{complete} de 4 módulos concluídos</span></span></button>;
          })}
        </nav>
      </aside>

      <main className="min-w-0 py-5 lg:pl-6">
        <h2 className="text-xl font-semibold tracking-tight text-cyan-800 dark:text-cyan-200">{selectedMonthLabel} de {year}</h2>
        <nav className="mt-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Módulos contábeis">
          {modules.map(module => {
            const status = (yearStatuses[selectedMonth] ?? emptyStatuses())[module.key];
            const statusLabel = status === "done" ? "Concluído" : status === "review" ? "Aguardando conferência" : "Aguardando importação";
            return <button key={module.key} type="button" onClick={() => setSelectedModule(module.key)} className={cn("grid min-h-24 grid-cols-[minmax(0,1fr)_30%] overflow-hidden rounded-md bg-background text-left transition-colors", selectedModule === module.key ? "bg-muted/80" : "hover:bg-muted/45")}><span className="flex flex-col justify-center px-4 py-3"><span className="text-sm font-medium text-foreground">{module.label}</span><span className="mt-1 text-xs text-muted-foreground">{persistedModuleCounts[module.key] || filesByModule[module.key].length ? `${persistedModuleCounts[module.key] || filesByModule[module.key].length} arquivo(s)` : statusLabel}</span></span><span className={cn("flex items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-wide", status === "done" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : status === "review" ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground")}>{statusLabel}</span></button>;
          })}
        </nav>

        {selectedModule === "despesas" ? (
          <DespesasWorkspace key={`${company.id}-${year}-${selectedMonth}`} company={company.id} month={selectedMonth} year={year} onFileCountChange={handleExpenseFileCount} onStatusChange={status => setModuleStatus("despesas", status)} onCompetenceChange={(nextMonth, nextYear) => { setYear(nextYear); setSelectedMonth(nextMonth); }} />
        ) : selectedModule === "folha" ? (
          <FolhaWorkspace key={`${company.id}-${year}-${selectedMonth}`} company={company.id} month={selectedMonth} year={year} onStatusChange={status => setModuleStatus("folha", status)} onCompetenceChange={(nextMonth, nextYear) => { setYear(nextYear); setSelectedMonth(nextMonth); }} />
        ) : selectedModule === "compras" ? (
          <ComprasWorkspace key={`${company.id}-${year}-${selectedMonth}`} company={company.id} month={selectedMonth} year={year} onStatusChange={status => setModuleStatus("compras", status)} onCompetenceChange={(nextMonth, nextYear) => { setYear(nextYear); setSelectedMonth(nextMonth); }} />
        ) : (
          <GenericFaturamentoWorkspace
            label={activeModuleLabel}
            monthLabel={selectedMonthLabel}
            year={year}
            files={filesByModule.faturamento}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            transcriptionRows={transcriptionRows}
            launchRows={launchRows}
            updateTranscription={updateTranscription}
            updateLaunch={updateLaunch}
            addTranscriptionRow={addTranscriptionRow}
            addLaunchRow={addLaunchRow}
            handleFiles={event => void handleModuleFiles("faturamento", event)}
            markDone={() => setModuleStatus("faturamento", "done")}
          />
        )}
      </main>
    </div>

    <Dialog open={Boolean(moduleCompetenceWarning)} onOpenChange={open => !open && setModuleCompetenceWarning(null)}>
      <DialogContent><DialogHeader><DialogTitle>Competência diferente do documento</DialogTitle><DialogDescription>O arquivo pertence a {moduleCompetenceWarning?.month}/{moduleCompetenceWarning?.year}, mas a tela está em {selectedMonth}/{year}.</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">Ao continuar, a competência correta será aberta automaticamente antes do processamento.</p><DialogFooter><Button variant="outline" onClick={() => setModuleCompetenceWarning(null)}>Voltar</Button><Button onClick={() => { if (!moduleCompetenceWarning) return; const warning = moduleCompetenceWarning; applyModuleFiles(warning.module, warning.files, warning); setSelectedMonth(warning.month); setYear(warning.year); setModuleCompetenceWarning(null); }}>Importar assim mesmo</Button></DialogFooter></DialogContent>
    </Dialog>
  </div>;
}

function GenericFaturamentoWorkspace({ label, monthLabel, year, files, activeTab, setActiveTab, transcriptionRows, launchRows, updateTranscription, updateLaunch, addTranscriptionRow, addLaunchRow, handleFiles, markDone }: {
  label: string;
  monthLabel: string;
  year: string;
  files: File[];
  activeTab: string;
  setActiveTab: (value: string) => void;
  transcriptionRows: TranscriptionRow[];
  launchRows: LaunchRow[];
  updateTranscription: (id: number, field: keyof TranscriptionRow, value: string) => void;
  updateLaunch: (id: number, field: keyof LaunchRow, value: string) => void;
  addTranscriptionRow: () => void;
  addLaunchRow: () => void;
  handleFiles: (event: ChangeEvent<HTMLInputElement>) => void;
  markDone: () => void;
}) {
  return <>
    <section className="mt-8 rounded-md border border-border bg-background p-6" aria-label="Importação de documentos"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-base font-semibold text-foreground">{label} de {monthLabel} de {year}</h3><label className="cursor-pointer rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">Importar {label.toLowerCase()} de {monthLabel} de {year}<input type="file" multiple accept=".pdf,.xlsx,.xls,.csv" className="sr-only" onChange={handleFiles} /></label></div><div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">{files.length ? <div className="flex flex-wrap gap-4">{files.map((file, index) => <span key={`${file.name}-${index}`} className="text-foreground">{file.name}</span>)}</div> : "Nenhum arquivo selecionado nesta competência."}</div></section>

    <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-8">
      <AccountingWorkflowSteps steps={[{ value: "transcricao", label: "Transcrição", count: transcriptionRows.length }, { value: "lancamentos", label: "Lançamentos", count: launchRows.length }, { value: "conferencia", label: "Conferência", count: 0 }]} />

      <TabsContent value="transcricao" className="mt-6"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-base font-semibold text-foreground">{label} · Transcrição</h3><p className="mt-1 text-sm text-muted-foreground">Documento original e dados extraídos no mesmo espaço.</p></div><Badge variant="outline" className="rounded-sm border-border font-normal text-muted-foreground dark:border-white/15">Edição local ativa</Badge></div><section className="min-w-0 rounded-md border border-border bg-background"><div className="border-b border-border px-4 py-3"><h3 className="text-sm font-semibold text-foreground">Transcrição editável</h3><p className="mt-1 text-xs text-muted-foreground">Clique em qualquer célula para corrigir.</p></div><div className="overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-sm"><thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="w-24 border-b border-r border-border px-3 py-2 font-medium">Código</th><th className="border-b border-r border-border px-3 py-2 font-medium">Descrição extraída</th><th className="w-32 border-b border-r border-border px-3 py-2 text-right font-medium">Valor</th><th className="w-48 border-b border-border px-3 py-2 font-medium">Classificação</th></tr></thead><tbody>{transcriptionRows.map(row => <tr key={row.id} className="h-8 border-b border-border last:border-b-0"><td className="border-r border-border"><Input className={inputCellClass} value={row.code} onChange={event => updateTranscription(row.id, "code", event.target.value)} /></td><td className="border-r border-border"><Input className={inputCellClass} value={row.description} onChange={event => updateTranscription(row.id, "description", event.target.value)} /></td><td className="border-r border-border"><Input className={cn(inputCellClass, "text-right tabular-nums")} value={row.value} onChange={event => updateTranscription(row.id, "value", event.target.value)} /></td><td><Input className={inputCellClass} value={row.classification} onChange={event => updateTranscription(row.id, "classification", event.target.value)} /></td></tr>)}{!transcriptionRows.length && <tr><td colSpan={4} className="h-32 px-4 text-center text-sm text-muted-foreground">Nenhum dado transcrito. Importe um documento ou adicione uma linha manualmente.</td></tr>}</tbody></table></div><div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"><div className="text-xs text-muted-foreground">{transcriptionRows.length} linhas</div><Button variant="outline" size="sm" onClick={addTranscriptionRow}>Adicionar linha</Button></div></section></TabsContent>

      <TabsContent value="lancamentos" className="mt-6"><div className="mb-4 flex flex-wrap items-end justify-between gap-3"><div><h3 className="text-base font-semibold text-foreground">Planilha de lançamentos</h3><p className="mt-1 text-sm text-muted-foreground">Mesmo formato do arquivo final para o Calima.</p></div><Badge variant="outline">{launchRows.length} lançamentos</Badge></div><section className="overflow-hidden rounded-md border border-border bg-background"><div className="overflow-x-auto"><table className="w-full min-w-[900px] table-fixed border-collapse text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[10%] border-b border-r border-border px-2 py-2">Data</th><th className="w-[35%] border-b border-r border-border px-2 py-2">Histórico variável</th><th className="w-[10%] border-b border-r border-border px-2 py-2">Débito</th><th className="w-[9%] border-b border-r border-border px-2 py-2">C.C. D.</th><th className="w-[10%] border-b border-r border-border px-2 py-2">Crédito</th><th className="w-[9%] border-b border-r border-border px-2 py-2">C.C. C.</th><th className="w-[17%] border-b border-border px-2 py-2 text-right">Valor</th></tr></thead><tbody>{launchRows.map(row => <tr key={row.id} className="h-8 border-b border-border"><td className="border-r border-border"><Input className={inputCellClass} value={row.date} onChange={event => updateLaunch(row.id, "date", event.target.value)} /></td><td className="border-r border-border"><Input className={inputCellClass} value={row.history} onChange={event => updateLaunch(row.id, "history", event.target.value)} /></td><td className="border-r border-border"><GenericAccountCell code={row.debit} description={row.debitDescription} side="debit" onChange={value => updateLaunch(row.id, "debit", value)} /></td><td className="border-r border-border"><Input className={inputCellClass} value={row.debitCostCenter} onChange={event => updateLaunch(row.id, "debitCostCenter", event.target.value)} /></td><td className="border-r border-border"><GenericAccountCell code={row.credit} description={row.creditDescription} side="credit" onChange={value => updateLaunch(row.id, "credit", value)} /></td><td className="border-r border-border"><Input className={inputCellClass} value={row.creditCostCenter} onChange={event => updateLaunch(row.id, "creditCostCenter", event.target.value)} /></td><td><Input className={cn(inputCellClass, "text-right tabular-nums")} value={row.value} onChange={event => updateLaunch(row.id, "value", event.target.value)} /></td></tr>)}{!launchRows.length && <tr><td colSpan={7} className="h-32 text-center text-muted-foreground">Nenhum lançamento gerado.</td></tr>}</tbody></table></div><div className="flex justify-end border-t border-border px-4 py-3"><Button variant="outline" size="sm" onClick={addLaunchRow}>Adicionar lançamento</Button></div></section></TabsContent>

      <TabsContent value="conferencia" className="mt-6"><section className="overflow-hidden rounded-md border border-border bg-background"><div className="grid min-h-32 place-items-center px-4 text-center text-sm text-muted-foreground">A conferência de Faturamento será estruturada na próxima etapa.</div><div className="flex justify-end border-t border-border p-4"><Button onClick={markDone}>Marcar como OK</Button></div></section></TabsContent>
    </Tabs>
  </>;
}

function GenericAccountCell({ code, description, side, onChange }: { code: string; description: string; side: "debit" | "credit"; onChange: (value: string) => void }) {
  return <AccountCodeHover code={code} description={description} side={side}><div className="flex h-8 cursor-help items-center gap-1 pr-1"><Input className={inputCellClass} value={code} onChange={event => onChange(event.target.value)} /><Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /></div></AccountCodeHover>;
}
