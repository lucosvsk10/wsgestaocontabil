import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

type Account = {
  reducedCode: string;
  description: string;
  analytical?: boolean;
  account?: string;
};

type MappingSource = "learned" | "predefined" | "ai" | "manual" | "unresolved";

type Entry = {
  id: string;
  date?: string;
  history?: string;
  eventType?: string;
  rubricCode?: string;
  rubricDescription?: string;
  kind?: string;
  section?: string;
  debitCode?: string;
  debitDescription?: string;
  debitCostCenter?: string;
  creditCode?: string;
  creditDescription?: string;
  creditCostCenter?: string;
  amountInCents?: number;
  source?: string;
  confidence?: number;
  targetCompetence?: string;
  mappingSource?: MappingSource;
  mappingNeedsApproval?: boolean;
  mappingConfidence?: number;
  mappingReason?: string;
  mappingRuleId?: string;
};

type LearnedRule = {
  id: string;
  signature: string;
  rubric_code: string;
  normalized_description: string;
  section: string;
  kind: string;
  event_type: string;
  debit_code: string;
  debit_description: string;
  debit_cost_center: string;
  credit_code: string;
  credit_description: string;
  credit_cost_center: string;
  times_used: number;
};

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .trim()
  .toLowerCase();

const signatureFor = (entry: Entry) => [
  normalize(entry.rubricCode),
  normalize(entry.rubricDescription),
  normalize(entry.section),
  normalize(entry.kind),
  normalize(entry.eventType),
].join("|");

const hasCompleteMapping = (entry: Entry) => Boolean(
  entry.debitCode?.trim() &&
  entry.creditCode?.trim() &&
  entry.debitDescription?.trim() &&
  entry.creditDescription?.trim()
);

function uniqueRule(rules: LearnedRule[], predicate: (rule: LearnedRule) => boolean) {
  const matches = rules.filter(predicate);
  if (!matches.length) return undefined;
  const pairs = new Map(matches.map((rule) => [`${rule.debit_code}|${rule.credit_code}`, rule]));
  return pairs.size === 1 ? [...pairs.values()][0] : undefined;
}

function findLearnedRule(entry: Entry, rules: LearnedRule[]) {
  const exact = rules.find((rule) => rule.signature === signatureFor(entry));
  if (exact) return exact;

  const rubricCode = normalize(entry.rubricCode);
  const section = normalize(entry.section);
  const kind = normalize(entry.kind);
  const eventType = normalize(entry.eventType);
  const description = normalize(entry.rubricDescription);

  if (rubricCode) {
    const byRubric = uniqueRule(rules, (rule) =>
      normalize(rule.rubric_code) === rubricCode &&
      normalize(rule.section) === section &&
      normalize(rule.kind) === kind &&
      (!eventType || !rule.event_type || normalize(rule.event_type) === eventType)
    );
    if (byRubric) return byRubric;
  }

  if (description) {
    const byDescription = uniqueRule(rules, (rule) =>
      rule.normalized_description === description &&
      normalize(rule.section) === section &&
      normalize(rule.kind) === kind
    );
    if (byDescription) return byDescription;
  }

  return undefined;
}

function applyLearnedRule(entry: Entry, rule: LearnedRule, accountMap: Map<string, Account>): Entry | null {
  const debit = accountMap.get(rule.debit_code);
  const credit = accountMap.get(rule.credit_code);
  if (!debit || !credit) return null;
  return {
    ...entry,
    debitCode: rule.debit_code,
    debitDescription: debit.description,
    debitCostCenter: rule.debit_cost_center || entry.debitCostCenter || "",
    creditCode: rule.credit_code,
    creditDescription: credit.description,
    creditCostCenter: rule.credit_cost_center || entry.creditCostCenter || "",
    mappingSource: "learned",
    mappingNeedsApproval: false,
    mappingConfidence: 1,
    mappingReason: "Mapeamento já aprovado anteriormente para esta empresa.",
    mappingRuleId: rule.id,
  };
}

const mappingSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    mappings: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          index: { type: "integer" },
          debitCode: { type: "string" },
          creditCode: { type: "string" },
          confidence: { type: "number" },
          reason: { type: "string" },
        },
        required: ["index", "debitCode", "creditCode", "confidence", "reason"],
      },
    },
  },
  required: ["mappings"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: { role: string }) => ["admin", "fiscal", "contabil", "geral"].includes(row.role))) {
      return json({ error: "Acesso negado" }, 403);
    }

    const body = await req.json();
    const companyKey = String(body.company_id || "");
    const module = String(body.module || "folha");
    const accounts: Account[] = Array.isArray(body.chart_of_accounts) ? body.chart_of_accounts : [];
    const inputEntries: Entry[] = Array.isArray(body.entries) ? body.entries : [];
    const inputDeferred: Entry[] = Array.isArray(body.deferredEntries) ? body.deferredEntries : [];

    if (!companyKey) return json({ error: "Empresa não informada" }, 422);
    if (!accounts.length) return json({ error: "Plano de contas não informado" }, 422);

    const accountMap = new Map(
      accounts
        .filter((account) => account.analytical !== false && account.reducedCode)
        .map((account) => [String(account.reducedCode), account]),
    );

    const { data: learnedData, error: learnedError } = await admin
      .from("accounting_mapping_rules")
      .select("id,signature,rubric_code,normalized_description,section,kind,event_type,debit_code,debit_description,debit_cost_center,credit_code,credit_description,credit_cost_center,times_used")
      .eq("company_key", companyKey)
      .eq("module", module)
      .eq("is_active", true);
    if (learnedError) throw learnedError;
    const learnedRules = (learnedData ?? []) as LearnedRule[];

    let learnedCount = 0;
    let predefinedCount = 0;
    const usedRuleIds = new Set<string>();

    const prepare = (entry: Entry): Entry => {
      if (hasCompleteMapping(entry)) {
        predefinedCount += 1;
        return {
          ...entry,
          mappingSource: entry.mappingSource || "predefined",
          mappingNeedsApproval: Boolean(entry.mappingNeedsApproval),
          mappingConfidence: entry.mappingConfidence ?? 1,
          mappingReason: entry.mappingReason || "Mapeamento resolvido pelas regras pré-definidas do sistema.",
        };
      }

      const learned = findLearnedRule(entry, learnedRules);
      if (learned) {
        const applied = applyLearnedRule(entry, learned, accountMap);
        if (applied) {
          learnedCount += 1;
          usedRuleIds.add(learned.id);
          return applied;
        }
      }

      return {
        ...entry,
        mappingSource: "unresolved",
        mappingNeedsApproval: true,
        mappingConfidence: 0,
        mappingReason: "Ainda não existe uma regra aprovada para esta combinação.",
      };
    };

    let entries = inputEntries.map(prepare);
    let deferredEntries = inputDeferred.map(prepare);

    const unresolvedRefs: Array<{ bucket: "entries" | "deferred"; index: number; entry: Entry }> = [];
    entries.forEach((entry, index) => { if (!hasCompleteMapping(entry)) unresolvedRefs.push({ bucket: "entries", index, entry }); });
    deferredEntries.forEach((entry, index) => { if (!hasCompleteMapping(entry)) unresolvedRefs.push({ bucket: "deferred", index, entry }); });

    let aiSuggestionsCount = 0;
    let model: string | null = null;

    if (unresolvedRefs.length) {
      const apiKey = Deno.env.get("OPENAI_API_KEY");
      if (!apiKey) return json({ error: "A chave OPENAI_API_KEY não está configurada para resolver os mapeamentos pendentes." }, 503);

      model = Deno.env.get("OPENAI_ACCOUNTING_MAPPING_MODEL") || "gpt-5.6-terra";
      const analyticalAccounts = accounts
        .filter((account) => account.analytical !== false && account.reducedCode)
        .slice(0, 1500)
        .map((account) => ({
          cr: String(account.reducedCode),
          descricao: account.description,
          conta: account.account || "",
        }));

      const companyExamples = learnedRules.slice(0, 120).map((rule) => ({
        rubrica: rule.rubric_code,
        descricao: rule.normalized_description,
        secao: rule.section,
        tipo: rule.kind,
        debito: rule.debit_code,
        credito: rule.credit_code,
      }));

      const pending = unresolvedRefs.map((item, index) => ({
        index,
        rubrica: item.entry.rubricCode || "",
        descricao: item.entry.rubricDescription || item.entry.history || "",
        secao: item.entry.section || "",
        tipo: item.entry.kind || "",
        evento: item.entry.eventType || "",
        debitoAtual: item.entry.debitCode || "",
        creditoAtual: item.entry.creditCode || "",
      }));

      const instructions = `Você é um classificador contábil assistido por humano. Sua tarefa é preencher SOMENTE débito e crédito das linhas pendentes usando exclusivamente o plano de contas fornecido desta empresa.

REGRAS OBRIGATÓRIAS:
1. Empresas diferentes usam planos de contas diferentes. Nunca transfira um C.R. de outra empresa.
2. Só retorne C.R.s existentes exatamente na lista PLANO_DE_CONTAS.
3. Use os exemplos APROVADOS_DA_EMPRESA como conhecimento prioritário quando forem semanticamente compatíveis.
4. Se houver uma conta já preenchida na linha, preserve-a a menos que seja claramente incompatível.
5. Escolha a combinação mais plausível segundo a natureza da rubrica, seção e tipo. A decisão ainda será revisada por um contador.
6. Não invente banco, caixa ou pagamento. Estamos classificando o lançamento de folha, não registrando quitação.
7. Retorne string vazia apenas quando realmente não existir conta plausível no plano. Caso haja uma opção plausível, escolha-a e reduza confidence se necessário.
8. confidence vai de 0 a 1. reason deve ser curta e objetiva.
9. Não altere valores, rubrica, seção, histórico ou competência.`;

      const prompt = JSON.stringify({
        LINHAS_PENDENTES: pending,
        APROVADOS_DA_EMPRESA: companyExamples,
        PLANO_DE_CONTAS: analyticalAccounts,
      });

      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          instructions,
          input: prompt,
          text: {
            format: {
              type: "json_schema",
              name: "accounting_mapping_suggestions",
              strict: true,
              schema: mappingSchema,
            },
          },
          max_output_tokens: Math.min(12000, Math.max(2500, unresolvedRefs.length * 260)),
        }),
        signal: AbortSignal.timeout(120_000),
      });

      const raw = await response.json();
      const usage = raw?.usage ?? {};
      const cached = Number(usage?.input_tokens_details?.cached_tokens ?? 0);
      const inputTokens = Number(usage?.input_tokens ?? 0);
      const outputTokens = Number(usage?.output_tokens ?? 0);
      const estimatedCost = model === "gpt-5.6-terra"
        ? ((Math.max(0, inputTokens - cached) * 2) + (cached * 0.2) + (outputTokens * 12)) / 1_000_000
        : 0;

      await admin.from("accounting_ai_usage").insert({
        created_by: user.id,
        company_key: companyKey,
        module,
        provider: "openai",
        model: raw?.model || model,
        status: response.ok ? "success" : "error",
        response_id: raw?.id ?? null,
        input_tokens: inputTokens,
        cached_input_tokens: cached,
        output_tokens: outputTokens,
        total_tokens: usage.total_tokens ?? 0,
        estimated_cost_usd: estimatedCost,
        error_code: raw?.error?.code ?? raw?.error?.type ?? null,
        error_message: raw?.error?.message ?? null,
        request_metadata: {
          pass: "adaptive_mapping",
          unresolved_count: unresolvedRefs.length,
          chart_accounts_count: analyticalAccounts.length,
          learned_examples_count: companyExamples.length,
        },
      });

      if (!response.ok) throw new Error(raw?.error?.message || "Falha ao sugerir mapeamentos contábeis.");
      const outputText = raw.output_text || raw.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
      if (!outputText) throw new Error("A IA não devolveu sugestões estruturadas de mapeamento.");

      const parsed = JSON.parse(outputText) as { mappings: Array<{ index: number; debitCode: string; creditCode: string; confidence: number; reason: string }> };
      for (const suggestion of parsed.mappings ?? []) {
        const ref = unresolvedRefs[suggestion.index];
        if (!ref) continue;
        const debit = accountMap.get(String(suggestion.debitCode || ""));
        const credit = accountMap.get(String(suggestion.creditCode || ""));
        if (!debit || !credit) continue;

        const current = ref.bucket === "entries" ? entries[ref.index] : deferredEntries[ref.index];
        const mapped: Entry = {
          ...current,
          debitCode: debit.reducedCode,
          debitDescription: debit.description,
          creditCode: credit.reducedCode,
          creditDescription: credit.description,
          mappingSource: "ai",
          mappingNeedsApproval: true,
          mappingConfidence: Number.isFinite(suggestion.confidence) ? Math.max(0, Math.min(1, suggestion.confidence)) : 0,
          mappingReason: suggestion.reason || "Sugestão gerada pela IA com base no plano de contas desta empresa.",
        };
        if (ref.bucket === "entries") entries[ref.index] = mapped;
        else deferredEntries[ref.index] = mapped;
        aiSuggestionsCount += 1;
      }
    }

    if (usedRuleIds.size) {
      await Promise.all([...usedRuleIds].map(async (id) => {
        const current = learnedRules.find((rule) => rule.id === id);
        await admin.from("accounting_mapping_rules").update({
          times_used: (current?.times_used ?? 0) + 1,
          updated_at: new Date().toISOString(),
        }).eq("id", id);
      }));
    }

    const allRows = [...entries, ...deferredEntries];
    const unresolvedCount = allRows.filter((entry) => !hasCompleteMapping(entry)).length;
    const needsApprovalCount = allRows.filter((entry) => entry.mappingNeedsApproval && hasCompleteMapping(entry)).length;

    return json({
      entries,
      deferredEntries,
      learnedCount,
      predefinedCount,
      aiSuggestionsCount,
      unresolvedCount,
      needsApprovalCount,
      model,
      routing: unresolvedRefs.length
        ? "memória da empresa → regras pré-definidas → IA apenas nas pendências"
        : "memória da empresa → regras pré-definidas",
    });
  } catch (error) {
    console.error("resolve-accounting-mappings", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
