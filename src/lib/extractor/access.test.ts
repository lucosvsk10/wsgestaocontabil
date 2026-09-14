// @vitest-environment node
import { describe, it, expect, vi } from 'vitest';
import {
  documentAccess,
  documentInWindow,
} from '../../../supabase/functions/_shared/extractor-access';

describe('document scope', () => {
  it('fails closed on backend error', async () => {
    await expect(
      documentAccess({ rpc: vi.fn().mockResolvedValue({ error: {} }) }, 'u', 'c')
    ).rejects.toThrow('document_access_unavailable');
  });
  it('denies another account without exposing a document', async () => {
    await expect(
      documentAccess({ rpc: vi.fn().mockResolvedValue({ data: { allowed: false } }) }, 'u', 'c')
    ).rejects.toMatchObject({ status: 403 });
  });
  it('rejects dates outside the paid window and invalid dates', () => {
    const access = { from: '2026-09-01', to: '2026-09-13' };
    expect(documentInWindow({ issue_date: '2026-08-31T23:59:59Z' }, access)).toBe(false);
    expect(documentInWindow({ issue_date: '2026-09-14T00:00:00Z' }, access)).toBe(false);
    expect(documentInWindow({ issue_date: 'invalid' }, access)).toBe(false);
    expect(documentInWindow({ received_at: '2026-09-13T23:59:59Z' }, access)).toBe(true);
  });
});
