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
    if (complete) return J({ ok: true, ready: true, document: complete, source: 'stored_xml' });

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
