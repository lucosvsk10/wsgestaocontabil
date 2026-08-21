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

const eventTypes = [
  "salary_gross", "prolabore_gross", "advance_compensation", "inss_payroll", "inss_prolabore",
  "irrf_payroll", "irrf_prolabore", "benefit_meal", "benefit_health", "benefit_dental",
  "vacation_gross", "inss_vacation", "inss_vacation_future", "irrf_vacation", "fgts_payroll",
  "fgts_vacation", "thirteenth_gross", "inss_thirteenth", "fgts_thirteenth", "other_earning", "other_discount",
] as const;
const totalKeys = [
  "total_proventos", "total_descontos", "liquido", "folha_proventos", "ferias_proventos", "adiantamento",
  "prolabore", "inss_total", "irrf_total", "fgts_total", "vale_alimentacao", "plano_saude", "plano_odontologico",
] as const;

type EventType = typeof eventTypes[number];
type TotalKey = typeof totalKeys[number];
type Account = { reducedCode: string; description: string; analytical?: boolean; account?: string };
type Fact = { eventType: EventType; amountInCents: number; source: string; confidence: number; targetCompetence: string };
type Entry = { id?: string; date: string; history: string; eventType: EventType; debitCode: string; debitDescription: string; debitCostCenter: string; creditCode: string; creditDescription: string; creditCostCenter: string; amountInCents: number; source: string; confidence: number; targetCompetence?: string };
type DocumentTotal = { key: TotalKey; label: string; amountInCents: number; source: string };
type ReferenceResult = { competence: string; totals: DocumentTotal[]; warnings: string[] };
type FactsResult = { facts: Fact[]; warnings: string[] };

const normalize = (value: unknown) => String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
const estimateCost = (model: string, usage: any) => { const price = prices[model]; if (!price) return 0; const cached = Number(usage?.input_tokens_details?.cached_tokens ?? 0); const input = Math.max(0, Number(usage?.input_tokens ?? 0) - cached); return (input * price.input + cached * price.cached + Number(usage?.output_tokens ?? 0) * price.output) / 1_000_000 };
const sum = (entries: Entry[], types: EventType[]) => entries.filter((entry) => types.includes(entry.eventType)).reduce((total, entry) => total + entry.amountInCents, 0);

function parseCompetence(value: string) { const match = /^(0[1-9]|1[0-2])\/(20\d{2})$/.exec(value); return match ? { month: Number(match[1]), year: Number(match[2]) } : null }
function lastDayOfCompetence(competence: string) { const parsed = parseCompetence(competence); return parsed ? new Date(parsed.year, parsed.month, 0).toLocaleDateString("pt-BR") : "" }
function nextCompetence(competence: string) { const parsed = parseCompetence(competence); if (!parsed) return competence; const date = new Date(parsed.year, parsed.month, 1); return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}` }

const historyFor = (eventType: EventType, competence: string) => ({
  salary_gross: `SALÁRIOS E REMUNERAÇÕES A PAGAR MÊS ${competence}`,
  prolabore_gross: `PRÓ-LABORE A PAGAR MÊS ${competence}`,
  advance_compensation: `ADIANTAMENTO DE SALÁRIO COMPENSADO MÊS ${competence}`,
  inss_payroll: `INSS S/SALÁRIOS A PAGAR MÊS ${competence}`,
  inss_prolabore: `INSS S/PRÓ-LABORE (SÓCIO) A PAGAR MÊS ${competence}`,
  irrf_payroll: `IRRF S/SALÁRIOS A PAGAR MÊS ${competence}`,
  irrf_prolabore: `IRRF S/PRÓ-LABORE (SÓCIO) A PAGAR MÊS ${competence}`,
  benefit_meal: `DESCONTO DE VALE-ALIMENTAÇÃO MÊS ${competence}`,
  benefit_health: `DESCONTO DE PLANO DE SAÚDE MÊS ${competence}`,
  benefit_dental: `DESCONTO DE PLANO ODONTOLÓGICO MÊS ${competence}`,
  vacation_gross: `FÉRIAS A PAGAR MÊS ${competence}`,
  inss_vacation: `INSS S/FÉRIAS A PAGAR MÊS ${competence}`,
  inss_vacation_future: `INSS S/FÉRIAS A PAGAR MÊS ${competence}`,
  irrf_vacation: `IRRF S/FÉRIAS A PAGAR MÊS ${competence}`,
  fgts_payroll: `FGTS A PAGAR MÊS ${competence}`,
  fgts_vacation: `FGTS S/FÉRIAS A PAGAR MÊS ${competence}`,
  thirteenth_gross: `13º SALÁRIO A PAGAR MÊS ${competence}`,
  inss_thirteenth: `INSS S/13º A PAGAR MÊS ${competence}`,
  fgts_thirteenth: `FGTS S/13º A PAGAR MÊS ${competence}`,
  other_earning: `OUTROS PROVENTOS DA FOLHA MÊS ${competence}`,
  other_discount: `OUTROS DESCONTOS DA FOLHA MÊS ${competence}`,
}[eventType]);

function findAccount(accounts: Account[], alternatives: string[][], accountPrefix?: string) {
  const ranked = accounts.filter((account) => account.analytical !== false && account.reducedCode && (!accountPrefix || String(account.account ?? "").startsWith(accountPrefix))).map((account) => ({ account, normalized: normalize(account.description) }));
  for (const terms of alternatives) { const matches = ranked.filter(({ normalized }) => terms.every((term) => normalized.includes(normalize(term)))); if (matches.length === 1) return matches[0].account }
  return undefined;
}
function semanticAccounts(accounts: Account[]) { return {
  salaryPayable: findAccount(accounts, [["salarios", "remuneracoes", "pagar"], ["salarios", "pagar"]], "2") ?? findAccount(accounts, [["salarios", "remuneracoes", "pagar"], ["salarios", "pagar"]]),
  prolaborePayable: findAccount(accounts, [["pro labore", "pagar"], ["pro labore"]], "2") ?? findAccount(accounts, [["pro labore", "pagar"], ["pro labore"]]),
  salaryExpense: findAccount(accounts, [["salarios", "ordenados"], ["salarios", "remuneracoes"], ["salarios"]], "4"),
  prolaboreExpense: findAccount(accounts, [["pro labore"]], "4"), vacationExpense: findAccount(accounts, [["ferias"]], "4"),
  thirteenthExpense: findAccount(accounts, [["13", "salario"], ["decimo", "terceiro"]], "4"), fgtsExpense: findAccount(accounts, [["fgts"]], "4"),
  advance: findAccount(accounts, [["adiantamentos", "funcionarios"], ["adiantamento", "funcionario"]]), inssPayable: findAccount(accounts, [["inss", "recolher"], ["inss", "pagar"]]),
  irrfPayable: findAccount(accounts, [["irrf", "recolher"], ["irrf", "pagar"]]), fgtsPayable: findAccount(accounts, [["fgts", "recolher"], ["fgts", "pagar"]]),
  meal: findAccount(accounts, [["alimentacao", "trabalhador"], ["vale", "alimentacao"], ["vale", "refeicao"]]),
  health: findAccount(accounts, [["assistencia", "medica", "odontologica"], ["plano", "saude"], ["assistencia", "medica"]]),
} }

function applyDeterministicRules(facts: Fact[], accounts: Account[], competence: string) {
  const semantic = semanticAccounts(accounts); const accountMap = new Map(accounts.map((account) => [String(account.reducedCode), account])); const issues: string[] = []; const entries: Entry[] = []; const deferredEntries: Entry[] = [];
  for (const fact of facts) {
    const isDeferred = fact.eventType === "inss_vacation_future";
    const targetCompetence = isDeferred && parseCompetence(fact.targetCompetence) ? fact.targetCompetence : isDeferred ? nextCompetence(competence) : competence;
    const entry: Entry = { id: crypto.randomUUID(), date: lastDayOfCompetence(targetCompetence), history: historyFor(fact.eventType, targetCompetence), eventType: fact.eventType, debitCode: "", debitDescription: "", debitCostCenter: "", creditCode: "", creditDescription: "", creditCostCenter: "", amountInCents: Math.trunc(fact.amountInCents), source: fact.source, confidence: fact.confidence, targetCompetence: isDeferred ? targetCompetence : undefined };
    const setDebit = (account?: Account) => { if (account) entry.debitCode = account.reducedCode }; const setCredit = (account?: Account) => { if (account) entry.creditCode = account.reducedCode };
    if (entry.eventType === "salary_gross") setDebit(semantic.salaryExpense); if (entry.eventType === "prolabore_gross") setDebit(semantic.prolaboreExpense); if (entry.eventType === "vacation_gross") setDebit(semantic.vacationExpense); if (entry.eventType === "thirteenth_gross") setDebit(semantic.thirteenthExpense);
    if (["fgts_payroll", "fgts_vacation", "fgts_thirteenth"].includes(entry.eventType)) setDebit(semantic.fgtsExpense);
    if (["salary_gross", "vacation_gross", "thirteenth_gross"].includes(entry.eventType)) setCredit(semantic.salaryPayable); if (entry.eventType === "prolabore_gross") setCredit(semantic.prolaborePayable);
    if (entry.eventType === "advance_compensation") { setDebit(semantic.salaryPayable); setCredit(semantic.advance) }
    if (["inss_payroll", "irrf_payroll", "benefit_meal", "benefit_health", "benefit_dental", "inss_vacation", "inss_vacation_future", "irrf_vacation", "inss_thirteenth"].includes(entry.eventType)) setDebit(semantic.salaryPayable);
    if (["inss_prolabore", "irrf_prolabore"].includes(entry.eventType)) setDebit(semantic.prolaborePayable);
    if (["inss_payroll", "inss_prolabore", "inss_vacation", "inss_vacation_future", "inss_thirteenth"].includes(entry.eventType)) setCredit(semantic.inssPayable);
    if (["irrf_payroll", "irrf_prolabore", "irrf_vacation"].includes(entry.eventType)) setCredit(semantic.irrfPayable); if (["fgts_payroll", "fgts_vacation", "fgts_thirteenth"].includes(entry.eventType)) setCredit(semantic.fgtsPayable);
    if (entry.eventType === "benefit_meal") setCredit(semantic.meal); if (["benefit_health", "benefit_dental"].includes(entry.eventType)) setCredit(semantic.health);
    const debit = accountMap.get(String(entry.debitCode)); const credit = accountMap.get(String(entry.creditCode)); entry.debitDescription = debit?.description ?? ""; entry.creditDescription = credit?.description ?? "";
    if (!debit || !credit) issues.push(`${entry.history}: não foi possível localizar uma conta analítica inequívoca no plano da empresa.`); if (!Number.isInteger(entry.amountInCents) || entry.amountInCents <= 0) issues.push(`${entry.history}: valor inválido.`); if (!entry.source.trim()) issues.push(`${entry.history}: origem documental ausente.`);
    (isDeferred ? deferredEntries : entries).push(entry);
  }
  return { entries, deferredEntries, issues: [...new Set(issues)] };
}

function calculatedTotals(entries: Entry[]) {
  const earnings = sum(entries, ["salary_gross", "prolabore_gross", "vacation_gross", "thirteenth_gross", "other_earning"]);
  const deductions = sum(entries, ["advance_compensation", "inss_payroll", "inss_prolabore", "irrf_payroll", "irrf_prolabore", "benefit_meal", "benefit_health", "benefit_dental", "inss_vacation", "irrf_vacation", "inss_thirteenth", "other_discount"]);
  return { total_proventos: earnings, total_descontos: deductions, liquido: earnings - deductions, folha_proventos: sum(entries, ["salary_gross", "prolabore_gross"]), ferias_proventos: sum(entries, ["vacation_gross"]), adiantamento: sum(entries, ["advance_compensation"]), prolabore: sum(entries, ["prolabore_gross"]), inss_total: sum(entries, ["inss_payroll", "inss_prolabore", "inss_vacation", "inss_thirteenth"]), irrf_total: sum(entries, ["irrf_payroll", "irrf_prolabore", "irrf_vacation"]), fgts_total: sum(entries, ["fgts_payroll", "fgts_vacation", "fgts_thirteenth"]), vale_alimentacao: sum(entries, ["benefit_meal"]), plano_saude: sum(entries, ["benefit_health"]), plano_odontologico: sum(entries, ["benefit_dental"]) } satisfies Record<TotalKey, number>;
}
function validateReference(reference: ReferenceResult, requestedCompetence: string) {
  const issues: string[] = []; if (reference.competence && reference.competence !== requestedCompetence) issues.push(`A referência foi lida como ${reference.competence}, mas o processamento solicitado é ${requestedCompetence}.`); if (!reference.totals.length) issues.push("O documento original não forneceu totais suficientes para conferência independente.");
  const seen = new Map<string, number>(); reference.totals.forEach((total) => { if (!Number.isInteger(total.amountInCents) || total.amountInCents < 0) issues.push(`${total.label}: valor de referência inválido.`); if (!total.source.trim()) issues.push(`${total.label}: referência sem evidência documental.`); const prior = seen.get(total.key); if (prior !== undefined && prior !== total.amountInCents) issues.push(`${total.label}: o documento devolveu valores conflitantes para a mesma referência.`); seen.set(total.key, total.amountInCents) });
  const proventos = seen.get("total_proventos"), descontos = seen.get("total_descontos"), liquido = seen.get("liquido"); if (proventos === undefined || descontos === undefined || liquido === undefined) issues.push("A referência precisa conter Total de Proventos, Total de Descontos e Líquido para liberar a folha."); else if (proventos - descontos !== liquido) issues.push("Os próprios totais do documento original não fecham: Proventos - Descontos é diferente do Líquido.");
  return { verified: issues.length === 0, issues: [...new Set(issues)] };
}
function validateEntries(entries: Entry[], documentTotals: DocumentTotal[], structuralIssues: string[]) { const calculated = calculatedTotals(entries); const comparisons = documentTotals.map((total) => ({ key: total.key, label: total.label, documentAmountInCents: total.amountInCents, entriesAmountInCents: calculated[total.key], differenceInCents: calculated[total.key] - total.amountInCents, source: total.source })); const issues = [...structuralIssues]; comparisons.filter((row) => row.differenceInCents !== 0).forEach((row) => issues.push(`${row.label}: diferença de ${(row.differenceInCents / 100).toFixed(2)}.`)); return { comparisons, issues: [...new Set(issues)], passed: issues.length === 0 } }
const actionableWarnings = (warnings: unknown[]) => warnings.map(String).filter((warning) => { const text = normalize(warning); return !text.includes("nao ha comprovante") && !text.includes("nao foram gerados lancamentos de pgto") && !text.includes("para evitar duplicidade") });

const referenceSchema = { type: "object", additionalProperties: false, properties: { competence: { type: "string" }, totals: { type: "array", items: { type: "object", additionalProperties: false, properties: { key: { type: "string", enum: totalKeys }, label: { type: "string" }, amountInCents: { type: "integer" }, source: { type: "string" } }, required: ["key", "label", "amountInCents", "source"] } }, warnings: { type: "array", items: { type: "string" } } }, required: ["competence", "totals", "warnings"] };
const factsSchema = { type: "object", additionalProperties: false, properties: { facts: { type: "array", items: { type: "object", additionalProperties: false, properties: { eventType: { type: "string", enum: eventTypes }, amountInCents: { type: "integer" }, source: { type: "string" }, confidence: { type: "number" }, targetCompetence: { type: "string" } }, required: ["eventType", "amountInCents", "source", "confidence", "targetCompetence"] } }, warnings: { type: "array", items: { type: "string" } } }, required: ["facts", "warnings"] };

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors }); const startedAt = Date.now(); let admin: any = null; let userId: string | null = null; let body: any = {};
  const primaryModel = Deno.env.get("OPENAI_ACCOUNTING_PAYROLL_MODEL") || "gpt-5.6-terra"; const reviewModel = Deno.env.get("OPENAI_ACCOUNTING_PAYROLL_REVIEW_MODEL") || primaryModel;
  const recordUsage = async (raw: any, status: "success" | "error", requestedModel: string, pass: string, metadata: Record<string, unknown> = {}) => { if (!admin) return; const usage = raw?.usage ?? {}; const { error } = await admin.from("accounting_ai_usage").insert({ created_by: userId, company_key: body.company_id ? String(body.company_id) : null, competence: body.competence ? String(body.competence) : null, module: body.module || "folha", provider: "openai", model: raw?.model || requestedModel, status, response_id: raw?.id ?? null, input_tokens: usage.input_tokens ?? 0, cached_input_tokens: usage.input_tokens_details?.cached_tokens ?? 0, output_tokens: usage.output_tokens ?? 0, total_tokens: usage.total_tokens ?? 0, estimated_cost_usd: estimateCost(raw?.model || requestedModel, usage), latency_ms: Date.now() - startedAt, error_code: raw?.error?.code ?? raw?.error?.type ?? null, error_message: raw?.error?.message ?? null, request_metadata: { document_count: Array.isArray(body.documents) ? body.documents.length : 0, requested_model: requestedModel, pass, ...metadata } }); if (error) console.error("Falha ao registrar telemetria", error) };
  try {
    const auth = req.headers.get("Authorization"); if (!auth) return json({ error: "Não autenticado" }, 401); admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!); const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", "")); if (!user) return json({ error: "Não autenticado" }, 401); userId = user.id;
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id); if (!roles?.some((row: any) => ["admin", "fiscal", "contabil", "geral"].includes(row.role))) return json({ error: "Acesso negado" }, 403);
    body = await req.json(); if (body.module !== "folha") return json({ error: "Módulo ainda não habilitado" }, 400); if (!Array.isArray(body.documents) || !body.documents.length) return json({ error: "Nenhum documento" }, 400); const apiKey = Deno.env.get("OPENAI_API_KEY"); if (!apiKey) return json({ error: "A chave OPENAI_API_KEY ainda não foi configurada no Supabase." }, 503); const accounts: Account[] = body.chart_of_accounts ?? []; if (!accounts.length) return json({ error: "Importe o plano de contas da empresa antes de processar a folha." }, 422); const competence = String(body.competence || ""); if (!parseCompetence(competence)) return json({ error: "Competência inválida." }, 422);
    const fileInputs = body.documents.map((document: any) => ({ type: "input_file", filename: document.name, file_data: `data:${document.mime_type};base64,${document.data}` }));
    const callOpenAI = async (requestedModel: string, instructions: string, userText: string, schema: any, schemaName: string, maxOutputTokens: number, pass: string) => { const response = await fetch("https://api.openai.com/v1/responses", { method: "POST", headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model: requestedModel, instructions, input: [{ role: "user", content: [{ type: "input_text", text: userText }, ...fileInputs] }], text: { format: { type: "json_schema", name: schemaName, strict: true, schema } }, max_output_tokens: maxOutputTokens }), signal: AbortSignal.timeout(150_000) }); const raw = await response.json(); await recordUsage(raw, response.ok ? "success" : "error", requestedModel, pass); if (!response.ok) throw new Error(raw?.error?.message || "Falha na OpenAI"); const outputText = raw.output_text || raw.output?.flatMap((item: any) => item.content ?? []).find((item: any) => item.type === "output_text")?.text; if (!outputText) throw new Error("A OpenAI concluiu a chamada sem devolver saída estruturada."); try { return { parsed: JSON.parse(outputText), raw } } catch { throw new Error("A resposta da IA não pôde ser validada como JSON estruturado.") } };
    const referenceInstructions = `Você é um auditor documental de folha brasileira. Sua única tarefa é ler referências monetárias explícitas dos documentos da competência ${competence}. NÃO gere lançamentos, NÃO classifique débito/crédito e NÃO tente fazer os fatos caberem nos totais.\nRegras: 1. Preserve cada centavo exatamente; nunca estime, arredonde, compense ou invente. 2. Para total_proventos, total_descontos e liquido, use o Total Geral/resumo final da competência, quando visível. 3. Para INSS e FGTS, use Total a Recolher ou resumo equivalente da própria competência. 4. Valores expressamente identificados como pertencentes a competência futura NÃO entram nos totais da competência atual. 5. Retorne apenas totais realmente visíveis. source deve ser uma evidência curta que identifique o quadro/linha de onde o valor foi lido. 6. warnings somente quando uma referência essencial estiver ambígua ou ilegível.`;
    const factsInstructions = `Você é um extrator factual de folha brasileira. Extraia somente fatos/eventos monetários presentes nos documentos da competência ${competence}. Você NÃO conhece e NÃO receberá os totais de conferência. NÃO escolha C.R., débito, crédito ou conta contábil; o servidor fará isso por regras determinísticas.\nRegras: 1. Preserve cada centavo exatamente; nunca estime, arredonde, compense ou invente. 2. Classifique cada fato em um eventType permitido. Separe salários de pró-labore, INSS de salários/pró-labore/férias/13º, IRRF, FGTS e benefícios. 3. Vale-alimentação, plano de saúde e plano odontológico devem ser fatos separados quando o documento os separar. 4. Adiantamento compensado é desconto/compensação, não salário bruto. 5. Quando férias mostrarem parcela de INSS que pertence a outra competência, use inss_vacation_future e informe targetCompetence em MM/AAAA. Nos demais fatos, targetCompetence deve ser ${competence}. 6. Não crie pagamento, banco ou caixa sem comprovante expresso. Não gere fato de recolhimento de FGTS: extraia somente a constituição/base pertinente à folha. 7. source deve indicar de forma curta a linha/quadro que sustenta o valor. warnings somente para dúvida que exige decisão humana.`;
    const [referenceAttempt, factsAttempt] = await Promise.all([callOpenAI(primaryModel, referenceInstructions, "Extraia somente as referências independentes do documento original.", referenceSchema, "payroll_reference", 4500, "reference"), callOpenAI(primaryModel, factsInstructions, "Extraia somente fatos de folha, sem totais de conferência e sem contas contábeis.", factsSchema, "payroll_facts", 9000, "facts")]);
    const reference = referenceAttempt.parsed as ReferenceResult; let factsResult = factsAttempt.parsed as FactsResult; const referenceValidation = validateReference(reference, competence); let normalized = applyDeterministicRules(factsResult.facts ?? [], accounts, competence); let validation = validateEntries(normalized.entries, reference.totals ?? [], [...referenceValidation.issues, ...normalized.issues]); let reviewed = false;
    const mismatchKeys = validation.comparisons.filter((row) => row.differenceInCents !== 0).map((row) => row.key); const canReviewFacts = referenceValidation.verified && mismatchKeys.length > 0 && normalized.issues.length === 0 && Boolean(reviewModel);
    if (canReviewFacts) { const reviewInstructions = `${factsInstructions}\nEsta é uma segunda leitura independente dos FATOS porque a primeira leitura não reconciliou algumas categorias (${mismatchKeys.join(", ")}). Releia o documento do zero. NÃO receba nem tente adivinhar os valores-alvo das referências; use somente evidência documental. Retorne o conjunto completo de fatos da competência, corrigindo apenas o que o documento sustentar.`; const reviewAttempt = await callOpenAI(reviewModel, reviewInstructions, "Faça uma segunda leitura factual independente. Não force valores para fechar totais.", factsSchema, "payroll_facts_review", 9000, "facts_review"); factsResult = reviewAttempt.parsed as FactsResult; normalized = applyDeterministicRules(factsResult.facts ?? [], accounts, competence); validation = validateEntries(normalized.entries, reference.totals ?? [], [...referenceValidation.issues, ...normalized.issues]); reviewed = true }
    const warnings = [...new Set([...actionableWarnings(reference.warnings ?? []), ...actionableWarnings(factsResult.warnings ?? [])])]; const validationIssues = [...new Set([...validation.issues, ...(warnings.length ? ["Existem pontos que exigem decisão humana antes da exportação."] : [])])]; const validated = referenceValidation.verified && validation.passed && warnings.length === 0;
    return json({ entries: normalized.entries, deferredEntries: normalized.deferredEntries, documentTotals: reference.totals, comparisons: validation.comparisons, validationIssues, warnings, referenceVerified: referenceValidation.verified, validated, model: primaryModel, primaryModel, reviewed, reviewModel: reviewed ? reviewModel : null, routing: reviewed ? "terra-reference + terra-facts + terra-targeted-review" : "terra-reference + terra-facts", reference_response_id: referenceAttempt.raw.id, facts_response_id: factsAttempt.raw.id });
  } catch (error) { console.error("process-accounting-document", error); return json({ error: error instanceof Error ? error.message : String(error) }, 500) }
});
