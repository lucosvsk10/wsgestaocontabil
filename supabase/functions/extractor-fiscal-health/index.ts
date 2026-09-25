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
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const xmlTag = (xml: string, name: string) => {
  const match = xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([^<]+)</(?:\\w+:)?${name}>`, 'i'));
  return match?.[1]?.trim() || '';
};
const accessKeyFrom = (value: unknown) => {
  const raw = String(value ?? '');
  const direct = digits(raw);
  if (direct.length === 44) return direct;
  return raw.match(/(?:^|\D)(\d{44})(?:\D|$)/)?.[1] || '';
};
const validAccessKey = (key: string) => {
  if (!/^\d{44}$/.test(key)) return false;
  let weight = 2;
  let sum = 0;
  for (let index = 42; index >= 0; index -= 1) {
    sum += Number(key[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const remainder = sum % 11;
  const expected = remainder === 0 || remainder === 1 ? 0 : 11 - remainder;
  return expected === Number(key[43]);
};

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

    if (action === 'sales_reference') {
      const method = String(body.method || 'key').toLowerCase();
      if (!['key', 'xml', 'danfe', 'qr'].includes(method)) return J({ error: 'Método de referência inválido.' }, 400);

      const xml = typeof body.xml === 'string' ? body.xml.trim() : '';
      const accessKey = accessKeyFrom(body.access_key) || accessKeyFrom(xml);
      if (!validAccessKey(accessKey)) return J({ error: 'A chave de acesso não é válida.' }, 400);

      const companyCnpj = digits(company.cnpj);
      if (accessKey.slice(6, 20) !== companyCnpj) {
        return J({ error: 'Esta nota não foi emitida pela empresa selecionada.' }, 400);
      }

      const model = accessKey.slice(20, 22);
      if (!['55', '65'].includes(model)) return J({ error: 'Use uma NF-e modelo 55 ou NFC-e modelo 65 emitida pela empresa.' }, 400);
      const series = String(Number(accessKey.slice(22, 25)));
      const noteNumber = Number(accessKey.slice(25, 34));
      const submittedAt = new Date().toISOString();
      const xmlContainsKey = !xml || digits(xml).includes(accessKey);
      if (!xmlContainsKey) return J({ error: 'O XML enviado não corresponde à chave informada.' }, 400);

      const authorizedXml = Boolean(
        xml &&
        /<(?:\w+:)?(?:nfeProc|procNFe)\b/i.test(xml) &&
        /<(?:\w+:)?cStat(?:\s[^>]*)?>(?:100|150)<\/(?:\w+:)?cStat>/i.test(xml)
      );
      const issueDate = xmlTag(xml, 'dhEmi') || xmlTag(xml, 'dEmi') || null;
      const totalRaw = xmlTag(xml, 'vNF');
      const totalValue = totalRaw && Number.isFinite(Number(totalRaw)) ? Number(totalRaw) : null;

      if (authorizedXml) {
        const { error: saleError } = await admin.from('fiscal_sales_documents').upsert({
          company_id: companyId,
          uf: String(company.uf || '').toUpperCase(),
          model,
          access_key: accessKey,
          document_number: String(noteNumber),
          series,
          issue_date: issueDate,
          status: 'Autorizada',
          total_value: totalValue,
          xml,
          source: 'user_sales_reference_xml',
          source_reference: {
            user_reference: true,
            method,
            submitted_by: auth.user.id,
            submitted_at: submittedAt,
            xml_pending: false,
          },
          updated_at: submittedAt,
        }, { onConflict: 'company_id,access_key' });
        if (saleError) throw saleError;
      }

      const { data: currentState, error: stateReadError } = await admin
        .from('fiscal_sales_sync_state')
        .select('latest_number,cursor_number,initial_floor_number,status,paused')
        .eq('company_id', companyId)
        .maybeSingle();
      if (stateReadError) throw stateReadError;

      const { error: stateError } = await admin.from('fiscal_sales_sync_state').upsert({
        company_id: companyId,
        latest_number: Math.max(Number(currentState?.latest_number || 0), noteNumber),
        cursor_number: Math.max(Number(currentState?.cursor_number || 0), noteNumber),
        initial_floor_number: Number(currentState?.initial_floor_number || 0) || null,
        reference_access_key: accessKey,
        reference_model: model,
        reference_series: series,
        reference_number: noteNumber,
        reference_method: method,
        reference_submitted_at: submittedAt,
        reference_submitted_by: auth.user.id,
        status: currentState?.paused ? String(currentState.status || 'paused') : 'queued',
        paused: Boolean(currentState?.paused),
        reconciliation_complete: false,
        last_error: null,
        next_scheduled_at: submittedAt,
        updated_at: submittedAt,
      }, { onConflict: 'company_id' });
      if (stateError) throw stateError;

      const documentType = model === '65' ? 'nfce65' : 'nfe55';
      const { error: coverageError } = await admin.from('fiscal_extractor_coverage').upsert({
        company_id: companyId,
        document_type: documentType,
        direction: 'saida',
        applicability: 'required',
        coverage_status: 'partial',
        source_confirmed: false,
        source_name: 'Referência fiscal fornecida pelo usuário',
        source_mode: 'user_reference_bootstrap',
        last_verified_at: submittedAt,
        last_error: 'Referência recebida. O sistema está buscando e conferindo o histórico completo.',
        details: { model, series, note_number: noteNumber, method, submitted_at: submittedAt },
        updated_at: submittedAt,
      }, { onConflict: 'company_id,document_type,direction' });
      if (coverageError) throw coverageError;

      return J({
        ok: true,
        model,
        series,
        note_number: noteNumber,
        xml_saved: authorizedXml,
        gate: {
          ready: false,
          status: 'syncing',
          title: 'Referência recebida',
          message: 'Estamos buscando as demais notas e validando o período completo. A página será liberada automaticamente quando a cobertura estiver confirmada.',
          automatic_discovery: true,
          accepts_reference: false,
          last_checked_at: submittedAt,
        },
      });
    }

    if (action === 'coverage_status') {
      const [coverageResult, salesStateResult, certificateResult] = await Promise.all([
        admin.from('fiscal_extractor_coverage')
          .select('document_type,direction,applicability,coverage_status,source_confirmed,source_name,last_error,last_verified_at,details')
          .eq('company_id', companyId)
          .order('direction', { ascending: true })
          .order('document_type', { ascending: true }),
        admin.from('fiscal_sales_sync_state')
          .select('status,last_error,last_started_at,last_completed_at,next_scheduled_at,reference_access_key,reference_submitted_at,paused')
          .eq('company_id', companyId)
          .maybeSingle(),
        admin.from('fiscal_certificates')
          .select('valid_until,is_active')
          .eq('company_id', companyId)
          .eq('is_active', true)
          .order('valid_until', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (coverageResult.error) throw coverageResult.error;
      if (salesStateResult.error) throw salesStateResult.error;
      if (certificateResult.error) throw certificateResult.error;

      const coverage = coverageResult.data || [];
      const salesState = salesStateResult.data || null;
      const certificate = certificateResult.data || null;
      const certificateUntil = String(certificate?.valid_until || '');
      const certificateUntilMs = certificateUntil
        ? new Date(certificateUntil.includes('T') ? certificateUntil : `${certificateUntil}T23:59:59-03:00`).getTime()
        : 0;
      const certReady = Boolean(certificate?.is_active && certificateUntilMs >= Date.now());
      const purchaseReady = coverage.some((row: any) =>
        row.direction === 'entrada' &&
        row.document_type === 'nfe55' &&
        row.coverage_status === 'covered' &&
        row.source_confirmed === true
      );
      const salesReady = coverage.some((row: any) =>
        row.direction === 'saida' &&
        ['required', 'observed'].includes(String(row.applicability || '')) &&
        ['nfe55', 'nfce65', 'nfse'].includes(String(row.document_type || '')) &&
        row.coverage_status === 'covered' &&
        row.source_confirmed === true
      );
      const ready = certReady && purchaseReady && salesReady;
      const salesStatus = String(salesState?.status || '').toLowerCase();
      const activeSync = ['queued', 'running', 'discovering', 'bootstrap_window', 'reconciling'].some(value => salesStatus.includes(value));
      const needsReference = !activeSync && (
        !salesState ||
        ['waiting_sales_reference', 'unsupported_source', 'error', 'failed'].some(value => salesStatus.includes(value)) ||
        (!salesReady && ['idle', 'completed', 'success'].includes(salesStatus))
      );
      const checkedAt = new Date().toISOString();
      const gate = ready
        ? {
            ready: true,
            status: 'ready',
            title: 'Fontes fiscais confirmadas',
            message: 'Compras e vendas estão sendo capturadas e conferidas.',
            automatic_discovery: false,
            accepts_reference: false,
            last_checked_at: checkedAt,
          }
        : !certReady
          ? {
              ready: false,
              status: 'needs_certificate',
              title: 'Certificado A1 necessário',
              message: 'Adicione ou renove o certificado A1 desta empresa para iniciar a busca fiscal.',
              automatic_discovery: false,
              accepts_reference: false,
              last_checked_at: checkedAt,
            }
          : activeSync
            ? {
                ready: false,
                status: 'syncing',
                title: 'Validando a cobertura fiscal',
                message: 'A busca automática está percorrendo e conferindo o histórico. A página será liberada assim que entradas e saídas forem confirmadas.',
                automatic_discovery: true,
                accepts_reference: false,
                last_checked_at: checkedAt,
              }
            : {
                ready: false,
                status: needsReference ? 'needs_reference' : 'checking',
                title: needsReference ? 'Ajude-nos com uma nota de referência' : 'Verificando as fontes fiscais',
                message: needsReference
                  ? 'Envie uma única nota de venda desta empresa. A chave, XML, DANFE ou QR Code é suficiente para localizarmos as demais automaticamente.'
                  : 'Estamos tentando localizar automaticamente a primeira referência fiscal desta empresa.',
                automatic_discovery: !needsReference,
                accepts_reference: needsReference,
                last_checked_at: checkedAt,
              };

      return J({ ok: true, company_id: companyId, coverage, gate });
    }

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

      const [documentRows, undatedRows, salesRows, undatedSalesRows, reconciliationRows] = await Promise.all([
        paged((from, to) => admin.from('fiscal_dfe_documents')
          .select('id,access_key,source_id,nsu,document_kind,direction,issue_date')
          .eq('company_id', companyId)
          .neq('document_kind', 'evento')
          .gte('issue_date', `${start}T00:00:00-03:00`)
          .lte('issue_date', `${end}T23:59:59.999-03:00`)
          .order('issue_date', { ascending: true })
          .range(from, to)),
        paged((from, to) => admin.from('fiscal_dfe_documents')
          .select('id,access_key,source_id,nsu,document_kind,direction,issue_date')
          .eq('company_id', companyId)
          .neq('document_kind', 'evento')
          .is('issue_date', null)
          .not('access_key', 'is', null)
          .order('access_key', { ascending: true })
          .range(from, to)),
        paged((from, to) => admin.from('fiscal_sales_documents')
          .select('id,access_key,document_number,source,issue_date')
          .eq('company_id', companyId)
          .gte('issue_date', `${start}T00:00:00-03:00`)
          .lte('issue_date', `${end}T23:59:59.999-03:00`)
          .order('issue_date', { ascending: true })
          .range(from, to)),
        paged((from, to) => admin.from('fiscal_sales_documents')
          .select('id,access_key,document_number,source,issue_date')
          .eq('company_id', companyId)
          .is('issue_date', null)
          .not('access_key', 'is', null)
          .order('access_key', { ascending: true })
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
      const canonicalSales = [...salesRows, ...undatedSalesRows].map((item: any) => ({
        ...item,
        source_id: `sale:${item.id}`,
        note_number: item.document_number,
        direction: 'saida',
      }));
      for (const row of [...documentRows, ...undatedRows, ...canonicalSales, ...reconciliationRows.map((item: any) => ({ ...item, direction: 'saida' }))]) {
        const date = row.issue_date ? new Date(row.issue_date) : null;
        const accessKey = String(row.access_key || '');
        const keyYearMonth = !date && /^\d{44}$/.test(accessKey) ? accessKey.slice(2, 6) : null;
        if (!keyYearMonth && (!date || Number.isNaN(date.getTime()))) continue;
        if (keyYearMonth && (keyYearMonth < start.slice(2, 4) + start.slice(5, 7) || keyYearMonth > end.slice(2, 4) + end.slice(5, 7))) continue;
        const keyMonth = keyYearMonth ? keyYearMonth.slice(2) : brazilDateParts(date!).month;
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

    const end = access.to && access.to < today() ? access.to : today();
    const fullStart = access.from || end;
    const last30Start = daysAgo(29);
    const start = scope === 'last_30_days'
      ? (fullStart > last30Start ? fullStart : last30Start)
      : fullStart;

    const [docs, purchaseStateRes, salesStateRes, healthRes, certRes, reconciliation, syncHistoryRes, coverageRes] = await Promise.all([
      Promise.all([
        paged((from, to) => admin.from('fiscal_dfe_documents')
          .select('id,access_key,source_id,document_kind,direction,full_xml,xml,parse_error,issue_date,model,status_code,status_text')
          .eq('company_id', companyId)
          .neq('document_kind', 'evento')
          .gte('issue_date', `${start}T00:00:00-03:00`)
          .lte('issue_date', `${end}T23:59:59.999-03:00`)
          .order('issue_date', { ascending: true })
          .range(from, to), 20000),
        paged((from, to) => admin.from('fiscal_sales_documents')
          .select('id,access_key,document_number,source,issue_date,model,status,total_value,xml,source_reference')
          .eq('company_id', companyId)
          .gte('issue_date', `${start}T00:00:00-03:00`)
          .lte('issue_date', `${end}T23:59:59.999-03:00`)
          .order('issue_date', { ascending: true })
          .range(from, to), 20000),
        paged((from, to) => admin.from('fiscal_sales_documents')
          .select('id,access_key,document_number,source,issue_date,model,status,total_value,xml,source_reference')
          .eq('company_id', companyId)
          .is('issue_date', null)
          .not('access_key', 'is', null)
          .order('access_key', { ascending: true })
          .range(from, to), 20000),
      ]).then(([dfeRows, saleRows, undatedSaleRows]) => [
        ...dfeRows,
        ...[...saleRows, ...undatedSaleRows.filter((row: any) => {
          const key = String(row.access_key || '');
          if (!/^\d{44}$/.test(key)) return false;
          const keyMonth = key.slice(2, 6);
          return keyMonth >= start.slice(2, 4) + start.slice(5, 7) && keyMonth <= end.slice(2, 4) + end.slice(5, 7);
        })].map((row: any) => ({
          ...row,
          source_id: `sale:${row.id}`,
          document_kind: 'nfe',
          direction: 'saida',
          full_xml: Boolean(row.xml),
          parse_error: row.source_reference?.xml_last_error || null,
          status_text: row.status,
        })),
      ]),
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
        .select('access_key,note_number,status,issue_date,xml_status,resolved_at,model')
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
      admin.from('fiscal_extractor_coverage')
        .select('document_type,direction,applicability,coverage_status,source_confirmed,source_name,last_error,last_verified_at')
        .eq('company_id', companyId),
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
    const expectedNfce = new Set(
      reconciliation
        .filter((row: any) =>
          String(row.model || '') === '65' &&
          ['found', 'cancelled'].includes(String(row.status || '').toLowerCase())
        )
        .map((row: any) => String(row.access_key || `note:${row.note_number || ''}`))
        .filter(Boolean)
    ).size;
    const hasNfceContext =
      salesNfceStored > 0 ||
      reconciliation.length > 0 ||
      Number(salesState.reconciliation_total || 0) > 0 ||
      Number(salesState.scanned_numbers || 0) > 0;

    const salesStatus = String(salesState.status || '').toLowerCase();
    const salesPipelineUnavailable =
      !salesState.company_id ||
      salesStatus === 'waiting_sales_reference' ||
      salesStatus === 'waiting_certificate' ||
      salesStatus === 'unsupported_source' ||
      (salesStatus === 'queued' && !salesState.last_started_at);
    const salesSourceChecked = salesPipelineUnavailable
      ? false
      : hasNfceContext
        ? expectedNfce > 0 || Boolean(salesState.reconciliation_complete)
        : String(company.uf || '').toUpperCase() === 'SP' && Boolean(salesState.last_completed_at);
    const salesExpectedIdentities = new Set(reconExpectedIdentities);
    for (const row of sales) {
      const identity = String(row.access_key || row.source_id || row.id || '');
      if (identity) salesExpectedIdentities.add(identity);
    }
    const salesExpected = salesSourceChecked ? salesExpectedIdentities.size : null;

    const purchaseMismatch = purchaseExpected != null && purchaseStored !== purchaseExpected;
    const salesMismatch = salesExpected != null && salesStored !== salesExpected;
    const purchaseFailures = Number(purchaseState.consecutive_failures || healthRes.data?.purchases_failure_count || 0);
    const salesFailures = Number(healthRes.data?.sales_failure_count || 0);
    const certUntil = certRes.data?.valid_until || null;
    const certExpired = Boolean(certUntil && new Date(`${certUntil}T23:59:59-03:00`).getTime() < Date.now());
    const pendingXml = Math.max(0, purchaseStored - purchaseXml) + Math.max(0, salesStored - salesXml);
    const persistent = purchaseFailures >= 3 || salesFailures >= 3;

    const coverageRows = coverageRes.data || [];
    const coverageBlocking = coverageRows.filter((row: any) =>
      row.applicability !== 'not_applicable' && row.coverage_status !== 'covered'
    );
    const coverageRequiredBlocking = coverageBlocking.filter((row: any) =>
      row.applicability === 'required' || row.applicability === 'observed'
    );
    const salesCoverageRows = coverageRows.filter((row: any) =>
      row.direction === 'saida' &&
      (row.applicability === 'required' || row.applicability === 'observed') &&
      ['nfe55', 'nfce65', 'nfse'].includes(String(row.document_type || ''))
    );
    const salesSourceComplete = salesCoverageRows.length > 0 && salesCoverageRows.every((row: any) =>
      row.coverage_status === 'covered' && row.source_confirmed === true
    );

    const purchaseStatus = String(purchaseState.status || '').toLowerCase();
    const purchaseBlocked = ['waiting_certificate', 'cooldown', 'error', 'failed', 'retry'].some(value => purchaseStatus.includes(value));
    const salesBlocked =
      ['waiting_certificate', 'waiting_sales_reference', 'unsupported_source', 'error', 'failed', 'retry'].some(value => salesStatus.includes(value)) ||
      (salesStatus === 'queued' && !salesState.last_started_at);
    const hasAttention =
      purchaseMismatch ||
      salesMismatch ||
      pendingXml > 0 ||
      manifestationRequired > 0 ||
      manifestationSent > 0 ||
      purchaseBlocked ||
      salesBlocked ||
      purchaseExpected == null ||
      salesExpected == null ||
      coverageBlocking.length > 0;

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
        models: {
          nfe55: purchaseNfeStored,
          other: purchaseOtherStored,
        },
      },
      sales: {
        source_checked: salesSourceChecked,
        pipeline_status: salesStatus || null,
        pipeline_error: salesState.last_error || null,
        supported_uf: ['AL','SP'].includes(String(company.uf || '').toUpperCase()),
        expected_nfce: String(company.uf || '').toUpperCase() === 'SP' ? null : expectedNfce,
        present_nfce: salesNfceStored,
        present_other_models: salesOtherStored,
        xml_ready: salesXml,
        source_complete: salesSourceComplete,
        models: {
          nfe55: sales.filter(isNfe55).length,
          nfce65: salesNfceStored,
          other: sales.filter((row: any) => !isNfe55(row) && !isNfce65(row)).length,
        },
      },
      pending_xml: pendingXml,
      coverage: {
        complete: coverageBlocking.length === 0,
        total: coverageRows.length,
        covered: coverageRows.filter((row: any) => row.coverage_status === 'covered').length,
        blocked: coverageBlocking.length,
        required_blocked: coverageRequiredBlocking.length,
        rows: coverageRows,
      },
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
        models: details.purchases.models,
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
        source_complete: salesSourceComplete,
        expected: salesExpected,
        stored: salesStored,
        expected_nfce: expectedNfce,
        stored_nfce: salesNfceStored,
        stored_other_models: salesOtherStored,
        xml_ready: salesXml,
        xml_pending: Math.max(0, salesStored - salesXml),
        models: details.sales.models,
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
