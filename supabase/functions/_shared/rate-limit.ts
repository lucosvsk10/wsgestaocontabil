import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

type LimitResult = { allowed: boolean; remaining: number; retry_after_seconds: number };

export function client(): SupabaseClient {
  return createClient(
    Deno.env.get("SUPABASE_URL") || "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "",
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export function requestKey(req: Request, subject = ""): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "";
  const realIp = req.headers.get("x-real-ip")?.trim() || "";
  const ip = (forwarded || realIp || "unknown").slice(0, 128);
  return subject.slice(0, 256) + "|" + ip;
}

export async function consume(
  admin: SupabaseClient,
  scope: string,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<LimitResult> {
  const { data, error } = await admin.rpc("consume_rate_limit", {
    p_scope: scope,
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error || !data?.[0]) throw new Error("rate_limit_unavailable");
  return data[0] as LimitResult;
}

export function limited(result: LimitResult): Response | null {
  if (result.allowed) return null;
  return new Response(JSON.stringify({ error: "Muitas tentativas. Aguarde antes de tentar novamente." }), {
    status: 429,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Retry-After": String(Math.max(1, result.retry_after_seconds)),
    },
  });
}
