import type { PlanoContasMap } from "./LancamentosTable";

export interface Lancamento {
  id: string;
  data: string | null;
  historico: string | null;
  debito: string | null;
  credito: string | null;
  valor: number | null;
  centro_custo_debito: string | null;
  centro_custo_credito: string | null;
  created_at: string;
}

export type ExportMode = "data" | "conta" | "saldo";

export interface SheetCell {
  value: string | number;
  bold?: boolean;
  color?: string;
  bg?: string;
  colSpan?: number;
  numeric?: boolean;
  isTotal?: boolean;
}

export interface SheetData {
  headers: string[];
  rows: SheetCell[][];
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return "-";
  const m = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  return dateStr;
};

const getDescricao = (codigo: string | null, plano: PlanoContasMap) => {
  if (!codigo) return "-";
  return plano[codigo] || "-";
};

const getLastDayOfMonth = (competencia: string): string => {
  const [year, month] = competencia.split("-").map(Number);
  const lastDay = new Date(year, month, 0).getDate();
  return `${String(lastDay).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
};

const cell = (value: string | number, extra: Partial<SheetCell> = {}): SheetCell => ({
  value,
  ...extra,
});

const emptyRow = (n: number): SheetCell[] => Array.from({ length: n }, () => cell(""));

export function buildByDate(lancs: Lancamento[], plano: PlanoContasMap): SheetData {
  const headers = [
    "Data",
    "Histórico",
    "Débito",
    "Desc. Débito",
    "Crédito",
    "Desc. Crédito",
    "CC Débito",
    "CC Crédito",
    "Valor",
  ];
  const rows: SheetCell[][] = lancs.map((l) => [
    cell(formatDate(l.data)),
    cell(l.historico || "-"),
    cell(l.debito || "-"),
    cell(getDescricao(l.debito, plano)),
    cell(l.credito || "-"),
    cell(getDescricao(l.credito, plano)),
    cell(l.centro_custo_debito || "-"),
    cell(l.centro_custo_credito || "-"),
    cell(l.valor ?? 0, { numeric: true }),
  ]);

  const total = lancs.reduce((s, l) => s + (l.valor || 0), 0);
  rows.push([
    cell("", { isTotal: true }),
    cell(`Total (${lancs.length} lançamentos)`, { bold: true, isTotal: true }),
    cell("", { isTotal: true }),
    cell("", { isTotal: true }),
    cell("", { isTotal: true }),
    cell("", { isTotal: true }),
    cell("", { isTotal: true }),
    cell("", { isTotal: true }),
    cell(total, { bold: true, numeric: true, isTotal: true }),
  ]);

  return { headers, rows };
}

export function buildByAccount(lancs: Lancamento[], plano: PlanoContasMap): SheetData {
  const headers = [
    "Data",
    "Histórico",
    "Débito",
    "Desc. Débito",
    "Crédito",
    "Desc. Crédito",
    "CC Débito",
    "CC Crédito",
    "Valor",
  ];
  const ncols = headers.length;

  const groups: Record<string, { conta: string; descricao: string; items: Lancamento[] }> = {};
  for (const l of lancs) {
    const key = l.debito || "sem-conta";
    if (!groups[key]) {
      groups[key] = {
        conta: l.debito || "Sem conta",
        descricao: getDescricao(l.debito, plano),
        items: [],
      };
    }
    groups[key].items.push(l);
  }
  const sorted = Object.values(groups).sort((a, b) =>
    a.conta.localeCompare(b.conta, undefined, { numeric: true })
  );

  const rows: SheetCell[][] = [];
  for (const g of sorted) {
    rows.push([
      cell(`Conta: ${g.conta} | ${g.descricao !== "-" ? g.descricao : "Sem descrição"}`, {
        bold: true,
        bg: "#f3f4f6",
        colSpan: ncols,
      }),
    ]);
    for (const l of g.items) {
      rows.push([
        cell(formatDate(l.data)),
        cell(l.historico || "-"),
        cell(l.debito || "-"),
        cell(getDescricao(l.debito, plano)),
        cell(l.credito || "-"),
        cell(getDescricao(l.credito, plano)),
        cell(l.centro_custo_debito || "-"),
        cell(l.centro_custo_credito || "-"),
        cell(l.valor ?? 0, { numeric: true }),
      ]);
    }
    const sub = g.items.reduce((s, l) => s + (l.valor || 0), 0);
    rows.push([
      cell(""),
      cell(`Subtotal: ${g.items.length} lançamento(s)`, { bold: true }),
      cell(""),
      cell(""),
      cell(""),
      cell(""),
      cell(""),
      cell(""),
      cell(sub, { bold: true, numeric: true }),
    ]);
    rows.push(emptyRow(ncols));
  }
  const grand = lancs.reduce((s, l) => s + (l.valor || 0), 0);
  rows.push([
    cell(""),
    cell(`Total Geral (${lancs.length} lançamentos)`, { bold: true }),
    cell(""),
    cell(""),
    cell(""),
    cell(""),
    cell(""),
    cell(""),
    cell(grand, { bold: true, numeric: true }),
  ]);
  return { headers, rows };
}

export function buildBalanceByAccount(
  lancs: Lancamento[],
  plano: PlanoContasMap,
  competencia: string,
): SheetData {
  const headers = ["Data", "Débito", "Histórico", "Valor", "Crédito", "CC Débito", "CC Crédito"];
  const lastDay = getLastDayOfMonth(competencia);
  const groups: Record<string, { conta: string; descricao: string; total: number }> = {};
  for (const l of lancs) {
    const key = l.debito || "sem-conta";
    if (!groups[key]) {
      groups[key] = {
        conta: l.debito || "Sem conta",
        descricao: getDescricao(l.debito, plano),
        total: 0,
      };
    }
    groups[key].total += l.valor || 0;
  }
  const sorted = Object.values(groups).sort((a, b) =>
    a.conta.localeCompare(b.conta, undefined, { numeric: true })
  );
  const rows: SheetCell[][] = sorted.map((g) => [
    cell(lastDay),
    cell(g.conta),
    cell(`(-) ${g.descricao !== "-" ? g.descricao : "Sem descrição"}`),
    cell(g.total, { numeric: true }),
    cell("374"),
    cell("100"),
    cell(""),
  ]);
  const grand = sorted.reduce((s, g) => s + g.total, 0);
  rows.push([
    cell("", { isTotal: true }),
    cell("", { isTotal: true }),
    cell(`Total Geral (${sorted.length} contas)`, { bold: true, isTotal: true }),
    cell(grand, { bold: true, numeric: true, isTotal: true }),
    cell("", { isTotal: true }),
    cell("", { isTotal: true }),
    cell("", { isTotal: true }),
  ]);
  return { headers, rows };
}

export function buildSheetData(
  mode: ExportMode,
  lancs: Lancamento[],
  plano: PlanoContasMap,
  competencia: string,
): SheetData {
  if (mode === "data") return buildByDate(lancs, plano);
  if (mode === "conta") return buildByAccount(lancs, plano);
  return buildBalanceByAccount(lancs, plano, competencia);
}

export const MODE_LABELS: Record<ExportMode, string> = {
  data: "Por Data",
  conta: "Por Conta",
  saldo: "Saldo por Conta",
};
