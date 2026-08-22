import { beforeEach, describe, expect, it, vi } from "vitest";
import { buildCriticalTrialBalancePlan, __test } from "./trialBalanceCriticalCorrection";
import { suggestCostCenterForAccount } from "./costCenters";
import { TrialBalanceRow } from "./trialBalance";

const mocks = vi.hoisted(() => ({ loadWorkspaceData: vi.fn() }));
vi.mock("./workspaceStorage", () => ({ loadWorkspaceData: mocks.loadWorkspaceData }));

const COMPANY = "d3ab87ba-63e8-45c4-882e-4d3d99d67f52";

function row(partial: Partial<TrialBalanceRow> & { id: string; accountCode: string; title: string; reducedCode: string }): TrialBalanceRow {
  return {
    previousBalanceInCents: 0,
    previousNature: "",
    debitInCents: 0,
    creditInCents: 0,
    currentBalanceInCents: 0,
    currentNature: "",
    source: "balancete-importado",
    confidence: 1,
    previousBalanceRead: true,
    ...partial,
  } as TrialBalanceRow;
}

const chart = [
  { id: "486", account: "1.1.3", analytical: true, reducedCode: "486", description: "Mercadorias para Revenda", sped: true },
  { id: "777", account: "2.1.1", analytical: true, reducedCode: "777", description: "Fornecedores", sped: true },
  { id: "429", account: "1.1.2", analytical: true, reducedCode: "429", description: "Clientes", sped: true },
  { id: "11", account: "3.1", analytical: true, reducedCode: "11", description: "Receita da Prestação de Serviços no Mercado Interno", sped: true },
  { id: "10", account: "3.1", analytical: true, reducedCode: "10", description: "Receita da Revenda de Mercadorias no Mercado Interno", sped: true },
  { id: "23", account: "4.4", analytical: true, reducedCode: "23", description: "(-) SIMPLES", sped: true },
  { id: "855", account: "2.1", analytical: true, reducedCode: "855", description: "Simples a Recolher", sped: true },
];

const rows = [
  row({ id: "cash", accountCode: "1.1.1.01.0001", title: "CAIXA GERAL", reducedCode: "1", previousBalanceInCents: 132_623, previousNature: "D", creditInCents: 2_898_904, currentBalanceInCents: 2_766_281, currentNature: "C" }),
  row({ id: "clients", accountCode: "1.1.2.10.0426", title: "CLIENTES DIVERSOS", reducedCode: "426", previousBalanceInCents: 15_867_347, previousNature: "D", currentBalanceInCents: 15_867_347, currentNature: "D" }),
  row({ id: "inventory", accountCode: "1.1.3.10.0910", title: "MATERIAL APLICADO", reducedCode: "910", previousBalanceInCents: 22_628_171, previousNature: "D", currentBalanceInCents: 22_628_171, currentNature: "D" }),
  row({ id: "suppliers", accountCode: "2.1.1.01.2600", title: "FORNECEDORES DIVERSOS", reducedCode: "2600", previousBalanceInCents: 12_678_111, previousNature: "C", currentBalanceInCents: 12_678_111, currentNature: "C" }),
  row({ id: "irrf", accountCode: "2.1.1.20.3026", title: "IRRF S/SALÁRIOS À RECOLHER", reducedCode: "3026", previousBalanceInCents: 16_420, previousNature: "C", currentBalanceInCents: 16_420, currentNature: "C" }),
  row({ id: "simples-payable", accountCode: "2.1.1.20.3034", title: "SIMPLES À RECOLHER", reducedCode: "3034", previousBalanceInCents: 2_772_648, previousNature: "C", currentBalanceInCents: 2_772_648, currentNature: "C" }),
  row({ id: "salaries-payable", accountCode: "2.1.1.40.3108", title: "SALÁRIOS À PAGAR", reducedCode: "3108", previousBalanceInCents: 6_613_385, previousNature: "C", currentBalanceInCents: 6_613_385, currentNature: "C" }),
  row({ id: "prolabore-payable", accountCode: "2.1.1.40.3109", title: "PRO-LABORE À PAGAR", reducedCode: "3109", previousBalanceInCents: 400_000, previousNature: "C", currentBalanceInCents: 400_000, currentNature: "C" }),
  row({ id: "vacation-payable", accountCode: "2.1.1.40.3116", title: "FÉRIAS À PAGAR", reducedCode: "3116", previousBalanceInCents: 541_312, previousNature: "C", currentBalanceInCents: 541_312, currentNature: "C" }),
  row({ id: "inss", accountCode: "2.1.1.50.3179", title: "INSS Á RECOLHER", reducedCode: "3179", previousBalanceInCents: 656_792, previousNature: "C", currentBalanceInCents: 656_792, currentNature: "C" }),
  row({ id: "fgts-payable", accountCode: "2.1.1.50.3180", title: "FGTS À RECOLHER", reducedCode: "3180", previousBalanceInCents: 578_477, previousNature: "C", currentBalanceInCents: 578_477, currentNature: "C" }),
  row({ id: "merch-revenue", accountCode: "3.1.1.01.3700", title: "REVENDAS DE MERCADORIAS", reducedCode: "3700", previousBalanceInCents: 755_745, previousNature: "C", currentBalanceInCents: 755_745, currentNature: "C" }),
  row({ id: "service-revenue", accountCode: "3.3.1.20.3780", title: "VENDA DE SERVIÇOS", reducedCode: "3780", previousBalanceInCents: 19_753_598, previousNature: "C", currentBalanceInCents: 19_753_598, currentNature: "C" }),
  row({ id: "salaries-expense", accountCode: "4.4.1.10.4241", title: "SALÁRIOS", reducedCode: "4241", previousBalanceInCents: 6_355_126, previousNature: "D", currentBalanceInCents: 6_355_126, currentNature: "D" }),
  row({ id: "fgts-expense", accountCode: "4.4.1.30.4411", title: "FGTS", reducedCode: "4411", previousBalanceInCents: 578_477, previousNature: "D", currentBalanceInCents: 578_477, currentNature: "D" }),
  row({ id: "simples-expense", accountCode: "4.4.1.30.4420", title: "IMPOSTOS SIMPLES", reducedCode: "3845", previousBalanceInCents: 2_772_648, previousNature: "D", currentBalanceInCents: 2_772_648, currentNature: "D" }),
  row({ id: "existing-expenses", accountCode: "4.4.1.90.9999", title: "DESPESAS JÁ LANÇADAS", reducedCode: "9999", debitInCents: 2_898_904, currentBalanceInCents: 2_898_904, currentNature: "D" }),
];

describe("critical trial balance correction", () => {
  beforeEach(() => {
    mocks.loadWorkspaceData.mockReset();
    mocks.loadWorkspaceData.mockImplementation(async (key: string) => {
      if (key.endsWith(":chart-of-accounts")) return chart;
      if (key.endsWith(":cost-centers")) return [];
      if (key.endsWith(":account-cost-center-rules")) return [];
      if (key.endsWith(":balancete:closing-policy")) return {
        supplierPaymentRateByYear: { "2024": 0.85, "2025": 0.50 },
        cashTargetMinInCents: 60_000,
        cashTargetMaxInCents: 180_000,
        cashTargetAnchorInCents: 100_000,
        payPriorLiabilitiesFully: true,
      };
      if (key === `${COMPANY}:2024:01:compras:parsed`) return {
        reference: { totalAmountInCents: 22_628_171 },
        entries: [],
      };
      if (key === `${COMPANY}:2024:02:compras:parsed`) return {
        reference: { totalAmountInCents: 12_510_895 },
        entries: [{
          date: "29/02/2024", amountInCents: 12_510_895,
          debitCode: "486", creditCode: "777",
          debitDescription: "Mercadorias para Revenda", creditDescription: "Fornecedores",
          debitCostCenter: "", creditCostCenter: "", history: "MERCADORIA PRA REVENDA (COMPRAS)", kind: "compra",
        }],
      };
      if (key === `${COMPANY}:2024:02:faturamento:parsed`) return {
        reference: { totalAmountInCents: 20_738_034 },
        entries: [
          { date: "29/02/2024", amountInCents: 20_135_234, debitCode: "429", creditCode: "11", debitDescription: "Clientes", creditDescription: "Receita da Prestação de Serviços no Mercado Interno", debitCostCenter: "", creditCostCenter: "", history: "FATURAMENTO PRESTAÇÃO DE SERVIÇOS", kind: "receita" },
          { date: "29/02/2024", amountInCents: 602_800, debitCode: "429", creditCode: "10", debitDescription: "Clientes", creditDescription: "Receita da Revenda de Mercadorias no Mercado Interno", debitCostCenter: "", creditCostCenter: "", history: "FATURAMENTO REVENDA DE MERCADORIAS", kind: "receita" },
          { date: "29/02/2024", amountInCents: 2_813_048, debitCode: "23", creditCode: "855", debitDescription: "(-) SIMPLES", creditDescription: "Simples a Recolher", debitCostCenter: "", creditCostCenter: "", history: "APURAÇÃO PGDAS", kind: "tributo" },
        ],
      };
      return { entries: [] };
    });
  });

  it("keeps the cash target low and variable", () => {
    const january = __test.cashTarget(COMPANY, "01", "2024", 0, { cashTargetMinInCents: 60_000, cashTargetMaxInCents: 180_000, cashTargetAnchorInCents: 100_000 });
    const february = __test.cashTarget(COMPANY, "02", "2024", 132_623, { cashTargetMinInCents: 60_000, cashTargetMaxInCents: 180_000, cashTargetAnchorInCents: 100_000 });
    expect(january).toBeGreaterThanOrEqual(60_000);
    expect(january).toBeLessThanOrEqual(180_000);
    expect(february).toBe(147_848);
    expect(january).not.toBe(february);
  });

  it("uses different supplier policies by exercise", () => {
    expect(__test.supplierRate({ supplierPaymentRateByYear: { "2024": 0.85, "2025": 0.50 } }, "2024", 10_000_000, 20_000_000)).toBe(0.85);
    expect(__test.supplierRate({ supplierPaymentRateByYear: { "2024": 0.85, "2025": 0.50 } }, "2025", 10_000_000, 20_000_000)).toBe(0.50);
  });

  it("reconciles the real February 2024 cash from current balance, not from previous balance", async () => {
    const plan = await buildCriticalTrialBalancePlan(COMPANY, "02", "2024", rows);
    const receipt = plan.adjustments.find(entry => entry.type === "recebimento_clientes");

    expect(plan.targetCashSignedInCents).toBe(147_848);
    expect(receipt?.amountInCents).toBe(33_727_108);
    expect(plan.projectedCashSignedInCents).toBe(147_848);
    expect(plan.projectedCashSignedInCents).toBeGreaterThan(0);

    expect(plan.previewRows.map(item => item.id)).toEqual(rows.map(item => item.id));
    expect(plan.previewRows.map(item => item.accountCode)).toEqual(rows.map(item => item.accountCode));
    expect(plan.previewRows.map(item => item.title)).toEqual(rows.map(item => item.title));
    expect(plan.previewRows.map(item => item.reducedCode)).toEqual(rows.map(item => item.reducedCode));

    const allowed = new Set(rows.map(item => item.reducedCode));
    plan.adjustments.forEach(entry => {
      expect(allowed.has(entry.debitCode)).toBe(true);
      expect(allowed.has(entry.creditCode)).toBe(true);
    });

    expect(plan.previewRows.some(item => item.reducedCode === "3108" && item.title === "SALÁRIOS À PAGAR")).toBe(true);
    expect(plan.previewRows.some(item => item.reducedCode === "4241" && item.title === "SALÁRIOS")).toBe(true);
    expect(plan.remainingCriticalObservations.find(item => item.headline === "Caixa credor")).toBeUndefined();
  });

  it("does not generate a duplicate when an expected entry is already in the Balancete", () => {
    const duplicateRows = [
      row({ id: "expense", accountCode: "4.4.1.40.4496", title: "ALUGUEL", reducedCode: "4496", debitInCents: 320_000, currentBalanceInCents: 320_000, currentNature: "D" }),
      row({ id: "cash-duplicate", accountCode: "1.1.1.01.0001", title: "CAIXA GERAL", reducedCode: "1", creditInCents: 320_000, currentBalanceInCents: 320_000, currentNature: "C" }),
    ];
    const expected = [{ date: "29/02/2024", amountInCents: 320_000, debitCode: "4496", creditCode: "1", history: "ALUGUEL" }];
    const result = __test.consume(duplicateRows, expected);
    expect(result.posted).toHaveLength(1);
    expect(result.missing).toHaveLength(0);
  });

  it("never suggests RECEITAS for stock just because the description says revenda", () => {
    const account = { id: "486", account: "1.1.3", analytical: true, reducedCode: "486", description: "Mercadorias para Revenda", sped: true };
    const centers = [{ id: "3", code: "3", reducedCode: "3", description: "RECEITAS", analytical: true }];
    expect(suggestCostCenterForAccount(account, centers)).toBeNull();
  });

  it("blocks correction when previous balance was not explicitly read", async () => {
    const unverified = [row({ id: "cash-unverified", accountCode: "1.1.1.01.0001", title: "CAIXA GERAL", reducedCode: "1", previousBalanceRead: false } as Partial<TrialBalanceRow> & { id: string; accountCode: string; title: string; reducedCode: string })];
    const plan = await buildCriticalTrialBalancePlan(COMPANY, "02", "2024", unverified);
    expect(plan.previousBalanceVerified).toBe(false);
    expect(plan.correctionComplete).toBe(false);
  });
});
