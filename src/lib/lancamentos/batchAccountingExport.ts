import { exportAccountingWorkbook, AccountingExportEntry } from "./accountingExportWorkbook";
import { ExpenseEntry, groupExpenseEntries } from "./expenseWorkbook";
import { PayrollEntry } from "./payrollWorkbook";
import { PurchaseEntry } from "./purchaseWorkbook";
import { RevenueEntry } from "./revenueWorkbook";
import { loadWorkspaceData } from "./workspaceStorage";

interface ExpenseSaved { entries?: ExpenseEntry[]; }
interface PayrollSaved { entries?: PayrollEntry[]; }
interface PurchaseSaved { entries?: PurchaseEntry[]; }
interface RevenueSaved { entries?: RevenueEntry[]; }

function closingDate(month: string, year: string) {
  return `${String(new Date(Number(year), Number(month), 0).getDate()).padStart(2, "0")}/${month}/${year}`;
}

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

async function loadMonthEntries(company: string, month: string, year: string) {
  const prefix = `${company}:${year}:${month}`;
  const [expenses, payroll, purchases, revenue] = await Promise.all([
    loadWorkspaceData<ExpenseSaved>(`${prefix}:despesas:parsed`),
    loadWorkspaceData<PayrollSaved>(`${prefix}:folha:parsed`),
    loadWorkspaceData<PurchaseSaved>(`${prefix}:compras:parsed`),
    loadWorkspaceData<RevenueSaved>(`${prefix}:faturamento:parsed`),
  ]);

  const groupedExpenses = groupExpenseEntries(expenses?.entries ?? [], "debit", closingDate(month, year));
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
    mappingReason: `Agrupado por conta de débito a partir de ${row.sourceCount} lançamento(s).`,
  }));

  const moduleGroups: Array<{ label: string; entries: AccountingExportEntry[] }> = [
    { label: "Despesas", entries: expenseEntries },
    { label: "Folha de pagamento", entries: (payroll?.entries ?? []).map(row => mapEntry(row, "folha")) },
    { label: "Compras", entries: (purchases?.entries ?? []).map(row => mapEntry(row, "compras")) },
    { label: "Faturamento", entries: (revenue?.entries ?? []).map(row => mapEntry(row, "faturamento")) },
  ];

  const entries = moduleGroups.flatMap(group => group.entries);
  if (!entries.length) throw new Error(`Nenhum lançamento foi encontrado em ${month}/${year}.`);

  return { month, entries, moduleGroups };
}

function compareDates(a: AccountingExportEntry, b: AccountingExportEntry) {
  const parse = (date: string) => {
    const [day = "01", month = "01", year = "0000"] = date.split("/");
    return Number(`${year}${month}${day}`);
  };
  return parse(a.date) - parse(b.date);
}

export async function exportAccountingMonthsBatch(company: string, selectedMonths: string[], year: string) {
  const normalizedMonths = [...new Set(selectedMonths)]
    .filter(month => /^(0[1-9]|1[0-2])$/.test(month))
    .sort((a, b) => Number(a) - Number(b));

  if (!/^20\d{2}$/.test(year)) throw new Error("Ano inválido para exportação em lote.");
  if (!normalizedMonths.length) throw new Error("Selecione ao menos uma competência concluída.");

  const monthResults = await Promise.all(normalizedMonths.map(month => loadMonthEntries(company, month, year)));
  const entries = monthResults
    .flatMap(result => result.entries)
    .sort(compareDates);

  const comparisons = monthResults.flatMap(result => result.moduleGroups.map(group => {
    const total = group.entries.reduce((sum, row) => sum + row.amountInCents, 0);
    return {
      label: `${Number(result.month)}/${year} · ${group.label}`,
      documentAmountInCents: total,
      entriesAmountInCents: total,
      differenceInCents: 0,
      source: "Módulo concluído e conferido no site",
      blocking: true,
      note: `${group.entries.length} lançamento(s) incluído(s) nesta competência.`,
    };
  }));

  const monthLabel = normalizedMonths.map(month => String(Number(month))).join(",");
  const fileName = `Lanç. lote ${monthLabel}-${year}.xlsx`;

  exportAccountingWorkbook({
    moduleTitle: "Lançamentos em lote",
    competence: `${monthLabel}/${year}`,
    fileName,
    entries,
    comparisons,
    note: `Arquivo consolidado das competências ${monthLabel}/${year}. Apenas meses totalmente concluídos podem ser incluídos. A aba Lançamentos mantém os campos esperados pelo Calima e os registros são ordenados cronologicamente.`,
  });

  return { entryCount: entries.length, monthCount: normalizedMonths.length, fileName };
}
