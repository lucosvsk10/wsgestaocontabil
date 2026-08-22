import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const parseCompetence = (value: string) => /^(0[1-9]|1[0-2])\/(20\d{2})$/.test(value);
const lastDay = (competence: string) => { const [m,y] = competence.split("/").map(Number); return new Date(y,m,0).toLocaleDateString("pt-BR"); };

const schema = {
  type: "object", additionalProperties: false,
  properties: {
    competence: { type: "string" },
    serviceAmountInCents: { type: "integer" },
    merchandiseAmountInCents: { type: "integer" },
    totalAmountInCents: { type: "integer" },
    pgdasAmountInCents: { type: "integer" },
    hasService: { type: "boolean" },
    hasMerchandise: { type: "boolean" },
    hasPgdas: { type: "boolean" },
    source: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["competence","serviceAmountInCents","merchandiseAmountInCents","totalAmountInCents","pgdasAmountInCents","hasService","hasMerchandise","hasPgdas","source","warnings"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => ["admin","fiscal","contabil","geral"].includes(r.role))) return json({ error: "Acesso negado" }, 403);

    const body = await req.json();
    const competence = String(body.competence || "");
    if (!parseCompetence(competence)) return json({ error: "Competência inválida" }, 422);
    if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum documento" }, 400);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 503);
    const model = Deno.env.get("OPENAI_ACCOUNTING_REVENUE_MODEL") || "gpt-5.6-terra";
    const files = body.documents.map((d: any) => ({ type: "input_file", filename: d.name, file_data: `data:${d.mime_type};base64,${d.data}` }));

    const call = async (pass: string, instructions: string) => {
      const started = Date.now();
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          instructions,
          input: [{ role: "user", content: [{ type: "input_text", text: `Leia somente a linha da competência ${competence}.` }, ...files] }],
          text: { format: { type: "json_schema", name: `revenue_${pass}`, strict: true, schema } },
          max_output_tokens: 3000,
        }),
        signal: AbortSignal.timeout(120000),
      });
      const raw = await response.json();
      const usage = raw?.usage ?? {};
      await admin.from("accounting_ai_usage").insert({
        created_by: user.id, company_key: String(body.company_id || ""), competence, module: "faturamento", provider: "openai",
        model: raw?.model || model, status: response.ok ? "success" : "error", response_id: raw?.id ?? null,
        input_tokens: usage.input_tokens ?? 0, cached_input_tokens: usage.input_tokens_details?.cached_tokens ?? 0,
        output_tokens: usage.output_tokens ?? 0, total_tokens: usage.total_tokens ?? 0,
        estimated_cost_usd: 0, latency_ms: Date.now() - started,
        error_code: raw?.error?.code ?? null, error_message: raw?.error?.message ?? null,
        request_metadata: { pass, document_count: body.documents.length },
      });
      if (!response.ok) throw new Error(raw?.error?.message || "Falha na IA");
      const text = raw.output_text || raw.output?.flatMap((i: any) => i.content ?? []).find((i: any) => i.type === "output_text")?.text;
      if (!text) throw new Error("A IA não devolveu saída estruturada.");
      return JSON.parse(text);
    };

    const baseInstructions = `Você é um auditor documental de faturamento. O documento pode resumir um ano inteiro. Extraia SOMENTE a linha da competência ${competence}.
Campos esperados: NFS/serviços, NF-e PJ Mod.55/revenda de mercadorias, TOTAL FATURADO e DAS/PGDAS.
REGRA ABSOLUTA: copie os valores exatamente como impressos, em centavos. Não invente, não rateie, não complete e não use totais anuais.
Se a célula de NF-e da competência estiver vazia, hasMerchandise=false e merchandiseAmountInCents=0. Se a célula DAS/PGDAS estiver vazia, hasPgdas=false e pgdasAmountInCents=0. O mesmo vale para serviços.
competence deve ser exatamente ${competence}. source deve indicar a linha/mês usada. warnings somente para ambiguidade real.`;

    const [reference, facts] = await Promise.all([
      call("reference", `${baseInstructions}\nFaça uma leitura independente apenas como referência documental.`),
      call("facts", `${baseInstructions}\nFaça uma segunda leitura independente da mesma linha.`),
    ]);

    const warnings = [...new Set([...(reference.warnings ?? []), ...(facts.warnings ?? [])].map(String).filter(Boolean))];
    const issues: string[] = [];
    if (reference.competence !== competence || facts.competence !== competence) issues.push("A competência lida não coincide com a competência selecionada.");
    const keys = ["serviceAmountInCents","merchandiseAmountInCents","totalAmountInCents","pgdasAmountInCents"] as const;
    for (const key of keys) if (Number(reference[key]) !== Number(facts[key])) issues.push(`${key}: as duas leituras independentes divergiram.`);
    if (facts.serviceAmountInCents + facts.merchandiseAmountInCents !== facts.totalAmountInCents) issues.push("NFS + NF-e não fecha com o Total Faturado do documento.");

    const date = lastDay(competence);
    const entries: any[] = [];
    if (facts.hasService && facts.serviceAmountInCents > 0) entries.push({ id: crypto.randomUUID(), date, history: "FATURAMENTO PRESTAÇÃO DE SERVIÇOS", eventType: "service_revenue", rubricCode: "FATURAMENTO_SERVICOS", rubricDescription: "FATURAMENTO PRESTAÇÃO DE SERVIÇOS", kind: "receita", section: "faturamento", debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "", amountInCents: facts.serviceAmountInCents, source: facts.source, confidence: 1 });
    if (facts.hasMerchandise && facts.merchandiseAmountInCents > 0) entries.push({ id: crypto.randomUUID(), date, history: "FATURAMENTO REVENDA DE MERCADORIAS", eventType: "merchandise_revenue", rubricCode: "FATURAMENTO_REVENDA", rubricDescription: "FATURAMENTO REVENDA DE MERCADORIAS", kind: "receita", section: "faturamento", debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "", amountInCents: facts.merchandiseAmountInCents, source: facts.source, confidence: 1 });
    if (facts.hasPgdas && facts.pgdasAmountInCents > 0) entries.push({ id: crypto.randomUUID(), date, history: "APURAÇÃO PGDAS", eventType: "pgdas", rubricCode: "APURACAO_PGDAS", rubricDescription: "APURAÇÃO PGDAS", kind: "tributo", section: "faturamento", debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "", amountInCents: facts.pgdasAmountInCents, source: facts.source, confidence: 1 });

    const byType = (eventType: string) => entries.filter(e => e.eventType === eventType).reduce((s,e) => s + e.amountInCents, 0);
    const comparisons = [
      { key: "services", label: "NFS · Prestação de serviços", documentAmountInCents: reference.serviceAmountInCents, entriesAmountInCents: byType("service_revenue"), differenceInCents: byType("service_revenue") - reference.serviceAmountInCents, source: reference.source, blocking: true },
      { key: "merchandise", label: "NF-e · Revenda de mercadorias", documentAmountInCents: reference.merchandiseAmountInCents, entriesAmountInCents: byType("merchandise_revenue"), differenceInCents: byType("merchandise_revenue") - reference.merchandiseAmountInCents, source: reference.source, blocking: true },
      { key: "total", label: "Total faturado", documentAmountInCents: reference.totalAmountInCents, entriesAmountInCents: byType("service_revenue") + byType("merchandise_revenue"), differenceInCents: byType("service_revenue") + byType("merchandise_revenue") - reference.totalAmountInCents, source: reference.source, blocking: true },
      { key: "pgdas", label: "DAS / PGDAS", documentAmountInCents: reference.pgdasAmountInCents, entriesAmountInCents: byType("pgdas"), differenceInCents: byType("pgdas") - reference.pgdasAmountInCents, source: reference.source, blocking: reference.hasPgdas },
    ];
    if (comparisons.some(c => c.blocking && c.differenceInCents !== 0)) issues.push("Os lançamentos não reconciliaram com as referências independentes do documento.");

    return json({
      reference: { competence, serviceAmountInCents: reference.serviceAmountInCents, merchandiseAmountInCents: reference.merchandiseAmountInCents, totalAmountInCents: reference.totalAmountInCents, pgdasAmountInCents: reference.pgdasAmountInCents, hasService: reference.hasService, hasMerchandise: reference.hasMerchandise, hasPgdas: reference.hasPgdas, source: reference.source },
      entries, comparisons, warnings, validationIssues: [...new Set(issues)], referenceVerified: issues.length === 0,
      validated: issues.length === 0 && warnings.length === 0, model, primaryModel: model, reviewed: false, reviewModel: null,
      routing: "terra-reference + terra-revenue-row-literal + deterministic-max-3-entries",
    });
  } catch (error) {
    console.error("process-revenue-document", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
