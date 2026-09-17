import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { documentAccess, documentInWindow } from "../_shared/extractor-access.ts";
import { consume, limited } from "../_shared/rate-limit.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" },
});
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function internalCall(base: string, name: string, token: string, body: any, timeout = 70000) {
  const response = await fetch(`${base}/functions/v1/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-debug-token": token },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const payload = await response.json().catch(() => ({})) as any;
  return { ok: response.ok, status: response.status, payload };
}

async function isXmlReady(admin: any, companyId: string, accessKey: string) {
  const { data, error } = await admin.from("fiscal_dfe_documents")
    .select("id")
    .eq("company_id", companyId)
    .eq("access_key", accessKey)
    .eq("full_xml", true)
    .not("xml", "is", null)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return Boolean(data);
}

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
    const body = await req.json().catch(() => ({})) as any;
    const companyId = String(body.company_id || "");
    const accessKey = digits(body.access_key);
    if (!companyId || accessKey.length !== 44) return json({ error: "Nota fiscal inválida" }, 400);
    if (body.confirm !== true) return json({ error: "Confirmação explícita necessária para registrar a manifestação." }, 409);

    const access = await documentAccess(admin, auth.user.id, companyId);
    const denied = limited(await consume(admin, "extractor_manifest", auth.user.id, 8, 600));
    if (denied) return denied;

    const { data: rows, error: rowsError } = await admin.from("fiscal_dfe_documents")
      .select("id,full_xml,xml,parse_error,direction,issue_date")
      .eq("company_id", companyId)
      .eq("access_key", accessKey)
      .order("full_xml", { ascending: false })
      .limit(20);
    if (rowsError) throw rowsError;
    if (!(rows || []).length) return json({ error: "Nota fiscal não encontrada" }, 404);
    const visible = (rows || []).find((row: any) => documentInWindow(row, access));
    if (!visible) return json({ error: "Documento fora do período liberado para esta conta" }, 403);
    if ((rows || []).some((row: any) => row.full_xml && row.xml)) return json({ ok: true, registered: true, recovered: true, result: { status: "already_complete" } });
    if (!(rows || []).some((row: any) => row.direction === "entrada")) return json({ error: "A manifestação só pode ser feita para uma nota recebida." }, 422);
    const pending = (rows || []).some((row: any) => String(row.parse_error || "") === "xml_requires_manifestation");
    const alreadyRegistered = (rows || []).some((row: any) => String(row.parse_error || "") === "xml_retry:manifestation_sent");
    if (!pending && !alreadyRegistered) return json({ error: "Esta nota não possui manifestação pendente." }, 409);

    const { data: tokenRow } = await admin.from("_fiscal_sales_debug_token").select("token").eq("id", true).maybeSingle();
    const token = String(tokenRow?.token || "");
    if (!token) return json({ error: "Token interno indisponível" }, 500);

    let eventPayload: any = { ok: true, registered: true, already_registered: true };
    if (!alreadyRegistered) {
      const event = await internalCall(base, "fiscal-purchases-manifest", token, {
        action: "event",
        confirm: true,
        company_id: companyId,
        access_key: accessKey,
      });
      eventPayload = event.payload;
      if (!event.ok || (!event.payload?.registered && !event.payload?.already_complete && !event.payload?.ok)) {
        const reason = event.payload?.bridge?.xMotivo || event.payload?.xMotivo || event.payload?.error || `HTTP ${event.status}`;
        return json({ ok: false, error: `A SEFAZ não confirmou a manifestação: ${reason}`, result: { status: "event_failed", event: event.payload } }, 422);
      }
    }

    let recovered = await isXmlReady(admin, companyId, accessKey);
    let lastBackfill: any = null;
    let recoveryAttempts = 0;
    for (const delay of [1200, 3000, 6000]) {
      if (recovered) break;
      await sleep(delay);
      recoveryAttempts += 1;
      const backfill = await internalCall(base, "fiscal-purchases-xml-backfill", token, { company_id: companyId, access_key: accessKey, batch: 1 });
      lastBackfill = backfill.payload;
      recovered = await isXmlReady(admin, companyId, accessKey);
    }

    return json({
      ok: true,
      registered: true,
      recovered,
      pending_xml: !recovered,
      result: {
        status: recovered ? "recovered" : "registered_pending_xml",
        event: eventPayload,
        recovery_attempts: recoveryAttempts,
        backfill: lastBackfill,
        message: recovered
          ? "Manifestação registrada e XML integral recuperado."
          : "Manifestação registrada. A SEFAZ ainda não liberou o XML; a recuperação automática continuará tentando.",
      },
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
