import { ChangeEvent, useMemo, useState } from "react";
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
import { DespesasWorkspace } from "./DespesasWorkspace";

type ModuleKey = "folha" | "compras" | "faturamento" | "despesas";
type MonthStatus = "closed" | "review" | "empty";

interface MonthItem {
  key: string;
  label: string;
  status: MonthStatus;
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
  creditDescription: string;
  value: string;
}

const months: MonthItem[] = [
  { key: "01", label: "Janeiro", status: "empty" },
  { key: "02", label: "Fevereiro", status: "empty" },
  { key: "03", label: "Março", status: "empty" },
  { key: "04", label: "Abril", status: "empty" },
  { key: "05", label: "Maio", status: "empty" },
  { key: "06", label: "Junho", status: "empty" },
  { key: "07", label: "Julho", status: "empty" },
  { key: "08", label: "Agosto", status: "empty" },
  { key: "09", label: "Setembro", status: "empty" },
  { key: "10", label: "Outubro", status: "empty" },
  { key: "11", label: "Novembro", status: "empty" },
  { key: "12", label: "Dezembro", status: "empty" },
];

const modules: ModuleItem[] = [
  { key: "folha", label: "Folha", acceptedFiles: ".pdf,.xlsx,.xls" },
  { key: "compras", label: "Compras", acceptedFiles: ".pdf,.xlsx,.xls,.csv" },
  { key: "faturamento", label: "Faturamento", acceptedFiles: ".pdf,.xlsx,.xls,.csv" },
  { key: "despesas", label: "Despesas", acceptedFiles: ".pdf,.xlsx,.xls,.csv" },
];

const statusDot: Record<MonthStatus, string> = {
  closed: "bg-foreground/70",
  review: "bg-foreground/45",
  empty: "bg-muted-foreground/25",
};

const inputCellClass =
  "h-8 rounded-none border-0 bg-transparent px-2 shadow-none focus:border-foreground/30 focus:ring-foreground/10 focus-visible:ring-1 focus-visible:ring-foreground/30 dark:bg-transparent dark:focus:border-white/30 dark:focus:ring-white/10";

export function LancamentosWorkspace() {
  const today = new Date();
  const [company, setCompany] = useState("el-da-silva");
  const [year, setYear] = useState(String(today.getFullYear()));
  const [selectedMonth, setSelectedMonth] = useState(String(today.getMonth() + 1).padStart(2, "0"));
  const [selectedModule, setSelectedModule] = useState<ModuleKey>("folha");
  const [activeTab, setActiveTab] = useState("transcricao");
  const [filesByModule, setFilesByModule] = useState<Record<ModuleKey, File[]>>({
    folha: [],
    compras: [],
    faturamento: [],
    despesas: [],
  });
  const [balanceteFiles, setBalanceteFiles] = useState<File[]>([]);
  const [transcriptionRows, setTranscriptionRows] = useState<TranscriptionRow[]>([]);
  const [launchRows, setLaunchRows] = useState<LaunchRow[]>([]);

  const selectedMonthLabel = useMemo(
    () => months.find((month) => month.key === selectedMonth)?.label ?? "Competência",
    [selectedMonth],
  );

  const activeModuleLabel = useMemo(
    () => modules.find((module) => module.key === selectedModule)?.label ?? "Folha",
    [selectedModule],
  );

  const handleModuleFiles = (module: ModuleKey, event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;

    setFilesByModule((current) => ({
      ...current,
      [module]: [...current[module], ...selectedFiles],
    }));
    setSelectedModule(module);
    setActiveTab("transcricao");
    event.target.value = "";
  };

  const handleBalanceteFiles = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files ?? []);
    if (!selectedFiles.length) return;
    setBalanceteFiles((current) => [...current, ...selectedFiles]);
    event.target.value = "";
  };

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
        creditDescription: "",
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
            {company === "el-da-silva" ? "E L DA SILVA SERVIÇOS DE REDES" : "Empresa selecionada"}
            <span className="px-2 text-border">/</span>
            {selectedMonthLabel} de {year}
            <span className="px-2 text-border">/</span>
            Não iniciado
          </p>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-[minmax(220px,1fr)_110px] xl:w-auto xl:grid-cols-[320px_110px]">
          <Select value={company} onValueChange={setCompany}>
            <SelectTrigger className="h-10 border-border bg-background shadow-none">
              <SelectValue placeholder="Selecione a empresa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="el-da-silva">E L DA SILVA SERVIÇOS DE REDES</SelectItem>
            </SelectContent>
          </Select>

          <Select value={year} onValueChange={setYear}>
            <SelectTrigger className="h-10 border-border bg-background shadow-none">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {[today.getFullYear() - 2, today.getFullYear() - 1, today.getFullYear()].map((item) => (
                <SelectItem key={item} value={String(item)}>{item}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </header>

      <div className="grid min-h-[720px] lg:grid-cols-[176px_minmax(0,1fr)]">
        <aside className="border-b border-border py-5 lg:border-b-0 lg:border-r lg:pr-4">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Competências · {year}
          </p>
          <nav className="grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-1" aria-label="Competências">
            {months.map((month) => {
              const active = selectedMonth === month.key;
              return (
                <button
                  key={month.key}
                  type="button"
                  onClick={() => setSelectedMonth(month.key)}
                  className={cn(
                    "flex h-9 items-center justify-between rounded-sm px-3 text-left text-sm transition-colors",
                    active
                      ? "bg-foreground text-background"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span>{month.label}</span>
                  <span className={cn("h-1.5 w-1.5 rounded-full", active ? "bg-background" : statusDot[month.status])} />
                </button>
              );
            })}
          </nav>

          <div className="my-5 border-t border-border" />

          <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Documentos do mês
          </p>
          <nav className="grid grid-cols-2 gap-1 sm:grid-cols-4 lg:grid-cols-1" aria-label="Tipos de documento">
            {modules.map((module) => {
              const active = selectedModule === module.key;
              return (
                <button
                  key={module.key}
                  type="button"
                  onClick={() => setSelectedModule(module.key)}
                  className={cn(
                    "flex h-9 items-center justify-between rounded-sm px-3 text-sm transition-colors",
                    active
                      ? "bg-muted font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
                  )}
                >
                  <span>{module.label}</span>
                  <span className="text-xs tabular-nums">{filesByModule[module.key].length}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        <main className="min-w-0 py-5 lg:pl-6">
          <div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {selectedMonthLabel} de {year}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Importe os documentos, revise a transcrição e confira a planilha final.
            </p>
          </div>

          {selectedModule === "despesas" ? (
            <DespesasWorkspace key={`${year}-${selectedMonth}`} month={selectedMonth} year={year} />
          ) : (
          <>
          <section className="mt-5 grid gap-2 sm:grid-cols-2 xl:grid-cols-4" aria-label="Importação de documentos">
            {modules.map((module) => {
              const count = filesByModule[module.key].length;
              return (
                <label
                  key={module.key}
                  className={cn(
                    "group flex min-h-[84px] cursor-pointer items-center justify-between rounded-md border px-4 py-3 transition-colors",
                    selectedModule === module.key
                      ? "border-foreground/40 bg-muted/60"
                      : "border-border bg-background hover:border-foreground/30 hover:bg-muted/40",
                  )}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-foreground">{module.label}</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      {count ? `${count} ${count === 1 ? "arquivo importado" : "arquivos importados"}` : "Nenhum arquivo"}
                    </span>
                  </span>
                  <span className="ml-3 shrink-0 rounded-sm border border-border px-2 py-1 text-xs font-medium text-foreground group-hover:border-foreground/40">
                    {count ? "Adicionar" : "Importar"}
                  </span>
                  <input
                    type="file"
                    multiple
                    accept={module.acceptedFiles}
                    className="sr-only"
                    onChange={(event) => handleModuleFiles(module.key, event)}
                  />
                </label>
              );
            })}
          </section>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="h-auto w-full justify-start gap-1 rounded-none border-b border-border bg-transparent p-0 shadow-none dark:bg-transparent">
              {[
                ["transcricao", "Transcrição", transcriptionRows.length],
                ["lancamentos", "Lançamentos", launchRows.length],
                ["conferencia", "Conferência", 0],
                ["balancete", "Balancete", balanceteFiles.length],
              ].map(([value, label, count]) => (
                <TabsTrigger
                  key={String(value)}
                  value={String(value)}
                  className="h-11 rounded-none border-b-2 border-transparent bg-transparent px-4 text-muted-foreground shadow-none data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none dark:text-white/60 dark:data-[state=active]:border-white dark:data-[state=active]:bg-transparent dark:data-[state=active]:text-white"
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

              <div className="grid gap-4 xl:grid-cols-[minmax(280px,0.7fr)_minmax(0,1.3fr)]">
                <section className="min-w-0 rounded-md border border-border bg-background p-4">
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <label className="min-w-0 flex-1">
                      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Arquivo</span>
                      <Select value={filesByModule[selectedModule][0] ? "principal" : undefined}>
                        <SelectTrigger className="h-9 border-border shadow-none">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {filesByModule[selectedModule][0] && (
                            <SelectItem value="principal">{filesByModule[selectedModule][0].name}</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </label>
                    {filesByModule[selectedModule][0] && (
                      <span className="pb-2 text-xs text-muted-foreground">Arquivo selecionado</span>
                    )}
                  </div>
                  <div className="mt-4 grid min-h-[370px] place-items-center bg-muted/60 px-6 text-center text-sm text-muted-foreground">
                    <div>
                      <p className="font-medium text-foreground">
                        {filesByModule[selectedModule].length ? "Documento selecionado" : "Nenhum documento importado"}
                      </p>
                      <p className="mt-1">
                        {filesByModule[selectedModule].length
                          ? "A pré-visualização será habilitada na etapa de processamento."
                          : `Importe um arquivo de ${activeModuleLabel.toLowerCase()} para começar.`}
                      </p>
                    </div>
                  </div>
                </section>

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
              </div>
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
                          ["Crédito", "w-24"],
                          ["Descrição débito", "min-w-[200px]"],
                          ["Descrição crédito", "min-w-[200px]"],
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
                              ["credit", row.credit],
                              ["debitDescription", row.debitDescription],
                              ["creditDescription", row.creditDescription],
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
                          <td colSpan={7} className="h-32 px-4 text-center text-sm text-muted-foreground">
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
              </section>
            </TabsContent>

            <TabsContent value="balancete" className="mt-5">
              <div className="mb-4">
                <h3 className="text-base font-semibold text-foreground">Balancete mensal</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Importe o balancete após a primeira planilha entrar no Calima.
                </p>
              </div>

              <label className="flex min-h-[118px] cursor-pointer items-center justify-between gap-4 rounded-md border border-dashed border-border bg-muted/20 px-5 py-4 transition-colors hover:border-foreground/40 hover:bg-muted/40">
                <span>
                  <span className="block text-sm font-medium text-foreground">Importar balancete da competência</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {balanceteFiles.length
                      ? `${balanceteFiles.length} ${balanceteFiles.length === 1 ? "arquivo selecionado" : "arquivos selecionados"}`
                      : "PDF, XLSX ou XLS exportado pelo Calima"}
                  </span>
                </span>
                <span className="shrink-0 rounded-sm border border-foreground/30 px-3 py-2 text-xs font-medium text-foreground">
                  Selecionar arquivo
                </span>
                <input type="file" accept=".pdf,.xlsx,.xls" multiple className="sr-only" onChange={handleBalanceteFiles} />
              </label>

              <section className="mt-4 overflow-hidden rounded-md border border-border bg-background">
                <div className="grid grid-cols-[minmax(200px,1fr)_140px_minmax(160px,0.6fr)_minmax(180px,0.8fr)] bg-muted/50 px-4 py-2 text-xs font-medium text-muted-foreground">
                  <span>Conta</span><span className="text-right">Saldo</span><span>Situação</span><span>Ação sugerida</span>
                </div>
                <div className="grid min-h-32 place-items-center border-t border-border px-4 text-center text-sm text-muted-foreground">
                  Importe o balancete para iniciar a análise das contas e dos saldos da competência.
                </div>
              </section>
            </TabsContent>
          </Tabs>
          </>
          )}
        </main>
      </div>
    </div>
  );
}
