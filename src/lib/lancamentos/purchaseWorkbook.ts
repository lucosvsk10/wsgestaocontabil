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

const PURCHASE_CFOPS = new Set(["1101", "1102", "1403", "1910", "2101", "2102"]);
const EXCLUDED_CFOPS = new Set(["1253", "1407", "1556", "1653", "2551", "2556", "2922"]);

const EXCLUDED_NATURE_PATTERNS = [
  /energia eletrica/,
  /agua/,
  /esgoto/,
  /telefone/,
  /telefonia/,
  /internet/,
  /combustivel/,
  /lubrificante/,
  /uso.*consumo/,
  /material.*consumo/,
  /material.*expediente/,
  /material.*escritorio/,
  /higiene/,
  /limpeza/,
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
  if (EXCLUDED_NATURE_PATTERNS.some(pattern => pattern.test(text))) {
    return { launchable: false, reason: "Natureza tratada em Despesas ou fora do escopo de Compras; permanece somente na Transcrição." };
  }
  if (PURCHASE_CFOPS.has(code) || INCLUDED_NATURE_PATTERNS.some(pattern => pattern.test(text))) {
    return { launchable: true, reason: "Natureza de compra para estoque, comercialização ou produção." };
  }
  return { launchable: false, reason: "Natureza não aprovada para Compras; permanece na Transcrição até existir regra explícita." };
}

const uniqueText = (values: string[]) =>
  [...new Set(values.map(value => value.trim()).filter(Boolean))];

export function consolidatePurchaseEntriesByMapping(rows: PurchaseEntry[]) {
  const groups = new Map<string, PurchaseEntry[]>();

  for (const row of rows) {
    const key = hasCompletePurchaseMapping(row)
      ? [
          row.debitCode,
          row.creditCode,
          row.debitCostCenter || "",
          row.creditCostCenter || "",
        ].join("|")
      : `unresolved:${row.id}`;
    const current = groups.get(key) ?? [];
    current.push(row);
    groups.set(key, current);
  }

  return [...groups.values()].map(group => {
    if (group.length === 1) return group[0];

    const first = group[0];
    const rubricCodes = uniqueText(group.flatMap(row => row.rubricCode.split("+")));
    const rubricDescriptions = uniqueText(group.map(row => row.rubricDescription));
    const sources = uniqueText(group.map(row => row.source));
    const mappingSources = uniqueText(group.map(row => row.mappingSource || ""));
    const reasons = uniqueText(group.map(row => row.mappingReason || ""));
    const needsApproval = group.some(row => row.mappingNeedsApproval);
    const description =
      first.debitDescription ||
      (rubricDescriptions.length === 1 ? rubricDescriptions[0] : "compras classificadas na mesma conta");

    return {
      ...first,
      id: `purchase-group-${crypto.randomUUID()}`,
      history: `COMPRAS - ${description.toUpperCase()}`,
      rubricCode: rubricCodes.join("+"),
      rubricDescription: rubricDescriptions.join(" / "),
      amountInCents: group.reduce((sum, row) => sum + row.amountInCents, 0),
      source: sources.join(" · "),
      confidence: Math.min(...group.map(row => Number(row.confidence || 0))),
      mappingSource: mappingSources.length === 1
        ? (mappingSources[0] as PurchaseEntry["mappingSource"])
        : needsApproval
          ? "ai"
          : first.mappingSource,
      mappingNeedsApproval: needsApproval,
      mappingConfidence: Math.min(...group.map(row => Number(row.mappingConfidence ?? row.confidence ?? 0))),
      mappingReason: reasons.length === 1
        ? reasons[0]
        : `Consolidação após classificação contábil: ${group.length} referências usam a mesma conta de débito/crédito.`,
    };
  });
}
