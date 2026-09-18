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

const CONFIRMATION_HASH = '39f8ebd80ef2db96c4cc45e9094bd31b026cd1a426dc1c364360bf4254e8d422';

const clean = (value: unknown) => String(value ?? '').trim();

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return [...digest].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  try {
    const auth = req.headers.get('authorization');
    if (!auth) return json({ error: 'Não autenticado.' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } }
    );

    const { data: { user } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
    if (!user) return json({ error: 'Não autenticado.' }, 401);

    const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
    if (!roles?.some((row: any) => row.role === 'admin')) {
      return json({ error: 'Acesso exclusivo para administradores.' }, 403);
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const password = clean(body.password);
    if (!password) return json({ error: 'Informe a senha de confirmação.' }, 422);

    if (await sha256(password) !== CONFIRMATION_HASH) {
      return json({ error: 'Senha de confirmação incorreta.' }, 403);
    }

    return json({ ok: true });
  } catch (error) {
    console.error('admin-client-access-confirm', error);
    return json({ error: 'Não foi possível validar a confirmação.' }, 500);
  }
});