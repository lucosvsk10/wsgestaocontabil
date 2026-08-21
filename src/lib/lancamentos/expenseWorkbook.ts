import * as XLSX from "xlsx";

export type ExpenseGroupSide = "debit" | "credit";

export interface ExpenseEntry {
  id: string;
  sourceFile: string;
  sourceSheet: string;
  sourceRow: number;
  date: string;
  history: string;
  debitCode: string;
  creditCode: string;
  debitDescription: string;
  debitCostCenter: string;
  creditDescription: string;
  creditCostCenter: string;
  amountInCents: number;
}

export interface ExpenseImportIssue {
  id: string;
  fileName: string;
  sheetName: string;
  row: number;
  message: string;
}

export interface ExpenseImportResult {
  entries: ExpenseEntry[];
  issues: ExpenseImportIssue[];
  ignoredRows: number;
}

export interface GroupedExpenseEntry extends ExpenseEntry {
  sourceEntryIds: string[];
  sourceCount: number;
  hasMixedCounterpart: boolean;
}

const aliases = {
  date: ["data", "data lancamento", "data do lancamento"],
  history: ["historico", "historico variavel", "descricao", "complemento"],
  debitCode: ["debito", "conta de debito", "conta debito", "cr debito", "codigo reduzido debito"],
  creditCode: ["credito", "conta de credito", "conta credito", "cr credito", "codigo reduzido credito"],
  debitDescription: ["descricao debito", "nome conta debito", "conta debito descricao"],
  debitCostCenter: ["centro de custo debito", "cc debito", "c c debito"],
  creditDescription: ["descricao credito", "nome conta credito", "conta credito descricao"],
  creditCostCenter: ["centro de custo credito", "cc credito", "c c credito"],
  amount: ["valor", "valor lancamento", "valor do lancamento"],
} as const;

type ColumnKey = keyof typeof aliases;
type RowRecord = Record<string, unknown>;

export async function detectWorkbookCompetence(file: File): Promise<{ month: string; year: string } | null> {
  const named = file.name.match(/(?:^|\D)(0?[1-9]|1[0-2])[-_/](20\d{2})(?:\D|$)/);
  if (named) return { month: named[1].padStart(2, "0"), year: named[2] };
  if (!/\.(xlsx?|csv)$/i.test(file.name)) return null;
  try {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
    for (const sheetName of workbook.SheetNames) {
      const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
      for (const row of rows.slice(0, 80)) for (const value of row) {
        if (!(value instanceof Date) && !(typeof value === "string" && /^\d{1,2}[/-]\d{1,2}[/-]\d{2,4}$/.test(value.trim()))) continue;
        const parsed = parseDate(value); const match = parsed.match(/^\d{2}\/(\d{2})\/(20\d{2})$/);
        if (match) return { month: match[1], year: match[2] };
      }
    }
  } catch { return null; }
  return null;
}

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[._()/-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function findColumn(headers: string[], key: ColumnKey) {
  return headers.findIndex((header) => aliases[key].includes(normalizeHeader(header) as never));
}

function toText(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseAmount(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return Math.round(value * 100);

  const raw = toText(value).replace(/R\$/gi, "").replace(/\s/g, "");
  if (!raw) return null;

  const normalized = raw.includes(",")
    ? raw.replace(/\./g, "").replace(",", ".")
    : raw.replace(/,/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : null;
}

function parseDate(value: unknown) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(value);
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) return `${String(parsed.d).padStart(2, "0")}/${String(parsed.m).padStart(2, "0")}/${parsed.y}`;
  }

  const text = toText(value);
  const match = text.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/);
  if (!match) return text;
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${match[1].padStart(2, "0")}/${match[2].padStart(2, "0")}/${year}`;
}

function rowValue(row: unknown[], index: number) {
  return index >= 0 ? row[index] : undefined;
}

function locateHeader(rows: unknown[][]) {
  return rows.findIndex((row) => {
    const headers = row.map((cell) => toText(cell));
    return findColumn(headers, "debitCode") >= 0 && findColumn(headers, "creditCode") >= 0 && findColumn(headers, "amount") >= 0;
  });
}

export async function readExpenseWorkbook(file: File): Promise<ExpenseImportResult> {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const result: ExpenseImportResult = { entries: [], issues: [], ignoredRows: 0 };

  workbook.SheetNames.forEach((sheetName) => {
    const worksheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, { header: 1, defval: "", raw: true });
    const headerIndex = locateHeader(rows);

    if (headerIndex < 0) {
      result.issues.push({
        id: `${file.name}-${sheetName}-header`,
        fileName: file.name,
        sheetName,
        row: 0,
        message: "Cabeçalho do Calima não reconhecido nesta planilha.",
      });
      return;
    }

    const headers = rows[headerIndex].map((cell) => toText(cell));
    const columns: Record<ColumnKey, number> = {
      date: findColumn(headers, "date"),
      history: findColumn(headers, "history"),
      debitCode: findColumn(headers, "debitCode"),
      creditCode: findColumn(headers, "creditCode"),
      debitDescription: findColumn(headers, "debitDescription"),
      debitCostCenter: findColumn(headers, "debitCostCenter"),
      creditDescription: findColumn(headers, "creditDescription"),
      creditCostCenter: findColumn(headers, "creditCostCenter"),
      amount: findColumn(headers, "amount"),
    };

    rows.slice(headerIndex + 1).forEach((row, offset) => {
      const sourceRow = headerIndex + offset + 2;
      const debitCode = toText(rowValue(row, columns.debitCode));
      const creditCode = toText(rowValue(row, columns.creditCode));
      const amountInCents = parseAmount(rowValue(row, columns.amount));
      const hasContent = row.some((cell) => toText(cell));

      if (!hasContent) return;
      if (!debitCode && !creditCode && amountInCents === null) {
        result.ignoredRows += 1;
        return;
      }

      if (!debitCode || !creditCode || amountInCents === null || amountInCents <= 0) {
        result.issues.push({
          id: `${file.name}-${sheetName}-${sourceRow}`,
          fileName: file.name,
          sheetName,
          row: sourceRow,
          message: "Linha ignorada: débito, crédito ou valor está ausente ou inválido.",
        });
        return;
      }

      result.entries.push({
        id: `${file.name}-${sheetName}-${sourceRow}`,
        sourceFile: file.name,
        sourceSheet: sheetName,
        sourceRow,
        date: parseDate(rowValue(row, columns.date)),
        history: toText(rowValue(row, columns.history)),
        debitCode,
        creditCode,
        debitDescription: toText(rowValue(row, columns.debitDescription)),
        debitCostCenter: toText(rowValue(row, columns.debitCostCenter)),
        creditDescription: toText(rowValue(row, columns.creditDescription)),
        creditCostCenter: toText(rowValue(row, columns.creditCostCenter)),
        amountInCents,
      });
    });
  });

  return result;
}

export function groupExpenseEntries(entries: ExpenseEntry[], side: ExpenseGroupSide, exportDate: string) {
  const groups = new Map<string, GroupedExpenseEntry>();

  entries.forEach((entry) => {
    const selectedCode = side === "debit" ? entry.debitCode : entry.creditCode;
    const selectedDescription = side === "debit" ? entry.debitDescription : entry.creditDescription;
    const oppositeCode = side === "debit" ? entry.creditCode : entry.debitCode;
    const key = `${selectedCode}::${oppositeCode}`;
    const current = groups.get(key);

    if (current) {
      current.amountInCents += entry.amountInCents;
      current.sourceEntryIds.push(entry.id);
      current.sourceCount += 1;
      return;
    }

    groups.set(key, {
      ...entry,
      date: exportDate,
      history: (selectedDescription || `CONTA ${selectedCode}`).toUpperCase(),
      sourceEntryIds: [entry.id],
      sourceCount: 1,
      hasMixedCounterpart: false,
    });
  });

  return Array.from(groups.values()).sort((a, b) => {
    const aLabel = side === "debit" ? a.debitDescription || a.debitCode : a.creditDescription || a.creditCode;
    const bLabel = side === "debit" ? b.debitDescription || b.debitCode : b.creditDescription || b.creditCode;
    return aLabel.localeCompare(bLabel, "pt-BR");
  });
}

export function exportGroupedExpenses(entries: GroupedExpenseEntry[], competence: string) {
  const rows: RowRecord[] = entries.map((entry) => ({
    DATA: entry.date,
    "HISTÓRICO VARIÁVEL": entry.history,
    DÉBITO: entry.debitCode,
    CRÉDITO: entry.creditCode,
    "DESCRIÇÃO DÉBITO": entry.debitDescription,
    "C.C. DÉBITO": entry.debitCostCenter,
    "DESCRIÇÃO CRÉDITO": entry.creditDescription,
    "C.C. CRÉDITO": entry.creditCostCenter,
    VALOR: entry.amountInCents / 100,
  }));
  const worksheet = XLSX.utils.json_to_sheet(rows);
  worksheet["!cols"] = [{ wch: 13 }, { wch: 46 }, { wch: 12 }, { wch: 12 }, { wch: 30 }, { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 16 }];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Despesas agrupadas");
  XLSX.writeFile(workbook, `despesas-agrupadas-${competence.replace("/", "-")}.xlsx`, { compression: true });
}
