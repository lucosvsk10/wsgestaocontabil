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
  rowType: "entry" | "cfop_summary";
  cfop: string;
  description: string;
  classification: string;
};

type Reference = {
  competence: string;
  quantity: number;
  quantityIsExplicit: boolean;
  totalAmountInCents: number;
  source: string;
  warnings: string[];
};

type ItemsResult = { reportMode: "detailed" | "cfop_summary"; items: PurchaseItem[]; warnings: string[] };

const referenceSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    competence: { type: "string" },
    quantity: { type: "integer" },
    quantityIsExplicit: { type: "boolean" },
    totalAmountInCents: { type: "integer" },
    source: { type: "string" },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["competence", "quantity", "quantityIsExplicit", "totalAmountInCents", "source", "warnings"],
};

const itemsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    reportMode: { type: "string", enum: ["detailed", "cfop_summary"] },
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
          rowType: { type: "string", enum: ["entry", "cfop_summary"] },
          cfop: { type: "string" },
          description: { type: "string" },
          classification: { type: "string" },
        },
        required: ["entryNumber", "supplier", "amountInCents", "entryDate", "emissionDate", "situation", "source", "confidence", "rowType", "cfop", "description", "classification"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["reportMode", "items", "warnings"],
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
    const rate = await consume(admin, "accounting_ai", requestKey(req, user.id), 20, 600);
    if (limited(rate)) return limited(rate)!;
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

    const referenceInstructions = `Você é um auditor documental de relatórios brasileiros de compras/entradas da competência ${competence}.
Leia SOMENTE referências explícitas do documento.
Se for um relatório resumido "Registro de Entradas Por CFOP", use como valor contábil de referência o "Total Líquido" → "Vr. Contábil", nunca "Vr. Total". Preserve centavos exatamente como impressos.
Se for um relatório detalhado sem coluna "Vr. Contábil", use o valor documental que represente contabilmente a entrada sem inventar ajustes.
Se o documento trouxer explicitamente uma quantidade total de entradas/notas, copie em quantity e marque quantityIsExplicit=true. Se NÃO houver uma quantidade explícita, use quantity=0 e quantityIsExplicit=false; nunca transforme número de linhas, CFOPs ou subtotais em "quantidade de entradas".
competence deve representar o mês/ano das DATAS DE EMISSÃO ou a competência explicitamente indicada no relatório, nunca a data em que o relatório foi gerado.
Não gere lançamentos, não escolha contas e não faça contas para ajustar valores. source deve identificar a área do relatório usada. warnings somente para ambiguidade real.`;

    const itemsInstructions = `Você é um TRANSCRITOR FACTUAL de relatórios brasileiros de compras/entradas da competência ${competence}. Sua obrigação é preservar o conteúdo que existe no PDF, sem inventar detalhes.

Existem dois formatos aceitos:
1. RELATÓRIO DETALHADO: há linhas individuais de notas/entradas. Nesse caso use reportMode="detailed" e gere UMA linha por entrada real.
2. RELATÓRIO RESUMIDO POR CFOP, como "Registro de Entradas Por CFOP": não existem notas individuais, mas existem linhas/subtotais por CFOP. Nesse caso use reportMode="cfop_summary" e gere UMA linha por CFOP/subtotal que componha o total do relatório. Não invente fornecedor, número de nota ou datas individuais.

Para linha detalhada:
- rowType="entry";
- copie literalmente número/Entrada, Fornecedor, Valor Total, Data da entrada, Data Emissão e Situação;
- cfop deve ser copiado quando existir;
- description deve preservar a descrição/natureza explicitamente impressa;
- classification deve usar somente a natureza evidenciada pelo documento/CFOP; se não houver evidência suficiente, use "NÃO IDENTIFICADA".

Para resumo por CFOP:
- rowType="cfop_summary";
- entryNumber deve ser "CFOP " + código;
- cfop deve conter somente o código;
- supplier deve ficar vazio, pois não há fornecedor individual;
- description deve copiar a descrição do CFOP/natureza exatamente como consta no relatório;
- amountInCents deve ser o "Vr. Contábil" daquele CFOP/subtotal; NÃO use "Vr. Total" quando ambos existirem;
- preserve separadamente a natureza: 1101/2101 industrialização/produção; 1253 energia elétrica; 1407/1556/2556 uso ou consumo; 1653 combustível/lubrificante; 2551 ativo imobilizado; 2922 simples faturamento para recebimento futuro;
- entryDate e emissionDate devem ficar vazios se o relatório não trouxer data para aquela linha;
- situation pode ser "Resumo por CFOP";
- classification deve refletir a natureza explícita do CFOP/descrição e manter categorias distintas. Para este tipo de relatório: 1101/2101 = "industrialização/produção"; 1253 = "energia elétrica"; 1407/1556/2556 = "uso/consumo"; 1653 = "combustível/lubrificante"; 2551 = "ativo imobilizado"; 2922 = "simples faturamento/recebimento futuro". Não reduza energia ou combustível a uso/consumo; se houver outra natureza ou dúvida, descreva a evidência ou use "NÃO IDENTIFICADA".

Nunca some linhas diferentes, nunca agrupe CFOPs diferentes, nunca force tudo para "mercadoria para revenda" e nunca use uma classificação como fallback.
Não gere débito, crédito, C.R. ou histórico contábil. source deve identificar a linha/área usada. confidence de 0 a 1; warning se uma linha não puder ser lida com segurança.`;

    const [referenceAttempt, itemsAttempt] = await Promise.all([
      callOpenAI(referenceInstructions, "Extraia somente as referências documentais explícitas.", referenceSchema, "purchase_reference", 2200, "reference"),
      callOpenAI(itemsInstructions, "Transcreva todas as linhas de entrada ou, se o relatório for resumido, todos os subtotais por CFOP sem contabilizá-los.", itemsSchema, "purchase_items", 10000, "items"),
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
    const quantityDifference = reference.quantityIsExplicit ? extractedQuantity - reference.quantity : 0;
    const totalDifference = extractedTotal - reference.totalAmountInCents;
    if (reference.quantityIsExplicit && quantityDifference !== 0) issues.push(`Quantidade de entradas: diferença de ${quantityDifference}.`);
    if (totalDifference !== 0) issues.push(`Valor contábil: diferença de ${(totalDifference / 100).toFixed(2)}.`);
    if (reference.totalAmountInCents > 0 && items.length === 0) {
      issues.push("O relatório possui valor total, mas nenhuma linha de transcrição foi identificada. Nenhum lançamento contábil foi criado para evitar classificação genérica.");
    }

    const entries = items.map((item, index) => {
      const code = String(item.cfop || "").trim();
      const evidence = String(item.classification || item.description || item.supplier || "").trim();
      const description = evidence && evidence !== "NÃO IDENTIFICADA" ? evidence : "COMPRA SEM CLASSIFICAÇÃO";
      const referenceLabel = code ? `CFOP ${code}` : item.entryNumber || `Linha ${index + 1}`;
      return {
        id: crypto.randomUUID(),
        date: lastDayOfCompetence(competence),
        history: `COMPRAS - ${referenceLabel} - ${description}`,
        eventType: item.rowType === "cfop_summary" ? "purchase_cfop" : "purchase_entry",
        rubricCode: code || item.entryNumber || `COMPRA_${index + 1}`,
        rubricDescription: description,
        kind: "compra",
        section: "compras",
        debitCode: "",
        debitDescription: "",
        debitCostCenter: "",
        creditCode: "",
        creditDescription: "",
        creditCostCenter: "",
        amountInCents: item.amountInCents,
        source: item.source,
        confidence: item.confidence,
      };
    });

    const comparisons = [
      ...(reference.quantityIsExplicit ? [{
        key: "quantity",
        label: "Quantidade de entradas",
        documentValue: reference.quantity,
        extractedValue: extractedQuantity,
        difference: quantityDifference,
        format: "number",
        source: reference.source,
        blocking: true,
      }] : []),
      {
        key: "document_total",
        label: "Valor contábil",
        documentValue: reference.totalAmountInCents,
        extractedValue: extractedTotal,
        difference: totalDifference,
        format: "currency",
        source: reference.source,
        blocking: true,
      },
      {
        key: "launch_total",
        label: "Lançamentos classificados",
        documentValue: reference.totalAmountInCents,
        extractedValue: entries.reduce((sum, entry) => sum + entry.amountInCents, 0),
        difference: entries.reduce((sum, entry) => sum + entry.amountInCents, 0) - reference.totalAmountInCents,
        format: "currency",
        source: "Consolidação mensal das entradas",
        blocking: true,
        note: "Cada linha ou CFOP permanece um lançamento individual após a classificação contábil; nunca agrupar por débito/crédito.",
      },
    ];

    return json({
      items,
      reference: { competence, quantity: reference.quantity, quantityIsExplicit: reference.quantityIsExplicit, totalAmountInCents: reference.totalAmountInCents, source: reference.source },
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
      routing: `terra-reference + terra-purchase-transcription(${itemsResult.reportMode}) + classification-by-evidence + individual-source-entries`,
      reference_response_id: referenceAttempt.raw.id,
      items_response_id: itemsAttempt.raw.id,
    });
  } catch (error) {
    console.error("process-purchases-document", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
