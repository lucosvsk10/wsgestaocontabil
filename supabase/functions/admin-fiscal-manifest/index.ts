import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { bounds, getInternalToken, manifestAndRecover } from "../admin-fiscal-health-v2/verify.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" },
});
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const base = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !service) return json({ error: "Configuração ausente" }, 500);
  const admin = createClient(base, service, { auth: { persistSession: false, autoRefreshToken: false } });
  try {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (!bearer) return json({ error: "Não autenticado" }, 401);
    const { data: auth } = await admin.auth.getUser(bearer);
    if (!auth.user) return json({ error: "Não autenticado" }, 401);
    const { data: role } = await admin.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Acesso exclusivo para administradores" }, 403);

    const body = await req.json().catch(() => ({})) as any;
    const companyId = String(body.company_id || "");
    const accessKey = digits(body.access_key);
    if (!companyId || accessKey.length !== 44) return json({ error: "Nota fiscal inválida" }, 400);

    const token = await getInternalToken(admin);
    if (!token) return json({ error: "Token interno indisponível" }, 500);
    const results = await manifestAndRecover(admin, base, token, companyId, bounds(), accessKey);
    const result = results[0] || null;
    if (!result) return json({ error: "Esta nota não possui manifestação pendente ou já foi regularizada." }, 409);
    if (result.status === "event_failed") return json({ ok: false, error: result.error || "A SEFAZ não aceitou a manifestação.", result }, 422);
    return json({ ok: true, result, registered: Boolean(result.registered), recovered: Boolean(result.recovered), pending_xml: result.status === "registered_pending_xml" });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
