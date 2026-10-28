import * as XLSX from "xlsx-js-style";
import type { AccountingExportEntry } from "./accountingExportWorkbook";

export function exportCalimaBalancete(competence: string, entries: AccountingExportEntry[]) {
  const headers = ["Data", "Conta de débito", "Centro de custo débito", "Conta de crédito", "Centro de custo crédito", "Valor", "Histórico"];
  const lines = entries.map(entry => [
    entry.date,
    entry.debitCode,
    entry.debitCostCenter || "",
    entry.creditCode,
    entry.creditCostCenter || "",
    entry.amountInCents / 100,
    entry.history,
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...lines]);
  sheet["!cols"] = [{ wch: 15 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 22 }, { wch: 18 }, { wch: 68 }];
  sheet["!autofilter"] = { ref: "A1:G" + Math.max(1, lines.length + 1) };
  for (let index = 0; index < headers.length; index++) {
    const address = XLSX.utils.encode_cell({ r: 0, c: index });
    if (sheet[address]) sheet[address].s = { font: { bold: true, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "17365D" } } };
  }
  for (let index = 1; index <= lines.length; index++) {
    const address = XLSX.utils.encode_cell({ r: index, c: 5 });
    if (sheet[address]) sheet[address].z = "#,##0.00";
  }
  const book = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(book, sheet, "Lançamentos");
  const fileName = "Balancete-Calima-" + competence.replace("/", "-") + ".xlsx";
  XLSX.writeFile(book, fileName, { compression: true });
}
