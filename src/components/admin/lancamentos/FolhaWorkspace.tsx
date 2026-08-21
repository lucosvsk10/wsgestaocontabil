import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
import { supabase } from "@/integrations/supabase/client";

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
const isCompleteMapping = (row: PayrollEntry) => Boolean(row.debitCode && row.creditCode && row.debitDescription && row.creditDescription);

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
  const [learning, setLearning] = useState(false);
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
  const blockingDifferences = comparisons.filter(row => row.blocking !== false && row.differenceInCents !== 0);
  const informationalDifferences = comparisons.filter(row => row.blocking === false && row.differenceInCents !== 0);
  const missing = entries.filter(row => !isCompleteMapping(row)).length;
  const mappingsToApprove = [...entries, ...deferredEntries].filter(row => row.mappingNeedsApproval && isCompleteMapping(row)).length;
  const learnedMappings = [...entries, ...deferredEntries].filter(row => row.mappingSource === "learned").length;
  const structuralIssues = validationIssues.filter(issue => !issue.toLocaleLowerCase("pt-BR").includes("diferença de"));
  const conferenceCount = blockingDifferences.length + missing + mappingsToApprove + warnings.length + structuralIssues.length + (referenceVerified ? 0 : 1);
  const canReviewApprove = entries.length > 0
    && referenceVerified
    && !processing
    && !learning
    && missing === 0
    && blockingDifferences.length === 0
    && warnings.length === 0
    && structuralIssues.length === 0;
  const canFinalize = canReviewApprove && mappingsToApprove === 0;
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
      const changed = field === "debitCode"
        ? { ...row, debitCode: value, debitDescription: account?.description ?? "" }
        : { ...row, creditCode: value, creditDescription: account?.description ?? "" };
      return {
        ...changed,
        mappingSource: "manual" as const,
        mappingNeedsApproval: true,
        mappingConfidence: 1,
        mappingReason: "Mapeamento ajustado manualmente e aguardando confirmação para virar conhecimento da empresa.",
      };
    }
    if (["debitCostCenter", "creditCostCenter"].includes(String(field))) {
      return {
        ...row,
        [field]: value,
        mappingSource: "manual" as const,
        mappingNeedsApproval: true,
        mappingConfidence: 1,
        mappingReason: "Mapeamento ajustado manualmente e aguardando confirmação para virar conhecimento da empresa.",
      };
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

  const approveAndFinalize = async () => {
    if (!canReviewApprove) return;
    if (mappingsToApprove === 0) {
      onStatusChange("done");
      setActiveTab("lancamentos");
      return;
    }

    setLearning(true);
    try {
      const { data, error } = await supabase.functions.invoke("learn-accounting-mappings", {
        body: {
          module: "folha",
          company_id: company,
          entries,
          deferredEntries,
        },
      });
      if (error) throw error;
      if (!data || typeof data.learned !== "number") throw new Error("O sistema não confirmou o aprendizado dos mapeamentos.");

      const markLearned = (row: PayrollEntry): PayrollEntry => row.mappingNeedsApproval && isCompleteMapping(row)
        ? {
            ...row,
            mappingSource: "learned",
            mappingNeedsApproval: false,
            mappingConfidence: 1,
            mappingReason: "Mapeamento conferido e salvo como conhecimento desta empresa.",
          }
        : row;
      setEntries(rows => rows.map(markLearned));
      setDeferredEntries(rows => rows.map(markLearned));
      onStatusChange("done");
      setActiveTab("lancamentos");
    } catch (error) {
      setValidationIssues(current => [...new Set([
        ...current,
        error instanceof Error ? `Não foi possível salvar o aprendizado: ${error.message}` : "Não foi possível salvar o aprendizado dos mapeamentos.",
      ])]);
    } finally {
      setLearning(false);
    }
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
    mappingSource: "manual",
    mappingNeedsApproval: true,
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
        <Ledger rows={entries} editable update={update} title={`Transcrição da folha · ${competence}`} />
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
          <Ledger rows={entries} title={`Lançamentos da folha · ${competence}`} />
          {!canFinalize && entries.length > 0 && <p className="px-5 pb-4 text-xs text-muted-foreground">
            {mappingsToApprove > 0
              ? "Confirme os mapeamentos na aba Conferência para liberar a exportação."
              : blockingDifferences.length > 0
                ? "Existem diferenças contábeis bloqueantes que precisam ser corrigidas antes da exportação."
                : "A exportação será liberada assim que a conferência obrigatória estiver concluída."}
          </p>}
        </div>
      </TabsContent>

      <TabsContent value="conferencia" className="mt-7">
        <Header title="Folha de pagamento · Conferência" />
        <div className="space-y-6 rounded-md border border-border bg-background p-6">
          <div className="grid gap-5 sm:grid-cols-5">
            <Stat label="Referências" value={comparisons.length} />
            <Stat label="Diferenças bloqueantes" value={blockingDifferences.length} />
            <Stat label="Contas incompletas" value={missing} />
            <Stat label="Aguardando aprovação" value={mappingsToApprove} />
            <Stat label="Conhecimento reutilizado" value={learnedMappings} />
          </div>
          {!referenceVerified && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />A leitura independente do documento original ainda não passou pelos critérios de referência. A exportação permanece bloqueada.</div>}
          {mappingsToApprove > 0 && <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4">
            <p className="text-sm font-medium text-foreground">{mappingsToApprove} mapeamento(s) novo(s) precisam da sua conferência</p>
            <p className="mt-1 text-xs text-muted-foreground">Revise débito e crédito na Transcrição. Ao confirmar, essas combinações serão salvas como conhecimento desta empresa e reutilizadas automaticamente nos próximos meses.</p>
          </div>}
          {informationalDifferences.length > 0 && <div className="rounded-md border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">Diferenças informativas</p>
            <p className="mt-1 text-xs text-muted-foreground">Essas diferenças explicam calendário de recolhimento ou outras referências do documento e não bloqueiam aprovação nem exportação.</p>
          </div>}
          <ComparisonTable rows={comparisons} referenceVerified={referenceVerified} title={`Conferência da folha · ${competence}`} />
          {deferredEntries.length > 0 && <div className="rounded-md border border-border p-4">
            <p className="text-sm font-medium text-foreground">Ajustes por competência de recolhimento</p>
            {deferredEntries.map(row => <p key={row.id} className="mt-2 text-sm text-muted-foreground">{row.rubricDescription || row.history}: {money(row.amountInCents)} → {row.targetCompetence}</p>)}
          </div>}
          {processingMeta && <p className="text-xs text-muted-foreground">Fluxo: {processingMeta.routing || processingMeta.primaryModel}{processingMeta.reviewed ? ` · releitura: ${processingMeta.reviewModel || processingMeta.model}` : ""}</p>}
          {(warnings.length > 0 || structuralIssues.length > 0) && <div className="rounded-md bg-muted/50 p-4">
            <p className="text-sm font-medium text-foreground">Pontos que exigem decisão</p>
            {[...new Set([...warnings, ...structuralIssues])].map(issue => <p key={issue} className="mt-2 flex gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{issue}</p>)}
          </div>}
          <div className="flex justify-end">
            <Button disabled={!canReviewApprove} onClick={() => void approveAndFinalize()}>
              {learning ? "Salvando conhecimento..." : mappingsToApprove > 0 ? `Confirmar e aprender (${mappingsToApprove})` : "Marcar folha como OK"}
            </Button>
          </div>
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

function ComparisonTable({ rows, referenceVerified, title }: { rows: PayrollComparison[]; referenceVerified: boolean; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const table = <ComparisonTableContent rows={rows} referenceVerified={referenceVerified} />;

  return <>
    <div className="rounded-md border border-border bg-background">
      <TableExpandButton onClick={() => setExpanded(true)} />
      <div className="overflow-x-auto">{table}</div>
    </div>
    <Dialog open={expanded} onOpenChange={setExpanded}>
      <DialogContent className="max-h-[88vh] w-[94vw] max-w-[1480px] overflow-hidden border-border bg-background p-0">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[76vh] overflow-auto">{table}</div>
      </DialogContent>
    </Dialog>
  </>;
}

function ComparisonTableContent({ rows, referenceVerified }: { rows: PayrollComparison[]; referenceVerified: boolean }) {
  return <table className="w-full min-w-[850px] text-sm">
    <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr><th className="px-3 py-3">Referência</th><th className="px-3 py-3 text-right">Documento original</th><th className="px-3 py-3 text-right">Lançamentos</th><th className="px-3 py-3 text-right">Diferença</th><th className="px-3 py-3">Resultado</th></tr></thead>
    <tbody>{rows.map(row => {
      const informational = row.blocking === false;
      const confers = referenceVerified && row.differenceInCents === 0;
      return <tr key={`${row.key}-${row.source}`} className="border-t border-border">
        <td className="px-3 py-3"><p className="font-medium text-foreground">{row.label}</p><p className="mt-0.5 text-xs text-muted-foreground">{row.source}</p>{row.note && <p className="mt-1 max-w-xl text-[11px] text-muted-foreground">{row.note}</p>}</td>
        <td className="px-3 py-3 text-right tabular-nums">{money(row.documentAmountInCents)}</td>
        <td className="px-3 py-3 text-right tabular-nums">{money(row.entriesAmountInCents)}</td>
        <td className={cn("px-3 py-3 text-right tabular-nums", !informational && row.differenceInCents !== 0 && "font-medium text-destructive", informational && row.differenceInCents !== 0 && "text-muted-foreground")}>{money(row.differenceInCents)}</td>
        <td className="px-3 py-3">
          {informational
            ? <span className="text-muted-foreground">Informativo</span>
            : confers
              ? <span className="inline-flex items-center gap-1.5 text-sm text-foreground"><CheckCircle2 className="h-4 w-4" />Confere</span>
              : <span className="text-destructive">Revisar</span>}
        </td>
      </tr>;
    })}{!rows.length && <tr><td colSpan={5} className="h-28 text-center text-muted-foreground">Reprocesse o documento para gerar a conferência independente.</td></tr>}</tbody>
  </table>;
}

function Ledger({ rows, editable, update, title }: { rows: PayrollEntry[]; editable?: boolean; update?: (id: string, field: keyof PayrollEntry, value: string) => void; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const table = <LedgerTable rows={rows} editable={editable} update={update} />;

  return <>
    <div className="rounded-md border border-border bg-background">
      <TableExpandButton onClick={() => setExpanded(true)} />
      <div className="overflow-x-auto">{table}</div>
    </div>
    <Dialog open={expanded} onOpenChange={setExpanded}>
      <DialogContent className="max-h-[88vh] w-[94vw] max-w-[1540px] overflow-hidden border-border bg-background p-0">
        <DialogHeader className="border-b border-border px-6 py-5 text-left">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[76vh] overflow-auto">{table}</div>
      </DialogContent>
    </Dialog>
  </>;
}

function LedgerTable({ rows, editable, update }: { rows: PayrollEntry[]; editable?: boolean; update?: (id: string, field: keyof PayrollEntry, value: string) => void }) {
  const columns: Array<[string, keyof PayrollEntry, string]> = [
    ["Data", "date", "w-28"], ["Histórico", "history", "min-w-[260px]"], ["Débito", "debitCode", "w-20"],
    ["Descrição débito", "debitDescription", "min-w-[180px]"], ["C.C. débito", "debitCostCenter", "w-24"], ["Crédito", "creditCode", "w-20"],
    ["Descrição crédito", "creditDescription", "min-w-[180px]"], ["C.C. crédito", "creditCostCenter", "w-24"],
  ];
  return <table className="w-full min-w-[1580px] text-sm">
    <thead className="bg-muted/50 text-left text-xs text-muted-foreground"><tr>
      {columns.map(([label, , width]) => <th key={label} className={cn("border-b border-r border-border px-3 py-2", width)}>{label}</th>)}
      <th className="w-32 border-b border-r border-border px-3 py-2 text-right">Valor</th>
      <th className="w-32 border-b border-border px-3 py-2">Mapeamento</th>
    </tr></thead>
    <tbody>{rows.map(row => <tr key={row.id} className={cn("border-b border-border", row.mappingNeedsApproval && "bg-amber-500/[0.035]")}>
      {columns.map(([, field]) => <td key={field} className="border-r border-border">{editable ? <Input className={cell} value={String(row[field] ?? "")} onChange={event => update?.(row.id, field, event.target.value)} /> : <span className="block px-3 py-2">{String(row[field] || "—")}</span>}</td>)}
      <td className="border-r border-border px-3 py-2 text-right">{editable ? <Input className={cn(cell, "text-right")} value={(row.amountInCents / 100).toFixed(2).replace(".", ",")} onChange={event => update?.(row.id, "amountInCents", event.target.value)} /> : money(row.amountInCents)}</td>
      <td className="px-3 py-2"><MappingLabel row={row} /></td>
    </tr>)}{!rows.length && <tr><td colSpan={10} className="h-40 text-center text-muted-foreground">Importe a folha para iniciar.</td></tr>}</tbody>
  </table>;
}

function TableExpandButton({ onClick }: { onClick: () => void }) {
  return <div className="flex h-9 items-center justify-end border-b border-border px-2">
    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={onClick} title="Expandir tabela" aria-label="Expandir tabela">
      <Maximize2 className="h-4 w-4" />
    </Button>
  </div>;
}

function MappingLabel({ row }: { row: PayrollEntry }) {
  const complete = isCompleteMapping(row);
  const source = row.mappingSource || (complete ? "predefined" : "unresolved");
  const labels: Record<string, string> = {
    learned: "Aprendido",
    predefined: "Pré-definido",
    ai: "IA · revisar",
    manual: "Manual · revisar",
    unresolved: "Pendente",
  };
  return <span title={row.mappingReason || ""} className={cn(
    "text-xs",
    source === "learned" && "text-emerald-600 dark:text-emerald-400",
    source === "ai" && "font-medium text-amber-700 dark:text-amber-300",
    source === "manual" && row.mappingNeedsApproval && "font-medium text-amber-700 dark:text-amber-300",
    source === "unresolved" && "font-medium text-destructive",
    source === "predefined" && "text-muted-foreground",
  )}>{labels[source] || source}</span>;
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