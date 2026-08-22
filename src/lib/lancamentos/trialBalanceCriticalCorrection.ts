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
import { loadWorkspaceData } from "./workspaceStorage";

interface ExpensePayload { entries?: ExpenseEntry[]; }
interface PayrollPayload { entries?: PayrollEntry[]; }
interface PurchasePayload { entries?: PurchaseEntry[]; reference?: PurchaseReference | null; }
interface RevenuePayload { entries?: RevenueEntry[]; reference?: RevenueReference | null; }

export interface CriticalTrialBalancePlan extends TrialBalanceAutoPlan {
  remainingCriticalObservations: TrialBalanceObservation[];
  correctionComplete: boolean;
  previousBalanceVerified: boolean;
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
  irrf: ["irrf s salarios a recolher", "irrf a recolher"],
  prolabore: ["pro labore a pagar", "pro-labore a pagar", "pró-labore a pagar"],
  simples: ["simples a recolher", "simples à recolher"],
} as const;

type AliasKey = keyof typeof aliases;

const money = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(cents) / 100);
const rowSigned = (row: TrialBalanceRow) => signedBalance(row.currentBalanceInCents, row.currentNature);

function findRow(rows: TrialBalanceRow[], key: AliasKey) {
  const expected = aliases[key].map(normalizeTrialBalanceText);
  const candidates = rows.filter(row => {
    const title = normalizeTrialBalanceText(row.title);
    if (key === "cash" && (title.includes("banco") || title.includes("sicoob"))) return false;
    return expected.some(alias => title === alias || title.includes(alias));
  });
  const analyticalIds = new Set(analyticalTrialBalanceRows(rows).map(row => row.id));
  return candidates.find(row => analyticalIds.has(row.id) && row.reducedCode)
    ?? candidates.find(row => row.reducedCode)
    ?? candidates.at(-1)
    ?? null;
}

function isPreviousBalanceVerified(rows: TrialBalanceRow[]) {
  return rows.length > 0 && rows.every(row => (row as TrialBalanceRow & { previousBalanceRead?: boolean }).previousBalanceRead === true);
}

function materialArithmeticTolerance(row: TrialBalanceRow) {
  const scale = Math.abs(signedBalance(row.previousBalanceInCents, row.previousNature)) + row.debitInCents + row.creditInCents + Math.abs(rowSigned(row));
  return Math.max(10_000, Math.round(scale * 0.005)); // R$100 ou 0,5% da linha.
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

function analyzeCriticalRows(rows: TrialBalanceRow[], operatingScale: number) {
  const observations: TrialBalanceObservation[] = [];
  const push = (item: TrialBalanceObservation) => {
    if (!observations.some(existing => existing.id === item.id)) observations.push(item);
  };

  for (const row of analyticalTrialBalanceRows(rows)) {
    const arithmetic = validateTrialBalanceRow(row);
    if (Math.abs(arithmetic) > materialArithmeticTolerance(row)) {
      push(criticalObservation(row, "A linha não fecha", `A diferença aritmética é ${money(arithmetic)}. Isso é grande demais para ser tratado como arredondamento ou detalhe de leitura.`, "Saldo anterior + débitos - créditos × saldo atual"));
    }
  }

  const cash = findRow(rows, "cash");
  const clients = findRow(rows, "clients");
  const suppliers = findRow(rows, "suppliers");
  const liabilityKeys: AliasKey[] = ["salaries", "vacation", "termination", "thirteenth", "fgts", "inss", "irrf", "prolabore", "simples"];

  if (cash) {
    const current = rowSigned(cash);
    if (current < -1_000) {
      push(criticalObservation(cash, "Caixa está credor", `O Caixa está em ${money(current)} C. Caixa físico/patrimonial não deve encerrar com natureza credora.`, "Natureza esperada da conta Caixa"));
    } else {
      const extremeCeiling = Math.max(50_000_000, Math.round(operatingScale * 1.75));
      if (current > extremeCeiling) {
        push(criticalObservation(cash, "Caixa extremamente alto", `O Caixa está em ${money(current)} D, muito acima do movimento operacional usado como referência (${money(operatingScale)}).`, "Proporção entre saldo de Caixa e movimento real da competência"));
      }
    }
  }

  if (clients && rowSigned(clients) < -100_000) {
    push(criticalObservation(clients, "Clientes está credor", `Clientes está em ${money(rowSigned(clients))} C. Sem reclassificação documentada, a conta deve encerrar devedora ou zerada.`, "Natureza esperada de Clientes"));
  }

  if (suppliers && rowSigned(suppliers) > 100_000) {
    push(criticalObservation(suppliers, "Fornecedores está devedor", `Fornecedores está em ${money(rowSigned(suppliers))} D. A obrigação normalmente encerra credora.`, "Natureza esperada de Fornecedores"));
  }

  for (const key of liabilityKeys) {
    const row = findRow(rows, key);
    if (row && rowSigned(row) > Math.max(100_000, Math.round(operatingScale * 0.02))) {
      push(criticalObservation(row, "Obrigação com natureza devedora", `${row.title} está em ${money(rowSigned(row))} D. Para uma obrigação a pagar/recolher, isso exige revisão.`, "Natureza esperada de obrigação"));
    }
  }

  return observations;
}

function targetFor(row: TrialBalanceRow, key: string, label: string, signedTarget: number, source: string): TrialBalanceAutoTarget {
  return {
    key,
    label,
    row,
    currentSignedInCents: rowSigned(row),
    targetSignedInCents: signedTarget,
    source,
    confidence: 0.96,
  };
}

function journal(date: string, key: string, amount: number, debit: TrialBalanceRow, credit: TrialBalanceRow, history: string, reason: string): TrialBalanceAutoAdjustment {
  return {
    targetKey: key,
    currentSignedInCents: rowSigned(key === "clients_receipt" ? credit : debit),
    targetSignedInCents: 0,
    date,
    amountInCents: Math.abs(amount),
    debitCode: debit.reducedCode,
    creditCode: credit.reducedCode,
    history,
    debitCostCenter: "",
    creditCostCenter: "",
    debitDescription: debit.title,
    creditDescription: credit.title,
    referenceCode: key === "clients_receipt" ? credit.reducedCode : debit.reducedCode,
    referenceDescription: key === "clients_receipt" ? credit.title : debit.title,
    type: "ajuste_balancete",
    section: "balancete",
    mappingSource: "predefined",
    mappingReason: reason,
  };
}

function closingDate(month: string, year: string) {
  return `${String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, "0")}/${month}/${year}`;
}

function movementTotal(entries: Array<{ amountInCents: number }>) {
  return entries.reduce((sum, entry) => sum + Math.abs(entry.amountInCents), 0);
}

export async function buildCriticalTrialBalancePlan(company: string, month: string, year: string, rows: TrialBalanceRow[]): Promise<CriticalTrialBalancePlan> {
  const prefix = `${company}:${year}:${month}`;
  const [expenses, payroll, purchases, revenue] = await Promise.all([
    loadWorkspaceData<ExpensePayload>(`${prefix}:despesas:parsed`),
    loadWorkspaceData<PayrollPayload>(`${prefix}:folha:parsed`),
    loadWorkspaceData<PurchasePayload>(`${prefix}:compras:parsed`),
    loadWorkspaceData<RevenuePayload>(`${prefix}:faturamento:parsed`),
  ]);

  const expenseEntries = expenses?.entries ?? [];
  const payrollEntries = payroll?.entries ?? [];
  const purchaseEntries = purchases?.entries ?? [];
  const revenueEntries = revenue?.entries ?? [];
  const revenueTotal = revenue?.reference?.totalAmountInCents ?? movementTotal(revenueEntries.filter(entry => !normalizeTrialBalanceText(entry.rubricDescription).includes("pgdas")));
  const purchaseTotal = purchases?.reference?.totalAmountInCents ?? movementTotal(purchaseEntries);
  const operatingScale = Math.max(1, revenueTotal + purchaseTotal + movementTotal(expenseEntries) + Math.round(movementTotal(payrollEntries) / 2));
  const previousBalanceVerified = isPreviousBalanceVerified(rows);
  const observations = analyzeCriticalRows(rows, operatingScale);
  const targets: TrialBalanceAutoTarget[] = [];
  const adjustments: TrialBalanceAutoAdjustment[] = [];
  const date = closingDate(month, year);
  const cash = findRow(rows, "cash");
  const clients = findRow(rows, "clients");

  // Primeiro tratamento: Caixa credor causado por faturamento ainda parado em Clientes.
  // É a mesma lógica contábil do histórico: D Caixa / C Clientes, usando o valor real da competência.
  if (cash && clients && rowSigned(cash) < 0 && rowSigned(clients) > 0) {
    const clientBalance = rowSigned(clients);
    const currentRevenueSupportsFullReceipt = revenueTotal > 0 && clientBalance <= Math.round(revenueTotal * 1.10);
    const minimumToReverseCashNature = Math.abs(rowSigned(cash)) + Math.max(10_000, Math.round(operatingScale * 0.01));
    const receipt = currentRevenueSupportsFullReceipt ? clientBalance : Math.min(clientBalance, minimumToReverseCashNature);
    if (receipt > 0) {
      adjustments.push(journal(date, "clients_receipt", receipt, cash, clients, `RECEBIMENTO DE CLIENTES MÊS ${month}/${year}`, "Recebimento calculado a partir do saldo real de Clientes e do faturamento da própria competência; não usa valor fixo de outro exercício."));
      targets.push(targetFor(cash, "cash", "Caixa", rowSigned(cash) + receipt, "Caixa projetado após o recebimento real de Clientes."));
      targets.push(targetFor(clients, "clients", "Clientes", rowSigned(clients) - receipt, "Saldo de Clientes após o recebimento calculado da competência."));
    }
  }

  // Caixa devedor extremamente alto: só então propõe reduzir o excesso para Clientes.
  // Pequenas ou médias variações não são sinalizadas nem ajustadas.
  if (cash && rowSigned(cash) > 0) {
    const extremeCeiling = Math.max(50_000_000, Math.round(operatingScale * 1.75));
    if (rowSigned(cash) > extremeCeiling && clients) {
      const dynamicTarget = Math.max(Math.round(operatingScale * 0.30), Math.round(extremeCeiling * 0.35));
      const excess = rowSigned(cash) - dynamicTarget;
      if (excess > 0) {
        adjustments.push(journal(date, "cash_excess", excess, clients, cash, `RECLASSIFICAÇÃO DE CAIXA REF. ${month}/${year}`, "Redução de Caixa somente porque o saldo ultrapassou fortemente o movimento da competência; o alvo é proporcional ao movimento atual."));
        targets.push(targetFor(cash, "cash", "Caixa", dynamicTarget, "Faixa dinâmica de Caixa calculada pelo movimento desta competência."));
        targets.push(targetFor(clients, "clients", "Clientes", rowSigned(clients) + excess, "Contrapartida patrimonial da redução de Caixa excessivo."));
      }
    }
  }

  const previewRows = applyTrialBalanceAdjustments(rows, adjustments as AccountingExportEntry[]);
  const remainingCriticalObservations = analyzeCriticalRows(previewRows, operatingScale);
  const summary = summarizeTrialBalance(previewRows);
  const correctionComplete = previousBalanceVerified
    && remainingCriticalObservations.length === 0
    && Math.abs(summary.movementDifferenceInCents) <= 1
    && Math.abs(summary.currentSignedInCents) <= 1;

  const previewCash = cash ? previewRows.find(row => row.id === cash.id) : null;
  const cashTarget = targets.find(item => item.key === "cash");
  const contextSummary = [
    `Análise crítica: ${observations.length} problema(s) material(is); detalhes pequenos não são sinalizados.`,
    `Movimento considerado: faturamento ${money(revenueTotal)}, compras ${money(purchaseTotal)}, escala operacional ${money(operatingScale)}.`,
    previousBalanceVerified ? "Saldo Anterior confirmado em todas as linhas importadas." : "Saldo Anterior não está confirmado em todas as linhas; a correção não pode ser concluída.",
    correctionComplete ? "A prévia resolveu os críticos e fechou matematicamente." : `Prévia ainda possui ${remainingCriticalObservations.length} problema(s) crítico(s); não será marcada como corrigida.`,
  ];

  return {
    competence: `${month}/${year}`,
    observations,
    targets,
    adjustments,
    previewRows,
    remainingCriticalObservations,
    correctionComplete,
    previousBalanceVerified,
    currentCashSignedInCents: cash ? rowSigned(cash) : null,
    targetCashSignedInCents: cashTarget?.targetSignedInCents ?? null,
    projectedCashSignedInCents: previewCash ? rowSigned(previewCash) : null,
    operatingScaleInCents: operatingScale,
    contextSummary,
    generatedAt: new Date().toISOString(),
  };
}

export function criticalTrialBalancePlanIsCorrected(plan: CriticalTrialBalancePlan | null | undefined) {
  return Boolean(plan?.correctionComplete && plan.previousBalanceVerified && plan.remainingCriticalObservations.length === 0);
}
