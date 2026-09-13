import { afterEach, describe, expect, it } from 'vitest';
import {
  clearEmissionDraft,
  emissionDraftKey,
  readEmissionDraft,
  writeEmissionDraft,
  listEmissionDrafts,
} from './emissionDraft';

const key = emissionDraftKey('org-1', 'NF-e');

describe('emission drafts', () => {
  afterEach(() => window.localStorage.clear());
  it('lista um preenchimento iniciado apenas com placa e não lista campos padrão', () => {
    writeEmissionDraft(emissionDraftKey('org-1', 'MDF-e'), { plate: 'ABC1D23' }, 'Veículo');
    writeEmissionDraft(key, { series: '1', number: '1', quantity: '1' }, 'Cliente');
    expect(listEmissionDrafts('org-1').map(draft => draft.documentType)).toEqual(['MDF-e']);
  });

  it('round-trips a draft without losing the active step', () => {
    writeEmissionDraft(key, { customerId: 'customer-1', quantity: '2' }, 'Produtos');

    expect(readEmissionDraft(key)).toMatchObject({
      form: { customerId: 'customer-1', quantity: '2' },
      tab: 'Produtos',
    });
  });

  it('returns null for invalid or incomplete storage values', () => {
    window.localStorage.setItem(key, '{invalid');
    expect(readEmissionDraft(key)).toBeNull();

    window.localStorage.setItem(key, JSON.stringify({ tab: 'Cliente' }));
    expect(readEmissionDraft(key)).toBeNull();
  });

  it('clears only the requested draft', () => {
    writeEmissionDraft(key, { number: '10' }, 'Fiscal');
    clearEmissionDraft(key);
    expect(readEmissionDraft(key)).toBeNull();
  });
});
