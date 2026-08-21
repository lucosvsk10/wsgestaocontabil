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

export async function readChartOfAccounts(file: File) {
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const accounts: ChartAccount[] = [];

  workbook.SheetNames.forEach((sheetName) => {
    const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], { header: 1, defval: "", raw: true });
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
        analytical: toBoolean(row[index.analytical]),
        reducedCode,
        description,
        sped: toBoolean(row[index.sped]),
      });
    });
  });

  return accounts;
}
