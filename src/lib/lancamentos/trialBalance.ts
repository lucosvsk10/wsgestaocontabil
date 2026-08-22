export type BalanceNature = "D" | "C" | "";

export interface TrialBalanceRow {
  id: string;
  accountCode: string;
  title: string;
  reducedCode: string;
  previousBalanceInCents: number;
  previousNature: BalanceNature;
  debitInCents: number;
  creditInCents: number;
  currentBalanceInCents: number;
  currentNature: BalanceNature;
  source: string;
  confidence: number;
}

export interface TrialBalanceProcessingMeta {
  model: string;
  routing?: string | null;
}

export interface TrialBalanceResult {
  competence: string;
  companyName: string;
  rows: TrialBalanceRow[];
  warnings: string[];
  validationIssues: string[];
  validated: boolean;
  processingMeta: TrialBalanceProcessingMeta;
}

export interface TrialBalanceClosingAccount {
  key: string;
  label: string;
  aliases: string[];
}

export interface TrialBalanceGlobalSummary {
  analyticalRows: TrialBalanceRow[];
  debitInCents: number;
  creditInCents: number;
  movementDifferenceInCents: number;
  previousSignedInCents: number;
  currentSignedInCents: number;
}

export const closingAccounts: TrialBalanceClosingAccount[] = [
  { key: "cash", label: "Caixa / Bancos", aliases: ["caixa geral", "caixa matriz", "banco sicoob", "banco"] },
  { key: "clients", label: "Clientes", aliases: ["clientes diversos", "clientes", "duplicatas a receber"] },
  { key: "suppliers", label: "Fornecedores", aliases: ["fornecedores diversos", "fornecedores"] },
  { key: "salaries", label: "Salários a pagar", aliases: ["salarios a pagar", "salários à pagar", "salários a pagar"] },
  { key: "vacation", label: "Férias a pagar", aliases: ["ferias a pagar", "férias à pagar", "férias a pagar"] },
  { key: "termination", label: "Rescisão a pagar", aliases: ["rescisao a pagar", "rescisão à pagar", "rescisão a pagar"] },
  { key: "thirteenth", label: "13º salário a pagar", aliases: ["13 salario a pagar", "13º salário á pagar", "13º salário a pagar"] },
  { key: "fgts", label: "FGTS a recolher", aliases: ["fgts a recolher", "fgts à recolher"] },
  { key: "inss", label: "INSS a recolher", aliases: ["inss a recolher", "inss á recolher", "inss à recolher"] },
  { key: "irrf", label: "IRRF a recolher", aliases: ["irrf s salarios a recolher", "irrf s/salários à recolher"] },
  { key: "prolabore", label: "Pró-labore a pagar", aliases: ["pro labore a pagar", "pro-labore à pagar", "pró-labore à pagar"] },
  { key: "simples", label: "Simples a recolher", aliases: ["simples a recolher", "simples à recolher"] },
];

export function normalizeTrialBalanceText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim().toLowerCase();
}

export function trialBalanceDepth(accountCode: string) {
  const parts = accountCode.split(".").map(part => Number(part));
  if (!parts.length) return 0;
  return Math.max(0, Math.min(4, parts.filter(part => Number.isFinite(part) && part !== 0).length - 1));
}

export function signedBalance(amountInCents: number, nature: BalanceNature) {
  if (!amountInCents || !nature) return 0;
  return nature === "D" ? amountInCents : -amountInCents;
}

export function validateTrialBalanceRow(row: TrialBalanceRow) {
  const previous = signedBalance(row.previousBalanceInCents, row.previousNature);
  const expected = previous + row.debitInCents - row.creditInCents;
  const current = signedBalance(row.currentBalanceInCents, row.currentNature);
  return current - expected;
}

function accountPath(accountCode: string) {
  const parts = accountCode.split(".").map(part => Number(part));
  let lastNonZero = parts.length - 1;
  while (lastNonZero >= 0 && (!Number.isFinite(parts[lastNonZero]) || parts[lastNonZero] === 0)) lastNonZero -= 1;
  return parts.slice(0, lastNonZero + 1).map(part => Number.isFinite(part) ? part : 0);
}

function isAncestorPath(parent: number[], child: number[]) {
  if (!parent.length || child.length <= parent.length) return false;
  return parent.every((part, index) => child[index] === part);
}

export function analyticalTrialBalanceRows(rows: TrialBalanceRow[]) {
  const paths = rows.map(row => ({ row, path: accountPath(row.accountCode) }));
  return paths.filter(candidate => !paths.some(other => other.row.id !== candidate.row.id && isAncestorPath(candidate.path, other.path))).map(candidate => candidate.row);
}

export function summarizeTrialBalance(rows: TrialBalanceRow[]): TrialBalanceGlobalSummary {
  const analyticalRows = analyticalTrialBalanceRows(rows);
  return analyticalRows.reduce<TrialBalanceGlobalSummary>((summary, row) => {
    summary.debitInCents += row.debitInCents;
    summary.creditInCents += row.creditInCents;
    summary.previousSignedInCents += signedBalance(row.previousBalanceInCents, row.previousNature);
    summary.currentSignedInCents += signedBalance(row.currentBalanceInCents, row.currentNature);
    summary.movementDifferenceInCents = summary.debitInCents - summary.creditInCents;
    return summary;
  }, { analyticalRows, debitInCents: 0, creditInCents: 0, movementDifferenceInCents: 0, previousSignedInCents: 0, currentSignedInCents: 0 });
}

export function findClosingAccountRow(rows: TrialBalanceRow[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeTrialBalanceText);
  const candidates = rows.filter(row => {
    const title = normalizeTrialBalanceText(row.title);
    return normalizedAliases.some(alias => title === alias || title.includes(alias));
  });
  return candidates.find(row => row.reducedCode.length <= 6 && !row.reducedCode.endsWith("000")) ?? candidates[candidates.length - 1] ?? null;
}
