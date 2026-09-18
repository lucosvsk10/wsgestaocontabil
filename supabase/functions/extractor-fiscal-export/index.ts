import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import JSZip from 'npm:jszip@3.10.1';
import { documentAccess } from '../_shared/extractor-access.ts';
import { consume, limited } from '../_shared/rate-limit.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'Content-Disposition, Content-Type, Content-Length',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const clean = (value: unknown) =>
  String(value ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const safeName = (value: unknown) =>
  clean(value)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 90) || 'documento';

const csvCell = (value: unknown) => {
  const raw = String(value ?? '');
  return `"${raw.replace(/"/g, '""')}"`;
};

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');

const unwrapStoredFiscalXml = (raw: unknown) => {
  const value = typeof raw === 'string' ? raw.trim() : '';
  if (!value) return '';
  if (/^<\?xml\b/i.test(value) || /^<(?:\w+:)?(?:nfeProc|NFe|procNFe|CompNfse|NFSe|DPS)\b/i.test(value)) {
    return value;
  }
  const objectMatch = value.match(/var\s+stringJson\s*=\s*(\{[\s\S]*?\})\s*;/i);
  if (objectMatch?.[1]) {
    try {
      const parsed = JSON.parse(objectMatch[1]);
      if (typeof parsed?.xml === 'string' && parsed.xml.trim().startsWith('<')) return parsed.xml.trim();
    } catch {}
  }
  const xmlStringMatch = value.match(/["']xml["']\s*:\s*("(?:\\.|[^"\\])*")/i);
  if (xmlStringMatch?.[1]) {
    try {
      const parsed = JSON.parse(xmlStringMatch[1]);
      if (typeof parsed === 'string' && parsed.trim().startsWith('<')) return parsed.trim();
    } catch {}
  }
  return '';
};

const normalizeDocumentXml = (document: any) => {
  const xml = unwrapStoredFiscalXml(document?.xml);
  return xml ? { ...document, xml, full_xml: true } : document;
};

const validFullXml = (document: any) => {
  const xml = unwrapStoredFiscalXml(document?.xml);
  if (!document.full_xml || xml.length < 80) return false;
  const kind = String(document.document_kind || '').toLowerCase();
  const model = String(document.model || '');
  if (kind === 'nfse' || /nfse/i.test(`${document.schema_name || ''} ${model}`)) {
    return /<[^>]*NFSe\b|<[^>]*infNFSe\b/i.test(xml);
  }
  return /<(?:\w+:)?NFe\b|<(?:\w+:)?nfeProc\b/i.test(xml);
};

const documentType = (document: any) => {
  const hint = `${document.document_kind || ''} ${document.schema_name || ''} ${document.source || ''}`.toLowerCase();
  if (hint.includes('nfse') || hint.includes('nfs-e')) return 'nfse';
  const model = String(document.model || (digits(document.access_key).length === 44 ? digits(document.access_key).slice(20, 22) : ''));
  if (model === '65') return 'nfce';
  if (model === '55') return 'nfe';
  return 'other';
};

const pendingReason = (document: any) => {
  const error = String(document.parse_error || '');
  if (error === 'xml_requires_manifestation') return 'Manifestação do destinatário necessária para liberar o XML.';
  if (error === 'xml_retry:manifestation_sent') return 'Manifestação registrada; XML ainda aguardando liberação.';
  if (!document.full_xml) return 'XML integral ainda não foi recuperado.';
  return error ? clean(error) : 'Arquivo fiscal integral indisponível.';
};

const toPreview = (document: any) => ({
  companyId: document.company_id,
  nsu: document.nsu,
  schema: document.schema_name,
  source: document.source,
  documentKind: document.document_kind,
  fullXml: document.full_xml,
  direction: document.direction,
  accessKey: document.access_key,
  model: document.model,
  issueDate: document.issue_date,
  value: Number(document.value || 0),
  issuerCnpj: document.issuer_cnpj,
  issuerName: document.issuer_name,
  recipientCnpj: document.recipient_cnpj,
  recipientName: document.recipient_name,
  number: document.note_number,
  series: document.series,
  statusCode: document.status_code,
  statusText: document.status_text,
  xml: document.xml,
  parseError: document.parse_error,
});

async function renderPdf(baseUrl: string, anon: string, authorization: string, document: any) {
  const response = await fetch(`${baseUrl}/functions/v1/dfe-danfe-pdf`, {
    method: 'POST',
    headers: {
      authorization,
      apikey: anon,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ company_id: document.company_id, document: toPreview(document) }),
    signal: AbortSignal.timeout(45000),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.pdf_base64) {
    throw new Error(`Falha ao gerar PDF da nota ${document.note_number || document.access_key || ''}: ${payload?.error || response.status}`);
  }
  return Uint8Array.from(atob(String(payload.pdf_base64)), char => char.charCodeAt(0));
}

async function fetchPaged(makeQuery: () => any, cap = 10000) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; from < cap; from += pageSize) {
    const { data, error } = await makeQuery().range(from, Math.min(from + pageSize - 1, cap - 1));
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

function dedupe(rows: any[]) {
  const map = new Map<string, any>();
  for (const raw of rows) {
    const row = normalizeDocumentXml(raw);
    const key = `${row.company_id}:${row.access_key || row.nsu || row.id}`;
    const previous = map.get(key);
    if (!previous || (validFullXml(row) && !validFullXml(previous))) map.set(key, row);
  }
  return [...map.values()].sort((a, b) => String(a.issue_date || '').localeCompare(String(b.issue_date || '')));
}

const localDayStart = (value: string) => new Date(`${value}T00:00:00-03:00`).toISOString();
const nextLocalDayStart = (value: string) =>
  new Date(new Date(`${value}T00:00:00-03:00`).getTime() + 86_400_000).toISOString();

async function directExportRows(
  admin: any,
  companyIds: string[],
  accessByCompany: Map<string, { from: string | null; to: string }>,
  start: string,
  end: string,
  direction: string,
) {
  const rows: any[] = [];

  for (const companyId of companyIds) {
    const access = accessByCompany.get(companyId);
    if (!access) continue;

    const effectiveStart = access.from && access.from > start ? access.from : start;
    const effectiveEnd = access.to && access.to < end ? access.to : end;
    if (effectiveStart > effectiveEnd) continue;

    const fromIso = localDayStart(effectiveStart);
    const toExclusiveIso = nextLocalDayStart(effectiveEnd);
    const applyDirection = (query: any) => {
      if (direction === 'entrada') return query.in('direction', ['entrada', 'inbound']);
      if (direction === 'saida') return query.in('direction', ['saida', 'outbound']);
      return query;
    };

    const dated = await fetchPaged(() => {
      let query = admin
        .from('fiscal_dfe_documents')
        .select('id,company_id,nsu,schema_name,source,document_kind,full_xml,direction,access_key,model,issue_date,value,issuer_cnpj,issuer_name,recipient_cnpj,note_number,series,status_code,status_text,xml,parse_error,updated_at')
        .eq('company_id', companyId)
        .neq('document_kind', 'evento')
        .gte('issue_date', fromIso)
        .lt('issue_date', toExclusiveIso)
        .order('issue_date', { ascending: true });
      query = applyDirection(query);
      return query;
    });
    rows.push(...dated);

    const undated = await fetchPaged(() => {
      let query = admin
        .from('fiscal_dfe_documents')
        .select('id,company_id,nsu,schema_name,source,document_kind,full_xml,direction,access_key,model,issue_date,value,issuer_cnpj,issuer_name,recipient_cnpj,note_number,series,status_code,status_text,xml,parse_error,updated_at,received_at')
        .eq('company_id', companyId)
        .neq('document_kind', 'evento')
        .is('issue_date', null)
        .gte('received_at', fromIso)
        .lt('received_at', toExclusiveIso)
        .order('received_at', { ascending: true });
      query = applyDirection(query);
      return query;
    });
    rows.push(...undated);

    if (direction !== 'entrada') {
      const sales = await fetchPaged(() =>
        admin
          .from('fiscal_sales_documents')
          .select('id,company_id,access_key,model,issue_date,total_value,recipient_document,recipient_name,document_number,series,status,xml,source,updated_at')
          .eq('company_id', companyId)
          .gte('issue_date', fromIso)
          .lt('issue_date', toExclusiveIso)
          .order('issue_date', { ascending: true })
      );

      rows.push(...sales.map((sale: any) => ({
        id: sale.id,
        company_id: sale.company_id,
        nsu: null,
        schema_name: 'procNFe_v4.00',
        source: sale.source || 'fiscal_sales_documents',
        document_kind: 'nfe',
        full_xml: Boolean(sale.xml && String(sale.xml).length > 80),
        direction: 'saida',
        access_key: sale.access_key,
        model: sale.model,
        issue_date: sale.issue_date,
        value: sale.total_value,
        issuer_cnpj: null,
        issuer_name: null,
        recipient_cnpj: sale.recipient_document,
        recipient_name: sale.recipient_name,
        note_number: sale.document_number,
        series: sale.series,
        status_code: /cancel/i.test(String(sale.status || '')) ? '101' : '100',
        status_text: sale.status || 'Autorizada',
        xml: sale.xml,
        parse_error: null,
        updated_at: sale.updated_at,
      })));
    }
  }

  return dedupe(rows);
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization) return json({ error: 'Não autenticado' }, 401);
    const baseUrl = Deno.env.get('SUPABASE_URL');
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const anon = Deno.env.get('SUPABASE_ANON_KEY');
    if (!baseUrl || !service || !anon) return json({ error: 'Configuração incompleta' }, 500);

    const admin = createClient(baseUrl, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const token = authorization.replace(/^Bearer\s+/i, '');
    const { data: auth } = await admin.auth.getUser(token);
    if (!auth.user) return json({ error: 'Não autenticado' }, 401);
    const body = await req.json().catch(() => ({})) as any;
    const action = String(body.action || 'preflight');
    const format = String(body.format || 'bundle');
    const start = String(body.start || '');
    const end = String(body.end || '');
    const direction = String(body.direction || 'todos');
    const type = String(body.document_type || 'todos');
    const allCompanies = body.all_companies === true;
    const allowPartial = body.allow_partial === true;
    const currentCompanyId = String(body.company_id || '');

    const rateDenied = limited(await consume(
      admin,
      action === 'preflight' ? 'extractor_export_check' : 'extractor_export_download',
      auth.user.id,
      action === 'preflight' ? 30 : 5,
      600
    ));
    if (rateDenied) return rateDenied;

    if (!['preflight', 'download'].includes(action)) return json({ error: 'Ação inválida' }, 400);
    if (!['bundle', 'pdf', 'xml', 'keys', 'report'].includes(format)) return json({ error: 'Formato inválido' }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return json({ error: 'Período inválido' }, 400);
    if (!['todos', 'entrada', 'saida'].includes(direction)) return json({ error: 'Operação inválida' }, 400);
    if (!['todos', 'nfe', 'nfce', 'nfse'].includes(type)) return json({ error: 'Tipo de documento inválido' }, 400);

    const accessByCompany = new Map<string, { from: string | null; to: string }>();
    let allowedCompanyIds: string[] = [];

    if (allCompanies) {
      const { data: memberships, error: membershipsError } = await admin
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', auth.user.id)
        .eq('status', 'active');
      if (membershipsError) throw membershipsError;
      const organizationIds = [...new Set((memberships || []).map((item: any) => String(item.organization_id)).filter(Boolean))];
      if (!organizationIds.length) return json({ error: 'Nenhuma conta do Extrator disponível para este usuário.' }, 403);

      const { data: accounts, error: accountsError } = await admin
        .from('extractor_accounts')
        .select('id')
        .in('organization_id', organizationIds)
        .in('status', ['trialing', 'active', 'past_due']);
      if (accountsError) throw accountsError;
      const accountIds = [...new Set((accounts || []).map((item: any) => String(item.id)).filter(Boolean))];
      if (!accountIds.length) return json({ error: 'Nenhuma conta ativa do Extrator encontrada.' }, 403);

      const { data: links, error: linksError } = await admin
        .from('extractor_companies')
        .select('fiscal_company_id')
        .in('account_id', accountIds)
        .eq('status', 'active');
      if (linksError) throw linksError;

      const candidates = [...new Set((links || []).map((item: any) => String(item.fiscal_company_id)).filter(Boolean))];
      for (const companyId of candidates) {
        try {
          const access = await documentAccess(admin, auth.user.id, companyId);
          accessByCompany.set(companyId, access);
          allowedCompanyIds.push(companyId);
        } catch {
          // A conta pode ter um vínculo histórico sem direito atual; não expor nem exportar.
        }
      }
    } else {
      if (!currentCompanyId) return json({ error: 'Empresa obrigatória' }, 400);
      const access = await documentAccess(admin, auth.user.id, currentCompanyId);
      accessByCompany.set(currentCompanyId, access);
      allowedCompanyIds = [currentCompanyId];
    }

    allowedCompanyIds = [...new Set(allowedCompanyIds)];
    if (!allowedCompanyIds.length) return json({ error: 'Nenhuma empresa autorizada para esta conta.' }, 403);
    if (allowedCompanyIds.length > 60) return json({ error: 'Há empresas demais para esta exportação. Use um grupo menor.' }, 422);

    const { data: companies, error: companiesError } = await admin
      .from('fiscal_companies')
      .select('id,cnpj,razao_social,nome_fantasia,status')
      .in('id', allowedCompanyIds)
      .neq('status', 'inativa')
      .order('razao_social');
    if (companiesError) throw companiesError;
    if (!companies?.length) return json({ error: 'Nenhuma empresa fiscal encontrada' }, 404);

    const companyById = new Map(companies.map(company => [String(company.id), company]));

    // Use the same database source/window rules as the document screen.
    // This avoids drift between what the user sees and what the exporter counts.
    const needsXmlPayload = action === 'download' && ['bundle', 'pdf', 'xml'].includes(format);
    const { data: sourceRows, error: sourceError } = await admin.rpc('extractor_export_rows', {
      p_user_id: auth.user.id,
      p_company_ids: allowedCompanyIds,
      p_start: start,
      p_end: end,
      p_direction: direction,
      p_include_xml: needsXmlPayload,
    });
    if (sourceError) throw new Error(`export_source_unavailable: ${sourceError.message}`);

    let exportRows = Array.isArray(sourceRows) ? sourceRows : [];
    if (!exportRows.length) {
      // Safety fallback: use the already-authorized company list and the same Brazil-local
      // date window as the Documents screen. This prevents an empty preflight caused by
      // an RPC/cache mismatch from hiding documents that are already visible in the app.
      exportRows = await directExportRows(admin, allowedCompanyIds, accessByCompany, start, end, direction);
    }

    let documents = exportRows.map((row: any) => normalizeDocumentXml(row));
    if (type !== 'todos') documents = documents.filter(document => documentType(document) === type);

    const complete = action === 'preflight' || !needsXmlPayload
      ? documents.filter(document => document.full_xml === true)
      : documents.filter(validFullXml);
    const pending = action === 'preflight' || !needsXmlPayload
      ? documents.filter(document => document.full_xml !== true)
      : documents.filter(document => !validFullXml(document));
    const archiveLimit = 200;
    const requiresArchive = ['bundle', 'pdf', 'xml'].includes(format);
    const tooLarge = requiresArchive && complete.length > archiveLimit;
    const pendingDocuments = pending.slice(0, 100).map(document => {
      const company: any = companyById.get(String(document.company_id));
      return {
        company: company?.nome_fantasia || company?.razao_social || '',
        type: documentType(document).toUpperCase(),
        number: String(document.note_number || ''),
        series: String(document.series || ''),
        access_key: String(document.access_key || ''),
        issue_date: document.issue_date || null,
        reason: pendingReason(document),
      };
    });

    const report = {
      ok: true,
      total: documents.length,
      complete: complete.length,
      pending: pending.length,
      companies: new Set(documents.map(document => document.company_id)).size,
      archive_limit: archiveLimit,
      too_large: tooLarge,
      pending_documents: pendingDocuments,
      start,
      end,
      direction,
      document_type: type,
      format,
    };

    if (action === 'preflight') return json(report);
    if (!documents.length) return json({ error: 'Nenhum documento encontrado com os filtros informados', ...report }, 404);

    if (format === 'keys' || format === 'report') {
      const headers = format === 'keys'
        ? ['empresa', 'cnpj_empresa', 'tipo', 'numero', 'serie', 'emissao', 'operacao', 'situacao', 'chave']
        : ['empresa', 'cnpj_empresa', 'operacao', 'tipo', 'emissao', 'numero', 'serie', 'valor', 'emitente', 'cnpj_emitente', 'cnpj_destinatario', 'situacao', 'chave', 'xml_integral'];
      const lines = [headers.map(csvCell).join(';')];
      for (const document of documents) {
        const company: any = companyById.get(String(document.company_id));
        const common = {
          company: company?.nome_fantasia || company?.razao_social || '',
          companyCnpj: company?.cnpj || '',
          operation: document.direction === 'saida' ? 'Venda' : document.direction === 'entrada' ? 'Compra' : document.direction || '',
          type: documentType(document).toUpperCase(),
          status: document.status_text || document.status_code || '',
          key: document.access_key || '',
        };
        const values = format === 'keys'
          ? [common.company, common.companyCnpj, common.type, document.note_number || '', document.series || '', document.issue_date || '', common.operation, common.status, common.key]
          : [common.company, common.companyCnpj, common.operation, common.type, document.issue_date || '', document.note_number || '', document.series || '', Number(document.value || 0), document.issuer_name || '', document.issuer_cnpj || '', document.recipient_cnpj || '', common.status, common.key, validFullXml(document) ? 'SIM' : 'NÃO'];
        lines.push(values.map(csvCell).join(';'));
      }
      const filename = `${format === 'keys' ? 'chaves-fiscais' : 'relatorio-fiscal'}-${start}-a-${end}.csv`;
      return new Response('\ufeff' + lines.join('\n'), {
        status: 200,
        headers: {
          ...cors,
          'content-type': 'text/csv; charset=utf-8',
          'content-disposition': `attachment; filename="${filename}"`,
          'cache-control': 'no-store',
        },
      });
    }

    if (pending.length && !allowPartial) {
      return json({
        error: `${pending.length} documento(s) ainda não possuem arquivo integral. Você pode baixar agora os ${complete.length} documento(s) disponíveis.`,
        ...report,
      }, 409);
    }

    const archiveDocuments = allowPartial ? complete : documents;
    if (!archiveDocuments.length) {
      return json({ error: 'Nenhum documento íntegro está disponível para compor o pacote.', ...report }, 409);
    }
    if (archiveDocuments.length > archiveLimit) {
      return json({
        error: `O pacote tem ${archiveDocuments.length} documentos íntegros. O limite seguro por geração é ${archiveLimit}; reduza o período ou aplique filtros.`,
        ...report,
        too_large: true,
      }, 422);
    }

    const xmlSize = archiveDocuments.reduce((total, document) => total + String(document.xml || '').length, 0);
    if (xmlSize > 35_000_000) return json({ error: 'Os XMLs excedem o tamanho seguro do pacote. Reduza o período.', ...report }, 422);

    const zip = new JSZip();
    const manifest: any[] = [];
    for (let index = 0; index < archiveDocuments.length; index += 4) {
      const batch = archiveDocuments.slice(index, index + 4);
      const pdfBytes = format === 'xml'
        ? batch.map(() => null)
        : await Promise.all(batch.map(document => renderPdf(baseUrl, anon, authorization, document)));

      for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
        const document = batch[batchIndex];
        const company: any = companyById.get(String(document.company_id));
        const companyFolder = safeName(company?.nome_fantasia || company?.razao_social || document.company_id);
        const typeName = documentType(document) === 'nfce' ? 'NFCe' : documentType(document) === 'nfse' ? 'NFS-e' : 'NFe';
        const base = safeName(`${typeName}-${document.note_number || 'sem-numero'}-${document.access_key || document.nsu}`);
        const pdfPath = `${companyFolder}/PDF/${base}.pdf`;
        const xmlPath = `${companyFolder}/XML/${base}.xml`;

        if (format === 'bundle' || format === 'pdf') zip.file(pdfPath, pdfBytes[batchIndex]!);
        if (format === 'bundle' || format === 'xml') zip.file(xmlPath, String(document.xml || ''));

        manifest.push({
          company: company?.nome_fantasia || company?.razao_social || '',
          company_cnpj: company?.cnpj || '',
          access_key: document.access_key || null,
          note_number: document.note_number || null,
          series: document.series || null,
          type: typeName,
          direction: document.direction || null,
          issue_date: document.issue_date || null,
          value: Number(document.value || 0),
          status: document.status_text || document.status_code || null,
          pdf: format === 'bundle' || format === 'pdf' ? pdfPath : null,
          xml: format === 'bundle' || format === 'xml' ? xmlPath : null,
        });
      }
    }

    const conference = [
      ['empresa', 'cnpj_empresa', 'chave', 'nota', 'serie', 'tipo', 'direcao', 'emissao', 'valor', 'situacao', 'pdf', 'xml'].map(csvCell).join(';'),
      ...manifest.map(item => [item.company, item.company_cnpj, item.access_key, item.note_number, item.series, item.type, item.direction, item.issue_date, item.value, item.status, item.pdf, item.xml].map(csvCell).join(';')),
    ].join('\n');
    zip.file('CONFERENCIA.csv', '\ufeff' + conference);

    if (allowPartial && pending.length) {
      const pendingCsv = [
        ['empresa', 'tipo', 'nota', 'serie', 'emissao', 'chave', 'motivo'].map(csvCell).join(';'),
        ...pendingDocuments.map(item => [item.company, item.type, item.number, item.series, item.issue_date, item.access_key, item.reason].map(csvCell).join(';')),
      ].join('\n');
      zip.file('PENDENTES-NAO-INCLUIDOS.csv', '\ufeff' + pendingCsv);
    }

    zip.file('MANIFESTO.json', JSON.stringify({
      generated_at: new Date().toISOString(),
      partial: allowPartial && pending.length > 0,
      skipped_pending: allowPartial ? pending.length : 0,
      filters: { start, end, direction, document_type: type, format },
      documents: manifest,
    }, null, 2));

    const archive = await zip.generateAsync({
      type: 'arraybuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 },
    });
    const signature = new Uint8Array(archive, 0, Math.min(4, archive.byteLength));
    if (
      signature.length < 4 ||
      signature[0] !== 0x50 ||
      signature[1] !== 0x4b ||
      !((signature[2] === 0x03 && signature[3] === 0x04) ||
        (signature[2] === 0x05 && signature[3] === 0x06) ||
        (signature[2] === 0x07 && signature[3] === 0x08))
    ) {
      throw new Error('Falha interna ao finalizar a estrutura ZIP.');
    }

    const blob = new Blob([archive], { type: 'application/zip' });
    const filename = `documentos-fiscais-${format}-${start}-a-${end}${allowPartial && pending.length ? '-parcial' : ''}.zip`;
    return new Response(blob, {
      status: 200,
      headers: {
        ...cors,
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${filename}"`,
        'content-length': String(blob.size),
        'cache-control': 'no-store',
        'x-content-type-options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('extractor-fiscal-export', error);
    const raw = error instanceof Error ? error.message : String(error || '');
    const message = /export_source_unavailable/i.test(raw)
      ? 'Não foi possível ler os documentos fiscais para esta exportação. Tente novamente em alguns segundos.'
      : /document_access_unavailable/i.test(raw)
        ? 'Não foi possível validar o acesso às empresas selecionadas. Atualize a página e tente novamente.'
        : raw || 'Não foi possível preparar a exportação fiscal.';
    return json({ error: message }, 500);
  }
});
