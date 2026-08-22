import * as XLSX from "xlsx";

export interface ChartAccount {
  id: string;
  account: string;
  analytical: boolean;
  reducedCode: string;
  description: string;
  sped: boolean;
}

function normalize(value: unknown) {
  return String(value ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[._/()-]+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
}

function toBoolean(value: unknown) {
  return ["sim", "s", "yes", "true", "1"].includes(normalize(value));
}

function rootAccount(root: string): ChartAccount {
  const labels: Record<string, string> = { "1": "ATIVO", "2": "PASSIVO", "3": "RECEITA", "4": "DESPESA", "6": "RESULTADOS" };
  return {
    id: `auto-root-${root}`,
    account: root,
    analytical: false,
    reducedCode: `ROOT-${root}`,
    description: labels[root] ?? `GRUPO ${root}`,
    sped: false,
  };
}

function readCalimaCompanyPlan(rows: unknown[][], fileName: string, sheetName: string) {
  const headerIndex = rows.findIndex(row => {
    const headers = row.map(normalize);
    return headers[0] === "c r" && headers.some(header => header === "conta") && headers.some(header => header === "descricao");
  });
  if (headerIndex < 0) return [] as ChartAccount[];

  const result: ChartAccount[] = [];
  const seenReduced = new Set<string>();
  rows.slice(headerIndex + 1).forEach((row, offset) => {
    const reducedCode = String(row[0] ?? "").trim();
    const account = String(row[2] ?? "").trim();
    const description = String(row[5] ?? "").trim();
    if (!/^\d+$/.test(reducedCode) || !/^\d+$/.test(account) || !description) return;

    // No relatório de relacionamento do Calima, as contas de lançamento usam C.R. curto.
    // Linhas com C.R. estrutural muito longo são repetições/sintéticas do relatório e não devem virar contas de lançamento.
    if (reducedCode.length > 6) return;
    if (seenReduced.has(reducedCode)) return;
    seenReduced.add(reducedCode);

    const analytical = account.length >= 7 && !account.endsWith("000");
    result.push({
      id: `${fileName}-${sheetName}-${headerIndex + offset + 2}`,
      account,
      analytical,
      reducedCode,
      description,
      sped: Boolean(String(row[8] ?? "").trim()),
    });
  });

  const roots = new Set(result.map(account => account.account.charAt(0)).filter(root => ["1", "2", "3", "4", "6"].includes(root)));
  return [...Array.from(roots).map(rootAccount), ...result];
}

export async function readChartOfAccounts(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const accounts: ChartAccount[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
    const topText = rows.slice(0, 15).flat().map(normalize).join(" ");
    if (topText.includes("plano de contas da empresa") && topText.includes("plano de contas referencial")) {
      accounts.push(...readCalimaCompanyPlan(rows, file.name, sheetName));
      return;
    }

    const headerIndex = rows.findIndex((row) => {
      const headers = row.map(normalize);
      return headers.includes("conta") && headers.some((header) => ["cr", "c r", "codigo reduzido"].includes(header)) && headers.includes("descricao");
    });
    if (headerIndex < 0) return;
    const headers = rows[headerIndex].map(normalize);
    const index = {
      account: headers.findIndex((header) => header === "conta"),
      analytical: headers.findIndex((header) => ["analitica", "analitico"].includes(header)),
      reducedCode: headers.findIndex((header) => ["cr", "c r", "codigo reduzido"].includes(header)),
      description: headers.findIndex((header) => header === "descricao"),
      sped: headers.findIndex((header) => header.includes("sped ecd") || header === "sped"),
    };

    rows.slice(headerIndex + 1).forEach((row, offset) => {
      const account = String(row[index.account] ?? "").trim();
      const reducedCode = String(row[index.reducedCode] ?? "").trim();
      const description = String(row[index.description] ?? "").trim();
      if (!account && !reducedCode && !description) return;
      accounts.push({
        id: `${file.name}-${sheetName}-${headerIndex + offset + 2}`,
        account,
        analytical: index.analytical >= 0 ? toBoolean(row[index.analytical]) : true,
        reducedCode,
        description,
        sped: index.sped >= 0 ? toBoolean(row[index.sped]) : false,
      });
    });
  });

  return Array.from(new Map(accounts.map(account => [`${account.account}|${account.reducedCode}`, account])).values());
}
