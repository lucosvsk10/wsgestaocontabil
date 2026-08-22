import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCriticalTrialBalancePlan } from "./trialBalanceCriticalCorrection";
import { TrialBalanceRow } from "./trialBalance";
import { TrialBalanceReferenceLedger } from "./trialBalanceReferenceLedger";

const mocks = vi.hoisted(() => ({ loadWorkspaceData: vi.fn() }));
vi.mock("./workspaceStorage", () => ({ loadWorkspaceData: mocks.loadWorkspaceData }));

function row(partial: Partial<TrialBalanceRow> & { id: string; accountCode: string; title: string; reducedCode: string }): TrialBalanceRow {
  return {
    previousBalanceInCents: 0,
    previousNature: "",
    previousBalanceRead: true,
    debitInCents: 0,
    creditInCents: 0,
    currentBalanceInCents: 0,
    currentNature: "",
    source: "teste",
    confidence: 1,
    ...partial,
  };
}

const ledger: TrialBalanceReferenceLedger = {
  source: "user_supplied_manual_correction",
  sourceFileName: "22.08.2026-11.35.xlsx",
  expectedClosingCashInCents: 148_171,
  approved: true,
  entries: [
    { date: "29/02/2024", debitCode: "3116", creditCode: "1", amountInCents: 541_312, history: "PAGTO. FÉRIAS REF. 01/2024" },
    { date: "29/02/2024", debitCode: "3180", creditCode: "1", amountInCents: 578_477, history: "PAGTO. FGTS REF. 01/2024" },
    { date: "29/02/2024", debitCode: "2600", creditCode: "1", amountInCents: 19_233_945, history: "PAGTO. FORNECEDORES REF. 01/2024" },
    { date: "29/02/2024", debitCode: "3179", creditCode: "1", amountInCents: 656_792, history: "PAGTO. INSS REF. 01/2024" },
    { date: "29/02/2024", debitCode: "3026", creditCode: "1", amountInCents: 16_420, history: "PAGTO. IRRF S/SALÁRIOS REF. 01/2024" },
    { date: "29/02/2024", debitCode: "3109", creditCode: "1", amountInCents: 400_000, history: "PAGTO. PRO-LABORE REF. 01/2024" },
    { date: "29/02/2024", debitCode: "3108", creditCode: "1", amountInCents: 6_613_385, history: "PAGTO. SALÁRIOS E REMUNERAÇÕES REF. 01/2024" },
    { date: "29/02/2024", debitCode: "3034", creditCode: "1", amountInCents: 2_772_648, history: "PAGTO. SIMPLES NACIONAL REF. 01/2024" },
    { date: "29/02/2024", debitCode: "1", creditCode: "426", amountInCents: 33_727_431, history: "RECEBIMENTO DE CLIENTES MÊS 02/2024" },
    { date: "01/02/2024", debitCode: "4538", debitCostCenter: "4", creditCode: "1", amountInCents: 209_833, history: "PAGTO. CURSOS" },
    { date: "01/02/2024", debitCode: "4496", debitCostCenter: "4", creditCode: "1", amountInCents: 320_000, history: "PAGTO. ALUGUEL" },
    { date: "01/02/2024", debitCode: "4490", debitCostCenter: "4", creditCode: "1", amountInCents: 380_012, history: "PAGTO. ENERGIA ELÉTRICA" },
    { date: "01/02/2024", debitCode: "4489", debitCostCenter: "4", creditCode: "1", amountInCents: 11_869, history: "PAGTO. ÁGUA E ESGOTO" },
    { date: "01/02/2024", debitCode: "4478", debitCostCenter: "4", creditCode: "1", amountInCents: 88_788, history: "PAGTO. TELEFONE" },
    { date: "01/02/2024", debitCode: "4499", debitCostCenter: "4", creditCode: "1", amountInCents: 50_136, history: "PAGTO. MATERIAL DE ESCRITÓRIO" },
    { date: "01/02/2024", debitCode: "4493", debitCostCenter: "4", creditCode: "1", amountInCents: 14_102, history: "PAGTO. MATERIAL DE LIMPEZA" },
    { date: "01/02/2024", debitCode: "4522", debitCostCenter: "4", creditCode: "1", amountInCents: 51_600, history: "PAGTO. PROPAGANDA E PUBLICIDADE" },
    { date: "01/02/2024", debitCode: "4484", debitCostCenter: "4", creditCode: "1", amountInCents: 80_853, history: "PAGTO. ANUNCIOS PROP. E PUBLICIDADE" },
    { date: "01/02/2024", debitCode: "4487", debitCostCenter: "4", creditCode: "1", amountInCents: 200_455, history: "PAGTO. IPVA/DPVAT" },
    { date: "01/02/2024", debitCode: "4507", debitCostCenter: "4", creditCode: "1", amountInCents: 1_010_023, history: "PAGTO. COMBUSTÍVEL" },
    { date: "01/02/2024", debitCode: "4530", debitCostCenter: "4", creditCode: "1", amountInCents: 256_000, history: "PAGTO. MANUT. E REPAROS" },
    { date: "01/02/2024", debitCode: "4479", debitCostCenter: "4", creditCode: "1", amountInCents: 225_233, history: "PAGTO. SEGUROS" },
  ],
};

const expenseRows = [
  ["4538", 209_833, "CURSOS"], ["4496", 320_000, "ALUGUEL"], ["4490", 380_012, "ENERGIA ELÉTRICA"], ["4489", 11_869, "ÁGUA E ESGOTO"],
  ["4478", 88_788, "TELEFONE"], ["4499", 50_136, "MATERIAL DE ESCRITÓRIO"], ["4493", 14_102, "MATERIAL DE LIMPEZA"], ["4522", 51_600, "PROPAGANDA E PUBLICIDADE"],
  ["4484", 80_853, "ANUNCIOS PROP. E PUBLICIDADE"], ["4487", 200_455, "IPVA/DPVAT"], ["4507", 1_010_023, "COMBUSTÍVEL"], ["4530", 256_000, "MANUT. E REPAROS"], ["4479", 225_233, "SEGUROS"],
] as const;

describe("critical trial balance correction", () => {
  beforeEach(() => {
    mocks.loadWorkspaceData.mockReset();
    mocks.loadWorkspaceData.mockImplementation(async (key: string) => {
      if (key.endsWith(":balancete:reference-ledger")) return ledger;
      if (key.endsWith(":balancete:cash-policy")) return { baseInCents: 100_000, minInCents: 50_000, maxInCents: 250_000, source: "faixa aprovada" };
      return null;
    });
  });

  it("reproduces the hand-corrected February cash and does not duplicate expenses already posted", async () => {
    const rows: TrialBalanceRow[] = [
      row({ id: "cash", accountCode: "1.1.1.01.0001", title: "CAIXA GERAL", reducedCode: "1", previousBalanceInCents: 132_623, previousNature: "D", creditInCents: 2_898_904, currentBalanceInCents: 2_766_281, currentNature: "C" }),
      row({ id: "clients", accountCode: "1.1.2.10.0426", title: "CLIENTES DIVERSOS", reducedCode: "426", previousBalanceInCents: 15_867_347, previousNature: "D", currentBalanceInCents: 15_867_347, currentNature: "D" }),
      row({ id: "suppliers", accountCode: "2.1.1.01.2600", title: "FORNECEDORES DIVERSOS", reducedCode: "2600", previousBalanceInCents: 12_678_111, previousNature: "C", currentBalanceInCents: 12_678_111, currentNature: "C" }),
      row({ id: "irrf", accountCode: "2.1.1.20.3026", title: "IRRF S/SALÁRIOS À RECOLHER", reducedCode: "3026", previousBalanceInCents: 16_420, previousNature: "C", currentBalanceInCents: 16_420, currentNature: "C" }),
      row({ id: "simples", accountCode: "2.1.1.20.3034", title: "SIMPLES À RECOLHER", reducedCode: "3034", previousBalanceInCents: 2_772_648, previousNature: "C", currentBalanceInCents: 2_772_648, currentNature: "C" }),
      row({ id: "salary", accountCode: "2.1.1.40.3108", title: "SALÁRIOS À PAGAR", reducedCode: "3108", previousBalanceInCents: 6_613_385, previousNature: "C", currentBalanceInCents: 6_613_385, currentNature: "C" }),
      row({ id: "prolabore", accountCode: "2.1.1.40.3109", title: "PRO-LABORE À PAGAR", reducedCode: "3109", previousBalanceInCents: 400_000, previousNature: "C", currentBalanceInCents: 400_000, currentNature: "C" }),
      row({ id: "vacation", accountCode: "2.1.1.40.3116", title: "FÉRIAS À PAGAR", reducedCode: "3116", previousBalanceInCents: 541_312, previousNature: "C", currentBalanceInCents: 541_312, currentNature: "C" }),
      row({ id: "inss", accountCode: "2.1.1.50.3179", title: "INSS Á RECOLHER", reducedCode: "3179", previousBalanceInCents: 656_792, previousNature: "C", currentBalanceInCents: 656_792, currentNature: "C" }),
      row({ id: "fgts", accountCode: "2.1.1.50.3180", title: "FGTS À RECOLHER", reducedCode: "3180", previousBalanceInCents: 578_477, previousNature: "C", currentBalanceInCents: 578_477, currentNature: "C" }),
      ...expenseRows.map(([code, amount, title], index) => row({ id: `expense-${index}`, accountCode: `4.4.1.40.${code}`, title, reducedCode: code, debitInCents: amount, currentBalanceInCents: amount, currentNature: "D" })),
    ];

    const plan = await buildCriticalTrialBalancePlan("company", "02", "2024", rows);

    expect(plan.referenceSource).toContain("22.08.2026-11.35.xlsx");
    expect(plan.referenceCoveredCount).toBe(13);
    expect(plan.adjustments.some(item => item.history === "PAGTO. CURSOS")).toBe(false);
    expect(plan.adjustments).toEqual(expect.arrayContaining([
      expect.objectContaining({ debitCode: "1", creditCode: "426", amountInCents: 33_727_431, history: "RECEBIMENTO DE CLIENTES MÊS 02/2024" }),
      expect.objectContaining({ debitCode: "3108", creditCode: "1", amountInCents: 6_613_385, history: "PAGTO. SALÁRIOS E REMUNERAÇÕES REF. 01/2024" }),
      expect.objectContaining({ debitCode: "3180", creditCode: "1", amountInCents: 578_477, history: "PAGTO. FGTS REF. 01/2024" }),
    ]));
    expect(plan.currentCashSignedInCents).toBe(-2_766_281);
    expect(plan.projectedCashSignedInCents).toBe(148_171);
    expect(plan.targetCashSignedInCents).toBe(148_171);
  });

  it("accepts a literal zero previous balance when the parser explicitly read the cell", async () => {
    mocks.loadWorkspaceData.mockImplementation(async (key: string) => {
      if (key.endsWith(":balancete:reference-ledger")) return { entries: [], source: "none" };
      return null;
    });
    const rows = [row({ id: "cash", accountCode: "1.1.1.01.0001", title: "CAIXA GERAL", reducedCode: "1", previousBalanceInCents: 0, previousNature: "", previousBalanceRead: true, currentBalanceInCents: 100_000, currentNature: "D" })];
    const plan = await buildCriticalTrialBalancePlan("company", "01", "2024", rows);
    expect(plan.previousBalanceVerified).toBe(true);
  });

  it("does not consider a legacy import with unverified previous balances complete", async () => {
    const rows = [row({ id: "cash", accountCode: "1", title: "CAIXA GERAL", reducedCode: "1", previousBalanceRead: undefined, currentBalanceInCents: 100_000, currentNature: "D" })];
    const plan = await buildCriticalTrialBalancePlan("company", "02", "2024", rows);
    expect(plan.previousBalanceVerified).toBe(false);
    expect(plan.correctionComplete).toBe(false);
  });
});
