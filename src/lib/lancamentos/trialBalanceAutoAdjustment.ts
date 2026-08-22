import { AccountingExportEntry } from "./accountingExportWorkbook";
import { ExpenseEntry } from "./expenseWorkbook";
import { PayrollEntry } from "./payrollWorkbook";
import { PurchaseEntry, PurchaseReference } from "./purchaseWorkbook";
import { RevenueEntry, RevenueReference } from "./revenueWorkbook";
import {
  analyticalTrialBalanceRows,
  normalizeTrialBalanceText,
  signedBalance,
  summarizeTrialBalance,
  TrialBalanceRow,
  validateTrialBalanceRow,
} from "./trialBalance";
import { loadWorkspaceData } from "./workspaceStorage";

type MovementEntry = PayrollEntry | PurchaseEntry | RevenueEntry | ExpenseEntry;
type TargetKey = keyof typeof aliases;

interface ExpensePayload { entries?: ExpenseEntry[]; }
interface PayrollPayload { entries?: PayrollEntry[]; }
interface PurchasePayload { entries?: PurchaseEntry[]; reference?: PurchaseReference | null; }
interface RevenuePayload { entries?: RevenueEntry[]; reference?: RevenueReference | null; }
interface TrialBalancePayload { rows?: TrialBalanceRow[]; }

export type TrialBalanceObservationSeverity = "warning" | "critical";

export interface TrialBalanceObservation {
  id: string;
  rowId: string;
  reducedCode: string;
  title: string;
  severity: TrialBalanceObservationSeverity;
  headline: string;
  message: string;
  currentSignedInCents: number;
  suggestedSignedInCents?: number;
  source: string;
}

export interface TrialBalanceAutoTarget {
  key: string;
  label: string;
  row: TrialBalanceRow;
  currentSignedInCents: number;
  targetSignedInCents: number;
  source: string;
  confidence: number;
}

export interface TrialBalanceAutoAdjustment extends AccountingExportEntry {
  targetKey: string;
  currentSignedInCents: number;
  targetSignedInCents: number;
}

export interface TrialBalanceAutoPlan {
  competence: string;
  observations: TrialBalanceObservation[];
  targets: TrialBalanceAutoTarget[];
  adjustments: TrialBalanceAutoAdjustment[];
  previewRows: TrialBalanceRow[];
  currentCashSignedInCents: number | null;
  targetCashSignedInCents: number | null;
  projectedCashSignedInCents: number | null;
  operatingScaleInCents: number;
  contextSummary: string[];
  generatedAt: string;
}

const aliases = {
  cash: ["caixa matriz", "caixa geral", "caixa"],
  clients: ["clientes diversos", "clientes", "duplicatas a receber"],
  suppliers: ["fornecedores diversos", "fornecedores"],
  salaries: ["salarios a pagar", "salários a pagar", "salários à pagar"],
  vacation: ["ferias a pagar", "férias a pagar", "férias à pagar"],
  termination: ["rescisao a pagar", "rescisão a pagar", "rescisão à pagar"],
  thirteenth: ["13 salario a pagar", "13º salário a pagar", "13º salário á pagar"],
  fgts: ["fgts a recolher", "fgts à recolher"],
  inss: ["inss a recolher", "inss á recolher", "inss à recolher"],
  irrf: ["irrf s salarios a recolher", "irrf s/salários à recolher", "irrf a recolher"],
  prolabore: ["pro labore a pagar", "pro-labore a pagar", "pro-labore à pagar", "pró-labore à pagar"],
  simples: ["simples a recolher", "simples à recolher"],
} as const;

const labels: Record<TargetKey, string> = {
  cash: "Caixa",
  clients: "Clientes",
  suppliers: "Fornecedores",
  salaries: "Salários a pagar",
  vacation: "Férias a pagar",
  termination: "Rescisão a pagar",
  thirteenth: "13º salário a pagar",
  fgts: "FGTS a recolher",
  inss: "INSS a recolher",
  irrf: "IRRF a recolher",
  prolabore: "Pró-labore a pagar",
  simples: "Simples a recolher",
};

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(cents) / 100);
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const rowSigned = (row: TrialBalanceRow) => signedBalance(row.currentBalanceInCents, row.currentNature);

function findRow(rows: TrialBalanceRow[], key: TargetKey) {
  const expected = aliases[key].map(normalizeTrialBalanceText);
  const candidates = rows.filter(row => {
    const title = normalizeTrialBalanceText(row.title);
    if (key === "cash" && (title.includes("banco") || title.includes("sicoob"))) return false;
    return expected.some(alias => title === alias || title.includes(alias));
  });
  return candidates.find(row => row.reducedCode && !row.reducedCode.endsWith("000")) ?? candidates.at(-1) ?? null;
}

function sameAccount(rows: TrialBalanceRow[] | undefined, row: TrialBalanceRow) {
  if (!rows?.length) return null;
  return rows.find(candidate => candidate.reducedCode && candidate.reducedCode === row.reducedCode)
    ?? rows.find(candidate => normalizeTrialBalanceText(candidate.title) === normalizeTrialBalanceText(row.title))
    ?? null;
}

function movement(entries: MovementEntry[], reducedCode: string) {
  return entries.reduce((signed, entry) => {
    if (entry.debitCode === reducedCode) signed += entry.amountInCents;
    if (entry.creditCode === reducedCode) signed -= entry.amountInCents;
    return signed;
  }, 0);
}

function total(entries: Array<{ amountInCents: number }>) {
  return entries.reduce((sum, entry) => sum + Math.abs(entry.amountInCents), 0);
}

function previousCompetence(month: string, year: string) {
  const date = new Date(Number(year), Number(month) - 2, 1);
  return { month: String(date.getMonth() + 1).padStart(2, "0"), year: String(date.getFullYear()) };
}

function lowCashTarget(company: string, month: string, year: string, scale: number) {
  const input = `${company}:${year}:${month}:${scale}`;
  let hash = 0;
  for (const char of input) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return 62_000 + (hash % 36_000);
}

function isLowCashAccount(row: TrialBalanceRow) {
  const title = normalizeTrialBalanceText(row.title);
  return title.includes("caixa matriz") || title === "caixa";
}

function payrollOrTaxTarget(entries: Array<PayrollEntry | RevenueEntry>, row: TrialBalanceRow) {
  const touched = entries.some(entry => entry.debitCode === row.reducedCode || entry.creditCode === row.reducedCode);
  return touched ? movement(entries, row.reducedCode) : null;
}

function target(key: string, label: string, row: TrialBalanceRow, targetSignedInCents: number, source: string, confidence = 0.9): TrialBalanceAutoTarget {
  return { key, label, row, currentSignedInCents: rowSigned(row), targetSignedInCents, source, confidence };
}

function observe(list: TrialBalanceObservation[], row: TrialBalanceRow, severity: TrialBalanceObservationSeverity, headline: string, message: string, source: string, suggestedSignedInCents?: number) {
  const id = `${row.id}:${headline}`;
  if (list.some(item => item.id === id)) return;
  list.push({ id, rowId: row.id, reducedCode: row.reducedCode, title: row.title, severity, headline, message, currentSignedInCents: rowSigned(row), suggestedSignedInCents, source });
}

function formatBalance(signed: number) {
  return Math.abs(signed) <= 1 ? "R$ 0,00" : `${money(signed)} ${signed > 0 ? "D" : "C"}`;
}

function closingDate(competence: string) {
  const [month, year] = competence.split("/").map(Number);
  return `${String(new Date(year, month, 0).getDate()).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function adjustmentFor(item: TrialBalanceAutoTarget, cash: TrialBalanceRow, competence: string): TrialBalanceAutoAdjustment | null {
  if (item.key === "cash") return null;
  const delta = item.targetSignedInCents - item.currentSignedInCents;
  if (Math.abs(delta) <= 1) return null;
  const debitTarget = delta > 0;
  return {
    targetKey: item.key,
    currentSignedInCents: item.currentSignedInCents,
    targetSignedInCents: item.targetSignedInCents,
    date: closingDate(competence),
    amountInCents: Math.abs(delta),
    debitCode: debitTarget ? item.row.reducedCode : cash.reducedCode,
    creditCode: debitTarget ? cash.reducedCode : item.row.reducedCode,
    history: `AJUSTE BALANCETE ${item.label.toUpperCase()} REF. ${competence}`,
    debitCostCenter: "",
    creditCostCenter: "",
    debitDescription: debitTarget ? item.row.title : cash.title,
    creditDescription: debitTarget ? cash.title : item.row.title,
    referenceCode: item.row.reducedCode,
    referenceDescription: item.label,
    type: "ajuste_balancete",
    section: "balancete",
    mappingSource: "predefined",
    mappingReason: item.source,
  };
}

function path(code: string) {
  const parts = code.split(".").map(Number);
  let last = parts.length - 1;
  while (last >= 0 && (!Number.isFinite(parts[last]) || parts[last] === 0)) last -= 1;
  return parts.slice(0, last + 1).map(part => Number.isFinite(part) ? part : 0);
}

function descendant(parent: number[], child: number[]) {
  return parent.length > 0 && child.length > parent.length && parent.every((part, index) => child[index] === part);
}

function nature(signed: number): { amount: number; nature: "D" | "C" | "" } {
  if (Math.abs(signed) <= 1) return { amount: 0, nature: "" };
  return { amount: Math.abs(signed), nature: signed > 0 ? "D" : "C" };
}

export function applyTrialBalanceAdjustments(rows: TrialBalanceRow[], adjustments: AccountingExportEntry[]) {
  const direct = rows.map(row => {
    const debit = row.debitInCents + adjustments.filter(item => item.debitCode === row.reducedCode).reduce((sum, item) => sum + item.amountInCents, 0);
    const credit = row.creditInCents + adjustments.filter(item => item.creditCode === row.reducedCode).reduce((sum, item) => sum + item.amountInCents, 0);
    const current = signedBalance(row.previousBalanceInCents, row.previousNature) + debit - credit;
    const value = nature(current);
    return { ...row, debitInCents: debit, creditInCents: credit, currentBalanceInCents: value.amount, currentNature: value.nature };
  });

  const analytical = analyticalTrialBalanceRows(direct);
  const analyticalPaths = analytical.map(row => ({ row, path: path(row.accountCode) }));
  const analyticalIds = new Set(analytical.map(row => row.id));

  return direct.map(row => {
    if (analyticalIds.has(row.id)) return row;
    const parentPath = path(row.accountCode);
    const children = analyticalPaths.filter(item => descendant(parentPath, item.path)).map(item => item.row);
    if (!children.length) return row;
    const previousSigned = children.reduce((sum, child) => sum + signedBalance(child.previousBalanceInCents, child.previousNature), 0);
    const currentSigned = children.reduce((sum, child) => sum + signedBalance(child.currentBalanceInCents, child.currentNature), 0);
    const previousValue = nature(previousSigned);
    const currentValue = nature(currentSigned);
    return {
      ...row,
      previousBalanceInCents: previousValue.amount,
      previousNature: previousValue.nature,
      debitInCents: children.reduce((sum, child) => sum + child.debitInCents, 0),
      creditInCents: children.reduce((sum, child) => sum + child.creditInCents, 0),
      currentBalanceInCents: currentValue.amount,
      currentNature: currentValue.nature,
    };
  });
}

export async function buildDynamicTrialBalancePlan(company: string, month: string, year: string, rows: TrialBalanceRow[]): Promise<TrialBalanceAutoPlan> {
  const competence = `${month}/${year}`;
  const prefix = `${company}:${year}:${month}`;
  const previous = previousCompetence(month, year);
  const [expenses, payroll, purchases, revenue, previousBalance, priorYearBalance] = await Promise.all([
    loadWorkspaceData<ExpensePayload>(`${prefix}:despesas:parsed`),
    loadWorkspaceData<PayrollPayload>(`${prefix}:folha:parsed`),
    loadWorkspaceData<PurchasePayload>(`${prefix}:compras:parsed`),
    loadWorkspaceData<RevenuePayload>(`${prefix}:faturamento:parsed`),
    loadWorkspaceData<TrialBalancePayload>(`${company}:${previous.year}:${previous.month}:balancete:parsed`),
    loadWorkspaceData<TrialBalancePayload>(`${company}:${Number(year) - 1}:${month}:balancete:parsed`),
  ]);

  const expenseEntries = expenses?.entries ?? [];
  const payrollEntries = payroll?.entries ?? [];
  const purchaseEntries = purchases?.entries ?? [];
  const revenueEntries = revenue?.entries ?? [];
  const revenueTotal = revenue?.reference?.totalAmountInCents ?? revenueEntries.filter(entry => !normalizeTrialBalanceText(entry.rubricDescription).includes("pgdas")).reduce((sum, entry) => sum + entry.amountInCents, 0);
  const purchaseTotal = purchases?.reference?.totalAmountInCents ?? total(purchaseEntries);
  const expenseTotal = total(expenseEntries);
  const payrollScale = total(payrollEntries);
  const operatingScale = Math.max(1, revenueTotal + purchaseTotal + expenseTotal + Math.round(payrollScale / 2));
  const observations: TrialBalanceObservation[] = [];
  const targets: TrialBalanceAutoTarget[] = [];
  const contextSummary = [
    `Movimento analisado: faturamento ${money(revenueTotal)}, compras ${money(purchaseTotal)}, despesas ${money(expenseTotal)}.`,
    previousBalance?.rows?.length ? `Mês anterior (${previous.month}/${previous.year}) usado como referência.` : "Sem mês anterior salvo; análise baseada nos módulos da competência.",
    priorYearBalance?.rows?.length ? `Mesmo mês de ${Number(year) - 1} usado apenas para detectar repetição artificial.` : "Sem mesmo mês do ano anterior salvo.",
  ];

  for (const row of rows) {
    const arithmetic = validateTrialBalanceRow(row);
    if (Math.abs(arithmetic) > 1) observe(observations, row, "critical", "A linha não fecha matematicamente", `Saldo anterior + débitos - créditos diverge do saldo atual em ${money(arithmetic)}.`, "Validação aritmética do Balancete");
    const priorYear = sameAccount(priorYearBalance?.rows, row);
    if (priorYear && row.currentBalanceInCents > 0 && row.currentBalanceInCents === priorYear.currentBalanceInCents && row.currentNature === priorYear.currentNature) {
      const movementDelta = Math.abs((row.debitInCents + row.creditInCents) - (priorYear.debitInCents + priorYear.creditInCents));
      if (movementDelta > Math.max(100, (row.debitInCents + row.creditInCents) * 0.02)) observe(observations, row, "warning", "Saldo repetido entre exercícios", `O saldo é exatamente igual ao de ${month}/${Number(year) - 1}, apesar de o movimento ter mudado. O motor não reutiliza valores fechados de outro ano.`, "Comparação interanual");
    }
  }

  const cashRow = findRow(rows, "cash");
  const clientsRow = findRow(rows, "clients");
  const suppliersRow = findRow(rows, "suppliers");

  if (cashRow) {
    const current = rowSigned(cashRow);
    const lowPolicy = isLowCashAccount(cashRow);
    const ceiling = Math.max(100_000, Math.round(operatingScale * 0.04));
    const desired = lowPolicy ? lowCashTarget(company, month, year, operatingScale) : Math.min(Math.round(ceiling * 0.65), Math.max(100_000, current));
    targets.push(target("cash", labels.cash, cashRow, desired, lowPolicy ? "Residual de Caixa variável, calculado com a competência; não copia outro mês/ano." : "Faixa de Caixa calculada proporcionalmente ao movimento.", 0.86));
    if (current < 0) observe(observations, cashRow, "critical", "Caixa com saldo credor", "Caixa patrimonial não deve encerrar credor. Banco é tratado separadamente e não entra nesta manobra.", "Natureza contábil esperada", desired);
    else if (current > ceiling || (lowPolicy && current > 100_000)) observe(observations, cashRow, "warning", "Caixa muito alto", `O Caixa encerrou em ${money(current)} e está alto para o movimento de ${competence}. A correção calcula um residual diferente para cada competência e desloca a diferença para contas patrimoniais coerentes.`, lowPolicy ? "Política histórica do Caixa Matriz + movimento da competência" : "Proporção do movimento operacional", desired);
  }

  const payrollKeys: TargetKey[] = ["salaries", "vacation", "termination", "thirteenth", "fgts", "inss", "irrf", "prolabore"];
  for (const key of payrollKeys) {
    const row = findRow(rows, key);
    if (!row) continue;
    const reconstructed = key === "thirteenth" && month === "12" ? 0 : payrollOrTaxTarget(payrollEntries, row);
    if (reconstructed === null) continue;
    const source = key === "thirteenth" && month === "12" ? "Em dezembro, 13º salário a pagar deve encerrar zerado após a quitação." : `Saldo reconstruído pelos lançamentos conferidos da Folha de ${competence}.`;
    targets.push(target(key, labels[key], row, reconstructed, source, 0.96));
    if (Math.abs(reconstructed - rowSigned(row)) > Math.max(100, Math.abs(reconstructed) * 0.01)) observe(observations, row, "warning", `${labels[key]} fora do reconstruído`, `Balancete: ${formatBalance(rowSigned(row))}. Lançamentos da competência: ${formatBalance(reconstructed)}.`, source, reconstructed);
  }

  const simplesRow = findRow(rows, "simples");
  if (simplesRow) {
    const reconstructed = payrollOrTaxTarget(revenueEntries, simplesRow);
    if (reconstructed !== null) {
      targets.push(target("simples", labels.simples, simplesRow, reconstructed, `PGDAS conferido de ${competence}.`, 0.97));
      if (Math.abs(reconstructed - rowSigned(simplesRow)) > Math.max(100, Math.abs(reconstructed) * 0.01)) observe(observations, simplesRow, "warning", "Simples não acompanha o PGDAS", `Balancete: ${formatBalance(rowSigned(simplesRow))}. Apuração: ${formatBalance(reconstructed)}.`, "Faturamento / PGDAS", reconstructed);
    }
  }

  if (suppliersRow) {
    const current = rowSigned(suppliersRow);
    const previousRow = sameAccount(previousBalance?.rows, suppliersRow);
    const previousMagnitude = previousRow ? Math.max(0, -rowSigned(previousRow)) : Math.max(0, -current - purchaseTotal);
    const cash = cashRow ? Math.max(0, rowSigned(cashRow)) : 0;
    const liquidity = Math.max(0, cash + revenueTotal - expenseTotal - Math.round(payrollScale / 2));
    const base = Math.max(1, previousMagnitude + purchaseTotal);
    const rate = clamp(0.45 + (liquidity / base) * 0.45, 0.45, 0.90);
    const magnitude = Math.max(purchaseTotal, Math.round(purchaseTotal + previousMagnitude * (1 - rate)));
    const expected = -magnitude;
    const source = `Compras do mês + resíduo do saldo anterior. Pagamento calculado em ${(rate * 100).toFixed(1)}% pela liquidez de ${competence}; a taxa muda com o exercício.`;
    targets.push(target("suppliers", labels.suppliers, suppliersRow, expected, source, 0.82));
    if (current > 0) observe(observations, suppliersRow, "critical", "Fornecedores com saldo devedor", "Fornecedores normalmente encerra credor.", "Natureza contábil esperada", expected);
    else if (Math.abs(current - expected) > Math.max(10_000, magnitude * 0.12)) observe(observations, suppliersRow, "warning", "Fornecedores fora do ciclo esperado", `Saldo atual ${formatBalance(current)}; ciclo calculado ${formatBalance(expected)}.`, source, expected);
  }

  if (clientsRow) {
    const current = rowSigned(clientsRow);
    const previousRow = sameAccount(previousBalance?.rows, clientsRow);
    const previousClients = previousRow ? Math.max(0, rowSigned(previousRow)) : 0;
    const cash = cashRow ? Math.max(0, rowSigned(cashRow)) : 0;
    const pressure = clamp((purchaseTotal + expenseTotal + Math.round(payrollScale / 2) - cash) / Math.max(1, revenueTotal), 0, 1);
    const yearEndRatio = clamp(0.14 + pressure * 0.10, 0.14, 0.24);
    const expected = month === "12" ? Math.round(revenueTotal * yearEndRatio) : Math.max(0, Math.round(previousClients * 0.05));
    const source = month === "12" ? `Recebimento parcial de dezembro; residual dinâmico de ${(yearEndRatio * 100).toFixed(1)}% conforme pressão de caixa.` : "Durante o ano, prioriza recebimento e mantém apenas resíduo justificado pelo ciclo anterior.";
    targets.push(target("clients", labels.clients, clientsRow, expected, source, 0.82));
    if (current < 0) observe(observations, clientsRow, "critical", "Clientes com saldo credor", "Clientes deve encerrar devedor ou zerado, salvo reclassificação documentada.", "Natureza contábil esperada", expected);
  }

  const cashTarget = targets.find(item => item.key === "cash");
  let adjustments = cashRow ? targets.map(item => adjustmentFor(item, cashRow, competence)).filter((item): item is TrialBalanceAutoAdjustment => Boolean(item)) : [];
  let projectedCash = cashRow ? rowSigned(cashRow) : null;
  if (cashRow && projectedCash !== null) for (const item of adjustments) projectedCash += item.debitCode === cashRow.reducedCode ? item.amountInCents : item.creditCode === cashRow.reducedCode ? -item.amountInCents : 0;

  if (cashRow && clientsRow && cashTarget && projectedCash !== null) {
    const index = targets.findIndex(item => item.key === "clients");
    const baseClient = index >= 0 ? targets[index] : target("clients", labels.clients, clientsRow, rowSigned(clientsRow), "Contrapartida patrimonial do fechamento.", 0.78);
    const residual = projectedCash - cashTarget.targetSignedInCents;
    if (Math.abs(residual) > 1) {
      const revised = { ...baseClient, targetSignedInCents: Math.max(0, baseClient.targetSignedInCents + residual), source: `${baseClient.source} Diferença de Caixa de ${money(residual)} absorvida por Clientes.` };
      if (index >= 0) targets[index] = revised; else targets.push(revised);
      if (Math.abs(revised.targetSignedInCents - rowSigned(clientsRow)) > 1) observe(observations, clientsRow, "warning", "Clientes participa do ajuste de Caixa", `Clientes passa de ${formatBalance(rowSigned(clientsRow))} para ${formatBalance(revised.targetSignedInCents)} para evitar Caixa artificialmente alto.`, "Fechamento integrado Caixa ↔ Clientes", revised.targetSignedInCents);
      adjustments = targets.map(item => adjustmentFor(item, cashRow, competence)).filter((item): item is TrialBalanceAutoAdjustment => Boolean(item));
      projectedCash = rowSigned(cashRow);
      for (const item of adjustments) projectedCash += item.debitCode === cashRow.reducedCode ? item.amountInCents : item.creditCode === cashRow.reducedCode ? -item.amountInCents : 0;
    }
  }

  if (previousBalance?.rows?.length) {
    for (const row of analyticalTrialBalanceRows(rows)) {
      const prior = sameAccount(previousBalance.rows, row);
      if (!prior) continue;
      const currentMagnitude = Math.abs(rowSigned(row));
      const priorMagnitude = Math.abs(rowSigned(prior));
      const movementMagnitude = row.debitInCents + row.creditInCents;
      if (priorMagnitude > 0 && currentMagnitude > priorMagnitude * 3.5 && currentMagnitude > operatingScale * 0.35) observe(observations, row, "warning", "Saldo cresceu muito", `A conta passou de ${formatBalance(rowSigned(prior))} para ${formatBalance(rowSigned(row))}.`, "Comparação com mês anterior");
      if (movementMagnitude > 10_000 && currentMagnitude === priorMagnitude && row.currentNature === prior.currentNature) observe(observations, row, "warning", "Saldo repetido apesar de movimento", `A conta teve ${money(movementMagnitude)} de movimento e terminou exatamente como o mês anterior.`, "Comparação com mês anterior");
    }
  }

  const previewRows = applyTrialBalanceAdjustments(rows, adjustments);
  const previewSummary = summarizeTrialBalance(previewRows);
  contextSummary.push(`Prévia: ${adjustments.length} ajuste(s); diferença débitos x créditos ${money(previewSummary.movementDifferenceInCents)}.`);

  return {
    competence,
    observations: observations.sort((a, b) => a.severity === b.severity ? a.title.localeCompare(b.title) : a.severity === "critical" ? -1 : 1),
    targets,
    adjustments,
    previewRows,
    currentCashSignedInCents: cashRow ? rowSigned(cashRow) : null,
    targetCashSignedInCents: cashTarget?.targetSignedInCents ?? null,
    projectedCashSignedInCents: projectedCash,
    operatingScaleInCents: operatingScale,
    contextSummary,
    generatedAt: new Date().toISOString(),
  };
}

export function trialBalancePlanIsConferable(plan: TrialBalanceAutoPlan | null) {
  if (!plan?.previewRows.length || !plan.adjustments.length) return false;
  const summary = summarizeTrialBalance(plan.previewRows);
  const arithmeticIssue = plan.previewRows.some(row => Math.abs(validateTrialBalanceRow(row)) > 1);
  const unresolvedCritical = plan.observations.some(item => item.severity === "critical" && item.suggestedSignedInCents === undefined);
  const cashOk = plan.targetCashSignedInCents === null || plan.projectedCashSignedInCents === null || Math.abs(plan.projectedCashSignedInCents - plan.targetCashSignedInCents) <= 1;
  return Math.abs(summary.movementDifferenceInCents) <= 1 && Math.abs(summary.currentSignedInCents) <= 1 && !arithmeticIssue && !unresolvedCritical && cashOk;
}
