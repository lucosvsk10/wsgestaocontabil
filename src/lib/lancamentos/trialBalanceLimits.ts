import type { TrialBalanceRow } from "./trialBalance";
import { normalizeTrialBalanceText, signedBalance, validateTrialBalanceRow } from "./trialBalance";
export type ExpectedNature = "D" | "C" | "any";
export interface BalanceLimitRule { nature: ExpectedNature; minInCents: number; maxInCents: number; marginPercent: number; origin: "preset" | "custom"; }
export type BalanceLimitOverrides = Record<string, Partial<BalanceLimitRule>>;
export interface BalanceLimitCheck { row: TrialBalanceRow; rule: BalanceLimitRule; critical: boolean; reasons: string[]; signedInCents: number; }

const minor = (a: number) => Math.max(0, Math.round(a));
const isCash = (title: string) => /\bcaixa\b/.test(normalizeTrialBalanceText(title)) && !/\bfluxo\b/.test(normalizeTrialBalanceText(title));
function natureFor(row: TrialBalanceRow): ExpectedNature {
  const title = normalizeTrialBalanceText(row.title);
  if (/^\s*\(-\)/.test(row.title) && row.accountCode.startsWith("1")) return "C";
  if (title.includes("depreciacao acumulada") || title.includes("provisao para perda")) return "C";
  if (/lucros acumulados|prejuizos acumulados/.test(title)) return "any";
  if (row.accountCode.startsWith("1")) return "D";
  if (row.accountCode.startsWith("2")) return "C";
  if (/^3010101/.test(row.accountCode) || /receita bruta|receita liquida|receita da venda/.test(title)) return "C";
  if (/^3010107/.test(row.accountCode) || /despesa/.test(title)) return "D";
  if (row.previousNature) return row.previousNature;
  return "any";
}
export function balanceLimitForRow(
  row: TrialBalanceRow,
  override: Partial<BalanceLimitRule> = {},
): BalanceLimitRule {
  const nature = natureFor(row);
  const before = Math.abs(signedBalance(row.previousBalanceInCents, row.previousNature));
  const current = Math.abs(signedBalance(row.currentBalanceInCents, row.currentNature));
  const turnover = row.debitInCents + row.creditInCents;
  // Initial baseline: a conservative, explainable range anchored in previous
  // balances. Never confuse gross movement with evidence of a payment.
  let ceiling = before > 0
    ? Math.max(150_000, before * 3)
    : Math.max(200_000, Math.round(Math.max(current, turnover / 2) * 2));
  if (isCash(row.title)) ceiling = 99_900; // WS rule: cash should close below R$ 1,000.
  const defaultRule: BalanceLimitRule = {
    nature: isCash(row.title) ? "D" : nature,
    minInCents: 0,
    maxInCents: minor(ceiling),
    marginPercent: isCash(row.title) ? 0 : 50,
    origin: "preset",
  };
  return {
    ...defaultRule,
    ...override,
    nature: ["D", "C", "any"].includes(override.nature || "") ? (override.nature as ExpectedNature) : defaultRule.nature,
    minInCents: minor(override.minInCents ?? defaultRule.minInCents),
    maxInCents: Math.max(minor(override.minInCents ?? 0), minor(override.maxInCents ?? defaultRule.maxInCents)),
    marginPercent: Math.min(200, Math.max(0, Number(override.marginPercent ?? defaultRule.marginPercent))),
    origin: override.origin || defaultRule.origin,
  };
}
export function checkBalanceLimits(rows: TrialBalanceRow[], overrides: BalanceLimitOverrides = {}): BalanceLimitCheck[] {
  return rows.map(row => {
    const rule = balanceLimitForRow(row, overrides[row.reducedCode] || {});
    const signedInCents = signedBalance(row.currentBalanceInCents, row.currentNature);
    const size = Math.abs(signedInCents);
    const reasons: string[] = [];
    if (Math.abs(validateTrialBalanceRow(row)) > 1) reasons.push("A linha não fecha matematicamente");
    if (size > 0 && rule.nature !== "any" && signedInCents * (rule.nature === "D" ? 1 : -1) < 0) reasons.push("Natureza invertida");
    const margin = 1 + rule.marginPercent / 100;
    if (size > rule.maxInCents * margin + 1) reasons.push("Saldo acima do limite com margem");
    if (size > 0 && size < Math.max(0, rule.minInCents / margin) - 1) reasons.push("Saldo abaixo do mínimo com margem");
    return { row, rule, critical: reasons.length > 0, reasons, signedInCents };
  });
}
