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

type Block = {
  position: number;
  label: string;
  serviceAmountInCents: number;
  merchandiseAmountInCents: number;
  totalAmountInCents: number;
  pgdasAmountInCents: number;
  hasService: boolean;
  hasMerchandise: boolean;
  hasPgdas: boolean;
  source: string;
};

type Extraction = { blocks: Block[]; warnings: string[] };

const blockSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    position: { type: "integer" },
    label: { type: "string" },
    serviceAmountInCents: { type: "integer" },
    merchandiseAmountInCents: { type: "integer" },
    totalAmountInCents: { type: "integer" },
    pgdasAmountInCents: { type: "integer" },
    hasService: { type: "boolean" },
    hasMerchandise: { type: "boolean" },
    hasPgdas: { type: "boolean" },
    source: { type: "string" },
  },
  required: ["position", "label", "serviceAmountInCents", "merchandiseAmountInCents", "totalAmountInCents", "pgdasAmountInCents", "hasService", "hasMerchandise", "hasPgdas", "source"],
};

const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    blocks: { type: "array", items: blockSchema },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["blocks", "warnings"],
};

function buildBlock(reference: Block, facts: Block, model: string) {
  const issues: string[] = [];
  if (reference.position !== facts.position) issues.push("As leituras independentes divergiram sobre a posição do bloco.");
  const numericKeys = ["serviceAmountInCents", "merchandiseAmountInCents", "totalAmountInCents", "pgdasAmountInCents"] as const;
  for (const key of numericKeys) if (reference[key] !== facts[key]) issues.push(`${key}: as leituras independentes divergiram.`);
  const boolKeys = ["hasService", "hasMerchandise", "hasPgdas"] as const;
  for (const key of boolKeys) if (reference[key] !== facts[key]) issues.push(`${key}: as leituras independentes divergiram.`);
  if (facts.serviceAmountInCents + facts.merchandiseAmountInCents !== facts.totalAmountInCents) issues.push("NFS + NF-e não fecha com o Total Faturado do bloco.");

  const entries: any[] = [];
  if (facts.hasService && facts.serviceAmountInCents > 0) entries.push({
    id: crypto.randomUUID(), date: "", history: "FATURAMENTO PRESTAÇÃO DE SERVIÇOS", eventType: "service_revenue",
    rubricCode: "FATURAMENTO_SERVICOS", rubricDescription: "FATURAMENTO PRESTAÇÃO DE SERVIÇOS", kind: "receita", section: "faturamento",
    debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "",
    amountInCents: facts.serviceAmountInCents, source: facts.source, confidence: 1,
  });
  if (facts.hasMerchandise && facts.merchandiseAmountInCents > 0) entries.push({
    id: crypto.randomUUID(), date: "", history: "FATURAMENTO REVENDA DE MERCADORIAS", eventType: "merchandise_revenue",
    rubricCode: "FATURAMENTO_REVENDA", rubricDescription: "FATURAMENTO REVENDA DE MERCADORIAS", kind: "receita", section: "faturamento",
    debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "",
    amountInCents: facts.merchandiseAmountInCents, source: facts.source, confidence: 1,
  });
  if (facts.hasPgdas && facts.pgdasAmountInCents > 0) entries.push({
    id: crypto.randomUUID(), date: "", history: "APURAÇÃO PGDAS", eventType: "pgdas",
    rubricCode: "APURACAO_PGDAS", rubricDescription: "APURAÇÃO PGDAS", kind: "tributo", section: "faturamento",
    debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "",
    amountInCents: facts.pgdasAmountInCents, source: facts.source, confidence: 1,
  });

  const byType = (eventType: string) => entries.filter(entry => entry.eventType === eventType).reduce((sum, entry) => sum + entry.amountInCents, 0);
  const comparisons = [
    { key: "services", label: "NFS · Prestação de serviços", documentAmountInCents: reference.serviceAmountInCents, entriesAmountInCents: byType("service_revenue"), differenceInCents: byType("service_revenue") - reference.serviceAmountInCents, source: reference.source, blocking: true },
    { key: "merchandise", label: "NF-e · Revenda de mercadorias", documentAmountInCents: reference.merchandiseAmountInCents, entriesAmountInCents: byType("merchandise_revenue"), differenceInCents: byType("merchandise_revenue") - reference.merchandiseAmountInCents, source: reference.source, blocking: true },
    { key: "total", label: "Total faturado", documentAmountInCents: reference.totalAmountInCents, entriesAmountInCents: byType("service_revenue") + byType("merchandise_revenue"), differenceInCents: byType("service_revenue") + byType("merchandise_revenue") - reference.totalAmountInCents, source: reference.source, blocking: true },
    { key: "pgdas", label: "DAS / PGDAS", documentAmountInCents: reference.pgdasAmountInCents, entriesAmountInCents: byType("pgdas"), differenceInCents: byType("pgdas") - reference.pgdasAmountInCents, source: reference.source, blocking: reference.hasPgdas },
  ];
  if (comparisons.some(row => row.blocking && row.differenceInCents !== 0)) issues.push("Os lançamentos não reconciliaram com os valores do bloco.");

  return {
    id: `undated-${reference.position}`,
    label: reference.label || `Bloco ${reference.position}`,
    position: reference.position,
    reference: {
      competence: "",
      serviceAmountInCents: reference.serviceAmountInCents,
      merchandiseAmountInCents: reference.merchandiseAmountInCents,
      totalAmountInCents: reference.totalAmountInCents,
      pgdasAmountInCents: reference.pgdasAmountInCents,
      hasService: reference.hasService,
      hasMerchandise: reference.hasMerchandise,
      hasPgdas: reference.hasPgdas,
      source: reference.source,
    },
    entries,
    comparisons,
    warnings: [],
    validationIssues: [...new Set(issues)],
    referenceVerified: issues.length === 0,
    validated: issues.length === 0,
    processingMeta: { model, primaryModel: model, reviewed: false, reviewModel: null, routing: "terra-undated-reference + terra-undated-facts" },
  };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => ["admin", "fiscal", "contabil", "geral"].includes(row.role))) return json({ error: "Acesso negado" }, 403);

    const body = await req.json();
    if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum documento" }, 400);
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 503);
    const model = Deno.env.get("OPENAI_ACCOUNTING_REVENUE_MODEL") || "gpt-5.6-terra";
    const files = body.documents.map((document: any) => ({ type: "input_file", filename: document.name, file_data: `data:${document.mime_type};base64,${document.data}` }));

    const instructions = `Você é um auditor documental contábil. Este fluxo é usado SOMENTE quando o sistema não conseguiu identificar competências mensais confiáveis.
Leia o documento inteiro e extraia os blocos/linhas recorrentes que representam períodos de faturamento, preservando a ordem visual.
REGRAS:
1. NÃO invente mês, ano ou data. Não deduza janeiro só porque é o primeiro bloco.
2. position começa em 1 e segue a ordem visual do documento.
3. label deve ser "Bloco 1", "Bloco 2" etc., podendo acrescentar uma referência visível que NÃO seja uma data inventada.
4. Se houver 12 blocos sem mês explícito, retorne os 12 blocos em ordem. A competência será informada manualmente pelo usuário depois.
5. Para cada bloco copie literalmente NFS/serviços, NF-e/revenda, total faturado e PGDAS quando existirem.
6. Campo ausente: valor 0 e has*=false. Não transforme ausência em zero confirmado.
7. NFS + NF-e deve fechar com total do próprio bloco; se não fechar, transcreva o que está impresso e registre warning.
8. source identifica a linha/bloco usado.
9. Não gere competências, datas, contas contábeis ou decisões de substituição.`;

    const call = async (pass: string): Promise<Extraction> => {
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          instructions,
          input: [{ role: "user", content: [{ type: "input_text", text: pass === "reference" ? "Faça uma leitura independente dos blocos sem competência." : "Faça uma segunda transcrição independente dos mesmos blocos." }, ...files] }],
          text: { format: { type: "json_schema", name: `revenue_undated_${pass}`, strict: true, schema } },
          max_output_tokens: 10000,
        }),
        signal: AbortSignal.timeout(120000),
      });
      const raw = await response.json();
      if (!response.ok) throw new Error(raw?.error?.message || "Falha na IA");
      const text = raw.output_text || raw.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
      if (!text) throw new Error("A IA não devolveu saída estruturada.");
      return JSON.parse(text) as Extraction;
    };

    const [reference, facts] = await Promise.all([call("reference"), call("facts")]);
    const referenceMap = new Map(reference.blocks.map(block => [block.position, block]));
    const factsMap = new Map(facts.blocks.map(block => [block.position, block]));
    const positions = [...new Set([...referenceMap.keys(), ...factsMap.keys()])].sort((a, b) => a - b);
    const issues: string[] = [];
    for (const position of positions) if (!referenceMap.has(position) || !factsMap.has(position)) issues.push(`Bloco ${position}: uma das leituras independentes não encontrou o bloco.`);
    const blocks = positions.filter(position => referenceMap.has(position) && factsMap.has(position)).map(position => buildBlock(referenceMap.get(position)!, factsMap.get(position)!, model));
    if (!blocks.length) issues.push("Nenhum bloco periódico sem competência foi identificado.");

    return json({
      blocks,
      warnings: [...new Set([...(reference.warnings ?? []), ...(facts.warnings ?? [])])],
      validationIssues: [...new Set(issues)],
      model,
      routing: "terra-undated-reference + terra-undated-facts + manual-competence-required",
    });
  } catch (error) {
    console.error("process-revenue-undated-document", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
