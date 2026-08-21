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
type Account = { reducedCode: string; description: string; analytical?: boolean; account?: string };
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
type ReferenceResult = { competence: string; totals: DocumentTotal[]; warnings: string[] };
type FactsResult = { facts: Fact[]; warnings: string[] };

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

function findAccount(accounts: Account[], alternatives: string[][], prefix?: string) {
  const analytical = accounts
    .filter((account) => account.analytical !== false && account.reducedCode && (!prefix || String(account.account ?? "").startsWith(prefix)))
    .map((account) => ({ account, text: normalize(account.description) }));
  for (const terms of alternatives) {
    const matches = analytical.filter(({ text }) => terms.every((term) => text.includes(normalize(term))));
    if (matches.length === 1) return matches[0].account;
  }
  return undefined;
}

function accountBook(accounts: Account[]) {
  const anywhere = (terms: string[][]) => findAccount(accounts, terms);
  const expense = (terms: string[][]) => findAccount(accounts, terms, "4") ?? anywhere(terms);
  const liability = (terms: string[][]) => findAccount(accounts, terms, "2") ?? anywhere(terms);
  return {
    salaryPayable: liability([["salarios", "pagar"], ["salarios", "remuneracoes", "pagar"]]),
    prolaborePayable: liability([["pro labore", "pagar"], ["pro labore"]]),
    vacationPayable: liability([["ferias", "pagar"]]),
    thirteenthPayable: liability([["13", "salario", "pagar"], ["decimo", "terceiro", "pagar"]]),
    severancePayable: liability([["rescisao", "pagar"]]),
    inssPayable: liability([["inss", "recolher"], ["inss", "pagar"]]),
    irrfPayable: liability([["irrf", "salarios", "recolher"], ["irrf", "recolher"], ["irrf", "pagar"]]),
    fgtsPayable: liability([["fgts", "recolher"], ["fgts", "pagar"]]),
    advanceSalary: anywhere([["adto", "salarios"], ["adiantamento", "salarios"], ["adiantamentos", "funcionarios"]]),
    advanceThirteenth: anywhere([["adto", "13", "salario"], ["adiantamento", "13", "salario"]]),
    salaryExpense: expense([["salarios"]]),
    overtimeExpense: expense([["horas", "extras"], ["hora", "extra"]]),
    prolaboreExpense: expense([["pro labore"]]),
    vacationExpense: expense([["ferias"]]),
    thirteenthExpense: expense([["13", "salarios"], ["13", "salario"], ["decimo", "terceiro"]]),
    fgtsExpense: expense([["fgts"]]),
    meal: expense([["vale", "alimentacao", "refeicao"], ["vale", "refeicao"], ["alimentacao", "trabalhador"]]),
    health: expense([["seguro", "saude"], ["plano", "saude"], ["assistencia", "medica"]]),
    dental: expense([["assist", "medica"], ["odontologica"], ["odontologico"]]),
  };
}

const sectionPayable = (section: Section, book: ReturnType<typeof accountBook>) => {
  if (section === "ferias") return book.vacationPayable;
  if (section === "decimo") return book.thirteenthPayable;
  if (section === "rescisao") return book.severancePayable;
  return book.salaryPayable;
};

function classifyEvent(fact: Fact) {
  const text = normalize(fact.description);
  if (fact.kind === "encargo" && text.includes("fgts")) return "fgts";
  if (text.includes("adiantamento") && text.includes("compens")) return "advance_compensation";
  if (fact.section === "adiantamento" && text.includes("adiantamento")) return "advance_payment";
  if (text.includes("pro labore")) return "prolabore";
  if (text.includes("inss")) return fact.targetCompetence ? "inss" : "inss";
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

function applyRules(facts: Fact[], accounts: Account[], sourceCompetence: string) {
  const book = accountBook(accounts);
  const map = new Map(accounts.map((account) => [String(account.reducedCode), account]));
  const entries: Entry[] = [];
  const deferredEntries: Entry[] = [];
  const issues: string[] = [];

  for (const fact of facts) {
    const target = parseCompetence(fact.targetCompetence) ? fact.targetCompetence : sourceCompetence;
    const deferred = target !== sourceCompetence;
    const eventType = classifyEvent(fact);
    const entry: Entry = {
      id: crypto.randomUUID(),
      date: lastDayOfCompetence(target),
      history: historyFor(fact, target),
      eventType,
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
      amountInCents: Math.trunc(fact.amountInCents),
      source: fact.source,
      confidence: fact.confidence,
      targetCompetence: deferred ? target : undefined,
    };
    const debit = (account?: Account) => { if (account) entry.debitCode = account.reducedCode; };
    const credit = (account?: Account) => { if (account) entry.creditCode = account.reducedCode; };
    const payable = sectionPayable(fact.section, book);
    const text = normalize(fact.description);

    if (eventType === "fgts") {
      debit(book.fgtsExpense); credit(book.fgtsPayable);
    } else if (eventType === "advance_payment") {
      debit(book.advanceSalary); credit(book.salaryPayable);
    } else if (eventType === "advance_compensation") {
      debit(payable); credit(book.advanceSalary);
    } else if (eventType === "prolabore" && fact.kind === "provento") {
      debit(book.prolaboreExpense); credit(book.prolaborePayable);
    } else if (eventType === "inss" && fact.kind === "desconto") {
      debit(payable); credit(book.inssPayable);
    } else if (eventType === "irrf" && fact.kind === "desconto") {
      debit(payable); credit(book.irrfPayable);
    } else if (eventType === "meal_discount") {
      debit(payable); credit(book.meal);
    } else if (eventType === "meal_earning") {
      debit(book.meal); credit(payable);
    } else if (eventType === "health_discount") {
      debit(payable); credit(book.health);
    } else if (eventType === "dental_discount") {
      debit(payable); credit(book.dental ?? book.health);
    } else if (fact.kind === "desconto") {
      debit(payable);
      if (text.includes("provento")) credit(book.salaryExpense);
    } else if (fact.kind === "provento") {
      credit(payable);
      if (fact.section === "decimo") {
        if (text.includes("adiantamento")) debit(book.advanceThirteenth);
        else debit(book.thirteenthExpense);
      } else if (fact.section === "ferias") {
        if (text.includes("remuneracao") || text.includes("1 3 de ferias")) debit(book.vacationExpense);
        else if (text.includes("hora extra")) debit(book.overtimeExpense);
        else debit(book.salaryExpense);
      } else if (text.includes("hora extra")) debit(book.overtimeExpense);
      else debit(book.salaryExpense);
    }

    const debitAccount = map.get(String(entry.debitCode));
    const creditAccount = map.get(String(entry.creditCode));
    entry.debitDescription = debitAccount?.description ?? "";
    entry.creditDescription = creditAccount?.description ?? "";
    if (!debitAccount || !creditAccount) issues.push(`${entry.history}: não foi possível localizar uma conta analítica inequívoca no plano da empresa.`);
    if (!Number.isInteger(entry.amountInCents) || entry.amountInCents <= 0) issues.push(`${entry.history}: valor inválido.`);
    if (!entry.source.trim()) issues.push(`${entry.history}: evidência documental ausente.`);
    if (fact.confidence < 0.8) issues.push(`${entry.history}: leitura documental com confiança insuficiente.`);
    (deferred ? deferredEntries : entries).push(entry);
  }
  return { entries, deferredEntries, issues: [...new Set(issues)] };
}

function sums(entries: Entry[], deferredEntries: Entry[]) {
  const allDocumentEntries = [...entries, ...deferredEntries];
  const sumWhere = (rows: Entry[], predicate: (entry: Entry) => boolean) => rows.filter(predicate).reduce((total, row) => total + row.amountInCents, 0);
  const proventos = (rows: Entry[]) => sumWhere(rows, (row) => row.kind === "provento");
  const descontos = (rows: Entry[]) => sumWhere(rows, (row) => row.kind === "desconto");
  const sectionRows = (section: Section) => allDocumentEntries.filter((entry) => entry.section === section);
  const inssCurrent = sumWhere(entries, (row) => row.eventType === "inss" && row.kind === "desconto");
  const fgtsCurrent = sumWhere(entries, (row) => row.eventType === "fgts" && row.kind === "encargo");
  const totalProventos = proventos(allDocumentEntries);
  const totalDescontos = descontos(allDocumentEntries);
  return {
    total_proventos: totalProventos,
    total_descontos: totalDescontos,
    liquido: totalProventos - totalDescontos,
    adiantamento_proventos: proventos(sectionRows("adiantamento")),
    adiantamento_descontos: descontos(sectionRows("adiantamento")),
    folha_proventos: proventos(sectionRows("folha")),
    folha_descontos: descontos(sectionRows("folha")),
    ferias_proventos: proventos(sectionRows("ferias")),
    ferias_descontos: descontos(sectionRows("ferias")),
    decimo_proventos: proventos(sectionRows("decimo")),
    decimo_descontos: descontos(sectionRows("decimo")),
    rescisao_proventos: proventos(sectionRows("rescisao")),
    rescisao_descontos: descontos(sectionRows("rescisao")),
    inss_total: inssCurrent,
    fgts_total: fgtsCurrent,
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

function compare(entries: Entry[], deferredEntries: Entry[], totals: DocumentTotal[], structural: string[]) {
  const calculated = sums(entries, deferredEntries);
  const comparisons = totals.map((total) => ({
    key: total.key,
    label: total.label,
    documentAmountInCents: total.amountInCents,
    entriesAmountInCents: calculated[total.key],
    differenceInCents: calculated[total.key] - total.amountInCents,
    source: total.source,
  }));
  const issues = [...structural];
  comparisons.filter((row) => row.differenceInCents !== 0).forEach((row) => issues.push(`${row.label}: diferença de ${(row.differenceInCents / 100).toFixed(2)}.`));
  return { comparisons, issues: [...new Set(issues)], passed: issues.length === 0 };
}

const actionableWarnings = (warnings: unknown[]) => warnings.map(String).filter((warning) => {
  const text = normalize(warning);
  return text && !text.includes("nao ha comprovante") && !text.includes("nao foram gerados lancamentos de pgto") && !text.includes("para evitar duplicidade");
});

const referenceSchema = {
  type: "object", additionalProperties: false,
  properties: {
    competence: { type: "string" },
    totals: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      key: { type: "string", enum: totalKeys }, label: { type: "string" }, amountInCents: { type: "integer" }, source: { type: "string" },
    }, required: ["key", "label", "amountInCents", "source"] } },
    warnings: { type: "array", items: { type: "string" } },
  }, required: ["competence", "totals", "warnings"],
};
const factsSchema = {
  type: "object", additionalProperties: false,
  properties: {
    facts: { type: "array", items: { type: "object", additionalProperties: false, properties: {
      rubricCode: { type: "string" }, description: { type: "string" }, kind: { type: "string", enum: kinds }, section: { type: "string", enum: sections },
      amountInCents: { type: "integer" }, source: { type: "string" }, confidence: { type: "number" }, targetCompetence: { type: "string" },
    }, required: ["rubricCode", "description", "kind", "section", "amountInCents", "source", "confidence", "targetCompetence"] } },
    warnings: { type: "array", items: { type: "string" } },
  }, required: ["facts", "warnings"],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const startedAt = Date.now();
  let admin: any = null;
  let userId: string | null = null;
  let body: any = {};
  const primaryModel = Deno.env.get("OPENAI_ACCOUNTING_PAYROLL_MODEL") || "gpt-5.6-terra";
  const reviewModel = Deno.env.get("OPENAI_ACCOUNTING_PAYROLL_REVIEW_MODEL") || primaryModel;

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
    userId = user.id;
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => ["admin", "fiscal", "contabil", "geral"].includes(row.role))) return json({ error: "Acesso negado" }, 403);

    body = await req.json();
    if (body.module !== "folha") return json({ error: "Módulo ainda não habilitado" }, 400);
    if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum documento" }, 400);
    const competence = String(body.competence || "");
    if (!parseCompetence(competence)) return json({ error: "Competência inválida" }, 422);
    const accounts: Account[] = body.chart_of_accounts ?? [];
    if (!accounts.length) return json({ error: "Importe o plano de contas da empresa antes de processar a folha." }, 422);
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

    const referenceInstructions = `Você é um auditor documental de folha brasileira. Leia apenas referências monetárias explícitas da competência ${competence}. NÃO gere lançamentos, NÃO escolha contas e NÃO use inferências para fazer valores fecharem.\nExtraia, quando visíveis: Total Geral de Proventos, Total Geral de Descontos, Líquido; totais de proventos/descontos de cada seção (Adiantamento de Folha, Folha de Pagamento, Férias, 13º e Rescisão); e no Resumo de INSS e FGTS os valores da linha Total a Recolher para INSS e FGTS.\nPreserve centavos exatamente. source deve nomear a seção/linha. Não use como inss_total o desconto bruto da linha INSS de férias quando o demonstrativo separa recolhimentos por mês; use o Total a Recolher do resumo. Não inclua referência que não esteja visível. warnings somente para leitura realmente ambígua.`;
    const factsInstructions = `Você é um transcritor factual de folha brasileira. Leia a competência ${competence} e extraia RUBRICA POR RUBRICA. Você NÃO recebe totais de conferência e NÃO deve escolher débito, crédito, C.R. ou conta contábil.\nPara cada linha monetária das seções Adiantamento de Folha, Folha de Pagamento, Férias, 13º salário e Rescisão, devolva rubricCode, descrição literal curta, kind=provento/desconto, section e valor exato em centavos. Não agrupe Salário-Base, Periculosidade, Hora Extra, Vale-Refeição, Bonificação, benefícios etc.\nREGRA CRÍTICA DE FÉRIAS/INSS: se a linha INSS da seção Férias incluir parcelas com meses de recolhimento diferentes no Demonstrativo de INSS e FGTS de Férias, NÃO devolva o INSS bruto como um único fato. Substitua-o pelas parcelas do demonstrativo: cada parcela vira um fato desconto, section=ferias, rubricCode=310, description=INSS, com targetCompetence igual ao mês de Recolhimento. A soma dessas parcelas deve igualar o desconto INSS exibido na seção Férias.\nFGTS: não transcreva o FGTS futuro do demonstrativo de férias como obrigação da competência atual. Gere um único fato kind=encargo, description=FGTS, section=folha, targetCompetence=${competence}, usando o valor FGTS da linha Total a Recolher do Resumo de INSS e FGTS.\nPara todos os demais fatos, targetCompetence=${competence}. Preserve centavos; source deve indicar seção/rubrica. confidence entre 0 e 1. Não crie pagamento, banco ou caixa. warnings apenas para algo que realmente não possa ser lido.`;

    const [referenceAttempt, factsAttempt] = await Promise.all([
      callOpenAI(primaryModel, referenceInstructions, "Extraia somente referências independentes do documento original.", referenceSchema, "payroll_reference", 5000, "reference"),
      callOpenAI(primaryModel, factsInstructions, "Transcreva todas as rubricas sem contabilizá-las.", factsSchema, "payroll_facts", 12000, "facts"),
    ]);
    const reference = referenceAttempt.parsed as ReferenceResult;
    let factsResult = factsAttempt.parsed as FactsResult;
    const referenceValidation = validateReference(reference, competence);
    let normalized = applyRules(factsResult.facts ?? [], accounts, competence);
    let validation = compare(normalized.entries, normalized.deferredEntries, reference.totals ?? [], [...referenceValidation.issues, ...normalized.issues]);
    let reviewed = false;

    const mismatches = validation.comparisons.filter((row) => row.differenceInCents !== 0).map((row) => row.key);
    if (referenceValidation.verified && mismatches.length && normalized.issues.length === 0 && reviewModel) {
      const reviewInstructions = `${factsInstructions}\nEsta é uma segunda transcrição independente porque a primeira não reconciliou as categorias: ${mismatches.join(", ")}. Releia o documento do zero. Você NÃO conhece os valores-alvo dessas categorias e NÃO deve inventar ajustes. Retorne o conjunto completo de rubricas apenas com o que o documento sustenta.`;
      const reviewedFacts = await callOpenAI(reviewModel, reviewInstructions, "Faça uma segunda leitura factual independente do documento.", factsSchema, "payroll_facts_review", 12000, "facts_review");
      factsResult = reviewedFacts.parsed as FactsResult;
      normalized = applyRules(factsResult.facts ?? [], accounts, competence);
      validation = compare(normalized.entries, normalized.deferredEntries, reference.totals ?? [], [...referenceValidation.issues, ...normalized.issues]);
      reviewed = true;
    }

    const warnings = [...new Set([...actionableWarnings(reference.warnings ?? []), ...actionableWarnings(factsResult.warnings ?? [])])];
    const validationIssues = [...new Set([...validation.issues, ...(warnings.length ? ["Existem pontos que exigem decisão humana antes da exportação."] : [])])];
    const validated = referenceValidation.verified && validation.passed && warnings.length === 0;

    return json({
      entries: normalized.entries,
      deferredEntries: normalized.deferredEntries,
      documentTotals: reference.totals,
      comparisons: validation.comparisons,
      validationIssues,
      warnings,
      referenceVerified: referenceValidation.verified,
      validated,
      model: primaryModel,
      primaryModel,
      reviewed,
      reviewModel: reviewed ? reviewModel : null,
      routing: reviewed ? "terra-reference + terra-rubrics + terra-targeted-reread" : "terra-reference + terra-rubrics",
      reference_response_id: referenceAttempt.raw.id,
      facts_response_id: factsAttempt.raw.id,
    });
  } catch (error) {
    console.error("process-accounting-document", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
