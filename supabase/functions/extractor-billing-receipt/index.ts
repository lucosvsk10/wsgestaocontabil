import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
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

const allowedTypes: Record<string, string> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

const safeName = (value: unknown) =>
  String(value || 'comprovante')
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);

  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization) return J({ error: 'Não autenticado' }, 401);

    const declared = Number(req.headers.get('content-length') || 0);
    if (declared > 8_000_000) return J({ error: 'O comprovante deve ter no máximo 5 MB.' }, 413);

    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: auth } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    const user = auth.user;
    if (!user) return J({ error: 'Não autenticado' }, 401);

    const denied = limited(await consume(admin, 'extractor_billing_receipt_upload', user.id, 10, 600));
    if (denied) return denied;

    const body = await req.json().catch(() => ({})) as any;
    const invoiceId = String(body.invoice_id || '');
    const filename = safeName(body.filename);
    const contentType = String(body.content_type || '').toLowerCase();
    const base64 = String(body.base64 || '').replace(/^data:[^;]+;base64,/, '');

    if (!invoiceId || !filename || !allowedTypes[contentType] || !base64) {
      return J({ error: 'Envie um PDF, PNG, JPG ou WEBP válido.' }, 422);
    }

    let bytes: Uint8Array;
    try {
      bytes = Uint8Array.from(atob(base64), char => char.charCodeAt(0));
    } catch {
      return J({ error: 'Não foi possível ler o arquivo enviado.' }, 422);
    }
    if (!bytes.length || bytes.length > 5 * 1024 * 1024) {
      return J({ error: 'O comprovante deve ter no máximo 5 MB.' }, 413);
    }

    const { data: memberships, error: membershipsError } = await admin
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', user.id)
      .eq('status', 'active');
    if (membershipsError) throw membershipsError;
    const orgIds = [...new Set((memberships || []).map((row: any) => String(row.organization_id)).filter(Boolean))];
    if (!orgIds.length) return J({ error: 'Conta sem organização vinculada.' }, 403);

    const { data: invoice, error: invoiceError } = await admin
      .from('saas_invoices')
      .select('id,organization_id,metadata,status')
      .eq('id', invoiceId)
      .in('organization_id', orgIds)
      .maybeSingle();
    if (invoiceError) throw invoiceError;
    if (!invoice) return J({ error: 'Fatura não encontrada para esta conta.' }, 404);

    const organizationId = String(invoice.organization_id);
    const ext = allowedTypes[contentType];
    const path = `${organizationId}/billing/${invoiceId}/manual-receipt-${Date.now()}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from('saas-private')
      .upload(path, bytes, { contentType, upsert: false, cacheControl: '3600' });
    if (uploadError) throw uploadError;

    const previousMeta =
      invoice.metadata && typeof invoice.metadata === 'object'
        ? invoice.metadata as Record<string, any>
        : {};
    const previousManual =
      previousMeta.manual_receipt && typeof previousMeta.manual_receipt === 'object'
        ? previousMeta.manual_receipt as Record<string, any>
        : null;

    const manualReceipt = {
      path,
      filename,
      content_type: contentType,
      size: bytes.length,
      uploaded_at: new Date().toISOString(),
      uploaded_by: user.id,
      source: 'user_upload',
      label: 'Documento de apoio enviado pelo usuário',
    };

    const { error: updateError } = await admin
      .from('saas_invoices')
      .update({
        metadata: { ...previousMeta, manual_receipt: manualReceipt },
        updated_at: new Date().toISOString(),
      })
      .eq('id', invoiceId)
      .eq('organization_id', organizationId);

    if (updateError) {
      await admin.storage.from('saas-private').remove([path]).catch(() => {});
      throw updateError;
    }

    if (previousManual?.path && previousManual.path !== path) {
      const previousPath = String(previousManual.path);
      if (previousPath.startsWith(`${organizationId}/billing/${invoiceId}/`)) {
        await admin.storage.from('saas-private').remove([previousPath]).catch(() => {});
      }
    }

    const { data: signed, error: signedError } = await admin.storage
      .from('saas-private')
      .createSignedUrl(path, 900);
    if (signedError) throw signedError;

    return J({
      ok: true,
      receipt: {
        ...manualReceipt,
        url: signed?.signedUrl || '',
      },
    });
  } catch (error: any) {
    console.error('extractor-billing-receipt', error);
    return J({ error: 'Não foi possível armazenar o comprovante agora.' }, 500);
  }
});
