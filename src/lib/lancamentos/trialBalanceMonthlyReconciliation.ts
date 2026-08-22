import { AccountingExportEntry } from "./accountingExportWorkbook";
import { ChartAccount } from "./chartOfAccounts";
import { applyConfiguredCostCenters } from "./costCenters";
import { ExpenseEntry } from "./expenseWorkbook";
import { PayrollEntry } from "./payrollWorkbook";
import { PurchaseEntry, PurchaseReference } from "./purchaseWorkbook";
import { RevenueEntry, RevenueReference } from "./revenueWorkbook";
import { TrialBalanceAutoTarget, TrialBalanceObservation } from "./trialBalanceAutoAdjustment";
import {
  analyticalTrialBalanceRows,
  normalizeTrialBalanceText,
  signedBalance,
  TrialBalanceRow,
  validateTrialBalanceRow,
} from "./trialBalance";
import { loadWorkspaceData } from "./workspaceStorage";

interface ExpensePayload { entries?: ExpenseEntry[]; }
interface PayrollPayload { entries?: PayrollEntry[]; }
interface PurchasePayload { entries?: PurchaseEntry[]; reference?: PurchaseReference | null; }
interface RevenuePayload { entries?: RevenueEntry[]; reference?: RevenueReference | null; }

export interface TrialBalanceClosingPolicy {
  supplierPaymentRateByYear?: Record<string, number>;
  cashTargetMinInCents?: number;
  cashTargetMaxInCents?: number;
  cashTargetAnchorInCents?: number;
  payPriorLiabilitiesFully?: boolean;
  source?: string;
}

export interface CriticalTrialBalancePlan {
  competence: string;
  observations: TrialBalanceObservation[];
  targets: TrialBalanceAutoTarget[];
  adjustments: AccountingExportEntry[];
  previewRows: TrialBalanceRow[];
  remainingCriticalObservations: TrialBalanceObservation[];
  correctionComplete: boolean;
  previousBalanceVerified: boolean;
  currentCashSignedInCents: number | null;
  targetCashSignedInCents: number | null;
  projectedCashSignedInCents: number | null;
  operatingScaleInCents: number;
  contextSummary: string[];
  expectedEntryCount: number;
  alreadyPostedCount: number;
  missingEntryCount: number;
  costCenterIssues: string[];
  generatedAt: string;
}

const aliases = {
  cash: ["caixa matriz", "caixa geral", "caixa"],
  clients: ["clientes diversos", "clientes", "duplicatas a receber"],
  suppliers: ["fornecedores diversos", "fornecedores"],
  salaries: ["salarios a pagar", "salários a pagar"],
  vacation: ["ferias a pagar", "férias a pagar"],
  termination: ["rescisao a pagar", "rescisão a pagar"],
  thirteenth: ["13 salario a pagar", "13º salário a pagar"],
  fgts: ["fgts a recolher", "fgts à recolher"],
  inss: ["inss a recolher", "inss à recolher"],
  irrf: ["irrf s salarios a recolher", "irrf a recolher", "irrf s/salários à recolher"],
  prolabore: ["pro labore a pagar", "pro-labore a pagar", "pró-labore a pagar"],
  simples: ["simples a recolher", "simples à recolher"],
} as const;

type AliasKey = keyof typeof aliases;

type ResidualMovement = {
  debit: Map<string, number>;
  credit: Map<string, number>;
};

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(cents) / 100);
const rowSigned = (row: TrialBalanceRow) => signedBalance(row.currentBalanceInCents, row.currentNature);
const previousSigned = (row: TrialBalanceRow) => signedBalance(row.previousBalanceInCents, row.previousNature);

function findRow(rows: TrialBalanceRow[], key: AliasKey) {
  const expected = aliases[key].map(normalizeTrialBalanceText);
  const analyticalIds = new Set(analyticalTrialBalanceRows(rows).map(row => row.id));
  const candidates = rows.filter(row => {
    const title = normalizeTrialBalanceText(row.title);
    if (key === "cash" && (title.includes("banco") || title.includes("sicoob"))) return false;
    return expected.some(alias => title === alias || title.includes(alias));
  });
  return candidates.find(row => analyticalIds.has(row.id) && row.reducedCode)
    ?? candidates.find(row => row.reducedCode)
    ?? candidates.at(-1)
    ?? null;
}

function findByReducedCode(rows: TrialBalanceRow[], reducedCode: string) {
  return analyticalTrialBalanceRows(rows).find(row => row.reducedCode === reducedCode)
    ?? rows.find(row => row.reducedCode === reducedCode)
    ?? null;
}

function previousBalancesVerified(rows: TrialBalanceRow[]) {
  return rows.length > 0 && rows.every(row => (row as TrialBalanceRow & { previousBalanceRead?: boolean }).previousBalanceRead === true);
}

function previousCompetence(month: string, year: string) {
  const date = new Date(Number(year), Number(month) - 2, 1);
  return { month: String(date.getMonth() + 1).padStart(2, "0"), year: String(date.getFullYear()) };
}

function closingDate(month: string, year: string) {
  return `${String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, "0")}/${month}/${year}`;
}

function total(entries: Array<{ amountInCents: number }>) {
  return entries.reduce((sum, entry) => sum + Math.abs(entry.amountInCents), 0);
}

function toExportEntry(row: ExpenseEntry | PayrollEntry | PurchaseEntry | RevenueEntry, section: string): AccountingExportEntry {
  const extended = row as PayrollEntry | PurchaseEntry | RevenueEntry;
  return {
    date: row.date,
    amountInCents: row.amountInCents,
    debitCode: row.debitCode,
    creditCode: row.creditCode,
    history: row.history,
    debitCostCenter: row.debitCostCenter,
    creditCostCenter: row.creditCostCenter,
    debitDescription: row.debitDescription,
    creditDescription: row.creditDescription,
    referenceCode: "rubricCode" in extended ? extended.rubricCode : undefined,
    referenceDescription: "rubricDescription" in extended ? extended.rubricDescription : undefined,
    type: "kind" in extended ? extended.kind : "despesa",
    section,
    mappingSource: "mappingSource" in extended ? extended.mappingSource : "predefined",
    mappingReason: "mappingReason" in extended ? extended.mappingReason : `Lançamento conferido no módulo ${section}.`,
  };
}

function journal(date: string, amount: number, debit: TrialBalanceRow, credit: TrialBalanceRow, history: string, reason: string, type: string): AccountingExportEntry {
  return {
    date,
    amountInCents: Math.max(0, Math.round(amount)),
    debitCode: debit.reducedCode,
    creditCode: credit.reducedCode,
    history,
    debitCostCenter: "",
    creditCostCenter: "",
    debitDescription: debit.title,
    creditDescription: credit.title,
    referenceCode: type,
    referenceDescription: history,
    type,
    section: "balancete",
    mappingSource: "predefined",
    mappingReason: reason,
  };
}

function stableCashTarget(company: string, month: string, year: string, policy: TrialBalanceClosingPolicy) {
  const minimum = Math.max(0, policy.cashTargetMinInCents ?? 60_000);
  const maximum = Math.max(minimum, policy.cashTargetMaxInCents ?? 180_000);
  const anchor = Math.min(maximum, Math.max(minimum, policy.cashTargetAnchorInCents ?? 100_000));
  let hash = 0;
  for (const char of `${company}:${year}:${month}`) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const span = Math.max(1, maximum - minimum + 1);
  const randomWithinBand = minimum + (hash % span);
  // Puxa a variação para perto da âncora sem repetir exatamente o mesmo valor todo mês.
  return Math.round(anchor * 0.55 + randomWithinBand * 0.45);
}

function supplierRate(policy: TrialBalanceClosingPolicy, year: string, operatingScale: number, previousPurchaseTotal: number) {
  const learned = Number(policy.supplierPaymentRateByYear?.[year]);
  if (Number.isFinite(learned) && learned > 0 && learned <= 1) return learned;
  if (!previousPurchaseTotal) return 0;
  // Fallback adaptativo: mais liquidez operacional permite quitar uma parcela maior.
  const scaleRatio = Math.min(1, operatingScale / Math.max(previousPurchaseTotal, 1));
  return Math.min(0.90, Math.max(0.50, 0.55 + scaleRatio * 0.25));
}

function movementMap(rows: TrialBalanceRow[]): ResidualMovement {
  const debit = new Map<string, number>();
  const credit = new Map<string, number>();
  analyticalTrialBalanceRows(rows).forEach(row => {
    if (!row.reducedCode) return;
    debit.set(row.reducedCode, (debit.get(row.reducedCode) ?? 0) + row.debitInCents);
    credit.set(row.reducedCode, (credit.get(row.reducedCode) ?? 0) + row.creditInCents);
  });
  return { debit, credit };
}

function consumeExpectedEntries(rows: TrialBalanceRow[], expected: AccountingExportEntry[]) {
  const residual = movementMap(rows);
  const posted: AccountingExportEntry[] = [];
  const missing: AccountingExportEntry[] = [];
  const tolerance = 2;

  expected.forEach(entry => {
    const debitAvailable = residual.debit.get(entry.debitCode) ?? 0;
    const creditAvailable = residual.credit.get(entry.creditCode) ?? 0;
    const amount = entry.amountInCents;
    if (debitAvailable + tolerance >= amount && creditAvailable + tolerance >= amount) {
      residual.debit.set(entry.debitCode, Math.max(0, debitAvailable - amount));
      residual.credit.set(entry.creditCode, Math.max(0, creditAvailable - amount));
      posted.push(entry);
    } else {
      missing.push(entry);
    }
  });

  return { posted, missing, residual };
}

function signedMovement(entries: AccountingExportEntry[], reducedCode: string) {
  return entries.reduce((sum, entry) => {
    if (entry.debitCode === reducedCode) sum += entry.amountInCents;
    if (entry.creditCode === reducedCode) sum -= entry.amountInCents;
    return sum;
  }, 0);
}

function paymentHistory(key: AliasKey, reference: string) {
  const labels: Partial<Record<AliasKey, string>> = {
    salaries: "PAGTO. SALÁRIOS E REMUNERAÇÕES",
    vacation: "PAGTO. FÉRIAS",
    termination: "PAGTO. RESCISÃO",
    thirteenth: "PAGTO. 13º SALÁRIO",
    fgts: "PAGTO. FGTS",
    inss: "PAGTO. INSS",
    irrf: "PAGTO. IRRF S/SALÁRIOS",
    prolabore: "PAGTO. PRO-LABORE",
    simples: "PAGTO. SIMPLES NACIONAL",
  };
  return `${labels[key] ?? "PAGTO."} REF. ${reference}`;
}

function materialThreshold(operatingScale: number) {
  return Math.max(100_000, Math.round(operatingScale * 0.005)); // pelo menos R$1.000
}

function critical(row: TrialBalanceRow, headline: string, message: string, source: string, suggested?: number): TrialBalanceObservation {
  return {
    id: `${row.id}:${headline}`,
    rowId: row.id,
    reducedCode: row.reducedCode,
    title: row.title,
    severity: "critical",
    headline,
    message,
    currentSignedInCents: rowSigned(row),
    suggestedSignedInCents: suggested,
    source,
  };
}

function accountTargets(rows: TrialBalanceRow[], previewRows: TrialBalanceRow[], missing: AccountingExportEntry[]) {
  const affected = new Set<string>();
  missing.forEach(entry => { affected.add(entry.debitCode); affected.add(entry.creditCode); });
  return Array.from(affected).map(code => {
    const current = findByReducedCode(rows, code);
    const preview = findByReducedCode(previewRows, code);
    if (!current || !preview) return null;
    return {
      key: `cr-${code}`,
      label: current.title,
      row: current,
      currentSignedInCents: rowSigned(current),
      targetSignedInCents: rowSigned(preview),
      source: "Saldo calculado pela reconciliação entre lançamentos esperados e movimentos já presentes no Balancete.",
      confidence: 0.99,
    } satisfies TrialBalanceAutoTarget;
  }).filter((item): item is TrialBalanceAutoTarget => Boolean(item));
}

function applyAdjustments(rows: TrialBalanceRow[], adjustments: AccountingExportEntry[]) {
  const direct = rows.map(row => {
    if (!row.reducedCode) return row;
    const debitAdded = adjustments.filter(entry => entry.debitCode === row.reducedCode).reduce((sum, entry) => sum + entry.amountInCents, 0);
    const creditAdded = adjustments.filter(entry => entry.creditCode === row.reducedCode).reduce((sum, entry) => sum + entry.amountInCents, 0);
    if (!debitAdded && !creditAdded) return row;
    const debitInCents = row.debitInCents + debitAdded;
    const creditInCents = row.creditInCents + creditAdded;
    const signed = previousSigned(row) + debitInCents - creditInCents;
    return {
      ...row,
      debitInCents,
      creditInCents,
      currentBalanceInCents: Math.abs(signed),
      currentNature: Math.abs(signed) <= 1 ? "" : signed > 0 ? "D" : "C",
    } as TrialBalanceRow;
  });

  // Recalcula contas sintéticas pela soma dos filhos analíticos. Não usa C.R. sintético como lançamento.
  const analytical = analyticalTrialBalanceRows(direct);
  const path = (code: string) => code.split(".").map(value => Number(value)).filter(value => Number.isFinite(value));
  const isChild = (parent: number[], child: number[]) => parent.length < child.length && parent.every((value, index) => child[index] === value);
  const analyticalPaths = analytical.map(row => ({ row, path: path(row.accountCode) }));
  const analyticalIds = new Set(analytical.map(row => row.id));

  return direct.map(row => {
    if (analyticalIds.has(row.id)) return row;
    const parent = path(row.accountCode);
    const children = analyticalPaths.filter(item => isChild(parent, item.path)).map(item => item.row);
    if (!children.length) return row;
    const previous = children.reduce((sum, child) => sum + previousSigned(child), 0);
    const current = children.reduce((sum, child) => sum + rowSigned(child), 0);
    return {
      ...row,
      previousBalanceInCents: Math.abs(previous),
      previousNature: Math.abs(previous) <= 1 ? "" : previous > 0 ? "D" : "C",
      debitInCents: children.reduce((sum, child) => sum + child.debitInCents, 0),
      creditInCents: children.reduce((sum, child) => sum + child.creditInCents, 0),
      currentBalanceInCents: Math.abs(current),
      currentNature: Math.abs(current) <= 1 ? "" : current > 0 ? "D" : "C",
    } as TrialBalanceRow;
  });
}

function criticalObservations(rows: TrialBalanceRow[], missing: AccountingExportEntry[], operatingScale: number, cashTarget: number | null) {
  const observations: TrialBalanceObservation[] = [];
  const threshold = materialThreshold(operatingScale);
  const add = (item: TrialBalanceObservation) => {
    if (!observations.some(existing => existing.id === item.id)) observations.push(item);
  };

  // Só destaca linhas com impacto material. Ajustes pequenos continuam sendo gerados sem poluir a tabela.
  const impact = new Map<string, number>();
  missing.forEach(entry => {
    impact.set(entry.debitCode, (impact.get(entry.debitCode) ?? 0) + entry.amountInCents);
    impact.set(entry.creditCode, (impact.get(entry.creditCode) ?? 0) + entry.amountInCents);
  });
  impact.forEach((amount, code) => {
    if (amount < threshold) return;
    const row = findByReducedCode(rows, code);
    if (!row) return;
    add(critical(row, "Movimento material ainda não lançado", `Faltam ${money(amount)} de lançamentos que atingem esta conta. O valor vem dos módulos já conferidos e/ou das quitações do fechamento.`, "Reconciliação do movimento mensal"));
  });

  for (const row of analyticalTrialBalanceRows(rows)) {
    const arithmetic = validateTrialBalanceRow(row);
    if (Math.abs(arithmetic) > threshold) add(critical(row, "Linha não fecha", `A diferença aritmética é ${money(arithmetic)}.`, "Saldo anterior + débitos - créditos × saldo atual"));
  }

  const cash = findRow(rows, "cash");
  if (cash) {
    const current = rowSigned(cash);
    if (current < -threshold) add(critical(cash, "Caixa está credor", `O Caixa está em ${money(current)} C. O fechamento precisa recompor a natureza devedora e levar o saldo para a faixa operacional baixa da empresa.`, "Política de fechamento de Caixa", cashTarget ?? undefined));
    else if (cashTarget !== null && current > Math.max(cashTarget * 8, threshold * 4)) add(critical(cash, "Caixa está muito acima da faixa", `O Caixa está em ${money(current)} D. A referência desta empresa é manter um residual baixo e variável, próximo de ${money(cashTarget)}.`, "Histórico de fechamento + movimento da competência", cashTarget));
  }

  const suppliers = findRow(rows, "suppliers");
  if (suppliers && rowSigned(suppliers) > threshold) add(critical(suppliers, "Fornecedores está devedor", `Fornecedores encerrou em ${money(rowSigned(suppliers))} D, natureza incompatível com a obrigação.`, "Natureza contábil esperada"));
  const clients = findRow(rows, "clients");
  if (clients && rowSigned(clients) < -threshold) add(critical(clients, "Clientes está credor", `Clientes encerrou em ${money(rowSigned(clients))} C sem reclassificação documentada.`, "Natureza contábil esperada"));

  return observations;
}

export async function buildCriticalTrialBalancePlan(company: string, month: string, year: string, rows: TrialBalanceRow[]): Promise<CriticalTrialBalancePlan> {
  const prefix = `${company}:${year}:${month}`;
  const previous = previousCompetence(month, year);
  const previousPrefix = `${company}:${previous.year}:${previous.month}`;
  const [expenses, payroll, purchases, revenue, previousPurchases, policy, accounts] = await Promise.all([
    loadWorkspaceData<ExpensePayload>(`${prefix}:despesas:parsed`),
    loadWorkspaceData<PayrollPayload>(`${prefix}:folha:parsed`),
    loadWorkspaceData<PurchasePayload>(`${prefix}:compras:parsed`),
    loadWorkspaceData<RevenuePayload>(`${prefix}:faturamento:parsed`),
    loadWorkspaceData<PurchasePayload>(`${previousPrefix}:compras:parsed`),
    loadWorkspaceData<TrialBalanceClosingPolicy>(`${company}:balancete:closing-policy`),
    loadWorkspaceData<ChartAccount[]>(`${company}:chart-of-accounts`),
  ]);

  const expenseEntries = (expenses?.entries ?? []).map(entry => toExportEntry(entry, "despesas"));
  const payrollEntries = (payroll?.entries ?? []).map(entry => toExportEntry(entry, "folha"));
  const purchaseEntries = (purchases?.entries ?? []).map(entry => toExportEntry(entry, "compras"));
  const revenueEntries = (revenue?.entries ?? []).map(entry => toExportEntry(entry, "faturamento"));
  const operationalEntries = [...expenseEntries, ...payrollEntries, ...purchaseEntries, ...revenueEntries];
  const revenueTotal = revenue?.reference?.totalAmountInCents ?? total(revenueEntries.filter(entry => !normalizeTrialBalanceText(entry.history).includes("pgdas")));
  const purchaseTotal = purchases?.reference?.totalAmountInCents ?? total(purchaseEntries);
  const previousPurchaseTotal = previousPurchases?.reference?.totalAmountInCents ?? total((previousPurchases?.entries ?? []));
  const operatingScale = Math.max(1, revenueTotal + purchaseTotal + total(expenseEntries) + Math.round(total(payrollEntries) / 2));
  const previousBalanceVerified = previousBalancesVerified(rows);
  const closingPolicy: TrialBalanceClosingPolicy = policy ?? {};
  const cashTarget = stableCashTarget(company, month, year, closingPolicy);
  const date = closingDate(month, year);
  const cash = findRow(rows, "cash");
  const clients = findRow(rows, "clients");
  const suppliers = findRow(rows, "suppliers");

  const closingEntries: AccountingExportEntry[] = [];
  const priorReference = `${previous.month}/${previous.year}`;
  const payFull = closingPolicy.payPriorLiabilitiesFully !== false;

  if (cash && payFull) {
    const liabilities: AliasKey[] = ["salaries", "vacation", "termination", "thirteenth", "fgts", "inss", "irrf", "prolabore", "simples"];
    liabilities.forEach(key => {
      const row = findRow(rows, key);
      if (!row || previousSigned(row) >= -1) return;
      const amount = Math.abs(previousSigned(row));
      closingEntries.push(journal(date, amount, row, cash, paymentHistory(key, priorReference), `Quitação integral do saldo anterior de ${row.title}, seguindo o ciclo mensal da empresa.`, `pagamento_${key}`));
    });

    if (suppliers) {
      const rate = supplierRate(closingPolicy, year, operatingScale, previousPurchaseTotal);
      const base = previousPurchaseTotal || Math.abs(Math.min(0, previousSigned(suppliers)));
      const amount = Math.round(base * rate);
      if (amount > 0) closingEntries.push(journal(date, amount, suppliers, cash, `PAGTO. FORNECEDORES REF. ${priorReference}`, `Pagamento de fornecedores calculado sobre as compras da competência anterior. Taxa aplicada nesta referência: ${(rate * 100).toFixed(1)}%.`, "pagamento_fornecedores"));
    }
  }

  const beforeReceipt = [...operationalEntries, ...closingEntries];
  if (cash && clients) {
    const cashBeforeReceipt = previousSigned(cash) + signedMovement(beforeReceipt, cash.reducedCode);
    const clientBeforeReceipt = previousSigned(clients) + signedMovement(beforeReceipt, clients.reducedCode);
    const neededReceipt = cashTarget - cashBeforeReceipt;
    const receipt = Math.min(Math.max(0, neededReceipt), Math.max(0, clientBeforeReceipt));
    if (receipt > 0) closingEntries.push(journal(date, receipt, cash, clients, `RECEBIMENTO DE CLIENTES MÊS ${month}/${year}`, `Recebimento calculado para manter o Caixa em residual baixo e variável (${money(cashTarget)}), limitado ao saldo real disponível em Clientes.`, "recebimento_clientes"));
  }

  let expectedEntries = [...operationalEntries, ...closingEntries].filter(entry => entry.amountInCents > 0 && entry.debitCode && entry.creditCode);
  expectedEntries = await applyConfiguredCostCenters(company, expectedEntries, accounts ?? []);
  const reconciliation = consumeExpectedEntries(rows, expectedEntries);
  const previewRows = applyAdjustments(rows, reconciliation.missing);
  const secondPass = consumeExpectedEntries(previewRows, expectedEntries);
  const projectedCash = cash ? findByReducedCode(previewRows, cash.reducedCode) : null;
  const observations = criticalObservations(rows, reconciliation.missing, operatingScale, cashTarget);
  const remainingCriticalObservations = criticalObservations(previewRows, secondPass.missing, operatingScale, cashTarget);
  const movementDifference = analyticalTrialBalanceRows(previewRows).reduce((sum, row) => sum + row.debitInCents - row.creditInCents, 0);
  const materialArithmeticProblems = analyticalTrialBalanceRows(previewRows).filter(row => Math.abs(validateTrialBalanceRow(row)) > materialThreshold(operatingScale));
  const projectedCashSigned = projectedCash ? rowSigned(projectedCash) : null;
  const cashWithinBand = projectedCashSigned === null || (projectedCashSigned >= (closingPolicy.cashTargetMinInCents ?? 60_000) && projectedCashSigned <= (closingPolicy.cashTargetMaxInCents ?? 180_000));
  const correctionComplete = previousBalanceVerified
    && secondPass.missing.length === 0
    && remainingCriticalObservations.length === 0
    && materialArithmeticProblems.length === 0
    && Math.abs(movementDifference) <= 1
    && cashWithinBand;

  const costCenterIssues = expectedEntries.flatMap((entry, index) => {
    const issues: string[] = [];
    if (entry.debitCostCenter === undefined || entry.creditCostCenter === undefined) issues.push(`Linha ${index + 1}: centro de custo não avaliado.`);
    return issues;
  });
  const targets = accountTargets(rows, previewRows, reconciliation.missing);
  const contextSummary = [
    `Reconciliação: ${expectedEntries.length} lançamento(s) esperados para ${month}/${year}; ${reconciliation.posted.length} já aparecem no movimento do Balancete e ${reconciliation.missing.length} estão faltando.`,
    `Caixa: saldo anterior ${cash ? money(previousSigned(cash)) + (previousSigned(cash) < 0 ? " C" : " D") : "não localizado"}; alvo operacional variável ${money(cashTarget)}; projetado ${projectedCashSigned === null ? "não localizado" : money(projectedCashSigned) + (projectedCashSigned < 0 ? " C" : " D")}.`,
    `Fechamento inclui módulos do mês + pagamentos das obrigações anteriores + fornecedores + recebimento de clientes. Despesas já presentes são reconhecidas e não são duplicadas.`,
    previousBalanceVerified ? "Saldo Anterior confirmado linha por linha, inclusive zeros literais." : "Saldo Anterior não confirmado em todas as linhas; correção bloqueada.",
  ];

  return {
    competence: `${month}/${year}`,
    observations,
    targets,
    adjustments: reconciliation.missing,
    previewRows,
    remainingCriticalObservations,
    correctionComplete,
    previousBalanceVerified,
    currentCashSignedInCents: cash ? rowSigned(cash) : null,
    targetCashSignedInCents: cashTarget,
    projectedCashSignedInCents: projectedCashSigned,
    operatingScaleInCents: operatingScale,
    contextSummary,
    expectedEntryCount: expectedEntries.length,
    alreadyPostedCount: reconciliation.posted.length,
    missingEntryCount: reconciliation.missing.length,
    costCenterIssues,
    generatedAt: new Date().toISOString(),
  };
}

export function criticalTrialBalancePlanIsCorrected(plan: CriticalTrialBalancePlan | null | undefined) {
  return Boolean(plan?.correctionComplete && plan.previousBalanceVerified && plan.remainingCriticalObservations.length === 0 && plan.missingEntryCount >= 0);
}

export const __test = { stableCashTarget, consumeExpectedEntries, supplierRate, applyAdjustments };
