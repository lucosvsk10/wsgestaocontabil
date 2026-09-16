import { documentAccess, documentInWindow } from '../_shared/extractor-access.ts';
import { consume, limited } from '../_shared/rate-limit.ts';
import { readJsonLimited, RequestError } from '../_shared/request-guards.ts';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, 'content-type': 'application/json' },
  });
const E = new TextEncoder(),
  D = new TextDecoder(),
  B = (v: string) => Uint8Array.from(atob(v), c => c.charCodeAt(0));
const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const tag = (xml: string, n: string) =>
  xml
    .match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`, `i`))?.[1]
    ?.trim() || '';
const recoveryWindowStartMs = () => {
  const n = new Date();
  return Date.UTC(n.getUTCFullYear(), n.getUTCMonth() - 1, 1, 0, 0, 0, 0);
};
async function key() {
  const secret =
    Deno.env.get('ACCOUNTING_ENGINE_SESSION_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw new Error('secret_missing');
  const digest = await crypto.subtle.digest('SHA-256', E.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['decrypt']);
}
async function dec(cipher: string, iv: string) {
  return D.decode(
    await crypto.subtle.decrypt({ name: 'AES-GCM', iv: B(iv) }, await key(), B(cipher))
  );
}
function decodeEntities(v: string) {
  return v
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}
function validXml(v: unknown) {
  const xml = decodeEntities(String(v ?? '')).trim();
  return /<(?:\w+:)?(?:nfeProc|procNFe|NFe)\b/i.test(xml) && xml.length > 1000 ? xml : '';
}
function parseDownloadPayload(payload: unknown) {
  const text = String(payload ?? '');
  const direct = validXml(text);
  if (direct) return direct;
  if (/manifesta[cç][aã]o[^<]*(?:necess[aá]ria|obrigat[oó]ria|destinat[aá]rio)|ci[eê]ncia da opera[cç][aã]o/i.test(text))
    throw new Error('manifestation_required');
  if (/CNPJ base do certificado digital[^<]*difere/i.test(text) || /certificado digital[^<]*(?:não|nao)[^<]*(?:participa|envolvido|destinat)/i.test(text))
    throw new Error('certificate_not_involved');
  const candidates: string[] = [];
  const variable = text.match(/var\s+stringJson\s*=\s*(\{[\s\S]*?\})\s*;/);
  if (variable?.[1]) candidates.push(variable[1]);
  const quoted = text.match(/stringJson\s*[=:]\s*['"]([\s\S]*?)['"]\s*[;,]/i);
  if (quoted?.[1]) candidates.push(quoted[1].replace(/\\"/g, '"').replace(/\\n/g, ''));
  candidates.push(text.trim());
  for (const raw of candidates) {
    try {
      const data = JSON.parse(raw);
      for (const value of [data?.xml, data?.Xml, data?.XML, data?.conteudoXml, data?.documentoXml, data?.body]) {
        const xml = validXml(value);
        if (xml) return xml;
      }
    } catch {}
  }
  const embedded = text.match(/(?:"xml"|"Xml"|"XML"|"conteudoXml")\s*:\s*"((?:\\.|[^"\\])*)"/i);
  if (embedded?.[1]) {
    try {
      const xml = validXml(JSON.parse(`"${embedded[1]}"`));
      if (xml) return xml;
    } catch {}
  }
  throw new Error('xml_payload_not_found');
}
async function downloadXml(pfx: string, password: string, accessKey: string) {
  const r = await fetch('https://ws-svrs-consit.vercel.app/api/download', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      certificate_base64: pfx,
      certificate_password: password,
      access_key: accessKey,
    }),
    signal: AbortSignal.timeout(30000),
  });
  if (!r.ok) throw new Error(`bridge_http_${r.status}`);
  const o = (await r.json().catch(() => ({}))) as any;
  for (const value of [o?.xml, o?.body_text, o?.body, o?.data?.xml]) {
    if (!value) continue;
    try {
      return parseDownloadPayload(value);
    } catch (e) {
      const code = e instanceof Error ? e.message : String(e);
      if (code === 'manifestation_required' || code === 'certificate_not_involved') throw e;
    }
  }
  return parseDownloadPayload(JSON.stringify(o));
}

function pickBestDocument(rows: any[]) {
  return rows.find(r => r.full_xml && r.xml) ||
    rows.find(r => String(r.parse_error || '') === 'xml_requires_manifestation') ||
    rows.find(r => String(r.parse_error || '') === 'xml_retry:manifestation_sent') ||
    rows.find(r => r.document_kind === 'nfe') ||
    rows[0] || null;
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);
  try {
    const auth = req.headers.get('authorization') || '';
    if (!auth) return J({ error: 'Não autenticado' }, 401);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const {
      data: { user },
    } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
    if (!user) return J({ error: 'Não autenticado' }, 401);
    const denied = limited(await consume(admin, 'fiscal-document-recover', user.id, 30, 600));
    if (denied) return denied;
    const b = await readJsonLimited(req, 32768),
      cid = String(b.company_id || ''),
      accessKey = digits(b.access_key),
      nsu = String(b.nsu || '');
    if (!cid || (!accessKey && !nsu)) return J({ error: 'Documento inválido' }, 400);
    const access = await documentAccess(admin, user.id, cid);

    let documents: any[] = [];
    let error: any = null;
    if (accessKey) {
      const result = await admin
        .from('fiscal_dfe_documents')
        .select('*')
        .eq('company_id', cid)
        .eq('access_key', accessKey)
        .order('full_xml', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(20);
      documents = result.data || [];
      error = result.error;
    } else {
      const result = await admin
        .from('fiscal_dfe_documents')
        .select('*')
        .eq('company_id', cid)
        .eq('nsu', nsu)
        .order('full_xml', { ascending: false })
        .order('updated_at', { ascending: false })
        .limit(20);
      documents = result.data || [];
      error = result.error;
    }
    if (error) throw error;
    let doc = pickBestDocument(documents);
    if (!doc) return J({ error: 'Documento não encontrado' }, 404);
    if (!documentInWindow(doc, access)) return J({ error: 'Documento fora do período liberado para esta conta' }, 403);

    const complete = documents.find(r => r.full_xml && r.xml);
    if (complete) return J({ ok: true, ready: true, document: complete });

    const issueTs = doc.issue_date ? new Date(doc.issue_date).getTime() : NaN;
    if (!Number.isFinite(issueTs) || issueTs < recoveryWindowStartMs())
      return J(
        {
          ok: true,
          ready: false,
          retryable: false,
          reason: 'A recuperação automática obrigatória cobre o mês atual e o mês anterior.',
        },
        202
      );
    const model = String(
      doc.model ||
        (/^\d{44}$/.test(String(doc.access_key || '')) ? String(doc.access_key).slice(20, 22) : '')
    );
    if (!['55', '65'].includes(model) || !/^\d{44}$/.test(String(doc.access_key || '')))
      return J(
        {
          ok: true,
          ready: false,
          reason: 'Este documento não possui chave NF-e/NFC-e válida para recuperação automática.',
        },
        202
      );
    const { data: company } = await admin
      .from('fiscal_companies')
      .select('id,cnpj,razao_social,created_by')
      .eq('id', cid)
      .maybeSingle();
    if (!company) return J({ error: 'Empresa fiscal não encontrada' }, 404);

    const companyCnpj = digits(company.cnpj);
    const recipientDoc = documents.some(r =>
      digits(r.recipient_cnpj) === companyCnpj && digits(r.issuer_cnpj) !== companyCnpj
    );
    const manifestationAlreadySent = documents.some(r => String(r.parse_error || '') === 'xml_retry:manifestation_sent');
    const manifestationRequired = documents.some(r => String(r.parse_error || '') === 'xml_requires_manifestation');
    if (model === '55' && recipientDoc && manifestationRequired && !manifestationAlreadySent) {
      return J({
        ok: true,
        ready: false,
        retryable: false,
        requires_manifestation: true,
        reason: 'A SEFAZ exige manifestação do destinatário antes de liberar o XML integral desta NF-e.',
      }, 202);
    }

    const { data: cert } = await admin
      .from('fiscal_certificates')
      .select('certificate_ciphertext,certificate_iv,password_ciphertext,password_iv')
      .eq('company_id', cid)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!cert)
      return J(
        {
          ok: true,
          ready: false,
          reason: 'A empresa selecionada não possui certificado A1 ativo para recuperar o XML.',
        },
        202
      );
    const pfx = await dec(cert.certificate_ciphertext, cert.certificate_iv),
      password = await dec(cert.password_ciphertext, cert.password_iv),
      now = new Date().toISOString();
    try {
      const xml = await downloadXml(pfx, password, String(doc.access_key));
      const emit = tag(xml, 'emit'),
        dest = tag(xml, 'dest'),
        issue = tag(xml, 'dhEmi') || tag(xml, 'dEmi') || null,
        total = Number(tag(xml, 'vNF') || 0),
        nn = tag(xml, 'nNF') || doc.note_number,
        serie = tag(xml, 'serie') || doc.series,
        issuer = digits(tag(emit, 'CNPJ') || tag(emit, 'CPF')),
        issuerName = tag(emit, 'xNome'),
        recipient = digits(tag(dest, 'CNPJ') || tag(dest, 'CPF')),
        direction =
          issuer === companyCnpj ? 'saida' : recipient === companyCnpj ? 'entrada' : 'relacionada';
      const patch: any = {
        full_xml: true,
        xml,
        document_kind: 'nfe',
        schema_name: 'procNFe_v4.00',
        source: 'xml_recovery_direct',
        source_id: String(doc.access_key),
        parse_error: null,
        direction,
        updated_at: now,
      };
      if (issue) patch.issue_date = issue;
      if (total) patch.value = total;
      if (nn) patch.note_number = nn;
      if (serie) patch.series = serie;
      if (issuer) patch.issuer_cnpj = issuer;
      if (issuerName) patch.issuer_name = issuerName;
      if (recipient) patch.recipient_cnpj = recipient;
      const updateQuery = admin.from('fiscal_dfe_documents').update(patch).eq('company_id', cid);
      const { error: updateError } = accessKey
        ? await updateQuery.eq('access_key', accessKey).eq('full_xml', false)
        : await updateQuery.eq('id', doc.id);
      if (updateError) throw updateError;
    } catch (e) {
      const code = e instanceof Error ? e.message : String(e);
      const requiresManifestation = code === 'manifestation_required' || (code === 'certificate_not_involved' && recipientDoc),
        marker = requiresManifestation ? 'xml_requires_manifestation' : `xml_retry:${code}`;
      let updateQuery = admin
        .from('fiscal_dfe_documents')
        .update({ parse_error: marker, updated_at: now })
        .eq('company_id', cid);
      if (accessKey) updateQuery = updateQuery.eq('access_key', accessKey).eq('full_xml', false);
      else updateQuery = updateQuery.eq('id', doc.id);
      await updateQuery;
      const reason = requiresManifestation
        ? 'A SEFAZ exige manifestação do destinatário antes de liberar o XML integral desta NF-e.'
        : code === 'xml_not_returned'
          ? 'A fonte fiscal ainda não disponibilizou o XML integral para esta chave.'
          : `Não foi possível recuperar o XML agora (${code}).`;
      return J({ ok: true, ready: false, reason, retryable: !requiresManifestation, requires_manifestation: requiresManifestation }, 202);
    }

    const { data: latest, error: latestError } = await admin
      .from('fiscal_dfe_documents')
      .select('*')
      .eq('company_id', cid)
      .eq('access_key', String(doc.access_key))
      .eq('full_xml', true)
      .not('xml', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;
    doc = latest || doc;
    return J({ ok: true, ready: Boolean(doc?.full_xml && doc?.xml), document: doc });
  } catch (e) {
    return J(
      {
        error:
          e instanceof RequestError ? e.message : 'Não foi possível concluir a solicitação agora.',
      },
      e instanceof RequestError ? e.status : 500
    );
  }
});
