import { RequestError } from './request-guards.ts';

export async function documentAccess(admin: any, userId: string, companyId: string) {
  const { data, error } = await admin.rpc('extractor_document_access', {
    p_user_id: userId,
    p_company_id: companyId,
  });
  if (error) throw new Error('document_access_unavailable');
  if (!data?.allowed) throw new RequestError('Empresa não autorizada para esta conta', 403);
  return data as { allowed: true; from: string | null; to: string };
}
export function documentInWindow(
  doc: { issue_date?: string; received_at?: string },
  access: { from: string | null; to: string }
) {
  const timestamp = Date.parse(doc.issue_date || doc.received_at || '');
  if (!Number.isFinite(timestamp)) return false;
  return (
    (!access.from || timestamp >= Date.parse(access.from + 'T00:00:00Z')) &&
    timestamp < Date.parse(access.to + 'T00:00:00Z') + 86400000
  );
}
