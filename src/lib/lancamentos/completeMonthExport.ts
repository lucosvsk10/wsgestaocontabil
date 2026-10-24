import { exportAccountingWorkbook, AccountingExportEntry } from "./accountingExportWorkbook";
import { ExpenseEntry, GroupedExpenseEntry } from "./expenseWorkbook";
import { EXPENSE_ALIGNMENT_VERSION, rawExpenseRowsForExport } from "./expenseAlignment";
import { PayrollEntry } from "./payrollWorkbook";
import { PurchaseEntry } from "./purchaseWorkbook";
import { RevenueEntry } from "./revenueWorkbook";
import { loadWorkspaceData } from "./workspaceStorage";

interface ExpenseSaved { entries?: ExpenseEntry[]; alignedEntries?: GroupedExpenseEntry[]; alignmentVersion?: string; }
interface PayrollSaved { entries?: PayrollEntry[]; }
interface PurchaseSaved { entries?: PurchaseEntry[]; }
interface RevenueSaved { entries?: RevenueEntry[]; }

function mapEntry(row: PayrollEntry | PurchaseEntry | RevenueEntry, module: string): AccountingExportEntry {
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
    referenceCode: row.rubricCode,
    referenceDescription: row.rubricDescription,
    type: row.kind,
    section: module,
    mappingSource: row.mappingSource,
    mappingReason: row.mappingReason,
  };
}

export async function exportCompleteAccountingMonth(company: string, month: string, year: string) {
  const prefix = `${company}:${year}:${month}`;
  const [expenses, payroll, purchases, revenue] = await Promise.all([
    loadWorkspaceData<ExpenseSaved>(`${prefix}:despesas:parsed`),
    loadWorkspaceData<PayrollSaved>(`${prefix}:folha:parsed`),
    loadWorkspaceData<PurchaseSaved>(`${prefix}:compras:parsed`),
    loadWorkspaceData<RevenueSaved>(`${prefix}:faturamento:parsed`),
  ]);

  const originalExpenses = expenses?.entries ?? [];
  const savedGrouped = expenses?.alignmentVersion === EXPENSE_ALIGNMENT_VERSION ? (expenses?.alignedEntries ?? []) : [];
  const groupedExpenses = savedGrouped.length ? savedGrouped : rawExpenseRowsForExport(originalExpenses);
  const expectedExpenses = originalExpenses.reduce((sum, row) => sum + row.amountInCents, 0);
  const actualExpenses = groupedExpenses.reduce((sum, row) => sum + row.amountInCents, 0);
  if (expectedExpenses !== actualExpenses) {
    throw new Error("Despesas: os valores da Transcrição e dos Lançamentos não coincidem. Exportação interrompida para evitar perda.");
  }
  if (originalExpenses.length && !groupedExpenses.length) throw new Error("Despesas têm lançamentos mas nenhuma linha exportável.");
  const expenseEntries: AccountingExportEntry[] = groupedExpenses.map(row => ({
    date: row.date,
    amountInCents: row.amountInCents,
    debitCode: row.debitCode,
    creditCode: row.creditCode,
    history: row.history,
    debitCostCenter: row.debitCostCenter,
    creditCostCenter: row.creditCostCenter,
    debitDescription: row.debitDescription,
    creditDescription: row.creditDescription,
    referenceCode: `DESPESA-${row.debitCode}`,
    referenceDescription: row.debitDescription || row.history,
    type: "despesa",
    section: "despesas",
    mappingSource: "predefined",
    mappingReason: `Lançamento proveniente da aba Despesas, respeitando agrupamento salvo.`,
  }));

  const moduleGroups: Array<{ label: string; entries: AccountingExportEntry[] }> = [
    { label: "Despesas", entries: expenseEntries },
    { label: "Folha de pagamento", entries: (payroll?.entries ?? []).map(row => mapEntry(row, "folha")) },
    { label: "Compras", entries: (purchases?.entries ?? []).map(row => mapEntry(row, "compras")) },
    { label: "Faturamento", entries: (revenue?.entries ?? []).map(row => mapEntry(row, "faturamento")) },
  ];

  const entries = moduleGroups.flatMap(group => group.entries);
  if (!entries.length) throw new Error("Nenhum lançamento foi encontrado para exportar nesta competência.");

  const comparisons = moduleGroups.map(group => {
    const total = group.entries.reduce((sum, row) => sum + row.amountInCents, 0);
    return {
      label: group.label,
      documentAmountInCents: total,
      entriesAmountInCents: total,
      differenceInCents: 0,
      source: "Módulo concluído e conferido no site",
      blocking: true,
      note: `${group.entries.length} lançamento(s) incluído(s) no fechamento mensal.`,
    };
  });

  exportAccountingWorkbook({
    moduleTitle: "Fechamento mensal completo",
    competence: `${month}/${year}`,
    fileName: `fechamento-completo-${year}-${month}.xlsx`,
    entries,
    comparisons,
    note: "Arquivo consolidado dos quatro módulos concluídos nesta competência. A aba Lançamentos mantém exatamente os campos esperados pelo Calima; Conferência resume os módulos incluídos; Mapeamento lista as contas efetivamente usadas.",
  });

  return { entryCount: entries.length };
}
