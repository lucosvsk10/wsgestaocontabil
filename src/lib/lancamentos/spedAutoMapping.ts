import { supabase } from "@/integrations/supabase/client";
import { ChartAccount } from "./chartOfAccounts";
import { groupFromAccountCode, groupLabel, referentialRootForWsGroup } from "./accountPlanProfile";
import { SpedReferentialAccount, SpedRelationship } from "./spedRelationships";

export interface SpedMappingCandidate {
  code: string;
  description: string;
  score: number;
}

export type GeneratedSpedRelationship = SpedRelationship & {
  generatedBy?: "auto" | "ai";
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
  if (group === "result" && /resultado|lucro|prejuizo/.test(ref)) return 0.08;
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

function deterministicDecision(account: ChartAccount, candidates: SpedMappingCandidate[]) {
  const first = candidates[0];
  const second = candidates[1];
  if (!first) return null;
  const margin = first.score - (second?.score ?? 0);
  const exact = semanticText(account.description) === semanticText(first.description);
  if (exact || first.score >= 0.93 || (first.score >= 0.82 && margin >= 0.14)) {
    return {
      code: first.code,
      confidence: exact ? 0.99 : Math.max(0.84, Math.min(0.98, first.score)),
      reason: exact ? "Descrição equivalente na base referencial." : "Correspondência semântica forte dentro do grupo contábil correto.",
    };
  }
  return null;
}

function chunks<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export async function generateAutomaticSpedMappings(
  company: string,
  accounts: ChartAccount[],
  referential: SpedReferentialAccount[],
): Promise<AutomaticSpedMappingResult> {
  if (!accounts.length) throw new Error("Importe o Plano de Contas da empresa antes de gerar o relacionamento SPED.");
  if (!referential.length) throw new Error("A base referencial da Receita ainda não está disponível para esta empresa.");

  const analytical = accounts.filter(account => account.analytical && account.reducedCode && referentialRootForWsGroup(groupFromAccountCode(account.account)));
  const relationships: GeneratedSpedRelationship[] = [];
  const pending: Array<{ account: ChartAccount; candidates: SpedMappingCandidate[] }> = [];

  analytical.forEach(account => {
    const candidates = candidatesForSpedAccount(account, referential, 7);
    const decision = deterministicDecision(account, candidates);
    if (decision) {
      relationships.push({
        id: `auto-${account.reducedCode}`,
        accountReducedCode: account.reducedCode,
        accountCode: account.account,
        costCenterReducedCode: "",
        referentialCode: decision.code,
        source: "imported",
        generatedBy: "auto",
        confidence: decision.confidence,
        reason: decision.reason,
      });
    } else {
      pending.push({ account, candidates });
    }
  });

  let aiCount = 0;
  const stillUnresolved: typeof pending = [];

  for (const batch of chunks(pending, 45)) {
    const { data, error } = await supabase.functions.invoke("auto-map-sped-accounts", {
      body: {
        company_id: company,
        accounts: batch.map(({ account, candidates }) => ({
          reducedCode: account.reducedCode,
          accountCode: account.account,
          description: account.description,
          group: groupLabel(groupFromAccountCode(account.account)),
          candidates,
        })),
      },
    });

    if (error || !Array.isArray(data?.mappings)) {
      stillUnresolved.push(...batch);
      continue;
    }

    const byCr = new Map(batch.map(item => [item.account.reducedCode, item]));
    const mapped = new Set<string>();
    for (const suggestion of data.mappings as Array<{ reducedCode: string; referentialCode: string; confidence: number; reason: string }>) {
      const item = byCr.get(String(suggestion.reducedCode));
      if (!item) continue;
      const candidate = item.candidates.find(option => option.code === suggestion.referentialCode);
      const confidence = Number(suggestion.confidence ?? 0);
      if (!candidate || confidence < 0.72) continue;
      relationships.push({
        id: `ai-${item.account.reducedCode}`,
        accountReducedCode: item.account.reducedCode,
        accountCode: item.account.account,
        costCenterReducedCode: "",
        referentialCode: candidate.code,
        source: "imported",
        generatedBy: "ai",
        confidence,
        reason: suggestion.reason || "Conta referencial escolhida pela IA entre as opções compatíveis.",
      });
      mapped.add(item.account.reducedCode);
      aiCount += 1;
    }
    batch.forEach(item => { if (!mapped.has(item.account.reducedCode)) stillUnresolved.push(item); });
  }

  return {
    relationships,
    unresolved: stillUnresolved,
    deterministicCount: relationships.filter(item => item.generatedBy === "auto").length,
    aiCount,
  };
}
