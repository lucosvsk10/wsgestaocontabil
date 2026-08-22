import * as XLSX from "xlsx";

export interface CostCenter {
  id: string;
  code: string;
  description: string;
  active: boolean;
  source?: string;
}

export type CostCenterSide = "debit" | "credit" | "both";

export interface AccountCostCenterRule {
  id: string;
  accountReducedCode: string;
  side: CostCenterSide;
  costCenterCode: string;
  required: boolean;
  eventPattern?: string;
  source?: string;
}

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[._/()-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

const codeHeaders = ["codigo", "cod", "codigo centro de custo", "cod centro de custo", "centro de custo", "c c"];
const descriptionHeaders = ["descricao", "nome", "descricao centro de custo", "centro de custo descricao"];

export async function readCostCenters(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const centers: CostCenter[] = [];

  workbook.SheetNames.forEach(sheetName => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
    const headerIndex = rows.findIndex(row => {
      const headers = row.map(normalize);
      return headers.some(header => codeHeaders.includes(header)) && headers.some(header => descriptionHeaders.includes(header));
    });
    if (headerIndex < 0) return;
    const headers = rows[headerIndex].map(normalize);
    const codeIndex = headers.findIndex(header => codeHeaders.includes(header));
    const descriptionIndex = headers.findIndex(header => descriptionHeaders.includes(header));
    const activeIndex = headers.findIndex(header => ["ativo", "status", "situacao"].includes(header));

    rows.slice(headerIndex + 1).forEach((row, offset) => {
      const code = String(row[codeIndex] ?? "").trim();
      const description = String(row[descriptionIndex] ?? "").trim();
      if (!code && !description) return;
      const status = normalize(activeIndex >= 0 ? row[activeIndex] : "ativo");
      centers.push({
        id: `${file.name}-${sheetName}-${headerIndex + offset + 2}`,
        code,
        description,
        active: !["inativo", "nao", "não", "0", "false"].includes(status),
        source: file.name,
      });
    });
  });

  return Array.from(new Map(centers.map(center => [center.code || center.description, center])).values());
}

export function costCenterRequired(rules: AccountCostCenterRule[], reducedCode: string, side: "debit" | "credit", history = "") {
  const normalizedHistory = normalize(history);
  return rules.some(rule => rule.required
    && rule.accountReducedCode === reducedCode
    && (rule.side === side || rule.side === "both")
    && (!rule.eventPattern || normalizedHistory.includes(normalize(rule.eventPattern))));
}
