import * as XLSX from "xlsx-js-style";

export interface AccountingExportEntry {
  date: string;
  amountInCents: number;
  debitCode: string;
  creditCode: string;
  history: string;
  debitCostCenter?: string;
  creditCostCenter?: string;
  debitDescription?: string;
  creditDescription?: string;
  referenceCode?: string;
  referenceDescription?: string;
  type?: string;
  section?: string;
  mappingSource?: string;
  mappingReason?: string;
}

export interface AccountingExportComparison {
  label: string;
  documentAmountInCents: number;
  entriesAmountInCents: number;
  differenceInCents: number;
  source?: string;
  blocking?: boolean;
  note?: string;
}

interface ExportAccountingWorkbookOptions {
  moduleTitle: string;
  competence: string;
  fileName: string;
  entries: AccountingExportEntry[];
  comparisons?: AccountingExportComparison[];
  note?: string;
}

type StyledCell = {
  s?: Record<string, unknown>;
  z?: string;
};

type StyledSheet = XLSX.WorkSheet & Record<string, unknown>;

const COLORS = {
  darkBlue: "17365D",
  lightBlue: "D9EAF7",
  totalGreen: "E2F0D9",
  noteYellow: "FFF2CC",
  borderBlue: "B4C6E7",
  text: "111827",
  white: "FFFFFF",
};

const border = {
  top: { style: "thin", color: { rgb: COLORS.borderBlue } },
  bottom: { style: "thin", color: { rgb: COLORS.borderBlue } },
  left: { style: "thin", color: { rgb: COLORS.borderBlue } },
  right: { style: "thin", color: { rgb: COLORS.borderBlue } },
};

const headerStyle = {
  font: { name: "Aptos", sz: 10, bold: true, color: { rgb: COLORS.white } },
  fill: { patternType: "solid", fgColor: { rgb: COLORS.darkBlue } },
  alignment: { vertical: "center" },
  border,
};

const titleStyle = {
  font: { name: "Aptos Display", sz: 15, bold: true, color: { rgb: COLORS.white } },
  fill: { patternType: "solid", fgColor: { rgb: COLORS.darkBlue } },
  alignment: { vertical: "center" },
};

const secondaryHeaderStyle = {
  font: { name: "Carlito", sz: 11, bold: true, color: { rgb: COLORS.darkBlue } },
  fill: { patternType: "solid", fgColor: { rgb: COLORS.lightBlue } },
  alignment: { vertical: "center" },
  border,
};

const whiteBodyStyle = {
  font: { name: "Aptos", sz: 10, color: { rgb: COLORS.text } },
  alignment: { vertical: "center" },
  border,
};

const blueBodyStyle = {
  ...whiteBodyStyle,
  fill: { patternType: "solid", fgColor: { rgb: COLORS.lightBlue } },
};

const totalStyle = {
  font: { name: "Carlito", sz: 11, bold: true, color: { rgb: COLORS.text } },
  fill: { patternType: "solid", fgColor: { rgb: COLORS.totalGreen } },
  border,
};

const noteStyle = {
  font: { name: "Aptos", sz: 10, color: { rgb: COLORS.text } },
  fill: { patternType: "solid", fgColor: { rgb: COLORS.noteYellow } },
  alignment: { vertical: "center", wrapText: true },
};

const statusOkStyle = {
  font: { name: "Aptos", sz: 10, bold: true, color: { rgb: "006100" } },
  fill: { patternType: "solid", fgColor: { rgb: "C6EFCE" } },
  border,
};

const moneyFormat = "#,##0.00;[Red](#,##0.00);-";

function cell(sheet: XLSX.WorkSheet, row: number, column: number) {
  return sheet[XLSX.utils.encode_cell({ r: row, c: column })] as StyledCell | undefined;
}

function applyStyle(sheet: XLSX.WorkSheet, row: number, column: number, style: Record<string, unknown>, numberFormat?: string) {
  const target = cell(sheet, row, column);
  if (!target) return;
  target.s = style;
  if (numberFormat) target.z = numberFormat;
}

function styleRow(sheet: XLSX.WorkSheet, row: number, columnCount: number, style: Record<string, unknown>) {
  for (let column = 0; column < columnCount; column += 1) applyStyle(sheet, row, column, style);
}

function sourceLabel(source?: string) {
  const labels: Record<string, string> = {
    learned: "Aprendido",
    predefined: "Pré-definido",
    ai: "IA aprovada",
    manual: "Manual aprovado",
    unresolved: "Pendente",
  };
  return labels[source || ""] || source || "—";
}

function buildLaunchSheet(entries: AccountingExportEntry[]) {
  const headers = [
    "Data do lançamento",
    "Valor do lançamento",
    "Conta de débito",
    "Conta de crédito",
    "Histórico variável",
    "Centro de custo débito",
    "Centro de custo crédito",
  ];
  const rows = entries.map(entry => [
    entry.date,
    entry.amountInCents / 100,
    entry.debitCode,
    entry.creditCode,
    entry.history,
    entry.debitCostCenter || "",
    entry.creditCostCenter || "",
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]) as StyledSheet;

  styleRow(sheet, 0, headers.length, headerStyle);
  for (let row = 1; row <= rows.length; row += 1) {
    styleRow(sheet, row, headers.length, row % 2 === 0 ? whiteBodyStyle : blueBodyStyle);
    applyStyle(sheet, row, 1, row % 2 === 0 ? whiteBodyStyle : blueBodyStyle, moneyFormat);
  }

  sheet["!cols"] = [
    { wch: 18 },
    { wch: 20 },
    { wch: 17 },
    { wch: 17 },
    { wch: 48 },
    { wch: 23 },
    { wch: 23 },
  ];
  sheet["!rows"] = [{ hpt: 22 }, ...rows.map(() => ({ hpt: 18 }))];
  sheet["!autofilter"] = { ref: `A1:G${Math.max(1, rows.length + 1)}` };
  return sheet;
}

function buildConferenceSheet(moduleTitle: string, competence: string, comparisons: AccountingExportComparison[], note?: string) {
  const headers = ["REFERÊNCIA", "DOCUMENTO ORIGINAL", "LANÇAMENTOS", "DIFERENÇA", "RESULTADO", "OBSERVAÇÃO"];
  const comparisonRows = comparisons.map(row => {
    const informational = row.blocking === false;
    const result = informational && row.differenceInCents !== 0
      ? "INFORMATIVO"
      : row.differenceInCents === 0
        ? "OK"
        : "REVISAR";
    const observation = [row.source, row.note].filter(Boolean).join(" · ");
    return [
      row.label,
      row.documentAmountInCents / 100,
      row.entriesAmountInCents / 100,
      row.differenceInCents / 100,
      result,
      observation,
    ];
  });

  const overallOk = comparisons.filter(row => row.blocking !== false).every(row => row.differenceInCents === 0);
  const statusRow = ["STATUS GERAL", "", "", "", overallOk ? "OK" : "REVISAR", ""];
  const noteText = note || "A conferência compara os valores do documento original com os lançamentos gerados. Diferenças informativas não bloqueiam a exportação.";
  const data = [
    [`CONFERÊNCIA ${moduleTitle.toUpperCase()} - ${competence}`],
    [],
    headers,
    ...comparisonRows,
    statusRow,
    [],
    [noteText],
  ];
  const sheet = XLSX.utils.aoa_to_sheet(data) as StyledSheet;
  const lastColumn = headers.length - 1;
  const statusIndex = 3 + comparisonRows.length;
  const noteIndex = statusIndex + 2;

  sheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: lastColumn } },
    { s: { r: noteIndex, c: 0 }, e: { r: noteIndex, c: lastColumn } },
  ];
  styleRow(sheet, 0, headers.length, titleStyle);
  styleRow(sheet, 2, headers.length, secondaryHeaderStyle);
  for (let row = 3; row < statusIndex; row += 1) {
    styleRow(sheet, row, headers.length, whiteBodyStyle);
    applyStyle(sheet, row, 1, whiteBodyStyle, moneyFormat);
    applyStyle(sheet, row, 2, whiteBodyStyle, moneyFormat);
    applyStyle(sheet, row, 3, whiteBodyStyle, moneyFormat);
    const status = String((sheet[XLSX.utils.encode_cell({ r: row, c: 4 })] as { v?: unknown } | undefined)?.v || "");
    if (status === "OK") applyStyle(sheet, row, 4, statusOkStyle);
  }
  styleRow(sheet, statusIndex, headers.length, totalStyle);
  if (overallOk) applyStyle(sheet, statusIndex, 4, statusOkStyle);
  styleRow(sheet, noteIndex, headers.length, noteStyle);

  sheet["!cols"] = [
    { wch: 32 },
    { wch: 22 },
    { wch: 22 },
    { wch: 18 },
    { wch: 16 },
    { wch: 65 },
  ];
  sheet["!rows"] = data.map((_, index) => ({ hpt: index === 0 ? 25 : index === noteIndex ? 34 : 20 }));
  return sheet;
}

function buildMappingSheet(entries: AccountingExportEntry[]) {
  const headers = [
    "RUBRICA",
    "DESCRIÇÃO NO PDF",
    "TIPO",
    "SEÇÃO",
    "C.R. DÉBITO",
    "DESCRIÇÃO DÉBITO",
    "C.R. CRÉDITO",
    "DESCRIÇÃO CRÉDITO",
    "ORIGEM DO MAPEAMENTO",
    "EXPLICAÇÃO",
  ];

  const unique = new Map<string, AccountingExportEntry>();
  entries.forEach(entry => {
    const key = [
      entry.referenceCode,
      entry.referenceDescription || entry.history,
      entry.type,
      entry.section,
      entry.debitCode,
      entry.creditCode,
      entry.debitCostCenter,
      entry.creditCostCenter,
    ].join("|");
    if (!unique.has(key)) unique.set(key, entry);
  });

  const rows = [...unique.values()].map(entry => [
    entry.referenceCode || "—",
    entry.referenceDescription || entry.history,
    (entry.type || "—").toUpperCase(),
    (entry.section || "—").toUpperCase(),
    entry.debitCode,
    entry.debitDescription || "—",
    entry.creditCode,
    entry.creditDescription || "—",
    sourceLabel(entry.mappingSource),
    entry.mappingReason || "—",
  ]);
  const sheet = XLSX.utils.aoa_to_sheet([headers, ...rows]) as StyledSheet;

  styleRow(sheet, 0, headers.length, headerStyle);
  for (let row = 1; row <= rows.length; row += 1) {
    styleRow(sheet, row, headers.length, row % 2 === 0 ? whiteBodyStyle : blueBodyStyle);
  }
  sheet["!cols"] = [
    { wch: 11 },
    { wch: 37 },
    { wch: 18 },
    { wch: 19 },
    { wch: 13 },
    { wch: 30 },
    { wch: 13 },
    { wch: 31 },
    { wch: 23 },
    { wch: 58 },
  ];
  sheet["!rows"] = [{ hpt: 22 }, ...rows.map(() => ({ hpt: 18 }))];
  sheet["!autofilter"] = { ref: `A1:J${Math.max(1, rows.length + 1)}` };
  return sheet;
}

export function exportAccountingWorkbook(options: ExportAccountingWorkbookOptions) {
  const workbook = XLSX.utils.book_new();
  const launchSheet = buildLaunchSheet(options.entries);
  const conferenceSheet = buildConferenceSheet(options.moduleTitle, options.competence, options.comparisons ?? [], options.note);
  const mappingSheet = buildMappingSheet(options.entries);

  XLSX.utils.book_append_sheet(workbook, launchSheet, "Lançamentos");
  XLSX.utils.book_append_sheet(workbook, conferenceSheet, "Conferência");
  XLSX.utils.book_append_sheet(workbook, mappingSheet, "Mapeamento");
  XLSX.writeFile(workbook, options.fileName, { compression: true });
}
