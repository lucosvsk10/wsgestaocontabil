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

const prices: Record<string, { input: number; cached: number; output: number }> = {
  "gpt-5.6-terra": { input: 2, cached: 0.2, output: 12 },
  "gpt-5.6-luna": { input: 0.2, cached: 0.02, output: 1.2 },
  "gpt-5.6-sol": { input: 5, cached: 0.5, output: 30 },
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

type PurchaseItem = {
  entryNumber: string;
  supplier: string;
  amountInCents: number;
  entryDate: string;
  emissionDate: string;
  situation: string;
  source: string;
  confidence: number;
};

type Reference = {
  competence: string;
  quantity: number;
  totalAmountInCents: number;
  source: string;
  warnings: string[];
};

type ItemsResult = { items: PurchaseItem[]; warnings: string[] };

const referenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    competence: { type: "string" },
    quantity: { type: "integer" },
    totalAmountInCents: { type: "integer" },
    source: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["competence", "quantity", "totalAmountInCents", "source", "warnings"],
};

const itemsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          entryNumber: { type: "string" },
          supplier: { type: "string" },
          amountInCents: { type: "integer" },
          entryDate: { type: "string" },
          emissionDate: { type: "string" },
          situation: { type: "string" },
          source: { type: "string" },
          confidence: { type: "number" },
        },
        required: ["entryNumber", "supplier", "amountInCents", "entryDate", "emissionDate", "situation", "source", "confidence"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["items", "warnings"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const startedAt = Date.now();
  let admin: any = null;
  let userId: string | null = null;
  let body: any = {};
  const model = Deno.env.get("OPENAI_ACCOUNTING_PURCHASES_MODEL") || "gpt-5.6-terra";

  const recordUsage = async (raw: any, status: "success" | "error", pass: string) => {
    if (!admin) return;
    const usage = raw?.usage ?? {};
    const { error } = await admin.from("accounting_ai_usage").insert({
      created_by: userId,
      company_key: body.company_id ? String(body.company_id) : null,
      competence: body.competence ? String(body.competence) : null,
      module: "compras",
      provider: "openai",
      model: raw?.model || model,
      status,
      response_id: raw?.id ?? null,
      input_tokens: usage.input_tokens ?? 0,
      cached_input_tokens: usage.input_tokens_details?.cached_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      estimated_cost_usd: estimateCost(raw?.model || model, usage),
      latency_ms: Date.now() - startedAt,
      error_code: raw?.error?.code ?? raw?.error?.type ?? null,
      error_message: raw?.error?.message ?? null,
      request_metadata: { pass, document_count: Array.isArray(body.documents) ? body.documents.length : 0 },
    });
    if (error) console.error("Falha ao registrar telemetria", error);
  };

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    userId = user.id;
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => ["admin", "fiscal", "contabil", "geral"].includes(row.role))) return json({ error: "Acesso negado" }, 403);

    body = await req.json();
    const competence = String(body.competence || "");
    if (!parseCompetence(competence)) return json({ error: "Competência inválida" }, 422);
    if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum documento" }, 400);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "A chave OPENAI_API_KEY ainda não foi configurada no Supabase." }, 503);

    const files = body.documents.map((document: any) => ({
      type: "input_file",
      filename: document.name,
      file_data: `data:${document.mime_type};base64,${document.data}`,
    }));

    const callOpenAI = async (instructions: string, prompt: string, schema: any, schemaName: string, maxOutputTokens: number, pass: string) => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          instructions,
          input: [{ role: "user", content: [{ type: "input_text", text: prompt }, ...files] }],
          text: { format: { type: "json_schema", name: schemaName, strict: true, schema } },
          max_output_tokens: maxOutputTokens,
        }),
        signal: AbortSignal.timeout(120_000),
      });
      const raw = await response.json();
      await recordUsage(raw, response.ok ? "success" : "error", pass);
      if (!response.ok) throw new Error(raw?.error?.message || "Falha na OpenAI");
      const outputText = raw.output_text || raw.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
      if (!outputText) throw new Error("A OpenAI concluiu a chamada sem saída estruturada.");
      return { parsed: JSON.parse(outputText), raw };
    };

    const referenceInstructions = `Você é um auditor documental de relatórios brasileiros de Entrada de Mercadoria. Leia SOMENTE as referências explícitas do documento da competência ${competence}.
Extraia a linha/cabeçalho "Quantidade de entradas" e "Valor Total" exatamente como impressos. Preserve centavos literalmente. competence deve representar o mês/ano das DATAS DE EMISSÃO dos documentos, nunca a data em que o relatório foi gerado e nunca uma coluna "Data da entrada" que esteja preenchida com uma data operacional posterior.
Não gere lançamentos, não escolha contas e não faça contas para ajustar valores. source deve identificar a área do relatório usada. warnings somente para ambiguidade real.`;

    const itemsInstructions = `Você é um TRANSCRITOR FACTUAL de um Relatório de Entrada de Mercadoria da competência ${competence}. Copie UMA linha por entrada do relatório.
Para cada linha, copie literalmente: número/Entrada, Fornecedor, Valor Total, Data da entrada, Data Emissão e Situação. amountInCents é o valor literal daquela MESMA linha. Não some, não agrupe, não corrija e não altere centavos.
A competência contábil é determinada pela Data Emissão. A coluna Data da entrada pode conter uma data operacional posterior e deve ser apenas transcrita, nunca usada para mover a competência.
Não gere débito, crédito, C.R., histórico contábil, pagamento ou fornecedor contábil individual. source deve indicar a linha/entrada. confidence de 0 a 1; warning se uma linha não puder ser lida com segurança.`;

    const [referenceAttempt, itemsAttempt] = await Promise.all([
      callOpenAI(referenceInstructions, "Extraia somente Quantidade de entradas, Valor Total e competência documental.", referenceSchema, "purchase_reference", 2200, "reference"),
      callOpenAI(itemsInstructions, "Transcreva todas as entradas do relatório sem contabilizá-las.", itemsSchema, "purchase_items", 8000, "items"),
    ]);

    const reference = referenceAttempt.parsed as Reference;
    const itemsResult = itemsAttempt.parsed as ItemsResult;
    const issues: string[] = [];
    const warnings = [...new Set([...(reference.warnings ?? []), ...(itemsResult.warnings ?? [])].map(String).filter(Boolean))];

    if (reference.competence !== competence) issues.push(`O documento foi lido como ${reference.competence || "competência indefinida"}, mas a tela está em ${competence}.`);
    if (!Number.isInteger(reference.quantity) || reference.quantity < 0) issues.push("Quantidade de entradas inválida no documento original.");
    if (!Number.isInteger(reference.totalAmountInCents) || reference.totalAmountInCents < 0) issues.push("Valor Total inválido no documento original.");

    const items = (itemsResult.items ?? []).map((item, index) => ({ ...item, id: `${String(item.entryNumber || index)}-${index}` }));
    for (const item of items) {
      if (!Number.isInteger(item.amountInCents) || item.amountInCents <= 0) issues.push(`Entrada ${item.entryNumber || "sem número"}: valor inválido.`);
      if (!item.source?.trim()) issues.push(`Entrada ${item.entryNumber || "sem número"}: evidência documental ausente.`);
      if (!Number.isFinite(item.confidence) || item.confidence < 0.8) issues.push(`Entrada ${item.entryNumber || "sem número"}: leitura com confiança insuficiente.`);
      const emission = String(item.emissionDate || "").match(/^(\d{2})\/(\d{2})\/(20\d{2})$/);
      if (emission && `${emission[2]}/${emission[3]}` !== competence) issues.push(`Entrada ${item.entryNumber}: Data Emissão ${item.emissionDate} está fora de ${competence}.`);
    }

    const extractedQuantity = items.length;
    const extractedTotal = items.reduce((sum, item) => sum + item.amountInCents, 0);
    const quantityDifference = extractedQuantity - reference.quantity;
    const totalDifference = extractedTotal - reference.totalAmountInCents;
    if (quantityDifference !== 0) issues.push(`Quantidade de entradas: diferença de ${quantityDifference}.`);
    if (totalDifference !== 0) issues.push(`Valor Total: diferença de ${(totalDifference / 100).toFixed(2)}.`);

    const entries = reference.quantity === 0 && reference.totalAmountInCents === 0 ? [] : [{
      id: crypto.randomUUID(),
      date: lastDayOfCompetence(competence),
      history: "MERCADORIA PRA REVENDA (COMPRAS)",
      eventType: "merchandise_purchase",
      rubricCode: "COMPRAS_MERCADORIA_REVENDA",
      rubricDescription: "MERCADORIA PRA REVENDA (COMPRAS)",
      kind: "compra",
      section: "compras",
      debitCode: "",
      debitDescription: "",
      debitCostCenter: "",
      creditCode: "",
      creditDescription: "",
      creditCostCenter: "",
      amountInCents: reference.totalAmountInCents,
      source: reference.source,
      confidence: 1,
    }];

    const comparisons = [
      {
        key: "quantity",
        label: "Quantidade de entradas",
        documentValue: reference.quantity,
        extractedValue: extractedQuantity,
        difference: quantityDifference,
        format: "number",
        source: reference.source,
        blocking: true,
      },
      {
        key: "document_total",
        label: "Valor Total",
        documentValue: reference.totalAmountInCents,
        extractedValue: extractedTotal,
        difference: totalDifference,
        format: "currency",
        source: reference.source,
        blocking: true,
      },
      {
        key: "launch_total",
        label: "Lançamento consolidado",
        documentValue: reference.totalAmountInCents,
        extractedValue: entries.reduce((sum, entry) => sum + entry.amountInCents, 0),
        difference: entries.reduce((sum, entry) => sum + entry.amountInCents, 0) - reference.totalAmountInCents,
        format: "currency",
        source: "Consolidação mensal das entradas",
        blocking: true,
        note: "Um único lançamento no último dia da competência, somando todas as entradas do mês.",
      },
    ];

    return json({
      items,
      reference: { competence, quantity: reference.quantity, totalAmountInCents: reference.totalAmountInCents, source: reference.source },
      entries,
      comparisons,
      warnings,
      validationIssues: [...new Set(issues)],
      referenceVerified: issues.length === 0,
      validated: issues.length === 0 && warnings.length === 0,
      model,
      primaryModel: model,
      reviewed: false,
      reviewModel: null,
      routing: "terra-reference + terra-purchase-items-literal + deterministic-monthly-consolidation",
      reference_response_id: referenceAttempt.raw.id,
      items_response_id: itemsAttempt.raw.id,
    });
  } catch (error) {
    console.error("process-purchases-document", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
