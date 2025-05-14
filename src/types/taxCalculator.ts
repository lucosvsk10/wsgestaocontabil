
import { type TaxFormInput, type TaxResult } from '@/utils/tax/types';

export interface TaxCalculatorContextProps {
  activeStep: number;
  setActiveStep: (step: number) => void;
  calculateTax: (data: TaxFormInput) => TaxResult;
}

export interface TaxInputProps {
  currencyPrefix: string;
  percentageSuffix: string;
  formatCurrency: (value: number) => string;
  formatPercentage: (value: number) => string;
  parseInputValue: (value: string) => number;
}

export interface TaxCalculatorProps {
  onComplete?: (result: TaxResult) => void;
}

export interface TaxCalculationParams {
  // Tax calculator specific parameters
}

export type TaxFormValues = TaxFormInput & {
  nome?: string;
  email?: string;
  telefone?: string;
};

export type { TaxFormInput, TaxResult };
