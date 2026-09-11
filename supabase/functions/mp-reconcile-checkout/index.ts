import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const paymentIdPattern = /^\d{1,32}$/;
const safeText = (value: unknown, max: number) => String(value ?? "").trim().slice(0, max);
const toCents = (value: unknown) => {
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? Math.round(amount * 100) : null;
};
const validDate = (value: unknown) => {
  const text = safeText(value, 40);
  return text && !Number.isNaN(Date.parse(text)) ? new Date(text).toISOString() : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  if (Number(req.headers.get("content-length") || 0) > 4096) return json({ error: "payload_too_large" }, 413);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";
  const authorization = req.headers.get("Authorization") || "";
  if (!supabaseUrl || !anonKey || !serviceKey || !accessToken) return json({ error: "service_unavailable" }, 503);
  if (!authorization.startsWith("Bearer ")) return json({ error: "invalid_session" }, 401);

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data: auth } = await userClient.auth.getUser(authorization.slice(7));
  if (!auth.user?.id) return json({ error: "invalid_session" }, 401);

  const input = await req.json().catch(() => ({})) as Record<string, unknown>;
  const product = input.product === "extractor" ? "extractor" : input.product === "issuer" ? "issuer" : "";
  const paymentId = safeText(input.paymentId, 32);
  const requestedPreapprovalId = safeText(input.preapprovalId, 160);
  if (!product) return json({ error: "invalid_product" }, 400);
  if (paymentId && !paymentIdPattern.test(paymentId)) return json({ error: "invalid_payment" }, 400);

  const { data: memberships, error: membershipError } = await admin
    .from("organization_members")
    .select("organization_id")
    .eq("user_id", auth.user.id)
    .eq("status", "active");
  if (membershipError || !memberships?.length) return json({ confirmed: false, reason: "organization_not_found" });
  const organizationIds = memberships.map((row) => row.organization_id);

  if (paymentId) {
    const providerResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
    });
    const payment = await providerResponse.json().catch(() => ({})) as Record<string, unknown>;
    if (providerResponse.status === 404) return json({ confirmed: false, reason: "payment_not_found" });
    if (!providerResponse.ok) return json({ error: "provider_lookup_failed" }, 502);

    const invoiceId = safeText(payment.external_reference, 64);
    if (!uuidPattern.test(invoiceId)) return json({ error: "unlinked_payment" }, 403);
    const { data: invoice } = await admin
      .from("saas_invoices")
      .select("id,organization_id,subscription_id,total_cents,saas_subscriptions(product_code)")
      .eq("id", invoiceId)
      .in("organization_id", organizationIds)
      .maybeSingle();
    const linkedSubscription = Array.isArray(invoice?.saas_subscriptions)
      ? invoice?.saas_subscriptions[0]
      : invoice?.saas_subscriptions;
    if (!invoice || linkedSubscription?.product_code !== product) return json({ error: "payment_not_owned" }, 403);

    const amountCents = toCents(payment.transaction_amount);
    const currency = safeText(payment.currency_id, 3).toUpperCase();
    if (amountCents !== Number(invoice.total_cents) || currency !== "BRL") return json({ error: "payment_mismatch" }, 409);
    const providerStatus = safeText(payment.status, 60).toLowerCase();
    const updatedAt = safeText(payment.date_last_updated || payment.date_created, 40);
    const { error: applyError } = await admin.rpc("apply_mercado_pago_payment_event", {
      p_provider_event_id: `reconcile:${paymentId}:${providerStatus}:${updatedAt}`.slice(0, 240),
      p_provider_payment_id: paymentId,
      p_invoice_id: invoice.id,
      p_action: "payment.reconciled",
      p_payment_status: providerStatus,
      p_status_detail: safeText(payment.status_detail, 120).toLowerCase(),
      p_amount_cents: amountCents,
      p_currency_id: currency,
      p_payment_type: safeText(payment.payment_type_id, 60).toLowerCase(),
      p_payment_method_id: safeText(payment.payment_method_id, 80).toLowerCase(),
      p_live_mode: payment.live_mode === true,
      p_request_id: safeText(providerResponse.headers.get("x-request-id"), 160),
      p_paid_at: validDate(payment.date_approved),
    });
    if (applyError) return json({ error: "database_update_failed" }, 500);
    if (providerStatus === "approved") {
      const { error: accessError } = await admin.rpc("activate_ws_paid_invoice", { p_invoice_id: invoice.id });
      if (accessError) return json({ error: "access_update_failed" }, 500);
    }
    return json({ confirmed: providerStatus === "approved", status: providerStatus });
  }

  let subscriptionQuery = admin
    .from("saas_subscriptions")
    .select("id,organization_id,provider_subscription_id,status,metadata")
    .in("organization_id", organizationIds)
    .eq("product_code", product)
    .in("status", ["incomplete", "trialing", "active", "past_due"])
    .not("provider_subscription_id", "is", null)
    .order("created_at", { ascending: false })
    .limit(1);
  if (requestedPreapprovalId) subscriptionQuery = subscriptionQuery.eq("provider_subscription_id", requestedPreapprovalId);
  const { data: subscriptions } = await subscriptionQuery;
  const subscription = subscriptions?.[0];
  if (!subscription?.provider_subscription_id) return json({ confirmed: false, reason: "subscription_not_found" });

  const providerResponse = await fetch(
    `https://api.mercadopago.com/preapproval/${encodeURIComponent(subscription.provider_subscription_id)}`,
    { headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" } },
  );
  const preapproval = await providerResponse.json().catch(() => ({})) as Record<string, unknown>;
  if (providerResponse.status === 404) return json({ confirmed: false, reason: "subscription_not_found" });
  if (!providerResponse.ok) return json({ error: "provider_lookup_failed" }, 502);
  if (safeText(preapproval.external_reference, 64) !== subscription.id) return json({ error: "subscription_mismatch" }, 403);

  const providerStatus = safeText(preapproval.status, 60).toLowerCase();
  const { error: syncError } = await admin.rpc("sync_ws_subscription_access", {
    p_subscription_id: subscription.id,
    p_provider_subscription_id: safeText(preapproval.id, 160),
    p_provider_status: providerStatus,
    p_period_start: validDate(preapproval.date_created),
    p_period_end: validDate(preapproval.next_payment_date),
  });
  if (syncError) return json({ error: "database_update_failed" }, 500);
  if (providerStatus === "authorized") {
    await admin.from("saas_trial_redemptions").upsert({
      organization_id: subscription.organization_id,
      product_code: product,
      user_id: auth.user.id,
      subscription_id: subscription.id,
    }, { onConflict: "organization_id,product_code", ignoreDuplicates: true });
  }
  return json({ confirmed: providerStatus === "authorized", status: providerStatus });
});
