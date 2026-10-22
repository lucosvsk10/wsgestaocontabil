import { describe, expect, it } from "vitest";
import { ExpenseEntry, groupExpenseEntries } from "./expenseWorkbook";

function entry(id: string, debitCode: string, creditCode: string, amountInCents: number): ExpenseEntry {
  return {
    id,
    sourceFile: "calima.xlsx",
    sourceSheet: "Lançamentos",
    sourceRow: Number(id),
    date: "15/01/2026",
    history: `Despesa ${id}`,
    debitCode,
    creditCode,
    debitDescription: `Conta ${debitCode}`,
    debitCostCenter: "",
    creditDescription: `Conta ${creditCode}`,
    creditCostCenter: "",
    amountInCents,
  };
}

describe("groupExpenseEntries", () => {
  it("soma centavos exatamente quando débito e contrapartida são iguais", () => {
    const grouped = groupExpenseEntries(
      [entry("1", "111", "374", 10_001), entry("2", "111", "374", 20_002)],
      "31/01/2026",
    );

    expect(grouped).toHaveLength(1);
    expect(grouped[0].amountInCents).toBe(30_003);
    expect(grouped[0].sourceCount).toBe(2);
    expect(grouped[0].date).toBe("31/01/2026");
  });

  it("mantém contrapartidas diferentes em lançamentos válidos", () => {
    const grouped = groupExpenseEntries(
      [entry("1", "111", "374", 10_001), entry("2", "111", "777", 20_002)],
      "31/01/2026",
    );

    expect(grouped).toHaveLength(2);
    expect(grouped.every((item) => !item.hasMixedCounterpart)).toBe(true);
    expect(grouped.reduce((total, item) => total + item.amountInCents, 0)).toBe(30_003);
  });

  it("agrupa quando débito e crédito são iguais", () => {
    const grouped = groupExpenseEntries(
      [entry("1", "111", "374", 10_001), entry("2", "111", "374", 20_002)],
      "31/01/2026",
    );

    expect(grouped).toHaveLength(1);
    expect(grouped[0].creditCode).toBe("374");
    expect(grouped[0].amountInCents).toBe(30_003);
  });

  it("não agrupa quando apenas o débito é igual", () => {
    const grouped = groupExpenseEntries(
      [entry("1", "111", "374", 10_001), entry("2", "111", "777", 20_002)],
      "31/01/2026",
    );

    expect(grouped).toHaveLength(2);
  });

  it("não agrupa quando apenas o crédito é igual", () => {
    const grouped = groupExpenseEntries(
      [entry("1", "111", "374", 10_001), entry("2", "222", "374", 20_002)],
      "31/01/2026",
    );

    expect(grouped).toHaveLength(2);
  });

  it("não mistura centros de custo diferentes mesmo com o mesmo par de contas", () => {
    const first = entry("1", "111", "374", 10_001);
    const second = { ...entry("2", "111", "374", 20_002), debitCostCenter: "02" };

    const grouped = groupExpenseEntries([first, second], "31/01/2026");
    expect(grouped).toHaveLength(2);
  });
});
