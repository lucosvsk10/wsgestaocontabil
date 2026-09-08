import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const paymentIdPattern = /^[0-9]{1,32}$/;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
  });

const parseSignature = (header: string) => {
  const values = new Map<string, string>();
  for (const part of header.split(",")) {
    const separator = part.indexOf("=");
    if (separator <= 0) continue;
    values.set(part.slice(0, separator).trim(), part.slice(separator + 1).trim());
  }
  return { ts: values.get("ts") || "", signature: values.get("v1") || "" };
};

const bytesToHex = (bytes: ArrayBuffer) =>
  Array.from(new Uint8Array(bytes), (byte) => byte.toString(16).padStart(2, "0")).join("");

const constantTimeEqual = (left: string, right: string) => {
  if (!/^[a-f0-9]{64}$/i.test(left) || !/^[a-f0-9]{64}$/i.test(right)) return false;
  const a = new TextEncoder().encode(left.toLowerCase());
  const b = new TextEncoder().encode(right.toLowerCase());
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
};

async function signatureIsValid({
  xSignature,
  xRequestId,
  dataId,
  secret,
}: {
  xSignature: string;
  xRequestId: string;
  dataId: string;
  secret: string;
}) {
  const { ts, signature } = parseSignature(xSignature);
  if (!/^\d{10,16}$/.test(ts) || !signature) return false;

  const normalizedDataId = dataId.trim().toLowerCase();
  const manifest = [
    normalizedDataId ? `id:${normalizedDataId};` : "",
    xRequestId ? `request-id:${xRequestId};` : "",
    `ts:${ts};`,
  ].join("");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(manifest));
  return constantTimeEqual(bytesToHex(digest), signature);
}

const cents = (value: unknown) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount < 0) return null;
  const result = Math.round(amount * 100);
  return Number.isSafeInteger(result) ? result : null;
};

const safeText = (value: unknown, maxLength: number) => String(value ?? "").trim().slice(0, maxLength);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (Number(req.headers.get("content-length") || "0") > 65_536) return json({ error: "payload_too_large" }, 413);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";
  const webhookSecret = Deno.env.get("MERCADO_PAGO_WEBHOOK_SECRET") || "";
  if (!supabaseUrl || !serviceRoleKey || !accessToken || !webhookSecret) {
    console.error("mp-webhook missing server configuration");
    return json({ error: "service_unavailable" }, 503);
  }

  const requestUrl = new URL(req.url);
  const body = await req.json().catch(() => ({})) as Record<string, unknown>;
  const bodyData = body.data && typeof body.data === "object" ? body.data as Record<string, unknown> : {};
  const dataId = safeText(
    requestUrl.searchParams.get("data.id") || requestUrl.searchParams.get("data_id") || bodyData.id,
    64,
  );
  const type = safeText(requestUrl.searchParams.get("type") || body.type, 60).toLowerCase();
  const xSignature = req.headers.get("x-signature") || "";
  const xRequestId = safeText(req.headers.get("x-request-id"), 160);

  if (!dataId || !xSignature || !xRequestId) return json({ error: "invalid_notification" }, 400);

  let validSignature = false;
  try {
    validSignature = await signatureIsValid({ xSignature, xRequestId, dataId, secret: webhookSecret });
  } catch {
    validSignature = false;
  }
  if (!validSignature) {
    console.warn("mp-webhook rejected signature", { requestId: xRequestId });
    return json({ error: "invalid_signature" }, 401);
  }

  if (type && type !== "payment") return json({ received: true, ignored: "unsupported_type" });
  if (!paymentIdPattern.test(dataId)) return json({ received: true, ignored: "invalid_payment_id" });

  const providerResponse = await fetch(`https://api.mercadopago.com/v1/payments/${dataId}`, {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  const providerRequestId = providerResponse.headers.get("x-request-id") || xRequestId;
  const payment = await providerResponse.json().catch(() => ({})) as Record<string, unknown>;

  if (providerResponse.status === 404) return json({ received: true, ignored: "payment_not_found" });
  if (!providerResponse.ok) {
    console.error("mp-webhook payment lookup failed", {
      paymentId: dataId,
      status: providerResponse.status,
      requestId: providerRequestId,
    });
    return json({ error: "provider_lookup_failed" }, 502);
  }

  const invoiceId = safeText(payment.external_reference, 64);
  const amountCents = cents(payment.transaction_amount);
  const currencyId = safeText(payment.currency_id, 3).toUpperCase();
  if (!uuidPattern.test(invoiceId) || amountCents === null) {
    console.warn("mp-webhook ignored unlinked payment", { paymentId: dataId, requestId: providerRequestId });
    return json({ received: true, ignored: "unlinked_payment" });
  }

  const eventId = safeText(
    body.id || `${safeText(body.action, 80)}:${dataId}:${safeText(body.date_created, 40) || xRequestId}`,
    240,
  );
  const paymentId = safeText(payment.id || dataId, 32);
  const status = safeText(payment.status, 60).toLowerCase();
  const statusDetail = safeText(payment.status_detail, 120).toLowerCase();
  const paymentType = safeText(payment.payment_type_id, 60).toLowerCase();
  const paymentMethodId = safeText(payment.payment_method_id, 80).toLowerCase();
  const action = safeText(body.action, 120).toLowerCase();
  const dateApproved = safeText(payment.date_approved, 40);
  const paidAt = dateApproved && !Number.isNaN(new Date(dateApproved).getTime()) ? new Date(dateApproved).toISOString() : null;

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: result, error } = await admin.rpc("apply_mercado_pago_payment_event", {
    p_provider_event_id: eventId,
    p_provider_payment_id: paymentId,
    p_invoice_id: invoiceId,
    p_action: action,
    p_payment_status: status,
    p_status_detail: statusDetail,
    p_amount_cents: amountCents,
    p_currency_id: currencyId,
    p_payment_type: paymentType,
    p_payment_method_id: paymentMethodId,
    p_live_mode: payment.live_mode === true,
    p_request_id: providerRequestId,
    p_paid_at: paidAt,
  });

  if (error) {
    console.error("mp-webhook database error", { paymentId, requestId: providerRequestId, code: error.code });
    return json({ error: "database_update_failed" }, 500);
  }

  const appliedResult = Array.isArray(result) ? result[0] : result;
  const reason = safeText(appliedResult?.reason, 80) || "unknown";
  console.log("mp-webhook processed", { paymentId, invoiceId, status, reason, requestId: providerRequestId });
  return json({ received: true, applied: appliedResult?.applied === true, reason });
});
