import { RequestError } from './request-guards.ts';

export async function documentAccess(admin: any, userId: string, companyId: string) {
  const { data, error } = await admin.rpc('extractor_document_access', {
    p_user_id: userId,
    p_company_id: companyId,
  });
  if (error) throw new Error('document_access_unavailable');
  if (!data?.allowed) throw new RequestError('Empresa não autorizada para esta conta', 403);
  return data as { allowed: true; account_id: string; from: string | null; to: string };
}
const brazilDate = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value || '';
  const year = part('year'), month = part('month'), day = part('day');
  return year && month && day ? `${year}-${month}-${day}` : '';
};

export function documentInWindow(
  doc: { issue_date?: string; received_at?: string },
  access: { from: string | null; to: string }
) {
  const localDate = brazilDate(doc.issue_date || doc.received_at || '');
  if (!localDate) return false;
  return (!access.from || localDate >= access.from) && localDate <= access.to;
}
