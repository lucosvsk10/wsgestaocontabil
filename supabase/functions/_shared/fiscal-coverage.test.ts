import { describe, expect, it } from 'vitest';
import { fiscalSalesCoverage } from './fiscal-coverage';

describe('fiscalSalesCoverage', () => {
  it('does not let covered NFS-e hide a missing NFC-e/NF-e sales engine', () => {
    const result = fiscalSalesCoverage([
      {
        document_type: 'nfse',
        direction: 'saida',
        applicability: 'observed',
        coverage_status: 'covered',
        source_confirmed: true,
      },
      {
        document_type: 'nfce65',
        direction: 'saida',
        applicability: 'required',
        coverage_status: 'partial',
        source_confirmed: false,
      },
    ]);

    expect(result.serviceReady).toBe(true);
    expect(result.numberedReady).toBe(false);
  });

  it('unlocks numbered sales only after a model 55 or 65 source is confirmed', () => {
    const result = fiscalSalesCoverage([
      {
        document_type: 'nfe55',
        direction: 'saida',
        applicability: 'required',
        coverage_status: 'partial',
        source_confirmed: false,
      },
      {
        document_type: 'nfce65',
        direction: 'saida',
        applicability: 'required',
        coverage_status: 'covered',
        source_confirmed: true,
      },
    ]);

    expect(result.numberedReady).toBe(true);
  });

  it('ignores covered service rows when no numbered source is applicable', () => {
    const result = fiscalSalesCoverage([
      {
        document_type: 'nfse',
        direction: 'saida',
        applicability: 'observed',
        coverage_status: 'covered',
        source_confirmed: true,
      },
    ]);

    expect(result.numberedReady).toBe(false);
  });
});
