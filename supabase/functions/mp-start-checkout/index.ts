import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const plans = {
  issuer_monthly: { product: "issuer", name: "Emissor Fiscal WS", cents: 6900, trialDays: 7 },
  extractor_commercial: { product: "extractor", name: "Extrator Fiscal WS — Comercial", cents: 9900, trialDays: 7 },
  extractor_enterprise: { product: "extractor", name: "Extrator Fiscal WS — Empresarial", cents: 25000, trialDays: 7 },
} as const;
type PlanCode = keyof typeof plans;
type BillingMode = "recurring" | "one_time";
const testBuyerBySellerId: Record<string, string> = {
  "3683036338": "test_user_4909973592755136737@testuser.com",
};

const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json", "Cache-Control": "no-store" } });
const trustedCheckout = (value: unknown) => { try { const u = new URL(String(value || "")); return u.protocol === "https:" && (u.hostname === "mercadopago.com" || u.hostname.endsWith(".mercadopago.com") || u.hostname === "mercadopago.com.br" || u.hostname.endsWith(".mercadopago.com.br")); } catch { return false; } };
const siteOrigin = () => { const u = new URL(Deno.env.get("PUBLIC_SITE_URL") || "https://wsgestaocontabil.com"); if (u.protocol !== "https:") throw new Error("invalid_site_url"); return u.origin; };

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  if (Number(req.headers.get("content-length") || 0) > 4096) return json({ error: "Requisição muito grande." }, 413);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";
  const sellerEmail = (Deno.env.get("MERCADO_PAGO_SELLER_EMAIL") || "").trim().toLowerCase();
  const authorization = req.headers.get("Authorization") || "";
  if (!supabaseUrl || !anonKey || !serviceKey) return json({ error: "Serviço temporariamente indisponível." }, 503);
  if (!accessToken) return json({ error: "O Mercado Pago ainda não foi configurado. Fale com a equipe WS." }, 503);
  if (!authorization.startsWith("Bearer ")) return json({ error: "Sessão inválida." }, 401);

  const userClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false }, global: { headers: { Authorization: authorization } } });
  const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
  const { data: auth } = await userClient.auth.getUser(authorization.slice(7));
  const user = auth.user;
  if (!user?.id || !user.email) return json({ error: "Sessão inválida." }, 401);
  if (sellerEmail && user.email.trim().toLowerCase() === sellerEmail) return json({ error: "A conta recebedora não pode contratar o próprio plano." }, 400);

  const input = await req.json().catch(() => ({})) as Record<string, unknown>;
  const planCode = String(input.planCode || "") as PlanCode;
  const billingMode = String(input.billingMode || "") as BillingMode;
  if (!(planCode in plans) || !["recurring", "one_time"].includes(billingMode)) return json({ error: "Plano inválido." }, 400);
  if (input.termsAccepted !== true) return json({ error: "Aceite os termos para continuar." }, 400);
  const selected = plans[planCode];
  let payerEmail = user.email;
  const sellerResponse = await fetch("https://api.mercadopago.com/users/me", {
    headers: { Authorization: `Bearer ${accessToken}`, Accept: "application/json" },
  });
  if (sellerResponse.ok) {
    const seller = await sellerResponse.json().catch(() => ({})) as Record<string, unknown>;
    payerEmail = testBuyerBySellerId[String(seller.id || "")] || payerEmail;
  }

  const { data: rateRows, error: rateError } = await admin.rpc("consume_rate_limit", { p_scope: "mp_product_checkout", p_key: user.id, p_limit: 6, p_window_seconds: 600 });
  if (rateError) return json({ error: "Não foi possível validar a tentativa." }, 503);
  const rate = Array.isArray(rateRows) ? rateRows[0] : rateRows;
  if (rate?.allowed === false) return json({ error: "Muitas tentativas. Aguarde um pouco e tente novamente." }, 429);

  let { data: member } = await admin.from("organization_members").select("organization_id").eq("user_id", user.id).eq("status", "active").order("created_at").limit(1).maybeSingle();
  if (!member) {
    const label = String(user.user_metadata?.full_name || user.email.split("@")[0] || "Minha empresa").trim().slice(0, 120);
    const { data: org, error: orgError } = await admin.from("organizations").insert({ name: label.length >= 2 ? label : "Minha empresa", slug: `conta-${user.id}`, owner_user_id: user.id }).select("id").single();
    if (orgError || !org) return json({ error: "Não foi possível preparar sua empresa." }, 500);
    member = { organization_id: org.id };
  }
  const organizationId = member.organization_id;

  const { data: plan, error: planError } = await admin.from("saas_plans").select("id").eq("code", planCode).eq("status", "active").single();
  if (planError || !plan) return json({ error: "Plano temporariamente indisponível." }, 503);
  const { data: existing } = await admin.from("saas_subscriptions").select("id,status").eq("organization_id", organizationId).eq("product_code", selected.product).in("status", ["trialing","active","past_due","paused","incomplete"]).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (existing?.status && existing.status !== "incomplete") return json({ error: "Sua empresa já possui acesso a este produto.", destination: selected.product === "issuer" ? "/app" : "/extrator" }, 409);
  if (existing?.id) await admin.from("saas_subscriptions").update({ status: "canceled" }).eq("id", existing.id);

  const trialEligible = billingMode === "recurring" && !(await admin.from("saas_trial_redemptions").select("id").or(`organization_id.eq.${organizationId},user_id.eq.${user.id}`).eq("product_code", selected.product).limit(1)).data?.length;
  const now = new Date();
  const trialEnd = trialEligible ? new Date(now.getTime() + selected.trialDays * 86400000) : null;
  const { data: subscription, error: subError } = await admin.from("saas_subscriptions").insert({
    organization_id: organizationId, plan_id: plan.id, product_code: selected.product,
    billing_mode: billingMode, status: "incomplete", provider: "mercado_pago",
    trial_started_at: trialEligible ? now.toISOString() : null, trial_ends_at: trialEnd?.toISOString() || null,
    metadata: { plan_code: planCode, checkout_created_by: user.id },
  }).select("id").single();
  if (subError || !subscription) return json({ error: "Não foi possível iniciar a contratação." }, 500);
  let confirmedTrial = trialEligible;
  if (trialEligible) {
    const { error: redemptionError } = await admin.from("saas_trial_redemptions").insert({ organization_id: organizationId, product_code: selected.product, user_id: user.id, subscription_id: subscription.id });
    if (redemptionError) {
      confirmedTrial = false;
      await admin.from("saas_subscriptions").update({ trial_started_at: null, trial_ends_at: null }).eq("id", subscription.id);
    }
  }
  const { data: checkout } = await admin.from("saas_billing_checkouts").insert({ organization_id: organizationId, subscription_id: subscription.id, requested_by: user.id, billing_mode: billingMode, terms_accepted_at: new Date().toISOString() }).select("id,idempotency_key").single();
  if (!checkout) return json({ error: "Não foi possível preparar o pagamento." }, 500);

  const origin = siteOrigin();
  const checkoutPath = selected.product === "issuer" ? "/pagamento/retorno?product=issuer" : "/pagamento/retorno?product=extractor";
  const webhook = `${supabaseUrl}/functions/v1/mp-webhook?source_news=webhooks`;
  let endpoint = ""; let payload: Record<string, unknown>;
  if (billingMode === "recurring") {
    endpoint = "https://api.mercadopago.com/preapproval";
    payload = {
      reason: selected.name, external_reference: subscription.id, payer_email: payerEmail,
      back_url: `${origin}${checkoutPath}&status=return`,
      notification_url: webhook, status: "pending",
      auto_recurring: {
        frequency: 1, frequency_type: "months", transaction_amount: selected.cents / 100, currency_id: "BRL",
        ...(confirmedTrial ? { free_trial: { frequency: selected.trialDays, frequency_type: "days" } } : {}),
      },
    };
  } else {
    const periodStart = now.toISOString().slice(0, 10);
    const periodEnd = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const { data: invoice, error: invoiceError } = await admin.from("saas_invoices").insert({ organization_id: organizationId, subscription_id: subscription.id, description: `${selected.name} — acesso por 30 dias`, period_start: periodStart, period_end: periodEnd, due_date: periodStart, subtotal_cents: selected.cents, total_cents: selected.cents, line_items: [{ plan_code: planCode, quantity: 1, unit_price_cents: selected.cents }], metadata: { billing_mode: "one_time" } }).select("id").single();
    if (invoiceError || !invoice) return json({ error: "Não foi possível criar a cobrança." }, 500);
    endpoint = "https://api.mercadopago.com/checkout/preferences";
    payload = {
      items: [{ id: planCode, title: selected.name, description: "Acesso por 30 dias, sem renovação automática", category_id: "services", quantity: 1, currency_id: "BRL", unit_price: selected.cents / 100 }],
      payer: { email: payerEmail }, external_reference: invoice.id,
      metadata: { invoice_id: invoice.id, subscription_id: subscription.id, organization_id: organizationId },
      back_urls: { success: `${origin}${checkoutPath}&status=success`, pending: `${origin}${checkoutPath}&status=pending`, failure: `${origin}${checkoutPath}&status=failure` },
      auto_return: "approved", notification_url: webhook, statement_descriptor: "WS GESTAO",
    };
  }

  const response = await fetch(endpoint, { method: "POST", headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", "X-Idempotency-Key": checkout.idempotency_key }, body: JSON.stringify(payload) });
  const provider = await response.json().catch(() => ({})) as Record<string, unknown>;
  const isSandbox = provider.live_mode === false;
  const checkoutUrl = String(isSandbox ? provider.sandbox_init_point || provider.init_point || "" : provider.init_point || "");
  if (!response.ok || !trustedCheckout(checkoutUrl)) {
    await admin.from("saas_billing_checkouts").update({ status: "failed", failure_code: String(provider.message || `http_${response.status}`).slice(0, 120) }).eq("id", checkout.id);
    await admin.from("saas_subscriptions").update({ status: "canceled" }).eq("id", subscription.id);
    if (confirmedTrial) await admin.from("saas_trial_redemptions").delete().eq("subscription_id", subscription.id);
    return json({ error: "Não foi possível abrir o Mercado Pago. Tente novamente." }, 502);
  }
  await admin.from("saas_billing_checkouts").update({ status: "ready", provider_reference: String(provider.id || ""), checkout_url: checkoutUrl }).eq("id", checkout.id);
  if (billingMode === "recurring") {
    await admin.from("saas_subscriptions").update({ provider_subscription_id: String(provider.id || ""), provider_status: String(provider.status || "pending") }).eq("id", subscription.id);
  }
  return json({ checkoutUrl, trialEligible: confirmedTrial, billingMode });
});
