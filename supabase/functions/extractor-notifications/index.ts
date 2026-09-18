import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { consume, limited } from '../_shared/rate-limit.ts';
import { readJsonLimited } from '../_shared/request-guards.ts';

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

async function context(req: Request) {
  const authorization = req.headers.get('authorization') || '';
  if (!authorization) throw Object.assign(new Error('Não autenticado'), { status: 401 });
  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: auth } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
  const user = auth.user;
  if (!user) throw Object.assign(new Error('Não autenticado'), { status: 401 });

  const { data: memberships, error: memberError } = await admin
    .from('organization_members')
    .select('organization_id,status')
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (memberError) throw memberError;
  const orgs = [...new Set((memberships || []).map((row: any) => String(row.organization_id)).filter(Boolean))];
  if (!orgs.length) throw Object.assign(new Error('Conta do Extrator não encontrada'), { status: 403 });

  const { data: accounts, error: accountError } = await admin
    .from('extractor_accounts')
    .select('id,organization_id,status')
    .in('organization_id', orgs)
    .in('status', ['trialing','active','past_due'])
    .order('created_at');
  if (accountError) throw accountError;
  const account = (accounts || [])[0];
  if (!account) throw Object.assign(new Error('Extrator não habilitado para esta conta'), { status: 403 });

  return { admin, user, account };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);

  try {
    const ctx = await context(req);
    const body = await readJsonLimited(req, 16384);
    const action = String(body.action || 'list');
    const denied = limited(await consume(
      ctx.admin,
      action === 'list' ? 'extractor_notifications_read' : 'extractor_notifications_write',
      ctx.user.id,
      action === 'list' ? 120 : 60,
      600
    ));
    if (denied) return denied;

    const preferences = ctx.user.user_metadata?.notification_preferences || {};
    if (action === 'list') {
      if (preferences.fiscal_alerts === false) {
        return J({ ok: true, enabled: false, notifications: [] });
      }

      const since = new Date(Date.now() - 45 * 86400000).toISOString();
      const { data: rows, error } = await ctx.admin
        .from('extractor_import_notifications')
        .select('id,company_id,kind,title,message,metadata,created_at')
        .eq('account_id', ctx.account.id)
        .gte('created_at', since)
        .order('created_at', { ascending: false })
        .limit(30);
      if (error) throw error;

      const ids = (rows || []).map((row: any) => String(row.id));
      let stateRows: any[] = [];
      if (ids.length) {
        const { data, error: stateError } = await ctx.admin
          .from('extractor_notification_user_state')
          .select('notification_id,read_at,dismissed_at')
          .eq('user_id', ctx.user.id)
          .in('notification_id', ids);
        if (stateError) throw stateError;
        stateRows = data || [];
      }
      const state = new Map(stateRows.map((row: any) => [String(row.notification_id), row]));
      const visible = (rows || [])
        .filter((row: any) => {
          const item = state.get(String(row.id));
          return !item?.read_at && !item?.dismissed_at;
        })
        .slice(0, 10);

      return J({
        ok: true,
        enabled: true,
        notifications: visible,
      });
    }

    if (!['read', 'dismiss'].includes(action)) return J({ error: 'Ação inválida' }, 400);
    const notificationId = String(body.notification_id || '');
    if (!notificationId) return J({ error: 'Notificação inválida' }, 422);

    const { data: notification, error: notificationError } = await ctx.admin
      .from('extractor_import_notifications')
      .select('id')
      .eq('id', notificationId)
      .eq('account_id', ctx.account.id)
      .maybeSingle();
    if (notificationError) throw notificationError;
    if (!notification) return J({ error: 'Notificação não encontrada' }, 404);

    const now = new Date().toISOString();
    const patch = action === 'dismiss'
      ? { notification_id: notificationId, user_id: ctx.user.id, read_at: now, dismissed_at: now }
      : { notification_id: notificationId, user_id: ctx.user.id, read_at: now, dismissed_at: null };

    const { error: upsertError } = await ctx.admin
      .from('extractor_notification_user_state')
      .upsert(patch, { onConflict: 'notification_id,user_id' });
    if (upsertError) throw upsertError;

    return J({ ok: true });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return J(
      { error: status < 500 ? error.message : 'Não foi possível atualizar as notificações agora.' },
      status
    );
  }
});
