import { describe, expect, it } from "vitest";
import { PayrollEntry, PayrollDocumentTotal, calculatePayrollComparisons } from "./payrollWorkbook";

const entry = (id: string, amountInCents: number, kind: PayrollEntry["kind"], section: PayrollEntry["section"], eventType?: string): PayrollEntry => ({
  id,
  date: "31/01/2025",
  history: id,
  eventType,
  kind,
  section,
  debitCode: "1",
  debitDescription: "D",
  debitCostCenter: "",
  creditCode: "2",
  creditDescription: "C",
  creditCostCenter: "",
  amountInCents,
});

describe("calculatePayrollComparisons", () => {
  it("reconciles January/2025 with the full vacation INSS in January and no carryover", () => {
    const entries: PayrollEntry[] = [
      entry("adiantamento", 2_738_466, "provento", "adiantamento", "advance_payment"),
      entry("folha-proventos", 9_611_773, "provento", "folha", "salary_earning"),
      entry("ferias-proventos", 1_378_800, "provento", "ferias", "vacation_earning"),
      entry("folha-descontos-sem-inss", 4_336_873, "desconto", "folha", "payroll_discount"),
      entry("inss-folha", 666_191, "desconto", "folha", "inss"),
      entry("ferias-descontos-sem-inss", 13_651, "desconto", "ferias", "vacation_discount"),
      entry("inss-ferias-integral", 98_188, "desconto", "ferias", "inss"),
      entry("fgts", 661_096, "encargo", "folha", "fgts"),
    ];
    const deferredEntries: PayrollEntry[] = [];
    const totals: PayrollDocumentTotal[] = [
      { key: "total_proventos", label: "Total de Proventos", amountInCents: 13_729_039, source: "Total Geral" },
      { key: "total_descontos", label: "Total de Descontos", amountInCents: 5_114_903, source: "Total Geral" },
      { key: "liquido", label: "Líquido", amountInCents: 8_614_136, source: "Total Geral" },
      { key: "adiantamento_proventos", label: "Adiantamento", amountInCents: 2_738_466, source: "Adiantamento de Folha" },
      { key: "folha_proventos", label: "Folha - Proventos", amountInCents: 9_611_773, source: "Folha de Pagamento" },
      { key: "folha_descontos", label: "Folha - Descontos", amountInCents: 5_003_064, source: "Folha de Pagamento" },
      { key: "ferias_proventos", label: "Férias - Proventos", amountInCents: 1_378_800, source: "Férias" },
      { key: "ferias_descontos", label: "Férias - Descontos", amountInCents: 111_839, source: "Férias" },
      { key: "inss_total", label: "INSS a recolher", amountInCents: 755_271, source: "Resumo" },
      { key: "fgts_total", label: "FGTS a recolher", amountInCents: 661_096, source: "Resumo" },
    ];

    const comparisons = calculatePayrollComparisons(entries, deferredEntries, totals);
    const blocking = comparisons.filter(row => row.blocking !== false);
    const inss = comparisons.find(row => row.key === "inss_total");

    expect(blocking.every(row => row.differenceInCents === 0)).toBe(true);
    expect(comparisons.find(row => row.key === "total_descontos")?.entriesAmountInCents).toBe(5_114_903);
    expect(comparisons.find(row => row.key === "liquido")?.entriesAmountInCents).toBe(8_614_136);
    expect(comparisons.find(row => row.key === "ferias_descontos")?.entriesAmountInCents).toBe(111_839);
    expect(inss?.entriesAmountInCents).toBe(764_379);
    expect(inss?.documentAmountInCents).toBe(755_271);
    expect(inss?.differenceInCents).toBe(9_108);
    expect(inss?.blocking).toBe(false);
    expect(deferredEntries).toHaveLength(0);
  });
});
