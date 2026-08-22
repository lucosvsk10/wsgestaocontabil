import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Maximize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useAccountingProcessing, RevenueProcessingResult } from "@/contexts/AccountingProcessingContext";
import { exportAccountingWorkbook } from "@/lib/lancamentos/accountingExportWorkbook";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { processRevenueBatch } from "@/lib/lancamentos/processRevenueBatch";
import { RevenueBatchPeriodResult, RevenueBatchResult, RevenueImportManifest } from "@/lib/lancamentos/revenueBatch";
import { RevenueComparison, RevenueEntry, RevenueProcessingMeta, RevenueReference } from "@/lib/lancamentos/revenueWorkbook";
import {
  deleteWorkspaceData,
  loadWorkspaceData,
  loadWorkspaceFiles,
  removeWorkspaceDocumentsByName,
  saveWorkspaceData,
  saveWorkspaceFiles,
} from "@/lib/lancamentos/workspaceStorage";
import { cn } from "@/lib/utils";
import { AccountingWorkflowSteps, AccountCodeHover } from "./AccountingWorkflowUI";
import { RevenueImportSummaryDialog } from "./RevenueImportSummaryDialog";
import { WrongCompetenceImportDialog } from "./WrongCompetenceImportDialog";
import { WorkspaceStatus } from "./DespesasWorkspace";

interface Props {
  company: string;
  month: string;
  year: string;
  onStatusChange: (status: WorkspaceStatus) => void;
  onCompetenceChange: (month: string, year: string) => void;
}

interface SavedRevenue {
  reference?: RevenueReference | null;
  entries: RevenueEntry[];
  comparisons?: RevenueComparison[];
  warnings?: string[];
  validationIssues?: string[];
  processingMeta?: RevenueProcessingMeta | null;
  referenceVerified?: boolean;
  validated?: boolean;
  importId?: string;
  sourceFiles?: string[];
}

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const cellClass = "h-7 rounded-none border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-1";
const complete = (row: RevenueEntry) => Boolean(row.debitCode && row.creditCode && row.debitDescription && row.creditDescription);
const manifestKey = (company: string, importId: string) => `${company}:faturamento-import:${importId}`;

export function FaturamentoWorkspace({ company, month, year, onStatusChange, onCompetenceChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [reference, setReference] = useState<RevenueReference | null>(null);
  const [entries, setEntries] = useState<RevenueEntry[]>([]);
  const [files, setFiles] = useState<File[]>([]);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [processingMeta, setProcessingMeta] = useState<RevenueProcessingMeta | null>(null);
  const [referenceVerified, setReferenceVerified] = useState(false);
  const [activeTab, setActiveTab] = useState("transcricao");
  const [loaded, setLoaded] = useState(false);
  const [learning, setLearning] = useState(false);
  const [currentImportId, setCurrentImportId] = useState<string | null>(null);
  const [currentSourceFiles, setCurrentSourceFiles] = useState<string[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchStartedAt, setBatchStartedAt] = useState<number | null>(null);
  const [pendingWrongBatch, setPendingWrongBatch] = useState<RevenueBatchResult | null>(null);
  const [pendingWrongFiles, setPendingWrongFiles] = useState<File[]>([]);
  const [summary, setSummary] = useState<RevenueBatchResult | null>(null);
  const [deletingDocument, setDeletingDocument] = useState(false);
  const { processRevenue, isProcessingScope } = useAccountingProcessing();
  const processing = isProcessingScope(company, month, year, "faturamento");
  const busy = processing || batchProcessing || deletingDocument;
  const scope = `${company}:${year}:${month}:faturamento`;
  const key = `${scope}:parsed`;
  const competence = `${month}/${year}`;
  const tabKey = `ws:faturamento:last-tab:${company}`;

  const comparisons = useMemo<RevenueComparison[]>(() => {
    if (!reference) return [];
    const byType = (type: string) => entries.filter(row => row.eventType === type).reduce((sum, row) => sum + row.amountInCents, 0);
    return [
      { key: "services", label: "NFS · Prestação de serviços", documentAmountInCents: reference.serviceAmountInCents, entriesAmountInCents: byType("service_revenue"), differenceInCents: byType("service_revenue") - reference.serviceAmountInCents, source: reference.source, blocking: true },
      { key: "merchandise", label: "NF-e · Revenda de mercadorias", documentAmountInCents: reference.merchandiseAmountInCents, entriesAmountInCents: byType("merchandise_revenue"), differenceInCents: byType("merchandise_revenue") - reference.merchandiseAmountInCents, source: reference.source, blocking: true },
      { key: "total", label: "Total faturado", documentAmountInCents: reference.totalAmountInCents, entriesAmountInCents: byType("service_revenue") + byType("merchandise_revenue"), differenceInCents: byType("service_revenue") + byType("merchandise_revenue") - reference.totalAmountInCents, source: reference.source, blocking: true },
      { key: "pgdas", label: "DAS / PGDAS", documentAmountInCents: reference.pgdasAmountInCents, entriesAmountInCents: byType("pgdas"), differenceInCents: byType("pgdas") - reference.pgdasAmountInCents, source: reference.source, blocking: reference.hasPgdas, note: reference.hasPgdas ? undefined : "Documento sem PGDAS nesta competência; nenhum lançamento tributário deve ser criado." },
    ];
  }, [entries, reference]);

  const blockingDifferences = comparisons.filter(row => row.blocking && row.differenceInCents !== 0);
  const missing = entries.filter(row => !complete(row)).length;
  const mappingsToApprove = entries.filter(row => row.mappingNeedsApproval && complete(row)).length;
  const learnedMappings = entries.filter(row => row.mappingSource === "learned").length;
  const canApprove = Boolean(reference) && referenceVerified && !busy && missing === 0 && blockingDifferences.length === 0 && warnings.length === 0 && validationIssues.length === 0;
  const canExport = canApprove && mappingsToApprove === 0;
  const conferenceCount = blockingDifferences.length + missing + mappingsToApprove + warnings.length + validationIssues.length + (referenceVerified ? 0 : 1);

  const hydrate = (saved: SavedRevenue | RevenueProcessingResult | RevenueBatchPeriodResult) => {
    setReference(saved.reference ?? null);
    setEntries(saved.entries ?? []);
    setWarnings(saved.warnings ?? []);
    setValidationIssues(saved.validationIssues ?? []);
    setProcessingMeta(saved.processingMeta ?? null);
    setReferenceVerified(Boolean(saved.referenceVerified));
    setCurrentImportId("importId" in saved && saved.importId ? saved.importId : null);
    setCurrentSourceFiles("sourceFiles" in saved && saved.sourceFiles ? saved.sourceFiles : []);
  };

  useEffect(() => { setActiveTab(localStorage.getItem(tabKey) || "transcricao"); }, [tabKey]);
  useEffect(() => { localStorage.setItem(tabKey, activeTab); }, [activeTab, tabKey]);
  useEffect(() => {
    let active = true;
    setLoaded(false);
    Promise.all([
      loadWorkspaceData<SavedRevenue>(key),
      loadWorkspaceFiles(scope),
      loadWorkspaceData<ChartAccount[]>(`${company}:chart-of-accounts`),
    ]).then(([saved, docs, chart]) => {
      if (!active) return;
      if (saved) hydrate(saved);
      else {
        setReference(null); setEntries([]); setWarnings([]); setValidationIssues([]); setProcessingMeta(null); setReferenceVerified(false); setCurrentImportId(null); setCurrentSourceFiles([]);
      }
      setFiles(docs); setAccounts(chart ?? []); setLoaded(true);
    });
    return () => { active = false; };
  }, [company, key, scope]);

  useEffect(() => {
    if (!loaded) return;
    void saveWorkspaceData(key, {
      reference,
      entries,
      comparisons,
      warnings,
      validationIssues,
      processingMeta,
      referenceVerified,
      importId: currentImportId ?? undefined,
      sourceFiles: currentSourceFiles,
    } satisfies SavedRevenue);
  }, [comparisons, currentImportId, currentSourceFiles, entries, key, loaded, processingMeta, reference, referenceVerified, validationIssues, warnings]);

  const process = async (selected: File[], operation: "import" | "reprocess", targetMonth = month, targetYear = year) => {
    if (!accounts.length) { setValidationIssues(["Importe o plano de contas desta empresa antes de processar Faturamento."]); return; }
    if (!selected.length) { setValidationIssues(["Nenhum relatório de faturamento está disponível para processamento."]); return; }
    setWarnings([]); setValidationIssues([]);
    try {
      const result = await processRevenue({ company, month: targetMonth, year: targetYear, files: selected, accounts, operation });
      if (targetMonth === month && targetYear === year) { hydrate(result); onStatusChange("review"); }
    } catch (error) {
      if (targetMonth === month && targetYear === year) setValidationIssues([error instanceof Error ? error.message : "Falha ao processar Faturamento com IA."]);
    }
  };

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    if (!accounts.length) { setValidationIssues(["Importe o plano de contas desta empresa antes de processar Faturamento."]); return; }

    setWarnings([]);
    setValidationIssues([]);
    setBatchProcessing(true);
    setBatchStartedAt(Date.now());
    try {
      const result = await processRevenueBatch({ company, files: selected, accounts });
      if (result.periods.length === 1 && result.periods[0].competence !== competence) {
        setPendingWrongBatch(result);
        setPendingWrongFiles(selected);
        return;
      }
      await persistBatch(result, selected);
      setSummary(result);
    } catch (error) {
      setValidationIssues([error instanceof Error ? error.message : "Falha ao importar o faturamento."]);
    } finally {
      setBatchProcessing(false);
      setBatchStartedAt(null);
    }
  };

  const persistBatch = async (result: RevenueBatchResult, selectedFiles: File[]) => {
    for (const period of result.periods) {
      const [targetMonth, targetYear] = period.competence.split("/");
      const targetScope = `${company}:${targetYear}:${targetMonth}:faturamento`;
      const targetKey = `${targetScope}:parsed`;
      const saved: SavedRevenue = {
        reference: period.reference,
        entries: period.entries,
        comparisons: period.comparisons,
        warnings: period.warnings,
        validationIssues: period.validationIssues,
        processingMeta: period.processingMeta,
        referenceVerified: period.referenceVerified,
        validated: period.validated,
        importId: result.importId,
        sourceFiles: result.sourceFiles,
      };
      await saveWorkspaceData(targetKey, saved);
      await saveWorkspaceFiles(targetScope, selectedFiles, { skipCompetencePrompt: true });
    }

    const manifest: RevenueImportManifest = {
      importId: result.importId,
      sourceFiles: result.sourceFiles,
      periods: result.periods.map(period => period.competence),
      createdAt: new Date().toISOString(),
    };
    await saveWorkspaceData(manifestKey(company, result.importId), manifest);

    const currentPeriod = result.periods.find(period => period.competence === competence);
    if (currentPeriod) {
      hydrate(currentPeriod);
      const currentDocs = await loadWorkspaceFiles(scope);
      setFiles(currentDocs);
      onStatusChange("review");
    }
  };

  const keepWrongCompetence = async () => {
    if (!pendingWrongBatch) return;
    const batch = pendingWrongBatch;
    const selected = pendingWrongFiles;
    setBatchProcessing(true);
    setBatchStartedAt(Date.now());
    try {
      await persistBatch(batch, selected);
      setSummary(batch);
      const [targetMonth, targetYear] = batch.periods[0].competence.split("/");
      setPendingWrongBatch(null);
      setPendingWrongFiles([]);
      onCompetenceChange(targetMonth, targetYear);
    } finally {
      setBatchProcessing(false);
      setBatchStartedAt(null);
    }
  };

  const discardWrongCompetence = () => {
    setPendingWrongBatch(null);
    setPendingWrongFiles([]);
  };

  const updateEntry = (id: string, field: keyof RevenueEntry, value: string) => setEntries(rows => rows.map(row => {
    if (row.id !== id) return row;
    if (field === "debitCode" || field === "creditCode") {
      const account = accounts.find(item => item.reducedCode === value.trim());
      const changed = field === "debitCode"
        ? { ...row, debitCode: value, debitDescription: account?.description ?? "" }
        : { ...row, creditCode: value, creditDescription: account?.description ?? "" };
      return { ...changed, mappingSource: "manual" as const, mappingNeedsApproval: true, mappingConfidence: 1, mappingReason: "Mapeamento ajustado manualmente e aguardando confirmação." };
    }
    if (field === "debitCostCenter" || field === "creditCostCenter") {
      return { ...row, [field]: value, mappingSource: "manual" as const, mappingNeedsApproval: true, mappingConfidence: 1, mappingReason: "Centro de custo ajustado manualmente e aguardando confirmação." };
    }
    return { ...row, [field]: value };
  }));

  const deleteEntry = (id: string) => {
    setEntries(rows => rows.filter(row => row.id !== id));
    onStatusChange("review");
  };

  const deleteDocument = async () => {
    if (!files.length && !currentImportId) return;
    setDeletingDocument(true);
    try {
      const importId = currentImportId;
      if (importId) {
        const manifest = await loadWorkspaceData<RevenueImportManifest>(manifestKey(company, importId));
        const periods = manifest?.periods?.length ? manifest.periods : [competence];
        const sourceNames = manifest?.sourceFiles?.length ? manifest.sourceFiles : currentSourceFiles.length ? currentSourceFiles : files.map(file => file.name);

        for (const period of periods) {
          const [targetMonth, targetYear] = period.split("/");
          const targetScope = `${company}:${targetYear}:${targetMonth}:faturamento`;
          const targetKey = `${targetScope}:parsed`;
          const saved = await loadWorkspaceData<SavedRevenue>(targetKey);
          if (saved?.importId === importId) {
            await deleteWorkspaceData(targetKey);
          } else if (saved?.entries?.some(entry => entry.importId === importId)) {
            await saveWorkspaceData(targetKey, { ...saved, entries: saved.entries.filter(entry => entry.importId !== importId) });
          }
          await removeWorkspaceDocumentsByName(targetScope, sourceNames);
        }
        await deleteWorkspaceData(manifestKey(company, importId));
      } else {
        await removeWorkspaceDocumentsByName(scope, files.map(file => file.name));
        await deleteWorkspaceData(key);
      }

      setReference(null);
      setEntries([]);
      setWarnings([]);
      setValidationIssues([]);
      setProcessingMeta(null);
      setReferenceVerified(false);
      setCurrentImportId(null);
      setCurrentSourceFiles([]);
      setFiles([]);
      onStatusChange("waiting");
    } finally {
      setDeletingDocument(false);
    }
  };

  const approve = async () => {
    if (!canApprove) return;
    if (!mappingsToApprove) { onStatusChange("done"); setActiveTab("lancamentos"); return; }
    setLearning(true);
    try {
      const { data, error } = await supabase.functions.invoke("learn-accounting-mappings", { body: { module: "faturamento", company_id: company, entries } });
      if (error) throw error;
      if (!data || typeof data.learned !== "number") throw new Error("O sistema não confirmou o aprendizado.");
      setEntries(rows => rows.map(row => row.mappingNeedsApproval && complete(row) ? { ...row, mappingSource: "learned", mappingNeedsApproval: false, mappingConfidence: 1, mappingReason: "Mapeamento conferido e salvo como conhecimento desta empresa." } : row));
      onStatusChange("done"); setActiveTab("lancamentos");
    } catch (error) {
      setValidationIssues(current => [...new Set([...current, error instanceof Error ? `Não foi possível salvar o aprendizado: ${error.message}` : "Não foi possível salvar o aprendizado."])]);
    } finally { setLearning(false); }
  };

  const exportCalima = () => exportAccountingWorkbook({
    moduleTitle: "Faturamento",
    competence,
    fileName: `faturamento-${month}-${year}.xlsx`,
    entries: entries.map(row => ({
      date: row.date,
      amountInCents: row.amountInCents,
      debitCode: row.debitCode,
      creditCode: row.creditCode,
      history: row.history,
      debitCostCenter: row.debitCostCenter,
      creditCostCenter: row.creditCostCenter,
      debitDescription: row.debitDescription,
      creditDescription: row.creditDescription,
      referenceCode: row.rubricCode,
      referenceDescription: row.rubricDescription,
      type: row.kind,
      section: row.section,
      mappingSource: row.mappingSource,
      mappingReason: row.mappingReason,
    })),
    comparisons,
    note: "Faturamento gera no máximo três lançamentos por competência: prestação de serviços, revenda de mercadorias e PGDAS, apenas quando houver valor no documento original.",
  });

  const openSummaryCompetence = (target: string) => {
    const [targetMonth, targetYear] = target.split("/");
    setSummary(null);
    onCompetenceChange(targetMonth, targetYear);
  };

  return <section className="mt-8 space-y-8">
    <div className="rounded-md border border-border bg-background p-6">
      <div className="flex items-center justify-between gap-5">
        <div><h3 className="font-semibold">Faturamento de {competence}</h3><p className="mt-1 text-xs text-muted-foreground">NFS + NF-e + DAS/PGDAS → até 3 lançamentos por competência. Relatórios anuais são separados automaticamente por mês.</p></div>
        <div className="flex flex-wrap justify-end gap-2">
          {files.length > 0 && <Button variant="outline" disabled={busy} onClick={() => void process(files, "reprocess")}>{processing ? "Processando..." : "Reprocessar com IA"}</Button>}
          <Button variant="outline" disabled={busy} onClick={() => input.current?.click()}>{batchProcessing ? "Analisando documento..." : "Importar faturamento"}</Button>
        </div>
        <input ref={input} type="file" multiple accept=".pdf" className="sr-only" onChange={event => void importFiles(event)} />
      </div>
      <div className="mt-5 border-t border-border pt-5 text-sm text-muted-foreground">
        {files.length ? <div className="flex flex-wrap gap-2">{files.map(file => <span key={`${file.name}-${file.size}`} className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/25 px-2 py-1 text-xs text-foreground"><span className="max-w-[360px] truncate" title={file.name}>{file.name}</span><button type="button" className="rounded p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive" title="Excluir documento e lançamentos gerados" disabled={deletingDocument} onClick={() => void deleteDocument()}><Trash2 className="h-3.5 w-3.5" /></button></span>)}</div> : "Nenhum relatório importado."}
      </div>
    </div>

    <Tabs value={activeTab} onValueChange={setActiveTab}>
      <AccountingWorkflowSteps steps={[
        { value: "transcricao", label: "Transcrição", count: reference ? 4 : 0 },
        { value: "lancamentos", label: "Lançamentos", count: entries.length },
        { value: "conferencia", label: "Conferência", count: conferenceCount },
      ]} />

      <TabsContent value="transcricao" className="mt-7">
        <Header title="Faturamento · Transcrição" subtitle="Valores literais da competência identificada no documento." />
        {reference ? <RevenueReferenceTable reference={reference} title={`Transcrição de faturamento · ${competence}`} /> : <Empty text="Importe um relatório de faturamento para iniciar." />}
      </TabsContent>

      <TabsContent value="lancamentos" className="mt-7">
        <Header title="Faturamento · Lançamentos" subtitle="No máximo três lançamentos no último dia do mês." />
        <div className="rounded-md border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border p-5"><span className="text-sm text-muted-foreground">{entries.length} lançamento(s) · {money(entries.reduce((sum, row) => sum + row.amountInCents, 0))}</span><Button disabled={!canExport || !entries.length} onClick={exportCalima}>Exportar para o Calima</Button></div>
          <RevenueLedger rows={entries} update={updateEntry} onDelete={deleteEntry} title={`Lançamentos de faturamento · ${competence}`} />
          {!canExport && entries.length > 0 && <p className="px-5 pb-4 text-xs text-muted-foreground">{mappingsToApprove ? "Confirme o mapeamento na Conferência para liberar a exportação." : blockingDifferences.length ? "Uma linha foi alterada/excluída ou há divergência com o documento. Revise a Conferência." : "A exportação será liberada quando os valores e mapeamentos estiverem conferidos."}</p>}
        </div>
      </TabsContent>

      <TabsContent value="conferencia" className="mt-7">
        <Header title="Faturamento · Conferência" subtitle="NFS, NF-e, total faturado e PGDAS comparados diretamente com os lançamentos." />
        <div className="space-y-6 rounded-md border border-border bg-background p-6">
          <div className="grid gap-5 sm:grid-cols-5"><Stat label="Lançamentos" value={entries.length} /><Stat label="Diferenças" value={blockingDifferences.length} /><Stat label="Sem mapeamento" value={missing} /><Stat label="Aguardando aprovação" value={mappingsToApprove} /><Stat label="Conhecimento reutilizado" value={learnedMappings} /></div>
          {!referenceVerified && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4" />A leitura independente do relatório ainda não fechou.</div>}
          <RevenueComparisonTable rows={comparisons} referenceVerified={referenceVerified} />
          {(warnings.length > 0 || validationIssues.length > 0) && <div className="rounded-md bg-muted/50 p-4"><p className="text-sm font-medium">Pontos que exigem decisão</p>{[...new Set([...warnings, ...validationIssues])].map(issue => <p key={issue} className="mt-2 flex gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4" />{issue}</p>)}</div>}
          {processingMeta && <p className="text-xs text-muted-foreground">Fluxo: {processingMeta.routing || processingMeta.primaryModel}</p>}
          <div className="flex justify-end"><Button disabled={!canApprove || !entries.length} onClick={() => void approve()}>{learning ? "Salvando conhecimento..." : mappingsToApprove ? "Confirmar e aprender" : "Marcar faturamento como OK"}</Button></div>
        </div>
      </TabsContent>
    </Tabs>

    <WrongCompetenceImportDialog
      open={Boolean(pendingWrongBatch)}
      currentCompetence={competence}
      detectedCompetence={pendingWrongBatch?.periods[0]?.competence ?? ""}
      fileNames={pendingWrongBatch?.sourceFiles ?? []}
      keeping={batchProcessing}
      onKeep={keepWrongCompetence}
      onRemove={discardWrongCompetence}
    />

    <RevenueImportSummaryDialog result={summary} open={Boolean(summary)} onClose={() => setSummary(null)} onOpenCompetence={openSummaryCompetence} />
    {batchProcessing && batchStartedAt && <BatchProgress startedAt={batchStartedAt} fileNames={pendingWrongFiles.length ? pendingWrongFiles.map(file => file.name) : []} />}
  </section>;
}

function Header({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mb-5"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div>; }
function Stat({ label, value }: { label: string; value: number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>; }
function Empty({ text }: { text: string }) { return <div className="grid h-40 place-items-center rounded-md border border-border text-sm text-muted-foreground">{text}</div>; }

function RevenueReferenceTable({ reference, title }: { reference: RevenueReference; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const rows = [
    ["NFS · Prestação de serviços", reference.serviceAmountInCents, reference.hasService],
    ["NF-e · Revenda de mercadorias", reference.merchandiseAmountInCents, reference.hasMerchandise],
    ["TOTAL FATURADO", reference.totalAmountInCents, true],
    ["DAS / PGDAS", reference.pgdasAmountInCents, reference.hasPgdas],
  ] as const;
  const table = <table className="w-full min-w-[720px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[48%] border-b border-r border-border px-3 py-2">Referência</th><th className="w-[26%] border-b border-r border-border px-3 py-2 text-right">Valor</th><th className="w-[26%] border-b border-border px-3 py-2">Situação</th></tr></thead><tbody>{rows.map(([label, value, present]) => <tr key={label} className="h-8 border-b border-border"><td className="border-r border-border px-3 py-2 font-medium">{label}</td><td className="border-r border-border px-3 py-2 text-right tabular-nums">{money(value)}</td><td className="px-3 py-2 text-muted-foreground">{present ? "Informado no documento" : "Sem valor nesta competência"}</td></tr>)}</tbody></table>;
  return <><TableBox onExpand={() => setExpanded(true)}>{table}</TableBox><Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[88vh] w-[94vw] max-w-[1380px] overflow-hidden p-0"><DialogHeader className="border-b border-border px-6 py-5"><DialogTitle>{title}</DialogTitle></DialogHeader><div className="overflow-auto">{table}</div></DialogContent></Dialog></>;
}

function RevenueLedger({ rows, update, onDelete, title }: { rows: RevenueEntry[]; update: (id: string, field: keyof RevenueEntry, value: string) => void; onDelete: (id: string) => void; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const table = <table className="w-full min-w-[960px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[9%] border-b border-r border-border px-2 py-2">Data</th><th className="w-[28%] border-b border-r border-border px-2 py-2">Histórico</th><th className="w-[9%] border-b border-r border-border px-2 py-2">Débito</th><th className="w-[7%] border-b border-r border-border px-2 py-2">C.C. D.</th><th className="w-[9%] border-b border-r border-border px-2 py-2">Crédito</th><th className="w-[7%] border-b border-r border-border px-2 py-2">C.C. C.</th><th className="w-[11%] border-b border-r border-border px-2 py-2 text-right">Valor</th><th className="w-[14%] border-b border-r border-border px-2 py-2">Mapeamento</th><th className="w-[6%] border-b border-border px-2 py-2 text-center">Ação</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className={cn("h-8 border-b border-border", row.mappingNeedsApproval && "bg-amber-500/[0.035]")}><td className="border-r border-border"><Input className={cellClass} value={row.date} onChange={e => update(row.id, "date", e.target.value)} /></td><td className="border-r border-border"><Input className={cellClass} value={row.history} onChange={e => update(row.id, "history", e.target.value)} /></td><td className="border-r border-border"><AccountCell row={row} side="debit" update={update} /></td><td className="border-r border-border"><Input className={cellClass} value={row.debitCostCenter} onChange={e => update(row.id, "debitCostCenter", e.target.value)} /></td><td className="border-r border-border"><AccountCell row={row} side="credit" update={update} /></td><td className="border-r border-border"><Input className={cellClass} value={row.creditCostCenter} onChange={e => update(row.id, "creditCostCenter", e.target.value)} /></td><td className="border-r border-border px-2 py-2 text-right tabular-nums">{money(row.amountInCents)}</td><td className="border-r border-border px-2 py-2"><Mapping row={row} /></td><td className="px-2 py-1 text-center"><Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Excluir esta linha" onClick={() => onDelete(row.id)}><Trash2 className="h-3.5 w-3.5" /></Button></td></tr>)}{!rows.length && <tr><td colSpan={9} className="h-32 text-center text-muted-foreground">Nenhum lançamento nesta competência.</td></tr>}</tbody></table>;
  return <><TableBox onExpand={() => setExpanded(true)}>{table}</TableBox><Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[88vh] w-[96vw] max-w-[1580px] overflow-hidden p-0"><DialogHeader className="border-b border-border px-6 py-5"><DialogTitle>{title}</DialogTitle></DialogHeader><div className="max-h-[76vh] overflow-auto">{table}</div></DialogContent></Dialog></>;
}

function AccountCell({ row, side, update }: { row: RevenueEntry; side: "debit" | "credit"; update: (id: string, field: keyof RevenueEntry, value: string) => void }) {
  const code = side === "debit" ? row.debitCode : row.creditCode;
  const description = side === "debit" ? row.debitDescription : row.creditDescription;
  const field: keyof RevenueEntry = side === "debit" ? "debitCode" : "creditCode";
  return <AccountCodeHover code={code} description={description} side={side}><div className="w-full"><Input className={cellClass} value={code} onChange={e => update(row.id, field, e.target.value)} /></div></AccountCodeHover>;
}
function Mapping({ row }: { row: RevenueEntry }) { const labels: Record<string, string> = { learned: "Aprendido", predefined: "Pré-definido", ai: "IA · revisar", manual: "Manual · revisar", unresolved: "Pendente" }; const source = row.mappingSource || (complete(row) ? "predefined" : "unresolved"); return <span title={row.mappingReason || ""} className={cn("text-[11px]", source === "learned" && "text-emerald-600", (source === "ai" || source === "manual") && "font-medium text-amber-700", source === "unresolved" && "font-medium text-destructive", source === "predefined" && "text-muted-foreground")}>{labels[source] || source}</span>; }
function RevenueComparisonTable({ rows, referenceVerified }: { rows: RevenueComparison[]; referenceVerified: boolean }) { return <div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[820px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[34%] px-2 py-2">Referência</th><th className="w-[18%] px-2 py-2 text-right">Documento original</th><th className="w-[18%] px-2 py-2 text-right">Lançamentos</th><th className="w-[14%] px-2 py-2 text-right">Diferença</th><th className="w-[16%] px-2 py-2">Resultado</th></tr></thead><tbody>{rows.map(row => { const ok = referenceVerified && (!row.blocking || row.differenceInCents === 0); return <tr key={row.key} className="border-t border-border"><td className="px-2 py-2"><p className="font-medium">{row.label}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{row.source}</p>{row.note && <p className="mt-1 text-[10px] text-muted-foreground">{row.note}</p>}</td><td className="px-2 py-2 text-right tabular-nums">{money(row.documentAmountInCents)}</td><td className="px-2 py-2 text-right tabular-nums">{money(row.entriesAmountInCents)}</td><td className={cn("px-2 py-2 text-right tabular-nums", row.blocking && row.differenceInCents !== 0 && "font-medium text-destructive")}>{money(row.differenceInCents)}</td><td className="px-2 py-2">{!row.blocking && row.differenceInCents !== 0 ? "Informativo" : ok ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Confere</span> : <span className="text-destructive">Revisar</span>}</td></tr>; })}</tbody></table></div>; }
function TableBox({ children, onExpand }: { children: React.ReactNode; onExpand: () => void }) { return <div className="rounded-md border border-border bg-background"><div className="flex h-8 items-center justify-end border-b border-border px-2"><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onExpand} title="Expandir tabela"><Maximize2 className="h-3.5 w-3.5" /></Button></div><div className="overflow-x-auto">{children}</div></div>; }

function BatchProgress({ startedAt, fileNames }: { startedAt: number; fileNames: string[] }) {
  const [, tick] = useState(0);
  useEffect(() => { const id = window.setInterval(() => tick(value => value + 1), 1000); return () => window.clearInterval(id); }, []);
  const seconds = Math.max(0, Math.floor((Date.now() - startedAt) / 1000));
  const duration = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  return <div className="fixed bottom-5 right-5 z-[110] w-[min(390px,calc(100vw-2rem))] rounded-lg border border-border bg-background p-4 shadow-2xl"><div className="flex gap-3"><Loader2 className="mt-0.5 h-5 w-5 animate-spin text-muted-foreground" /><div className="min-w-0"><p className="text-sm font-semibold">Analisando faturamento</p><p className="mt-1 text-xs text-muted-foreground">Identificando anos e distribuindo as competências do documento.</p>{fileNames.length > 0 && <p className="mt-2 truncate text-xs text-foreground">{fileNames[0]}</p>}<p className="mt-2 text-xs tabular-nums text-muted-foreground">Tempo decorrido: {duration}</p><p className="mt-1 text-xs text-muted-foreground">Você pode continuar navegando pelo site.</p></div></div></div>;
}
