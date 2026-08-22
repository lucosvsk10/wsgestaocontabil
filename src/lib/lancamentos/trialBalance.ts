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

export function findClosingAccountRow(rows: TrialBalanceRow[], aliases: string[]) {
  const normalizedAliases = aliases.map(normalizeTrialBalanceText);
  const candidates = rows.filter(row => {
    const title = normalizeTrialBalanceText(row.title);
    return normalizedAliases.some(alias => title === alias || title.includes(alias));
  });
  return candidates.find(row => row.reducedCode.length <= 6 && !row.reducedCode.endsWith("000")) ?? candidates[candidates.length - 1] ?? null;
}
