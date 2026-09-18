import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { documentAccess, documentInWindow } from '../_shared/extractor-access.ts';
import { consume, limited } from '../_shared/rate-limit.ts';
import { readJsonLimited, RequestError } from '../_shared/request-guards.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization,apikey,content-type,x-client-info',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
};
const J = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
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
      if (typeof parsed?.xml === 'string' && parsed.xml.trim().startsWith('<')) {
        return parsed.xml.trim();
      }
    } catch {
      // Try isolated JSON string below.
    }
  }

  const xmlStringMatch = value.match(/["']xml["']\s*:\s*("(?:\\.|[^"\\])*")/i);
  if (xmlStringMatch?.[1]) {
    try {
      const parsed = JSON.parse(xmlStringMatch[1]);
      if (typeof parsed === 'string' && parsed.trim().startsWith('<')) return parsed.trim();
    } catch {
      // No usable embedded XML.
    }
  }

  return '';
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);

  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization) return J({ error: 'Não autenticado' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    const user = auth.user;
    if (!user) return J({ error: 'Não autenticado' }, 401);

    const denied = limited(await consume(admin, 'extractor_document_preview', user.id, 60, 600));
    if (denied) return denied;

    const body = await readJsonLimited(req, 32768);
    const companyId = String(body.company_id || '');
    const accessKey = digits(body.access_key);
    const nsu = String(body.nsu || '');
    if (!companyId || (!accessKey && !nsu)) return J({ error: 'Documento inválido' }, 400);

    const access = await documentAccess(admin, user.id, companyId);

    let query = admin
      .from('fiscal_dfe_documents')
      .select('*')
      .eq('company_id', companyId)
      .eq('full_xml', true)
      .not('xml', 'is', null)
      .order('updated_at', { ascending: false })
      .limit(10);

    query = accessKey ? query.eq('access_key', accessKey) : query.eq('nsu', nsu);
    const { data: completeRows, error: completeError } = await query;
    if (completeError) throw completeError;

    const complete = (completeRows || []).find((row: any) => documentInWindow(row, access));
    if (complete) {
      const xml = unwrapStoredFiscalXml(complete.xml);
      if (xml) {
        return J({
          ok: true,
          ready: true,
          document: { ...complete, xml, full_xml: true },
          source: 'stored_xml',
        });
      }
    }

    // Some outbound documents are persisted first in the dedicated sales table.
    // Use that official XML before attempting any network recovery.
    if (accessKey) {
      const [{ data: salesRows, error: salesError }, { data: company, error: companyError }] =
        await Promise.all([
          admin
            .from('fiscal_sales_documents')
            .select('id,company_id,model,access_key,document_number,series,issue_date,status,total_value,recipient_document,recipient_name,xml,source,updated_at')
            .eq('company_id', companyId)
            .eq('access_key', accessKey)
            .not('xml', 'is', null)
            .order('updated_at', { ascending: false })
            .limit(10),
          admin
            .from('fiscal_companies')
            .select('id,cnpj,razao_social,nome_fantasia')
            .eq('id', companyId)
            .maybeSingle(),
        ]);
      if (salesError) throw salesError;
      if (companyError) throw companyError;

      const sale = (salesRows || []).find((row: any) => documentInWindow(row, access));
      if (sale?.xml) {
        return J({
          ok: true,
          ready: true,
          source: 'sales_xml',
          document: {
            id: sale.id,
            company_id: companyId,
            nsu: null,
            schema_name: 'procNFe_v4.00',
            source: sale.source || 'fiscal_sales_documents',
            document_kind: 'nfe',
            full_xml: true,
            xml: unwrapStoredFiscalXml(sale.xml) || sale.xml,
            direction: 'saida',
            access_key: sale.access_key,
            model: sale.model || accessKey.slice(20, 22),
            issue_date: sale.issue_date,
            value: sale.total_value == null ? null : Number(sale.total_value),
            issuer_cnpj: company?.cnpj || null,
            issuer_name: company?.razao_social || company?.nome_fantasia || null,
            recipient_cnpj: sale.recipient_document || null,
            recipient_name: sale.recipient_name || null,
            note_number: sale.document_number || null,
            series: sale.series || null,
            status_code: /cancel/i.test(String(sale.status || '')) ? '101' : '100',
            status_text: sale.status || 'Autorizada',
            parse_error: null,
            received_at: sale.updated_at,
            updated_at: sale.updated_at,
          },
        });
      }
    }

    // No complete copy is stored yet. Reuse the existing recovery pipeline with
    // the same authenticated user, so manifestation/window rules stay identical.
    const response = await fetch(`${url}/functions/v1/fiscal-document-recover`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization,
        ...(anon ? { apikey: anon } : {}),
      },
      body: JSON.stringify({ company_id: companyId, access_key: accessKey || undefined, nsu: nsu || undefined }),
      signal: AbortSignal.timeout(45000),
    });
    const payload = await response.json().catch(() => ({}));
    return J(payload, response.status);
  } catch (error: any) {
    return J(
      {
        error: error instanceof RequestError
          ? error.message
          : Number(error?.status || 500) < 500
            ? error.message
            : 'Não foi possível abrir o documento agora.',
      },
      error instanceof RequestError ? error.status : Number(error?.status || 500)
    );
  }
});
