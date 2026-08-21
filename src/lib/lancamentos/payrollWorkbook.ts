import * as XLSX from "xlsx";
export interface PayrollEntry { id: string; date: string; history: string; debitCode: string; debitDescription: string; debitCostCenter: string; creditCode: string; creditDescription: string; creditCostCenter: string; amountInCents: number; source?: string; confidence?: number; }
export function exportPayroll(entries: PayrollEntry[], competence: string) {
  const rows = entries.map(row => ({ DATA: row.date, "HISTÓRICO VARIÁVEL": row.history, DÉBITO: row.debitCode, "DESCRIÇÃO DÉBITO": row.debitDescription, "C.C. DÉBITO": row.debitCostCenter, CRÉDITO: row.creditCode, "DESCRIÇÃO CRÉDITO": row.creditDescription, "C.C. CRÉDITO": row.creditCostCenter, VALOR: row.amountInCents / 100 }));
  const sheet = XLSX.utils.json_to_sheet(rows); sheet["!cols"] = [{wch:13},{wch:48},{wch:11},{wch:30},{wch:12},{wch:11},{wch:30},{wch:12},{wch:16}];
  const workbook = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(workbook, sheet, "Folha de pagamento"); XLSX.writeFile(workbook, `folha-${competence.replace("/", "-")}.xlsx`, { compression: true });
}
