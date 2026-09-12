export type EmissionDraft = {
  form: Record<string, unknown>;
  tab: string;
  savedAt: string;
  summary?: { recipient?: string; subject?: string; total?: number; environment?: string };
};
export const DRAFT_CHANGED_EVENT = 'ws:emission-drafts-changed';
export const fiscalDocumentTypes = ['NF-e', 'NFC-e', 'NFS-e', 'CT-e', 'MDF-e'];
export type ListedEmissionDraft = EmissionDraft & { key: string; documentType: string };

export function emissionDraftKey(organizationId: string, documentType: string) {
  return `ws:saas-emission-draft:${organizationId}:${documentType}`;
}

export function readEmissionDraft(key: string): EmissionDraft | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EmissionDraft>;
    if (!parsed || !parsed.form || typeof parsed.form !== 'object' || Array.isArray(parsed.form)) return null;
    if (Object.values(parsed.form).some(value => !['string', 'number', 'boolean'].includes(typeof value) && value !== null)) return null;
    return {
      form: parsed.form as Record<string, unknown>,
      tab: typeof parsed.tab === 'string' ? parsed.tab : '',
      savedAt: typeof parsed.savedAt === 'string' && Number.isFinite(Date.parse(parsed.savedAt)) ? parsed.savedAt : new Date().toISOString(),
      summary: parsed.summary && typeof parsed.summary === 'object' ? {
        recipient: typeof parsed.summary.recipient === 'string' ? parsed.summary.recipient : undefined,
        subject: typeof parsed.summary.subject === 'string' ? parsed.summary.subject : undefined,
        total: typeof parsed.summary.total === 'number' && Number.isFinite(parsed.summary.total) ? parsed.summary.total : undefined,
        environment: typeof parsed.summary.environment === 'string' ? parsed.summary.environment : undefined,
      } : undefined,
    };
  } catch {
    return null;
  }
}

export function writeEmissionDraft(key: string, form: Record<string, unknown>, tab: string, summary?: EmissionDraft['summary']) {
  const previous = readEmissionDraft(key);
  if (previous && JSON.stringify(previous.form) === JSON.stringify(form) && previous.tab === tab && JSON.stringify(previous.summary) === JSON.stringify(summary)) return previous;
  const draft: EmissionDraft = {
    form,
    tab,
    savedAt: new Date().toISOString(),
    summary,
  };
  window.localStorage.setItem(key, JSON.stringify(draft));
  window.dispatchEvent(new Event(DRAFT_CHANGED_EVENT));
  return draft;
}

export function clearEmissionDraft(key: string) {
  window.localStorage.removeItem(key);
  window.dispatchEvent(new Event(DRAFT_CHANGED_EVENT));
}

export function listEmissionDrafts(organizationId: string): ListedEmissionDraft[] {
  return fiscalDocumentTypes.flatMap(documentType => {
    const key = emissionDraftKey(organizationId, documentType);
    const draft = readEmissionDraft(key);
    // Merely opening an empty form must not create a visible unfinished note.
    const meaningful = draft && ['customerId', 'productId', 'serviceId', 'description', 'remetenteId', 'destinatarioId', 'driverName', 'keys', 'vTPrest', 'cargoValue'].some(field => String(draft.form[field] || '').trim());
    return meaningful ? [{ ...draft, key, documentType }] : [];
  }).sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt));
}

