import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { consume, limited, requestKey } from "../_shared/rate-limit.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const prices: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-5.6-sol": { input: 5, cached: 0.5, output: 30 },
  "gpt-5.6": { input: 5, cached: 0.5, output: 30 },
  "gpt-5.6-terra": { input: 2, cached: 0.2, output: 12 },
  "gpt-5.6-luna": { input: 0.2, cached: 0.02, output: 1.2 },
};

const totalKeys = [
  "total_proventos", "total_descontos", "liquido",
  "adiantamento_proventos", "adiantamento_descontos",
  "folha_proventos", "folha_descontos",
  "ferias_proventos", "ferias_descontos",
  "decimo_proventos", "decimo_descontos",
  "rescisao_proventos", "rescisao_descontos",
  "inss_total", "fgts_total",
] as const;
const sections = ["adiantamento", "folha", "ferias", "decimo", "rescisao", "outro"] as const;
const kinds = ["provento", "desconto", "encargo"] as const;

type TotalKey = typeof totalKeys[number];
type Section = typeof sections[number];
type Kind = typeof kinds[number];
type Fact = {
  rubricCode: string;
  description: string;
  kind: Kind;
  section: Section;
  amountInCents: number;
  source: string;
  confidence: number;
  targetCompetence: string;
};
type Entry = {
  id: string;
  date: string;
  history: string;
  eventType: string;
  rubricCode: string;
  rubricDescription: string;
  kind: Kind;
  section: Section;
  debitCode: string;
  debitDescription: string;
  debitCostCenter: string;
  creditCode: string;
  creditDescription: string;
  creditCostCenter: string;
  amountInCents: number;
  source: string;
  confidence: number;
  targetCompetence?: string;
};
type DocumentTotal = { key: TotalKey; label: string; amountInCents: number; source: string };
type PayrollTranscriptionResult = { competence: string; totals: DocumentTotal[]; facts: Fact[]; warnings: string[] };

type Comparison = {
  key: TotalKey;
  label: string;
  documentAmountInCents: number;
  entriesAmountInCents: number;
  differenceInCents: number;
  source: string;
  blocking: boolean;
  note?: string;
};

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .trim()
  .toLowerCase();

const estimateCost = (model: string, usage: any) => {
  const price = prices[model];
  if (!price) return 0;
  const cached = Number(usage?.input_tokens_details?.cached_tokens ?? 0);
  const input = Math.max(0, Number(usage?.input_tokens ?? 0) - cached);
  return (input * price.input + cached * price.cached + Number(usage?.output_tokens ?? 0) * price.output) / 1_000_000;
};

const parseCompetence = (value: string) => {
  const match = /^(0[1-9]|1[0-2])\/(20\d{2})$/.exec(value);
  return match ? { month: Number(match[1]), year: Number(match[2]) } : null;
};

const lastDayOfCompetence = (competence: string) => {
  const parsed = parseCompetence(competence);
  return parsed ? new Date(parsed.year, parsed.month, 0).toLocaleDateString("pt-BR") : "";
};

function classifyEvent(fact: Fact) {
  const text = normalize(fact.description);
  if (fact.kind === "encargo" && text.includes("fgts")) return "fgts";
  if (text.includes("adiantamento") && text.includes("compens")) return "advance_compensation";
  if (fact.section === "adiantamento" && text.includes("adiantamento")) return "advance_payment";
  if (text.includes("pro labore")) return "prolabore";
  if (text.includes("inss")) return "inss";
  if (text.includes("irrf")) return "irrf";
  if (text.includes("plano") && text.includes("saude")) return "health_discount";
  if (text.includes("odonto")) return "dental_discount";
  if ((text.includes("vale") && text.includes("refeicao")) || text.includes("desconto vr")) return fact.kind === "desconto" ? "meal_discount" : "meal_earning";
  if (text.includes("hora extra")) return "overtime";
  if (fact.section === "ferias") return fact.kind === "desconto" ? "vacation_discount" : "vacation_earning";
  if (fact.section === "decimo") return fact.kind === "desconto" ? "thirteenth_discount" : "thirteenth_earning";
  if (fact.section === "rescisao") return fact.kind === "desconto" ? "severance_discount" : "severance_earning";
  return fact.kind === "desconto" ? "payroll_discount" : "salary_earning";
}

function historyFor(fact: Fact, competence: string) {
  const description = fact.description.trim().toLocaleUpperCase("pt-BR") || fact.rubricCode || "LANÇAMENTO DE FOLHA";
  if (fact.kind === "encargo") return `${description} A PAGAR MÊS ${competence}`;
  if (fact.kind === "desconto") return `${description} DESCONTO MÊS ${competence}`;
  return `${description} A PAGAR MÊS ${competence}`;
}

function factsToEntries(facts: Fact[], competence: string) {
  const entries: Entry[] = [];
  const issues: string[] = [];

  for (const fact of facts) {
    if (!Number.isInteger(fact.amountInCents) || fact.amountInCents <= 0) {
      issues.push(`${fact.description || fact.rubricCode}: valor inválido ou não literal.`);
      continue;
    }
    if (!fact.source?.trim()) issues.push(`${fact.description || fact.rubricCode}: evidência documental ausente.`);
    if (!Number.isFinite(fact.confidence) || fact.confidence < 0.8) issues.push(`${fact.description || fact.rubricCode}: leitura documental com confiança insuficiente.`);
    if (fact.targetCompetence && fact.targetCompetence !== competence) {
      issues.push(`${fact.description || fact.rubricCode}: a IA tentou mover a rubrica para ${fact.targetCompetence}; o lançamento foi mantido em ${competence}.`);
    }

    entries.push({
      id: crypto.randomUUID(),
      date: lastDayOfCompetence(competence),
      history: historyFor(fact, competence),
      eventType: classifyEvent(fact),
      rubricCode: String(fact.rubricCode || ""),
      rubricDescription: fact.description,
      kind: fact.kind,
      section: fact.section,
      debitCode: "",
      debitDescription: "",
      debitCostCenter: "",
      creditCode: "",
      creditDescription: "",
      creditCostCenter: "",
      amountInCents: fact.amountInCents,
      source: fact.source,
      confidence: fact.confidence,
    });
  }

  return { entries, issues: [...new Set(issues)] };
}

function sums(entries: Entry[]) {
  const sumWhere = (predicate: (entry: Entry) => boolean) => entries.filter(predicate).reduce((total, row) => total + row.amountInCents, 0);
  const proventos = (section?: Section) => sumWhere(row => row.kind === "provento" && (!section || row.section === section));
  const descontos = (section?: Section) => sumWhere(row => row.kind === "desconto" && (!section || row.section === section));
  const totalProventos = proventos();
  const totalDescontos = descontos();
  return {
    total_proventos: totalProventos,
    total_descontos: totalDescontos,
    liquido: totalProventos - totalDescontos,
    adiantamento_proventos: proventos("adiantamento"),
    adiantamento_descontos: descontos("adiantamento"),
    folha_proventos: proventos("folha"),
    folha_descontos: descontos("folha"),
    ferias_proventos: proventos("ferias"),
    ferias_descontos: descontos("ferias"),
    decimo_proventos: proventos("decimo"),
    decimo_descontos: descontos("decimo"),
    rescisao_proventos: proventos("rescisao"),
    rescisao_descontos: descontos("rescisao"),
    inss_total: sumWhere(row => row.eventType === "inss" && row.kind === "desconto"),
    fgts_total: sumWhere(row => row.eventType === "fgts" && row.kind === "encargo"),
  } satisfies Record<TotalKey, number>;
}

function validateReference(reference: ReferenceResult, requestedCompetence: string) {
  const issues: string[] = [];
  if (reference.competence !== requestedCompetence) issues.push(`A referência foi lida como ${reference.competence || "indefinida"}, mas a competência solicitada é ${requestedCompetence}.`);
  const byKey = new Map<TotalKey, number>();
  for (const total of reference.totals ?? []) {
    if (!Number.isInteger(total.amountInCents) || total.amountInCents < 0) issues.push(`${total.label}: valor de referência inválido.`);
    if (!total.source?.trim()) issues.push(`${total.label}: referência sem evidência documental.`);
    const previous = byKey.get(total.key);
    if (previous !== undefined && previous !== total.amountInCents) issues.push(`${total.label}: valores conflitantes para a mesma referência.`);
    byKey.set(total.key, total.amountInCents);
  }
  for (const key of ["total_proventos", "total_descontos", "liquido", "inss_total", "fgts_total"] as TotalKey[]) {
    if (!byKey.has(key)) issues.push(`Referência obrigatória ausente: ${key}.`);
  }
  const p = byKey.get("total_proventos");
  const d = byKey.get("total_descontos");
  const l = byKey.get("liquido");
  if (p !== undefined && d !== undefined && l !== undefined && p - d !== l) issues.push("O próprio documento não fecha: Total de Proventos - Total de Descontos difere do Líquido.");
  return { verified: issues.length === 0, issues: [...new Set(issues)] };
}

function compare(entries: Entry[], totals: DocumentTotal[], structural: string[]) {
  const calculated = sums(entries);
  const comparisons: Comparison[] = totals.map((total) => {
    const informational = total.key === "inss_total" || total.key === "liquido";
    const entriesAmountInCents = calculated[total.key];
    return {
      key: total.key,
      label: total.key === "inss_total"
        ? "INSS a recolher (informativo)"
        : total.key === "liquido"
          ? "Líquido do documento (informativo)"
          : total.label,
      documentAmountInCents: total.amountInCents,
      entriesAmountInCents,
      differenceInCents: entriesAmountInCents - total.amountInCents,
      source: total.source,
      blocking: !informational,
      note: total.key === "inss_total"
        ? "O Total a Recolher segue o calendário de recolhimento. A soma dos descontos INSS das rubricas é contabilizada integralmente na competência e pode ser diferente."
        : total.key === "liquido"
          ? "O líquido é preservado exatamente como impresso no documento. Ele é informativo e nunca é recalculado para forçar fechamento."
          : undefined,
    };
  });
  const issues = [...structural];
  comparisons
    .filter(row => row.blocking && row.differenceInCents !== 0)
    .forEach(row => issues.push(`${row.label}: diferença de ${(row.differenceInCents / 100).toFixed(2)}.`));
  return { comparisons, issues: [...new Set(issues)], passed: issues.length === 0 };
}

const actionableWarnings = (warnings: unknown[]) => warnings.map(String).filter((warning) => {
  const text = normalize(warning);
  return text && !text.includes("nao ha comprovante") && !text.includes("nao foram gerados lancamentos de pgto") && !text.includes("para evitar duplicidade");
});

const transcriptionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    competence: { type: "string" },
    totals: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      key: { type: "string", enum: totalKeys },
      label: { type: "string" },
      amountInCents: { type: "integer" },
      source: { type: "string" },
    }, required: ["key", "label", "amountInCents", "source"] } },
    facts: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      rubricCode: { type: "string" },
      description: { type: "string" },
      kind: { type: "string", enum: kinds },
      section: { type: "string", enum: sections },
      amountInCents: { type: "integer" },
      source: { type: "string" },
      confidence: { type: "number" },
      targetCompetence: { type: "string" },
    }, required: ["rubricCode", "description", "kind", "section", "amountInCents", "source", "confidence", "targetCompetence"] } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["competence", "totals", "facts", "warnings"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const startedAt = Date.now();
  let admin: any = null;
  let userId: string | null = null;
  let body: any = {};
  const primaryModel = Deno.env.get("OPENAI_ACCOUNTING_PAYROLL_MODEL") || "gpt-5.6-terra";

  const recordUsage = async (raw: any, status: "success" | "error", requestedModel: string, pass: string, metadata: Record<string, unknown> = {}) => {
    if (!admin) return;
    const usage = raw?.usage ?? {};
    const { error } = await admin.from("accounting_ai_usage").insert({
      created_by: userId,
      company_key: body.company_id ? String(body.company_id) : null,
      competence: body.competence ? String(body.competence) : null,
      module: body.module || "folha",
      provider: "openai",
      model: raw?.model || requestedModel,
      status,
      response_id: raw?.id ?? null,
      input_tokens: usage.input_tokens ?? 0,
      cached_input_tokens: usage.input_tokens_details?.cached_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      estimated_cost_usd: estimateCost(raw?.model || requestedModel, usage),
      latency_ms: Date.now() - startedAt,
      error_code: raw?.error?.code ?? raw?.error?.type ?? null,
      error_message: raw?.error?.message ?? null,
      request_metadata: { document_count: Array.isArray(body.documents) ? body.documents.length : 0, requested_model: requestedModel, pass, ...metadata },
    });
    if (error) console.error("Falha ao registrar telemetria", error);
  };

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const rate = await consume(admin, "accounting_ai", requestKey(req, user.id), 20, 600);
    if (limited(rate)) return limited(rate)!;
    userId = user.id;
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => ["admin", "fiscal", "contabil", "geral"].includes(row.role))) return json({ error: "Acesso negado" }, 403);

    body = await req.json();
    if (body.module !== "folha") return json({ error: "Módulo ainda não habilitado" }, 400);
    if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum documento" }, 400);
    const competence = String(body.competence || "");
    if (!parseCompetence(competence)) return json({ error: "Competência inválida" }, 422);
    if (!Array.isArray(body.chart_of_accounts) || !body.chart_of_accounts.length) return json({ error: "Importe o plano de contas da empresa antes de processar a folha." }, 422);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "A chave OPENAI_API_KEY ainda não foi configurada no Supabase." }, 503);

    const files = body.documents.map((document: any) => ({ type: "input_file", filename: document.name, file_data: `data:${document.mime_type};base64,${document.data}` }));
    const callOpenAI = async (model: string, instructions: string, text: string, schema: any, schemaName: string, maxOutputTokens: number, pass: string) => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          instructions,
          input: [{ role: "user", content: [{ type: "input_text", text }, ...files] }],
          text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
          max_output_tokens: maxOutputTokens,
        }),
        signal: AbortSignal.timeout(150_000),
      });
      const raw = await response.json();
      await recordUsage(raw, response.ok ? "success" : "error", model, pass);
      if (!response.ok) throw new Error(raw?.error?.message || "Falha na OpenAI");
      const outputText = raw.output_text || raw.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
      if (!outputText) throw new Error("A OpenAI concluiu a chamada sem saída estruturada.");
      try { return { parsed: JSON.parse(outputText), raw }; }
      catch { throw new Error("A resposta da IA não pôde ser validada como JSON estruturado."); }
    };

    const transcriptionInstructions = `Você é um TRANSCRITOR LITERAL de folha de pagamento brasileira para a competência ${competence}. Faça UMA ÚNICA leitura do documento e devolva, no mesmo resultado, as rubricas e os totais impressos.

REGRA CENTRAL: a Transcrição é a fonte de verdade. NÃO contabilize, NÃO escolha débito/crédito, NÃO invente conta, NÃO agrupe e NÃO ajuste valores para fazê-los fechar.

RUBRICAS:
1. Para cada linha monetária das seções Adiantamento de Folha, Folha de Pagamento, Férias, 13º Salário e Rescisão, copie rubricCode, descrição, kind, section e o valor EXATAMENTE da própria linha.
2. amountInCents deve ser cópia literal dos centavos impressos na mesma linha. É proibido somar, subtrair, ratear, completar ou trocar um valor por outro.
3. Não use demonstrativos auxiliares para substituir o valor da rubrica principal. Ex.: INSS de Férias deve vir da linha da rubrica de Férias, não do quadro de recolhimento.
4. Gere FGTS como encargo apenas quando existir valor explícito de FGTS/Total a Recolher no documento.
5. targetCompetence deve ser exatamente ${competence}. Não mova rubricas para outro mês.

TOTAIS:
6. No mesmo passe, copie literalmente os totais impressos: Total Geral de Proventos, Total Geral de Descontos, Líquido e, quando existirem, totais por seção, INSS a recolher e FGTS.
7. NÃO recalcule o Líquido. Se o documento imprimir um Líquido que não seja Proventos - Descontos, preserve o valor impresso exatamente e não tente corrigir.
8. source deve identificar a linha/seção de onde cada valor saiu.
9. Se uma linha estiver realmente ilegível, gere warning específico; nunca invente valor para fechar total.
10. Não faça uma segunda leitura e não proponha correções aritméticas.`;

    const transcriptionAttempt = await callOpenAI(
      primaryModel,
      transcriptionInstructions,
      "Transcreva literalmente uma única vez o documento: rubricas e totais impressos. Não contabilize.",
      transcriptionSchema,
      "payroll_literal_transcription",
      16000,
      "literal_transcription"
    );

    const transcription = transcriptionAttempt.parsed as PayrollTranscriptionResult;
    const reference: ReferenceResult = {
      competence: transcription.competence,
      totals: transcription.totals ?? [],
      warnings: transcription.warnings ?? [],
    };
    const referenceValidation = validateReference(reference, competence);
    const normalized = factsToEntries(transcription.facts ?? [], competence);
    const validation = compare(normalized.entries, reference.totals ?? [], [...referenceValidation.issues, ...normalized.issues]);

    const warnings = [...new Set(actionableWarnings(transcription.warnings ?? []))];
    const validationIssues = [...new Set([...validation.issues, ...(warnings.length ? ["Existem linhas da transcrição que exigem revisão humana antes da exportação."] : [])])];
    const validated = referenceValidation.verified && validation.passed && warnings.length === 0;

    return json({
      entries: normalized.entries,
      deferredEntries: [],
      documentTotals: reference.totals,
      comparisons: validation.comparisons,
      validationIssues,
      warnings,
      referenceVerified: referenceValidation.verified,
      validated,
      model: primaryModel,
      primaryModel,
      reviewed: false,
      reviewModel: null,
      routing: "single-literal-transcription -> deterministic-accounting-mapping",
      transcription_response_id: transcriptionAttempt.raw.id,
    });
  } catch (error) {
    console.error("process-accounting-document", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
