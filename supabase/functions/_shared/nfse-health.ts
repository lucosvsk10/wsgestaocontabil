export type NfseSyncState = {
  status?: string | null;
  source_exhausted?: boolean | null;
  last_caught_up_at?: string | null;
  last_completed_at?: string | null;
  last_error?: string | null;
};

export type NfseSyncAssessment = {
  phase: 'checking' | 'syncing' | 'current' | 'stale' | 'error';
  sourceConfirmed: boolean;
  fresh: boolean;
  caughtUpAt: string | null;
};

export const NFSE_FRESHNESS_MS = 4 * 60 * 60 * 1000;

export function assessNfseSyncState(
  state: NfseSyncState | null | undefined,
  nowMs = Date.now(),
): NfseSyncAssessment {
  const status = String(state?.status || 'not_started').toLowerCase();
  const caughtUpAt = state?.last_caught_up_at || state?.last_completed_at || null;
  const caughtUpMs = caughtUpAt ? Date.parse(String(caughtUpAt)) : 0;
  const fresh = Boolean(caughtUpMs && nowMs - caughtUpMs <= NFSE_FRESHNESS_MS);
  const sourceConfirmed = Boolean(
    status === 'idle' &&
    state?.source_exhausted === true &&
    !state?.last_error &&
    fresh,
  );

  return {
    phase: state?.last_error
      ? 'error'
      : ['running', 'catching_up'].includes(status)
        ? 'syncing'
        : sourceConfirmed
          ? 'current'
          : caughtUpAt
            ? 'stale'
            : 'checking',
    sourceConfirmed,
    fresh,
    caughtUpAt,
  };
}
