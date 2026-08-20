export type AccountingModule = "folha" | "compras" | "faturamento" | "despesas" | "balancete";

export type ImportStatus =
  | "selected"
  | "uploading"
  | "uploaded"
  | "processing"
  | "review"
  | "approved"
  | "failed";

export interface AccountingImport {
  id: string;
  companyId: string;
  competence: string;
  module: AccountingModule;
  fileName: string;
  mimeType: string;
  sizeInBytes: number;
  checksum?: string;
  status: ImportStatus;
  createdAt: string;
}

export interface ExtractedAccountingItem {
  id: string;
  importId: string;
  sourceReference?: string;
  code?: string;
  description: string;
  amountInCents: number;
  classification?: string;
  confidence?: number;
  requiresReview: boolean;
}

export interface AccountingEntryDraft {
  id: string;
  companyId: string;
  competence: string;
  module: AccountingModule;
  date: string;
  variableHistory: string;
  debitAccountId: string;
  creditAccountId: string;
  amountInCents: number;
  sourceImportIds: string[];
  requiresReview: boolean;
}

export interface AccountingReviewIssue {
  id: string;
  severity: "blocking" | "warning" | "information";
  code: string;
  message: string;
  relatedImportId?: string;
  relatedEntryId?: string;
  resolvedAt?: string;
}
