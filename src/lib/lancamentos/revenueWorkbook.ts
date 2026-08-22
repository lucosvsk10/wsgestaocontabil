export interface RevenueReference {
  competence: string;
  serviceAmountInCents: number;
  merchandiseAmountInCents: number;
  totalAmountInCents: number;
  pgdasAmountInCents: number;
  hasService: boolean;
  hasMerchandise: boolean;
  hasPgdas: boolean;
  source: string;
}

export interface RevenueEntry {
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
  importId?: string;
  sourceFileName?: string;
  mappingSource?: "learned" | "predefined" | "ai" | "manual" | "unresolved";
  mappingNeedsApproval?: boolean;
  mappingConfidence?: number;
  mappingReason?: string;
  mappingRuleId?: string;
}

export interface RevenueComparison {
  key: "services" | "merchandise" | "total" | "pgdas";
  label: string;
  documentAmountInCents: number;
  entriesAmountInCents: number;
  differenceInCents: number;
  source: string;
  blocking: boolean;
  note?: string;
}

export interface RevenueProcessingMeta {
  model: string;
  primaryModel: string;
  reviewed: boolean;
  reviewModel?: string | null;
  routing?: string | null;
}