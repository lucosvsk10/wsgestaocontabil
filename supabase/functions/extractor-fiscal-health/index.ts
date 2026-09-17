import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { documentAccess } from '../_shared/extractor-access.ts';
import { consume, limited } from '../_shared/rate-limit.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const J = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' } });
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const monthStart = () => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
};
const today = () => new Date().toISOString().slice(0, 10);

async function paged(makeQuery: (from: number, to: number) => any, cap = 10000) {
  const rows: any[] = [];
  const size = 1000;
  for (let from = 0; from < cap; from += size) {
    const { data, error } = await makeQuery(from, Math.min(from + size - 1, cap - 1));
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < size) break;
  }
  return rows;
}
const uniqueDocs = (rows: any[], direction: string) => {
  const map = new Map<string, any>();
  for (const row of rows) {
    if (row.document_kind === 'evento') continue;
    if (direction && row.direction !== direction) continue;
    const key = String(row.access_key || row.source_id || row.id || '');
    if (!key) continue;
    const prior = map.get(key);
    if (!prior || (row.full_xml && row.xml && !(prior.full_xml && prior.xml))) map.set(key, row);
  }
  return [...map.values()];
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);
  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization) return J({ error: 'Não autenticado' }, 401);
    const base = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(base, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    if (!auth.user) return J({ error: 'Não autenticado' }, 401);

    const body = await req.json().catch(() => ({})) as any;
    const companyId = String(body.company_id || '');
    const action = String(body.action || 'health');
    if (!companyId) return J({ error: 'Empresa obrigatória' }, 400);

    const access = await documentAccess(admin, auth.user.id, companyId);
    const denied = limited(await consume(admin, 'extractor_health', auth.user.id, 30, 600));
    if (denied) return denied;

    const { data: company, error: companyError } = await admin.from('fiscal_companies')
      .select('id,cnpj,razao_social,nome_fantasia,uf,last_sync_at,status')
      .eq('id', companyId).maybeSingle();
    if (companyError) throw companyError;
    if (!company) return J({ error: 'Empresa não encontrada' }, 404);

    if (action === 'monthly_stats') {
      const year = Number(body.year || new Date().getFullYear());
      if (!Number.isInteger(year) || year < 2020 || year > new Date().getFullYear()) return J({ error: 'Ano inválido' }, 400);
      const requestedStart = `${year}-01-01`;
      const requestedEnd = `${year}-12-31`;
      const start = access.from && access.from > requestedStart ? access.from : requestedStart;
      const end = access.to && access.to < requestedEnd ? access.to : requestedEnd;
      if (start > end) return J({ ok: true, year, months: {} });
      const rows = await paged((from, to) => admin.from('fiscal_dfe_documents')
        .select('id,access_key,source_id,document_kind,direction,issue_date')
        .eq('company_id', companyId)
        .neq('document_kind', 'evento')
        .gte('issue_date', `${start}T00:00:00Z`)
        .lte('issue_date', `${end}T23:59:59.999Z`)
        .order('issue_date', { ascending: true })
        .range(from, to));
      const seen = new Set<string>();
      const months: Record<string, { sales: number; purchases: number }> = {};
      for (const row of rows) {
        const key = String(row.access_key || row.source_id || row.id);
        if (seen.has(key)) continue;
        seen.add(key);
        const date = new Date(row.issue_date);
        if (Number.isNaN(date.getTime())) continue;
        const keyMonth = String(date.getUTCMonth() + 1).padStart(2, '0');
        months[keyMonth] ||= { sales: 0, purchases: 0 };
        if (row.direction === 'saida') months[keyMonth].sales += 1;
        if (row.direction === 'entrada') months[keyMonth].purchases += 1;
      }
      return J({ ok: true, year, months });
    }

    const start = access.from && access.from > monthStart() ? access.from : monthStart();
    const end = access.to && access.to < today() ? access.to : today();
    const [docs, purchaseStateRes, salesStateRes, healthRes, certRes, reconciliation] = await Promise.all([
      paged((from, to) => admin.from('fiscal_dfe_documents')
        .select('id,access_key,source_id,document_kind,direction,full_xml,xml,parse_error,issue_date,model,status_code,status_text')
        .eq('company_id', companyId)
        .gte('issue_date', `${start}T00:00:00Z`)
        .lte('issue_date', `${end}T23:59:59.999Z`)
        .order('issue_date', { ascending: true })
        .range(from, to)),
      admin.from('fiscal_purchase_sync_state').select('*').eq('company_id', companyId).maybeSingle(),
      admin.from('fiscal_sales_sync_state').select('*').eq('company_id', companyId).maybeSingle(),
      admin.from('fiscal_sync_health').select('*').eq('company_id', companyId).maybeSingle(),
      admin.from('fiscal_certificates').select('valid_until,is_active,certificate_name').eq('company_id', companyId).eq('is_active', true).order('valid_until', { ascending: false }).limit(1).maybeSingle(),
      paged((from, to) => admin.from('fiscal_sales_reconciliation')
        .select('access_key,status,issue_date,xml_status,resolved_at')
        .eq('company_id', companyId)
        .gte('issue_date', `${start}T00:00:00Z`)
        .lte('issue_date', `${end}T23:59:59.999Z`)
        .order('note_number', { ascending: true })
        .range(from, to)),
    ]);

    const purchases = uniqueDocs(docs, 'entrada');
    const sales = uniqueDocs(docs, 'saida');
    const purchaseXml = purchases.filter(row => row.full_xml && row.xml).length;
    const salesXml = sales.filter(row => row.full_xml && row.xml).length;
    const manifestationRequired = purchases.filter(row => row.parse_error === 'xml_requires_manifestation').length;
    const manifestationSent = purchases.filter(row => row.parse_error === 'xml_retry:manifestation_sent').length;

    let purchaseExpected: number | null = null;
    let purchaseSourceChecked = false;
    let purchaseSourceError = '';
    if (String(company.uf || '').toUpperCase() === 'AL') {
      try {
        const { data: tokenRow } = await admin.from('_fiscal_sales_debug_token').select('token').eq('id', true).maybeSingle();
        const token = String(tokenRow?.token || '');
        if (token) {
          const response = await fetch(`${base}/functions/v1/fiscal-purchases-sefaz-al-report`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-debug-token': token },
            body: JSON.stringify({ company_id: companyId, start, end, dry_run: true, include_keys: true }),
            signal: AbortSignal.timeout(45000),
          });
          const result = await response.json().catch(() => ({})) as any;
          if (response.ok) {
            purchaseExpected = Number(result.purchase_unique_keys || 0);
            purchaseSourceChecked = true;
          } else purchaseSourceError = String(result?.error || `HTTP ${response.status}`);
        }
      } catch (error) {
        purchaseSourceError = error instanceof Error ? error.message : String(error);
      }
    }

    const reconFound = reconciliation.filter(row => row.status === 'found').length;
    const salesExpected = reconFound || sales.length;
    const purchaseStored = purchases.length;
    const salesStored = sales.length;
    const purchaseMismatch = purchaseExpected != null && purchaseStored < purchaseExpected;
    const salesMismatch = salesExpected > salesStored;
    const purchaseFailures = Number(purchaseStateRes.data?.consecutive_failures || healthRes.data?.purchases_failure_count || 0);
    const salesFailures = Number(healthRes.data?.sales_failure_count || 0);
    const certUntil = certRes.data?.valid_until || null;
    const certExpired = Boolean(certUntil && new Date(certUntil + 'T23:59:59Z').getTime() < Date.now());
    const pendingXml = Math.max(0, purchaseStored - purchaseXml) + Math.max(0, salesStored - salesXml);
    const persistent = purchaseFailures >= 3 || salesFailures >= 3;
    const hasAttention = purchaseMismatch || salesMismatch || pendingXml > 0 || manifestationRequired > 0 || manifestationSent > 0;
    const state = certExpired || (persistent && (purchaseMismatch || salesMismatch || pendingXml > 0))
      ? 'error'
      : hasAttention
        ? 'attention'
        : 'healthy';

    return J({
      ok: true,
      checked_at: new Date().toISOString(),
      period: { start, end },
      company: {
        id: company.id,
        name: company.nome_fantasia || company.razao_social,
        legal_name: company.razao_social,
        cnpj: company.cnpj,
        uf: company.uf,
        last_sync_at: company.last_sync_at,
      },
      state,
      purchases: {
        source_checked: purchaseSourceChecked,
        source_error: purchaseSourceError || null,
        expected: purchaseExpected,
        stored: purchaseStored,
        xml_ready: purchaseXml,
        xml_pending: Math.max(0, purchaseStored - purchaseXml),
        manifestation_required: manifestationRequired,
        manifestation_sent: manifestationSent,
        status: purchaseStateRes.data?.status || null,
        last_completed_at: purchaseStateRes.data?.last_completed_at || null,
        last_error: purchaseStateRes.data?.last_error || null,
        failures: purchaseFailures,
      },
      sales: {
        expected: salesExpected,
        stored: salesStored,
        xml_ready: salesXml,
        xml_pending: Math.max(0, salesStored - salesXml),
        sequence_total: Number(salesStateRes.data?.reconciliation_total || 0),
        sequence_resolved: Number(salesStateRes.data?.reconciliation_resolved || 0),
        reconciliation_complete: Boolean(salesStateRes.data?.reconciliation_complete),
        status: salesStateRes.data?.status || null,
        last_completed_at: salesStateRes.data?.last_completed_at || null,
        last_error: salesStateRes.data?.last_error || null,
        failures: salesFailures,
      },
      certificate: {
        valid_until: certUntil,
        expired: certExpired,
        name: certRes.data?.certificate_name || null,
      },
      recovery: {
        count: Number(healthRes.data?.recovery_count || 0),
        last_reason: healthRes.data?.last_recovery_reason || null,
        last_checked_at: healthRes.data?.last_checked_at || null,
      },
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return J({ error: status < 500 ? error.message : 'Não foi possível conferir a saúde fiscal agora.' }, status);
  }
});
