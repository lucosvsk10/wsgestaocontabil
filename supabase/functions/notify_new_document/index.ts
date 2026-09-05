import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
});

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const token = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
    if (!token) return json({ error: 'Não autenticado' }, 401);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return json({ error: 'Não autenticado' }, 401);

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const userId = String(body.user_id || '');
    const documentName = [...String(body.document_name || '')]
      .filter((character) => {
        const code = character.charCodeAt(0);
        return code > 31 && code !== 127;
      })
      .join('')
      .trim()
      .slice(0, 180);
    if (!userId || !documentName) return json({ error: 'Dados inválidos' }, 400);

    if (userId !== user.id) {
      const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
      if (!roles?.some((row: { role: string }) => row.role === 'admin')) return json({ error: 'Sem permissão' }, 403);
    }

    const { error } = await admin.from('notifications').insert({
      user_id: userId,
      message: `Novo documento enviado: ${documentName}`,
      type: 'Novo Documento',
    });
    if (error) throw error;

    return json({ success: true }, 201);
  } catch (error) {
    console.error('notify_new_document failed', error instanceof Error ? error.message : 'unknown');
    return json({ error: 'Internal server error' }, 500);
  }
});
