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
  "gpt-5.6-sol": { input: 5, cached: 0.5, output: 30 },
  "gpt-5.6": { input: 5, cached: 0.5, output: 30 },
  "gpt-5.6-terra": { input: 2, cached: 0.2, output: 12 },
  "gpt-5.6-luna": { input: 0.2, cached: 0.02, output: 1.2 },
};
const estimateCost = (model: string, usage: any) => {
  const price = prices[model];
  if (!price) return 0;
  const cached = Number(usage?.input_tokens_details?.cached_tokens ?? 0);
  const input = Math.max(0, Number(usage?.input_tokens ?? 0) - cached);
  return (input * price.input + cached * price.cached + Number(usage?.output_tokens ?? 0) * price.output) / 1_000_000;
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const startedAt = Date.now();
  let admin: any = null;
  let userId: string | null = null;
  let body: any = {};
  const model = Deno.env.get("OPENAI_ACCOUNTING_MODEL") || "gpt-5.6-terra";
  const recordUsage = async (raw: any, status: "success" | "error") => {
    if (!admin) return;
    const usage = raw?.usage ?? {};
    const { error } = await admin.from("accounting_ai_usage").insert({
      created_by: userId, company_key: body.company_id ? String(body.company_id) : null,
      competence: body.competence ? String(body.competence) : null, module: body.module || "folha",
      provider: "openai", model: raw?.model || model, status, response_id: raw?.id ?? null,
      input_tokens: usage.input_tokens ?? 0, cached_input_tokens: usage.input_tokens_details?.cached_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0, total_tokens: usage.total_tokens ?? 0,
      estimated_cost_usd: estimateCost(raw?.model || model, usage), latency_ms: Date.now() - startedAt,
      error_code: raw?.error?.code ?? raw?.error?.type ?? null, error_message: raw?.error?.message ?? null,
      request_metadata: { document_count: Array.isArray(body.documents) ? body.documents.length : 0 },
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
    if (body.module !== "folha") return json({ error: "Módulo ainda não habilitado" }, 400);
    if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum documento" }, 400);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "A chave OPENAI_API_KEY ainda não foi configurada no Supabase." }, 503);

    const accounts = new Map((body.chart_of_accounts ?? []).map((account: any) => [String(account.reducedCode), String(account.description)]));
    const fileInputs = body.documents.map((document: any) => ({ type: "input_file", filename: document.name, file_data: `data:${document.mime_type};base64,${document.data}` }));
    const prompt = `Você é um motor contábil brasileiro especializado em folha de pagamento. Extraia somente fatos presentes nos documentos da competência ${body.competence}.
Regras obrigatórias:
1. Retorne lançamentos de provisão/apuração da folha, férias, 13º, pró-labore, INSS, IRRF e FGTS quando existirem.
2. Nunca crie pagamento, banco ou caixa apenas porque existe uma obrigação. Só gere histórico iniciado por PGTO quando o próprio documento comprovar o pagamento.
3. Para FGTS, registre a constituição D despesa de FGTS / C FGTS a recolher. Não duplique como recolhimento.
4. Use exclusivamente C.R.s presentes no plano de contas fornecido. Se uma conta necessária não puder ser identificada, deixe o C.R. vazio e explique em warnings.
5. Preserve centavos exatamente. Não arredonde, estime, compense ou invente valores.
6. Histórico deve descrever o fato contábil, em português e em caixa alta.
7. Não misture INSS de empregados, pró-labore, férias ou 13º quando o documento permitir separá-los.
Plano da empresa: ${JSON.stringify(body.chart_of_accounts)}.`;
    const schema = { type: "object", additionalProperties: false, properties: {
      entries: { type: "array", items: { type: "object", additionalProperties: false, properties: {
        date: { type: "string" }, history: { type: "string" }, debitCode: { type: "string" }, debitDescription: { type: "string" },
        debitCostCenter: { type: "string" }, creditCode: { type: "string" }, creditDescription: { type: "string" },
        creditCostCenter: { type: "string" }, amountInCents: { type: "integer" }, source: { type: "string" }, confidence: { type: "number" },
      }, required: ["date", "history", "debitCode", "debitDescription", "debitCostCenter", "creditCode", "creditDescription", "creditCostCenter", "amountInCents", "source", "confidence"] } },
      warnings: { type: "array", items: { type: "string" } },
    }, required: ["entries", "warnings"] };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, instructions: prompt,
        input: [{ role: "user", content: [{ type: "input_text", text: "Leia os documentos e gere os lançamentos estruturados da folha." }, ...fileInputs] }],
        text: { format: { type: "json_schema", name: "payroll_entries", strict: true, schema } },
      }),
    });
    const raw = await response.json();
    if (!response.ok) {
      console.error("OpenAI accounting error", { status: response.status, code: raw?.error?.code, type: raw?.error?.type, message: raw?.error?.message });
      await recordUsage(raw, "error");
      return json({ error: raw?.error?.message || "Falha na OpenAI", code: raw?.error?.code || raw?.error?.type || null }, 502);
    }

    await recordUsage(raw, "success");
    const outputText = raw.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
    if (!outputText) return json({ error: "Resposta vazia da IA" }, 502);
    const parsed = JSON.parse(outputText);
    const warnings = [...(parsed.warnings ?? [])];
    const entries = (parsed.entries ?? []).map((entry: any, index: number) => {
      const debit = accounts.get(String(entry.debitCode));
      const credit = accounts.get(String(entry.creditCode));
      if (!debit || !credit) warnings.push(`Linha ${index + 1}: C.R. não localizado no plano da empresa.`);
      return { ...entry, id: crypto.randomUUID(), debitDescription: debit || "", creditDescription: credit || "", amountInCents: Math.trunc(entry.amountInCents) };
    });
    return json({ entries, warnings, model: raw.model, response_id: raw.id });
  } catch (error) {
    console.error("process-accounting-document", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
