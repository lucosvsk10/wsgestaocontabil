import { describe, expect, it } from "vitest";
import { ChartAccount } from "./chartOfAccounts";
import { CostCenter } from "./costCenters";
import { SpedReferentialAccount, SpedRelationship, validateSpedRelationships } from "./spedRelationships";

const accounts: ChartAccount[] = [
  { id: "1", account: "1", reducedCode: "100", description: "ATIVO", analytical: false, sped: false },
  { id: "2", account: "101", reducedCode: "101", description: "ATIVO CIRCULANTE", analytical: false, sped: false },
  { id: "3", account: "10101", reducedCode: "102", description: "DISPONIBILIDADES", analytical: false, sped: false },
  { id: "4", account: "1010101", reducedCode: "103", description: "CAIXA GERAL", analytical: false, sped: false },
  { id: "5", account: "101010101", reducedCode: "374", description: "CAIXA MATRIZ", analytical: true, sped: true },
  { id: "6", account: "3", reducedCode: "300", description: "RECEITAS", analytical: false, sped: false },
  { id: "7", account: "301", reducedCode: "301", description: "RECEITA OPERACIONAL", analytical: false, sped: false },
  { id: "8", account: "30101", reducedCode: "11", description: "Receita da Prestação de Serviços", analytical: true, sped: true },
  { id: "9", account: "4", reducedCode: "400", description: "DESPESAS", analytical: false, sped: false },
  { id: "10", account: "401", reducedCode: "401", description: "DESPESAS OPERACIONAIS", analytical: false, sped: false },
  { id: "11", account: "40101", reducedCode: "92", description: "Salários", analytical: true, sped: true },
];

const centers: CostCenter[] = [
  { id: "3", code: "3", reducedCode: "3", description: "RECEITAS", analytical: true },
  { id: "4", code: "4", reducedCode: "4", description: "DESPESAS", analytical: true },
];

const referential: SpedReferentialAccount[] = [
  { code: "101010102", description: "Caixa", nature: "A", source: "teste" },
  { code: "303010101", description: "Receita de serviços", nature: "R", source: "teste" },
  { code: "305010101", description: "Despesas com pessoal", nature: "D", source: "teste" },
];

function relation(partial: Partial<SpedRelationship> & Pick<SpedRelationship, "id" | "accountReducedCode" | "referentialCode">): SpedRelationship {
  return { costCenterReducedCode: "", source: "manual", ...partial };
}

describe("SPED relationship validator", () => {
  it("accepts one referential account for each account + cost center combination", () => {
    const result = validateSpedRelationships(
      accounts,
      centers,
      [
        { accountReducedCode: "11", costCenterReducedCode: "3", required: true },
        { accountReducedCode: "92", costCenterReducedCode: "4", required: true },
      ],
      [
        relation({ id: "cash", accountReducedCode: "374", referentialCode: "101010102" }),
        relation({ id: "revenue", accountReducedCode: "11", costCenterReducedCode: "3", referentialCode: "303010101" }),
        relation({ id: "salary", accountReducedCode: "92", costCenterReducedCode: "4", referentialCode: "305010101" }),
      ],
      referential,
    );

    expect(result.criticalGroups).toBe(0);
    expect(result.validRelationships).toBe(3);
  });

  it("groups duplicate I051 relationships as one root cause instead of many repeated criticisms", () => {
    const result = validateSpedRelationships(
      accounts,
      centers,
      [],
      [
        relation({ id: "a", accountReducedCode: "11", costCenterReducedCode: "3", referentialCode: "303010101" }),
        relation({ id: "b", accountReducedCode: "11", costCenterReducedCode: "3", referentialCode: "303010199" }),
      ],
      referential,
    );

    const duplicate = result.groups.find(group => group.code === "I051_DUPLICATE");
    expect(duplicate?.impactedCount).toBe(1);
    expect(duplicate?.impactedReducedCodes).toEqual(["11"]);
  });

  it("blocks an unknown cost center and a nature mismatch", () => {
    const result = validateSpedRelationships(
      accounts,
      centers,
      [],
      [
        relation({ id: "bad-center", accountReducedCode: "11", costCenterReducedCode: "999", referentialCode: "303010101" }),
        relation({ id: "bad-nature", accountReducedCode: "374", referentialCode: "305010101" }),
      ],
      referential,
    );

    expect(result.groups.some(group => group.code === "COST_CENTER_NOT_FOUND" && group.severity === "critical")).toBe(true);
    expect(result.groups.some(group => group.code === "NATURE_MISMATCH" && group.severity === "critical")).toBe(true);
  });

  it("detects a required center relationship that was not configured", () => {
    const result = validateSpedRelationships(
      accounts,
      centers,
      [{ accountReducedCode: "92", costCenterReducedCode: "4", required: true }],
      [],
      referential,
    );

    const missing = result.groups.find(group => group.code === "REQUIRED_CENTER_RELATION_MISSING");
    expect(missing?.impactedReducedCodes).toContain("92");
  });
});
