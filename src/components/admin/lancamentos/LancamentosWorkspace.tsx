import { ChangeEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { DespesasWorkspace, WorkspaceStatus } from "./DespesasWorkspace";
import { loadWorkspaceData, saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";
import { useAccountingCompany } from "@/hooks/lancamentos/useAccountingCompany";
import { CompanySelector } from "./CompanySelector";
import { detectWorkbookCompetence } from "@/lib/lancamentos/expenseWorkbook";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ModuleKey = "folha" | "compras" | "faturamento" | "despesas";
interface MonthItem {
  key: string;
  label: string;
}

interface ModuleItem {
  key: ModuleKey;
  label: string;
  acceptedFiles: string;
}

interface TranscriptionRow {
  id: number;
  code: string;
  description: string;
  value: string;
  classification: string;
}

interface LaunchRow {
  id: number;
  date: string;
  history: string;
  debit: string;
  credit: string;
  debitDescription: string;
  debitCostCenter: string;
  creditDescription: string;
  creditCostCenter: string;
  value: string;
}

const months: MonthItem[] = [
  { key: "01", label: "Janeiro" },
  { key: "02", label: "Fevereiro" },
  { key: "03", label: "Março" },
  { key: "04", label: "Abril" },
  { key: "05", label: "Maio" },
  { key: "06", label: "Junho" },
  { key: "07", label: "Julho" },
  { key: "08", label: "Agosto" },
  { key: "09", label: "Setembro" },
  { key: "10", label: "Outubro" },
  { key: "11", label: "Novembro" },
  { key: "12", label: "Dezembro" },
];

const modules: ModuleItem[] = [
  { key: "despesas", label: "Despesas", acceptedFiles: ".pdf,.xlsx,.xls,.csv" },
  { key: "folha", label: "Folha de pagamento", acceptedFiles: ".pdf,.xlsx,.xls" },
  { key: "compras", label: "Compras", acceptedFiles: ".pdf,.xlsx,.xls,.csv" },
  { key: "faturamento", label: "Faturamento", acceptedFiles: ".pdf,.xlsx,.xls,.csv" },
];

const emptyStatuses = (): Record<ModuleKey, WorkspaceStatus> => ({ despesas: "waiting", folha: "waiting", compras: "waiting", faturamento: "waiting" });

const inputCellClass =
  "h-8 rounded-none border-0 bg-transparent px-2 shadow-none focus:border-foreground/30 focus:ring-foreground/10 focus-visible:ring-1 focus-visible:ring-foreground/30 dark:bg-transparent dark:focus:border-white/30 dark:focus:ring-white/10";

export function LancamentosWorkspace() {
  const today = new Date();
  const { company, companies, selectCompany } = useAccountingCompany();
  const [year, setYear] = useState(String(today.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [selectedModule, setSelectedModule] = useState<ModuleKey>("despesas");
  const [activeTab, setActiveTab] = useState("transcricao");
  const [filesByModule, setFilesByModule] = useState<Record<ModuleKey, File[]>>({
    folha: [],
    compras: [],
    faturamento: [],
    despesas: [],
  });
  const [yearStatuses, setYearStatuses] = useState<Record<string, Record<ModuleKey, WorkspaceStatus>>>({});
  const [persistedModuleCounts, setPersistedModuleCounts] = useState<Record<ModuleKey, number>>({ despesas: 0, folha: 0, compras: 0, faturamento: 0 });
  const [transcriptionRows, setTranscriptionRows] = useState<TranscriptionRow[]>([]);
  const [launchRows, setLaunchRows] = useState<LaunchRow[]>([]);
  const [moduleCompetenceWarning, setModuleCompetenceWarning] = useState<{ module: ModuleKey; files: File[]; month: string; year: string } | null>(null);
  const handleExpenseFileCount = useCallback((count: number) => {
    setPersistedModuleCounts((current) => current.despesas === count ? current : { ...current, despesas: count });
  }, []);

  const selectedMonthLabel = useMemo(
    () => months.find((month) => month.key === selectedMonth)?.label ?? "Competência",
    [selectedMonth],
  );

  const activeModuleLabel = useMemo(
    () => modules.find((module) => module.key === selectedModule)?.label ?? "Folha",
    [selectedModule],
  );

  const applyModuleFiles = (module: ModuleKey, selectedFiles: File[], target?: { month: string; year: string }) => {
    setFilesByModule((current) => ({ ...current, [module]: [...current[module], ...selectedFiles] }));
    setSelectedModule(module); setActiveTab("transcricao");
    if (target && (target.month !== selectedMonth || target.year !== year)) {
      const targetKey = `${company.id}:${target.year}:module-statuses`;
      void loadWorkspaceData<Record<string, Record<ModuleKey, WorkspaceStatus>>>(targetKey).then(saved => saveWorkspaceData(targetKey, { ...(saved ?? {}), [target.month]: { ...(saved?.[target.month] ?? emptyStatuses()), [module]: "review" } }));
    } else setModuleStatus(module, "review");
  };
  const handleModuleFiles = async (module: ModuleKey, event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedFiles.length) return;
    const detected = (await Promise.all(selectedFiles.map(detectWorkbookCompetence))).find(Boolean);
    if (detected && (detected.month !== selectedMonth || detected.year !== year)) { setModuleCompetenceWarning({ module, files: selectedFiles, ...detected }); return; }
    applyModuleFiles(module, selectedFiles);
  };

  const statusKey = `${company.id}:${year}:module-statuses`;
  useEffect(() => { void loadWorkspaceData<Record<string, Record<ModuleKey, WorkspaceStatus>>>(statusKey).then(saved => setYearStatuses(saved ?? {})); }, [statusKey]);
  const setModuleStatus = useCallback((module: ModuleKey, status: WorkspaceStatus) => { setYearStatuses(current => { const next = { ...current, [selectedMonth]: { ...(current[selectedMonth] ?? emptyStatuses()), [module]: status } }; void saveWorkspaceData(statusKey, next); return next; }); }, [selectedMonth, statusKey]);

  const updateTranscription = (id: number, field: keyof TranscriptionRow, value: string) => {
    setTranscriptionRows((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)),
    );
  };

  const updateLaunch = (id: number, field: keyof LaunchRow, value: string) => {
    setLaunchRows((rows) => rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)));
  };

  const addTranscriptionRow = () => {
    setTranscriptionRows((rows) => [
      ...rows,
      { id: Date.now(), code: "", description: "", value: "", classification: "" },
    ]);
  };

  const addLaunchRow = () => {
    setLaunchRows((rows) => [
      ...rows,
      {
        id: Date.now(),
        date: "",
        history: "",
        debit: "",
        credit: "",
        debitDescription: "",
        debitCostCenter: "",
        creditDescription: "",
        creditCostCenter: "",
        value: "",
      },
    ]);
  };

  return (
    <div className="mx-auto w-full max-w-[1720px] px-4 pb-12 pt-5 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 border-b border-border pb-5 xl:flex-row xl:items-end xl:justify-between">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Operação contábil
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Lançamentos
          </h1>
          <p className="mt-1 truncate text-sm text-muted-foreground">
            {company.name}
            <span className="px-2 text-border">/</span>
            {selectedMonthLabel} de {year}
            <span className="px-2 text-border">/</span>
            Não iniciado
          </p>
        </div>

        <div className="flex w-full flex-col gap-3 sm:flex-row xl:w-auto">
          <CompanySelector company={company} companies={companies} onSelect={selectCompany} />
        </div>
      </header>

      <div className="grid min-h-[720px] lg:grid-cols-[220px_minmax(0,1fr)]">
        <aside className="border-b border-border py-5 lg:sticky lg:top-0 lg:h-screen lg:self-start lg:border-b-0 lg:border-r lg:pr-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Competências</p>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger className="h-8 w-24 border-border bg-transparent text-xs shadow-none"><SelectValue /></SelectTrigger>
              <SelectContent>{[today.getFullYear() - 2, today.getFullYear() - 1, today.getFullYear()].map((item) => <SelectItem key={item} value={String(item)}>{item}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <nav className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-1" aria-label="Competências">
            {months.map((month) => {
              const active = selectedMonth === month.key;
              const statuses = yearStatuses[month.key] ?? emptyStatuses();
              const complete = Object.values(statuses).filter(status => status === "done").length;
              const hasWork = Object.values(statuses).some(status => status !== "waiting");
              return (
                <button
                  key={month.key}
                  type="button"
                  onClick={() => setSelectedMonth(month.key)}
                  className={cn(
                    "group flex min-h-10 flex-col justify-center rounded-sm px-3 py-2 text-left text-sm transition-all duration-200",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="flex w-full items-center justify-between"><span>{month.label}</span><span className={cn("h-2 w-2 rounded-full", complete === 4 ? "bg-emerald-500" : hasWork ? "bg-amber-400" : "bg-muted-foreground/25")} /></span>
                  <span className={cn("grid grid-rows-[0fr] text-[10px] opacity-0 transition-all group-hover:mt-1 group-hover:grid-rows-[1fr] group-hover:opacity-100", active ? "text-background/70" : "text-muted-foreground")}><span className="overflow-hidden">{complete} de 4 módulos concluídos</span></span>
                </button>
              );
            })}
          </nav>

        </aside>

        <main className="min-w-0 py-5 lg:pl-6">
          <h2 className="text-xl font-semibold tracking-tight text-foreground">{selectedMonthLabel} de {year}</h2>

          <nav className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Módulos contábeis">
            {modules.map((module) => {
              const status = (yearStatuses[selectedMonth] ?? emptyStatuses())[module.key];
              const statusLabel = status === "done" ? "Concluído" : status === "review" ? "Aguardando conferência" : "Aguardando importação";
              return (
              <button
                key={module.key}
                type="button"
                onClick={() => setSelectedModule(module.key)}
                className={cn(
                  "grid min-h-20 grid-cols-[minmax(0,1fr)_30%] overflow-hidden rounded-md bg-background text-left transition-colors",
                  selectedModule === module.key ? "bg-muted/80" : "hover:bg-muted/45",
                )}
              >
                <span className="flex flex-col justify-center px-4 py-3"><span className="text-sm font-medium text-foreground">{module.label}</span><span className="mt-1 text-xs text-muted-foreground">{persistedModuleCounts[module.key] || filesByModule[module.key].length ? `${persistedModuleCounts[module.key] || filesByModule[module.key].length} arquivo(s)` : statusLabel}</span></span>
                <span className={cn("flex items-center justify-center px-2 text-center text-[10px] font-semibold uppercase tracking-wide", status === "done" ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300" : status === "review" ? "bg-amber-400/20 text-amber-700 dark:text-amber-300" : "bg-muted text-muted-foreground")}>{statusLabel}</span>
              </button>
            )})}
          </nav>

          {selectedModule === "despesas" ? (
            <DespesasWorkspace key={`${company.id}-${year}-${selectedMonth}`} company={company.id} month={selectedMonth} year={year} onFileCountChange={handleExpenseFileCount} onStatusChange={(status) => setModuleStatus("despesas", status)} onCompetenceChange={(nextMonth, nextYear) => { setYear(nextYear); setSelectedMonth(nextMonth); }} />
          ) : (
          <>
          <section className="mt-5 rounded-md border border-border bg-background p-5" aria-label="Importação de documentos">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><h3 className="text-base font-semibold text-foreground">{activeModuleLabel} de {selectedMonthLabel} de {year}</h3><label className="cursor-pointer rounded-md border border-border px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted">Importar {activeModuleLabel.toLowerCase()} de {selectedMonthLabel} de {year}<input type="file" multiple accept={modules.find((module) => module.key === selectedModule)?.acceptedFiles} className="sr-only" onChange={(event) => void handleModuleFiles(selectedModule, event)} /></label></div>
            <div className="mt-4 border-t border-border pt-4 text-sm text-muted-foreground">{filesByModule[selectedModule].length ? <div className="flex flex-wrap gap-4">{filesByModule[selectedModule].map((file, index) => <span key={`${file.name}-${index}`} className="text-foreground">{file.name}</span>)}</div> : "Nenhum arquivo selecionado nesta competência."}</div>
          </section>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid h-auto w-full grid-cols-3 gap-2 bg-transparent p-0 shadow-none dark:bg-transparent">
              {[
                ["transcricao", "Transcrição", transcriptionRows.length],
                ["lancamentos", "Lançamentos", launchRows.length],
                ["conferencia", "Conferência", 0],
              ].map(([value, label, count]) => (
                <TabsTrigger
                  key={String(value)}
                  value={String(value)}
                  className="min-h-14 rounded-md border border-border bg-transparent px-4 text-muted-foreground shadow-none data-[state=active]:bg-foreground data-[state=active]:text-background data-[state=active]:shadow-none"
                >
                  {label}
                  <span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] tabular-nums text-muted-foreground">
                    {count}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="transcricao" className="mt-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">{activeModuleLabel} · Transcrição</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Documento original e dados extraídos no mesmo espaço.
                  </p>
                </div>
                <Badge variant="outline" className="rounded-sm border-border font-normal text-muted-foreground dark:border-white/15">
                  Edição local ativa
                </Badge>
              </div>

                <section className="min-w-0 rounded-md border border-border bg-background">
                  <div className="border-b border-border px-4 py-3">
                    <h3 className="text-sm font-semibold text-foreground">Transcrição editável</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Clique em qualquer célula para corrigir.</p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[720px] border-collapse text-sm">
                      <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                        <tr>
                          <th className="w-24 border-b border-r border-border px-3 py-2 font-medium">Código</th>
                          <th className="border-b border-r border-border px-3 py-2 font-medium">Descrição extraída</th>
                          <th className="w-32 border-b border-r border-border px-3 py-2 text-right font-medium">Valor</th>
                          <th className="w-48 border-b border-border px-3 py-2 font-medium">Classificação</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transcriptionRows.map((row) => (
                          <tr key={row.id} className="border-b border-border last:border-b-0">
                            <td className="border-r border-border"><Input className={inputCellClass} value={row.code} onChange={(event) => updateTranscription(row.id, "code", event.target.value)} /></td>
                            <td className="border-r border-border"><Input className={inputCellClass} value={row.description} onChange={(event) => updateTranscription(row.id, "description", event.target.value)} /></td>
                            <td className="border-r border-border"><Input className={cn(inputCellClass, "text-right tabular-nums")} value={row.value} onChange={(event) => updateTranscription(row.id, "value", event.target.value)} /></td>
                            <td><Input className={inputCellClass} value={row.classification} onChange={(event) => updateTranscription(row.id, "classification", event.target.value)} /></td>
                          </tr>
                        ))}
                        {!transcriptionRows.length && (
                          <tr>
                            <td colSpan={4} className="h-32 px-4 text-center text-sm text-muted-foreground">
                              Nenhum dado transcrito. Importe um documento ou adicione uma linha manualmente.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                    <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                      <span>{transcriptionRows.length} linhas</span>
                      <span>Totais serão calculados após a transcrição</span>
                    </div>
                    <Button className="border-border bg-transparent text-foreground shadow-none hover:bg-muted dark:border-white/15 dark:hover:bg-white/5" variant="outline" size="sm" onClick={addTranscriptionRow}>Adicionar linha</Button>
                  </div>
                </section>
            </TabsContent>

            <TabsContent value="lancamentos" className="mt-5">
              <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h3 className="text-base font-semibold text-foreground">Planilha de lançamentos</h3>
                  <p className="mt-1 text-sm text-muted-foreground">Mesmo formato do arquivo final para o Calima.</p>
                </div>
                <Badge variant="outline" className="rounded-sm border-border font-normal text-muted-foreground dark:border-white/15">
                  {launchRows.length} lançamentos
                </Badge>
              </div>

              <section className="overflow-hidden rounded-md border border-border bg-background">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[1280px] border-collapse text-sm">
                    <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
                      <tr>
                        {[
                          ["Data", "w-32"],
                          ["Histórico variável", "min-w-[310px]"],
                          ["Débito", "w-24"],
                          ["Descrição débito", "min-w-[200px]"],
                          ["C.C. débito", "w-28"],
                          ["Crédito", "w-24"],
                          ["Descrição crédito", "min-w-[200px]"],
                          ["C.C. crédito", "w-28"],
                          ["Valor", "w-36 text-right"],
                        ].map(([label, width]) => (
                          <th key={label} className={cn("border-b border-r border-border px-3 py-2 font-medium last:border-r-0", width)}>{label}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {launchRows.map((row) => (
                        <tr key={row.id} className="border-b border-border last:border-b-0">
                          {(
                            [
                              ["date", row.date],
                              ["history", row.history],
                              ["debit", row.debit],
                              ["debitDescription", row.debitDescription],
                              ["debitCostCenter", row.debitCostCenter],
                              ["credit", row.credit],
                              ["creditDescription", row.creditDescription],
                              ["creditCostCenter", row.creditCostCenter],
                              ["value", row.value],
                            ] as [keyof LaunchRow, string][]
                          ).map(([field, value]) => (
                            <td key={field} className="border-r border-border last:border-r-0">
                              <Input
                                className={cn(inputCellClass, field === "value" && "text-right tabular-nums")}
                                value={value}
                                onChange={(event) => updateLaunch(row.id, field, event.target.value)}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                      {!launchRows.length && (
                        <tr>
                          <td colSpan={9} className="h-32 px-4 text-center text-sm text-muted-foreground">
                            Nenhum lançamento gerado. Revise a transcrição ou adicione um lançamento manualmente.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3">
                  <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                    <span>Débitos, créditos e diferenças serão calculados após a geração</span>
                  </div>
                  <Button className="border-border bg-transparent text-foreground shadow-none hover:bg-muted dark:border-white/15 dark:hover:bg-white/5" variant="outline" size="sm" onClick={addLaunchRow}>Adicionar lançamento</Button>
                </div>
              </section>
            </TabsContent>

            <TabsContent value="conferencia" className="mt-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground">Conferência da competência</h3>
                <p className="mt-1 text-sm text-muted-foreground">Somente divergências e decisões que exigem atenção.</p>
              </div>
              <section className="overflow-hidden rounded-md border border-border bg-background">
                <div className="grid grid-cols-[minmax(120px,0.4fr)_minmax(220px,1fr)_minmax(160px,0.6fr)] bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <span>Origem</span><span>Conferência</span><span>Resultado</span>
                </div>
                <div className="grid min-h-32 place-items-center border-t border-border px-4 text-center text-sm text-muted-foreground">
                  A conferência será exibida quando houver documentos processados e lançamentos gerados.
                </div>
                <div className="flex justify-end border-t border-border p-4"><Button onClick={() => setModuleStatus(selectedModule, "done")}>Marcar como OK</Button></div>
              </section>
            </TabsContent>
          </Tabs>
          </>
          )}
        </main>
      </div>
      <Dialog open={Boolean(moduleCompetenceWarning)} onOpenChange={open => !open && setModuleCompetenceWarning(null)}><DialogContent><DialogHeader><DialogTitle>Competência diferente do documento</DialogTitle><DialogDescription>O arquivo pertence a {moduleCompetenceWarning?.month}/{moduleCompetenceWarning?.year}, mas a tela está em {selectedMonth}/{year}.</DialogDescription></DialogHeader><p className="text-sm text-muted-foreground">Ao continuar, a competência correta será aberta automaticamente antes do processamento.</p><DialogFooter><Button variant="outline" onClick={() => setModuleCompetenceWarning(null)}>Voltar</Button><Button onClick={() => { if (!moduleCompetenceWarning) return; const warning = moduleCompetenceWarning; applyModuleFiles(warning.module, warning.files, warning); setSelectedMonth(warning.month); setYear(warning.year); setModuleCompetenceWarning(null); }}>Importar assim mesmo</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
