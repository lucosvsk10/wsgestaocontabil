import { describe, expect, it } from 'vitest';
import { consolidatePurchaseEntriesByMapping, type PurchaseEntry } from './purchaseWorkbook';

const row = (overrides: Partial<PurchaseEntry> = {}): PurchaseEntry => ({
  id: crypto.randomUUID(),
  date: '31/07/2026',
  history: 'COMPRAS - CFOP 1102 - COMERCIALIZACAO',
  eventType: 'purchase_cfop',
  rubricCode: '1102',
  rubricDescription: 'Compra para comercialização',
  kind: 'compra',
  section: 'compras',
  debitCode: '17',
  debitDescription: 'MERCADORIAS PARA REVENDA',
  debitCostCenter: '',
  creditCode: '35',
  creditDescription: 'FORNECEDORES NACIONAIS',
  creditCostCenter: '',
  amountInCents: 10000,
  source: 'CFOP 1102',
  confidence: 1,
  mappingSource: 'ai',
  mappingNeedsApproval: true,
  mappingConfidence: 0.9,
  mappingReason: 'CFOP de comercialização',
  ...overrides,
});

describe('consolidatePurchaseEntriesByMapping', () => {
  it('consolidates only rows mapped to the same debit/credit pair', () => {
    const result = consolidatePurchaseEntriesByMapping([
      row({ id: 'a', rubricCode: '1102', amountInCents: 10000 }),
      row({ id: 'b', rubricCode: '2102', amountInCents: 25000 }),
      row({
        id: 'c',
        rubricCode: '1556',
        rubricDescription: 'Compra para uso e consumo',
        debitCode: '81',
        debitDescription: 'MATERIAL DE USO E CONSUMO',
        amountInCents: 5000,
      }),
    ]);

    expect(result).toHaveLength(2);
    const resale = result.find(item => item.debitCode === '17');
    const consumption = result.find(item => item.debitCode === '81');
    expect(resale?.amountInCents).toBe(35000);
    expect(resale?.rubricCode).toContain('1102');
    expect(resale?.rubricCode).toContain('2102');
    expect(consumption?.amountInCents).toBe(5000);
  });

  it('never collapses unresolved purchases into one generic line', () => {
    const unresolvedA = row({
      id: 'a',
      debitCode: '',
      debitDescription: '',
      creditCode: '',
      creditDescription: '',
      rubricCode: '1556',
      rubricDescription: 'Compra para uso e consumo',
      mappingSource: 'unresolved',
      mappingNeedsApproval: true,
    });
    const unresolvedB = row({
      id: 'b',
      debitCode: '',
      debitDescription: '',
      creditCode: '',
      creditDescription: '',
      rubricCode: '1407',
      rubricDescription: 'Compra de mercadoria para uso ou consumo com ST',
      mappingSource: 'unresolved',
      mappingNeedsApproval: true,
    });

    const result = consolidatePurchaseEntriesByMapping([unresolvedA, unresolvedB]);
    expect(result).toHaveLength(2);
    expect(result.map(item => item.rubricCode)).toEqual(['1556', '1407']);
  });
});
