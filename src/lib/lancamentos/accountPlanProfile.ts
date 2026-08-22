import { ChartAccount } from "./chartOfAccounts";
import { CostCenter } from "./costCenters";

export type WsAccountGroup = "asset" | "liability" | "revenue" | "expense" | "result" | "unknown";

export interface NumberedPlanProfile {
  id: "ws-1-2-3-4-6";
  detected: boolean;
  confidence: number;
}

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .trim()
  .toLowerCase();

export function groupFromAccountCode(accountCode: string): WsAccountGroup {
  const first = String(accountCode ?? "").trim().charAt(0);
  if (first === "1") return "asset";
  if (first === "2") return "liability";
  if (first === "3") return "revenue";
  if (first === "4") return "expense";
  if (first === "6") return "result";
  return "unknown";
}

export function groupLabel(group: WsAccountGroup) {
  return ({
    asset: "Ativo",
    liability: "Passivo",
    revenue: "Receita",
    expense: "Despesa",
    result: "Resultado",
    unknown: "Não identificado",
  } as const)[group];
}

export function detectNumberedWsPlan(accounts: ChartAccount[]): NumberedPlanProfile {
  if (!accounts.length) return { id: "ws-1-2-3-4-6", detected: false, confidence: 0 };

  const roots = new Map<string, ChartAccount[]>();
  accounts.forEach(account => {
    const first = String(account.account ?? "").trim().charAt(0);
    if (!first) return;
    roots.set(first, [...(roots.get(first) ?? []), account]);
  });

  const expected = ["1", "2", "3", "4", "6"];
  const present = expected.filter(root => roots.has(root)).length;
  const semanticChecks = [
    ["1", /ativo/],
    ["2", /passivo/],
    ["3", /receita/],
    ["4", /despesa|custo/],
    ["6", /resultado/],
  ] as const;

  let semanticHits = 0;
  semanticChecks.forEach(([root, pattern]) => {
    const sample = (roots.get(root) ?? []).slice(0, 40);
    if (sample.some(account => pattern.test(normalize(account.description)))) semanticHits += 1;
  });

  const confidence = Math.min(1, (present / expected.length) * 0.6 + (semanticHits / expected.length) * 0.4);
  return { id: "ws-1-2-3-4-6", detected: present >= 4 && confidence >= 0.68, confidence };
}

function centerByMeaning(centers: CostCenter[], term: string, fallbackCode?: string) {
  return centers.find(center => center.analytical && normalize(center.description).includes(term))
    ?? (fallbackCode ? centers.find(center => center.analytical && center.reducedCode === fallbackCode) : undefined)
    ?? null;
}

export function automaticCostCenterForWsPlan(account: ChartAccount, centers: CostCenter[]) {
  const text = normalize(account.description);

  // Primeiro usamos o significado da própria conta. Assim contas de custo e de crédito
  // não ficam presas ao grupo 4/1 quando existe um centro específico para elas.
  if (/\bcusto\b|custos|cmv|cpv|csp/.test(text)) {
    return centerByMeaning(centers, "custo", "6");
  }
  if (/recup|credito|ressarc|reembolso/.test(text)) {
    return centerByMeaning(centers, "credito", "5");
  }

  const group = groupFromAccountCode(account.account);
  if (group === "revenue") return centerByMeaning(centers, "receita", "3");
  if (group === "expense") return centerByMeaning(centers, "despesa", "4");

  return null;
}

export function referentialRootForWsGroup(group: WsAccountGroup) {
  if (group === "asset") return "1";
  if (group === "liability") return "2";
  if (["revenue", "expense"].includes(group)) return "3";
  return "";
}
