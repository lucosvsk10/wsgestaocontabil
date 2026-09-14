import { documentAccess } from '../_shared/extractor-access.ts';
import { consume, limited } from '../_shared/rate-limit.ts';
import {
  readJsonLimited,
  RequestError,
  safeCsvCell,
  validDateRange,
} from '../_shared/request-guards.ts';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import JSZip from 'npm:jszip@3.10.1';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Expose-Headers': 'Content-Disposition, X-WS-Documents, X-WS-Full, X-WS-Pending',
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, 'content-type': 'application/json' },
  });
const clean = (v: unknown) =>
  String(v ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
const safe = (v: unknown) =>
  clean(v)
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 90) || 'documento';
const csv = safeCsvCell;
function validFullXml(d: any) {
  const xml = String(d.xml || '').trim();
  if (!d.full_xml || xml.length < 100) return false;
  const kind = String(d.document_kind || '').toLowerCase(),
    key = String(d.access_key || '');
  if (kind === 'nfse' || /nfse/i.test(`${d.schema_name || ''} ${d.model || ''}`))
    return /<[^>]*NFSe\b|<[^>]*infNFSe\b/i.test(xml);
  if (!/<(?:\w+:)?NFe\b|<(?:\w+:)?nfeProc\b/i.test(xml)) return false;
  return !/^\d{44}$/.test(key) || xml.includes(key) || xml.includes(`NFe${key}`);
}
function toPreview(d: any) {
  return {
    nsu: d.nsu,
    schema: d.schema_name,
    source: d.source,
    documentKind: d.document_kind,
    fullXml: d.full_xml,
    direction: d.direction,
    accessKey: d.access_key,
    model: d.model,
    issueDate: d.issue_date,
    value: Number(d.value || 0),
    issuerCnpj: d.issuer_cnpj,
    issuerName: d.issuer_name,
    recipientCnpj: d.recipient_cnpj,
    number: d.note_number,
    series: d.series,
    statusCode: d.status_code,
    statusText: d.status_text,
    xml: d.xml,
    parseError: d.parse_error,
  };
}
async function renderPdf(baseUrl: string, anon: string, auth: string, d: any) {
  const r = await fetch(`${baseUrl}/functions/v1/dfe-danfe-pdf`, {
    method: 'POST',
    headers: { authorization: auth, apikey: anon, 'content-type': 'application/json' },
    body: JSON.stringify({ company_id: d.company_id, document: toPreview(d) }),
    signal: AbortSignal.timeout(30000),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j?.pdf_base64)
    throw new Error(
      `Falha ao gerar arquivo completo da nota ${d.note_number || d.access_key || ''}: ${j?.error || r.status}`
    );
  return {
    bytes: Uint8Array.from(atob(String(j.pdf_base64)), c => c.charCodeAt(0)),
    filename: String(j.filename || `${d.access_key || d.nsu}.pdf`),
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);
  try {
    const auth = req.headers.get('authorization') || '';
    if (!auth) return J({ error: 'Não autenticado' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!,
      service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const admin = createClient(url, service);
    const {
      data: { user },
    } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
    if (!user) return J({ error: 'Não autenticado' }, 401);
    const b = await readJsonLimited(req),
      cid = String(b.company_id || ''),
      start = String(b.start || ''),
      end = String(b.end || ''),
      direction = String(b.direction || 'todos');
    if (
      !cid ||
      !/^\d{4}-\d{2}-\d{2}$/.test(start) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(end) ||
      !validDateRange(start, end)
    )
      return J({ error: 'Período inválido' }, 400);
    const access = await documentAccess(admin, user.id, cid);
    const denied = limited(
      await consume(
        admin,
        'fiscal_bulk_' + (b.action === 'preflight' ? 'check' : 'zip'),
        user.id,
        b.action === 'preflight' ? 20 : 3,
        600
      )
    );
    if (denied) return denied;
    const { data: company } = await admin
      .from('fiscal_companies')
      .select('id,cnpj,razao_social')
      .eq('id', cid)
      .single();
    if (!company) return J({ error: 'Empresa não encontrada' }, 404);
    let q = admin
      .from('fiscal_dfe_documents')
      .select('*')
      .eq('company_id', cid)
      .neq('document_kind', 'evento')
      .gte('issue_date', `${access.from && access.from > start ? access.from : start}T00:00:00Z`)
      .lte('issue_date', `${end > access.to ? access.to : end}T23:59:59.999Z`)
      .order('issue_date', { ascending: true });
    if (direction === 'entrada' || direction === 'saida') q = q.eq('direction', direction);
    const { data: rows, error } = await q.limit(101);
    if (error) throw error;
    if ((rows?.length || 0) > 100)
      return J(
        {
          error: 'O pacote aceita até 100 registros por vez. Selecione um período menor.',
          code: 'BATCH_TOO_LARGE',
        },
        422
      );
    if ((rows || []).reduce((n, d) => n + String(d.xml || '').length, 0) > 15000000)
      return J(
        {
          error: 'Os arquivos excedem o tamanho seguro do pacote. Selecione um período menor.',
          code: 'BATCH_TOO_LARGE',
        },
        422
      );
    const map = new Map<string, any>();
    for (const d of rows || []) {
      const key = String(d.access_key || d.nsu || '');
      if (!key) continue;
      const prev = map.get(key);
      if (!prev || (validFullXml(d) && !validFullXml(prev))) map.set(key, d);
    }
    const docs = [...map.values()].sort((a, b) =>
      String(a.issue_date || '').localeCompare(String(b.issue_date || ''))
    );
    if (!docs.length)
      return J(
        { error: 'Nenhuma nota encontrada no período informado', code: 'NO_DOCUMENTS' },
        404
      );
    const complete = docs.filter(validFullXml),
      pending = docs.filter(d => !validFullXml(d));
    const pendingList = pending.map(d => ({
      access_key: d.access_key || null,
      note_number: d.note_number || null,
      series: d.series || null,
      model: d.model || null,
      direction: d.direction || null,
      status: d.status_text || d.status_code || null,
      reason: 'XML/documento fiscal integral ainda não recuperado',
    }));
    const report = {
      ok: true,
      total: docs.length,
      full: complete.length,
      pending: pending.length,
      summary: pending.length,
      ready: pending.length === 0,
      start,
      end,
      direction,
      pending_documents: pendingList,
    };
    if (String(b.action || '') === 'preflight') return J(report);
    if (pending.length)
      return J(
        {
          error: `Pacote ainda não está completo: ${pending.length} de ${docs.length} nota(s) aguardam o arquivo fiscal integral. Nenhum resumo será usado como substituto.`,
          code: 'COMPLETE_FILES_PENDING',
          ...report,
        },
        409
      );
    const zip = new JSZip(),
      manifest: any[] = [];
    for (let i = 0; i < docs.length; i += 6) {
      const batch = docs.slice(i, i + 6);
      const rendered = await Promise.all(batch.map(d => renderPdf(url, anon, auth, d)));
      for (let j = 0; j < batch.length; j++) {
        const d = batch[j],
          r = rendered[j],
          kind = String(d.document_kind || '').toLowerCase(),
          model = String(d.model || '');
        const type =
            kind === 'nfse' || /nfse/i.test(`${d.schema_name || ''} ${model}`)
              ? 'DANFSe'
              : model === '65'
                ? 'NFCe'
                : 'DANFE',
          base = safe(`${type}-${d.note_number || 'sem-numero'}-${d.access_key || d.nsu}`),
          pdfPath = `DOCUMENTOS/${type}/${base}.pdf`,
          xmlPath = `XML/${base}.xml`;
        zip.file(pdfPath, r.bytes);
        zip.file(xmlPath, String(d.xml));
        manifest.push({
          access_key: d.access_key || null,
          note_number: d.note_number || null,
          series: d.series || null,
          model: d.model || null,
          type,
          direction: d.direction || null,
          status: d.status_text || d.status_code || null,
          issue_date: d.issue_date || null,
          value: Number(d.value || 0),
          quality: 'completo_xml_oficial',
          pdf_file: pdfPath,
          xml_file: xmlPath,
        });
      }
    }
    const conf = [
      'chave;nota;serie;modelo;tipo;direcao;situacao;emissao;valor;qualidade;pdf;xml',
      ...manifest.map(m =>
        [
          m.access_key,
          m.note_number,
          m.series,
          m.model,
          m.type,
          m.direction,
          m.status,
          m.issue_date,
          m.value,
          m.quality,
          m.pdf_file,
          m.xml_file,
        ]
          .map(csv)
          .join(';')
      ),
    ].join('\n');
    zip.file('CONFERENCIA.csv', '\ufeff' + conf);
    zip.file(
      'MANIFESTO.json',
      JSON.stringify(
        {
          company: { id: company.id, cnpj: company.cnpj, name: company.razao_social },
          generated_at: new Date().toISOString(),
          period: { start, end, direction },
          total: docs.length,
          complete: docs.length,
          pending: 0,
          documents: manifest,
        },
        null,
        2
      )
    );
    zip.file(
      'LEIA-ME.txt',
      [
        `WS Gestão — pacote fiscal completo`,
        `Empresa: ${company.razao_social}`,
        `Período: ${start} a ${end}`,
        `Notas: ${docs.length}`,
        `Arquivos fiscais completos: ${docs.length}`,
        `Resumos usados como substituto: 0`,
        `Cada nota possui PDF fiscal correspondente ao modelo e XML integral armazenado.`,
      ].join('\n')
    );
    const bytes = await zip.generateAsync({
        type: 'uint8array',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      }),
      filename = `notas-completas-${safe(company.razao_social)}-${start}-a-${end}.zip`;
    return new Response(bytes, {
      status: 200,
      headers: {
        ...cors,
        'content-type': 'application/zip',
        'content-disposition': `attachment; filename=\"${filename}\"`,
        'x-ws-documents': String(docs.length),
        'x-ws-full': String(docs.length),
        'x-ws-pending': '0',
      },
    });
  } catch (e) {
    return J(
      {
        error:
          e instanceof RequestError
            ? e.message
            : 'Não foi possível concluir o pacote. Tente um período menor ou tente novamente.',
      },
      e instanceof RequestError ? e.status : 500
    );
  }
});
