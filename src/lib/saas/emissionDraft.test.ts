import { afterEach, describe, expect, it } from 'vitest';
import {
  clearEmissionDraft,
  emissionDraftKey,
  readEmissionDraft,
  writeEmissionDraft,
} from './emissionDraft';

const key = emissionDraftKey('org-1', 'NF-e');

describe('emission drafts', () => {
  afterEach(() => window.localStorage.clear());

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

