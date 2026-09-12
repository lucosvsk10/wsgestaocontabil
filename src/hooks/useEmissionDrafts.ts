import { useEffect, useState } from 'react';
import { DRAFT_CHANGED_EVENT, listEmissionDrafts } from '@/lib/saas/emissionDraft';

export function useEmissionDrafts(organizationId: string | null) {
  const [drafts, setDrafts] = useState(() => organizationId ? listEmissionDrafts(organizationId) : []);
  useEffect(() => {
    const refresh = () => setDrafts(organizationId ? listEmissionDrafts(organizationId) : []);
    refresh();
    window.addEventListener(DRAFT_CHANGED_EVENT, refresh);
    window.addEventListener('storage', refresh);
    return () => { window.removeEventListener(DRAFT_CHANGED_EVENT, refresh); window.removeEventListener('storage', refresh); };
  }, [organizationId]);
  return drafts.filter(draft => organizationId && draft.key.startsWith(`ws:saas-emission-draft:${organizationId}:`));
}

