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
  key: "quantity" | "document_total" | "launch_total";
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

const hasMapping = (row: PurchaseEntry) =>
  Boolean(row.debitCode && row.creditCode && row.debitDescription && row.creditDescription);

const uniqueText = (values: string[]) =>
  [...new Set(values.map(value => value.trim()).filter(Boolean))];

export function consolidatePurchaseEntriesByMapping(rows: PurchaseEntry[]) {
  const groups = new Map<string, PurchaseEntry[]>();

  for (const row of rows) {
    const key = hasMapping(row)
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
