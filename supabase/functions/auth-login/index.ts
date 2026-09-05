import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { client, consume, limited, requestKey } from "./_shared/rate-limit.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store", ...extra },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!String(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return json({ error: "Unsupported media type" }, 415);
  }

  try {
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const email = String(body.email || "").trim().toLowerCase().slice(0, 320);
    const password = String(body.password || "");
    if (!email || password.length < 1 || password.length > 1024) return json({ error: "Credenciais inválidas." }, 400);

    const admin = client();
    const ip = requestKey(req);
    const ipLimit = await consume(admin, "auth_login_ip", ip, 20, 600);
    const emailLimit = await consume(admin, "auth_login_email", email, 8, 900);
    const blocked = limited(ipLimit) || limited(emailLimit);
    if (blocked) return blocked;

    const auth = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_ANON_KEY") || "",
      { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
    );
    const { data, error } = await auth.auth.signInWithPassword({ email, password });
    if (error || !data.session || !data.user) return json({ error: "Credenciais inválidas." }, 401);
    return json({ session: data.session, user: data.user });
  } catch (error) {
    console.error("auth-login", error instanceof Error ? error.message : "unknown");
    return json({ error: "Não foi possível concluir o login." }, 500);
  }
});
