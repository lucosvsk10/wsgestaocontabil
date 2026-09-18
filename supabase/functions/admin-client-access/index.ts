import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const DEFAULT_CLIENT_PASSWORD = '5BWasgc1@';
const clean = (value: unknown) => String(value ?? '').trim();
const normalizeUsername = (value: unknown) => clean(value).toLowerCase();
const validUsername = (value: string) => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value);

async function context(req: Request) {
  const auth = req.headers.get('authorization');
  if (!auth) throw new Error('Não autenticado.');
  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!user) throw new Error('Não autenticado.');
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  if (!roles?.some((row: any) => row.role === 'admin')) throw new Error('Acesso exclusivo para administradores.');
  return { admin, user };
}

async function getPrimary(admin: any, companyId: string) {
  const { data: link, error: linkError } = await admin
    .from('company_user_links')
    .select('id,user_id,is_primary')
    .eq('company_id', companyId)
    .order('is_primary', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (linkError) throw linkError;
  if (!link?.user_id) return { link: null, profile: null };

  const { data: profile, error: profileError } = await admin
    .from('users')
    .select('id,email,name,username,must_change_password,password_changed_at')
    .eq('id', link.user_id)
    .maybeSingle();
  if (profileError) throw profileError;
  return { link, profile };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const { admin, user: actor } = await context(req);
    const body = await req.json().catch(() => ({})) as Record<string, any>;
    const action = clean(body.action || 'status');
    const companyId = clean(body.company_id);
    if (!companyId) return json({ error: 'Empresa não informada.' }, 422);

    const { data: company, error: companyError } = await admin
      .from('companies')
      .select('id,company_name,trade_name')
      .eq('id', companyId)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!company) return json({ error: 'Empresa não encontrada.' }, 404);

    const current = await getPrimary(admin, companyId);

    if (action === 'status') {
      return json({
        ok: true,
        access: current.profile ? {
          user_id: current.profile.id,
          username: current.profile.username,
          email: current.profile.email,
          must_change_password: current.profile.must_change_password,
          password_changed_at: current.profile.password_changed_at,
        } : null,
      });
    }

    if (action === 'create') {
      if (current.profile) return json({ error: 'Esta empresa já possui um usuário principal.' }, 409);
      const username = normalizeUsername(body.username);
      if (!validUsername(username)) {
        return json({ error: 'Usuário inválido. Use 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.' }, 422);
      }

      const { data: duplicate } = await admin.from('users').select('id').ilike('username', username).limit(1).maybeSingle();
      if (duplicate?.id) return json({ error: 'Esse nome de usuário já está em uso.' }, 409);

      const loginEmail = `${username}@acesso.wsgestaocontabil.com`;
      const name = clean(company.trade_name || company.company_name);
      const { data: authUser, error: authError } = await admin.auth.admin.createUser({
        email: loginEmail,
        password: DEFAULT_CLIENT_PASSWORD,
        email_confirm: true,
        user_metadata: { name, username, office_client: true },
      });
      if (authError || !authUser.user) throw authError || new Error('Não foi possível criar o acesso.');

      try {
        const { error: profileError } = await admin.from('users').insert({
          id: authUser.user.id,
          email: loginEmail,
          name,
          role: 'client',
          username,
          must_change_password: true,
          password_changed_at: null,
        });
        if (profileError) throw profileError;

        const { error: linkError } = await admin.from('company_user_links').insert({
          company_id: companyId,
          user_id: authUser.user.id,
          is_primary: true,
        });
        if (linkError) throw linkError;
      } catch (error) {
        await admin.auth.admin.deleteUser(authUser.user.id).catch(() => null);
        throw error;
      }

      await admin.from('saas_audit_logs').insert({
        actor_user_id: actor.id,
        action: 'office_client_access_created',
        resource_type: 'company',
        resource_id: companyId,
        is_sensitive: true,
        metadata: { username },
      }).catch(() => null);

      return json({
        ok: true,
        username,
        default_password: DEFAULT_CLIENT_PASSWORD,
        must_change_password: true,
      });
    }

    if (!current.profile?.id) return json({ error: 'Esta empresa ainda não possui usuário.' }, 404);

    if (action === 'update_username') {
      const confirmationPassword = clean(body.confirmation_password);
      if (confirmationPassword !== DEFAULT_CLIENT_PASSWORD) {
        return json({ error: 'Senha de confirmação inválida.' }, 403);
      }
      const username = normalizeUsername(body.username);
      if (!validUsername(username)) {
        return json({ error: 'Usuário inválido. Use 3 a 32 caracteres.' }, 422);
      }
      const { data: duplicate } = await admin
        .from('users')
        .select('id')
        .ilike('username', username)
        .neq('id', current.profile.id)
        .limit(1)
        .maybeSingle();
      if (duplicate?.id) return json({ error: 'Esse nome de usuário já está em uso.' }, 409);

      const loginEmail = `${username}@acesso.wsgestaocontabil.com`;
      const { error: authError } = await admin.auth.admin.updateUserById(current.profile.id, {
        email: loginEmail,
        user_metadata: {
          username,
          office_client: true,
          name: clean(company.trade_name || company.company_name),
        },
      });
      if (authError) throw authError;

      const { error: profileError } = await admin.from('users').update({
        username,
        email: loginEmail,
        updated_at: new Date().toISOString(),
      }).eq('id', current.profile.id);
      if (profileError) throw profileError;

      return json({ ok: true, username });
    }

    if (action === 'reset_password') {
      const confirmationPassword = clean(body.confirmation_password);
      if (confirmationPassword !== DEFAULT_CLIENT_PASSWORD) {
        return json({ error: 'Senha de confirmação inválida.' }, 403);
      }
      const { error: authError } = await admin.auth.admin.updateUserById(current.profile.id, {
        password: DEFAULT_CLIENT_PASSWORD,
      });
      if (authError) throw authError;

      const { error: profileError } = await admin.from('users').update({
        must_change_password: true,
        password_changed_at: null,
        updated_at: new Date().toISOString(),
      }).eq('id', current.profile.id);
      if (profileError) throw profileError;

      await admin.from('saas_audit_logs').insert({
        actor_user_id: actor.id,
        action: 'office_client_password_reset',
        resource_type: 'company',
        resource_id: companyId,
        is_sensitive: true,
        metadata: { user_id: current.profile.id },
      }).catch(() => null);

      return json({
        ok: true,
        default_password: DEFAULT_CLIENT_PASSWORD,
        must_change_password: true,
      });
    }

    return json({ error: 'Ação inválida.' }, 400);
  } catch (error: any) {
    console.error('admin-client-access', error);
    const message = error?.message || 'Falha ao gerenciar acesso.';
    const status = /Não autenticado/.test(message) ? 401 : /Acesso exclusivo/.test(message) ? 403 : 500;
    return json({ error: message }, status);
  }
});