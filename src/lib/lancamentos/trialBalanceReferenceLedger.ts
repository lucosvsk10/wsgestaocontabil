import { AccountingExportEntry } from "./accountingExportWorkbook";
import { analyticalTrialBalanceRows, signedBalance, TrialBalanceRow } from "./trialBalance";

export interface TrialBalanceReferenceLedgerEntry {
  date: string;
  debitCode: string;
  debitCostCenter?: string;
  creditCode: string;
  creditCostCenter?: string;
  amountInCents: number;
  history: string;
  origin?: string;
  source?: string;
}

export interface TrialBalanceReferenceLedger {
  entries: TrialBalanceReferenceLedgerEntry[];
  expectedClosingCashInCents?: number | null;
  sourceFileName?: string | null;
  source?: string | null;
  approved?: boolean;
}

export interface TrialBalanceReferenceReconciliation {
  coveredEntries: TrialBalanceReferenceLedgerEntry[];
  missingEntries: TrialBalanceReferenceLedgerEntry[];
  adjustments: AccountingExportEntry[];
  missingAccountCodes: string[];
}

interface ResidualMovement { debit: number; credit: number; }

function analyticalByReducedCode(rows: TrialBalanceRow[]) {
  return new Map(analyticalTrialBalanceRows(rows).filter(row => row.reducedCode).map(row => [row.reducedCode, row]));
}

export function reconcileReferenceLedger(rows: TrialBalanceRow[], ledger: TrialBalanceReferenceLedger): TrialBalanceReferenceReconciliation {
  const accounts = analyticalByReducedCode(rows);
  const residual = new Map<string, ResidualMovement>();
  for (const [code, row] of accounts) residual.set(code, { debit: row.debitInCents, credit: row.creditInCents });

  const coveredEntries: TrialBalanceReferenceLedgerEntry[] = [];
  const missingEntries: TrialBalanceReferenceLedgerEntry[] = [];
  const adjustments: AccountingExportEntry[] = [];
  const missingAccountCodes = new Set<string>();

  for (const entry of ledger.entries) {
    const debitRow = accounts.get(entry.debitCode);
    const creditRow = accounts.get(entry.creditCode);
    if (!debitRow) missingAccountCodes.add(entry.debitCode);
    if (!creditRow) missingAccountCodes.add(entry.creditCode);
    if (!debitRow || !creditRow || entry.amountInCents <= 0) continue;

    const debitResidual = residual.get(entry.debitCode) ?? { debit: 0, credit: 0 };
    const creditResidual = residual.get(entry.creditCode) ?? { debit: 0, credit: 0 };
    const alreadyCovered = Math.min(entry.amountInCents, debitResidual.debit, creditResidual.credit);

    if (alreadyCovered > 0) {
      debitResidual.debit -= alreadyCovered;
      creditResidual.credit -= alreadyCovered;
      residual.set(entry.debitCode, debitResidual);
      residual.set(entry.creditCode, creditResidual);
    }

    if (alreadyCovered >= entry.amountInCents - 1) {
      coveredEntries.push(entry);
      continue;
    }

    const missingAmount = entry.amountInCents - alreadyCovered;
    const missingEntry = { ...entry, amountInCents: missingAmount };
    missingEntries.push(missingEntry);
    adjustments.push({
      date: entry.date,
      amountInCents: missingAmount,
      debitCode: entry.debitCode,
      creditCode: entry.creditCode,
      history: entry.history,
      debitCostCenter: entry.debitCostCenter ?? "",
      creditCostCenter: entry.creditCostCenter ?? "",
      debitDescription: debitRow.title,
      creditDescription: creditRow.title,
      referenceCode: `${entry.debitCode}/${entry.creditCode}`,
      referenceDescription: entry.history,
      type: "ajuste_balancete",
      section: "balancete",
      mappingSource: "predefined",
      mappingReason: `Lançamento ausente identificado pela referência aprovada ${ledger.sourceFileName || ledger.source || "do fechamento"}.`,
    });
  }

  return { coveredEntries, missingEntries, adjustments, missingAccountCodes: [...missingAccountCodes] };
}

export function referenceLedgerMovement(entries: TrialBalanceReferenceLedgerEntry[], reducedCode: string) {
  return entries.reduce((sum, entry) => {
    if (entry.debitCode === reducedCode) sum += entry.amountInCents;
    if (entry.creditCode === reducedCode) sum -= entry.amountInCents;
    return sum;
  }, 0);
}

export function projectedReferenceBalance(row: TrialBalanceRow, missingEntries: TrialBalanceReferenceLedgerEntry[]) {
  return signedBalance(row.currentBalanceInCents, row.currentNature) + referenceLedgerMovement(missingEntries, row.reducedCode);
}
