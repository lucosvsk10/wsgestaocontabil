import { describe, expect, it } from "vitest";
import { historicalPurchases, historicalRevenue } from "./historicalRegression";

describe("historical accounting regression 2024-2025", () => {
  it("covers all 24 purchase competences and preserves annual totals", () => {
    expect(historicalPurchases).toHaveLength(24);
    const p2024 = historicalPurchases.filter(row => row.competence.endsWith("/2024"));
    const p2025 = historicalPurchases.filter(row => row.competence.endsWith("/2025"));
    expect(p2024).toHaveLength(12);
    expect(p2025).toHaveLength(12);
    expect(p2024.reduce((sum, row) => sum + row.quantity, 0)).toBe(119);
    expect(p2024.reduce((sum, row) => sum + row.totalAmountInCents, 0)).toBe(112958728);
    expect(p2025.reduce((sum, row) => sum + row.quantity, 0)).toBe(87);
    expect(p2025.reduce((sum, row) => sum + row.totalAmountInCents, 0)).toBe(120946861);
    expect(p2025.find(row => row.competence === "11/2025")).toEqual({ competence: "11/2025", quantity: 0, totalAmountInCents: 0 });
    expect(p2025.find(row => row.competence === "12/2025")).toEqual({ competence: "12/2025", quantity: 0, totalAmountInCents: 0 });
  });

  it("covers all 24 revenue competences and catches optional NF-e/PGDAS months", () => {
    expect(historicalRevenue).toHaveLength(24);
    const r2024 = historicalRevenue.filter(row => row.competence.endsWith("/2024"));
    const r2025 = historicalRevenue.filter(row => row.competence.endsWith("/2025"));
    expect(r2024).toHaveLength(12);
    expect(r2025).toHaveLength(12);
    for (const row of historicalRevenue) expect(row.serviceAmountInCents + row.merchandiseAmountInCents).toBe(row.totalAmountInCents);
    expect(r2024.reduce((sum, row) => sum + row.totalAmountInCents, 0)).toBe(267728117);
    expect(r2024.reduce((sum, row) => sum + row.pgdasAmountInCents, 0)).toBe(34289612);
    expect(r2025.reduce((sum, row) => sum + row.totalAmountInCents, 0)).toBe(267827066);
    expect(r2025.reduce((sum, row) => sum + row.pgdasAmountInCents, 0)).toBe(39168922);

    expect(r2024.filter(row => row.merchandiseAmountInCents === 0).map(row => row.competence)).toEqual(["04/2024", "06/2024", "07/2024", "10/2024"]);
    expect(r2024.find(row => row.competence === "12/2024")?.pgdasAmountInCents).toBe(0);
    expect(r2025.filter(row => row.merchandiseAmountInCents > 0).map(row => row.competence)).toEqual(["01/2025"]);
    expect(r2025.every(row => row.pgdasAmountInCents > 0)).toBe(true);
  });
});
