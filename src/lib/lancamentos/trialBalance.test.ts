import { describe, expect, it } from "vitest";
import { analyticalTrialBalanceRows, signedBalance, summarizeTrialBalance, trialBalanceDepth, TrialBalanceRow, validateTrialBalanceRow } from "./trialBalance";

const row = (overrides: Partial<TrialBalanceRow> = {}): TrialBalanceRow => ({
  id: overrides.accountCode || "1",
  accountCode: "1.1.1.10.0001",
  title: "Caixa Geral",
  reducedCode: "1",
  previousBalanceInCents: 100_000,
  previousNature: "D",
  debitInCents: 50_000,
  creditInCents: 20_000,
  currentBalanceInCents: 130_000,
  currentNature: "D",
  source: "teste",
  confidence: 1,
  ...overrides,
});

describe("trial balance deterministic validation", () => {
  it("treats debit balances as positive and credit balances as negative", () => {
    expect(signedBalance(12345, "D")).toBe(12345);
    expect(signedBalance(12345, "C")).toBe(-12345);
    expect(signedBalance(0, "")).toBe(0);
  });

  it("validates the Calima balance identity using debit/credit nature", () => {
    expect(validateTrialBalanceRow(row())).toBe(0);
    expect(validateTrialBalanceRow(row({ currentBalanceInCents: 129_999 }))).toBe(-1);

    const credit = row({
      previousBalanceInCents: 200_000,
      previousNature: "C",
      debitInCents: 30_000,
      creditInCents: 50_000,
      currentBalanceInCents: 220_000,
      currentNature: "C",
    });
    expect(validateTrialBalanceRow(credit)).toBe(0);
  });

  it("derives visible hierarchy depth from structured Calima account codes", () => {
    expect(trialBalanceDepth("1.0.0.00.0000")).toBe(0);
    expect(trialBalanceDepth("1.1.0.00.0000")).toBe(1);
    expect(trialBalanceDepth("1.1.1.00.0000")).toBe(2);
    expect(trialBalanceDepth("1.1.1.10.0000")).toBe(3);
    expect(trialBalanceDepth("1.1.1.10.0001")).toBe(4);
  });

  it("does not double-count groups and subgroups in global totals", () => {
    const rows = [
      row({ id: "ativo", accountCode: "1.0.0.0.0000", title: "ATIVO", reducedCode: "100", previousBalanceInCents: 0, previousNature: "", debitInCents: 10_000, creditInCents: 0, currentBalanceInCents: 10_000, currentNature: "D" }),
      row({ id: "circulante", accountCode: "1.1.0.0.0000", title: "ATIVO CIRCULANTE", reducedCode: "110", previousBalanceInCents: 0, previousNature: "", debitInCents: 10_000, creditInCents: 0, currentBalanceInCents: 10_000, currentNature: "D" }),
      row({ id: "caixa", accountCode: "1.1.1.10.0001", title: "CAIXA", reducedCode: "10", previousBalanceInCents: 0, previousNature: "", debitInCents: 10_000, creditInCents: 0, currentBalanceInCents: 10_000, currentNature: "D" }),
      row({ id: "fornecedor", accountCode: "2.1.1.10.0001", title: "FORNECEDORES", reducedCode: "20", previousBalanceInCents: 0, previousNature: "", debitInCents: 0, creditInCents: 10_000, currentBalanceInCents: 10_000, currentNature: "C" }),
    ];

    expect(analyticalTrialBalanceRows(rows).map(item => item.reducedCode)).toEqual(["10", "20"]);
    const summary = summarizeTrialBalance(rows);
    expect(summary.debitInCents).toBe(10_000);
    expect(summary.creditInCents).toBe(10_000);
    expect(summary.movementDifferenceInCents).toBe(0);
    expect(summary.currentSignedInCents).toBe(0);
  });

  it("exposes a global imbalance even when individual rows are structurally valid", () => {
    const summary = summarizeTrialBalance([
      row({ id: "d", accountCode: "1.1.1.10.0001", reducedCode: "10", previousBalanceInCents: 0, previousNature: "", debitInCents: 15_000, creditInCents: 0, currentBalanceInCents: 15_000, currentNature: "D" }),
      row({ id: "c", accountCode: "2.1.1.10.0001", reducedCode: "20", previousBalanceInCents: 0, previousNature: "", debitInCents: 0, creditInCents: 14_000, currentBalanceInCents: 14_000, currentNature: "C" }),
    ]);
    expect(summary.movementDifferenceInCents).toBe(1_000);
    expect(summary.currentSignedInCents).toBe(1_000);
  });
});
