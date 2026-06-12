import * as XLSX from "xlsx";
import type { SheetData } from "./exportBuilders";

export const downloadSheetXlsx = (
  sheet: SheetData,
  filename: string,
  includeTotal: boolean = true,
) => {
  const rowsToExport = includeTotal
    ? sheet.rows
    : sheet.rows.filter((row) => !row.some((c) => c.isTotal));
  const aoa: (string | number)[][] = [sheet.headers];
  const merges: XLSX.Range[] = [];
  rowsToExport.forEach((row, rIdx) => {
    const flat: (string | number)[] = [];
    let colCursor = 0;
    row.forEach((cell) => {
      flat.push(cell.value);
      const span = cell.colSpan || 1;
      if (span > 1) {
        merges.push({
          s: { r: rIdx + 1, c: colCursor },
          e: { r: rIdx + 1, c: colCursor + span - 1 },
        });
        for (let i = 1; i < span; i++) flat.push("");
      }
      colCursor += span;
    });
    while (flat.length < sheet.headers.length) flat.push("");
    aoa.push(flat);
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  if (merges.length) ws["!merges"] = merges;
  ws["!cols"] = sheet.headers.map(() => ({ wch: 18 }));
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Lançamentos");
  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
};
