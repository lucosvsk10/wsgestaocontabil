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
      "debit",
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
      "debit",
      "31/01/2026",
    );

    expect(grouped).toHaveLength(2);
    expect(grouped.every((item) => !item.hasMixedCounterpart)).toBe(true);
    expect(grouped.reduce((total, item) => total + item.amountInCents, 0)).toBe(30_003);
  });

  it("permite agrupar pela conta de crédito", () => {
    const grouped = groupExpenseEntries(
      [entry("1", "111", "374", 10_001), entry("2", "111", "374", 20_002)],
      "credit",
      "31/01/2026",
    );

    expect(grouped).toHaveLength(1);
    expect(grouped[0].creditCode).toBe("374");
    expect(grouped[0].amountInCents).toBe(30_003);
  });
});
