import { RevenueComparison, RevenueEntry, RevenueProcessingMeta, RevenueReference } from "./revenueWorkbook";

export interface RevenueBatchPeriodResult {
  competence: string;
  reference: RevenueReference;
  entries: RevenueEntry[];
  comparisons: RevenueComparison[];
  warnings: string[];
  validationIssues: string[];
  referenceVerified: boolean;
  validated: boolean;
  processingMeta: RevenueProcessingMeta;
  importId: string;
  sourceFiles: string[];
}

export interface RevenueBatchResult {
  importId: string;
  sourceFiles: string[];
  periods: RevenueBatchPeriodResult[];
  years: number[];
  warnings: string[];
  validationIssues: string[];
  model: string;
  routing: string;
}

export interface RevenueImportManifest {
  importId: string;
  sourceFiles: string[];
  periods: string[];
  createdAt: string;
}
