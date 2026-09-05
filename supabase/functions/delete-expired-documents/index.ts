import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  try {
    const providedInternalToken = req.headers.get('x-internal-token') || '';
    const { data: internalTokenRow } = await admin
      .from('_fiscal_sales_debug_token')
      .select('token')
      .eq('id', true)
      .maybeSingle();
    let authorized = Boolean(providedInternalToken && providedInternalToken === String(internalTokenRow?.token || ''));

    if (!authorized) {
      const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
      const { data: { user } } = bearer ? await admin.auth.getUser(bearer) : { data: { user: null } };
      if (user) {
        const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
        authorized = Boolean(roles?.some((row: { role: string }) => row.role === 'admin'));
      }
    }
    if (!authorized) return json({ error: 'Sem permissão' }, 403);

    const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const { data: expiredDocs, error: fetchError } = await admin
      .from('documents')
      .select('id,storage_key')
      .lt('expires_at', cutoff)
      .not('expires_at', 'is', null)
      .limit(1000);
    if (fetchError) throw fetchError;

    const rows = expiredDocs || [];
    const storageKeys = rows.flatMap((doc: { storage_key: string | null }) => doc.storage_key ? [doc.storage_key] : []);
    if (storageKeys.length) {
      const { error: storageError } = await admin.storage.from('documents').remove(storageKeys);
      if (storageError) throw storageError;
    }
    if (rows.length) {
      const { error: deleteError } = await admin.from('documents').delete().in('id', rows.map((doc: { id: string }) => doc.id));
      if (deleteError) throw deleteError;
    }

    return json({ success: true, deleted: rows.length });
  } catch (error) {
    console.error('delete-expired-documents failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Internal server error' }, 500);
  }
});
