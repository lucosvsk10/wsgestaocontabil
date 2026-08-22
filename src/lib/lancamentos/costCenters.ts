import * as XLSX from "xlsx";
import { ChartAccount } from "./chartOfAccounts";
import { AccountingExportEntry } from "./accountingExportWorkbook";
import { automaticCostCenterForWsPlan, detectNumberedWsPlan } from "./accountPlanProfile";
import { loadWorkspaceData } from "./workspaceStorage";

export interface CostCenter {
  id: string;
  code: string;
  reducedCode: string;
  description: string;
  analytical: boolean;
}

export interface AccountCostCenterRule {
  accountReducedCode: string;
  costCenterReducedCode: string;
  required: boolean;
  source?: "automatic" | "manual" | "imported";
}

function normalize(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._/()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function toBoolean(value: unknown) {
  return ["sim", "s", "yes", "true", "1"].includes(normalize(value));
}

export async function readCostCenters(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const centers: CostCenter[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalize);
      return headers.includes("codigo")
        && headers.some(header => ["cr", "c r", "codigo reduzido"].includes(header))
        && headers.includes("descricao");
    });
    if (headerIndex < 0) return;

    const headers = rows[headerIndex].map(normalize);
    const index = {
      code: headers.findIndex(header => header === "codigo"),
      reducedCode: headers.findIndex(header => ["cr", "c r", "codigo reduzido"].includes(header)),
      description: headers.findIndex(header => header === "descricao"),
      analytical: headers.findIndex(header => ["analitica", "analitico"].includes(header)),
    };

    rows.slice(headerIndex + 1).forEach((row, offset) => {
      const code = String(row[index.code] ?? "").trim();
      const reducedCode = String(row[index.reducedCode] ?? "").trim();
      const description = String(row[index.description] ?? "").trim();
      if (!code && !reducedCode && !description) return;
      centers.push({
        id: `${file.name}-${sheetName}-${headerIndex + offset + 2}`,
        code,
        reducedCode,
        description,
        analytical: toBoolean(row[index.analytical]),
      });
    });
  });

  return centers;
}

export function suggestCostCenterForAccount(account: ChartAccount, centers: CostCenter[]) {
  const text = normalize(account.description);
  const candidates = centers.filter(center => center.analytical);
  const byMeaning = (term: string) => candidates.find(center => normalize(center.description).includes(term));

  if (
    /a pagar|a recolher|fornecedor|cliente|caixa|banco|estoque|adiantamento|capital social|emprestimo|financiamento|imobilizado|mercadorias? para revenda|mercadorias? p revenda|material aplicado|materiais aplicados/.test(text)
  ) return null;

  if (/recup|recupera|credito|ressarc|reembolso/.test(text)) return byMeaning("credito") ?? null;
  if (/\bcusto\b|custos|custo das|cmv|cpv|csp/.test(text)) return byMeaning("custo") ?? null;
  if (/receita|venda de mercadoria|prestacao de servico|faturamento/.test(text) && !/estoque|material aplicado|mercadorias? para revenda|mercadorias? p revenda/.test(text)) {
    return byMeaning("receita") ?? null;
  }
  if (/simples|salario|remuner|pro labore|ferias|fgts|inss|alimentacao|assistencia|aluguel|energia|telefone|combust|seguro|propaganda|publicidade|ipva|agua|curso|manut|uniforme|licenciamento|imposto|encargo|despesa/.test(text)) {
    return byMeaning("despesa") ?? null;
  }
  return null;
}

export function buildAutomaticCostCenterRules(accounts: ChartAccount[], centers: CostCenter[], currentRules: AccountCostCenterRule[] = []) {
  const profile = detectNumberedWsPlan(accounts);
  if (!profile.detected) return currentRules;

  const manual = new Map(currentRules.filter(rule => rule.source === "manual").map(rule => [rule.accountReducedCode, rule]));
  const preserved = currentRules.filter(rule => rule.source === "manual" || !accounts.some(account => account.reducedCode === rule.accountReducedCode));
  const automatic: AccountCostCenterRule[] = [];

  accounts.filter(account => account.analytical && account.reducedCode).forEach(account => {
    if (manual.has(account.reducedCode)) return;
    const center = automaticCostCenterForWsPlan(account, centers);
    if (!center) return;
    automatic.push({
      accountReducedCode: account.reducedCode,
      costCenterReducedCode: center.reducedCode,
      required: true,
      source: "automatic",
    });
  });

  return [...preserved, ...automatic];
}

export async function applyConfiguredCostCenters(company: string, entries: AccountingExportEntry[], accounts: ChartAccount[]) {
  const [centers, rules] = await Promise.all([
    loadWorkspaceData<CostCenter[]>(`${company}:cost-centers`),
    loadWorkspaceData<AccountCostCenterRule[]>(`${company}:account-cost-center-rules`),
  ]);
  if (!centers?.length) return entries;

  const profile = detectNumberedWsPlan(accounts);
  const accountMap = new Map(accounts.map(account => [account.reducedCode, account]));
  const ruleMap = new Map((rules ?? []).map(rule => [rule.accountReducedCode, rule]));

  return entries.map(entry => {
    const debitRule = ruleMap.get(entry.debitCode);
    const creditRule = ruleMap.get(entry.creditCode);
    const debitAccount = accountMap.get(entry.debitCode);
    const creditAccount = accountMap.get(entry.creditCode);
    const debitSuggested = debitAccount
      ? (profile.detected ? automaticCostCenterForWsPlan(debitAccount, centers) : suggestCostCenterForAccount(debitAccount, centers))
      : null;
    const creditSuggested = creditAccount
      ? (profile.detected ? automaticCostCenterForWsPlan(creditAccount, centers) : suggestCostCenterForAccount(creditAccount, centers))
      : null;

    return {
      ...entry,
      debitCostCenter: entry.debitCostCenter || debitRule?.costCenterReducedCode || debitSuggested?.reducedCode || "",
      creditCostCenter: entry.creditCostCenter || creditRule?.costCenterReducedCode || creditSuggested?.reducedCode || "",
    };
  });
}

export async function validateRequiredCostCenters(company: string, entries: AccountingExportEntry[]) {
  const rules = await loadWorkspaceData<AccountCostCenterRule[]>(`${company}:account-cost-center-rules`);
  if (!rules?.length) return [] as string[];
  const required = new Set(rules.filter(rule => rule.required).map(rule => rule.accountReducedCode));
  const issues: string[] = [];

  entries.forEach((entry, index) => {
    if (required.has(entry.debitCode) && !entry.debitCostCenter) issues.push(`Linha ${index + 1}: a conta de débito C.R. ${entry.debitCode} exige centro de custo.`);
    if (required.has(entry.creditCode) && !entry.creditCostCenter) issues.push(`Linha ${index + 1}: a conta de crédito C.R. ${entry.creditCode} exige centro de custo.`);
  });

  return issues;
}
