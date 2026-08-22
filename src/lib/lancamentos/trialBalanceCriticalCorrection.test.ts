import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCriticalTrialBalancePlan, __test } from "./trialBalanceCriticalCorrection";
import { TrialBalanceRow } from "./trialBalance";

const mocks = vi.hoisted(() => ({ loadWorkspaceData: vi.fn() }));
vi.mock("./workspaceStorage", () => ({ loadWorkspaceData: mocks.loadWorkspaceData }));

function row(partial: Partial<TrialBalanceRow> & { id: string; accountCode: string; title: string; reducedCode: string }): TrialBalanceRow {
  return {
    previousBalanceInCents: 0,
    previousNature: "",
    debitInCents: 0,
    creditInCents: 0,
    currentBalanceInCents: 0,
    currentNature: "",
    source: "teste",
    confidence: 1,
    previousBalanceRead: true,
    ...partial,
  } as TrialBalanceRow;
}

describe("critical trial balance correction", () => {
  beforeEach(() => {
    mocks.loadWorkspaceData.mockReset();
    mocks.loadWorkspaceData.mockImplementation(async (key: string) => {
      if (key.endsWith(":chart-of-accounts")) return [];
      if (key.endsWith(":cost-centers")) return [];
      if (key.endsWith(":account-cost-center-rules")) return [];
      if (key.endsWith(":balancete:closing-policy")) return {
        supplierPaymentRateByYear: { "2024": 0.85, "2025": 0.50 },
        cashTargetMinInCents: 60_000,
        cashTargetMaxInCents: 180_000,
        cashTargetAnchorInCents: 100_000,
        payPriorLiabilitiesFully: true,
      };
      return { entries: [] };
    });
  });

  it("keeps the cash target low and variable instead of allowing an exploded cash balance", () => {
    const january = __test.cashTarget("company", "01", "2024", 0, { cashTargetMinInCents: 60_000, cashTargetMaxInCents: 180_000, cashTargetAnchorInCents: 100_000 });
    const february = __test.cashTarget("company", "02", "2024", 132_623, { cashTargetMinInCents: 60_000, cashTargetMaxInCents: 180_000, cashTargetAnchorInCents: 100_000 });
    expect(january).toBeGreaterThanOrEqual(60_000);
    expect(january).toBeLessThanOrEqual(180_000);
    expect(february).toBeGreaterThanOrEqual(60_000);
    expect(february).toBeLessThanOrEqual(180_000);
    expect(january).not.toBe(february);
  });

  it("uses different supplier policies by exercise", () => {
    expect(__test.supplierRate({ supplierPaymentRateByYear: { "2024": 0.85, "2025": 0.50 } }, "2024", 10_000_000, 20_000_000)).toBe(0.85);
    expect(__test.supplierRate({ supplierPaymentRateByYear: { "2024": 0.85, "2025": 0.50 } }, "2025", 10_000_000, 20_000_000)).toBe(0.50);
  });

  it("blocks correction when previous balance was not explicitly read", async () => {
    const rows = [row({ id: "cash", accountCode: "1.1.1.01.0001", title: "CAIXA GERAL", reducedCode: "1", previousBalanceRead: false } as Partial<TrialBalanceRow> & { id: string; accountCode: string; title: string; reducedCode: string })];
    const plan = await buildCriticalTrialBalancePlan("company", "02", "2024", rows);
    expect(plan.previousBalanceVerified).toBe(false);
    expect(plan.correctionComplete).toBe(false);
  });

  it("does not generate a duplicate when an expected entry is already in the Balancete", () => {
    const rows = [
      row({ id: "expense", accountCode: "4.4.1.40.4496", title: "ALUGUEL", reducedCode: "4496", debitInCents: 320_000, currentBalanceInCents: 320_000, currentNature: "D" }),
      row({ id: "cash", accountCode: "1.1.1.01.0001", title: "CAIXA GERAL", reducedCode: "1", creditInCents: 320_000, currentBalanceInCents: 320_000, currentNature: "C" }),
    ];
    const expected = [{ date: "29/02/2024", amountInCents: 320_000, debitCode: "4496", creditCode: "1", history: "ALUGUEL" }];
    const result = __test.consume(rows, expected);
    expect(result.posted).toHaveLength(1);
    expect(result.missing).toHaveLength(0);
  });
});
