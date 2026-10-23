import { PurchaseComparison, PurchaseEntry, PurchaseItem, PurchaseProcessingMeta, PurchaseReference } from "./purchaseWorkbook";

const moneyToCents = (value: string) => {
  const normalized = value.replace(/\./g, "").replace(",", ".").replace(/[^\d.-]/g, "");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? Math.round(parsed * 100) : 0;
};

const normalizeLine = (value: string) => value.replace(/\s+/g, " ").trim();

const competenceFromText = (text: string) => {
  const ref = text.match(/Ref:\s*\d{2}\/(0[1-9]|1[0-2])\/(20\d{2})\s+a\s+\d{2}\/(0[1-9]|1[0-2])\/(20\d{2})/i);
  if (ref && ref[1] === ref[3] && ref[2] === ref[4]) return `${ref[1]}/${ref[2]}`;

  const single = text.match(/Ref:\s*(0[1-9]|1[0-2])\/(20\d{2})/i);
  if (single) return `${single[1]}/${single[2]}`;
  return "";
};

const lastDayOfCompetence = (competence: string) => {
  const [month, year] = competence.split("/").map(Number);
  const day = new Date(year, month, 0).getDate();
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
};

const classificationFromDescription = (description: string) => {
  const text = description.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");
  if (text.includes("industrializa") || text.includes("producao")) return "industrialização/produção";
  if (text.includes("energia")) return "energia elétrica";
  if (text.includes("combustivel") || text.includes("lubrificante")) return "combustível/lubrificante";
  if (text.includes("uso") && text.includes("consumo")) return "uso/consumo";
  if (text.includes("ativo")) return "ativo imobilizado";
  if (text.includes("faturamento") || text.includes("recebimento futuro")) return "simples faturamento/recebimento futuro";
  if (text.includes("comercializa") || text.includes("revenda")) return "comercialização";
  return description || "NÃO IDENTIFICADA";
};

export interface DeterministicPurchaseResult {
  items: PurchaseItem[];
  reference: PurchaseReference;
  entries: PurchaseEntry[];
  comparisons: PurchaseComparison[];
  warnings: string[];
  validationIssues: string[];
  referenceVerified: boolean;
  validated: boolean;
  processingMeta: PurchaseProcessingMeta;
  model: string;
  primaryModel: string;
  reviewed: boolean;
  reviewModel: null;
  routing: string;
}

export function parseCfopPurchaseReportText(rawText: string): DeterministicPurchaseResult | null {
  const text = rawText.replace(/\r/g, "");
  if (!/Registro de Entradas Por CFOP/i.test(text)) return null;

  const competence = competenceFromText(text);
  if (!competence) return null;

  const lines = text.split("\n").map(normalizeLine).filter(Boolean);
  const items: PurchaseItem[] = [];

  let current: { code: string; description: string[]; amountInCents?: number } | null = null;

  const pushCurrent = () => {
    if (!current || !current.amountInCents || current.amountInCents <= 0) {
      current = null;
      return;
    }
    const description = normalizeLine(current.description.join(" "));
    const classification = classificationFromDescription(description);
    items.push({
      id: `cfop-${current.code}-${items.length}`,
      entryNumber: `CFOP ${current.code}`,
      supplier: "",
      amountInCents: current.amountInCents,
      entryDate: "",
      emissionDate: "",
      situation: "Resumo por CFOP",
      source: `CFOP ${current.code} · Vr. Contábil`,
      confidence: 1,
      rowType: "cfop_summary",
      cfop: current.code,
      description,
      classification,
    });
    current = null;
  };

  for (const line of lines) {
    const cfop = line.match(/^(?:CFOP\s+)?(\d{4})\s*-\s*(.+)$/i);
    if (cfop) {
      pushCurrent();
      current = { code: cfop[1], description: [cfop[2]] };
      continue;
    }

    if (current && /^CFOP$/i.test(line)) continue;

    if (current && /^Subtotal$/i.test(line)) {
      pushCurrent();
      continue;
    }

    if (current) {
      const amount = line.match(/Vr\.\s*Cont[aá]bil\s+([\d.]+,\d{2})/i);
      if (amount) {
        current.amountInCents = moneyToCents(amount[1]);
        continue;
      }

      if (
        !/^Vr\./i.test(line) &&
        !/^Subtotal$/i.test(line) &&
        !/^ICMS/i.test(line) &&
        !/^Isenta/i.test(line) &&
        !/^Outras/i.test(line) &&
        !/^Total/i.test(line)
      ) {
        current.description.push(line);
      }
    }
  }
  pushCurrent();

  if (!items.length) return null;

  const beforeLiquid = text.split(/Total L[ií]quido/i)[0] || text;
  const allAccountingTotals = [...beforeLiquid.matchAll(/Vr\.\s*Cont[aá]bil\s+([\d.]+,\d{2})/gi)]
    .map(match => moneyToCents(match[1]))
    .filter(value => value >= 0);

  const extractedTotal = items.reduce((sum, item) => sum + item.amountInCents, 0);
  const explicitTotal = allAccountingTotals.length ? allAccountingTotals[allAccountingTotals.length - 1] : extractedTotal;
  const totalDifference = extractedTotal - explicitTotal;

  const reference: PurchaseReference = {
    competence,
    quantity: 0,
    quantityIsExplicit: false,
    totalAmountInCents: explicitTotal,
    source: "Registro de Entradas Por CFOP · Total Líquido · Vr. Contábil",
  };

  const entries: PurchaseEntry[] = items.map((item, index) => {
    const code = String(item.cfop || "").trim();
    const description = String(item.classification || item.description || "COMPRA SEM CLASSIFICAÇÃO").trim();
    return {
      id: `purchase-cfop-${code || index}-${crypto.randomUUID()}`,
      date: lastDayOfCompetence(competence),
      history: `COMPRAS - CFOP ${code} - ${description}`,
      eventType: "purchase_cfop",
      rubricCode: code || `COMPRA_${index + 1}`,
      rubricDescription: description,
      kind: "compra",
      section: "compras",
      debitCode: "",
      debitDescription: "",
      debitCostCenter: "",
      creditCode: "",
      creditDescription: "",
      creditCostCenter: "",
      amountInCents: item.amountInCents,
      source: item.source,
      confidence: 1,
    };
  });

  const comparisons: PurchaseComparison[] = [{
    key: "document_total",
    label: "Valor contábil",
    documentValue: explicitTotal,
    extractedValue: extractedTotal,
    difference: totalDifference,
    format: "currency",
    source: reference.source,
    blocking: true,
  }];

  const validationIssues = totalDifference === 0
    ? []
    : [`Valor contábil: diferença de ${(totalDifference / 100).toFixed(2)} entre subtotais por CFOP e o Total Líquido.`];

  const routing = "pdfjs-local + parser-deterministico-cfop + mapeamento-contabil";
  return {
    items,
    reference,
    entries,
    comparisons,
    warnings: [],
    validationIssues,
    referenceVerified: validationIssues.length === 0,
    validated: validationIssues.length === 0,
    processingMeta: {
      model: "deterministic-cfop-parser",
      primaryModel: "deterministic-cfop-parser",
      reviewed: false,
      reviewModel: null,
      routing,
    },
    model: "deterministic-cfop-parser",
    primaryModel: "deterministic-cfop-parser",
    reviewed: false,
    reviewModel: null,
    routing,
  };
}

export async function extractPdfText(file: File) {
  const pdfjs = await import("pdfjs-dist");
  const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber);
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items as Array<{ str?: string; hasEOL?: boolean }>) {
      if (!("str" in item)) continue;
      pageText += String(item.str || "");
      pageText += item.hasEOL ? "\n" : " ";
    }
    pages.push(pageText);
  }

  return pages.join("\n");
}

export async function parseCfopPurchaseFiles(files: File[]) {
  if (!files.length) return null;

  const results: DeterministicPurchaseResult[] = [];
  for (const file of files) {
    if (file.type && file.type !== "application/pdf") return null;
    const text = await extractPdfText(file);
    const parsed = parseCfopPurchaseReportText(text);
    if (!parsed) return null;
    results.push(parsed);
  }

  const competences = [...new Set(results.map(result => result.reference.competence))];
  if (competences.length !== 1) return null;

  if (results.length === 1) return results[0];

  const competence = competences[0];
  const items = results.flatMap(result => result.items);
  const entries = results.flatMap(result => result.entries);
  const totalAmountInCents = results.reduce((sum, result) => sum + result.reference.totalAmountInCents, 0);
  const extractedTotal = items.reduce((sum, item) => sum + item.amountInCents, 0);
  const difference = extractedTotal - totalAmountInCents;
  const source = "Múltiplos relatórios Registro de Entradas Por CFOP";

  return {
    ...results[0],
    items,
    entries,
    reference: {
      competence,
      quantity: 0,
      quantityIsExplicit: false,
      totalAmountInCents,
      source,
    },
    comparisons: [{
      key: "document_total" as const,
      label: "Valor contábil",
      documentValue: totalAmountInCents,
      extractedValue: extractedTotal,
      difference,
      format: "currency" as const,
      source,
      blocking: true,
    }],
    validationIssues: difference === 0 ? [] : [`Valor contábil: diferença de ${(difference / 100).toFixed(2)}.`],
    referenceVerified: difference === 0,
    validated: difference === 0,
  };
}
