import { describe, expect, it } from "vitest";
import { ChartAccount } from "./chartOfAccounts";
import { candidatesForSpedAccount } from "./spedAutoMapping";
import { SpedReferentialAccount } from "./spedRelationships";

const refs: SpedReferentialAccount[] = [
  { code: "1.01.01.01.01", description: "Caixa Matriz", nature: "A", analytical: true, source: "teste" },
  { code: "1.01.01.02.01", description: "Bancos Conta Movimento – No País", nature: "A", analytical: true, source: "teste" },
  { code: "2.01.01.01.01", description: "Salários a Pagar", nature: "P", analytical: true, source: "teste" },
  { code: "3.01.01.01.01.05", description: "Receita da Revenda de Mercadorias no Mercado Interno", nature: "R", analytical: true, source: "teste" },
  { code: "3.01.01.07.01.02", description: "Salários e Ordenados", nature: "D", analytical: true, source: "teste" },
];

function account(partial: Partial<ChartAccount> & Pick<ChartAccount, "account" | "reducedCode" | "description">): ChartAccount {
  return { id: partial.reducedCode, analytical: true, sped: true, ...partial };
}

describe("automatic SPED candidate generation", () => {
  it("never compares an asset account with result or liability references", () => {
    const list = candidatesForSpedAccount(account({ account: "111010001", reducedCode: "1", description: "CAIXA GERAL" }), refs);
    expect(list.length).toBeGreaterThan(0);
    expect(list.every(item => item.code.startsWith("1."))).toBe(true);
  });

  it("finds the salary expense inside result references", () => {
    const list = candidatesForSpedAccount(account({ account: "441104241", reducedCode: "4241", description: "SALÁRIOS" }), refs);
    expect(list[0]?.code).toBe("3.01.01.07.01.02");
  });

  it("finds merchandise revenue inside result references", () => {
    const list = candidatesForSpedAccount(account({ account: "310000010", reducedCode: "10", description: "REVENDA DE MERCADORIAS" }), refs);
    expect(list[0]?.code).toBe("3.01.01.01.01.05");
  });
});
