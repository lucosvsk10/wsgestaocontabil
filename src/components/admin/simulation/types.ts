
import { TaxSimulation } from "@/types/taxSimulation";

export interface UserDetails {
  [key: string]: {
    name: string | null;
    email: string | null;
  };
}

export interface SortConfig {
  key: string;
  direction: string;
}

export interface AnalyticsData {
  totalSimulations: number;
  aPagarCount: number;
  restituicaoCount: number;
  avgTaxAmount: number;
  avgIncome: number;
  byMonth: {
    month: string;
    count: number;
  }[];
  byType: {
    type: string;
    count: number;
  }[];
}
