import { describe, expect, it } from 'vitest';
import { consolidatePurchaseEntriesByMapping, hasCompletePurchaseMapping, purchaseLaunchEligibility, type PurchaseEntry } from './purchaseWorkbook';

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
  it('preserves every source entry even with identical debit/credit accounts', () => {
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

    expect(result).toHaveLength(3);
    expect(result.map(item => item.id)).toEqual(['a', 'b', 'c']);
    expect(result.map(item => item.amountInCents)).toEqual([10000, 25000, 5000]);
  });

  it('identifies rows without complete debit and credit mapping as non-launchable', () => {
    expect(hasCompletePurchaseMapping(row())).toBe(true);
    expect(hasCompletePurchaseMapping(row({ debitCode: '', debitDescription: '' }))).toBe(false);
    expect(hasCompletePurchaseMapping(row({ creditCode: '', creditDescription: '' }))).toBe(false);
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

  it('blocks expenses and non-purchase natures from Compras even when they have accounts', () => {
    expect(purchaseLaunchEligibility(row({ rubricCode: '1253', rubricDescription: 'Compra de energia elétrica' })).launchable).toBe(false);
    expect(purchaseLaunchEligibility(row({ rubricCode: '1556', rubricDescription: 'Compra de material para uso ou consumo' })).launchable).toBe(true);
    expect(purchaseLaunchEligibility(row({ rubricCode: '1407', rubricDescription: 'Compra de material de uso e consumo ST' })).launchable).toBe(true);
    expect(purchaseLaunchEligibility(row({ rubricCode: '2556', rubricDescription: 'Compra de material de uso e consumo interestadual' })).launchable).toBe(true);
    expect(purchaseLaunchEligibility(row({ rubricCode: '1401', rubricDescription: 'Compra para industrialização com ST' })).launchable).toBe(true);
    expect(purchaseLaunchEligibility(row({ rubricCode: '1653', rubricDescription: 'Compra de combustível por consumidor final' })).launchable).toBe(false);
    expect(purchaseLaunchEligibility(row({ rubricCode: '2551', rubricDescription: 'Compra de bem para ativo imobilizado' })).launchable).toBe(false);
    expect(purchaseLaunchEligibility(row({ rubricCode: '2922', rubricDescription: 'Simples faturamento para recebimento futuro' })).launchable).toBe(false);
    expect(purchaseLaunchEligibility(row({ rubricCode: '', rubricDescription: 'Despesas com água e esgoto' })).launchable).toBe(false);
    expect(purchaseLaunchEligibility(row({ rubricCode: '', rubricDescription: 'Serviços de internet' })).launchable).toBe(false);
  });

  it('allows only approved purchase natures to proceed to mapping', () => {
    expect(purchaseLaunchEligibility(row({ rubricCode: '1102', rubricDescription: 'Compra para comercialização' })).launchable).toBe(true);
    expect(purchaseLaunchEligibility(row({ rubricCode: '2101', rubricDescription: 'Compra para industrialização' })).launchable).toBe(true);
    expect(purchaseLaunchEligibility(row({ rubricCode: '', rubricDescription: 'Mercadorias para revenda' })).launchable).toBe(true);
  });
});
