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
const validCompetence = (value: string) => /^(0[1-9]|1[0-2])\/(20\d{2})$/.test(value);
const lastDay = (competence: string) => {
  const [month, year] = competence.split("/").map(Number);
  return new Date(year, month, 0).toLocaleDateString("pt-BR");
};

type Period = {
  competence: string;
  serviceAmountInCents: number;
  merchandiseAmountInCents: number;
  totalAmountInCents: number;
  pgdasAmountInCents: number;
  hasService: boolean;
  hasMerchandise: boolean;
  hasPgdas: boolean;
  source: string;
};

type AnnualTotal = {
  year: string;
  serviceAmountInCents: number;
  merchandiseAmountInCents: number;
  totalAmountInCents: number;
  pgdasAmountInCents: number;
  source: string;
};

type Extraction = {
  periods: Period[];
  annualTotals: AnnualTotal[];
  warnings: string[];
};

const periodSchema = {
  type: "object",
  additionalProperties: false,
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
  },
  required: [
    "competence",
    "serviceAmountInCents",
    "merchandiseAmountInCents",
    "totalAmountInCents",
    "pgdasAmountInCents",
    "hasService",
    "hasMerchandise",
    "hasPgdas",
    "source",
  ],
};

const extractionSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    periods: { type: "array", items: periodSchema },
    annualTotals: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          year: { type: "string" },
          serviceAmountInCents: { type: "integer" },
          merchandiseAmountInCents: { type: "integer" },
          totalAmountInCents: { type: "integer" },
          pgdasAmountInCents: { type: "integer" },
          source: { type: "string" },
        },
        required: ["year", "serviceAmountInCents", "merchandiseAmountInCents", "totalAmountInCents", "pgdasAmountInCents", "source"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["periods", "annualTotals", "warnings"],
};

function sortPeriods(periods: Period[]) {
  return [...periods].sort((a, b) => {
    const [am, ay] = a.competence.split("/").map(Number);
    const [bm, by] = b.competence.split("/").map(Number);
    return ay === by ? am - bm : ay - by;
  });
}

function buildPeriodResult(reference: Period, facts: Period, model: string, inheritedWarnings: string[]) {
  const issues: string[] = [];
  const warnings = [...inheritedWarnings];
  if (!validCompetence(reference.competence) || !validCompetence(facts.competence)) {
    issues.push("Competência inválida identificada no documento.");
  }
  if (reference.competence !== facts.competence) {
    issues.push("As duas leituras independentes divergiram sobre a competência.");
  }

  const numericKeys = ["serviceAmountInCents", "merchandiseAmountInCents", "totalAmountInCents", "pgdasAmountInCents"] as const;
  for (const key of numericKeys) {
    if (Number(reference[key]) !== Number(facts[key])) {
      issues.push(`${key}: as duas leituras independentes divergiram.`);
    }
  }
  const boolKeys = ["hasService", "hasMerchandise", "hasPgdas"] as const;
  for (const key of boolKeys) {
    if (Boolean(reference[key]) !== Boolean(facts[key])) issues.push(`${key}: as duas leituras independentes divergiram.`);
  }
  if (facts.serviceAmountInCents + facts.merchandiseAmountInCents !== facts.totalAmountInCents) {
    issues.push("NFS + NF-e não fecha com o Total Faturado do documento.");
  }
  if (!facts.hasService && facts.serviceAmountInCents !== 0) issues.push("Serviços marcado como ausente, mas há valor informado.");
  if (!facts.hasMerchandise && facts.merchandiseAmountInCents !== 0) issues.push("NF-e marcada como ausente, mas há valor informado.");
  if (!facts.hasPgdas && facts.pgdasAmountInCents !== 0) issues.push("PGDAS marcado como ausente, mas há valor informado.");

  const competence = facts.competence;
  const date = validCompetence(competence) ? lastDay(competence) : "";
  const entries: any[] = [];
  if (facts.hasService && facts.serviceAmountInCents > 0) {
    entries.push({
      id: crypto.randomUUID(), date, history: "FATURAMENTO PRESTAÇÃO DE SERVIÇOS", eventType: "service_revenue",
      rubricCode: "FATURAMENTO_SERVICOS", rubricDescription: "FATURAMENTO PRESTAÇÃO DE SERVIÇOS", kind: "receita", section: "faturamento",
      debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "",
      amountInCents: facts.serviceAmountInCents, source: facts.source, confidence: 1,
    });
  }
  if (facts.hasMerchandise && facts.merchandiseAmountInCents > 0) {
    entries.push({
      id: crypto.randomUUID(), date, history: "FATURAMENTO REVENDA DE MERCADORIAS", eventType: "merchandise_revenue",
      rubricCode: "FATURAMENTO_REVENDA", rubricDescription: "FATURAMENTO REVENDA DE MERCADORIAS", kind: "receita", section: "faturamento",
      debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "",
      amountInCents: facts.merchandiseAmountInCents, source: facts.source, confidence: 1,
    });
  }
  if (facts.hasPgdas && facts.pgdasAmountInCents > 0) {
    entries.push({
      id: crypto.randomUUID(), date, history: "APURAÇÃO PGDAS", eventType: "pgdas",
      rubricCode: "APURACAO_PGDAS", rubricDescription: "APURAÇÃO PGDAS", kind: "tributo", section: "faturamento",
      debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "",
      amountInCents: facts.pgdasAmountInCents, source: facts.source, confidence: 1,
    });
  }

  const byType = (eventType: string) => entries.filter(entry => entry.eventType === eventType).reduce((sum, entry) => sum + entry.amountInCents, 0);
  const comparisons = [
    { key: "services", label: "NFS · Prestação de serviços", documentAmountInCents: reference.serviceAmountInCents, entriesAmountInCents: byType("service_revenue"), differenceInCents: byType("service_revenue") - reference.serviceAmountInCents, source: reference.source, blocking: true },
    { key: "merchandise", label: "NF-e · Revenda de mercadorias", documentAmountInCents: reference.merchandiseAmountInCents, entriesAmountInCents: byType("merchandise_revenue"), differenceInCents: byType("merchandise_revenue") - reference.merchandiseAmountInCents, source: reference.source, blocking: true },
    { key: "total", label: "Total faturado", documentAmountInCents: reference.totalAmountInCents, entriesAmountInCents: byType("service_revenue") + byType("merchandise_revenue"), differenceInCents: byType("service_revenue") + byType("merchandise_revenue") - reference.totalAmountInCents, source: reference.source, blocking: true },
    { key: "pgdas", label: "DAS / PGDAS", documentAmountInCents: reference.pgdasAmountInCents, entriesAmountInCents: byType("pgdas"), differenceInCents: byType("pgdas") - reference.pgdasAmountInCents, source: reference.source, blocking: reference.hasPgdas, note: reference.hasPgdas ? undefined : "Documento sem PGDAS nesta competência; nenhum lançamento tributário deve ser criado." },
  ];
  if (comparisons.some(comparison => comparison.blocking && comparison.differenceInCents !== 0)) {
    issues.push("Os lançamentos não reconciliaram com as referências independentes do documento.");
  }

  return {
    competence,
    reference: {
      competence,
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
    warnings: [...new Set(warnings)],
    validationIssues: [...new Set(issues)],
    referenceVerified: issues.length === 0,
    validated: issues.length === 0 && warnings.length === 0,
    model,
    primaryModel: model,
    reviewed: false,
    reviewModel: null,
    routing: "terra-reference + terra-full-document-facts + deterministic-period-distribution",
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
    const requestedCompetence = String(body.competence || "");
    const batch = Boolean(body.batch);
    if (!batch && !validCompetence(requestedCompetence)) return json({ error: "Competência inválida" }, 422);
    if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum documento" }, 400);

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) return json({ error: "OPENAI_API_KEY não configurada" }, 503);
    const model = Deno.env.get("OPENAI_ACCOUNTING_REVENUE_MODEL") || "gpt-5.6-terra";
    const files = body.documents.map((document: any) => ({
      type: "input_file",
      filename: document.name,
      file_data: `data:${document.mime_type};base64,${document.data}`,
    }));

    const instructions = `Você é um auditor documental de faturamento brasileiro. Leia o CONTEÚDO do documento inteiro e identifique TODAS as competências mensais existentes nele.

REGRAS ABSOLUTAS:
1. IGNORE o nome do arquivo para determinar ano ou mês. Nomes podem estar codificados, renomeados ou conter sequências como %202024. Ano e mês só podem vir do conteúdo visível do documento.
2. Cada competência deve usar formato MM/AAAA e aparecer uma única vez em periods.
3. Para cada mês, copie literalmente NFS/Prestação de Serviços, NF-e PJ Mod.55/Revenda, TOTAL FATURADO e DAS/PGDAS, sempre em centavos inteiros.
4. Campo vazio NÃO é zero inventado: represente amount=0 e has*=false. Isso se aplica a NF-e, serviços e PGDAS.
5. Nunca use o TOTAL ANUAL como se fosse um mês. annualTotals deve conter apenas os totais anuais explícitos, quando existirem.
6. Se houver um relatório anual com exatamente 12 linhas mensais em ordem cronológica e um único ano claramente impresso, mas os rótulos dos meses não forem preservados na camada de texto, você pode associar as 12 linhas de detalhe, de cima para baixo, a janeiro até dezembro SOMENTE se conseguir distinguir claramente essas 12 linhas do total anual. Registre isso em source.
7. NFS + NF-e deve ser igual ao TOTAL FATURADO da mesma linha. Não corrija valores para fazê-los fechar; transcreva literalmente e use warnings se o documento estiver realmente ambíguo.
8. Preserve dezembro sem PGDAS quando a célula estiver vazia. Preserve meses sem NF-e sem criar revenda.
9. source deve identificar de forma curta a linha/mês/ano usada.
10. warnings só para ambiguidade real. Não gere lançamentos nem contas contábeis.`;

    const call = async (pass: string) => {
      const startedAt = Date.now();
      const response = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          instructions,
          input: [{ role: "user", content: [{ type: "input_text", text: pass === "reference" ? "Faça uma leitura independente do documento inteiro como referência." : "Faça uma segunda transcrição independente do documento inteiro." }, ...files] }],
          text: { format: { type: "json_schema", name: `revenue_full_${pass}`, strict: true, schema: extractionSchema } },
          max_output_tokens: 10000,
        }),
        signal: AbortSignal.timeout(120000),
      });
      const raw = await response.json();
      const usage = raw?.usage ?? {};
      await admin.from("accounting_ai_usage").insert({
        created_by: user.id,
        company_key: String(body.company_id || ""),
        competence: batch ? "multi" : requestedCompetence,
        module: "faturamento",
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
        request_metadata: { pass, document_count: body.documents.length, batch },
      });
      if (!response.ok) throw new Error(raw?.error?.message || "Falha na IA");
      const text = raw.output_text || raw.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text;
      if (!text) throw new Error("A IA não devolveu saída estruturada.");
      return JSON.parse(text) as Extraction;
    };

    const [referenceExtraction, factsExtraction] = await Promise.all([call("reference"), call("facts")]);
    const globalWarnings = [...new Set([...(referenceExtraction.warnings ?? []), ...(factsExtraction.warnings ?? [])].map(String).filter(Boolean))];
    const globalIssues: string[] = [];

    const referenceMap = new Map(referenceExtraction.periods.map(period => [period.competence, period]));
    const factsMap = new Map(factsExtraction.periods.map(period => [period.competence, period]));
    const allCompetences = [...new Set([...referenceMap.keys(), ...factsMap.keys()])];

    for (const competence of allCompetences) {
      if (!validCompetence(competence)) globalIssues.push(`Competência inválida extraída: ${competence}.`);
      if (!referenceMap.has(competence) || !factsMap.has(competence)) globalIssues.push(`${competence}: uma das leituras independentes não encontrou esta competência.`);
    }
    if (!allCompetences.length) globalIssues.push("Nenhuma competência mensal foi identificada no documento.");

    const pairedResults = sortPeriods(allCompetences
      .filter(competence => referenceMap.has(competence) && factsMap.has(competence))
      .map(competence => referenceMap.get(competence)!))
      .map(reference => buildPeriodResult(reference, factsMap.get(reference.competence)!, model, globalWarnings));

    const annualReference = new Map(referenceExtraction.annualTotals.map(total => [total.year, total]));
    const annualFacts = new Map(factsExtraction.annualTotals.map(total => [total.year, total]));
    for (const [year, referenceTotal] of annualReference) {
      const factsTotal = annualFacts.get(year);
      if (!factsTotal) {
        globalIssues.push(`${year}: o total anual apareceu em apenas uma das leituras independentes.`);
        continue;
      }
      const keys = ["serviceAmountInCents", "merchandiseAmountInCents", "totalAmountInCents", "pgdasAmountInCents"] as const;
      for (const key of keys) {
        if (referenceTotal[key] !== factsTotal[key]) globalIssues.push(`${year}: as duas leituras divergiram no total anual de ${key}.`);
      }

      const months = pairedResults.filter(result => result.competence.endsWith(`/${year}`));
      if (months.length) {
        const monthlyService = months.reduce((sum, result) => sum + result.reference.serviceAmountInCents, 0);
        const monthlyMerchandise = months.reduce((sum, result) => sum + result.reference.merchandiseAmountInCents, 0);
        const monthlyTotal = months.reduce((sum, result) => sum + result.reference.totalAmountInCents, 0);
        const monthlyPgdas = months.reduce((sum, result) => sum + result.reference.pgdasAmountInCents, 0);
        if (monthlyService !== referenceTotal.serviceAmountInCents) globalIssues.push(`${year}: soma mensal de NFS não fecha com o total anual.`);
        if (monthlyMerchandise !== referenceTotal.merchandiseAmountInCents) globalIssues.push(`${year}: soma mensal de NF-e não fecha com o total anual.`);
        if (monthlyTotal !== referenceTotal.totalAmountInCents) globalIssues.push(`${year}: soma mensal do faturamento não fecha com o total anual.`);
        if (monthlyPgdas !== referenceTotal.pgdasAmountInCents) globalIssues.push(`${year}: soma mensal do PGDAS não fecha com o total anual.`);
      }
    }

    if (batch) {
      return json({
        periods: pairedResults.map(result => ({
          ...result,
          validationIssues: [...new Set([...result.validationIssues, ...globalIssues])],
          referenceVerified: result.referenceVerified && globalIssues.length === 0,
          validated: result.validated && globalIssues.length === 0,
        })),
        years: [...new Set(pairedResults.map(result => Number(result.competence.split("/")[1])))].sort(),
        annualTotals: referenceExtraction.annualTotals,
        warnings: globalWarnings,
        validationIssues: [...new Set(globalIssues)],
        model,
        primaryModel: model,
        reviewed: false,
        reviewModel: null,
        routing: "terra-full-document-reference + terra-full-document-facts + annual-reconciliation + deterministic-period-distribution",
      });
    }

    const requested = pairedResults.find(result => result.competence === requestedCompetence);
    if (!requested) {
      return json({
        error: `A competência ${requestedCompetence} não foi encontrada no documento. Competências identificadas: ${pairedResults.map(result => result.competence).join(", ") || "nenhuma"}.`,
        detectedCompetences: pairedResults.map(result => result.competence),
      }, 422);
    }

    return json({
      reference: requested.reference,
      entries: requested.entries,
      comparisons: requested.comparisons,
      warnings: requested.warnings,
      validationIssues: [...new Set([...requested.validationIssues, ...globalIssues])],
      referenceVerified: requested.referenceVerified && globalIssues.length === 0,
      validated: requested.validated && globalIssues.length === 0,
      model,
      primaryModel: model,
      reviewed: false,
      reviewModel: null,
      routing: "terra-full-document-reference + terra-full-document-facts + annual-reconciliation + deterministic-selected-period",
      detectedCompetences: pairedResults.map(result => result.competence),
    });
  } catch (error) {
    console.error("process-revenue-document", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
