import { describe, expect, it } from 'vitest';
import { assessNfseSyncState, NFSE_FRESHNESS_MS } from './nfse-health';

const now = Date.parse('2026-09-27T18:00:00.000Z');

describe('assessNfseSyncState', () => {
  it('does not confirm a cursor that is still consuming full ADN batches', () => {
    expect(assessNfseSyncState({
      status: 'catching_up',
      source_exhausted: false,
      last_completed_at: '2026-09-27T17:30:00.000Z',
    }, now)).toMatchObject({ phase: 'syncing', sourceConfirmed: false });
  });

  it('confirms a recent exhausted cursor, including a genuine zero-result source', () => {
    expect(assessNfseSyncState({
      status: 'idle',
      source_exhausted: true,
      last_caught_up_at: '2026-09-27T17:55:00.000Z',
    }, now)).toMatchObject({ phase: 'current', sourceConfirmed: true, fresh: true });
  });

  it('expires coverage after the four-hour freshness window', () => {
    expect(assessNfseSyncState({
      status: 'idle',
      source_exhausted: true,
      last_caught_up_at: new Date(now - NFSE_FRESHNESS_MS - 1).toISOString(),
    }, now)).toMatchObject({ phase: 'stale', sourceConfirmed: false, fresh: false });
  });

  it('surfaces source failures even if an older cursor was caught up', () => {
    expect(assessNfseSyncState({
      status: 'retrying',
      source_exhausted: false,
      last_caught_up_at: '2026-09-27T17:55:00.000Z',
      last_error: 'gateway timeout',
    }, now)).toMatchObject({ phase: 'error', sourceConfirmed: false });
  });
});
