export interface PurchaseItem {
  id: string;
  entryNumber: string;
  supplier: string;
  amountInCents: number;
  entryDate: string;
  emissionDate: string;
  situation: string;
  source: string;
  confidence: number;
  rowType?: "entry" | "cfop_summary";
  cfop?: string;
  description?: string;
  classification?: string;
  launchStatus?: "launchable" | "not_launchable";
  launchReason?: string;
}

export interface PurchaseReference {
  competence: string;
  quantity: number;
  quantityIsExplicit?: boolean;
  totalAmountInCents: number;
  source: string;
}

export interface PurchaseEntry {
  id: string;
  date: string;
  history: string;
  eventType: string;
  rubricCode: string;
  rubricDescription: string;
  kind: string;
  section: string;
  debitCode: string;
  debitDescription: string;
  debitCostCenter: string;
  creditCode: string;
  creditDescription: string;
  creditCostCenter: string;
  amountInCents: number;
  source: string;
  confidence: number;
  mappingSource?: "learned" | "predefined" | "ai" | "manual" | "unresolved";
  mappingNeedsApproval?: boolean;
  mappingConfidence?: number;
  mappingReason?: string;
  mappingRuleId?: string;
}

export interface PurchaseComparison {
  key: "quantity" | "document_total" | "excluded_total" | "launch_total";
  label: string;
  documentValue: number;
  extractedValue: number;
  difference: number;
  format: "number" | "currency";
  source: string;
  blocking: boolean;
  note?: string;
}

export interface PurchaseProcessingMeta {
  model: string;
  primaryModel: string;
  reviewed: boolean;
  reviewModel?: string | null;
  routing?: string | null;
}

export const hasCompletePurchaseMapping = (row: PurchaseEntry) =>
  Boolean(row.debitCode && row.creditCode && row.debitDescription && row.creditDescription);

const normalizePurchaseText = (value: string) =>
  value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR");

const PURCHASE_CFOPS = new Set(["1101", "1102", "1401", "1403", "1407", "1556", "1910", "2101", "2102", "2556"]);
const EXCLUDED_CFOPS = new Set(["1253", "1653", "2551", "2922"]);

const EXCLUDED_NATURE_PATTERNS = [
  /energia eletrica/,
  /agua/,
  /esgoto/,
  /telefone/,
  /telefonia/,
  /internet/,
  /combustivel/,
  /lubrificante/,
  /aluguel/,
  /honorarios/,
  /contabil/,
  /consultoria/,
  /manutencao/,
  /servico/,
  /taxa/,
  /tarifa/,
  /imposto/,
  /tribut/,
  /ativo imobilizado/,
  /bem para o ativo/,
  /simples faturamento/,
  /recebimento futuro/,
];

const INCLUDED_NATURE_PATTERNS = [
  /comercializa/,
  /revenda/,
  /mercadoria.*estoque/,
  /estoque/,
  /industrializa/,
  /producao/,
  /materia.?prima/,
  /bonifica/,
  /doacao/,
  /brinde/,
];

export function purchaseLaunchEligibility(row: Pick<PurchaseEntry, "rubricCode" | "rubricDescription" | "history">) {
  const code = String(row.rubricCode || "").replace(/\D/g, "").slice(0, 4);
  const text = normalizePurchaseText(`${row.rubricDescription || ""} ${row.history || ""}`);

  if (EXCLUDED_CFOPS.has(code)) {
    return { launchable: false, reason: `CFOP ${code} pertence a despesa/uso/consumo/ativo ou operação que não deve ser lançada em Compras.` };
  }
  if (PURCHASE_CFOPS.has(code)) {
    return { launchable: true, reason: `CFOP ${code}: compra elegível para o Calima, inclusive uso e consumo.` };
  }
  if (EXCLUDED_NATURE_PATTERNS.some(pattern => pattern.test(text))) {
    return { launchable: false, reason: "Natureza tratada em Despesas ou fora do escopo de Compras; permanece somente na Transcrição." };
  }
  if (INCLUDED_NATURE_PATTERNS.some(pattern => pattern.test(text)) || /uso.*consumo|material.*consumo|material.*expediente|material.*escritorio|higiene|limpeza/.test(text)) {
    return { launchable: true, reason: "Natureza de compra para estoque, comercialização ou produção." };
  }
  return { launchable: false, reason: "Natureza não aprovada para Compras; permanece na Transcrição até existir regra explícita." };
}

/** Keep one accounting entry per source document/reference; never merge by debit/credit. */
export function consolidatePurchaseEntriesByMapping(rows: PurchaseEntry[]) {
  return rows.map(row => ({ ...row }));
}
