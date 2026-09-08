import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.4";

type PaymentMethod = "pix" | "card" | "boleto";

type CheckoutInvoice = {
  id: string;
  invoice_number: number;
  organization_id: string;
  description: string;
  total_cents: number | null;
  status: string;
};

const allowedMethods = new Set<PaymentMethod>(["pix", "card", "boleto"]);
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      ...extra,
    },
  });

const safeErrorCode = (value: unknown) => {
  const text = String(value ?? "mercado_pago_error").toLowerCase();
  return text.replace(/[^a-z0-9_:-]/g, "_").slice(0, 120) || "mercado_pago_error";
};

const checkoutUrlIsTrusted = (value: unknown) => {
  try {
    const url = new URL(String(value ?? ""));
    return url.protocol === "https:" && (
      url.hostname === "mercadopago.com" ||
      url.hostname.endsWith(".mercadopago.com") ||
      url.hostname === "mercadopago.com.br" ||
      url.hostname.endsWith(".mercadopago.com.br")
    );
  } catch {
    return false;
  }
};

const configuredSiteUrl = () => {
  const raw = Deno.env.get("PUBLIC_SITE_URL") || "https://wsgestaocontabil.com";
  const url = new URL(raw);
  if (url.protocol !== "https:") throw new Error("invalid_public_site_url");
  return url.origin;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Método não permitido." }, 405);
  if (!String(req.headers.get("content-type") || "").toLowerCase().startsWith("application/json")) {
    return json({ error: "Formato de requisição inválido." }, 415);
  }
  if (Number(req.headers.get("content-length") || "0") > 4096) {
    return json({ error: "Requisição muito grande." }, 413);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const accessToken = Deno.env.get("MERCADO_PAGO_ACCESS_TOKEN") || "";
  const sellerEmail = (Deno.env.get("MERCADO_PAGO_SELLER_EMAIL") || "").trim().toLowerCase();
  const authorization = req.headers.get("Authorization") || "";

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return json({ error: "Serviço temporariamente indisponível." }, 503);
  }
  if (!accessToken) {
    return json({ error: "Mercado Pago ainda não foi configurado." }, 503);
  }
  if (!authorization.startsWith("Bearer ")) {
    return json({ error: "Sessão inválida." }, 401);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: authorization } },
  });
  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

  let attemptId: string | null = null;

  try {
    const token = authorization.slice("Bearer ".length);
    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    const user = authData.user;
    if (authError || !user?.id || !user.email) return json({ error: "Sessão inválida." }, 401);
    if (sellerEmail && user.email.trim().toLowerCase() === sellerEmail) {
      return json({ error: "A conta recebedora não pode pagar a própria cobrança." }, 400);
    }

    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const invoiceId = String(body.invoiceId || "").trim();
    const paymentMethod = String(body.paymentMethod || "") as PaymentMethod;
    const termsAccepted = body.termsAccepted === true;

    if (!uuidPattern.test(invoiceId)) return json({ error: "Fatura inválida." }, 400);
    if (!allowedMethods.has(paymentMethod)) return json({ error: "Forma de pagamento inválida." }, 400);
    if (!termsAccepted) return json({ error: "Confirme os termos antes de continuar." }, 400);

    const { data: rateRows, error: rateError } = await admin.rpc("consume_rate_limit", {
      p_scope: "mp_checkout_user",
      p_key: user.id,
      p_limit: 8,
      p_window_seconds: 600,
    });
    if (rateError) throw new Error("rate_limit_unavailable");
    const rate = Array.isArray(rateRows) ? rateRows[0] : rateRows;
    if (rate && rate.allowed === false) {
      const retryAfter = Math.max(1, Number(rate.retry_after_seconds || 60));
      return json(
        { error: "Muitas tentativas. Aguarde um pouco e tente novamente." },
        429,
        { "Retry-After": String(retryAfter) },
      );
    }

    const { data: invoiceData, error: invoiceError } = await userClient
      .from("saas_invoices")
      .select("id,invoice_number,organization_id,description,total_cents,status")
      .eq("id", invoiceId)
      .maybeSingle();

    const invoice = invoiceData as CheckoutInvoice | null;
    if (invoiceError || !invoice) return json({ error: "Fatura não encontrada para esta empresa." }, 404);
    if (!["open", "overdue"].includes(invoice.status)) {
      return json({ error: invoice.status === "paid" ? "Esta fatura já foi paga." : "Esta fatura não pode ser paga." }, 409);
    }
    if (!Number.isSafeInteger(invoice.total_cents) || Number(invoice.total_cents) <= 0) {
      return json({ error: "O valor da fatura é inválido." }, 409);
    }

    const { data: existingAttempt } = await admin
      .from("saas_payment_attempts")
      .select("id,status,checkout_url,sandbox_checkout_url,created_at")
      .eq("invoice_id", invoice.id)
      .in("status", ["creating", "ready"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAttempt?.status === "ready") {
      const testMode = accessToken.startsWith("TEST-");
      const existingUrl = testMode
        ? existingAttempt.sandbox_checkout_url || existingAttempt.checkout_url
        : existingAttempt.checkout_url;
      if (checkoutUrlIsTrusted(existingUrl)) {
        return json({ checkoutUrl: existingUrl, reused: true });
      }
    }

    if (existingAttempt?.status === "creating") {
      const ageMs = Date.now() - new Date(existingAttempt.created_at).getTime();
      if (Number.isFinite(ageMs) && ageMs < 120_000) {
        return json({ error: "O checkout desta fatura já está sendo preparado." }, 409);
      }
      await admin.from("saas_payment_attempts").update({ status: "failed", failure_code: "stale_attempt" }).eq("id", existingAttempt.id);
    }

    const { data: attempt, error: attemptError } = await admin
      .from("saas_payment_attempts")
      .insert({
        invoice_id: invoice.id,
        organization_id: invoice.organization_id,
        requested_by: user.id,
        payment_method: paymentMethod,
        terms_accepted_at: new Date().toISOString(),
      })
      .select("id,idempotency_key")
      .single();

    if (attemptError || !attempt) {
      if (attemptError?.code === "23505") {
        return json({ error: "O checkout desta fatura já está sendo preparado." }, 409);
      }
      throw new Error("attempt_create_failed");
    }
    attemptId = attempt.id;

    const siteUrl = configuredSiteUrl();
    const checkoutPath = `/app/checkout/${invoice.id}`;
    const preferenceBody = {
      items: [{
        id: invoice.id,
        title: invoice.description || `Fatura WS #${invoice.invoice_number}`,
        description: `Fatura #${String(invoice.invoice_number).padStart(6, "0")}`,
        category_id: "services",
        quantity: 1,
        currency_id: "BRL",
        unit_price: Number(invoice.total_cents) / 100,
      }],
      payer: { email: user.email },
      external_reference: invoice.id,
      metadata: {
        invoice_id: invoice.id,
        organization_id: invoice.organization_id,
        requested_method: paymentMethod,
      },
      back_urls: {
        success: `${siteUrl}${checkoutPath}?mp=success`,
        pending: `${siteUrl}${checkoutPath}?mp=pending`,
        failure: `${siteUrl}${checkoutPath}?mp=failure`,
      },
      auto_return: "approved",
      notification_url: `${supabaseUrl}/functions/v1/mp-webhook?source_news=webhooks`,
      statement_descriptor: "WS GESTAO",
      payment_methods: {
        excluded_payment_methods: [],
        excluded_payment_types: [],
        installments: 12,
      },
    };

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": attempt.idempotency_key,
      },
      body: JSON.stringify(preferenceBody),
    });
    const providerRequestId = mpResponse.headers.get("x-request-id") || "";
    const mpBody = await mpResponse.json().catch(() => ({})) as Record<string, unknown>;

    if (!mpResponse.ok) {
      const failureCode = safeErrorCode(mpBody.error || mpBody.message || `http_${mpResponse.status}`);
      await admin.from("saas_payment_attempts").update({
        status: "failed",
        failure_code: failureCode,
        provider_request_id: providerRequestId || null,
      }).eq("id", attempt.id);
      console.error("mp-create-checkout provider error", { invoiceId: invoice.id, failureCode, providerRequestId });
      return json({ error: "Não foi possível abrir o Mercado Pago. Tente novamente." }, 502);
    }

    const preferenceId = String(mpBody.id || "");
    const initPoint = String(mpBody.init_point || "");
    const sandboxInitPoint = String(mpBody.sandbox_init_point || "");
    const testMode = accessToken.startsWith("TEST-");
    const redirectUrl = testMode ? sandboxInitPoint || initPoint : initPoint;

    if (!preferenceId || !checkoutUrlIsTrusted(redirectUrl) || !checkoutUrlIsTrusted(initPoint)) {
      await admin.from("saas_payment_attempts").update({
        status: "failed",
        failure_code: "invalid_provider_response",
        provider_request_id: providerRequestId || null,
      }).eq("id", attempt.id);
      return json({ error: "O Mercado Pago respondeu com um checkout inválido." }, 502);
    }

    const { error: persistAttemptError } = await admin.from("saas_payment_attempts").update({
      status: "ready",
      preference_id: preferenceId,
      checkout_url: initPoint,
      sandbox_checkout_url: checkoutUrlIsTrusted(sandboxInitPoint) ? sandboxInitPoint : null,
      provider_request_id: providerRequestId || null,
    }).eq("id", attempt.id);
    if (persistAttemptError) throw new Error("attempt_persist_failed");

    const { data: serverInvoice } = await admin
      .from("saas_invoices")
      .select("metadata")
      .eq("id", invoice.id)
      .single();
    const previousMetadata = serverInvoice?.metadata && typeof serverInvoice.metadata === "object"
      ? serverInvoice.metadata as Record<string, unknown>
      : {};
    const previousMercadoPago = previousMetadata.mercado_pago && typeof previousMetadata.mercado_pago === "object"
      ? previousMetadata.mercado_pago as Record<string, unknown>
      : {};

    const { error: persistInvoiceError } = await admin.from("saas_invoices").update({
      provider: "mercado_pago",
      provider_invoice_id: preferenceId,
      checkout_url: redirectUrl,
      payment_method: paymentMethod,
      metadata: {
        ...previousMetadata,
        mercado_pago: {
          ...previousMercadoPago,
          preference_id: preferenceId,
          checkout_created_at: new Date().toISOString(),
          requested_method: paymentMethod,
        },
      },
    }).eq("id", invoice.id);
    if (persistInvoiceError) throw new Error("invoice_persist_failed");

    return json({ checkoutUrl: redirectUrl, reused: false });
  } catch (error) {
    const code = safeErrorCode(error instanceof Error ? error.message : "unknown_error");
    if (attemptId) {
      await admin.from("saas_payment_attempts").update({ status: "failed", failure_code: code }).eq("id", attemptId);
    }
    console.error("mp-create-checkout", { code });
    return json({ error: "Não foi possível preparar o pagamento." }, 500);
  }
});
