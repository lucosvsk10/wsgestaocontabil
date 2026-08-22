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

type TargetKey = keyof typeof aliases;

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(cents) / 100);
const clamp = (value: number, minimum: number, maximum: number) => Math.min(maximum, Math.max(minimum, value));

function rowSigned(row: TrialBalanceRow) {
  return signedBalance(row.currentBalanceInCents, row.currentNature);
}

function findRow(rows: TrialBalanceRow[], key: TargetKey) {
  const normalizedAliases = aliases[key].map(normalizeTrialBalanceText);
  const candidates = rows.filter(row => {
    const title = normalizeTrialBalanceText(row.title);
    if (key === "cash" && (title.includes("banco") || title.includes("sicoob"))) return false;
    return normalizedAliases.some(alias => title === alias || title.includes(alias));
  });
  return candidates.find(row => row.reducedCode && !row.reducedCode.endsWith("000")) ?? candidates[candidates.length - 1] ?? null;
}

function findSameAccount(rows: TrialBalanceRow[] | undefined, row: TrialBalanceRow) {
  if (!rows?.length) return null;
  return rows.find(candidate => candidate.reducedCode && candidate.reducedCode === row.reducedCode)
    ?? rows.find(candidate => normalizeTrialBalanceText(candidate.title) === normalizeTrialBalanceText(row.title))
    ?? null;
}

function accountMovement(entries: Array<PayrollEntry | PurchaseEntry | RevenueEntry | ExpenseEntry>, reducedCode: string) {
  return entries.reduce((signed, entry) => {
    if (entry.debitCode === reducedCode) signed += entry.amountInCents;
    if (entry.creditCode === reducedCode) signed -= entry.amountInCents;
    return signed;
  }, 0);
}

function moduleAmount(entries: Array<{ amountInCents: number }>) {
  return entries.reduce((sum, entry) => sum + Math.abs(entry.amountInCents), 0);
}

function previousCompetence(month: string, year: string) {
  const date = new Date(Number(year), Number(month) - 2, 1);
  return { month: String(date.getMonth() + 1).padStart(2, "0"), year: String(date.getFullYear()) };
}

function stableLowCashTarget(company: string, month: string, year: string, operatingScale: number) {
  const seedText = `${company}:${year}:${month}:${operatingScale}`;
  let hash = 0;
  for (let index = 0; index < seedText.length; index += 1) hash = (hash * 31 + seedText.charCodeAt(index)) >>> 0;
  // Residual técnico variável entre R$ 620,00 e R$ 979,99. O valor muda conforme a competência e o movimento real.
  return 62_000 + (hash % 36_000);
}

function isLowCashAccount(row: TrialBalanceRow) {
  const title = normalizeTrialBalanceText(row.title);
  return title.includes("caixa matriz") || title === "caixa";
}

function liabilityTarget(entries: Array<PayrollEntry | RevenueEntry>, row: TrialBalanceRow) {
  const movement = accountMovement(entries, row.reducedCode);
  const touched = entries.some(entry => entry.debitCode === row.reducedCode || entry.creditCode === row.reducedCode);
  return touched ? movement : null;
}

function toTarget(key: string, label: string, row: TrialBalanceRow, targetSignedInCents: number, source: string, confidence = 0.9): TrialBalanceAutoTarget {
  return { key, label, row, currentSignedInCents: rowSigned(row), targetSignedInCents, source, confidence };
}

function addObservation(list: TrialBalanceObservation[], row: TrialBalanceRow, severity: TrialBalanceObservationSeverity, headline: string, message: string, source: string, suggestedSignedInCents?: number) {
  const signature = `${row.id}:${headline}`;
  if (list.some(item => item.id === signature)) return;
  list.push({
    id: signature,
    rowId: row.id,
    reducedCode: row.reducedCode,
    title: row.title,
    severity,
    headline,
    message,
    currentSignedInCents: rowSigned(row),
    suggestedSignedInCents,
    source,
  });
}

function targetLabel(key: TargetKey) {
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
  return labels[key];
}

function buildAdjustment(target: TrialBalanceAutoTarget, cashRow: TrialBalanceRow, competence: string): TrialBalanceAutoAdjustment | null {
  if (target.key === "cash") return null;
  const delta = target.targetSignedInCents - target.currentSignedInCents;
  if (Math.abs(delta) <= 1) return null;
  const debitTarget = delta > 0;
  return {
    targetKey: target.key,
    currentSignedInCents: target.currentSignedInCents,
    targetSignedInCents: target.targetSignedInCents,
    date: closingDate(competence),
    amountInCents: Math.abs(delta),
    debitCode: debitTarget ? target.row.reducedCode : cashRow.reducedCode,
    creditCode: debitTarget ? cashRow.reducedCode : target.row.reducedCode,
    history: `AJUSTE BALANCETE ${target.label.toUpperCase()} REF. ${competence}`,
    debitCostCenter: "",
    creditCostCenter: "",
    debitDescription: debitTarget ? target.row.title : cashRow.title,
    creditDescription: debitTarget ? cashRow.title : target.row.title,
    referenceCode: target.row.reducedCode,
    referenceDescription: target.label,
    type: "ajuste_balancete",
    section: "balancete",
    mappingSource: "predefined",
    mappingReason: target.source,
  };
}

function accountPath(code: string) {
  const parts = code.split(".").map(part => Number(part));
  let last = parts.length - 1;
  while (last >= 0 && (!Number.isFinite(parts[last]) || parts[last] === 0)) last -= 1;
  return parts.slice(0, last + 1).map(part => Number.isFinite(part) ? part : 0);
}

function isDescendant(parent: number[], child: number[]) {
  return parent.length > 0 && child.length > parent.length && parent.every((part, index) => child[index] === part);
}

function amountNature(signed: number): { amount: number; nature: "D" | "C" | "" } {
  if (Math.abs(signed) <= 1) return { amount: 0, nature: "" };
  return { amount: Math.abs(signed), nature: signed > 0 ? "D" : "C" };
}

export function applyTrialBalanceAdjustments(rows: TrialBalanceRow[], adjustments: AccountingExportEntry[]) {
  const direct = rows.map(row => {
    let debit = row.debitInCents;
    let credit = row.creditInCents;
    for (const adjustment of adjustments) {
      if (adjustment.debitCode === row.reducedCode) debit += adjustment.amountInCents;
      if (adjustment.creditCode === row.reducedCode) credit += adjustment.amountInCents;
    }
    const previous = signedBalance(row.previousBalanceInCents, row.previousNature);
    const current = previous + debit - credit;
    const balance = amountNature(current);
    return { ...row, debitInCents: debit, creditInCents: credit, currentBalanceInCents: balance.amount, currentNature: balance.nature };
  });

  const analytical = analyticalTrialBalanceRows(direct);
  const analyticalPaths = analytical.map(row => ({ row, path: accountPath(row.accountCode) }));

  return direct.map(row => {
    if (analytical.some(item => item.id === row.id)) return row;
    const path = accountPath(row.accountCode);
    const descendants = analyticalPaths.filter(item => isDescendant(path, item.path)).map(item => item.row);
    if (!descendants.length) return row;
    const previousSigned = descendants.reduce((sum, child) => sum + signedBalance(child.previousBalanceInCents, child.previousNature), 0);
    const currentSigned = descendants.reduce((sum, child) => sum + signedBalance(child.currentBalanceInCents, child.currentNature), 0);
    const previous = amountNature(previousSigned);
    const current = amountNature(currentSigned);
    return {
      ...row,
      previousBalanceInCents: previous.amount,
      previousNature: previous.nature,
      debitInCents: descendants.reduce((sum, child) => sum + child.debitInCents, 0),
      creditInCents: descendants.reduce((sum, child) => sum + child.creditInCents, 0),
      currentBalanceInCents: current.amount,
      currentNature: current.nature,
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
  const purchaseTotal = purchases?.reference?.totalAmountInCents ?? moduleAmount(purchaseEntries);
  const expenseTotal = moduleAmount(expenseEntries);
  const payrollScale = moduleAmount(payrollEntries);
  const operatingScale = Math.max(1, revenueTotal + purchaseTotal + expenseTotal + Math.round(payrollScale / 2));

  const observations: TrialBalanceObservation[] = [];
  const targets: TrialBalanceAutoTarget[] = [];
  const contextSummary: string[] = [
    `Movimento usado na análise: faturamento ${money(revenueTotal)}, compras ${money(purchaseTotal)}, despesas ${money(expenseTotal)}.`,
    previousBalance?.rows?.length ? `Comparação com ${previous.month}/${previous.year} disponível.` : "Sem balancete do mês anterior salvo; a análise usa os módulos da competência e o próprio balancete.",
    priorYearBalance?.rows?.length ? `Comparação com ${month}/${Number(year) - 1} disponível para detectar repetição artificial de saldos.` : "Sem o mesmo mês do ano anterior salvo para comparação direta.",
  ];

  for (const row of rows) {
    const arithmeticDifference = validateTrialBalanceRow(row);
    if (Math.abs(arithmeticDifference) > 1) {
      addObservation(observations, row, "critical", "A linha não fecha matematicamente", `Saldo anterior + débitos - créditos não chega ao saldo atual. Diferença de ${money(arithmeticDifference)}.`, "Validação aritmética do próprio Balancete");
    }

    const priorSame = findSameAccount(priorYearBalance?.rows, row);
    if (priorSame && row.currentBalanceInCents > 0 && row.currentBalanceInCents === priorSame.currentBalanceInCents && row.currentNature === priorSame.currentNature) {
      const movementChanged = Math.abs((row.debitInCents + row.creditInCents) - (priorSame.debitInCents + priorSame.creditInCents));
      if (movementChanged > Math.max(100, Math.round((row.debitInCents + row.creditInCents) * 0.02))) {
        addObservation(observations, row, "warning", "Saldo repetido entre anos", `O saldo atual é exatamente igual ao de ${month}/${Number(year) - 1}, apesar de o movimento da conta ter mudado. Isso é incomum e precisa ser revisado; o motor não reutiliza valores fechados de outro ano.`, "Comparação interanual");
      }
    }
  }

  const cashRow = findRow(rows, "cash");
  const clientsRow = findRow(rows, "clients");
  const suppliersRow = findRow(rows, "suppliers");

  let desiredCash: number | null = null;
  if (cashRow) {
    const currentCash = rowSigned(cashRow);
    const lowCashPolicy = isLowCashAccount(cashRow);
    const relativeCeiling = Math.max(100_000, Math.round(operatingScale * 0.04));
    desiredCash = lowCashPolicy ? stableLowCashTarget(company, month, year, operatingScale) : Math.min(Math.round(relativeCeiling * 0.65), Math.max(100_000, currentCash));

    if (currentCash < 0) {
      addObservation(observations, cashRow, "critical", "Caixa com saldo credor", "Caixa patrimonial não deve encerrar credor. O fechamento automático vai recompor o saldo por meio dos ajustes de recebimentos/pagamentos, sem alterar contas bancárias.", "Natureza contábil esperada", desiredCash);
    } else if (currentCash > relativeCeiling || (lowCashPolicy && currentCash > 100_000)) {
      addObservation(observations, cashRow, "warning", "Caixa muito alto para o movimento", `O Caixa encerrou em ${money(currentCash)}. Para esta conta, o valor está acima do padrão esperado em relação ao movimento de ${competence}. A correção automática calcula um residual variável para a competência e desloca a diferença para contas patrimoniais coerentes, principalmente Clientes.`, lowCashPolicy ? "Política histórica da conta Caixa Matriz + movimento real da competência" : "Proporção do movimento operacional da competência", desiredCash);
    }
    targets.push(toTarget("cash", "Caixa", cashRow, desiredCash, lowCashPolicy ? "Residual técnico de Caixa calculado pela competência; não replica valor de outro mês/ano." : "Faixa de Caixa calculada proporcionalmente ao movimento operacional.", 0.86));
  }

  // Obrigações correntes: o saldo esperado vem dos lançamentos já conferidos da própria competência.
  const payrollKeys: TargetKey[] = ["salaries", "vacation", "termination", "thirteenth", "fgts", "inss", "irrf", "prolabore"];
  for (const key of payrollKeys) {
    const row = findRow(rows, key);
    if (!row) continue;
    let target = liabilityTarget(payrollEntries, row);
    if (key === "thirteenth" && month === "12") target = 0;
    if (target === null) continue;
    const current = rowSigned(row);
    const source = key === "thirteenth" && month === "12"
      ? "Fechamento de dezembro: 13º salário a pagar deve ficar zerado após a quitação."
      : `Saldo reconstruído pelos lançamentos conferidos da Folha em ${competence}.`;
    targets.push(toTarget(key, targetLabel(key), row, target, source, 0.96));
    if (Math.abs(target - current) > Math.max(100, Math.abs(target) * 0.01)) {
      addObservation(observations, row, "warning", `${targetLabel(key)} fora do saldo reconstruído`, `O balancete mostra ${formatBalance(current)}, mas os lançamentos conferidos da competência apontam ${formatBalance(target)}.`, source, target);
    }
  }

  const simplesRow = findRow(rows, "simples");
  if (simplesRow) {
    const target = liabilityTarget(revenueEntries, simplesRow);
    if (target !== null) {
      const current = rowSigned(simplesRow);
      targets.push(toTarget("simples", "Simples a recolher", simplesRow, target, `PGDAS conferido de ${competence}.`, 0.97));
      if (Math.abs(target - current) > Math.max(100, Math.abs(target) * 0.01)) {
        addObservation(observations, simplesRow, "warning", "Simples não acompanha o PGDAS", `O saldo atual é ${formatBalance(current)} e a apuração conferida indica ${formatBalance(target)}.`, "Faturamento / PGDAS da competência", target);
      }
    }
  }

  if (suppliersRow) {
    const current = rowSigned(suppliersRow);
    const previousRow = findSameAccount(previousBalance?.rows, suppliersRow);
    const previousMagnitude = previousRow ? Math.max(0, -rowSigned(previousRow)) : Math.max(0, -current - purchaseTotal);
    const cashMagnitude = cashRow ? Math.max(0, rowSigned(cashRow)) : 0;
    const knownOutflows = expenseTotal + Math.round(payrollScale / 2);
    const availableLiquidity = Math.max(0, cashMagnitude + revenueTotal - knownOutflows);
    const obligationBase = Math.max(1, previousMagnitude + purchaseTotal);
    const liquidityRatio = availableLiquidity / obligationBase;
    const paymentRate = clamp(0.45 + liquidityRatio * 0.45, 0.45, 0.90);
    const targetMagnitude = Math.max(purchaseTotal, Math.round(purchaseTotal + previousMagnitude * (1 - paymentRate)));
    const target = -targetMagnitude;
    targets.push(toTarget("suppliers", "Fornecedores", suppliersRow, target, `Ciclo dinâmico de fornecedores: compras do mês + parcela remanescente da obrigação anterior. Taxa de pagamento calculada em ${(paymentRate * 100).toFixed(1)}% conforme liquidez de ${competence}; não reutiliza a taxa de outro ano.`, 0.82));
    if (current > 0) {
      addObservation(observations, suppliersRow, "critical", "Fornecedores com natureza devedora", "Fornecedores normalmente encerra como obrigação credora. O saldo precisa ser revisto antes da exportação.", "Natureza contábil esperada", target);
    } else if (Math.abs(current - target) > Math.max(10_000, targetMagnitude * 0.12)) {
      addObservation(observations, suppliersRow, "warning", "Fornecedores fora do ciclo esperado", `O saldo é ${formatBalance(current)}. Considerando compras, saldo anterior e liquidez disponível, o ciclo desta competência aponta aproximadamente ${formatBalance(target)}.`, "Compras + mês anterior + liquidez da própria competência", target);
    }
  }

  if (clientsRow) {
    const current = rowSigned(clientsRow);
    const previousRow = findSameAccount(previousBalance?.rows, clientsRow);
    const previousClients = previousRow ? Math.max(0, rowSigned(previousRow)) : 0;
    const yearEnd = month === "12";
    const cashMagnitude = cashRow ? Math.max(0, rowSigned(cashRow)) : 0;
    const liquidityPressure = clamp((purchaseTotal + expenseTotal + Math.round(payrollScale / 2) - cashMagnitude) / Math.max(1, revenueTotal), 0, 1);
    const yearEndResidualRatio = clamp(0.14 + liquidityPressure * 0.10, 0.14, 0.24);
    const baseReceivable = yearEnd ? Math.round(revenueTotal * yearEndResidualRatio) : Math.max(0, Math.round(previousClients * 0.05));
    let target = baseReceivable;
    targets.push(toTarget("clients", "Clientes", clientsRow, target, yearEnd ? `Saldo de Clientes calculado com recebimento parcial de dezembro; residual dinâmico de ${(yearEndResidualRatio * 100).toFixed(1)}% conforme pressão de caixa, sem repetir valor de outro exercício.` : "Durante o ano, o motor prioriza quitação dos recebimentos e mantém apenas resíduo justificado pelo ciclo anterior.", 0.82));
    if (current < 0) {
      addObservation(observations, clientsRow, "critical", "Clientes com saldo credor", "Clientes normalmente deve encerrar devedor ou zerado. Saldo credor indica reclassificação ou recebimento lançado de forma incoerente.", "Natureza contábil esperada", target);
    }
  }

  // Primeiro calcula as correções não relacionadas ao residual de Caixa.
  const cashTarget = targets.find(target => target.key === "cash");
  let adjustments: TrialBalanceAutoAdjustment[] = [];
  if (cashRow) adjustments = targets.map(target => buildAdjustment(target, cashRow, competence)).filter((entry): entry is TrialBalanceAutoAdjustment => Boolean(entry));
  let projectedCash = cashRow ? rowSigned(cashRow) : null;
  if (projectedCash !== null) {
    for (const adjustment of adjustments) {
      if (adjustment.debitCode === cashRow!.reducedCode) projectedCash += adjustment.amountInCents;
      if (adjustment.creditCode === cashRow!.reducedCode) projectedCash -= adjustment.amountInCents;
    }
  }

  // Diferença de Caixa é absorvida por Clientes quando possível, como no fluxo histórico,
  // mas o valor é recalculado em cada competência.
  if (cashRow && clientsRow && cashTarget && projectedCash !== null) {
    const clientTargetIndex = targets.findIndex(target => target.key === "clients");
    const clientTarget = clientTargetIndex >= 0 ? targets[clientTargetIndex] : toTarget("clients", "Clientes", clientsRow, rowSigned(clientsRow), "Saldo de Clientes usado como contrapartida patrimonial do fechamento.", 0.78);
    const residual = projectedCash - cashTarget.targetSignedInCents;
    if (Math.abs(residual) > 1) {
      const revisedClientTarget = Math.max(0, clientTarget.targetSignedInCents + residual);
      const revised = { ...clientTarget, targetSignedInCents: revisedClientTarget, source: `${clientTarget.source} Diferença de Caixa de ${money(residual)} absorvida por Clientes para que o Caixa não fique artificialmente estourado.` };
      if (clientTargetIndex >= 0) targets[clientTargetIndex] = revised;
      else targets.push(revised);
      if (Math.abs(revisedClientTarget - rowSigned(clientsRow)) > 1) {
        addObservation(observations, clientsRow, "warning", "Clientes participa do ajuste de Caixa", `Para reduzir o Caixa para um residual coerente, Clientes passa de ${formatBalance(rowSigned(clientsRow))} para ${formatBalance(revisedClientTarget)}. O valor é calculado com o movimento desta competência, por isso não se repete automaticamente em outros meses ou anos.`, "Fechamento integrado Caixa ↔ Clientes", revisedClientTarget);
      }
      adjustments = targets.map(target => buildAdjustment(target, cashRow, competence)).filter((entry): entry is TrialBalanceAutoAdjustment => Boolean(entry));
      projectedCash = rowSigned(cashRow);
      for (const adjustment of adjustments) {
        if (adjustment.debitCode === cashRow.reducedCode) projectedCash += adjustment.amountInCents;
        if (adjustment.creditCode === cashRow.reducedCode) projectedCash -= adjustment.amountInCents;
      }
    }
  }

  // Anomalias genéricas: conta muito acima do histórico imediato ou sem alteração apesar de movimento.
  if (previousBalance?.rows?.length) {
    for (const row of analyticalTrialBalanceRows(rows)) {
      const previousRow = findSameAccount(previousBalance.rows, row);
      if (!previousRow) continue;
      const current = Math.abs(rowSigned(row));
      const prior = Math.abs(rowSigned(previousRow));
      const movement = row.debitInCents + row.creditInCents;
      if (prior > 0 && current > prior * 3.5 && current > operatingScale * 0.35) {
        addObservation(observations, row, "warning", "Saldo cresceu muito em relação ao mês anterior", `A conta passou de ${formatBalance(rowSigned(previousRow))} para ${formatBalance(rowSigned(row))}. O crescimento é superior ao padrão imediato e merece revisão.`, "Comparação com o mês anterior");
      }
      if (movement > 10_000 && current === prior && row.currentNature === previousRow.currentNature) {
        addObservation(observations, row, "warning", "Saldo repetido apesar de movimento", `A conta teve ${money(movement)} de débitos/créditos, mas encerrou exatamente com o mesmo saldo do mês anterior. Verifique se houve compensação real ou reaproveitamento indevido de valor.`, "Comparação com o mês anterior");
      }
    }
  }

  const previewRows = applyTrialBalanceAdjustments(rows, adjustments);
  const previewSummary = summarizeTrialBalance(previewRows);
  contextSummary.push(`Prévia automática: ${adjustments.length} lançamento(s) de ajuste; diferença entre débitos e créditos da prévia ${money(previewSummary.movementDifferenceInCents)}.`);

  return {
    competence,
    observations: observations.sort((a, b) => (a.severity === b.severity ? a.title.localeCompare(b.title) : a.severity === "critical" ? -1 : 1)),
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
  const arithmeticIssues = plan.previewRows.some(row => Math.abs(validateTrialBalanceRow(row)) > 1);
  const criticalObservations = plan.observations.some(item => item.severity === "critical" && item.suggestedSignedInCents === undefined);
  const cashOk = plan.targetCashSignedInCents === null || plan.projectedCashSignedInCents === null || Math.abs(plan.projectedCashSignedInCents - plan.targetCashSignedInCents) <= 1;
  return Math.abs(summary.movementDifferenceInCents) <= 1 && Math.abs(summary.currentSignedInCents) <= 1 && !arithmeticIssues && !criticalObservations && cashOk;
}

function formatBalance(signed: number) {
  if (Math.abs(signed) <= 1) return "R$ 0,00";
  return `${money(signed)} ${signed > 0 ? "D" : "C"}`;
}

function closingDate(competence: string) {
  const [month, year] = competence.split("/").map(Number);
  const day = new Date(year, month, 0).getDate();
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}
