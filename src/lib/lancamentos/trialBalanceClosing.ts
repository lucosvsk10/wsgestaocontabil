import { AccountingExportEntry } from "./accountingExportWorkbook";
import { PayrollEntry } from "./payrollWorkbook";
import { PurchaseEntry } from "./purchaseWorkbook";
import { RevenueEntry } from "./revenueWorkbook";
import { closingAccounts, findClosingAccountRow, signedBalance, TrialBalanceRow } from "./trialBalance";
import { loadWorkspaceData } from "./workspaceStorage";

type LaunchEntry = PayrollEntry | PurchaseEntry | RevenueEntry;

interface ModulePayload<T extends LaunchEntry> { entries?: T[]; }

export interface TrialBalanceClosingTarget {
  key: string;
  label: string;
  row: TrialBalanceRow;
  currentSignedInCents: number;
  suggestedSignedInCents: number;
  source: string;
  requiresManualReview: boolean;
}

export interface TrialBalanceAdjustment extends AccountingExportEntry {
  targetKey: string;
  currentSignedInCents: number;
  targetSignedInCents: number;
}

const automaticKeys = new Set(["salaries", "vacation", "termination", "thirteenth", "fgts", "inss", "irrf", "prolabore", "simples"]);
const brl = (cents: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(Math.abs(cents) / 100);

function accountMovement(entries: LaunchEntry[], reducedCode: string) {
  return entries.reduce((signed, entry) => {
    if (entry.debitCode === reducedCode) signed += entry.amountInCents;
    if (entry.creditCode === reducedCode) signed -= entry.amountInCents;
    return signed;
  }, 0);
}

export async function buildClosingTargets(company: string, month: string, year: string, rows: TrialBalanceRow[]) {
  const prefix = `${company}:${year}:${month}`;
  const [payroll, purchases, revenue] = await Promise.all([
    loadWorkspaceData<ModulePayload<PayrollEntry>>(`${prefix}:folha:parsed`),
    loadWorkspaceData<ModulePayload<PurchaseEntry>>(`${prefix}:compras:parsed`),
    loadWorkspaceData<ModulePayload<RevenueEntry>>(`${prefix}:faturamento:parsed`),
  ]);

  const payrollEntries = payroll?.entries ?? [];
  const purchaseEntries = purchases?.entries ?? [];
  const revenueEntries = revenue?.entries ?? [];

  return closingAccounts.flatMap<TrialBalanceClosingTarget>(definition => {
    const row = findClosingAccountRow(rows, definition.aliases);
    if (!row) return [];
    const currentSignedInCents = signedBalance(row.currentBalanceInCents, row.currentNature);

    if (definition.key === "thirteenth" && month === "12") {
      return [{
        key: definition.key,
        label: definition.label,
        row,
        currentSignedInCents,
        suggestedSignedInCents: 0,
        source: "Fechamento de dezembro: 13º salário a pagar deve encerrar zerado após a quitação.",
        requiresManualReview: false,
      }];
    }

    if (automaticKeys.has(definition.key)) {
      const entries = definition.key === "simples" ? revenueEntries : payrollEntries;
      const movement = accountMovement(entries, row.reducedCode);
      if (movement !== 0 || entries.some(entry => entry.debitCode === row.reducedCode || entry.creditCode === row.reducedCode)) {
        return [{
          key: definition.key,
          label: definition.label,
          row,
          currentSignedInCents,
          suggestedSignedInCents: movement,
          source: definition.key === "simples" ? "Apuração PGDAS conferida da competência" : "Folha conferida da competência",
          requiresManualReview: false,
        }];
      }
    }

    let contextMovement = 0;
    let source = "Saldo atual mantido até definição do responsável";
    if (definition.key === "clients") {
      contextMovement = accountMovement(revenueEntries, row.reducedCode);
      source = contextMovement ? `O faturamento movimentou ${brl(contextMovement)} nesta conta; o saldo-alvo depende da política de recebimento da empresa.` : "O saldo-alvo depende da política de recebimento da empresa.";
    } else if (definition.key === "suppliers") {
      contextMovement = accountMovement(purchaseEntries, row.reducedCode);
      source = contextMovement ? `As compras movimentaram ${brl(contextMovement)} nesta conta; o saldo-alvo depende da política de pagamento da empresa.` : "O saldo-alvo depende da política de pagamento da empresa.";
    } else if (definition.key === "cash") {
      source = "Caixa é a contrapartida projetada dos ajustes; o saldo-alvo pode ser usado como conferência final.";
    }

    return [{
      key: definition.key,
      label: definition.label,
      row,
      currentSignedInCents,
      suggestedSignedInCents: currentSignedInCents,
      source,
      requiresManualReview: true,
    }];
  });
}

export function buildTrialBalanceAdjustments(targets: TrialBalanceClosingTarget[], targetValues: Record<string, number>, competence: string) {
  const cash = targets.find(target => target.key === "cash");
  if (!cash) return { adjustments: [] as TrialBalanceAdjustment[], projectedCashSignedInCents: null as number | null, cashResidualInCents: null as number | null };

  const adjustments: TrialBalanceAdjustment[] = [];
  let totalNonCashDelta = 0;

  for (const target of targets) {
    if (target.key === "cash") continue;
    const targetSigned = targetValues[target.key] ?? target.suggestedSignedInCents;
    const delta = targetSigned - target.currentSignedInCents;
    if (delta === 0) continue;
    totalNonCashDelta += delta;

    const debitTarget = delta > 0;
    adjustments.push({
      targetKey: target.key,
      currentSignedInCents: target.currentSignedInCents,
      targetSignedInCents: targetSigned,
      date: closingDate(competence),
      amountInCents: Math.abs(delta),
      debitCode: debitTarget ? target.row.reducedCode : cash.row.reducedCode,
      creditCode: debitTarget ? cash.row.reducedCode : target.row.reducedCode,
      history: `AJUSTE BALANCETE ${target.label.toUpperCase()} REF. ${competence}`,
      debitCostCenter: "",
      creditCostCenter: "",
      debitDescription: debitTarget ? target.row.title : cash.row.title,
      creditDescription: debitTarget ? cash.row.title : target.row.title,
      referenceCode: target.row.reducedCode,
      referenceDescription: target.label,
      type: "ajuste_balancete",
      section: "balancete",
      mappingSource: "manual",
      mappingReason: `Saldo atual ajustado para o saldo-alvo conferido em ${competence}.`,
    });
  }

  const projectedCashSignedInCents = cash.currentSignedInCents - totalNonCashDelta;
  const desiredCash = targetValues.cash ?? cash.suggestedSignedInCents;
  return {
    adjustments,
    projectedCashSignedInCents,
    cashResidualInCents: desiredCash - projectedCashSignedInCents,
  };
}

function closingDate(competence: string) {
  const [month, year] = competence.split("/").map(Number);
  const day = new Date(year, month, 0).getDate();
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}
