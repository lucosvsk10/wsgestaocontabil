import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Maximize2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { AccountingWorkflowSteps, AccountCodeHover } from "./AccountingWorkflowUI";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { exportAccountingWorkbook } from "@/lib/lancamentos/accountingExportWorkbook";
import { PurchaseComparison, PurchaseEntry, PurchaseItem, PurchaseProcessingMeta, PurchaseReference } from "@/lib/lancamentos/purchaseWorkbook";
import { deleteWorkspaceData, loadWorkspaceData, loadWorkspaceFiles, removeWorkspaceFiles, saveWorkspaceData, saveWorkspaceFiles } from "@/lib/lancamentos/workspaceStorage";
import { WorkspaceStatus } from "./DespesasWorkspace";
import { cn } from "@/lib/utils";
import { PurchaseProcessingResult, useAccountingProcessing } from "@/contexts/AccountingProcessingContext";
import { supabase } from "@/integrations/supabase/client";
import { WrongCompetenceImportDialog } from "./WrongCompetenceImportDialog";

interface Props {
  company: string;
  month: string;
  year: string;
  onStatusChange: (status: WorkspaceStatus) => void;
  onCompetenceChange: (month: string, year: string) => void;
}

interface SavedPurchases {
  items: PurchaseItem[];
  reference?: PurchaseReference | null;
  entries: PurchaseEntry[];
  comparisons?: PurchaseComparison[];
  warnings?: string[];
  validationIssues?: string[];
  processingMeta?: PurchaseProcessingMeta | null;
  referenceVerified?: boolean;
  validated?: boolean;
}

interface PendingWrongImport {
  files: File[];
  detectedCompetence: string;
}

const cellClass = "h-7 rounded-none border-0 bg-transparent px-1.5 text-xs shadow-none focus-visible:ring-1";
const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
const isCompleteMapping = (row: PurchaseEntry) => Boolean(row.debitCode && row.creditCode && row.debitDescription && row.creditDescription);

export function ComprasWorkspace({ company, month, year, onStatusChange, onCompetenceChange }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [entries, setEntries] = useState<PurchaseEntry[]>([]);
  const [reference, setReference] = useState<PurchaseReference | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [processingMeta, setProcessingMeta] = useState<PurchaseProcessingMeta | null>(null);
  const [referenceVerified, setReferenceVerified] = useState(false);
  const [accounts, setAccounts] = useState<ChartAccount[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState("transcricao");
  const [learning, setLearning] = useState(false);
  const [deletingFile, setDeletingFile] = useState<string | null>(null);
  const [pendingWrongImport, setPendingWrongImport] = useState<PendingWrongImport | null>(null);
  const [resolvingWrongImport, setResolvingWrongImport] = useState(false);
  const { processPurchases, isProcessingScope } = useAccountingProcessing();
  const processing = isProcessingScope(company, month, year, "compras");
  const scope = `${company}:${year}:${month}:compras`;
  const key = `${scope}:parsed`;
  const competence = `${month}/${year}`;
  const tabKey = `ws:compras:last-tab:${company}`;

  const comparisons = useMemo<PurchaseComparison[]>(() => {
    if (!reference) return [];
    const itemTotal = items.reduce((sum, item) => sum + item.amountInCents, 0);
    const launchTotal = entries.reduce((sum, entry) => sum + entry.amountInCents, 0);
    return [
      { key: "quantity", label: "Quantidade de entradas", documentValue: reference.quantity, extractedValue: items.length, difference: items.length - reference.quantity, format: "number", source: reference.source, blocking: true },
      { key: "document_total", label: "Valor Total", documentValue: reference.totalAmountInCents, extractedValue: itemTotal, difference: itemTotal - reference.totalAmountInCents, format: "currency", source: reference.source, blocking: true },
      { key: "launch_total", label: "Lançamento consolidado", documentValue: reference.totalAmountInCents, extractedValue: launchTotal, difference: launchTotal - reference.totalAmountInCents, format: "currency", source: "Consolidação mensal das entradas", blocking: true, note: "Um único lançamento no último dia da competência, somando todas as entradas do mês." },
    ];
  }, [entries, items, reference]);

  const blockingDifferences = comparisons.filter(row => row.blocking && row.difference !== 0);
  const missing = entries.filter(row => !isCompleteMapping(row)).length;
  const mappingsToApprove = entries.filter(row => row.mappingNeedsApproval && isCompleteMapping(row)).length;
  const learnedMappings = entries.filter(row => row.mappingSource === "learned").length;
  const canReviewApprove = referenceVerified && !processing && !learning && missing === 0 && blockingDifferences.length === 0 && warnings.length === 0 && validationIssues.length === 0;
  const canFinalize = canReviewApprove && mappingsToApprove === 0;
  const conferenceCount = blockingDifferences.length + missing + mappingsToApprove + warnings.length + validationIssues.length + (referenceVerified ? 0 : 1);

  const hydrateSaved = (saved: SavedPurchases | PurchaseProcessingResult) => {
    setItems(saved.items ?? []);
    setEntries(saved.entries ?? []);
    setReference(saved.reference ?? null);
    setWarnings(saved.warnings ?? []);
    setValidationIssues(saved.validationIssues ?? []);
    setProcessingMeta(saved.processingMeta ?? null);
    setReferenceVerified(Boolean(saved.referenceVerified));
  };

  const resetWorkspaceState = () => {
    setItems([]);
    setEntries([]);
    setReference(null);
    setWarnings([]);
    setValidationIssues([]);
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
      loadWorkspaceData<SavedPurchases>(key),
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
    void saveWorkspaceData(key, { items, entries, reference, comparisons, warnings, validationIssues, processingMeta, referenceVerified });
  }, [comparisons, entries, items, key, loaded, processingMeta, reference, referenceVerified, validationIssues, warnings]);

  const updateEntry = (id: string, field: keyof PurchaseEntry, value: string) => setEntries(rows => rows.map(row => {
    if (row.id !== id) return row;
    if (field === "amountInCents") return { ...row, amountInCents: Math.round(Number(value.replace(/\D/g, ""))) };
    if (field === "debitCode" || field === "creditCode") {
      const account = accounts.find(item => item.reducedCode === value.trim());
      const changed = field === "debitCode"
        ? { ...row, debitCode: value, debitDescription: account?.description ?? "" }
        : { ...row, creditCode: value, creditDescription: account?.description ?? "" };
      return { ...changed, mappingSource: "manual" as const, mappingNeedsApproval: true, mappingConfidence: 1, mappingReason: "Mapeamento ajustado manualmente e aguardando confirmação para virar conhecimento da empresa." };
    }
    if (field === "debitCostCenter" || field === "creditCostCenter") {
      return { ...row, [field]: value, mappingSource: "manual" as const, mappingNeedsApproval: true, mappingConfidence: 1, mappingReason: "Mapeamento ajustado manualmente e aguardando confirmação para virar conhecimento da empresa." };
    }
    return { ...row, [field]: value };
  }));

  const runProcessing = async (selected: File[], operation: "import" | "reprocess", targetMonth: string, targetYear: string) => {
    if (!accounts.length) throw new Error("Importe o plano de contas desta empresa antes de processar Compras.");
    if (!selected.length) throw new Error("Nenhum relatório de compras está disponível para processamento.");
    return processPurchases({ company, month: targetMonth, year: targetYear, files: selected, accounts, operation });
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
      if (targetMonth === month && targetYear === year) setValidationIssues([error instanceof Error ? error.message : "Falha ao processar Compras com IA."]);
      return null;
    }
  };

  const importFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;
    if (!accounts.length) { setValidationIssues(["Importe o plano de contas desta empresa antes de processar Compras."]); return; }

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
      setValidationIssues([error instanceof Error ? error.message : "Falha ao processar Compras com IA."]);
    }
  };

  const keepWrongImport = async () => {
    const pending = pendingWrongImport;
    if (!pending) return;
    const [targetMonth, targetYear] = pending.detectedCompetence.split("/");
    if (!targetMonth || !targetYear) return;
    setResolvingWrongImport(true);
    try {
      const targetScope = `${company}:${targetYear}:${targetMonth}:compras`;
      const targetKey = `${targetScope}:parsed`;
      const existingTargetFiles = await loadWorkspaceFiles(targetScope);
      const targetFiles = uniqueFiles([...existingTargetFiles, ...pending.files]);
      const result = await runProcessing(targetFiles, "import", targetMonth, targetYear);
      await saveWorkspaceFiles(targetScope, pending.files, { skipCompetencePrompt: true });
      await saveWorkspaceData(targetKey, result);
      setPendingWrongImport(null);
      onCompetenceChange(targetMonth, targetYear);
    } catch (error) {
      setValidationIssues([error instanceof Error ? error.message : "Não foi possível mover Compras para a competência detectada."]);
    } finally {
      setResolvingWrongImport(false);
    }
  };

  const deleteFile = async (file: File) => {
    setDeletingFile(file.name);
    const remaining = files.filter(item => !(item.name === file.name && item.size === file.size));
    try {
      await removeWorkspaceFiles(scope, [file]);
      onStatusChange("waiting");
      if (!remaining.length) {
        setLoaded(false);
        setFiles([]);
        resetWorkspaceState();
        await deleteWorkspaceData(key);
        setLoaded(true);
        return;
      }

      setLoaded(false);
      const result = await runProcessing(remaining, "reprocess", month, year);
      setFiles(remaining);
      hydrateSaved(result);
      setLoaded(true);
      onStatusChange("review");
    } catch (error) {
      setLoaded(true);
      setValidationIssues(current => [...new Set([...current, error instanceof Error ? error.message : "Falha ao excluir o documento e reconstruir Compras."])]);
    } finally {
      setDeletingFile(null);
    }
  };

  const approveAndFinalize = async () => {
    if (!canReviewApprove) return;
    if (mappingsToApprove === 0) { onStatusChange("done"); setActiveTab("lancamentos"); return; }
    setLearning(true);
    try {
      const { data, error } = await supabase.functions.invoke("learn-accounting-mappings", { body: { module: "compras", company_id: company, entries } });
      if (error) throw error;
      if (!data || typeof data.learned !== "number") throw new Error("O sistema não confirmou o aprendizado do mapeamento de Compras.");
      setEntries(rows => rows.map(row => row.mappingNeedsApproval && isCompleteMapping(row) ? { ...row, mappingSource: "learned", mappingNeedsApproval: false, mappingConfidence: 1, mappingReason: "Mapeamento conferido e salvo como conhecimento desta empresa." } : row));
      onStatusChange("done");
      setActiveTab("lancamentos");
    } catch (error) {
      setValidationIssues(current => [...new Set([...current, error instanceof Error ? `Não foi possível salvar o aprendizado: ${error.message}` : "Não foi possível salvar o aprendizado de Compras."])]);
    } finally { setLearning(false); }
  };

  const exportToCalima = () => exportAccountingWorkbook({
    moduleTitle: "Compras",
    competence,
    fileName: `compras-${month}-${year}.xlsx`,
    entries: entries.map(row => ({
      date: row.date, amountInCents: row.amountInCents, debitCode: row.debitCode, creditCode: row.creditCode, history: row.history,
      debitCostCenter: row.debitCostCenter, creditCostCenter: row.creditCostCenter, debitDescription: row.debitDescription, creditDescription: row.creditDescription,
      referenceCode: row.rubricCode, referenceDescription: row.rubricDescription, type: row.kind, section: row.section, mappingSource: row.mappingSource, mappingReason: row.mappingReason,
    })),
    comparisons: comparisons.map(row => ({
      label: row.label,
      documentAmountInCents: row.format === "currency" ? row.documentValue : row.documentValue * 100,
      entriesAmountInCents: row.format === "currency" ? row.extractedValue : row.extractedValue * 100,
      differenceInCents: row.format === "currency" ? row.difference : row.difference * 100,
      source: row.source,
      blocking: row.blocking,
      note: row.format === "number" ? `Quantidade: documento ${row.documentValue} · transcrição ${row.extractedValue}` : row.note,
    })),
    note: "Compras são consolidadas em um único lançamento por competência, somando todas as entradas do Relatório de Entrada de Mercadoria.",
  });

  return <>
    <section className="mt-8 space-y-8">
      <div className="rounded-md border border-border bg-background p-6">
        <div className="flex items-center justify-between gap-5">
          <div><h3 className="font-semibold">Compras de {competence}</h3><p className="mt-1 text-xs text-muted-foreground">Relatório de Entrada de Mercadoria → transcrição individual → lançamento mensal consolidado.</p></div>
          <div className="flex flex-wrap justify-end gap-2">
            {files.length > 0 && <Button variant="outline" onClick={() => void startProcessing(files, "reprocess", month, year)} disabled={processing}>{processing ? "Processando..." : "Reprocessar com IA"}</Button>}
            <Button variant="outline" onClick={() => input.current?.click()} disabled={processing}>Importar compras de {competence}</Button>
          </div>
          <input ref={input} type="file" multiple accept=".pdf" className="sr-only" onChange={event => void importFiles(event)} />
        </div>
        <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-5 text-sm text-muted-foreground">
          {files.length ? files.map(file => <span key={`${file.name}-${file.size}`} className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-border bg-muted/25 px-2.5 py-1.5 text-xs text-foreground"><span className="max-w-[420px] truncate" title={file.name}>{file.name}</span><Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0 text-muted-foreground hover:text-destructive" disabled={Boolean(deletingFile) || processing} onClick={() => void deleteFile(file)} title="Excluir documento e seus lançamentos"><Trash2 className="h-3.5 w-3.5" /></Button></span>) : "Nenhum relatório importado."}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <AccountingWorkflowSteps steps={[
          { value: "transcricao", label: "Transcrição", count: items.length },
          { value: "lancamentos", label: "Lançamentos", count: entries.length },
          { value: "conferencia", label: "Conferência", count: conferenceCount },
        ]} />

        <TabsContent value="transcricao" className="mt-7">
          <Header title="Compras · Transcrição" subtitle="Cada entrada do relatório permanece individual para conferência; a consolidação acontece só no lançamento contábil." />
          {reference && <div className="mb-4 grid gap-3 sm:grid-cols-2"><ReferenceCard label="Quantidade de entradas" value={String(reference.quantity)} /><ReferenceCard label="Valor Total do PDF" value={money(reference.totalAmountInCents)} /></div>}
          <PurchaseItemsTable rows={items} title={`Transcrição de compras · ${competence}`} />
        </TabsContent>

        <TabsContent value="lancamentos" className="mt-7">
          <Header title="Compras · Lançamentos" subtitle="Um lançamento consolidado no último dia do mês, somando todas as entradas." />
          <div className="rounded-md border border-border bg-background">
            <div className="flex items-center justify-between border-b border-border p-5"><span className="text-sm text-muted-foreground">{entries.length ? `${entries.length} lançamento consolidado · ${money(entries[0].amountInCents)}` : "Sem lançamento nesta competência"}</span><Button disabled={!canFinalize || !entries.length} onClick={exportToCalima}>Exportar para o Calima</Button></div>
            <PurchaseLedger rows={entries} editable update={updateEntry} title={`Lançamentos de compras · ${competence}`} />
            {!canFinalize && entries.length > 0 && <p className="px-5 pb-4 text-xs text-muted-foreground">{mappingsToApprove > 0 ? "Confirme o mapeamento na aba Conferência para liberar a exportação." : "A exportação será liberada quando quantidade, valor e mapeamento estiverem conferidos."}</p>}
          </div>
        </TabsContent>

        <TabsContent value="conferencia" className="mt-7">
          <Header title="Compras · Conferência" subtitle="Quantidade e valor do documento original precisam fechar com a transcrição e com o lançamento consolidado." />
          <div className="rounded-md border border-border bg-background">
            <div className="flex flex-col gap-3 border-b border-border bg-muted/20 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div><p className="text-sm font-semibold text-foreground">Fechar conferência de compras</p><p className="mt-1 text-xs text-muted-foreground">Confirme o mês aqui depois de revisar quantidade, valor consolidado e mapeamento.</p></div>
              <Button className="shrink-0" disabled={!canReviewApprove || !entries.length} onClick={() => void approveAndFinalize()}>{learning ? "Salvando conhecimento..." : mappingsToApprove > 0 ? "Confirmar e aprender" : "Marcar compras como OK"}</Button>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid gap-5 sm:grid-cols-5"><Stat label="Entradas PDF" value={reference?.quantity ?? 0} /><Stat label="Entradas transcritas" value={items.length} /><Stat label="Diferenças" value={blockingDifferences.length} /><Stat label="Aguardando aprovação" value={mappingsToApprove} /><Stat label="Conhecimento reutilizado" value={learnedMappings} /></div>
              {!referenceVerified && <div className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />A conferência independente do relatório ainda não fechou. A exportação permanece bloqueada.</div>}
              {mappingsToApprove > 0 && <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-4"><p className="text-sm font-medium text-foreground">Mapeamento novo aguardando sua conferência</p><p className="mt-1 text-xs text-muted-foreground">Depois de aprovado, Mercadoria para Revenda → Fornecedores será reaproveitado automaticamente para esta empresa.</p></div>}
              <PurchaseComparisonTable rows={comparisons} referenceVerified={referenceVerified} />
              {(warnings.length > 0 || validationIssues.length > 0) && <div className="rounded-md bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Pontos que exigem decisão</p>{[...new Set([...warnings, ...validationIssues])].map(issue => <p key={issue} className="mt-2 flex gap-2 text-sm text-muted-foreground"><AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />{issue}</p>)}</div>}
              {processingMeta && <p className="text-xs text-muted-foreground">Fluxo: {processingMeta.routing || processingMeta.primaryModel}</p>}
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

function Header({ title, subtitle }: { title: string; subtitle: string }) { return <div className="mb-5"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-muted-foreground">{subtitle}</p></div>; }
function ReferenceCard({ label, value }: { label: string; value: string }) { return <div className="rounded-md border border-border bg-background px-4 py-3"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <div><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold tabular-nums">{value}</p></div>; }

function PurchaseItemsTable({ rows, title }: { rows: PurchaseItem[]; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const table = <table className="w-full min-w-[920px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[9%] border-b border-r border-border px-2 py-2">Entrada</th><th className="w-[38%] border-b border-r border-border px-2 py-2">Fornecedor</th><th className="w-[14%] border-b border-r border-border px-2 py-2 text-right">Valor</th><th className="w-[14%] border-b border-r border-border px-2 py-2">Data emissão</th><th className="w-[14%] border-b border-r border-border px-2 py-2">Data entrada</th><th className="w-[11%] border-b border-border px-2 py-2">Situação</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className="h-7 border-b border-border"><td className="border-r border-border px-2 py-1.5 tabular-nums">{row.entryNumber || "—"}</td><td className="border-r border-border px-2 py-1.5"><span className="block truncate" title={row.supplier}>{row.supplier || "—"}</span></td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{money(row.amountInCents)}</td><td className="border-r border-border px-2 py-1.5 tabular-nums">{row.emissionDate || "—"}</td><td className="border-r border-border px-2 py-1.5 tabular-nums">{row.entryDate || "—"}</td><td className="px-2 py-1.5">{row.situation || "—"}</td></tr>)}{!rows.length && <tr><td colSpan={6} className="h-40 text-center text-muted-foreground">Importe um Relatório de Entrada de Mercadoria para iniciar.</td></tr>}</tbody></table>;
  return <><div className="rounded-md border border-border bg-background"><TableExpandButton onClick={() => setExpanded(true)} /><div className="overflow-x-auto">{table}</div></div><Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[88vh] w-[96vw] max-w-[1580px] overflow-hidden border-border bg-background p-0"><DialogHeader className="border-b border-border px-6 py-5 text-left"><DialogTitle>{title}</DialogTitle></DialogHeader><div className="max-h-[76vh] overflow-auto">{table}</div></DialogContent></Dialog></>;
}

function PurchaseLedger({ rows, editable, update, title }: { rows: PurchaseEntry[]; editable?: boolean; update?: (id: string, field: keyof PurchaseEntry, value: string) => void; title: string }) {
  const [expanded, setExpanded] = useState(false);
  const table = <table className="w-full min-w-[920px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[9%] border-b border-r border-border px-2 py-2">Data</th><th className="w-[31%] border-b border-r border-border px-2 py-2">Histórico</th><th className="w-[10%] border-b border-r border-border px-2 py-2">Débito</th><th className="w-[8%] border-b border-r border-border px-2 py-2">C.C. D.</th><th className="w-[10%] border-b border-r border-border px-2 py-2">Crédito</th><th className="w-[8%] border-b border-r border-border px-2 py-2">C.C. C.</th><th className="w-[12%] border-b border-r border-border px-2 py-2 text-right">Valor</th><th className="w-[12%] border-b border-border px-2 py-2">Mapeamento</th></tr></thead><tbody>{rows.map(row => <tr key={row.id} className={cn("h-7 border-b border-border", row.mappingNeedsApproval && "bg-amber-500/[0.035]")}><td className="border-r border-border">{editable ? <Input className={cellClass} value={row.date} onChange={e => update?.(row.id, "date", e.target.value)} /> : <span className="block px-2 py-1.5">{row.date}</span>}</td><td className="border-r border-border">{editable ? <Input className={cellClass} value={row.history} onChange={e => update?.(row.id, "history", e.target.value)} /> : <span className="block truncate px-2 py-1.5">{row.history}</span>}</td><td className="border-r border-border"><EditableAccount row={row} side="debit" editable={editable} update={update} /></td><td className="border-r border-border">{editable ? <Input className={cellClass} value={row.debitCostCenter} onChange={e => update?.(row.id, "debitCostCenter", e.target.value)} /> : <span className="block px-2 py-1.5">{row.debitCostCenter || "—"}</span>}</td><td className="border-r border-border"><EditableAccount row={row} side="credit" editable={editable} update={update} /></td><td className="border-r border-border">{editable ? <Input className={cellClass} value={row.creditCostCenter} onChange={e => update?.(row.id, "creditCostCenter", e.target.value)} /> : <span className="block px-2 py-1.5">{row.creditCostCenter || "—"}</span>}</td><td className="border-r border-border px-2 py-1.5 text-right tabular-nums">{money(row.amountInCents)}</td><td className="px-2 py-1.5"><MappingLabel row={row} /></td></tr>)}{!rows.length && <tr><td colSpan={8} className="h-40 text-center text-muted-foreground">Nenhum lançamento consolidado nesta competência.</td></tr>}</tbody></table>;
  return <><div className="rounded-md border border-border bg-background"><TableExpandButton onClick={() => setExpanded(true)} /><div className="overflow-x-auto">{table}</div></div><Dialog open={expanded} onOpenChange={setExpanded}><DialogContent className="max-h-[88vh] w-[96vw] max-w-[1580px] overflow-hidden border-border bg-background p-0"><DialogHeader className="border-b border-border px-6 py-5 text-left"><DialogTitle>{title}</DialogTitle></DialogHeader><div className="max-h-[76vh] overflow-auto">{table}</div></DialogContent></Dialog></>;
}

function EditableAccount({ row, side, editable, update }: { row: PurchaseEntry; side: "debit" | "credit"; editable?: boolean; update?: (id: string, field: keyof PurchaseEntry, value: string) => void }) {
  const code = side === "debit" ? row.debitCode : row.creditCode;
  const description = side === "debit" ? row.debitDescription : row.creditDescription;
  const field: keyof PurchaseEntry = side === "debit" ? "debitCode" : "creditCode";
  if (editable) return <AccountCodeHover code={code} description={description} side={side}><div className="w-full"><Input className={cellClass} value={code} onChange={e => update?.(row.id, field, e.target.value)} /></div></AccountCodeHover>;
  return <AccountCodeHover code={code} description={description} side={side} />;
}

function MappingLabel({ row }: { row: PurchaseEntry }) {
  const labels: Record<string, string> = { learned: "Aprendido", predefined: "Pré-definido", ai: "IA · revisar", manual: "Manual · revisar", unresolved: "Pendente" };
  const source = row.mappingSource || (isCompleteMapping(row) ? "predefined" : "unresolved");
  return <span title={row.mappingReason || ""} className={cn("text-[11px]", source === "learned" && "text-emerald-600 dark:text-emerald-400", source === "ai" && "font-medium text-amber-700 dark:text-amber-300", source === "manual" && row.mappingNeedsApproval && "font-medium text-amber-700 dark:text-amber-300", source === "unresolved" && "font-medium text-destructive", source === "predefined" && "text-muted-foreground")}>{labels[source] || source}</span>;
}

function PurchaseComparisonTable({ rows, referenceVerified }: { rows: PurchaseComparison[]; referenceVerified: boolean }) {
  return <div className="overflow-x-auto rounded-md border border-border"><table className="w-full min-w-[760px] table-fixed text-xs"><thead className="bg-muted/50 text-left text-[11px] text-muted-foreground"><tr><th className="w-[34%] px-2 py-2">Referência</th><th className="w-[18%] px-2 py-2 text-right">Documento original</th><th className="w-[18%] px-2 py-2 text-right">Transcrição / lançamento</th><th className="w-[14%] px-2 py-2 text-right">Diferença</th><th className="w-[16%] px-2 py-2">Resultado</th></tr></thead><tbody>{rows.map(row => { const format = (value: number) => row.format === "currency" ? money(value) : String(value); const confers = referenceVerified && row.difference === 0; return <tr key={row.key} className="border-t border-border"><td className="px-2 py-2"><p className="font-medium text-foreground">{row.label}</p><p className="mt-0.5 text-[10px] text-muted-foreground">{row.source}</p>{row.note && <p className="mt-1 text-[10px] text-muted-foreground">{row.note}</p>}</td><td className="px-2 py-2 text-right tabular-nums">{format(row.documentValue)}</td><td className="px-2 py-2 text-right tabular-nums">{format(row.extractedValue)}</td><td className={cn("px-2 py-2 text-right tabular-nums", row.difference !== 0 && "font-medium text-destructive")}>{format(row.difference)}</td><td className="px-2 py-2">{confers ? <span className="inline-flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5" />Confere</span> : <span className="text-destructive">Revisar</span>}</td></tr>; })}</tbody></table></div>;
}

function TableExpandButton({ onClick }: { onClick: () => void }) { return <div className="flex h-8 items-center justify-end border-b border-border px-2"><Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={onClick} title="Expandir tabela"><Maximize2 className="h-3.5 w-3.5" /></Button></div>; }
function uniqueFiles(files: File[]) { const seen = new Set<string>(); return files.filter(file => { const key = `${file.name}:${file.size}:${file.lastModified}`; if (seen.has(key)) return false; seen.add(key); return true; }); }
