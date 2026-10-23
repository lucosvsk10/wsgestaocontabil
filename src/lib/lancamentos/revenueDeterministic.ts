import { supabase } from "@/integrations/supabase/client";
import { ChartAccount } from "./chartOfAccounts";
import { RevenueBatchPeriodResult, RevenueBatchResult } from "./revenueBatch";
import { RevenueComparison, RevenueEntry, RevenueProcessingMeta, RevenueReference } from "./revenueWorkbook";

const MONTHS: Record<string, string> = {
  janeiro: "01",
  fevereiro: "02",
  marco: "03",
  março: "03",
  abril: "04",
  maio: "05",
  junho: "06",
  julho: "07",
  agosto: "08",
  setembro: "09",
  outubro: "10",
  novembro: "11",
  dezembro: "12",
};

const moneyToCents = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) throw new Error(`Valor de faturamento inválido: ${value}`);
  return Math.round(parsed * 100);
};

const lastDay = (competence: string) => {
  const [month, year] = competence.split("/").map(Number);
  return new Date(year, month, 0).toLocaleDateString("pt-BR");
};

async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => String(item.str || "")).join(" "));
  }
  return pages.join("\n");
}

function extractPeriods(text: string) {
  const periods = new Map<string, { amountInCents: number; source: string }>();
  const monthPattern = Object.keys(MONTHS).sort((a, b) => b.length - a.length).join("|");
  const named = new RegExp(`\\b(${monthPattern})\\s*\\/\\s*(20\\d{2})\\b[^\\d]{0,40}(\\d{1,3}(?:\\.\\d{3})*,\\d{2})`, "giu");

  for (const match of text.matchAll(named)) {
    const monthName = match[1].toLocaleLowerCase("pt-BR");
    const month = MONTHS[monthName];
    if (!month) continue;
    const competence = `${month}/${match[2]}`;
    const amountInCents = moneyToCents(match[3]);
    if (!periods.has(competence)) periods.set(competence, { amountInCents, source: `${match[1]}/${match[2]} ${match[3]}` });
  }

  // Fallback para relatórios que usem MM/AAAA na linha mensal.
  const numeric = /\b(0[1-9]|1[0-2])\/(20\d{2})\b[^\d]{0,40}(\d{1,3}(?:\.\d{3})*,\d{2})/g;
  for (const match of text.matchAll(numeric)) {
    const competence = `${match[1]}/${match[2]}`;
    if (periods.has(competence)) continue;
    const amountInCents = moneyToCents(match[3]);
    periods.set(competence, { amountInCents, source: `${competence} ${match[3]}` });
  }

  return periods;
}

function explicitTotal(text: string) {
  const matches = [...text.matchAll(/\bTOTAL\s*:\s*(\d{1,3}(?:\.\d{3})*,\d{2})/gi)];
  if (!matches.length) return null;
  return moneyToCents(matches[matches.length - 1][1]);
}

type LearnedRule = {
  debit_code: string | null;
  debit_description: string | null;
  debit_cost_center: string | null;
  credit_code: string | null;
  credit_description: string | null;
  credit_cost_center: string | null;
};

async function loadApprovedRevenueRule(company: string) {
  const { data, error } = await (supabase as any)
    .from("accounting_mapping_rules")
    .select("debit_code,debit_description,debit_cost_center,credit_code,credit_description,credit_cost_center")
    .eq("company_key", company)
    .eq("module", "faturamento")
    .eq("is_active", true)
    .or("rubric_code.eq.FATURAMENTO,normalized_description.eq.faturamento")
    .order("times_confirmed", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.warn("Não foi possível carregar a regra aprovada de faturamento.", error);
    return null;
  }
  return (data ?? null) as LearnedRule | null;
}

function chartDescription(accounts: ChartAccount[], code: string, fallback = "") {
  return accounts.find(account => account.reducedCode === code)?.description || fallback;
}

function buildPeriod(
  competence: string,
  amountInCents: number,
  source: string,
  rule: LearnedRule | null,
  accounts: ChartAccount[],
  importId: string,
  sourceFileName: string,
): RevenueBatchPeriodResult {
  const debitCode = String(rule?.debit_code || "").trim();
  const creditCode = String(rule?.credit_code || "").trim();
  const debitDescription = debitCode ? chartDescription(accounts, debitCode, String(rule?.debit_description || "")) : "";
  const creditDescription = creditCode ? chartDescription(accounts, creditCode, String(rule?.credit_description || "")) : "";
  const completeMapping = Boolean(debitCode && creditCode && debitDescription && creditDescription);

  const entry: RevenueEntry = {
    id: `${importId}-${competence}-faturamento`,
    date: lastDay(competence),
    history: "FATURAMENTO",
    eventType: "revenue",
    rubricCode: "FATURAMENTO",
    rubricDescription: "FATURAMENTO",
    kind: "receita",
    section: "faturamento",
    debitCode,
    debitDescription,
    debitCostCenter: String(rule?.debit_cost_center || ""),
    creditCode,
    creditDescription,
    creditCostCenter: String(rule?.credit_cost_center || ""),
    amountInCents,
    source,
    confidence: 1,
    importId,
    sourceFileName,
    mappingSource: completeMapping ? "learned" : "unresolved",
    mappingNeedsApproval: !completeMapping,
    mappingConfidence: completeMapping ? 1 : 0,
    mappingReason: completeMapping
      ? "Regra de faturamento já aprovada para esta empresa."
      : "Nenhuma regra aprovada de faturamento foi encontrada; informe débito e crédito manualmente.",
  };

  const reference: RevenueReference = {
    competence,
    serviceAmountInCents: 0,
    merchandiseAmountInCents: 0,
    totalAmountInCents: amountInCents,
    pgdasAmountInCents: 0,
    hasService: false,
    hasMerchandise: false,
    hasPgdas: false,
    source,
  };

  const comparisons: RevenueComparison[] = [{
    key: "total",
    label: "Faturamento bruto",
    documentAmountInCents: amountInCents,
    entriesAmountInCents: amountInCents,
    differenceInCents: 0,
    source,
    blocking: true,
    note: "Leitura determinística do relatório; sem IA.",
  }];

  const validationIssues = completeMapping ? [] : ["Informe débito e crédito da única linha de faturamento antes de exportar."];
  const processingMeta: RevenueProcessingMeta = {
    model: "deterministic-pdf",
    primaryModel: "deterministic-pdf",
    reviewed: false,
    reviewModel: null,
    routing: "PDF local → competência/valor → regra aprovada da empresa → Calima (sem IA)",
  };

  return {
    competence,
    reference,
    entries: [entry],
    comparisons,
    warnings: [],
    validationIssues,
    referenceVerified: true,
    validated: completeMapping,
    processingMeta,
    importId,
    sourceFiles: [sourceFileName],
  };
}

export async function parseRevenueFilesDeterministically(
  company: string,
  files: File[],
  accounts: ChartAccount[],
): Promise<RevenueBatchResult> {
  if (!files.length) throw new Error("Nenhum relatório de faturamento foi selecionado.");
  if (!accounts.length) throw new Error("Importe o plano de contas desta empresa antes de processar Faturamento.");

  const importId = crypto.randomUUID();
  const sourceFiles = files.map(file => file.name);
  const merged = new Map<string, { amountInCents: number; source: string; fileName: string }>();
  const warnings: string[] = [];

  for (const file of files) {
    if (!/\.pdf$/i.test(file.name) && file.type !== "application/pdf") {
      throw new Error(`${file.name}: o faturamento determinístico aceita PDF neste fluxo.`);
    }
    const text = await extractPdfText(file);
    const periods = extractPeriods(text);
    if (!periods.size) throw new Error(`${file.name}: não encontrei uma linha mensal no padrão Mês/AAAA + valor.`);

    const total = explicitTotal(text);
    const sum = [...periods.values()].reduce((acc, item) => acc + item.amountInCents, 0);
    if (total !== null && total !== sum) {
      warnings.push(`${file.name}: o TOTAL do documento não fecha com a soma das competências (${(total / 100).toFixed(2)} ≠ ${(sum / 100).toFixed(2)}).`);
    }

    for (const [competence, period] of periods) {
      const existing = merged.get(competence);
      if (existing && existing.amountInCents !== period.amountInCents) {
        throw new Error(`${file.name}: a competência ${competence} apareceu com valor diferente em outro arquivo.`);
      }
      merged.set(competence, { ...period, fileName: file.name });
    }
  }

  const rule = await loadApprovedRevenueRule(company);
  const periods = [...merged.entries()]
    .sort(([a], [b]) => {
      const [am, ay] = a.split("/").map(Number);
      const [bm, by] = b.split("/").map(Number);
      return ay === by ? am - bm : ay - by;
    })
    .map(([competence, period]) => buildPeriod(competence, period.amountInCents, period.source, rule, accounts, importId, period.fileName));

  return {
    importId,
    sourceFiles,
    periods,
    years: [...new Set(periods.map(period => Number(period.competence.split("/")[1])))],
    warnings,
    validationIssues: warnings,
    model: "deterministic-pdf",
    routing: "PDF local → uma linha FATURAMENTO por competência → regra já aprovada (sem IA)",
  };
}

export async function detectRevenueCompetencesDeterministically(files: File[]) {
  const result = new Set<string>();
  for (const file of files) {
    const text = await extractPdfText(file);
    for (const competence of extractPeriods(text).keys()) result.add(competence);
  }
  return [...result];
}
