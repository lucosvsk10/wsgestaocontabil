import { describe, expect, it } from "vitest";
import { signedBalance, trialBalanceDepth, TrialBalanceRow, validateTrialBalanceRow } from "./trialBalance";

const row = (overrides: Partial<TrialBalanceRow> = {}): TrialBalanceRow => ({
  id: "1",
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
});
