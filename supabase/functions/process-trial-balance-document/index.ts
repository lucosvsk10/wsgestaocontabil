import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const validCompetence = (value: string) => /^(0[1-9]|1[0-2])\/(20\d{2})$/.test(value);

type Nature = "D" | "C" | "";
type Row = {
  accountCode: string;
  title: string;
  reducedCode: string;
  previousBalanceInCents: number;
  previousNature: Nature;
  previousBalanceRead: boolean;
  debitInCents: number;
  creditInCents: number;
  currentBalanceInCents: number;
  currentNature: Nature;
  source: string;
  confidence: number;
};

type Extraction = {
  periodStartCompetence: string;
  periodEndCompetence: string;
  competence: string;
  companyName: string;
  rows: Row[];
  warnings: string[];
};

const rowSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    accountCode: { type: "string" },
    title: { type: "string" },
    reducedCode: { type: "string" },
    previousBalanceInCents: { type: "integer" },
    previousNature: { type: "string", enum: ["D", "C", ""] },
    previousBalanceRead: { type: "boolean" },
    debitInCents: { type: "integer" },
    creditInCents: { type: "integer" },
    currentBalanceInCents: { type: "integer" },
    currentNature: { type: "string", enum: ["D", "C", ""] },
    source: { type: "string" },
    confidence: { type: "number" },
  },
  required: ["accountCode", "title", "reducedCode", "previousBalanceInCents", "previousNature", "previousBalanceRead", "debitInCents", "creditInCents", "currentBalanceInCents", "currentNature", "source", "confidence"],
};

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    periodStartCompetence: { type: "string" },
    periodEndCompetence: { type: "string" },
    competence: { type: "string" },
    companyName: { type: "string" },
    rows: { type: "array", items: rowSchema },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["periodStartCompetence", "periodEndCompetence", "competence", "companyName", "rows", "warnings"],
};

function signed(amount: number, nature: Nature) {
  if (!amount || !nature) return 0;
  return nature === "D" ? amount : -amount;
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const startedAt = Date.now();
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: { role: string }) => ["admin", "fiscal", "contabil", "geral"].includes(row.role))) return json({ error: "Acesso negado" }, 403);

    const body = await req.json();
    if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum balancete foi enviado" }, 400);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 503);
    const model = Deno.env.get("OPENAI_ACCOUNTING_TRIAL_BALANCE_MODEL") || "gpt-5.6-terra";

    const files = body.documents.map((document: { name: string; mime_type: string; data: string }) => ({
      type: "input_file",
      filename: document.name,
      file_data: `data:${document.mime_type};base64,${document.data}`,
    }));

    const instructions = `Você é um transcritor contábil especializado em Balancete Acumulado Analítico do Calima. Leia o documento inteiro e preserve a ordem das linhas.

O cabeçalho típico contém: CONTA | TÍTULO | C.R. | SALDO ANT | DÉBITO | CRÉDITO | SALDO ATUAL.

REGRAS ABSOLUTAS:
1. Extraia UMA linha para cada linha contábil real, incluindo grupos, subgrupos e contas analíticas.
2. accountCode é o código estruturado. reducedCode é exatamente o C.R. exibido.
3. Valores monetários viram centavos inteiros: 2.473.222,33 => 247322233.
4. SALDO ANT É OBRIGATÓRIO. Leia literalmente a coluna SALDO ANT de CADA linha, antes de ler débito/crédito. Nunca substitua um valor ilegível por zero.
5. previousBalanceRead=true SOMENTE quando você localizou visualmente/textualmente a célula SALDO ANT daquela linha. Se a célula mostra literalmente 0,00, use previousBalanceInCents=0, previousNature="" e previousBalanceRead=true. Se você não conseguiu localizar/ler a célula, use previousBalanceInCents=0, previousNature="" e previousBalanceRead=false.
6. SALDO ANT e SALDO ATUAL usam valor absoluto em centavos e natureza separada D/C. Zero literal usa natureza vazia.
7. DÉBITO e CRÉDITO são sempre valores positivos em centavos.
8. Não invente, não rateie e não altere nenhum valor para fazer a aritmética fechar.
9. Leia o campo Ref. do documento. Se for uma competência única, periodStartCompetence=periodEndCompetence=competence. Se for intervalo 01/2024 a 12/2024, start=01/2024, end=12/2024 e competence=12/2024.
10. IGNORE nome do arquivo e data de emissão para descobrir competência.
11. source deve identificar página e linha/conta.
12. confidence de 0 a 1. Warning somente para ambiguidade documental real.
13. Antes de concluir, faça uma segunda varredura específica na coluna SALDO ANT e confirme que cada previousBalanceRead corresponde a uma célula realmente encontrada.`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        instructions,
        input: [{ role: "user", content: [{ type: "input_text", text: "Transcreva integralmente este Balancete do Calima. Dê prioridade especial à coluna SALDO ANT e confirme cada célula antes de retornar." }, ...files] }],
        text: { format: { type: "json_schema", name: "trial_balance", strict: true, schema: extractionSchema } },
        max_output_tokens: 20000,
      }),
      signal: AbortSignal.timeout(180000),
    });

    const raw = await response.json();
    const usage = raw?.usage ?? {};
    await admin.from("accounting_ai_usage").insert({
      created_by: user.id,
      company_key: String(body.company_id || ""),
      competence: null,
      module: "balancete",
      provider: "openai",
      model: raw?.model || model,
      status: response.ok ? "success" : "error",
      response_id: raw?.id ?? null,
      input_tokens: usage.input_tokens ?? 0,
      cached_input_tokens: usage.input_tokens_details?.cached_tokens ?? 0,
      output_tokens: usage.output_tokens ?? 0,
      total_tokens: usage.total_tokens ?? 0,
      estimated_cost_usd: 0,
      latency_ms: Date.now() - startedAt,
      error_code: raw?.error?.code ?? null,
      error_message: raw?.error?.message ?? null,
      request_metadata: { document_count: body.documents.length, previous_balance_required: true },
    });

    if (!response.ok) throw new Error(raw?.error?.message || "Falha ao ler o balancete");
    const output = raw.output_text || raw.output?.flatMap((item: { content?: Array<{ type?: string; text?: string }> }) => item.content ?? []).find((item: { type?: string }) => item.type === "output_text")?.text;
    if (!output) throw new Error("A IA não devolveu o balancete estruturado.");
    const extraction = JSON.parse(output) as Extraction;

    const issues: string[] = [];
    if (!validCompetence(extraction.competence) || !validCompetence(extraction.periodStartCompetence) || !validCompetence(extraction.periodEndCompetence)) issues.push("Período/competência inválido no documento.");
    if (!extraction.rows.length) issues.push("Nenhuma linha contábil foi identificada no balancete.");

    let previousReadCount = 0;
    const rows = extraction.rows.map((row, index) => {
      if (row.previousBalanceRead) previousReadCount += 1;
      else issues.push(`${row.accountCode || row.title || `linha ${index + 1}`}: SALDO ANT não foi lido no documento.`);

      const previous = signed(row.previousBalanceInCents, row.previousNature);
      const expected = previous + row.debitInCents - row.creditInCents;
      const current = signed(row.currentBalanceInCents, row.currentNature);
      const difference = current - expected;
      if (Math.abs(difference) > 1) issues.push(`${row.accountCode || row.title || `linha ${index + 1}`}: saldo não fecha por R$ ${(difference / 100).toFixed(2)}.`);
      if (row.confidence < 0.8) issues.push(`${row.accountCode || row.title || `linha ${index + 1}`}: leitura com confiança insuficiente.`);
      if (!row.accountCode || !row.title || !row.reducedCode) issues.push(`Linha ${index + 1}: conta, título ou C.R. ausente.`);
      return { ...row, id: `${row.accountCode}-${row.reducedCode}-${index}` };
    });

    if (rows.length && previousReadCount !== rows.length) issues.push(`Leitura incompleta do SALDO ANT: ${previousReadCount} de ${rows.length} linhas confirmadas.`);

    return json({
      competence: extraction.competence,
      periodStartCompetence: extraction.periodStartCompetence,
      periodEndCompetence: extraction.periodEndCompetence,
      companyName: extraction.companyName,
      rows,
      previousBalanceVerified: rows.length > 0 && previousReadCount === rows.length,
      previousBalanceReadCount: previousReadCount,
      warnings: extraction.warnings ?? [],
      validationIssues: [...new Set(issues)],
      validated: issues.length === 0 && (extraction.warnings ?? []).length === 0,
      processingMeta: { model: raw?.model || model, routing: "terra-full-trial-balance-transcription + explicit-previous-balance-verification + deterministic-balance-validation" },
    });
  } catch (error) {
    console.error("process-trial-balance-document", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
