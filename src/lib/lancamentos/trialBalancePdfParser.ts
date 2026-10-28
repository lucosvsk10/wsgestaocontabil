import * as pdfjs from "pdfjs-dist";
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
import type { TrialBalanceResult, TrialBalanceRow } from "./trialBalance";
import { analyticalTrialBalanceRows, validateTrialBalanceRow } from "./trialBalance";

type PdfToken = { x: number; y: number; text: string };
type ParsedRow = { code: string; title: string; reduced: string; previous: string; debit: string; credit: string; current: string; page: number };
const moneyExpression = /^-?[\d.]+,\d{2}$/;

function amount(value: string) {
  const cleaned = value.trim().replace(/\s+/g, "");
  if (!cleaned || cleaned === "0,00") return 0;
  if (!moneyExpression.test(cleaned)) throw new Error("Valor monetário ilegível: " + cleaned);
  return Math.round(Number(cleaned.replace(/\./g, "").replace(",", ".")) * 100);
}
function splitBalance(value: string) {
  const match = value.trim().match(/^([\d.]+,\d{2})\s*([DC])?$/i);
  if (!match) throw new Error("Saldo não identificado: " + value);
  return { cents: amount(match[1]), nature: match[2] ? (match[2].toUpperCase() as "D" | "C") : "" as "" };
}
function collect(tokens: PdfToken[], left: number, right: number) {
  return tokens.filter(token => token.x >= left && token.x < right).sort((a, b) => a.x - b.x).map(t => t.text).join(" ").trim();
}
function parsePage(tokens: PdfToken[], page: number, width: number) {
  const factor = width / 595;
  const ordered = [...tokens].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: PdfToken[][] = [];
  for (const token of ordered) {
    let line = lines.find(row => Math.abs(row[0].y - token.y) <= 3.5 * factor);
    if (!line) { line = []; lines.push(line); }
    line.push(token);
  }
  const rows: ParsedRow[] = [];
  for (const line of lines) {
    const code = collect(line, 0, 85 * factor);
    const reduced = collect(line, 267 * factor, 305 * factor);
    const title = collect(line, 85 * factor, 267 * factor);
    if (/^\d{1,20}$/.test(code) && /^\d{1,10}$/.test(reduced)) {
      rows.push({
        code, reduced, title,
        previous: collect(line, 305 * factor, 380 * factor),
        debit: collect(line, 380 * factor, 449 * factor),
        credit: collect(line, 449 * factor, 516 * factor),
        current: collect(line, 516 * factor, 595 * factor),
        page,
      });
    } else if (rows.length && !code && !reduced && title && !/CONTA|TÍTULO|Página|Ref\./i.test(title)) {
      // Long account titles can wrap into the following physical line.
      rows[rows.length - 1].title += " " + title;
    }
  }
  return rows;
}

export async function parseCalimaTrialBalance(file: File): Promise<TrialBalanceResult & { previousBalanceVerified: boolean }> {
  if (!/\.pdf$/i.test(file.name)) throw new Error("Selecione um Balancete do Calima em PDF.");
  const buffer = await file.arrayBuffer();
  // Text extraction only; scanned PDFs without a selectable text layer are rejected.
  const document = await pdfjs.getDocument({ data: new Uint8Array(buffer), useSystemFonts: true, disableFontFace: true }).promise;
  try {
    let header = "";
    let allRows: ParsedRow[] = [];
    for (let index = 1; index <= document.numPages; index++) {
      const page = await document.getPage(index);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const tokens: PdfToken[] = content.items.flatMap(item => {
        if (!("str" in item) || !item.str?.trim()) return [];
        const [,, , , x, y] = item.transform;
        return [{ x, y: viewport.height - y, text: item.str.trim() }];
      });
      header += " " + tokens.filter(t => t.y < 110 || t.y > viewport.height - 45).map(t => t.text).join(" ");
      allRows.push(...parsePage(tokens, index, viewport.width));
    }
    if (!allRows.length) throw new Error("Não foi possível ler linhas contábeis do PDF. Verifique se o arquivo é pesquisável e não apenas uma imagem.");
    const match = header.match(/Ref\.?\s*(0[1-9]|1[0-2])\s*\/\s*(20\d{2})(?:\s*a\s*(0[1-9]|1[0-2])\s*\/\s*(20\d{2}))?/i);
    if (!match) throw new Error("A competência indicada em 'Ref.' não foi identificada no PDF.");
    const competence = String(match[3] ?? match[1]) + "/" + String(match[4] ?? match[2]);
    const rows: TrialBalanceRow[] = [];
    const warnings: string[] = [];
    for (const entry of allRows) {
      try {
        if (!entry.previous || !entry.debit || !entry.credit || !entry.current) throw new Error("coluna ausente");
        const previous = splitBalance(entry.previous);
        const current = splitBalance(entry.current);
        rows.push({
          id: entry.code + "-" + entry.reduced + "-" + rows.length,
          accountCode: entry.code, title: entry.title.trim(), reducedCode: entry.reduced,
          previousBalanceInCents: previous.cents, previousNature: previous.nature,
          debitInCents: amount(entry.debit), creditInCents: amount(entry.credit),
          currentBalanceInCents: current.cents, currentNature: current.nature,
          source: "PDF página " + entry.page, confidence: 1,
          previousBalanceRead: true,
        } as TrialBalanceRow & { previousBalanceRead: boolean });
      } catch (reason) {
        warnings.push(entry.code + " / C.R. " + entry.reduced + ": " + (reason instanceof Error ? reason.message : "leitura inválida"));
      }
    }
    if (warnings.length || rows.length !== allRows.length) throw new Error("A leitura encontrou " + warnings.length + " linha(s) incompleta(s). Não importei dados parciais: " + warnings.slice(0, 4).join("; "));
    const analytical = analyticalTrialBalanceRows(rows);
    if (rows.length < 10 || analytical.length < 4) throw new Error("O PDF não contém um balancete analítico completo.");
    const invalid = rows.filter(row => Math.abs(validateTrialBalanceRow(row)) > 1);
    if (invalid.length) throw new Error("O documento tem " + invalid.length + " divergência(s) aritmética(s) ou erros de leitura, por exemplo " + invalid.slice(0, 3).map(row => "C.R. " + row.reducedCode).join(", ") + ". Importação cancelada.");
    const companyMatch = header.match(/CICERO\s+FONSECA\s+COSTA/i);
    return {
      competence,
      companyName: companyMatch?.[0] ?? "",
      rows, warnings: [], validationIssues: [], validated: true,
      previousBalanceVerified: true,
      processingMeta: { model: "PDF.js — sem IA", routing: "local-text-layer" },
    };
  } finally {
    await document.destroy();
  }
}
