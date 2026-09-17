import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import JSZip from 'npm:jszip@3.10.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'Content-Disposition',
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

const validFullXml = (document: any) => {
  const xml = String(document.xml || '').trim();
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

const toPreview = (document: any) => ({
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
  for (const row of rows) {
    const key = `${row.company_id}:${row.access_key || row.nsu || row.id}`;
    const previous = map.get(key);
    if (!previous || (validFullXml(row) && !validFullXml(previous))) map.set(key, row);
  }
  return [...map.values()].sort((a, b) => String(a.issue_date || '').localeCompare(String(b.issue_date || '')));
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
    const { data: role } = await admin.from('user_roles').select('role').eq('user_id', auth.user.id).eq('role', 'admin').maybeSingle();
    if (!role) return json({ error: 'Acesso exclusivo para administradores' }, 403);

    const body = await req.json().catch(() => ({})) as any;
    const action = String(body.action || 'preflight');
    const format = String(body.format || 'bundle');
    const start = String(body.start || '');
    const end = String(body.end || '');
    const direction = String(body.direction || 'todos');
    const type = String(body.document_type || 'todos');
    const allCompanies = body.all_companies === true;
    const currentCompanyId = String(body.company_id || '');
    if (!['preflight', 'download'].includes(action)) return json({ error: 'Ação inválida' }, 400);
    if (!['bundle', 'pdf', 'xml', 'keys', 'report'].includes(format)) return json({ error: 'Formato inválido' }, 400);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return json({ error: 'Período inválido' }, 400);
    if (!['todos', 'entrada', 'saida'].includes(direction)) return json({ error: 'Operação inválida' }, 400);
    if (!['todos', 'nfe', 'nfce', 'nfse'].includes(type)) return json({ error: 'Tipo de documento inválido' }, 400);

    let companiesQuery = admin.from('fiscal_companies').select('id,cnpj,razao_social,nome_fantasia,status').neq('status', 'inativa');
    if (!allCompanies) {
      if (!currentCompanyId) return json({ error: 'Empresa obrigatória' }, 400);
      companiesQuery = companiesQuery.eq('id', currentCompanyId);
    }
    const { data: companies, error: companiesError } = await companiesQuery.order('razao_social');
    if (companiesError) throw companiesError;
    if (!companies?.length) return json({ error: 'Nenhuma empresa fiscal encontrada' }, 404);
    if (companies.length > 60) return json({ error: 'Há empresas demais para esta exportação. Use um grupo menor.' }, 422);

    const companyById = new Map(companies.map(company => [String(company.id), company]));
    const rows: any[] = [];
    for (const company of companies) {
      const companyRows = await fetchPaged(() => {
        let query = admin
          .from('fiscal_dfe_documents')
          .select('id,company_id,nsu,schema_name,source,document_kind,full_xml,direction,access_key,model,issue_date,value,issuer_cnpj,issuer_name,recipient_cnpj,note_number,series,status_code,status_text,xml,parse_error')
          .eq('company_id', company.id)
          .neq('document_kind', 'evento')
          .gte('issue_date', `${start}T00:00:00Z`)
          .lte('issue_date', `${end}T23:59:59.999Z`)
          .order('issue_date', { ascending: true });
        if (direction === 'entrada' || direction === 'saida') query = query.eq('direction', direction);
        return query;
      });
      rows.push(...companyRows);
    }

    let documents = dedupe(rows);
    if (type !== 'todos') documents = documents.filter(document => documentType(document) === type);
    const complete = documents.filter(validFullXml);
    const pending = documents.filter(document => !validFullXml(document));
    const archiveLimit = 200;
    const tooLarge = ['bundle', 'pdf', 'xml'].includes(format) && documents.length > archiveLimit;
    const report = {
      ok: true,
      total: documents.length,
      complete: complete.length,
      pending: pending.length,
      companies: new Set(documents.map(document => document.company_id)).size,
      archive_limit: archiveLimit,
      too_large: tooLarge,
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
        },
      });
    }

    if (pending.length) return json({ error: `${pending.length} documento(s) ainda não possuem XML integral. O pacote oficial só é liberado quando todos estiverem completos.`, ...report }, 409);
    if (tooLarge) return json({ error: `O pacote tem ${documents.length} documentos. O limite seguro por geração é ${archiveLimit}; reduza o período ou aplique filtros.`, ...report }, 422);
    const xmlSize = documents.reduce((total, document) => total + String(document.xml || '').length, 0);
    if (xmlSize > 35_000_000) return json({ error: 'Os XMLs excedem o tamanho seguro do pacote. Reduza o período.' }, 422);

    const zip = new JSZip();
    const manifest: any[] = [];
    for (let index = 0; index < documents.length; index += 4) {
      const batch = documents.slice(index, index + 4);
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
    zip.file('MANIFESTO.json', JSON.stringify({ generated_at: new Date().toISOString(), filters: { start, end, direction, document_type: type, format }, documents: manifest }, null, 2));
    const bytes = await zip.generateAsync({ type: 'uint8array', compression: 'DEFLATE', compressionOptions: { level: 6 } });
    const filename = `documentos-fiscais-${format}-${start}-a-${end}.zip`;
    return new Response(bytes, {
      status: 200,
      headers: {
        ...cors,
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('admin-fiscal-export', error);
    return json({ error: error instanceof Error ? error.message : 'Não foi possível preparar a exportação fiscal.' }, 500);
  }
});
