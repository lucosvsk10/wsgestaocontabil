import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { detectWorkbookCompetence } from "@/lib/lancamentos/expenseWorkbook";
import {
  PayrollComparison,
  PayrollDocumentTotal,
  PayrollEntry,
  PayrollProcessingMeta,
  calculatePayrollComparisons,
  exportPayroll,
} from "@/lib/lancamentos/payrollWorkbook";
import { loadWorkspaceData, loadWorkspaceFiles, saveWorkspaceData, saveWorkspaceFiles } from "@/lib/lancamentos/workspaceStorage";
import { WorkspaceStatus } from "./DespesasWorkspace";
import { cn } from "@/lib/utils";
import { PayrollProcessingResult, useAccountingProcessing } from "@/contexts/AccountingProcessingContext";

interface Props {
  company: string;
  month: string;
  year: string;
  onStatusChange: (status: WorkspaceStatus) => void;
  onCompetenceChange: (month: string, year: string) => void;
}
interface SavedPayroll {
  entries: PayrollEntry[];
  deferredEntries?: PayrollEntry[];
  errors?: string[];
  warnings?: string[];
  validationIssues?: string[];
  documentTotals?: PayrollDocumentTotal[];
  comparisons?: PayrollComparison[];
  processingMeta?: PayrollProcessingMeta | null;
  referenceVerified?: boolean;
  validated?: boolean;
}

const cell = "h-8 rounded-none border-0 bg-transparent px-2 shadow-none focus-visible:ring-1";
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export function FolhaWorkspace({ company, month, year, onStatusChange, onCompetenceChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [deferredEntries, setDeferredEntries] = useState<PayrollEntry[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [documentTotals, setDocumentTotals] = useState<PayrollDocumentTotal[]>([]);
  const [processingMeta, setProcessingMeta] = useState<PayrollProcessingMeta | null>(null);
  const [referenceVerified, setReferenceVerified] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [activeTab, setActiveTab] = useState("transcricao");
  const { processPayroll, isProcessingScope } = useAccountingProcessing();
  const processing = isProcessingScope(company, month, year);
  const scope = `${company}:${year}:${month}:folha`;
  const key = `${scope}:parsed`;
  const competence = `${month}/${year}`;
  const tabKey = `ws:folha:last-tab:${company}`;

  const comparisons = useMemo(
    () => calculatePayrollComparisons(entries, deferredEntries, documentTotals),
    [deferredEntries, documentTotals, entries],
  );
  const differences = comparisons.filter(row => row.differenceInCents !== 0);
  const missing = entries.filter(row => !row.debitCode || !row.creditCode || !row.debitDescription || !row.creditDescription).length;
  const structuralIssues = validationIssues.filter(issue => !issue.toLocaleLowerCase("pt-BR").includes("diferença de"));
  const conferenceCount = differences.length + missing + warnings.length + structuralIssues.length + (referenceVerified ? 0 : 1);
  const canFinalize = entries.length > 0 && referenceVerified && !processing && missing === 0 && differences.length === 0 && warnings.length === 0 && structuralIssues.length === 0;
  const total = entries.reduce((sum, row) => sum + row.amountInCents, 0);

  const hydrateSaved = (saved: SavedPayroll | PayrollProcessingResult) => {
    setEntries(saved.entries ?? []);
    setDeferredEntries(saved.deferredEntries ?? []);
    setWarnings(saved.warnings ?? ("errors" in saved ? saved.errors ?? [] : []));
    setValidationIssues(saved.validationIssues ?? []);
    setDocumentTotals(saved.documentTotals ?? []);
    setProcessingMeta(saved.processingMeta ?? null);
    setReferenceVerified(Boolean(saved.referenceVerified));
  };

  useEffect(() => { setActiveTab(localStorage.getItem(tabKey) || "transcricao"); }, [tabKey]);
  useEffect(() => { localStorage.setItem(tabKey, activeTab); }, [activeTab, tabKey]);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    setEntries([]);
    setDeferredEntries([]);
    setFiles([]);
    setWarnings([]);
    setValidationIssues([]);
    setDocumentTotals([]);
    setProcessingMeta(null);
    setReferenceVerified(false);
    Promise.all([
      loadWorkspaceData<SavedPayroll>(key),
      loadWorkspaceFiles(scope),
      loadWorkspaceData<ChartAccount[]>(`${company}:chart-of-accounts`),
    ]).then(([saved, docs, chart]) => {
      if (!active) return;
      if (saved) hydrateSaved(saved);
      setFiles(docs);
      setAccounts(chart ?? []);
      setLoaded(true);
    });
    return () => { active = false; };
  }, [company, key, scope]);

  useEffect(() => {
    if (!loaded) return;
    void saveWorkspaceData(key, {
      entries,
      deferredEntries,
      warnings,
      validationIssues,
      documentTotals,
      comparisons,
      processingMeta,
      referenceVerified,
    });
  }, [comparisons, deferredEntries, documentTotals, entries, key, loaded, processingMeta, referenceVerified, validationIssues, warnings]);

  const update = (id: string, field: keyof PayrollEntry, value: string) => setEntries(rows => rows.map(row => {
    if (row.id !== id) return row;
    if (field === "amountInCents") return { ...row, amountInCents: Math.round(Number(value.replace(/\D/g, ""))) };
    if (field === "debitCode" || field === "creditCode") {
      const account = accounts.find(item => item.reducedCode === value.trim());
      return field === "debitCode"
        ? { ...row, debitCode: value, debitDescription: account?.description ?? "" }
        : { ...row, creditCode: value, creditDescription: account?.description ?? "" };
    }
    return { ...row, [field]: value };
  }));

  const startProcessing = async (selected: File[], operation: "import" | "reprocess", targetMonth: string, targetYear: string) => {
    if (!accounts.length) {
      setValidationIssues(["Importe o plano de contas desta empresa antes de processar a folha."]);
      return;
    }
    if (!selected.length) {
      setValidationIssues(["Nenhum documento de folha está disponível para processamento."]);
      return;
    }
    setWarnings([]);
    setValidationIssues([]);
    try {
      const result = await processPayroll({ company, month: targetMonth, year: targetYear, files: selected, accounts, operation });
      if (targetMonth === month && targetYear === year) {
        hydrateSaved(result);
        onStatusChange("review");
      }
    } catch (error) {
      if (targetMonth === month && targetYear === year) {
        setValidationIssues([error instanceof Error ? error.message : "Falha ao processar a folha com IA."]);
      }
    }
  };

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    const detected = (await Promise.all(selected.map(detectWorkbookCompetence))).find(Boolean);
    const targetMonth = detected?.month ?? month;
    const targetYear = detected?.year ?? year;
    const targetScope = `${company}:${targetYear}:${targetMonth}:folha`;
    await saveWorkspaceFiles(targetScope, selected);
    if (targetMonth !== month || targetYear !== year) {
      onCompetenceChange(targetMonth, targetYear);
      await startProcessing(selected, "import", targetMonth, targetYear);
      return;
    }
    const allFiles = uniqueFiles([...files, ...selected]);
    setFiles(allFiles);
    onStatusChange("review");
    await startProcessing(allFiles, "import", month, year);
  };

  const add = () => setEntries(rows => [...rows, {
    id: String(Date.now()),
    date: `${new Date(+year, +month, 0).getDate()}/${month}/${year}`,
    history: "",
    debitCode: "",
    debitDescription: "",
    debitCostCenter: "",
    creditCode: "",
    creditDescription: "",
    creditCostCenter: "",
    amountInCents: 0,
    source: "manual",
    kind: "provento",
    section: "folha",
  }]);

  return <section className="mt-8 space-y-8">
    <div className="rounded-md border border-border bg-background p-6">
      <div className="flex items-center justify-between gap-5">
        <h3 className="font-semibold">Folha de pagamento de {competence}</h3>
        <div className="flex flex-wrap justify-end gap-2">
          {files.length > 0 && <Button variant="outline" onClick={() => void startProcessing(files, "reprocess", month, year)} disabled={processing}>{processing ? "Processando..." : "Reprocessar com IA"}</Button>}
          <Button variant="outline" onClick={() => input.current?.click()} disabled={processing}>{`Importar folha de ${competence}`}</Button>
        </div>
        <input ref={input} type="file" multiple accept=".pdf,.xlsx,.xls" className="sr-only" onChange={event => void importFiles(event)} />
      </div>
      <div className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground">
        {files.length ? files.map(file => <span key={`${file.name}-${file.size}`} className="mr-5 text-foreground">{file.name}</span>) : "Nenhum documento importado."}
      </div>
    </div>

    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <TabsList className="grid h-auto w-full grid-cols-3 gap-3 bg-transparent p-0">
        <Flow value="transcricao" label="Transcrição" count={entries.length + deferredEntries.length} />
        <Flow value="lancamentos" label="Lançamentos" count={entries.length} />
        <Flow value="conferencia" label="Conferência" count={conferenceCount} />
      </TabsList>

      <TabsContent value="transcricao" className="mt-7">
        <Header title="Folha de pagamento · Transcrição" />
        <Ledger rows={entries} editable update={update} />
        {deferredEntries.length > 0 && <div className="mt-6 rounded-md border border-border bg-muted/30 p-4">
          <p className="text-sm font-medium text-foreground">Valores separados para competência futura</p>
          <p className="mt-1 text-xs text-muted-foreground">Eles participam da conferência do documento original, mas não entram na exportação desta competência.</p>
          <div className="mt-3 space-y-2">{deferredEntries.map(row => <div key={row.id} className="flex items-center justify-between gap-4 text-sm"><span>{row.history}</span><span className="tabular-nums">{money(row.amountInCents)}</span></div>)}</div>
        </div>}
        <div className="mt-4 flex justify-end"><Button variant="outline" onClick={add}>Adicionar linha</Button></div>
      </TabsContent>

      <TabsContent value="lancamentos" className="mt-7">
        <Header title="Folha de pagamento · Lançamentos" />
        <div className="rounded-md border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border p-5">
            <span className="text-sm text-muted-foreground">{entries.length} lançamentos · {money(total)}</span>
            <Button disabled={!canFinalize} onClick={() => exportPayroll(entries, competence)}>Exportar para o Calima</Button>
          </div>
          <Ledger rows={entries} />
        </div>
      </TabsContent>

      <TabsContent value="conferencia" className="mt-7">
        <Header title="Folha de pagamento · Conferência" />
        <div className="space-y-6 rounded-md border border-border bg-background p-6">
          <div className="grid gap-5 sm:grid-cols-4">
            <Stat label="Referências" value={comparisons.length} />
            <Stat label="Diferenças" value={differences.length} />
            <Stat label="Contas incompletas" value={missing} />
            <Stat label="Próxima competência" value={deferredEntries.length} />
          </div>
          {!referenceVerified && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />A leitura independente do documento original ainda não passou pelos critérios de referência. A exportação permanece bloqueada.</div>}
          <ComparisonTable rows={comparisons} referenceVerified={referenceVerified} />
          {deferredEntries.length > 0 && <div className="rounded-md border border-border p-4">
            <p className="text-sm font-medium text-foreground">Ajustes por competência de recolhimento</p>
            {deferredEntries.map(row => <p key={row.id} className="mt-2 text-sm text-muted-foreground">{row.rubricDescription || row.history}: {money(row.amountInCents)} → {row.targetCompetence}</p>)}
          </div>}
          {processingMeta && <p className="text-xs text-muted-foreground">Fluxo: {processingMeta.routing || processingMeta.primaryModel}{processingMeta.reviewed ? ` · releitura: ${processingMeta.reviewModel || processingMeta.model}` : ""}</p>}
          {(warnings.length > 0 || structuralIssues.length > 0) && <div className="rounded-md bg-muted/50 p-4">
            <p className="text-sm font-medium text-foreground">Pontos que exigem decisão</p>
            {[...new Set([...warnings, ...structuralIssues])].map(issue => <p key={issue} className="mt-2 flex gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{issue}</p>)}
          </div>}
          <div className="flex justify-end"><Button disabled={!canFinalize} onClick={() => onStatusChange("done")}>Marcar folha como OK</Button></div>
        </div>
      </TabsContent>
    </Tabs>
  </section>;
}

function Flow({ value, label, count }: { value: string; label: string; count: number }) {
  return <TabsTrigger value={value} className="min-h-16 border border-border data-[state=active]:bg-foreground data-[state=active]:text-background">{label}<span className="ml-2 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">{count}</span></TabsTrigger>;
}
function Header({ title }: { title: string }) { return <div className="mb-5"><h3 className="font-semibold">{title}</h3></div>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }

function ComparisonTable({ rows, referenceVerified }: { rows: PayrollComparison[]; referenceVerified: boolean }) {
  return <div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[850px] text-sm">
    <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-3">Referência</th><th className="px-3 py-3 text-right">Documento original</th><th className="px-3 py-3 text-right">Lançamentos</th><th className="px-3 py-3 text-right">Diferença</th><th className="px-3 py-3">Resultado</th></tr></thead>
    <tbody>{rows.map(row => <tr key={`${row.key}-${row.source}`} className="border-t border-border">
      <td className="px-3 py-3"><p className="font-medium text-foreground">{row.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{row.source}</p></td>
      <td className="px-3 py-3 text-right tabular-nums">{money(row.documentAmountInCents)}</td>
      <td className="px-3 py-3 text-right tabular-nums">{money(row.entriesAmountInCents)}</td>
      <td className={cn("px-3 py-3 text-right tabular-nums", row.differenceInCents !== 0 && "font-medium text-destructive")}>{money(row.differenceInCents)}</td>
      <td className="px-3 py-3">{referenceVerified && row.differenceInCents === 0 ? <span className="inline-flex items-center gap-1.5 text-sm text-foreground"><CheckCircle2 className="h-4 w-4" />Confere</span> : <span className="text-destructive">Revisar</span>}</td>
    </tr>)}{!rows.length && <tr><td colSpan={5} className="h-28 text-center text-muted-foreground">Reprocesse o documento para gerar a conferência independente.</td></tr>}</tbody>
  </table></div>;
}

function Ledger({ rows, editable, update }: { rows: PayrollEntry[]; editable?: boolean; update?: (id: string, field: keyof PayrollEntry, value: string) => void }) {
  const columns: Array<[string, keyof PayrollEntry, string]> = [
    ["Data", "date", "w-28"], ["Histórico", "history", "min-w-[260px]"], ["Débito", "debitCode", "w-20"],
    ["Descrição débito", "debitDescription", "min-w-[180px]"], ["C.C. débito", "debitCostCenter", "w-24"], ["Crédito", "creditCode", "w-20"],
    ["Descrição crédito", "creditDescription", "min-w-[180px]"], ["C.C. crédito", "creditCostCenter", "w-24"],
  ];
  return <div className="overflow-x-auto rounded-md border border-border bg-background"><table className="w-full min-w-[1450px] text-sm">
    <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>{columns.map(([label, , width]) => <th key={label} className={cn("border-b border-r border-border px-3 py-2", width)}>{label}</th>)}<th className="border-b border-border px-3 py-2 text-right">Valor</th></tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} className="border-b border-border">{columns.map(([, field]) => <td key={field} className="border-r border-border">{editable ? <Input className={cell} value={String(row[field] ?? "")} onChange={event => update?.(row.id, field, event.target.value)} /> : <span className="block px-3 py-2">{String(row[field] || "—")}</span>}</td>)}<td className="px-3 py-2 text-right">{editable ? <Input className={cn(cell, "text-right")} value={(row.amountInCents / 100).toFixed(2).replace(".", ",")} onChange={event => update?.(row.id, "amountInCents", event.target.value)} /> : money(row.amountInCents)}</td></tr>)}{!rows.length && <tr><td colSpan={9} className="h-40 text-center text-muted-foreground">Importe a folha para iniciar.</td></tr>}</tbody>
  </table></div>;
}

function uniqueFiles(files: File[]) {
  const seen = new Set<string>();
  return files.filter(file => {
    const key = `${file.name}:${file.size}:${file.lastModified}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
