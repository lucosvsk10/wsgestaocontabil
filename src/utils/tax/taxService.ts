
import { calculateTaxes as calculateTaxesCore } from './calculations';
import { TaxFormInput, TaxResult } from './types';

/**
 * Wrapper function for the tax calculation 
 * Aggregates all tax calculation functionality
 */
export const calculateTaxes = (data: TaxFormInput): TaxResult => {
  return calculateTaxesCore(data);
};

export class TaxService {
  // Facade for tax calculation services
  // Can be extended with more methods later
  
  static calculateTaxes(data: TaxFormInput): TaxResult {
    return calculateTaxesCore(data);
  }
}
