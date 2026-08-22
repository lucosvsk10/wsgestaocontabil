import { ChartAccount } from "./chartOfAccounts";
import { groupFromAccountCode, groupLabel, referentialRootForWsGroup } from "./accountPlanProfile";
import { SpedReferentialAccount, SpedRelationship } from "./spedRelationships";

export interface SpedMappingCandidate {
  code: string;
  description: string;
  score: number;
}

export type GeneratedSpedRelationship = SpedRelationship & {
  generatedBy?: "auto";
  confidence?: number;
  reason?: string;
};

export interface AutomaticSpedMappingResult {
  relationships: GeneratedSpedRelationship[];
  unresolved: Array<{ account: ChartAccount; candidates: SpedMappingCandidate[] }>;
  deterministicCount: number;
  aiCount: number;
}

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .replace(/\s+/g, " ")
  .trim()
  .toLowerCase();

const STOP = new Set([
  "de", "da", "do", "das", "dos", "e", "em", "no", "na", "nos", "nas", "para", "por", "com",
  "conta", "contas", "geral", "gerais", "diversos", "diversas", "outros", "outras", "empresa", "empresas",
]);

const SYNONYMS: Array<[RegExp, string]> = [
  [/\bbco\b|\bbancos?\b/g, "banco"],
  [/\bsalarios?\b|\bordenados?\b|\bremuneracoes?\b/g, "salario"],
  [/\bclientes?\b|\bduplicatas? a receber\b/g, "cliente"],
  [/\bfornecedores?\b|\bduplicatas? a pagar\b/g, "fornecedor"],
  [/\bservicos?\b|\bprestacao\b/g, "servico"],
  [/\bmercadorias?\b|\brevenda\b/g, "mercadoria"],
  [/\bferias\b/g, "ferias"],
  [/\bpro labore\b|\bprolabore\b/g, "prolabore"],
  [/\bdepreciacoes?\b/g, "depreciacao"],
  [/\bimpostos?\b|\btributos?\b/g, "imposto"],
  [/\bencargos?\b/g, "encargo"],
];

function semanticText(value: string) {
  let text = normalize(value);
  SYNONYMS.forEach(([pattern, replacement]) => { text = text.replace(pattern, replacement); });
  return text;
}

function tokens(value: string) {
  return new Set(semanticText(value).split(" ").filter(token => token.length > 2 && !STOP.has(token)));
}

function similarity(a: string, b: string) {
  const leftText = semanticText(a);
  const rightText = semanticText(b);
  if (!leftText || !rightText) return 0;
  if (leftText === rightText) return 1;
  if (leftText.length > 5 && (leftText.includes(rightText) || rightText.includes(leftText))) return 0.92;

  const left = tokens(a);
  const right = tokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach(token => { if (right.has(token)) intersection += 1; });
  const union = new Set([...left, ...right]).size;
  const jaccard = union ? intersection / union : 0;
  const containment = intersection / Math.max(1, Math.min(left.size, right.size));
  return Math.min(0.91, jaccard * 0.45 + containment * 0.55);
}

function resultNatureBonus(account: ChartAccount, reference: SpedReferentialAccount) {
  const group = groupFromAccountCode(account.account);
  const ref = normalize(reference.description);
  if (group === "revenue" && /receita|venda|servico|faturamento/.test(ref)) return 0.08;
  if (group === "expense" && /despesa|custo|salario|encargo|imposto|aluguel|energia|depreciacao/.test(ref)) return 0.08;
  return 0;
}

export function candidatesForSpedAccount(account: ChartAccount, referential: SpedReferentialAccount[], limit = 8): SpedMappingCandidate[] {
  const group = groupFromAccountCode(account.account);
  const root = referentialRootForWsGroup(group);
  if (!root) return [];

  return referential
    .filter(reference => reference.analytical !== false)
    .filter(reference => reference.code === root || reference.code.startsWith(`${root}.`))
    .map(reference => ({
      code: reference.code,
      description: reference.description,
      score: Math.min(1, similarity(account.description, reference.description) + resultNatureBonus(account, reference)),
    }))
    .sort((a, b) => b.score - a.score || a.code.localeCompare(b.code))
    .slice(0, limit);
}

export async function generateAutomaticSpedMappings(
  _company: string,
  accounts: ChartAccount[],
  referential: SpedReferentialAccount[],
): Promise<AutomaticSpedMappingResult> {
  if (!accounts.length) throw new Error("Importe o Plano de Contas da empresa antes de gerar o relacionamento.");
  if (!referential.length) throw new Error("O Plano Referencial da Receita ainda não está carregado.");

  // Resultado/encerramento não recebe conta referencial. Para os demais grupos,
  // basta escolher a referência analítica mais próxima dentro do grupo correto.
  const analytical = accounts.filter(account =>
    account.analytical
    && account.reducedCode
    && referentialRootForWsGroup(groupFromAccountCode(account.account)),
  );

  const relationships: GeneratedSpedRelationship[] = [];
  const unresolved: AutomaticSpedMappingResult["unresolved"] = [];

  analytical.forEach(account => {
    const candidates = candidatesForSpedAccount(account, referential, 8);
    const best = candidates[0];
    if (!best) {
      unresolved.push({ account, candidates });
      return;
    }

    const confidence = Math.max(0.5, Math.min(0.99, best.score || 0.5));
    relationships.push({
      id: `auto-${account.reducedCode}`,
      accountReducedCode: account.reducedCode,
      accountCode: account.account,
      costCenterReducedCode: "",
      referentialCode: best.code,
      source: "imported",
      generatedBy: "auto",
      confidence,
      reason: `Referência mais próxima dentro do grupo ${groupLabel(groupFromAccountCode(account.account))}.`,
    });
  });

  return {
    relationships,
    unresolved,
    deterministicCount: relationships.length,
    aiCount: 0,
  };
}
