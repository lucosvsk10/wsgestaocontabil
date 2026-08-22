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
}

export interface PurchaseReference {
  competence: string;
  quantity: number;
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
