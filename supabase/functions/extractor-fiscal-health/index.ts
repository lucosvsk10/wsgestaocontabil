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
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
const fiscalResponseCode = (code: unknown, message: unknown) => {
  const direct = String(code ?? '').trim();
  if (/^\d{3}$/.test(direct)) return direct;
  const match = String(message ?? '').match(/(?:SEFAZ\s*)?(\d{3})\b/i);
  return match?.[1] || '';
};
const translateFiscalResponse = (code: unknown, message: unknown, status?: unknown) => {
  const c = fiscalResponseCode(code, message);
  const raw = String(message ?? '').trim();
  if (c === '137') return 'Busca concluída: nenhum documento novo foi localizado.';
  if (c === '138') return 'Busca concluída: a SEFAZ localizou documento(s).';
  if (c === '656') return 'A SEFAZ aplicou um intervalo de segurança. A rotina aguardará antes de tentar novamente.';
  if (c === '100') return 'Documento autorizado.';
  if (c === '101') return 'Documento cancelado.';
  if (c === '110') return 'Uso do documento denegado.';
  if (c === '217') return 'Documento não consta na base consultada.';
  if (/waiting_certificate/i.test(String(status ?? ''))) return 'A consulta aguarda um certificado A1 válido.';
  if (/cooldown/i.test(String(status ?? ''))) return 'Consulta em espera temporária para respeitar o intervalo da SEFAZ.';
  if (raw) return raw;
  if (/idle|completed|success/i.test(String(status ?? ''))) return 'Consulta concluída sem erro.';
  return 'Consulta registrada.';
};

const brazilDateParts = (value = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(value);
  const pick = (type: string) => parts.find(part => part.type === type)?.value || '';
  return { year: pick('year'), month: pick('month'), day: pick('day') };
};
const brazilDate = (value = new Date()) => {
  const local = brazilDateParts(value);
  return `${local.year}-${local.month}-${local.day}`;
};
const today = () => brazilDate();
const daysAgo = (days: number) => {
  const base = new Date(`${today()}T12:00:00-03:00`);
  return brazilDate(new Date(base.getTime() - Math.max(0, days) * 86400000));
};
const dateOnly = (value: unknown) => {
  const text = String(value || '');
  return /^\d{4}-\d{2}-\d{2}/.test(text) ? text.slice(0, 10) : '';
};

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
const modelOf = (row: any) => {
  const direct = String(row?.model || '').trim().toLowerCase();
  if (direct) return direct;
  const key = String(row?.access_key || '').replace(/\D/g, '');
  return key.length === 44 ? key.slice(20, 22) : '';
};
const isNfe55 = (row: any) => modelOf(row) === '55';
const isNfce65 = (row: any) => modelOf(row) === '65';

async function checkHistory(admin: any, accountId: string, companyId: string, scope?: string) {
  let query = admin
    .from('extractor_fiscal_check_runs')
    .select('id,scope,period_start,period_end,purchases_expected,purchases_present,sales_expected,sales_present,state,origin,checked_at,details')
    .eq('account_id', accountId)
    .eq('company_id', companyId)
    .order('checked_at', { ascending: false })
    .limit(40);
  if (scope === 'last_30_days' || scope === 'full') query = query.eq('scope', scope);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

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
    const requestedScope = String(body.scope || 'full');
    const scope = requestedScope === 'last_30_days' ? 'last_30_days' : 'full';
    if (!companyId) return J({ error: 'Empresa obrigatória' }, 400);

    const access = await documentAccess(admin, auth.user.id, companyId);
    const denied = limited(await consume(admin, 'extractor_health', auth.user.id, 30, 600));
    if (denied) return denied;

    const { data: company, error: companyError } = await admin
      .from('fiscal_companies')
      .select('id,cnpj,razao_social,nome_fantasia,uf,last_sync_at,status')
      .eq('id', companyId)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!company) return J({ error: 'Empresa não encontrada' }, 404);

    if (action === 'history') {
      return J({
        ok: true,
        scope,
        history: await checkHistory(admin, access.account_id, companyId, scope),
      });
    }

    if (action === 'monthly_stats') {
      const local = brazilDateParts();
      const currentYear = Number(local.year);
      const year = Number(body.year || currentYear);
      if (!Number.isInteger(year) || year < 2020 || year > currentYear) return J({ error: 'Ano inválido' }, 400);

      const requestedStart = `${year}-01-01`;
      const requestedEnd = `${year}-12-31`;
      const start = access.from && access.from > requestedStart ? access.from : requestedStart;
      const end = access.to && access.to < requestedEnd ? access.to : requestedEnd;
      if (start > end) {
        return J({
          ok: true,
          year,
          months: {},
          available_from: access.from,
          available_to: access.to,
        });
      }

      const [documentRows, reconciliationRows] = await Promise.all([
        paged((from, to) => admin.from('fiscal_dfe_documents')
          .select('id,access_key,source_id,nsu,document_kind,direction,issue_date')
          .eq('company_id', companyId)
          .neq('document_kind', 'evento')
          .gte('issue_date', `${start}T00:00:00-03:00`)
          .lte('issue_date', `${end}T23:59:59.999-03:00`)
          .order('issue_date', { ascending: true })
          .range(from, to)),
        paged((from, to) => admin.from('fiscal_sales_reconciliation')
          .select('access_key,note_number,status,issue_date')
          .eq('company_id', companyId)
          .in('status', ['found', 'cancelled'])
          .gte('issue_date', `${start}T00:00:00-03:00`)
          .lte('issue_date', `${end}T23:59:59.999-03:00`)
          .order('issue_date', { ascending: true })
          .range(from, to)),
      ]);

      const seen = new Set<string>();
      const months: Record<string, { sales: number; purchases: number }> = {};
      for (const row of [...documentRows, ...reconciliationRows.map((item: any) => ({ ...item, direction: 'saida' }))]) {
        const date = row.issue_date ? new Date(row.issue_date) : null;
        if (!date || Number.isNaN(date.getTime())) continue;
        const keyMonth = brazilDateParts(date).month;
        const unique = String(row.access_key || row.nsu || row.source_id || row.note_number || row.id || '');
        const dedupe = `${keyMonth}:${unique}`;
        if (unique && seen.has(dedupe)) continue;
        if (unique) seen.add(dedupe);
        months[keyMonth] ||= { sales: 0, purchases: 0 };
        if (row.direction === 'entrada') months[keyMonth].purchases += 1;
        else months[keyMonth].sales += 1;
      }
      return J({
        ok: true,
        year,
        months,
        available_from: access.from,
        available_to: access.to,
      });
    }

    const end = today();
    let start = scope === 'last_30_days' ? daysAgo(29) : '';
    if (scope === 'full') {
      const [oldestDocument, oldestReconciliation] = await Promise.all([
        admin.from('fiscal_dfe_documents')
          .select('issue_date')
          .eq('company_id', companyId)
          .neq('document_kind', 'evento')
          .not('issue_date', 'is', null)
          .order('issue_date', { ascending: true })
          .limit(1)
          .maybeSingle(),
        admin.from('fiscal_sales_reconciliation')
          .select('issue_date')
          .eq('company_id', companyId)
          .not('issue_date', 'is', null)
          .order('issue_date', { ascending: true })
          .limit(1)
          .maybeSingle(),
      ]);
      const candidates = [
        dateOnly(oldestDocument.data?.issue_date),
        dateOnly(oldestReconciliation.data?.issue_date),
      ].filter(Boolean).sort();
      start = candidates[0] || access.from || end;
    }

    const [docs, purchaseStateRes, salesStateRes, healthRes, certRes, reconciliation, syncHistoryRes] = await Promise.all([
      paged((from, to) => admin.from('fiscal_dfe_documents')
        .select('id,access_key,source_id,document_kind,direction,full_xml,xml,parse_error,issue_date,model,status_code,status_text')
        .eq('company_id', companyId)
        .neq('document_kind', 'evento')
        .gte('issue_date', `${start}T00:00:00-03:00`)
        .lte('issue_date', `${end}T23:59:59.999-03:00`)
        .order('issue_date', { ascending: true })
        .range(from, to), 20000),
      admin.from('fiscal_purchase_sync_state').select('*').eq('company_id', companyId).maybeSingle(),
      admin.from('fiscal_sales_sync_state').select('*').eq('company_id', companyId).maybeSingle(),
      admin.from('fiscal_sync_health').select('*').eq('company_id', companyId).maybeSingle(),
      admin.from('fiscal_certificates')
        .select('valid_until,is_active,certificate_name')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('valid_until', { ascending: false })
        .limit(1)
        .maybeSingle(),
      paged((from, to) => admin.from('fiscal_sales_reconciliation')
        .select('access_key,note_number,status,issue_date,xml_status,resolved_at')
        .eq('company_id', companyId)
        .gte('issue_date', `${start}T00:00:00-03:00`)
        .lte('issue_date', `${end}T23:59:59.999-03:00`)
        .order('note_number', { ascending: true })
        .range(from, to), 20000),
      admin.from('fiscal_sync_logs')
        .select('id,sync_type,source,response_code,response_message,status,mensagem_erro,documentos_encontrados,documentos_processados,documentos_erro,created_at,completed_at,tempo_duracao,details')
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(24),
    ]);

    const purchases = uniqueDocs(docs, 'entrada');
    const sales = uniqueDocs(docs, 'saida');
    const purchaseStored = purchases.length;
    const salesStored = sales.length;
    const purchaseXml = purchases.filter(row => row.full_xml && row.xml).length;
    const salesXml = sales.filter(row => row.full_xml && row.xml).length;
    const purchaseNfeStored = purchases.filter(isNfe55).length;
    const purchaseOtherStored = purchaseStored - purchaseNfeStored;
    const salesNfceStored = sales.filter(isNfce65).length;
    const salesOtherStored = salesStored - salesNfceStored;
    const manifestationRequired = purchases.filter(row => row.parse_error === 'xml_requires_manifestation').length;
    const manifestationSent = purchases.filter(row => row.parse_error === 'xml_retry:manifestation_sent').length;

    const purchaseState = purchaseStateRes.data || {};
    const salesState = salesStateRes.data || {};

    let purchaseExpected: number | null = null;
    let purchaseSourceChecked = false;
    let purchaseSourceError = '';
    let purchaseSourceBasis = 'none';
    let purchaseExpectedNfe: number | null = null;

    if (String(company.uf || '').toUpperCase() === 'AL') {
      try {
        const { data: tokenRow } = await admin
          .from('_fiscal_sales_debug_token')
          .select('token')
          .eq('id', true)
          .maybeSingle();
        const token = String(tokenRow?.token || '');
        if (token) {
          const response = await fetch(`${base}/functions/v1/fiscal-purchases-sefaz-al-report`, {
            method: 'POST',
            headers: { 'content-type': 'application/json', 'x-debug-token': token },
            body: JSON.stringify({
              company_id: companyId,
              start,
              end,
              dry_run: true,
              include_keys: false,
              audit: true,
            }),
            signal: AbortSignal.timeout(scope === 'full' ? 90000 : 60000),
          });
          const result = await response.json().catch(() => ({})) as any;
          if (response.ok) {
            purchaseExpectedNfe = Number(result.purchase_all_unique_keys ?? result.purchase_unique_keys ?? 0);
            purchaseExpected = purchaseExpectedNfe + purchaseOtherStored;
            purchaseSourceChecked = true;
            purchaseSourceBasis = 'sefaz_report_plus_other_models';
          } else {
            purchaseSourceError = String(result?.error || `HTTP ${response.status}`);
          }
        }
      } catch (error) {
        purchaseSourceError = error instanceof Error ? error.message : String(error);
      }
    }

    if (
      purchaseExpected == null &&
      purchaseState.last_completed_at &&
      !purchaseState.last_error &&
      /idle|completed|success/i.test(String(purchaseState.status || ''))
    ) {
      purchaseExpected = purchaseStored;
      purchaseExpectedNfe = purchaseNfeStored;
      purchaseSourceChecked = true;
      purchaseSourceBasis = 'completed_distribution';
    }

    const reconExpectedIdentities = new Set(
      reconciliation
        .filter((row: any) => ['found', 'cancelled'].includes(String(row.status || '').toLowerCase()))
        .map((row: any) => String(row.access_key || `note:${row.note_number || ''}`))
        .filter(Boolean)
    );
    const expectedNfce = reconExpectedIdentities.size;
    const hasNfceContext =
      salesNfceStored > 0 ||
      reconciliation.length > 0 ||
      Number(salesState.reconciliation_total || 0) > 0 ||
      Number(salesState.scanned_numbers || 0) > 0;

    const salesSourceChecked = hasNfceContext
      ? expectedNfce > 0 || Boolean(salesState.reconciliation_complete)
      : true;
    const salesExpected = salesSourceChecked ? expectedNfce + salesOtherStored : null;

    const purchaseMismatch = purchaseExpected != null && purchaseStored !== purchaseExpected;
    const salesMismatch = salesExpected != null && salesStored !== salesExpected;
    const purchaseFailures = Number(purchaseState.consecutive_failures || healthRes.data?.purchases_failure_count || 0);
    const salesFailures = Number(healthRes.data?.sales_failure_count || 0);
    const certUntil = certRes.data?.valid_until || null;
    const certExpired = Boolean(certUntil && new Date(`${certUntil}T23:59:59-03:00`).getTime() < Date.now());
    const pendingXml = Math.max(0, purchaseStored - purchaseXml) + Math.max(0, salesStored - salesXml);
    const persistent = purchaseFailures >= 3 || salesFailures >= 3;

    const purchaseStatus = String(purchaseState.status || '').toLowerCase();
    const salesStatus = String(salesState.status || '').toLowerCase();
    const purchaseBlocked = ['waiting_certificate', 'cooldown', 'error', 'failed', 'retry'].some(value => purchaseStatus.includes(value));
    const salesBlocked = ['waiting_certificate', 'error', 'failed', 'retry'].some(value => salesStatus.includes(value));
    const hasAttention =
      purchaseMismatch ||
      salesMismatch ||
      pendingXml > 0 ||
      manifestationRequired > 0 ||
      manifestationSent > 0 ||
      purchaseBlocked ||
      salesBlocked ||
      purchaseExpected == null ||
      salesExpected == null;

    const state = certExpired || (persistent && (purchaseMismatch || salesMismatch || pendingXml > 0))
      ? 'error'
      : hasAttention
        ? 'attention'
        : 'healthy';

    const checkedAt = new Date().toISOString();
    const details = {
      purchases: {
        source_checked: purchaseSourceChecked,
        source_basis: purchaseSourceBasis,
        source_error: purchaseSourceError || null,
        expected_nfe: purchaseExpectedNfe,
        present_nfe: purchaseNfeStored,
        present_other_models: purchaseOtherStored,
        xml_ready: purchaseXml,
      },
      sales: {
        source_checked: salesSourceChecked,
        expected_nfce: expectedNfce,
        present_nfce: salesNfceStored,
        present_other_models: salesOtherStored,
        xml_ready: salesXml,
      },
      pending_xml: pendingXml,
    };

    if (action === 'check') {
      const originValue = String(body.origin || 'manual_check');
      const origin = ['manual_check', 'post_sync', 'automatic'].includes(originValue)
        ? originValue
        : 'manual_check';
      const { error: insertError } = await admin.from('extractor_fiscal_check_runs').insert({
        account_id: access.account_id,
        company_id: companyId,
        scope,
        period_start: start,
        period_end: end,
        purchases_expected: purchaseExpected,
        purchases_present: purchaseStored,
        sales_expected: salesExpected,
        sales_present: salesStored,
        state,
        origin,
        details,
        requested_by: auth.user.id,
        checked_at: checkedAt,
      });
      if (insertError) throw insertError;
    }

    const syncHistory = (syncHistoryRes.data || []).map((row: any) => {
      const responseCode = fiscalResponseCode(row.response_code, row.response_message || row.mensagem_erro);
      const responseRaw = String(row.response_message || row.mensagem_erro || '').trim() || null;
      return {
        id: row.id,
        type: row.sync_type,
        source: row.source || (row.sync_type === 'compras' ? 'Ambiente Nacional / SEFAZ' : 'Sincronização de vendas'),
        status: row.status,
        started_at: row.created_at,
        completed_at: row.completed_at,
        response_code: responseCode || null,
        response_summary: translateFiscalResponse(responseCode, responseRaw, row.details?.state_status || row.status),
        found: Number(row.documentos_encontrados || 0),
        processed: Number(row.documentos_processados || 0),
        errors: Number(row.documentos_erro || 0),
      };
    });

    return J({
      ok: true,
      checked_at: checkedAt,
      scope,
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
        source_basis: purchaseSourceBasis,
        source_error: purchaseSourceError || null,
        expected: purchaseExpected,
        stored: purchaseStored,
        expected_nfe: purchaseExpectedNfe,
        stored_nfe: purchaseNfeStored,
        stored_other_models: purchaseOtherStored,
        xml_ready: purchaseXml,
        xml_pending: Math.max(0, purchaseStored - purchaseXml),
        manifestation_required: manifestationRequired,
        manifestation_sent: manifestationSent,
        status: purchaseState.status || null,
        status_code: purchaseState.last_status_code || null,
        status_message: purchaseState.last_status_message || null,
        status_summary: translateFiscalResponse(
          purchaseState.last_status_code,
          purchaseState.last_status_message || purchaseState.last_error,
          purchaseState.status
        ),
        last_started_at: purchaseState.last_started_at || null,
        last_completed_at: purchaseState.last_completed_at || null,
        last_error: purchaseState.last_error || null,
        failures: purchaseFailures,
      },
      sales: {
        source_checked: salesSourceChecked,
        expected: salesExpected,
        stored: salesStored,
        expected_nfce: expectedNfce,
        stored_nfce: salesNfceStored,
        stored_other_models: salesOtherStored,
        xml_ready: salesXml,
        xml_pending: Math.max(0, salesStored - salesXml),
        sequence_total: Number(salesState.reconciliation_total || 0),
        sequence_resolved: Number(salesState.reconciliation_resolved || 0),
        reconciliation_complete: Boolean(salesState.reconciliation_complete),
        status: salesState.status || null,
        last_started_at: salesState.last_started_at || null,
        last_completed_at: salesState.last_completed_at || null,
        last_error: salesState.last_error || null,
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
      history: await checkHistory(admin, access.account_id, companyId, scope),
      sync_history: syncHistory,
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return J({
      error: status < 500 ? error.message : 'Não foi possível conferir a saúde fiscal agora.',
    }, status);
  }
});
