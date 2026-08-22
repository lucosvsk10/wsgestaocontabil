import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import { PayrollComparison, PayrollDocumentTotal, PayrollEntry, PayrollProcessingMeta } from "@/lib/lancamentos/payrollWorkbook";
import { PurchaseComparison, PurchaseEntry, PurchaseItem, PurchaseProcessingMeta, PurchaseReference } from "@/lib/lancamentos/purchaseWorkbook";
import { RevenueComparison, RevenueEntry, RevenueProcessingMeta, RevenueReference } from "@/lib/lancamentos/revenueWorkbook";
import { saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";

export type AccountingOperation = "import" | "reprocess";
type AccountingModule = "folha" | "compras" | "faturamento";
type JobStatus = "running" | "success" | "error";
type AccountingEntry = PayrollEntry | PurchaseEntry | RevenueEntry;

type MappingSummary = {
  learnedCount: number;
  predefinedCount: number;
  aiSuggestionsCount: number;
  unresolvedCount: number;
  needsApprovalCount: number;
};

export interface PayrollProcessingResult {
  entries: PayrollEntry[];
  deferredEntries?: PayrollEntry[];
  documentTotals: PayrollDocumentTotal[];
  comparisons: PayrollComparison[];
  warnings: string[];
  validationIssues: string[];
  referenceVerified: boolean;
  validated: boolean;
  processingMeta: PayrollProcessingMeta;
  mappingSummary?: MappingSummary;
}

export interface PurchaseProcessingResult {
  items: PurchaseItem[];
  reference: PurchaseReference | null;
  entries: PurchaseEntry[];
  comparisons: PurchaseComparison[];
  warnings: string[];
  validationIssues: string[];
  referenceVerified: boolean;
  validated: boolean;
  processingMeta: PurchaseProcessingMeta;
  mappingSummary?: MappingSummary;
}

export interface RevenueProcessingResult {
  reference: RevenueReference | null;
  entries: RevenueEntry[];
  comparisons: RevenueComparison[];
  warnings: string[];
  validationIssues: string[];
  referenceVerified: boolean;
  validated: boolean;
  processingMeta: RevenueProcessingMeta;
  mappingSummary?: MappingSummary;
}

interface ProcessingJob {
  id: string;
  status: JobStatus;
  operation: AccountingOperation;
  module: AccountingModule;
  company: string;
  competence: string;
  fileNames: string[];
  startedAt: number;
  finishedAt?: number;
  message?: string;
}

interface StartArgs {
  company: string;
  month: string;
  year: string;
  files: File[];
  accounts: ChartAccount[];
  operation: AccountingOperation;
}

interface AccountingProcessingContextValue {
  job: ProcessingJob | null;
  processPayroll: (args: StartArgs) => Promise<PayrollProcessingResult>;
  processPurchases: (args: StartArgs) => Promise<PurchaseProcessingResult>;
  processRevenue: (args: StartArgs) => Promise<RevenueProcessingResult>;
  isProcessingScope: (company: string, month: string, year: string, module?: AccountingModule) => boolean;
  dismiss: () => void;
}

const AccountingProcessingContext = createContext<AccountingProcessingContextValue | null>(null);

export function AccountingProcessingProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<ProcessingJob | null>(null);

  const dismiss = useCallback(() => {
    setJob(current => current?.status === "running" ? current : null);
  }, []);

  const beginJob = useCallback((module: AccountingModule, args: StartArgs) => {
    const id = crypto.randomUUID();
    const startedAt = Date.now();
    const competence = `${args.month}/${args.year}`;
    setJob({ id, status: "running", operation: args.operation, module, company: args.company, competence, fileNames: args.files.map(file => file.name), startedAt });
    return { id, competence };
  }, []);

  const finishJob = useCallback((id: string, message: string) => {
    setJob(current => current?.id === id ? { ...current, status: "success", finishedAt: Date.now(), message } : current);
  }, []);

  const failJob = useCallback((id: string, error: unknown, fallback: string) => {
    const message = error instanceof Error ? error.message : fallback;
    setJob(current => current?.id === id ? { ...current, status: "error", finishedAt: Date.now(), message } : current);
  }, []);

  const processPayroll = useCallback(async (args: StartArgs) => {
    const { company, month, year, files, accounts } = args;
    const { id, competence } = beginJob("folha", args);

    try {
      const documents = await encodeDocuments(files);
      const { data, error } = await supabase.functions.invoke("process-accounting-document", {
        body: { module: "folha", company_id: company, competence, documents, chart_of_accounts: accounts },
      });
      if (error) throw await functionError(error, "Falha ao processar a folha com IA.");
      if (!data?.entries) throw new Error("O processamento não devolveu lançamentos estruturados.");

      const baseEntries: PayrollEntry[] = data.entries.map((row: PayrollEntry, index: number) => ({ ...row, id: row.id || `${Date.now()}-${index}` }));
      const baseDeferred: PayrollEntry[] = (data.deferredEntries ?? []).map((row: PayrollEntry, index: number) => ({ ...row, id: row.id || `deferred-${Date.now()}-${index}` }));
      const mapping = await resolveMappings("folha", company, competence, baseEntries, baseDeferred, accounts);

      const oldAccountLookupIssue = (issue: string) => issue.toLocaleLowerCase("pt-BR").includes("não foi possível localizar uma conta analítica inequívoca");
      const validationIssues: string[] = (data.validationIssues ?? []).filter((issue: string) => !oldAccountLookupIssue(issue));
      if (mapping.failure) validationIssues.push(`Falha na resolução adaptativa de contas: ${mapping.failure}`);
      if (mapping.summary.unresolvedCount > 0) validationIssues.push(`${mapping.summary.unresolvedCount} lançamento(s) continuam sem débito/crédito completo.`);

      const warnings = data.warnings ?? [];
      const comparisons: PayrollComparison[] = data.comparisons ?? [];
      const hasDifference = comparisons.some(row => row.differenceInCents !== 0 && row.blocking !== false && row.key !== "inss_total");
      const validated = Boolean(data.referenceVerified) && !hasDifference && warnings.length === 0 && validationIssues.length === 0 && mapping.summary.needsApprovalCount === 0;

      const result: PayrollProcessingResult = {
        entries: mapping.entries as PayrollEntry[],
        deferredEntries: mapping.deferredEntries,
        documentTotals: data.documentTotals ?? [],
        comparisons,
        warnings,
        validationIssues: [...new Set(validationIssues)],
        referenceVerified: Boolean(data.referenceVerified),
        validated,
        processingMeta: {
          model: data.model,
          primaryModel: data.primaryModel,
          reviewed: Boolean(data.reviewed),
          reviewModel: data.reviewModel,
          routing: `${data.routing || data.primaryModel} · ${mapping.routing}`,
        },
        mappingSummary: mapping.summary,
      };

      await saveWorkspaceData(`${company}:${year}:${month}:folha:parsed`, result);
      finishJob(id, completionMessage(result.validated, mapping.summary));
      return result;
    } catch (error) {
      failJob(id, error, "Falha ao processar a folha.");
      throw error;
    }
  }, [beginJob, failJob, finishJob]);

  const processPurchases = useCallback(async (args: StartArgs) => {
    const { company, month, year, files, accounts } = args;
    const { id, competence } = beginJob("compras", args);

    try {
      const documents = await encodeDocuments(files);
      const { data, error } = await supabase.functions.invoke("process-purchases-document", {
        body: { module: "compras", company_id: company, competence, documents, chart_of_accounts: accounts },
      });
      if (error) throw await functionError(error, "Falha ao processar Compras com IA.");
      if (!Array.isArray(data?.items) || !Array.isArray(data?.entries)) throw new Error("O processamento de Compras não devolveu dados estruturados.");

      const baseEntries: PurchaseEntry[] = data.entries.map((row: PurchaseEntry, index: number) => ({ ...row, id: row.id || `purchase-${Date.now()}-${index}` }));
      const mapping = await resolveMappings("compras", company, competence, baseEntries, [], accounts);
      const validationIssues: string[] = [...(data.validationIssues ?? [])];
      if (mapping.failure) validationIssues.push(`Falha na resolução adaptativa de contas: ${mapping.failure}`);
      if (mapping.summary.unresolvedCount > 0) validationIssues.push(`${mapping.summary.unresolvedCount} lançamento(s) continuam sem débito/crédito completo.`);

      const warnings = data.warnings ?? [];
      const comparisons: PurchaseComparison[] = data.comparisons ?? [];
      const hasDifference = comparisons.some(row => row.blocking !== false && row.difference !== 0);
      const validated = Boolean(data.referenceVerified) && !hasDifference && warnings.length === 0 && validationIssues.length === 0 && mapping.summary.needsApprovalCount === 0;

      const result: PurchaseProcessingResult = {
        items: data.items,
        reference: data.reference ?? null,
        entries: mapping.entries as PurchaseEntry[],
        comparisons,
        warnings,
        validationIssues: [...new Set(validationIssues)],
        referenceVerified: Boolean(data.referenceVerified),
        validated,
        processingMeta: {
          model: data.model,
          primaryModel: data.primaryModel,
          reviewed: Boolean(data.reviewed),
          reviewModel: data.reviewModel,
          routing: `${data.routing || data.primaryModel} · ${mapping.routing}`,
        },
        mappingSummary: mapping.summary,
      };

      await saveWorkspaceData(`${company}:${year}:${month}:compras:parsed`, result);
      finishJob(id, completionMessage(result.validated, mapping.summary));
      return result;
    } catch (error) {
      failJob(id, error, "Falha ao processar Compras.");
      throw error;
    }
  }, [beginJob, failJob, finishJob]);

  const processRevenue = useCallback(async (args: StartArgs) => {
    const { company, month, year, files, accounts } = args;
    const { id, competence } = beginJob("faturamento", args);

    try {
      const documents = await encodeDocuments(files);
      const { data, error } = await supabase.functions.invoke("process-revenue-document", {
        body: { module: "faturamento", company_id: company, competence, documents, chart_of_accounts: accounts },
      });
      if (error) throw await functionError(error, "Falha ao processar Faturamento com IA.");
      if (!Array.isArray(data?.entries)) throw new Error("O processamento de Faturamento não devolveu lançamentos estruturados.");

      const baseEntries: RevenueEntry[] = data.entries.map((row: RevenueEntry, index: number) => ({ ...row, id: row.id || `revenue-${Date.now()}-${index}` }));
      const mapping = await resolveMappings("faturamento", company, competence, baseEntries, [], accounts);
      const validationIssues: string[] = [...(data.validationIssues ?? [])];
      if (mapping.failure) validationIssues.push(`Falha na resolução adaptativa de contas: ${mapping.failure}`);
      if (mapping.summary.unresolvedCount > 0) validationIssues.push(`${mapping.summary.unresolvedCount} lançamento(s) continuam sem débito/crédito completo.`);

      const warnings = data.warnings ?? [];
      const comparisons: RevenueComparison[] = data.comparisons ?? [];
      const hasDifference = comparisons.some(row => row.blocking !== false && row.differenceInCents !== 0);
      const validated = Boolean(data.referenceVerified) && !hasDifference && warnings.length === 0 && validationIssues.length === 0 && mapping.summary.needsApprovalCount === 0;

      const result: RevenueProcessingResult = {
        reference: data.reference ?? null,
        entries: mapping.entries as RevenueEntry[],
        comparisons,
        warnings,
        validationIssues: [...new Set(validationIssues)],
        referenceVerified: Boolean(data.referenceVerified),
        validated,
        processingMeta: {
          model: data.model,
          primaryModel: data.primaryModel,
          reviewed: Boolean(data.reviewed),
          reviewModel: data.reviewModel,
          routing: `${data.routing || data.primaryModel} · ${mapping.routing}`,
        },
        mappingSummary: mapping.summary,
      };

      await saveWorkspaceData(`${company}:${year}:${month}:faturamento:parsed`, result);
      finishJob(id, completionMessage(result.validated, mapping.summary));
      return result;
    } catch (error) {
      failJob(id, error, "Falha ao processar Faturamento.");
      throw error;
    }
  }, [beginJob, failJob, finishJob]);

  const isProcessingScope = useCallback((company: string, month: string, year: string, module?: AccountingModule) => {
    return Boolean(job?.status === "running" && job.company === company && job.competence === `${month}/${year}` && (!module || job.module === module));
  }, [job]);

  const value = useMemo(() => ({ job, processPayroll, processPurchases, processRevenue, isProcessingScope, dismiss }), [dismiss, isProcessingScope, job, processPayroll, processPurchases, processRevenue]);

  return <AccountingProcessingContext.Provider value={value}>{children}<ProcessingPopup job={job} onDismiss={dismiss} /></AccountingProcessingContext.Provider>;
}

export function useAccountingProcessing() {
  const context = useContext(AccountingProcessingContext);
  if (!context) throw new Error("useAccountingProcessing deve ser usado dentro de AccountingProcessingProvider.");
  return context;
}

async function resolveMappings(module: AccountingModule, company: string, competence: string, entries: AccountingEntry[], deferredEntries: PayrollEntry[], accounts: ChartAccount[]) {
  const defaultSummary: MappingSummary = {
    learnedCount: 0,
    predefinedCount: entries.filter(hasCompleteMapping).length,
    aiSuggestionsCount: 0,
    unresolvedCount: entries.filter(row => !hasCompleteMapping(row)).length,
    needsApprovalCount: 0,
  };
  let resolvedEntries: AccountingEntry[] = entries;
  let resolvedDeferred = deferredEntries;
  let summary = defaultSummary;
  let routing = "regras pré-definidas";
  let failure: string | null = null;

  const { data, error } = await supabase.functions.invoke("resolve-accounting-mappings", {
    body: { module, company_id: company, competence, entries, deferredEntries, chart_of_accounts: accounts },
  });
  if (error) {
    failure = (await functionError(error, "Falha na resolução adaptativa de contas.")).message;
  } else if (data?.entries) {
    resolvedEntries = data.entries;
    resolvedDeferred = data.deferredEntries ?? deferredEntries;
    summary = {
      learnedCount: Number(data.learnedCount ?? 0),
      predefinedCount: Number(data.predefinedCount ?? 0),
      aiSuggestionsCount: Number(data.aiSuggestionsCount ?? 0),
      unresolvedCount: Number(data.unresolvedCount ?? 0),
      needsApprovalCount: Number(data.needsApprovalCount ?? 0),
    };
    routing = data.routing || routing;
  }

  return { entries: resolvedEntries, deferredEntries: resolvedDeferred, summary, routing, failure };
}

function completionMessage(validated: boolean, summary: MappingSummary) {
  return validated
    ? "Processamento concluído e conferido."
    : summary.needsApprovalCount > 0
      ? `Processamento concluído. ${summary.needsApprovalCount} mapeamento(s) sugerido(s) aguardam sua aprovação.`
      : "Processamento concluído, mas exige revisão antes da exportação.";
}

function openProcessedCompetence(job: ProcessingJob) {
  const [month, year] = job.competence.split("/");
  const context = { companyId: job.company, year, selectedMonth: month, selectedModule: job.module, activeTab: "lancamentos" };
  localStorage.setItem("ws-accounting-company-id", job.company);
  localStorage.setItem("ws:lancamentos:last-context", JSON.stringify(context));
  localStorage.setItem(`ws:lancamentos:last-context:${job.company}`, JSON.stringify(context));
  window.location.assign("/admin/lancamentos");
}

function ProcessingPopup({ job, onDismiss }: { job: ProcessingJob | null; onDismiss: () => void }) {
  if (!job) return null;
  const moduleLabel = job.module === "folha" ? "Folha" : job.module === "compras" ? "Compras" : "Faturamento";
  const actionLabel = job.operation === "reprocess" ? `Reprocessando ${moduleLabel.toLowerCase()}` : `Importando ${moduleLabel.toLowerCase()}`;
  return <div className="fixed bottom-5 right-5 z-[100] w-[min(390px,calc(100vw-2rem))] rounded-lg border border-border bg-background p-4 shadow-2xl">
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{job.status === "running" ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> : job.status === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> : <AlertTriangle className="h-5 w-5 text-destructive" />}</div>
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-sm font-semibold text-foreground">{job.status === "running" ? actionLabel : job.status === "success" ? "Processamento concluído" : "Falha no processamento"}</p><p className="mt-0.5 text-xs text-muted-foreground">{moduleLabel} · {job.competence}</p></div>
          {job.status !== "running" && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}><X className="h-4 w-4" /></Button>}
        </div>
        <p className="mt-3 truncate text-xs text-foreground">{fileSummary(job.fileNames)}</p>
        {job.status === "running" ? <><p className="mt-2 text-xs text-muted-foreground">Você pode continuar navegando pelo site enquanto processamos.</p><Elapsed startedAt={job.startedAt} /></> : <><p className="mt-2 text-xs text-muted-foreground">{job.message}</p><p className="mt-2 text-xs tabular-nums text-muted-foreground">Duração: {formatDuration((job.finishedAt ?? Date.now()) - job.startedAt)}</p>{job.status === "success" && <Button type="button" variant="outline" size="sm" className="mt-3 h-8" onClick={() => openProcessedCompetence(job)}>Ir para {job.competence}</Button>}</>}
      </div>
    </div>
  </div>;
}

function Elapsed({ startedAt }: { startedAt: number }) {
  const [, force] = useState(0);
  useInterval(() => force(value => value + 1), 1000);
  return <p className="mt-2 text-xs tabular-nums text-muted-foreground">Tempo decorrido: {formatDuration(Date.now() - startedAt)}</p>;
}

function useInterval(callback: () => void, delay: number) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;
  useEffect(() => {
    const id = window.setInterval(() => callbackRef.current(), delay);
    return () => window.clearInterval(id);
  }, [delay]);
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function fileSummary(fileNames: string[]) {
  if (!fileNames.length) return "Nenhum arquivo";
  if (fileNames.length === 1) return fileNames[0];
  return `${fileNames[0]} + ${fileNames.length - 1} arquivo(s)`;
}

function hasCompleteMapping(row: AccountingEntry) {
  return Boolean(row.debitCode && row.creditCode && row.debitDescription && row.creditDescription);
}

function encodeDocuments(files: File[]) {
  return Promise.all(files.map(async file => ({ name: file.name, mime_type: file.type || "application/pdf", data: await asBase64(file) })));
}

function asBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function functionError(error: unknown, fallback: string) {
  let message = error instanceof Error ? error.message : fallback;
  try {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json();
      message = payload?.error || message;
    }
  } catch {
    // usa a mensagem original
  }
  return new Error(message);
}
