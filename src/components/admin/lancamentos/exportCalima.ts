import * as XLSX from "xlsx";
import type { PlanoContasMap } from "./LancamentosTable";
import { lookupPlanoContasDescricao } from "@/lib/planoContas";

export interface CalimaRow {
  data: string | null; // "YYYY-MM-DD" or "DD/MM/YYYY"
  valor: number | null;
  conta_debito: string | null;
  conta_credito: string | null;
  historico: string | null;
  cc_debito?: string | null;
  cc_credito?: string | null;
}

const CALIMA_HEADERS = [
  "Data do lançamento",
  "Valor do lançamento",
  "Conta de débito",
  "Conta de crédito",
  "Histórico variável",
  "Centro de custo débito",
  "Centro de custo crédito",
];

const formatDateBR = (d: string | null): string => {
  if (!d) return "";
  const iso = d.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[3]}/${iso[2]}/${iso[1]}`;
  const br = d.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  return br ? `${br[1]}/${br[2]}/${br[3]}` : d;
};

const ccFor = (code: string | null, plano: PlanoContasMap): string => {
  if (!code) return "";
  const desc = lookupPlanoContasDescricao(plano, code);
  return /\(-\)/.test(desc) ? "100" : "";
};

export const exportCalimaXlsx = (
  rows: CalimaRow[],
  plano: PlanoContasMap,
  filename: string,
) => {
  const aoa: (string | number)[][] = [CALIMA_HEADERS];
  for (const r of rows) {
    aoa.push([
      formatDateBR(r.data),
      Number(r.valor) || 0,
      (r.conta_debito || "").toString().trim(),
      (r.conta_credito || "").toString().trim(),
      (r.historico || "").toString().toUpperCase(),
      r.cc_debito != null && String(r.cc_debito).trim() !== "" ? String(r.cc_debito).trim() : ccFor(r.conta_debito, plano),
      r.cc_credito != null && String(r.cc_credito).trim() !== "" ? String(r.cc_credito).trim() : ccFor(r.conta_credito, plano),
    ]);
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  ws["!cols"] = [
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
    { wch: 50 }, { wch: 14 }, { wch: 14 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Calima");
  const name = filename.endsWith(".xlsx") ? filename : `${filename}.xlsx`;
  XLSX.writeFile(wb, name);
};
