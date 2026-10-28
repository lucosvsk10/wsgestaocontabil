import { describe, expect, it } from "vitest";
import { analyticalTrialBalanceRows, type TrialBalanceRow } from "./trialBalance";
import { checkBalanceLimits } from "./trialBalanceLimits";

const row = (id: string, accountCode: string, reducedCode: string, title: string, balanceInCents = 0, nature: "D" | "C" | "" = "D"): TrialBalanceRow => ({
  id, accountCode, reducedCode, title,
  previousBalanceInCents: balanceInCents, previousNature: nature,
  debitInCents: 0, creditInCents: 0,
  currentBalanceInCents: balanceInCents, currentNature: nature,
  confidence: 1, source: "unit test",
});

describe("Novo filtro determinístico do Balancete", () => {
  it("identifica conta sintética sem pontos e preserva somente as analíticas", () => {
    const values = [
      row("root", "1", "370", "ATIVO"),
      row("group", "101", "371", "ATIVO CIRCULANTE"),
      row("cash", "101010101", "374", "CAIXA MATRIZ"),
      row("bank", "101010202", "378", "BANCO DO BRASIL"),
      row("sup", "2", "818", "PASSIVO"),
      row("pay", "20101030", "777", "FORNECEDORES"),
    ];
    expect(analyticalTrialBalanceRows(values).map(item => item.reducedCode)).toEqual(["374", "378", "777"]);
  });

  it("marca caixa credor e acima do limite pré-configurado", () => {
    const caixa = row("cash", "101010101", "374", "CAIXA MATRIZ", 80000, "C");
    const checks = checkBalanceLimits([caixa]);
    expect(checks[0].critical).toBe(true);
    expect(checks[0].reasons).toContain("Natureza invertida");
  });

  it("respeita regra customizada com margem de tolerância", () => {
    const cash = row("cash", "101010101", "374", "CAIXA MATRIZ", 120000, "D");
    const flags = checkBalanceLimits([cash], { "374": {
      nature: "D", minInCents: 0, maxInCents: 100000, marginPercent: 25, origin: "custom",
    } });
    expect(flags[0].critical).toBe(false);
  });
});
