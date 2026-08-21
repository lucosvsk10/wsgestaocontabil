import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { ChartAccount } from "@/lib/lancamentos/chartOfAccounts";
import {
  PayrollComparison,
  PayrollDocumentTotal,
  PayrollEntry,
  PayrollProcessingMeta,
} from "@/lib/lancamentos/payrollWorkbook";
import { saveWorkspaceData } from "@/lib/lancamentos/workspaceStorage";

export type AccountingOperation = "import" | "reprocess";
type JobStatus = "running" | "success" | "error";

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
  mappingSummary?: {
    learnedCount: number;
    predefinedCount: number;
    aiSuggestionsCount: number;
    unresolvedCount: number;
    needsApprovalCount: number;
  };
}

interface ProcessingJob {
  id: string;
  status: JobStatus;
  operation: AccountingOperation;
  module: "folha";
  company: string;
  competence: string;
  fileNames: string[];
  startedAt: number;
  finishedAt?: number;
  message?: string;
}

interface StartPayrollArgs {
  company: string;
  month: string;
  year: string;
  files: File[];
  accounts: ChartAccount[];
  operation: AccountingOperation;
}

interface AccountingProcessingContextValue {
  job: ProcessingJob | null;
  processPayroll: (args: StartPayrollArgs) => Promise<PayrollProcessingResult>;
  isProcessingScope: (company: string, month: string, year: string) => boolean;
  dismiss: () => void;
}

const AccountingProcessingContext = createContext<AccountingProcessingContextValue | null>(null);

export function AccountingProcessingProvider({ children }: { children: ReactNode }) {
  const [job, setJob] = useState<ProcessingJob | null>(null);

  const dismiss = useCallback(() => {
    setJob((current) => (current?.status === "running" ? current : null));
  }, []);

  const processPayroll = useCallback(async ({ company, month, year, files, accounts, operation }: StartPayrollArgs) => {
    const competence = `${month}/${year}`;
    const id = crypto.randomUUID();
    const startedAt = Date.now();
    setJob({
      id,
      status: "running",
      operation,
      module: "folha",
      company,
      competence,
      fileNames: files.map((file) => file.name),
      startedAt,
    });

    try {
      const documents = await Promise.all(files.map(async (file) => ({
        name: file.name,
        mime_type: file.type || "application/pdf",
        data: await asBase64(file),
      })));

      const { data, error } = await supabase.functions.invoke("process-accounting-document", {
        body: {
          module: "folha",
          company_id: company,
          competence,
          documents,
          chart_of_accounts: accounts,
        },
      });
      if (error) throw await functionError(error);
      if (!data?.entries) throw new Error("O processamento não devolveu lançamentos estruturados.");

      const baseEntries: PayrollEntry[] = data.entries.map((row: PayrollEntry, index: number) => ({
        ...row,
        id: row.id || `${Date.now()}-${index}`,
      }));
      const baseDeferred: PayrollEntry[] = (data.deferredEntries ?? []).map((row: PayrollEntry, index: number) => ({
        ...row,
        id: row.id || `deferred-${Date.now()}-${index}`,
      }));

      let resolvedEntries = baseEntries;
      let resolvedDeferred = baseDeferred;
      let mappingSummary = {
        learnedCount: 0,
        predefinedCount: baseEntries.filter(hasCompleteMapping).length,
        aiSuggestionsCount: 0,
        unresolvedCount: baseEntries.filter(row => !hasCompleteMapping(row)).length,
        needsApprovalCount: 0,
      };
      let mappingRouting = "regras pré-definidas";
      let mappingFailure: string | null = null;

      const { data: mappingData, error: mappingError } = await supabase.functions.invoke("resolve-accounting-mappings", {
        body: {
          module: "folha",
          company_id: company,
          competence,
          entries: baseEntries,
          deferredEntries: baseDeferred,
          chart_of_accounts: accounts,
        },
      });

      if (mappingError) {
        mappingFailure = (await functionError(mappingError)).message;
      } else if (mappingData?.entries) {
        resolvedEntries = mappingData.entries;
        resolvedDeferred = mappingData.deferredEntries ?? baseDeferred;
        mappingSummary = {
          learnedCount: Number(mappingData.learnedCount ?? 0),
          predefinedCount: Number(mappingData.predefinedCount ?? 0),
          aiSuggestionsCount: Number(mappingData.aiSuggestionsCount ?? 0),
          unresolvedCount: Number(mappingData.unresolvedCount ?? 0),
          needsApprovalCount: Number(mappingData.needsApprovalCount ?? 0),
        };
        mappingRouting = mappingData.routing || mappingRouting;
      }

      const oldAccountLookupIssue = (issue: string) => issue.toLocaleLowerCase("pt-BR").includes("não foi possível localizar uma conta analítica inequívoca");
      const validationIssues: string[] = (data.validationIssues ?? []).filter((issue: string) => !oldAccountLookupIssue(issue));
      if (mappingFailure) validationIssues.push(`Falha na resolução adaptativa de contas: ${mappingFailure}`);
      if (mappingSummary.unresolvedCount > 0) validationIssues.push(`${mappingSummary.unresolvedCount} lançamento(s) continuam sem débito/crédito completo.`);

      const warnings = data.warnings ?? [];
      const comparisons: PayrollComparison[] = data.comparisons ?? [];
      const hasDifference = comparisons.some(row => row.differenceInCents !== 0 && row.blocking !== false && row.key !== "inss_total");
      const validated = Boolean(data.referenceVerified)
        && !hasDifference
        && warnings.length === 0
        && validationIssues.length === 0
        && mappingSummary.needsApprovalCount === 0;

      const result: PayrollProcessingResult = {
        entries: resolvedEntries,
        deferredEntries: resolvedDeferred,
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
          routing: `${data.routing || data.primaryModel} · ${mappingRouting}`,
        },
        mappingSummary,
      };

      const scope = `${company}:${year}:${month}:folha`;
      await saveWorkspaceData(`${scope}:parsed`, result);

      // Folha usa a competência do documento para os lançamentos. O calendário de
      // recolhimento de INSS/FGTS de férias é informação de auditoria e não gera carryover.

      setJob((current) => current?.id === id ? {
        ...current,
        status: "success",
        finishedAt: Date.now(),
        message: result.validated
          ? "Processamento concluído e conferido."
          : mappingSummary.needsApprovalCount > 0
            ? `Processamento concluído. ${mappingSummary.needsApprovalCount} mapeamento(s) sugerido(s) aguardam sua aprovação.`
            : "Processamento concluído, mas exige revisão antes da exportação.",
      } : current);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Falha ao processar a folha.";
      setJob((current) => current?.id === id ? {
        ...current,
        status: "error",
        finishedAt: Date.now(),
        message,
      } : current);
      throw error;
    }
  }, []);

  const isProcessingScope = useCallback((company: string, month: string, year: string) => {
    return Boolean(job?.status === "running" && job.company === company && job.competence === `${month}/${year}`);
  }, [job]);

  const value = useMemo(() => ({ job, processPayroll, isProcessingScope, dismiss }), [dismiss, isProcessingScope, job, processPayroll]);

  return (
    <AccountingProcessingContext.Provider value={value}>
      {children}
      <ProcessingPopup job={job} onDismiss={dismiss} />
    </AccountingProcessingContext.Provider>
  );
}

export function useAccountingProcessing() {
  const context = useContext(AccountingProcessingContext);
  if (!context) throw new Error("useAccountingProcessing deve ser usado dentro de AccountingProcessingProvider.");
  return context;
}

function openProcessedCompetence(job: ProcessingJob) {
  const [month, year] = job.competence.split("/");
  const context = {
    companyId: job.company,
    year,
    selectedMonth: month,
    selectedModule: "folha",
    activeTab: "lancamentos",
  };
  localStorage.setItem("ws-accounting-company-id", job.company);
  localStorage.setItem("ws:lancamentos:last-context", JSON.stringify(context));
  localStorage.setItem(`ws:lancamentos:last-context:${job.company}`, JSON.stringify(context));
  window.location.assign("/admin/lancamentos");
}

function ProcessingPopup({ job, onDismiss }: { job: ProcessingJob | null; onDismiss: () => void }) {
  if (!job) return null;
  return (
    <div className="fixed bottom-5 right-5 z-[100] w-[min(390px,calc(100vw-2rem))] rounded-lg border border-border bg-background p-4 shadow-2xl">
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          {job.status === "running" ? <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /> :
            job.status === "success" ? <CheckCircle2 className="h-5 w-5 text-emerald-500" /> :
              <AlertTriangle className="h-5 w-5 text-destructive" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">
                {job.status === "running" ? (job.operation === "reprocess" ? "Reprocessando folha" : "Importando folha") :
                  job.status === "success" ? "Processamento concluído" : "Falha no processamento"}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">Folha · {job.competence}</p>
            </div>
            {job.status !== "running" && <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onDismiss}><X className="h-4 w-4" /></Button>}
          </div>
          <p className="mt-3 truncate text-xs text-foreground">{fileSummary(job.fileNames)}</p>
          {job.status === "running" ? (
            <>
              <p className="mt-2 text-xs text-muted-foreground">Você pode continuar navegando pelo site enquanto processamos.</p>
              <Elapsed startedAt={job.startedAt} />
            </>
          ) : (
            <>
              <p className="mt-2 text-xs text-muted-foreground">{job.message}</p>
              <p className="mt-2 text-xs tabular-nums text-muted-foreground">Duração: {formatDuration((job.finishedAt ?? Date.now()) - job.startedAt)}</p>
              {job.status === "success" && (
                <Button type="button" variant="outline" size="sm" className="mt-3 h-8" onClick={() => openProcessedCompetence(job)}>
                  Ir para {job.competence}
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Elapsed({ startedAt }: { startedAt: number }) {
  const [, force] = useState(0);
  useInterval(() => force((value) => value + 1), 1000);
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

function hasCompleteMapping(row: PayrollEntry) {
  return Boolean(row.debitCode && row.creditCode && row.debitDescription && row.creditDescription);
}

function asBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function functionError(error: unknown) {
  let message = error instanceof Error ? error.message : "Falha ao processar a folha com IA.";
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
