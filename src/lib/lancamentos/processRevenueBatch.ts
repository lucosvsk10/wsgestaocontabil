import { supabase } from "@/integrations/supabase/client";
import { ChartAccount } from "./chartOfAccounts";
import { RevenueBatchResult, RevenueBatchPeriodResult } from "./revenueBatch";
import { RevenueComparison, RevenueEntry, RevenueReference } from "./revenueWorkbook";
import { WRONG_COMPETENCE_IMPORT_EVENT, WrongCompetenceImportCancelledError, WrongCompetenceImportRequest } from "./workspaceStorage";

interface Args {
  company: string;
  files: File[];
  accounts: ChartAccount[];
}

type EncodedDocument = { name: string; mime_type: string; data: string };

export interface RevenueCompetenceDetection {
  competences: string[];
  hasUndatedPeriodicBlocks: boolean;
  undatedBlockCount: number;
  evidence: string[];
  warning: string;
}

interface RawRevenuePeriod {
  competence: string;
  reference: RevenueReference;
  entries: RevenueEntry[];
  comparisons: RevenueComparison[];
  warnings: string[];
  validationIssues: string[];
  referenceVerified: boolean;
  validated: boolean;
}

const complete = (entry: RevenueEntry) => Boolean(entry.debitCode && entry.creditCode && entry.debitDescription && entry.creditDescription);
const signature = (entry: RevenueEntry) => [entry.rubricCode, entry.section, entry.kind, entry.eventType].join("|");

export async function detectRevenueCompetences(files: File[]): Promise<RevenueCompetenceDetection> {
  if (!files.length) throw new Error("Nenhum relatório de faturamento foi selecionado.");
  return detectRevenueCompetencesFromDocuments(await encodeDocuments(files));
}

async function detectRevenueCompetencesFromDocuments(documents: EncodedDocument[]): Promise<RevenueCompetenceDetection> {
  const { data, error } = await supabase.functions.invoke("detect-accounting-competence", {
    body: { module: "faturamento", documents },
  });
  if (error) throw await functionError(error, "Não foi possível identificar a competência do faturamento antes do processamento.");
  const competences = [...new Set((data?.competences ?? []).map(String).filter((value: string) => /^(0[1-9]|1[0-2])\/(20\d{2})$/.test(value)))];
  return {
    competences,
    hasUndatedPeriodicBlocks: Boolean(data?.hasUndatedPeriodicBlocks),
    undatedBlockCount: Math.max(0, Number(data?.undatedBlockCount || 0)),
    evidence: Array.isArray(data?.evidence) ? data.evidence.map(String) : [],
    warning: String(data?.warning || ""),
  };
}

function currentCompetence(company: string) {
  if (typeof window === "undefined") return "";
  try {
    const raw = localStorage.getItem(`ws:lancamentos:last-context:${company}`);
    if (!raw) return "";
    const context = JSON.parse(raw) as { year?: string; selectedMonth?: string; selectedModule?: string };
    if (context.selectedModule !== "faturamento" || !context.year || !context.selectedMonth) return "";
    return `${context.selectedMonth}/${context.year}`;
  } catch {
    return "";
  }
}

async function confirmDetectedCompetence(company: string, files: File[], detectedCompetence: string) {
  const current = currentCompetence(company);
  if (!current || current === detectedCompetence || typeof window === "undefined") return true;
  return new Promise<boolean>((resolve) => {
    const detail: WrongCompetenceImportRequest = {
      currentCompetence: current,
      detectedCompetence,
      module: "faturamento",
      fileNames: files.map(file => file.name),
      resolve,
    };
    window.dispatchEvent(new CustomEvent<WrongCompetenceImportRequest>(WRONG_COMPETENCE_IMPORT_EVENT, { detail }));
  });
}

export async function processRevenueBatch({ company, files, accounts }: Args): Promise<RevenueBatchResult> {
  if (!files.length) throw new Error("Nenhum relatório de faturamento foi selecionado.");
  if (!accounts.length) throw new Error("Importe o plano de contas desta empresa antes de processar Faturamento.");

  const documents = await encodeDocuments(files);

  // O detector não recebe a competência aberta. Se encontrar um único mês diferente,
  // o usuário decide no modal ANTES da IA principal e antes de qualquer persistência.
  const preflight = await detectRevenueCompetencesFromDocuments(documents);
  if (preflight.competences.length === 1) {
    const keep = await confirmDetectedCompetence(company, files, preflight.competences[0]);
    if (!keep) throw new WrongCompetenceImportCancelledError();
  } else if (!preflight.competences.length && preflight.hasUndatedPeriodicBlocks) {
    throw new Error(`Faturamento: foram encontrados ${preflight.undatedBlockCount || "vários"} blocos periódicos sem competência confiável. Nada foi salvo; atribua as competências antes de continuar.`);
  } else if (!preflight.competences.length) {
    throw new Error("Faturamento: não foi possível confirmar a competência do documento. Nada foi salvo.");
  }

  const { data, error } = await supabase.functions.invoke("process-revenue-document", {
    body: {
      module: "faturamento",
      company_id: company,
      batch: true,
      documents,
      chart_of_accounts: accounts,
    },
  });
  if (error) throw await functionError(error, "Falha ao identificar as competências do faturamento.");
  if (!Array.isArray(data?.periods) || !data.periods.length) throw new Error("Nenhuma competência mensal foi identificada no documento.");

  const importId = crypto.randomUUID();
  const sourceFiles = files.map(file => file.name);
  const rawPeriods: RawRevenuePeriod[] = (data.periods as RawRevenuePeriod[]).map(period => ({
    ...period,
    entries: (period.entries ?? []).map((entry, index) => ({
      ...entry,
      id: entry.id || `${importId}-${period.competence}-${index}`,
      importId,
      sourceFileName: sourceFiles[0] || "",
    })),
  }));

  const representatives = new Map<string, RevenueEntry>();
  for (const period of rawPeriods) {
    for (const entry of period.entries) {
      if (!representatives.has(signature(entry))) representatives.set(signature(entry), entry);
    }
  }

  const representativeEntries = [...representatives.values()];
  let mappedRepresentatives = representativeEntries;
  let mappingRouting = "sem lançamentos para mapear";
  let mappingFailure: string | null = null;

  if (representativeEntries.length) {
    const { data: mappingData, error: mappingError } = await supabase.functions.invoke("resolve-accounting-mappings", {
      body: {
        module: "faturamento",
        company_id: company,
        competence: "multi",
        entries: representativeEntries,
        deferredEntries: [],
        chart_of_accounts: accounts,
      },
    });
    if (mappingError) {
      mappingFailure = (await functionError(mappingError, "Falha ao resolver as contas do faturamento.")).message;
    } else if (Array.isArray(mappingData?.entries)) {
      mappedRepresentatives = mappingData.entries as RevenueEntry[];
      mappingRouting = mappingData.routing || "memória da empresa → plano de contas";
    }
  }

  const mappedBySignature = new Map(mappedRepresentatives.map(entry => [signature(entry), entry]));
  const periods: RevenueBatchPeriodResult[] = rawPeriods.map(period => {
    const entries = period.entries.map(entry => {
      const mapped = mappedBySignature.get(signature(entry));
      if (!mapped) return entry;
      return {
        ...entry,
        debitCode: mapped.debitCode || "",
        debitDescription: mapped.debitDescription || "",
        debitCostCenter: mapped.debitCostCenter || "",
        creditCode: mapped.creditCode || "",
        creditDescription: mapped.creditDescription || "",
        creditCostCenter: mapped.creditCostCenter || "",
        mappingSource: mapped.mappingSource,
        mappingNeedsApproval: mapped.mappingNeedsApproval,
        mappingConfidence: mapped.mappingConfidence,
        mappingReason: mapped.mappingReason,
        mappingRuleId: mapped.mappingRuleId,
      };
    });

    const validationIssues: string[] = [...(period.validationIssues ?? [])];
    if (mappingFailure) validationIssues.push(`Falha na resolução adaptativa de contas: ${mappingFailure}`);
    const unresolved = entries.filter(entry => !complete(entry)).length;
    if (unresolved) validationIssues.push(`${unresolved} lançamento(s) continuam sem débito/crédito completo.`);
    const comparisons = period.comparisons ?? [];
    const warnings = period.warnings ?? [];
    const hasDifference = comparisons.some(row => row.blocking !== false && row.differenceInCents !== 0);
    const needsApproval = entries.some(entry => entry.mappingNeedsApproval && complete(entry));
    const validated = Boolean(period.referenceVerified) && !hasDifference && !warnings.length && !validationIssues.length && !needsApproval;

    return {
      competence: period.competence,
      reference: period.reference,
      entries,
      comparisons,
      warnings,
      validationIssues: [...new Set(validationIssues)],
      referenceVerified: Boolean(period.referenceVerified),
      validated,
      processingMeta: {
        model: data.model,
        primaryModel: data.primaryModel || data.model,
        reviewed: Boolean(data.reviewed),
        reviewModel: data.reviewModel,
        routing: `${data.routing || data.model} · ${mappingRouting}`,
      },
      importId,
      sourceFiles,
    };
  });

  return {
    importId,
    sourceFiles,
    periods,
    years: Array.isArray(data.years) ? data.years.map(Number) : [...new Set(periods.map(period => Number(period.competence.split("/")[1])))],
    warnings: data.warnings ?? [],
    validationIssues: data.validationIssues ?? [],
    model: data.model,
    routing: `${data.routing || data.model} · ${mappingRouting}`,
  };
}

function encodeDocuments(files: File[]) {
  return Promise.all(files.map(async file => ({
    name: file.name,
    mime_type: file.type || "application/pdf",
    data: await asBase64(file),
  })));
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
    // preserva a mensagem original
  }
  return new Error(message);
}