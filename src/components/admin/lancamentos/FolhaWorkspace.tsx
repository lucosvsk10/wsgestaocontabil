import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Maximize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { isManualOnlyConference } from "@/lib/lancamentos/manualOnlyConference";
import {
  PayrollComparison,
  PayrollDocumentTotal,
  PayrollEntry,
  PayrollProcessingMeta,
  calculatePayrollComparisons,
  exportPayroll,
} from "@/lib/lancamentos/payrollWorkbook";
import { deleteWorkspaceData, loadWorkspaceData, loadWorkspaceFiles, removeWorkspaceFiles, saveWorkspaceData, saveWorkspaceFiles } from "@/lib/lancamentos/workspaceStorage";
import { WorkspaceStatus } from "./DespesasWorkspace";
import { cn } from "@/lib/utils";
import { PayrollProcessingResult, useAccountingProcessing } from "@/contexts/AccountingProcessingContext";
import { supabase } from "@/integrations/supabase/client";
import { AccountingWorkflowSteps, AccountCodeHover } from "./AccountingWorkflowUI";
import { WrongCompetenceImportDialog } from "./WrongCompetenceImportDialog";

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

interface PendingWrongImport {
  files: File[];
  detectedCompetence: string;
}

const cellClass = "h-7 rounded-none border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-1";
const displayCellClass = "flex h-7 items-center px-1.5 text-xs";
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
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [pendingWrongImport, setPendingWrongImport] = useState<PendingWrongImport | null>(null);
  const [resolvingWrongImport, setResolvingWrongImport] = useState(false);
  const { processPayroll, isProcessingScope } = useAccountingProcessing();
  const processing = isProcessingScope(company, month, year);
  const scope = `${company}:${year}:${month}:folha`;
  const key = `${scope}:parsed`;
  const competence = `${month}/${year}`;
  const tabKey = `ws:folha:last-tab:${company}`;

  const comparisons = useMemo(() => calculatePayrollComparisons(entries, deferredEntries, documentTotals), [deferredEntries, documentTotals, entries]);
  const blockingDifferences = comparisons.filter(row => row.blocking !== false && row.differenceInCents !== 0);
  const informationalDifferences = comparisons.filter(row => row.blocking === false && row.differenceInCents !== 0);
  const missing = entries.filter(row => !isCompleteMapping(row)).length;
  const allRows = [...entries, ...deferredEntries];
  const manualOnly = isManualOnlyConference(allRows);
  const mappingsToApprove = allRows.filter(row => row.source !== "manual" && row.mappingNeedsApproval && isCompleteMapping(row)).length;
  const learnedMappings = allRows.filter(row => row.mappingSource === "learned").length;
  const structuralIssues = validationIssues.filter(issue => !issue.toLocaleLowerCase("pt-BR").includes("diferença de"));
  const conferenceCount = blockingDifferences.length + missing + mappingsToApprove + warnings.length + structuralIssues.length + (manualOnly || referenceVerified ? 0 : 1);
  const documentConferenceValid = referenceVerified && blockingDifferences.length === 0 && warnings.length === 0 && structuralIssues.length === 0;
  const canReviewApprove = entries.length > 0 && !processing && !learning && missing === 0 && (manualOnly || documentConferenceValid);
  const canFinalize = canReviewApprove && (manualOnly || mappingsToApprove === 0);
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

  const resetWorkspaceState = () => {
    setEntries([]);
    setDeferredEntries([]);
    setWarnings([]);
    setValidationIssues([]);
    setDocumentTotals([]);
    setProcessingMeta(null);
    setReferenceVerified(false);
  };

  useEffect(() => { setActiveTab(localStorage.getItem(tabKey) || "transcricao"); }, [tabKey]);
  useEffect(() => { localStorage.setItem(tabKey, activeTab); }, [activeTab, tabKey]);

  useEffect(() => {
    let active = true;
    setLoaded(false);
    resetWorkspaceState();
    setFiles([]);
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
    void saveWorkspaceData(key, { entries, deferredEntries, warnings, validationIssues, documentTotals, comparisons, processingMeta, referenceVerified });
  }, [comparisons, deferredEntries, documentTotals, entries, key, loaded, processingMeta, referenceVerified, validationIssues, warnings]);

  const update = (id: string, field: keyof PayrollEntry, value: string) => setEntries(rows => rows.map(row => {
    if (row.id !== id) return row;
    if (field === "amountInCents") return { ...row, amountInCents: Math.round(Number(value.replace(/\D/g, ""))) };
    if (field === "debitCode" || field === "creditCode") {
      const account = accounts.find(item => item.reducedCode === value.trim());
      const changed = field === "debitCode"
        ? { ...row, debitCode: value, debitDescription: account?.description ?? "" }
        : { ...row, creditCode: value, creditDescription: account?.description ?? "" };
      return { ...changed, mappingSource: "manual" as const, mappingNeedsApproval: true, mappingConfidence: 1, mappingReason: "Mapeamento ajustado manualmente e aguardando conferência." };
    }
    if (["debitCostCenter", "creditCostCenter"].includes(String(field))) {
      return { ...row, [field]: value, mappingSource: "manual" as const, mappingNeedsApproval: true, mappingConfidence: 1, mappingReason: "Mapeamento ajustado manualmente e aguardando conferência." };
    }
    return { ...row, [field]: value };
  }));

  const runProcessing = async (selected: File[], operation: "import" | "reprocess", targetMonth: string, targetYear: string) => {
    if (!accounts.length) throw new Error("Importe o plano de contas desta empresa antes de processar a folha.");
    if (!selected.length) throw new Error("Nenhum documento de folha está disponível para processamento.");
    return processPayroll({ company, month: targetMonth, year: targetYear, files: selected, accounts, operation });
  };

  const startProcessing = async (selected: File[], operation: "import" | "reprocess", targetMonth: string, targetYear: string) => {
    setWarnings([]);
    setValidationIssues([]);
    try {
      const result = await runProcessing(selected, operation, targetMonth, targetYear);
      if (targetMonth === month && targetYear === year) {
        hydrateSaved(result);
        onStatusChange("review");
      }
      return result;
    } catch (error) {
      if (targetMonth === month && targetYear === year) setValidationIssues([error instanceof Error ? error.message : "Falha ao processar a folha com IA."]);
      return null;
    }
  };

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    if (!accounts.length) { setValidationIssues(["Importe o plano de contas desta empresa antes de processar a folha."]); return; }

    setWarnings([]);
    setValidationIssues([]);
    try {
      const probe = await runProcessing(selected, "import", month, year);
      if (probe.detectedCompetence && probe.detectedCompetence !== competence) {
        setPendingWrongImport({ files: selected, detectedCompetence: probe.detectedCompetence });
        return;
      }

      const allFiles = uniqueFiles([...files, ...selected]);
      const finalResult = files.length ? await runProcessing(allFiles, "import", month, year) : probe;
      await saveWorkspaceFiles(scope, selected, { skipCompetencePrompt: true });
      setFiles(allFiles);
      hydrateSaved(finalResult);
      onStatusChange("review");
    } catch (error) {
      setValidationIssues([error instanceof Error ? error.message : "Falha ao processar a folha com IA."]);
    }
  };

  const keepWrongImport = async () => {
    const pending = pendingWrongImport;
    if (!pending) return;
    const [targetMonth, targetYear] = pending.detectedCompetence.split("/");
    if (!targetMonth || !targetYear) return;
    setResolvingWrongImport(true);
    try {
      const targetScope = `${company}:${targetYear}:${targetMonth}:folha`;
      const targetKey = `${targetScope}:parsed`;
      const existingTargetFiles = await loadWorkspaceFiles(targetScope);
      const targetFiles = uniqueFiles([...existingTargetFiles, ...pending.files]);
      const result = await runProcessing(targetFiles, "import", targetMonth, targetYear);
      await saveWorkspaceFiles(targetScope, pending.files, { skipCompetencePrompt: true });
      await saveWorkspaceData(targetKey, result);
      setPendingWrongImport(null);
      onCompetenceChange(targetMonth, targetYear);
    } catch (error) {
      setValidationIssues([error instanceof Error ? error.message : "Não foi possível mover a folha para a competência detectada."]);
    } finally {
      setResolvingWrongImport(false);
    }
  };

  const deleteFile = async (file: File) => {
    setDeletingFile(file.name);
    const remaining = files.filter(item => !(item.name === file.name && item.size === file.size));
    setLoaded(false);
    onStatusChange("waiting");
    try {
      await removeWorkspaceFiles(scope, [file]);
      await deleteWorkspaceData(key);
      setFiles(remaining);
      resetWorkspaceState();

      if (!remaining.length) return;

      const result = await runProcessing(remaining, "reprocess", month, year);
      hydrateSaved(result);
      await saveWorkspaceData(key, result);
      onStatusChange("review");
    } catch (error) {
      resetWorkspaceState();
      setFiles(remaining);
      setValidationIssues([error instanceof Error ? `Documento removido, mas a reconstrução da folha falhou: ${error.message}` : "Documento removido, mas a reconstrução da folha falhou."]);
    } finally {
      setLoaded(true);
      setDeletingFile(null);
    }
  };

  const approveAndFinalize = async () => {
    if (!canReviewApprove) return;
    if (manualOnly) {
      const markManualReviewed = (row: PayrollEntry): PayrollEntry => row.source === "manual"
        ? { ...row, mappingNeedsApproval: false, mappingConfidence: 1, mappingReason: "Lançamento manual conferido pelo usuário; nenhuma regra automática foi criada." }
        : row;
      setEntries(rows => rows.map(markManualReviewed));
      setDeferredEntries(rows => rows.map(markManualReviewed));
      onStatusChange("done");
      setActiveTab("lancamentos");
      return;
    }
    if (mappingsToApprove === 0) { onStatusChange("done"); setActiveTab("lancamentos"); return; }
    setLearning(true);
    try {
      const { data, error } = await supabase.functions.invoke("learn-accounting-mappings", { body: { module: "folha", company_id: company, entries, deferredEntries } });
      if (error) throw error;
      if (!data || typeof data.learned !== "number") throw new Error("O sistema não confirmou o aprendizado dos mapeamentos.");
      const markLearned = (row: PayrollEntry): PayrollEntry => row.mappingNeedsApproval && isCompleteMapping(row)
        ? { ...row, mappingSource: "learned", mappingNeedsApproval: false, mappingConfidence: 1, mappingReason: "Mapeamento conferido e salvo como conhecimento desta empresa." }
        : row;
      setEntries(rows => rows.map(markLearned));
      setDeferredEntries(rows => rows.map(markLearned));
      onStatusChange("done");
      setActiveTab("lancamentos");
    } catch (error) {
      setValidationIssues(current => [...new Set([...current, error instanceof Error ? `Não foi possível salvar o aprendizado: ${error.message}` : "Não foi possível salvar o aprendizado dos mapeamentos."])]);
    } finally { setLearning(false); }
  };

  const add = () => setEntries(rows => [...rows, {
    id: String(Date.now()), date: `${new Date(+year, +month, 0).getDate()}/${month}/${year}`, history: "", debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "", amountInCents: 0, source: "manual", kind: "provento", section: "folha", mappingSource: "manual", mappingNeedsApproval: true,
  }]);

  return <>
    <section className="mt-8 space-y-8">
      <div className="rounded-md border border-border bg-background p-6">
        <div className="flex items-center justify-between gap-5">
          <h3 className="font-semibold">Folha de pagamento de {competence}</h3>
          <div className="flex flex-wrap justify-end gap-2">
            {files.length > 0 && <Button variant="outline" onClick={() => void startProcessing(files, "reprocess", month, year)} disabled={processing}>{processing ? "Processando..." : "Reprocessar com IA"}</Button>}
            <Button variant="outline" onClick={() => input.current?.click()} disabled={processing}>{`Importar folha de ${competence}`}</Button>
          </div>
          <input ref={input} type="file" multiple accept=".pdf,.xlsx,.xls" className="sr-only" onChange={event => void importFiles(event)} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
          {files.length ? files.map(file => <span key={`${file.name}-${file.size}`} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/25 px-2.5 py-1.5 text-xs text-foreground"><span className="max-w-[420px] truncate" title={file.name}>{file.name}</span><Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" disabled={Boolean(deletingFile) || processing} onClick={() => void deleteFile(file)} title="Excluir documento e seus lançamentos"><Trash2 className="h-3.5 w-3.5" /></Button></span>) : "Nenhum documento importado."}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <AccountingWorkflowSteps steps={[
          { value: "transcricao", label: "Transcrição", count: entries.length + deferredEntries.length },
          { value: "lancamentos", label: "Lançamentos", count: entries.length },
          { value: "conferencia", label: "Conferência", count: conferenceCount },
        ]} />

        <TabsContent value="transcricao" className="mt-6">
          <Header title="Folha de pagamento · Transcrição" />
          <Ledger rows={entries} editable update={update} title={`Transcrição da folha · ${competence}`} />
          {deferredEntries.length > 0 && <div className="mt-6 rounded-md border border-border bg-muted/30 p-4">
            <p className="text-sm font-medium text-foreground">Valores separados para competência futura</p>
            <p className="mt-1 text-xs text-muted-foreground">Eles participam da conferência do documento original, mas não entram na exportação desta competência.</p>
            <div className="mt-3 space-y-2">{deferredEntries.map(row => <div key={row.id} className="flex items-center justify-between gap-4 text-sm"><span>{row.history}</span><span className="tabular-nums">{money(row.amountInCents)}</span></div>)}</div>
          </div>}
          <div className="mt-4 flex justify-end"><Button variant="outline" onClick={add}>Adicionar linha</Button></div>
        </TabsContent>

        <TabsContent value="lancamentos" className="mt-6">
          <Header title="Folha de pagamento · Lançamentos" />
          <div className="rounded-md border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-5"><span className="text-sm text-muted-foreground">{entries.length} lançamentos · {money(total)}</span><Button disabled={!canFinalize} onClick={() => exportPayroll(entries, comparisons, competence)}>Exportar para o Calima</Button></div>
            <Ledger rows={entries} title={`Lançamentos da folha · ${competence}`} />
            {!canFinalize && entries.length > 0 && <p className="px-5 pb-4 text-xs text-muted-foreground">{manualOnly ? "Preencha as contas de débito e crédito das linhas manuais para liberar a exportação." : mappingsToApprove > 0 ? "Confirme os mapeamentos na aba Conferência para liberar a exportação." : blockingDifferences.length > 0 ? "Existem diferenças contábeis bloqueantes que precisam ser corrigidas antes da exportação." : "A exportação será liberada assim que a conferência obrigatória estiver concluída."}</p>}
          </div>
        </TabsContent>

        <TabsContent value="conferencia" className="mt-6">
          <Header title="Folha de pagamento · Conferência" />
          <div className="rounded-md border border-border bg-background">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-foreground">Fechar conferência da folha</p><p className="mt-1 text-xs text-muted-foreground">{manualOnly ? "Todos os lançamentos desta competência foram digitados manualmente; basta revisar as contas e confirmar." : "Depois de revisar valores e mapeamentos, confirme o mês aqui sem precisar descer até o fim da tabela."}</p></div>
              <Button className="shrink-0" disabled={!canReviewApprove} onClick={() => void approveAndFinalize()}>{learning ? "Salvando conhecimento..." : manualOnly ? "Marcar folha manual como OK" : mappingsToApprove > 0 ? `Confirmar e aprender (${mappingsToApprove})` : "Marcar folha como OK"}</Button>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid gap-5 sm:grid-cols-5"><Stat label="Referências" value={comparisons.length} /><Stat label="Diferenças bloqueantes" value={manualOnly ? 0 : blockingDifferences.length} /><Stat label="Contas incompletas" value={missing} /><Stat label="Aguardando aprovação" value={mappingsToApprove} /><Stat label="Conhecimento reutilizado" value={learnedMappings} /></div>
              {manualOnly && <div className="flex gap-2 rounded-md border border-border bg-muted/30 p-4 text-sm text-muted-foreground"><Info className="mt-0.5 h-4 w-4 shrink-0" /><div><p className="font-medium text-foreground">Conferência exclusivamente manual</p><p className="mt-1 text-xs">Como não existe nenhum lançamento de IA/importação nesta competência, o sistema não exige documento original. Esta confirmação valida apenas o que foi digitado manualmente e não cria conhecimento automático para a empresa.</p></div></div>}
              {!manualOnly && !referenceVerified && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />A leitura independente do documento original ainda não passou pelos critérios de referência. A exportação permanece bloqueada.</div>}
              {mappingsToApprove > 0 && <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4"><p className="text-sm font-medium text-foreground">{mappingsToApprove} mapeamento(s) novo(s) precisam da sua conferência</p><p className="mt-1 text-xs text-muted-foreground">Revise débito e crédito na Transcrição. Ao confirmar, essas combinações serão salvas como conhecimento desta empresa e reutilizadas automaticamente nos próximos meses.</p></div>}
              {informationalDifferences.length > 0 && !manualOnly && <div className="rounded-md border border-border bg-muted/30 p-4"><p className="text-sm font-medium text-foreground">Diferenças informativas</p><p className="mt-1 text-xs text-muted-foreground">Essas diferenças explicam calendário de recolhimento ou outras referências do documento e não bloqueiam aprovação nem exportação.</p></div>}
              {manualOnly ? <div className="rounded-md border border-border bg-background p-5 text-sm text-muted-foreground"><p className="font-medium text-foreground">Sem comparação com documento</p><p className="mt-1 text-xs">A competência contém somente linhas com origem manual. Se qualquer linha de IA/importação for adicionada, esta exceção deixa de valer automaticamente e a conferência documental volta a ser obrigatória.</p></div> : <ComparisonTable rows={comparisons} referenceVerified={referenceVerified} title={`Conferência da folha · ${competence}`} />}
              {deferredEntries.length > 0 && <div className="rounded-md border border-border p-4"><p className="text-sm font-medium text-foreground">Ajustes por competência de recolhimento</p>{deferredEntries.map(row => <p key={row.id} className="mt-2 text-sm text-muted-foreground">{row.rubricDescription || row.history}: {money(row.amountInCents)} → {row.targetCompetence}</p>)}</div>}
              {processingMeta && <p className="text-xs text-muted-foreground">Fluxo: {processingMeta.routing || processingMeta.primaryModel}{processingMeta.reviewed ? ` · releitura: ${processingMeta.reviewModel || processingMeta.model}` : ""}</p>}
              {!manualOnly && (warnings.length > 0 || structuralIssues.length > 0) && <div className="rounded-md bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Pontos que exigem decisão</p>{[...new Set([...warnings, ...structuralIssues])].map(issue => <p key={issue} className="mt-2 flex gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{issue}</p>)}</div>}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </section>

    <WrongCompetenceImportDialog
      open={Boolean(pendingWrongImport)}
      currentCompetence={competence}
      detectedCompetence={pendingWrongImport?.detectedCompetence ?? ""}
      fileNames={pendingWrongImport?.files.map(file => file.name) ?? []}
      keeping={resolvingWrongImport}
      removing={false}
      onKeep={() => void keepWrongImport()}
      onRemove={() => setPendingWrongImport(null)}
    />
  </>;
}

function Header({ title }: { title: string }) { return <div className="mb-5"><h3 className="font-semibold">{title}</h3></div>; }
function Stat({ label, value }: { label: string | number; value: string | number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>; }

function ComparisonTable({ rows, referenceVerified, title }: { rows: PayrollComparison[]; referenceVerified: boolean; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const table = <ComparisonTableContent rows={rows} referenceVerified={referenceVerified} />;
  return <><div className="rounded-md border border-border bg-background"><TableExpandButton onClick={() => setExpanded(true)} /><div className="overflow-x-auto">{table}</div></div><Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[88vh] w-[94vw] max-w-[1480px] overflow-hidden border-border bg-background p-0"><DialogHeader className="border-b border-border px-6 py-5 text-left"><DialogTitle>{title}</DialogTitle></DialogHeader><div className="max-h-[76vh] overflow-auto">{table}</div></DialogContent></Dialog></>;
}

function ComparisonTableContent({ rows, referenceVerified }: { rows: PayrollComparison[]; referenceVerified: boolean }) {
  return <table className="w-full min-w-[760px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[34%] px-2 py-2">Referência</th><th className="w-[16%] px-2 py-2 text-right">Documento original</th><th className="w-[16%] px-2 py-2 text-right">Lançamentos</th><th className="w-[14%] px-2 py-2 text-right">Diferença</th><th className="w-[20%] px-2 py-2">Resultado</th></tr></thead><tbody>{rows.map(row => {
    const informational = row.blocking === false;
    const confers = referenceVerified && row.differenceInCents === 0;
    return <tr key={`${row.key}-${row.source}`} className="border-t border-border"><td className="px-2 py-2"><p className="truncate font-medium text-foreground" title={row.label}>{row.label}</p><p className="mt-0.5 truncate text-[10px] text-muted-foreground" title={row.source}>{row.source}</p>{row.note && <p className="mt-1 line-clamp-2 text-[10px] text-muted-foreground">{row.note}</p>}</td><td className="px-2 py-2 text-right tabular-nums">{money(row.documentAmountInCents)}</td><td className="px-2 py-2 text-right tabular-nums">{money(row.entriesAmountInCents)}</td><td className={cn("px-2 py-2 text-right tabular-nums", !informational && row.differenceInCents !== 0 && "font-medium text-destructive", informational && row.differenceInCents !== 0 && "text-muted-foreground")}>{money(row.differenceInCents)}</td><td className="px-2 py-2">{informational ? <span className="text-muted-foreground">Informativo</span> : confers ? <span className="inline-flex items-center gap-1 text-foreground"><CheckCircle2 className="h-3.5 w-3.5" />Confere</span> : <span className="text-destructive">Revisar</span>}</td></tr>;
  })}{!rows.length && <tr><td colSpan={5} className="h-28 text-center text-muted-foreground">Reprocesse o documento para gerar a conferência independente.</td></tr>}</tbody></table>;
}

function Ledger({ rows, editable, update, title }: { rows: PayrollEntry[]; editable?: boolean; update?: (id: string, field: keyof PayrollEntry, value: string) => void; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const table = <LedgerTable rows={rows} editable={editable} update={update} />;
  return <><div className="rounded-md border border-border bg-background"><TableExpandButton onClick={() => setExpanded(true)} /><div className="overflow-x-auto">{table}</div></div><Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[88vh] w-[96vw] max-w-[1580px] overflow-hidden border-border bg-background p-0"><DialogHeader className="border-b border-border px-6 py-5 text-left"><DialogTitle>{title}</DialogTitle></DialogHeader><div className="max-h-[76vh] overflow-auto">{table}</div></DialogContent></Dialog></>;
}

function LedgerTable({ rows, editable, update }: { rows: PayrollEntry[]; editable?: boolean; update?: (id: string, field: keyof PayrollEntry, value: string) => void }) {
  return <table className="w-full min-w-[920px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[9%] border-b border-r border-border px-2 py-2">Data</th><th className="w-[31%] border-b border-r border-border px-2 py-2">Histórico</th><th className="w-[10%] border-b border-r border-border px-2 py-2">Débito</th><th className="w-[8%] border-b border-r border-border px-2 py-2">C.C. D.</th><th className="w-[10%] border-b border-r border-border px-2 py-2">Crédito</th><th className="w-[8%] border-b border-r border-border px-2 py-2">C.C. C.</th><th className="w-[12%] border-b border-r border-border px-2 py-2 text-right">Valor</th><th className="w-[12%] border-b border-border px-2 py-2">Mapeamento</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className={cn("h-8 border-b border-border", row.mappingNeedsApproval && "bg-amber-500/[0.035]")}>
    <td className="border-r border-border">{editable ? <Input className={cellClass} value={row.date} onChange={event => update?.(row.id, "date", event.target.value)} /> : <span className={cn(displayCellClass, "tabular-nums")}>{row.date || "—"}</span>}</td>
    <td className="border-r border-border">{editable ? <Input className={cellClass} value={row.history} onChange={event => update?.(row.id, "history", event.target.value)} /> : <span className={cn(displayCellClass, "truncate")} title={row.history}>{row.history || "—"}</span>}</td>
    <td className="border-r border-border"><AccountCodeCell side="debit" code={row.debitCode} description={row.debitDescription} editable={editable} onChange={value => update?.(row.id, "debitCode", value)} /></td>
    <td className="border-r border-border">{editable ? <Input className={cellClass} value={row.debitCostCenter || ""} onChange={event => update?.(row.id, "debitCostCenter", event.target.value)} /> : <span className={cn(displayCellClass, "truncate")} title={row.debitCostCenter}>{row.debitCostCenter || "—"}</span>}</td>
    <td className="border-r border-border"><AccountCodeCell side="credit" code={row.creditCode} description={row.creditDescription} editable={editable} onChange={value => update?.(row.id, "creditCode", value)} /></td>
    <td className="border-r border-border">{editable ? <Input className={cellClass} value={row.creditCostCenter || ""} onChange={event => update?.(row.id, "creditCostCenter", event.target.value)} /> : <span className={cn(displayCellClass, "truncate")} title={row.creditCostCenter}>{row.creditCostCenter || "—"}</span>}</td>
    <td className="border-r border-border text-right tabular-nums">{editable ? <Input className={cn(cellClass, "text-right")} value={(row.amountInCents / 100).toFixed(2).replace(".", ",")} onChange={event => update?.(row.id, "amountInCents", event.target.value)} /> : <span className={cn(displayCellClass, "justify-end")}>{money(row.amountInCents)}</span>}</td>
    <td><span className={displayCellClass}><MappingLabel row={row} /></span></td>
  </tr>)}{!rows.length && <tr><td colSpan={8} className="h-40 text-center text-muted-foreground">Importe a folha para iniciar.</td></tr>}</tbody></table>;
}

function AccountCodeCell({ code, description, side, editable, onChange }: { code: string; description: string; side: "debit" | "credit"; editable?: boolean; onChange: (value: string) => void }) {
  if (editable) {
    return <AccountCodeHover code={code} description={description} side={side}><div className="flex h-7 cursor-help items-center gap-1 pr-1"><Input className={cellClass} value={code || ""} onChange={event => onChange(event.target.value)} /><Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" /></div></AccountCodeHover>;
  }
  return <div className={displayCellClass}><AccountCodeHover code={code} description={description} side={side} /></div>;
}

function TableExpandButton({ onClick }: { onClick: () => void }) { return <div className="flex h-8 items-center justify-end border-b border-border px-2"><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onClick} title="Expandir tabela" aria-label="Expandir tabela"><Maximize2 className="h-3.5 w-3.5" /></Button></div>; }

function MappingLabel({ row }: { row: PayrollEntry }) {
  const complete = isCompleteMapping(row);
  const source = row.mappingSource || (complete ? "predefined" : "unresolved");
  const labels: Record<string, string> = { learned: "Aprendido", predefined: "Pré-definido", ai: "IA · revisar", manual: row.mappingNeedsApproval ? "Manual · revisar" : "Manual · conferido", unresolved: "Pendente" };
  return <span title={row.mappingReason || ""} className={cn("text-[11px]", source === "learned" && "text-emerald-600 dark:text-emerald-400", source === "ai" && "font-medium text-amber-700 dark:text-amber-300", source === "manual" && row.mappingNeedsApproval && "font-medium text-amber-700 dark:text-amber-300", source === "manual" && !row.mappingNeedsApproval && "text-emerald-600 dark:text-emerald-400", source === "unresolved" && "font-medium text-destructive", source === "predefined" && "text-muted-foreground")}>{labels[source] || source}</span>;
}

function uniqueFiles(files: File[]) {
  const seen = new Set<string>();
  return files.filter(file => { const key = `${file.name}:${file.size}:${file.lastModified}`; if (seen.has(key)) return false; seen.add(key); return true; });
}