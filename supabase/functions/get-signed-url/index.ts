import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import { consume, limited, requestKey } from "../_shared/rate-limit.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
});
const allowedPath = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/[a-zA-Z0-9_./-]{1,500}$/i;
const blockedSecret = /\.(p12|pfx|pem|key|crt|cer)$/i;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  if (!String(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return json({ error: "Unsupported media type" }, 415);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL") || "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.slice(7));
    if (authError || !user) return json({ error: "Não autenticado" }, 401);

    const rate = await consume(admin, "document_download", requestKey(req, user.id), 60, 600);
    const blocked = limited(rate);
    if (blocked) return blocked;

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const bucket = String(body.bucket || "");
    const path = String(body.path || "");
    if (bucket !== "documents" || !allowedPath.test(path) || blockedSecret.test(path) || path.includes("..")) {
      return json({ error: "Documento inválido" }, 400);
    }

    const [{ data: roles }, { data: document, error: documentError }] = await Promise.all([
      admin.from("user_roles").select("role").eq("user_id", user.id),
      admin.from("documents").select("id,user_id,status,expires_at").eq("storage_key", path).maybeSingle(),
    ]);
    const isAdmin = roles?.some((row: { role: string }) => row.role === "admin") || false;
    const active = document && (document.status === null || document.status === "active");
    const unexpired = !document?.expires_at || new Date(document.expires_at).getTime() > Date.now();
    if (documentError || !document || (!isAdmin && (document.user_id !== user.id || !active || !unexpired))) {
      return json({ error: "Documento indisponível" }, 404);
    }

    const { data, error } = await admin.storage.from("documents").createSignedUrl(path, 300, {
      download: true,
    });
    if (error || !data?.signedUrl) return json({ error: "Documento indisponível" }, 404);
    return json({ success: true, signed_url: data.signedUrl });
  } catch (error) {
    console.error("get-signed-url", error instanceof Error ? error.message : "unknown");
    return json({ error: "Não foi possível liberar o documento" }, 500);
  }
});
