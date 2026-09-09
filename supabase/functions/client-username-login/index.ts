import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders });

const normalizeUsername = (value: unknown) => String(value ?? "").trim().toLowerCase();

const sha256 = async (value: string) => {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });

  try {
    const body = await req.json().catch(() => ({}));
    const username = normalizeUsername(body?.username);
    const password = String(body?.password ?? "");

    if (!/^[a-z0-9][a-z0-9._-]{2,31}$/.test(username) || password.length < 1) {
      await new Promise((resolve) => setTimeout(resolve, 350));
      return json({ error: "Usuário ou senha inválidos." }, 401);
    }

    const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("cf-connecting-ip") || "unknown";
    const keyHash = await sha256(`${username}|${forwarded}`);
    const now = new Date();

    const { data: attempt } = await admin.from("client_login_attempts").select("attempts,window_started_at,locked_until").eq("key_hash", keyHash).maybeSingle();
    if (attempt?.locked_until && new Date(attempt.locked_until) > now) {
      return json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, 429);
    }

    const windowStart = attempt?.window_started_at ? new Date(attempt.window_started_at) : now;
    const windowExpired = now.getTime() - windowStart.getTime() > 15 * 60 * 1000;
    const attempts = windowExpired ? 0 : Number(attempt?.attempts || 0);

    if (attempts >= 8) {
      const lockedUntil = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
      await admin.from("client_login_attempts").upsert({ key_hash: keyHash, attempts, window_started_at: windowExpired ? now.toISOString() : windowStart.toISOString(), locked_until: lockedUntil, updated_at: now.toISOString() });
      return json({ error: "Muitas tentativas. Aguarde alguns minutos e tente novamente." }, 429);
    }

    const { data: portalUser } = await admin.from("users").select("id,email,role,username,must_change_password").ilike("username", username).eq("role", "client").maybeSingle();

    let allowed = false;
    if (portalUser?.id && portalUser?.email) {
      const { data: link } = await admin.from("company_user_links").select("id").eq("user_id", portalUser.id).limit(1).maybeSingle();
      allowed = Boolean(link?.id);
    }

    if (!portalUser?.email || !allowed) {
      await admin.from("client_login_attempts").upsert({ key_hash: keyHash, attempts: attempts + 1, window_started_at: windowExpired ? now.toISOString() : windowStart.toISOString(), locked_until: null, updated_at: now.toISOString() });
      await new Promise((resolve) => setTimeout(resolve, 350));
      return json({ error: "Usuário ou senha inválidos." }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: signInData, error: signInError } = await authClient.auth.signInWithPassword({ email: portalUser.email, password });

    if (signInError || !signInData.session || !signInData.user) {
      const nextAttempts = attempts + 1;
      await admin.from("client_login_attempts").upsert({ key_hash: keyHash, attempts: nextAttempts, window_started_at: windowExpired ? now.toISOString() : windowStart.toISOString(), locked_until: nextAttempts >= 8 ? new Date(now.getTime() + 15 * 60 * 1000).toISOString() : null, updated_at: now.toISOString() });
      await new Promise((resolve) => setTimeout(resolve, 350));
      return json({ error: "Usuário ou senha inválidos." }, 401);
    }

    await admin.from("client_login_attempts").delete().eq("key_hash", keyHash);

    return json({
      access_token: signInData.session.access_token,
      refresh_token: signInData.session.refresh_token,
      expires_in: signInData.session.expires_in,
      user: { id: signInData.user.id, username: portalUser.username, must_change_password: Boolean(portalUser.must_change_password) },
    });
  } catch (error) {
    console.error("[client-username-login]", error instanceof Error ? error.message : error);
    return json({ error: "Não foi possível concluir o acesso agora." }, 500);
  }
});
