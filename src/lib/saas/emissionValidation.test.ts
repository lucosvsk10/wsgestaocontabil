import { describe, expect, it } from 'vitest';
import { isValidAccessKey, isValidCnpj, isValidCpf, isValidTaxId } from './emissionValidation';

describe('emission validation', () => {
  it('accepts valid CPF and CNPJ values and rejects repeated digits', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true);
    expect(isValidCpf('111.111.111-11')).toBe(false);
    expect(isValidCnpj('04.252.011/0001-10')).toBe(true);
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false);
    expect(isValidTaxId('04.252.011/0001-10')).toBe(true);
  });

  it('checks the NF-e/CT-e/MDF-e access-key digit', () => {
    expect(isValidAccessKey('35191010750100000100550010000000011000000010')).toBe(true);
    expect(isValidAccessKey('35191010750100000100550010000000011000000011')).toBe(false);
    expect(isValidAccessKey('0'.repeat(44))).toBe(false);
  });
});

