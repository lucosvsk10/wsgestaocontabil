import { describe, expect, it } from "vitest";
import { ChartAccount } from "./chartOfAccounts";
import { automaticCostCenterForWsPlan, detectNumberedWsPlan, groupFromAccountCode, referentialRootForWsGroup } from "./accountPlanProfile";
import { CostCenter } from "./costCenters";

const accounts: ChartAccount[] = [
  { id: "r1", account: "1", reducedCode: "ROOT-1", description: "ATIVO", analytical: false, sped: false },
  { id: "r2", account: "2", reducedCode: "ROOT-2", description: "PASSIVO", analytical: false, sped: false },
  { id: "r3", account: "3", reducedCode: "ROOT-3", description: "RECEITA", analytical: false, sped: false },
  { id: "r4", account: "4", reducedCode: "ROOT-4", description: "DESPESA", analytical: false, sped: false },
  { id: "r6", account: "6", reducedCode: "ROOT-6", description: "RESULTADOS", analytical: false, sped: false },
  { id: "a", account: "111010001", reducedCode: "1", description: "CAIXA GERAL", analytical: true, sped: true },
  { id: "p", account: "211403108", reducedCode: "3108", description: "SALÁRIOS À PAGAR", analytical: true, sped: true },
  { id: "r", account: "310000010", reducedCode: "10", description: "REVENDA DE MERCADORIAS", analytical: true, sped: true },
  { id: "d", account: "441104241", reducedCode: "4241", description: "SALÁRIOS", analytical: true, sped: true },
];

const centers: CostCenter[] = [
  { id: "3", code: "3", reducedCode: "3", description: "RECEITAS", analytical: true },
  { id: "4", code: "4", reducedCode: "4", description: "DESPESAS", analytical: true },
];

describe("numbered WS accounting plan", () => {
  it("detects the 1/2/3/4/6 structure", () => {
    expect(detectNumberedWsPlan(accounts).detected).toBe(true);
  });

  it("uses prefixes as the primary accounting groups", () => {
    expect(groupFromAccountCode("111010001")).toBe("asset");
    expect(groupFromAccountCode("211403108")).toBe("liability");
    expect(groupFromAccountCode("310000010")).toBe("revenue");
    expect(groupFromAccountCode("441104241")).toBe("expense");
    expect(groupFromAccountCode("611100001")).toBe("result");
  });

  it("assigns cost centers only to revenue and expense in this plan", () => {
    expect(automaticCostCenterForWsPlan(accounts[7], centers)?.reducedCode).toBe("3");
    expect(automaticCostCenterForWsPlan(accounts[8], centers)?.reducedCode).toBe("4");
    expect(automaticCostCenterForWsPlan(accounts[5], centers)).toBeNull();
    expect(automaticCostCenterForWsPlan(accounts[6], centers)).toBeNull();
  });

  it("restricts the Receita candidate root before AI mapping", () => {
    expect(referentialRootForWsGroup("asset")).toBe("1");
    expect(referentialRootForWsGroup("liability")).toBe("2");
    expect(referentialRootForWsGroup("revenue")).toBe("3");
    expect(referentialRootForWsGroup("expense")).toBe("3");
    expect(referentialRootForWsGroup("result")).toBe("3");
  });
});
