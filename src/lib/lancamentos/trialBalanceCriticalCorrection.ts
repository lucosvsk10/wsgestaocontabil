import { AccountingExportEntry } from "./accountingExportWorkbook";
import { ExpenseEntry } from "./expenseWorkbook";
import { PayrollEntry } from "./payrollWorkbook";
import { PurchaseEntry, PurchaseReference } from "./purchaseWorkbook";
import { RevenueEntry, RevenueReference } from "./revenueWorkbook";
import {
  applyTrialBalanceAdjustments,
  TrialBalanceAutoAdjustment,
  TrialBalanceAutoPlan,
  TrialBalanceAutoTarget,
  TrialBalanceObservation,
} from "./trialBalanceAutoAdjustment";
import {
  analyticalTrialBalanceRows,
  normalizeTrialBalanceText,
  signedBalance,
  summarizeTrialBalance,
  TrialBalanceRow,
  validateTrialBalanceRow,
} from "./trialBalance";
import {
  projectedReferenceBalance,
  reconcileReferenceLedger,
  TrialBalanceReferenceLedger,
  TrialBalanceReferenceLedgerEntry,
} from "./trialBalanceReferenceLedger";
import { loadWorkspaceData } from "./workspaceStorage";

interface ExpensePayload { entries?: ExpenseEntry[]; }
interface PayrollPayload { entries?: PayrollEntry[]; referenceVerified?: boolean; validated?: boolean; }
interface PurchasePayload { entries?: PurchaseEntry[]; reference?: PurchaseReference | null; referenceVerified?: boolean; }
interface RevenuePayload { entries?: RevenueEntry[]; reference?: RevenueReference | null; referenceVerified?: boolean; }
interface TrialBalancePayload { rows?: TrialBalanceRow[]; }

export interface TrialBalanceCashPolicy {
  baseInCents: number;
  minInCents: number;
  maxInCents: number;
  source?: string;
}

export interface CriticalTrialBalancePlan extends TrialBalanceAutoPlan {
  remainingCriticalObservations: TrialBalanceObservation[];
  correctionComplete: boolean;
  previousBalanceVerified: boolean;
  referenceSource?: string | null;
  referenceCoveredCount?: number;
  referenceMissingCount?: number;
  referenceIssues?: string[];
}

const aliases = {
  cash: ["caixa matriz", "caixa geral", "caixa"],
  clients: ["clientes diversos", "clientes", "duplicatas a receber"],
  inventory: ["material aplicado", "mercadorias p/revenda", "mercadorias para revenda", "estoques"],
  suppliers: ["fornecedores diversos", "fornecedores"],
  salaries: ["salarios a pagar", "salários a pagar"],
  vacation: ["ferias a pagar", "férias a pagar"],
  termination: ["rescisao a pagar", "rescisão a pagar"],
  thirteenth: ["13 salario a pagar", "13º salário a pagar"],
  fgts: ["fgts a recolher", "fgts à recolher"],
  inss: ["inss a recolher", "inss à recolher", "inss á recolher"],
  irrf: ["irrf s salarios a recolher", "irrf s/salarios a recolher", "irrf a recolher"],
  prolabore: ["pro labore a pagar", "pro-labore a pagar", "pró-labore a pagar"],
  simples: ["simples a recolher", "simples à recolher"],
  serviceRevenue: ["venda de servicos", "venda de serviços", "prestacao de servicos", "prestação de serviços"],
  merchandiseRevenue: ["revendas de mercadorias", "revenda de mercadorias"],
  simplesExpense: ["impostos simples", "(-) simples", "simples"],
  salaryExpense: ["salarios", "salários"],
  overtimeExpense: ["horas extras", "hora extra"],
  vacationExpense: ["ferias", "férias"],
  prolaboreExpense: ["pro-labore", "pro labore", "pró-labore"],
  mealExpense: ["vale alimentacao/refeicao", "vale alimentação/refeição", "alimentacao do trabalhador"],
  recoveryExpense: ["recup. desp. c/pessoal", "recup desp c/pessoal"],
  fgtsExpense: ["fgts"],
} as const;

type AliasKey = keyof typeof aliases;

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(cents) / 100);
const rowSigned = (row: TrialBalanceRow) => signedBalance(row.currentBalanceInCents, row.currentNature);

function findRow(rows: TrialBalanceRow[], key: AliasKey) {
  const expected = aliases[key].map(normalizeTrialBalanceText);
  const candidates = rows.filter(row => {
    const title = normalizeTrialBalanceText(row.title);
    if (key === "cash" && (title.includes("banco") || title.includes("sicoob"))) return false;
    if (key === "simplesExpense" && (title.includes("recolher") || title.includes("obrig"))) return false;
    if (key === "fgtsExpense" && title.includes("recolher")) return false;
    if (key.endsWith("Expense") && (title.includes("pagar") || title.includes("recolher"))) return false;
    return expected.some(alias => title === alias || title.includes(alias));
  });
  const analyticalIds = new Set(analyticalTrialBalanceRows(rows).map(row => row.id));
  return candidates.find(row => analyticalIds.has(row.id) && row.reducedCode)
    ?? candidates.find(row => row.reducedCode)
    ?? candidates.at(-1)
    ?? null;
}

function findByDescription(rows: TrialBalanceRow[], description: string | undefined) {
  if (!description?.trim()) return null;
  const needle = normalizeTrialBalanceText(description).replace(/^\(-\)\s*/, "");
  const analytical = analyticalTrialBalanceRows(rows).filter(row => row.reducedCode);
  return analytical.find(row => normalizeTrialBalanceText(row.title) === needle)
    ?? analytical.find(row => {
      const title = normalizeTrialBalanceText(row.title);
      return needle.length >= 4 && (title.includes(needle) || needle.includes(title));
    })
    ?? null;
}

function isPreviousBalanceVerified(rows: TrialBalanceRow[]) {
  return rows.length > 0 && rows.every(row => row.previousBalanceRead === true);
}

function materialArithmeticTolerance(row: TrialBalanceRow) {
  const scale = Math.abs(signedBalance(row.previousBalanceInCents, row.previousNature)) + row.debitInCents + row.creditInCents + Math.abs(rowSigned(row));
  return Math.max(10_000, Math.round(scale * 0.005));
}

function criticalObservation(row: TrialBalanceRow, headline: string, message: string, source: string, suggestedSignedInCents?: number): TrialBalanceObservation {
  return {
    id: `${row.id}:${headline}`,
    rowId: row.id,
    reducedCode: row.reducedCode,
    title: row.title,
    severity: "critical",
    headline,
    message,
    currentSignedInCents: rowSigned(row),
    suggestedSignedInCents,
    source,
  };
}

function analyzeCriticalRows(rows: TrialBalanceRow[], cashPolicy?: TrialBalanceCashPolicy | null) {
  const observations: TrialBalanceObservation[] = [];
  const push = (item: TrialBalanceObservation) => {
    if (!observations.some(existing => existing.id === item.id)) observations.push(item);
  };

  for (const row of analyticalTrialBalanceRows(rows)) {
    const arithmetic = validateTrialBalanceRow(row);
    if (Math.abs(arithmetic) > materialArithmeticTolerance(row)) {
      push(criticalObservation(row, "A linha não fecha", `A diferença aritmética é ${money(arithmetic)}.`, "Saldo anterior + débitos - créditos × saldo atual"));
    }
  }

  const cash = findRow(rows, "cash");
  const clients = findRow(rows, "clients");
  const suppliers = findRow(rows, "suppliers");
  const liabilityKeys: AliasKey[] = ["salaries", "vacation", "termination", "thirteenth", "fgts", "inss", "irrf", "prolabore", "simples"];

  if (cash) {
    const current = rowSigned(cash);
    if (current < -1) {
      push(criticalObservation(cash, "Caixa está credor", `O Caixa está em ${money(current)} C.`, "Natureza esperada da conta Caixa"));
    } else if (cashPolicy && current > cashPolicy.maxInCents) {
      push(criticalObservation(cash, "Caixa acima da faixa da empresa", `O Caixa está em ${money(current)} D; a faixa aprendida é ${money(cashPolicy.minInCents)} a ${money(cashPolicy.maxInCents)}.`, cashPolicy.source || "Política aprendida da empresa", cashPolicy.baseInCents));
    }
  }

  if (clients && rowSigned(clients) < -100_000) push(criticalObservation(clients, "Clientes está credor", `Clientes está em ${money(rowSigned(clients))} C.`, "Natureza esperada de Clientes"));
  if (suppliers && rowSigned(suppliers) > 100_000) push(criticalObservation(suppliers, "Fornecedores está devedor", `Fornecedores está em ${money(rowSigned(suppliers))} D.`, "Natureza esperada de Fornecedores"));

  for (const key of liabilityKeys) {
    const row = findRow(rows, key);
    if (row && rowSigned(row) > 100_000) push(criticalObservation(row, "Obrigação com natureza devedora", `${row.title} está em ${money(rowSigned(row))} D.`, "Natureza esperada de obrigação"));
  }

  return observations;
}

function targetFor(row: TrialBalanceRow, key: string, label: string, signedTarget: number, source: string): TrialBalanceAutoTarget {
  return { key, label, row, currentSignedInCents: rowSigned(row), targetSignedInCents: signedTarget, source, confidence: 0.99 };
}

function asAdjustment(entry: AccountingExportEntry, rows: TrialBalanceRow[], reason: string): TrialBalanceAutoAdjustment {
  const debit = analyticalTrialBalanceRows(rows).find(row => row.reducedCode === entry.debitCode);
  const credit = analyticalTrialBalanceRows(rows).find(row => row.reducedCode === entry.creditCode);
  return {
    ...entry,
    targetKey: `ledger:${entry.debitCode}:${entry.creditCode}:${entry.history}`,
    currentSignedInCents: debit ? rowSigned(debit) : 0,
    targetSignedInCents: debit ? rowSigned(debit) + entry.amountInCents : 0,
    mappingReason: reason,
  };
}

function closingDate(month: string, year: string) {
  return `${String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, "0")}/${month}/${year}`;
}

function movementTotal(entries: Array<{ amountInCents: number }>) {
  return entries.reduce((sum, entry) => sum + Math.abs(entry.amountInCents), 0);
}

function previousCompetence(month: string, year: string) {
  const date = new Date(Number(year), Number(month) - 2, 1);
  return { month: String(date.getMonth() + 1).padStart(2, "0"), year: String(date.getFullYear()) };
}

function nextCompetence(month: string, year: string) {
  const date = new Date(Number(year), Number(month), 1);
  return { month: String(date.getMonth() + 1).padStart(2, "0"), year: String(date.getFullYear()) };
}

function entry(date: string, debit: TrialBalanceRow | null, credit: TrialBalanceRow | null, amountInCents: number, history: string, debitCostCenter = "", creditCostCenter = ""): TrialBalanceReferenceLedgerEntry | null {
  if (!debit?.reducedCode || !credit?.reducedCode || amountInCents <= 0) return null;
  return { date, debitCode: debit.reducedCode, debitCostCenter, creditCode: credit.reducedCode, creditCostCenter, amountInCents, history, source: "Motor de fechamento da competência" };
}

function rebindModuleEntry(rows: TrialBalanceRow[], item: PayrollEntry | PurchaseEntry | RevenueEntry | ExpenseEntry): TrialBalanceReferenceLedgerEntry | null {
  const date = item.date;
  const event = String((item as PayrollEntry & { eventType?: string }).eventType || "");
  const history = item.history;
  const amount = item.amountInCents;
  let debit = analyticalTrialBalanceRows(rows).find(row => row.reducedCode === item.debitCode) ?? null;
  let credit = analyticalTrialBalanceRows(rows).find(row => row.reducedCode === item.creditCode) ?? null;

  if (event === "service_revenue") { debit = findRow(rows, "clients"); credit = findRow(rows, "serviceRevenue"); }
  else if (event === "merchandise_revenue") { debit = findRow(rows, "clients"); credit = findRow(rows, "merchandiseRevenue"); }
  else if (event === "pgdas") { debit = findRow(rows, "simplesExpense"); credit = findRow(rows, "simples"); }
  else if (event === "merchandise_purchase") { debit = findRow(rows, "inventory"); credit = findRow(rows, "suppliers"); }
  else if (event === "fgts") { debit = findRow(rows, "fgtsExpense"); credit = findRow(rows, "fgts"); }
  else if (event === "prolabore") { debit = findRow(rows, "prolaboreExpense"); credit = findRow(rows, "prolabore"); }
  else if (event === "overtime") { debit = findRow(rows, "overtimeExpense"); credit = findRow(rows, "salaries"); }
  else if (event === "vacation_earning") { debit = findRow(rows, "vacationExpense"); credit = findRow(rows, "vacation"); }
  else if (event === "inss") { debit = findRow(rows, "salaries"); credit = findRow(rows, "inss"); }
  else if (event === "irrf") { debit = findRow(rows, "salaries"); credit = findRow(rows, "irrf"); }
  else if (event === "meal_discount" || event === "health_discount" || event === "dental_discount") { debit = findRow(rows, "salaries"); credit = findRow(rows, "recoveryExpense"); }
  else if (event === "meal_earning") { debit = findRow(rows, "mealExpense"); credit = findRow(rows, "salaries"); }
  else if (event === "salary_earning" || normalizeTrialBalanceText(history).includes("salario")) { debit = findByDescription(rows, item.debitDescription) ?? findRow(rows, "salaryExpense"); credit = findRow(rows, "salaries"); }
  else {
    debit = debit ?? findByDescription(rows, item.debitDescription);
    credit = credit ?? findByDescription(rows, item.creditDescription);
  }

  return entry(date, debit, credit, amount, history, item.debitCostCenter || "", item.creditCostCenter || "");
}

function previousMonthPayments(rows: TrialBalanceRow[], month: string, year: string, previousRows: TrialBalanceRow[] | undefined) {
  const cash = findRow(rows, "cash");
  const date = closingDate(month, year);
  const previous = previousCompetence(month, year);
  const result: TrialBalanceReferenceLedgerEntry[] = [];
  const payableKeys: AliasKey[] = ["salaries", "vacation", "termination", "thirteenth", "fgts", "inss", "irrf", "prolabore", "simples"];
  for (const key of payableKeys) {
    const row = findRow(rows, key);
    if (!row || row.previousNature !== "C" || row.previousBalanceInCents <= 0) continue;
    const label = key === "salaries" ? "SALÁRIOS E REMUNERAÇÕES" : key === "vacation" ? "FÉRIAS" : key === "termination" ? "RESCISÃO" : key === "thirteenth" ? "13º SALÁRIO" : key === "fgts" ? "FGTS" : key === "inss" ? "INSS" : key === "irrf" ? "IRRF S/SALÁRIOS" : key === "prolabore" ? "PRO-LABORE" : "SIMPLES NACIONAL";
    const item = entry(date, row, cash, row.previousBalanceInCents, `PAGTO. ${label} REF. ${previous.month}/${previous.year}`);
    if (item) result.push(item);
  }

  const suppliers = findRow(rows, "suppliers");
  if (cash && suppliers && previousRows?.length) {
    const priorPurchaseCandidates = analyticalTrialBalanceRows(previousRows).filter(row => {
      const title = normalizeTrialBalanceText(row.title);
      return (title.includes("mercadorias p/revenda") || title.includes("mercadorias para revenda") || title.includes("compras de merc")) && row.debitInCents > 0;
    });
    const priorPurchase = Math.max(0, ...priorPurchaseCandidates.map(row => row.debitInCents));
    const supplierPayment = Math.round(priorPurchase * 0.85);
    const item = entry(date, suppliers, cash, supplierPayment, `PAGTO. FORNECEDORES REF. ${previous.month}/${previous.year}`);
    if (item) result.push(item);
  }
  return result;
}

function cashTargetFromNextMonth(rows: TrialBalanceRow[], nextRows?: TrialBalanceRow[]) {
  const cash = findRow(rows, "cash");
  if (!cash || !nextRows?.length) return null;
  const nextCash = findRow(nextRows, "cash");
  if (!nextCash || nextCash.previousBalanceRead !== true) return null;
  return signedBalance(nextCash.previousBalanceInCents, nextCash.previousNature);
}

async function buildFallbackLedger(company: string, month: string, year: string, rows: TrialBalanceRow[], expenses: ExpensePayload | null, payroll: PayrollPayload | null, purchases: PurchasePayload | null, revenue: RevenuePayload | null) {
  const previous = previousCompetence(month, year);
  const next = nextCompetence(month, year);
  const [previousBalance, nextBalance, cashPolicy] = await Promise.all([
    loadWorkspaceData<TrialBalancePayload>(`${company}:${previous.year}:${previous.month}:balancete:parsed`),
    loadWorkspaceData<TrialBalancePayload>(`${company}:${next.year}:${next.month}:balancete:parsed`),
    loadWorkspaceData<TrialBalanceCashPolicy>(`${company}:balancete:cash-policy`),
  ]);
  const date = closingDate(month, year);
  const expected: TrialBalanceReferenceLedgerEntry[] = [];

  if (revenue?.referenceVerified !== false) for (const item of revenue?.entries ?? []) { const mapped = rebindModuleEntry(rows, item); if (mapped) expected.push(mapped); }
  if (purchases?.referenceVerified !== false) for (const item of purchases?.entries ?? []) { const mapped = rebindModuleEntry(rows, item); if (mapped) expected.push(mapped); }
  if (payroll?.referenceVerified || payroll?.validated) for (const item of payroll?.entries ?? []) { if (item.amountInCents <= 0) continue; const mapped = rebindModuleEntry(rows, item); if (mapped) expected.push(mapped); }
  for (const item of expenses?.entries ?? []) { const mapped = rebindModuleEntry(rows, item); if (mapped) expected.push(mapped); }
  expected.push(...previousMonthPayments(rows, month, year, previousBalance?.rows));

  const provisional = reconcileReferenceLedger(rows, { entries: expected, source: "módulos da competência + pagamentos do mês anterior" });
  const previewBeforeReceipt = applyTrialBalanceAdjustments(rows, provisional.adjustments);
  const cash = findRow(previewBeforeReceipt, "cash");
  const clients = findRow(previewBeforeReceipt, "clients");
  const nextTarget = cashTargetFromNextMonth(rows, nextBalance?.rows);
  const policy = cashPolicy ?? null;
  const targetCash = nextTarget !== null && nextTarget >= 0
    ? nextTarget
    : policy?.baseInCents ?? 100_000;

  if (cash && clients) {
    const currentCash = rowSigned(cash);
    const currentClients = rowSigned(clients);
    const lower = policy?.minInCents ?? 50_000;
    const upper = policy?.maxInCents ?? 250_000;
    if (currentCash < lower) {
      const receipt = Math.min(Math.max(0, targetCash - currentCash), Math.max(0, currentClients));
      const item = entry(date, cash, clients, receipt, `RECEBIMENTO DE CLIENTES MÊS ${month}/${year}`);
      if (item) expected.push(item);
    } else if (currentCash > upper) {
      const excess = currentCash - targetCash;
      const item = entry(date, clients, cash, excess, `RECLASSIFICAÇÃO DE CAIXA REF. ${month}/${year}`);
      if (item) expected.push(item);
    }
  }

  return { ledger: { entries: expected, source: "módulos da competência + pagamentos + política de Caixa" } satisfies TrialBalanceReferenceLedger, cashPolicy: policy, targetCash };
}

export async function buildCriticalTrialBalancePlan(company: string, month: string, year: string, rows: TrialBalanceRow[]): Promise<CriticalTrialBalancePlan> {
  const prefix = `${company}:${year}:${month}`;
  const [expenses, payroll, purchases, revenue, approvedReference, cashPolicy] = await Promise.all([
    loadWorkspaceData<ExpensePayload>(`${prefix}:despesas:parsed`),
    loadWorkspaceData<PayrollPayload>(`${prefix}:folha:parsed`),
    loadWorkspaceData<PurchasePayload>(`${prefix}:compras:parsed`),
    loadWorkspaceData<RevenuePayload>(`${prefix}:faturamento:parsed`),
    loadWorkspaceData<TrialBalanceReferenceLedger>(`${prefix}:balancete:reference-ledger`),
    loadWorkspaceData<TrialBalanceCashPolicy>(`${company}:balancete:cash-policy`),
  ]);

  const revenueTotal = revenue?.reference?.totalAmountInCents ?? movementTotal(revenue?.entries ?? []);
  const purchaseTotal = purchases?.reference?.totalAmountInCents ?? movementTotal(purchases?.entries ?? []);
  const operatingScale = Math.max(1, revenueTotal + purchaseTotal + movementTotal(expenses?.entries ?? []) + Math.round(movementTotal(payroll?.entries ?? []) / 2));
  const previousBalanceVerified = isPreviousBalanceVerified(rows);

  let ledger = approvedReference?.entries?.length ? approvedReference : null;
  let effectiveCashPolicy = cashPolicy ?? null;
  let fallbackCashTarget: number | null = null;
  if (!ledger) {
    const fallback = await buildFallbackLedger(company, month, year, rows, expenses, payroll, purchases, revenue);
    ledger = fallback.ledger;
    effectiveCashPolicy = fallback.cashPolicy;
    fallbackCashTarget = fallback.targetCash;
  }

  const reconciliation = reconcileReferenceLedger(rows, ledger);
  const adjustments = reconciliation.adjustments.map(item => asAdjustment(item, rows, approvedReference?.entries?.length
    ? `Ausente no balancete quando comparado ao fechamento manual aprovado (${approvedReference.sourceFileName || "referência da competência"}).`
    : "Ausente no balancete quando comparado aos módulos, pagamentos e política de fechamento."));
  const previewRows = applyTrialBalanceAdjustments(rows, adjustments as AccountingExportEntry[]);
  const observations = analyzeCriticalRows(rows, effectiveCashPolicy);
  const remainingCriticalObservations = analyzeCriticalRows(previewRows, effectiveCashPolicy);
  const referenceIssues: string[] = [];

  if (reconciliation.missingAccountCodes.length) referenceIssues.push(`O Balancete não contém os C.R. ${reconciliation.missingAccountCodes.join(", ")} exigidos pela referência desta competência.`);

  const cash = findRow(rows, "cash");
  const previewCash = findRow(previewRows, "cash");
  const expectedCash = approvedReference?.expectedClosingCashInCents ?? fallbackCashTarget;
  if (previewCash && expectedCash !== null && expectedCash !== undefined && Math.abs(rowSigned(previewCash) - expectedCash) > 1) {
    remainingCriticalObservations.push(criticalObservation(previewCash, "Caixa não atingiu o fechamento esperado", `A prévia ficou em ${money(rowSigned(previewCash))}; esperado ${money(expectedCash)}.`, approvedReference?.sourceFileName || effectiveCashPolicy?.source || "Política de fechamento", expectedCash));
  }

  const targetCodes = new Set(ledger.entries.flatMap(item => [item.debitCode, item.creditCode]));
  const targets: TrialBalanceAutoTarget[] = analyticalTrialBalanceRows(rows)
    .filter(row => targetCodes.has(row.reducedCode))
    .map(row => {
      const preview = previewRows.find(item => item.id === row.id) ?? row;
      return targetFor(row, row.reducedCode, row.title, rowSigned(preview), approvedReference?.entries?.length ? "Fechamento manual aprovado da competência." : "Fechamento calculado a partir dos módulos e pagamentos.");
    });

  const summary = summarizeTrialBalance(previewRows);
  const uniqueCritical = [...new Map(remainingCriticalObservations.map(item => [item.id, item])).values()];
  const correctionComplete = previousBalanceVerified
    && referenceIssues.length === 0
    && uniqueCritical.length === 0
    && Math.abs(summary.movementDifferenceInCents) <= 1
    && Math.abs(summary.currentSignedInCents) <= 1;

  const referenceSource = approvedReference?.entries?.length
    ? approvedReference.sourceFileName || approvedReference.source || "fechamento manual aprovado"
    : "módulos da competência + pagamentos + política de Caixa";
  const contextSummary = [
    approvedReference?.entries?.length
      ? `Referência atual: ${referenceSource}. ${reconciliation.coveredEntries.length} lançamento(s) já estavam no Balancete e ${reconciliation.missingEntries.length} estavam faltando.`
      : `Fechamento reconstruído com os módulos atuais, obrigações do mês anterior e política de Caixa. ${reconciliation.missingEntries.length} lançamento(s) faltantes.`,
    `Faturamento factual ${money(revenueTotal)} · compras factuais ${money(purchaseTotal)} · escala operacional ${money(operatingScale)}.`,
    previousBalanceVerified ? "Saldo Anterior foi lido explicitamente em todas as linhas; 0,00 literal é aceito normalmente." : "Saldo Anterior não foi confirmado em todas as linhas; a correção não pode ser concluída.",
    correctionComplete ? "A prévia reproduz o fechamento esperado e fecha matematicamente." : `A prévia ainda tem ${uniqueCritical.length + referenceIssues.length} pendência(s) material(is) e NÃO será marcada como corrigida.`,
  ];

  return {
    competence: `${month}/${year}`,
    observations,
    targets,
    adjustments,
    previewRows,
    remainingCriticalObservations: uniqueCritical,
    correctionComplete,
    previousBalanceVerified,
    referenceSource,
    referenceCoveredCount: reconciliation.coveredEntries.length,
    referenceMissingCount: reconciliation.missingEntries.length,
    referenceIssues,
    currentCashSignedInCents: cash ? rowSigned(cash) : null,
    targetCashSignedInCents: expectedCash ?? null,
    projectedCashSignedInCents: previewCash ? rowSigned(previewCash) : null,
    operatingScaleInCents: operatingScale,
    contextSummary,
    generatedAt: new Date().toISOString(),
  };
}

export function criticalTrialBalancePlanIsCorrected(plan: CriticalTrialBalancePlan | null | undefined) {
  return Boolean(plan?.correctionComplete && plan.previousBalanceVerified && plan.remainingCriticalObservations.length === 0 && !(plan.referenceIssues?.length));
}
