import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCriticalTrialBalancePlan } from "./trialBalanceCriticalCorrection";
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
    ...partial,
  } as TrialBalanceRow;
}

describe("critical trial balance correction", () => {
  beforeEach(() => {
    mocks.loadWorkspaceData.mockReset();
    mocks.loadWorkspaceData.mockImplementation(async (key: string) => {
      if (key.endsWith(":faturamento:parsed")) return { reference: { totalAmountInCents: 20_509_343 }, entries: [] };
      if (key.endsWith(":compras:parsed")) return { reference: { totalAmountInCents: 22_628_171 }, entries: [] };
      return { entries: [] };
    });
  });

  it("reproduces the January client receipt instead of forcing cash to R$1,000", async () => {
    const rows = [
      row({
        id: "cash",
        accountCode: "1.1.1.01.0001",
        title: "CAIXA GERAL",
        reducedCode: "1",
        creditInCents: 4_559_313,
        currentBalanceInCents: 4_559_313,
        currentNature: "C",
        previousBalanceRead: true,
      } as Partial<TrialBalanceRow> & { id: string; accountCode: string; title: string; reducedCode: string }),
      row({
        id: "clients",
        accountCode: "1.1.2.10.0426",
        title: "CLIENTES DIVERSOS",
        reducedCode: "426",
        debitInCents: 20_509_343,
        currentBalanceInCents: 20_509_343,
        currentNature: "D",
        previousBalanceRead: true,
      } as Partial<TrialBalanceRow> & { id: string; accountCode: string; title: string; reducedCode: string }),
    ];

    const plan = await buildCriticalTrialBalancePlan("company", "01", "2024", rows);

    expect(plan.adjustments).toHaveLength(1);
    expect(plan.adjustments[0]).toMatchObject({
      debitCode: "1",
      creditCode: "426",
      amountInCents: 20_509_343,
      history: "RECEBIMENTO DE CLIENTES MÊS 01/2024",
    });
    expect(plan.currentCashSignedInCents).toBe(-4_559_313);
    expect(plan.projectedCashSignedInCents).toBe(15_950_030);
    expect(plan.targets.find(target => target.key === "cash")?.targetSignedInCents).toBe(15_950_030);
    expect(plan.targets.find(target => target.key === "clients")?.targetSignedInCents).toBe(0);
  });

  it("does not consider a legacy import with unverified previous balances complete", async () => {
    const rows = [
      row({ id: "cash", accountCode: "1", title: "CAIXA GERAL", reducedCode: "1", currentBalanceInCents: 1_000, currentNature: "D" }),
    ];

    const plan = await buildCriticalTrialBalancePlan("company", "02", "2024", rows);
    expect(plan.previousBalanceVerified).toBe(false);
    expect(plan.correctionComplete).toBe(false);
  });
});
