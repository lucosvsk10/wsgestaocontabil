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

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  if (["subscription_preapproval", "preapproval"].includes(type)) {
    const providerResponse = await fetch(`https://api.mercadopago.com/preapproval/${encodeURIComponent(dataId)}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    const preapproval = await providerResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (providerResponse.status === 404) return json({ received: true, ignored: "subscription_not_found" });
    if (!providerResponse.ok) return json({ error: "provider_lookup_failed" }, 502);
    const subscriptionId = safeText(preapproval.external_reference, 64);
    if (!uuidPattern.test(subscriptionId)) return json({ received: true, ignored: "unlinked_subscription" });
    const startText = safeText(preapproval.date_created, 40);
    const endText = safeText(preapproval.next_payment_date, 40);
    const periodStart = startText && !Number.isNaN(Date.parse(startText)) ? new Date(startText).toISOString() : null;
    const periodEnd = endText && !Number.isNaN(Date.parse(endText)) ? new Date(endText).toISOString() : null;
    const { error } = await admin.rpc("sync_ws_subscription_access", {
      p_subscription_id: subscriptionId,
      p_provider_subscription_id: safeText(preapproval.id || dataId, 160),
      p_provider_status: safeText(preapproval.status, 60).toLowerCase(),
      p_period_start: periodStart,
      p_period_end: periodEnd,
    });
    if (error) return json({ error: "database_update_failed" }, 500);
    return json({ received: true, applied: true });
  }

  if (type && !["payment", "subscription_authorized_payment", "authorized_payment"].includes(type)) {
    return json({ received: true, ignored: "unsupported_type" });
  }
  if (!paymentIdPattern.test(dataId)) return json({ received: true, ignored: "invalid_payment_id" });

  let paymentLookupUrl = `https://api.mercadopago.com/v1/payments/${dataId}`;
  if (["subscription_authorized_payment", "authorized_payment"].includes(type)) {
    paymentLookupUrl = `https://api.mercadopago.com/authorized_payments/${dataId}`;
  }

  const providerResponse = await fetch(paymentLookupUrl, {
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

  let invoiceId = safeText(payment.external_reference, 64);
  const amountCents = cents(payment.transaction_amount);
  const currencyId = safeText(payment.currency_id, 3).toUpperCase();
  if (!uuidPattern.test(invoiceId) && safeText(payment.preapproval_id, 160)) {
    const { data: linkedSubscription } = await admin.from("saas_subscriptions").select("id").eq("provider", "mercado_pago").eq("provider_subscription_id", safeText(payment.preapproval_id, 160)).maybeSingle();
    invoiceId = linkedSubscription?.id || "";
  }
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

  const { data: directInvoice } = await admin.from("saas_invoices").select("id").eq("id", invoiceId).maybeSingle();
  let invoiceResolved = Boolean(directInvoice);
  if (!directInvoice) {
    const providerPaymentId = safeText(payment.id || dataId, 32);
    const { data: existingRenewal } = await admin.from("saas_invoices").select("id").eq("provider", "mercado_pago").eq("provider_payment_id", providerPaymentId).maybeSingle();
    if (existingRenewal) { invoiceId = existingRenewal.id; invoiceResolved = true; }
  }
  if (!invoiceResolved) {
    const { data: subscription } = await admin.from("saas_subscriptions")
      .select("id,organization_id,plan_id,saas_plans(name,price_cents)").eq("id", invoiceId).maybeSingle();
    if (!subscription) return json({ received: true, ignored: "unlinked_payment" });
    const planData = Array.isArray(subscription.saas_plans) ? subscription.saas_plans[0] : subscription.saas_plans;
    const start = new Date(); const end = new Date(start); end.setMonth(end.getMonth() + 1);
    const { data: renewalInvoice, error: renewalError } = await admin.from("saas_invoices").insert({
      organization_id: subscription.organization_id, subscription_id: subscription.id,
      description: `${planData?.name || "Plano WS"} — renovação mensal`,
      period_start: start.toISOString().slice(0, 10), period_end: end.toISOString().slice(0, 10),
      due_date: start.toISOString().slice(0, 10), subtotal_cents: amountCents, total_cents: amountCents,
      line_items: [{ plan_id: subscription.plan_id, quantity: 1, unit_price_cents: amountCents }],
      provider: "mercado_pago", provider_payment_id: safeText(payment.id || dataId, 32),
      metadata: { recurring: true },
    }).select("id").single();
    if (renewalError || !renewalInvoice) return json({ error: "renewal_invoice_failed" }, 500);
    invoiceId = renewalInvoice.id;
  }
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

  if (status === "approved") {
    const { error: accessError } = await admin.rpc("activate_ws_paid_invoice", { p_invoice_id: invoiceId });
    if (accessError) return json({ error: "access_update_failed" }, 500);
  }

  const appliedResult = Array.isArray(result) ? result[0] : result;
  const reason = safeText(appliedResult?.reason, 80) || "unknown";
  console.log("mp-webhook processed", { paymentId, invoiceId, status, reason, requestId: providerRequestId });
  return json({ received: true, applied: appliedResult?.applied === true, reason });
});
