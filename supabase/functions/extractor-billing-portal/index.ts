import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { consume, limited } from '../_shared/rate-limit.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const J = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const safeProviderUrl = (value: unknown) => {
  try {
    const url = new URL(String(value || ''));
    const host = url.hostname.toLowerCase();
    return url.protocol === 'https:' &&
      (host === 'mercadopago.com' || host.endsWith('.mercadopago.com') ||
       host === 'mercadopago.com.br' || host.endsWith('.mercadopago.com.br'))
      ? url.toString()
      : '';
  } catch {
    return '';
  }
};

const subscriptionScore = (status: unknown) => {
  const value = String(status || '').toLowerCase();
  if (value === 'active') return 100;
  if (value === 'trialing') return 95;
  if (value === 'past_due') return 80;
  if (value === 'paused') return 60;
  if (value === 'incomplete') return 30;
  return 0;
};

async function signedBillingFile(admin: any, organizationId: string, rawPath: unknown) {
  let path = String(rawPath || '').trim().replace(/^\/+/, '');
  if (!path) return '';
  if (path.startsWith('saas-private/')) path = path.slice('saas-private/'.length);
  if (!path.startsWith(`${organizationId}/`)) return '';
  const { data, error } = await admin.storage.from('saas-private').createSignedUrl(path, 900);
  if (error) return '';
  return String(data?.signedUrl || '');
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);

  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization) return J({ error: 'Não autenticado' }, 401);

    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const mpAccessToken = Deno.env.get('MERCADO_PAGO_ACCESS_TOKEN') || '';
    const admin = createClient(url, service, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: auth } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    const user = auth.user;
    if (!user) return J({ error: 'Não autenticado' }, 401);

    const denied = limited(await consume(admin, 'extractor_billing_portal', user.id, 30, 600));
    if (denied) return denied;

    const { data: memberships, error: memberError } = await admin
      .from('organization_members')
      .select('organization_id,role,status,created_at')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at');
    if (memberError) throw memberError;

    const orgIds = [...new Set((memberships || []).map((row: any) => String(row.organization_id)).filter(Boolean))];
    if (!orgIds.length) return J({ error: 'Conta sem organização vinculada' }, 403);

    const { data: accounts, error: accountError } = await admin
      .from('extractor_accounts')
      .select('*')
      .in('organization_id', orgIds)
      .in('status', ['trialing', 'active', 'past_due'])
      .order('created_at');
    if (accountError) throw accountError;

    const account = (accounts || [])[0];
    if (!account) return J({ error: 'Extrator não habilitado para esta conta' }, 403);

    const organizationId = String(account.organization_id);
    const membership =
      (memberships || []).find((row: any) => String(row.organization_id) === organizationId) || null;

    const [orgRes, subscriptionsRes, companiesRes, plansRes] = await Promise.all([
      admin.from('organizations').select('id,name,status,created_at').eq('id', organizationId).maybeSingle(),
      admin.from('saas_subscriptions')
        .select('id,status,provider,provider_subscription_id,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at,product_code,billing_mode,trial_started_at,trial_ends_at,access_expires_at,provider_status,metadata,saas_plans(id,code,name,price_cents,limits,features,trial_days)')
        .eq('organization_id', organizationId)
        .eq('product_code', 'extractor')
        .order('created_at', { ascending: false })
        .limit(30),
      admin.from('extractor_companies').select('id').eq('account_id', account.id).eq('status', 'active'),
      admin.from('saas_plans')
        .select('id,code,name,price_cents,limits,features,trial_days,status')
        .eq('product_code', 'extractor')
        .eq('status', 'active')
        .order('price_cents'),
    ]);
    if (orgRes.error) throw orgRes.error;
    if (subscriptionsRes.error) throw subscriptionsRes.error;
    if (companiesRes.error) throw companiesRes.error;
    if (plansRes.error) throw plansRes.error;

    const subscriptions = (subscriptionsRes.data || []) as any[];
    const subscription = [...subscriptions].sort((a, b) => {
      const score = subscriptionScore(b.status) - subscriptionScore(a.status);
      if (score) return score;
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    })[0] || null;

    const plan = Array.isArray(subscription?.saas_plans)
      ? subscription.saas_plans[0]
      : subscription?.saas_plans || null;

    let lastCheckout: any = null;
    if (subscription?.id) {
      const { data } = await admin.from('saas_billing_checkouts')
        .select('id,status,billing_mode,checkout_url,provider_reference,created_at')
        .eq('organization_id', organizationId)
        .eq('subscription_id', subscription.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      lastCheckout = data || null;
    }

    const { data: invoiceRows, error: invoiceError } = await admin
      .from('saas_invoices')
      .select('id,invoice_number,subscription_id,provider,provider_invoice_id,provider_payment_id,provider_status,provider_status_detail,description,period_start,period_end,due_date,total_cents,status,payment_method,paid_at,checkout_url,receipt_path,fiscal_note_path,metadata,created_at,updated_at')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: false })
      .limit(60);
    if (invoiceError) throw invoiceError;

    const relevantRows = (invoiceRows || []).filter((invoice: any) =>
      invoice.status === 'paid' || (subscription?.id && invoice.subscription_id === subscription.id)
    ).slice(0, 24);

    const now = new Date();
    const currentPaid = relevantRows.find((invoice: any) => {
      if (invoice.status !== 'paid') return false;
      if (subscription?.id && invoice.subscription_id !== subscription.id) return false;
      const start = invoice.period_start ? new Date(`${invoice.period_start}T00:00:00Z`) : null;
      const end = invoice.period_end ? new Date(`${invoice.period_end}T23:59:59Z`) : null;
      return (!start || start <= now) && (!end || end >= now);
    }) || relevantRows.find((invoice: any) =>
      invoice.status === 'paid' && (!subscription?.id || invoice.subscription_id === subscription.id)
    ) || null;

    const currentOpen = relevantRows.find((invoice: any) =>
      invoice.status !== 'paid' && (!subscription?.id || invoice.subscription_id === subscription.id)
    ) || null;

    const invoices = await Promise.all(relevantRows.map(async (invoice: any, index: number) => {
      const metadata = invoice.metadata && typeof invoice.metadata === 'object' ? invoice.metadata : {};
      const providerReceipt =
        safeProviderUrl(metadata?.provider_receipt_url) ||
        safeProviderUrl(metadata?.mercado_pago?.receipt_url);
      let paymentMethod = invoice.payment_method || null;

      // Older payments may predate receipt/method persistence. Enrich only a few
      // recent Mercado Pago records and persist the official provider reference.
      if (
        index < 5 &&
        mpAccessToken &&
        invoice.provider === 'mercado_pago' &&
        invoice.provider_payment_id &&
        !paymentMethod
      ) {
        try {
          const response = await fetch(
            `https://api.mercadopago.com/v1/payments/${encodeURIComponent(String(invoice.provider_payment_id))}`,
            {
              headers: { Authorization: `Bearer ${mpAccessToken}`, Accept: 'application/json' },
              signal: AbortSignal.timeout(6000),
            }
          );
          if (response.ok) {
            const payment = await response.json().catch(() => ({})) as any;
            const paymentType = String(payment?.payment_type_id || '').toLowerCase();
            const paymentMethodId = String(payment?.payment_method_id || '').toLowerCase();
            paymentMethod =
              paymentMethod ||
              (paymentMethodId === 'pix'
                ? 'pix'
                : ['credit_card', 'debit_card', 'prepaid_card'].includes(paymentType)
                  ? 'card'
                  : paymentType === 'ticket'
                    ? 'boleto'
                    : null);
            // Mercado Pago's ticket/external_resource URLs are payment/instruction
            // pages, not guaranteed post-payment receipts. Never label them as receipts.
            if (paymentMethod && !invoice.payment_method) {
              await admin.from('saas_invoices').update({
                payment_method: paymentMethod,
              }).eq('id', invoice.id);
            }
          }
        } catch {
          // Billing remains available even when the provider is temporarily unavailable.
        }
      }

      return {
        ...invoice,
        payment_method: paymentMethod,
        checkout_url: safeProviderUrl(invoice.checkout_url),
        receipt_url: await signedBillingFile(admin, organizationId, invoice.receipt_path),
        fiscal_note_url: await signedBillingFile(admin, organizationId, invoice.fiscal_note_path),
        provider_receipt_url: providerReceipt,
        metadata: undefined,
      };
    }));

    const cyclePaid = Boolean(currentPaid);
    const subscriptionActive = ['active', 'trialing'].includes(String(subscription?.status || ''));
    const checkoutAllowed = Boolean(
      !cyclePaid &&
      (
        ['incomplete', 'past_due'].includes(String(subscription?.status || '')) ||
        currentOpen
      )
    );

    const currentInvoice = currentPaid || currentOpen || null;
    const nextChargeAt =
      subscription?.current_period_end ||
      subscription?.access_expires_at ||
      account.access_expires_at ||
      null;

    return J({
      ok: true,
      profile: {
        id: user.id,
        email: user.email || null,
        phone: user.user_metadata?.contact_phone || user.phone || null,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        notifications: user.user_metadata?.notification_preferences || {
          fiscal_alerts: true,
          billing_updates: true,
        },
        created_at: user.created_at || null,
        last_sign_in_at: user.last_sign_in_at || null,
        email_confirmed_at: user.email_confirmed_at || null,
        phone_confirmed_at: user.phone_confirmed_at || null,
      },
      organization: {
        id: organizationId,
        name: orgRes.data?.name || account.name || 'Conta Extrator',
        status: orgRes.data?.status || 'active',
        member_role: membership?.role || 'member',
        member_since: membership?.created_at || null,
      },
      account: {
        id: account.id,
        name: account.name,
        status: account.status,
        plan_code: account.plan_code,
        monthly_xml_limit: account.monthly_xml_limit,
        current_period_start: account.current_period_start,
        history_from: account.history_from,
        base_lookback_days: account.base_lookback_days,
        access_source: account.access_source,
        access_expires_at: account.access_expires_at,
        lifetime_access: account.lifetime_access === true,
        companies: (companiesRes.data || []).length,
        created_at: account.created_at,
      },
      subscription: subscription ? {
        id: subscription.id,
        status: subscription.status,
        provider: subscription.provider,
        provider_status: subscription.provider_status,
        billing_mode: subscription.billing_mode,
        current_period_start: subscription.current_period_start,
        current_period_end: subscription.current_period_end,
        trial_started_at: subscription.trial_started_at,
        trial_ends_at: subscription.trial_ends_at,
        access_expires_at: subscription.access_expires_at,
        cancel_at_period_end: subscription.cancel_at_period_end,
        created_at: subscription.created_at,
        plan: plan ? {
          code: plan.code,
          name: plan.name,
          price_cents: Number(plan.price_cents || 0),
          limits: plan.limits || {},
          features: plan.features || {},
        } : null,
        checkout_url: checkoutAllowed ? safeProviderUrl(currentOpen?.checkout_url || lastCheckout?.checkout_url) : '',
      } : null,
      billing_cycle: {
        paid: cyclePaid || (subscriptionActive && !currentOpen && subscription?.billing_mode === 'recurring'),
        status: cyclePaid ? 'paid' : currentOpen ? 'pending' : subscriptionActive ? 'active' : 'inactive',
        paid_at: currentPaid?.paid_at || null,
        payment_method: currentPaid?.payment_method || currentInvoice?.payment_method || null,
        amount_cents: Number(currentInvoice?.total_cents ?? plan?.price_cents ?? 0),
        current_invoice_id: currentInvoice?.id || null,
        current_invoice_number: currentInvoice?.invoice_number || null,
        next_charge_at: nextChargeAt,
        renewal_mode: subscription?.billing_mode === 'recurring' ? 'automatic' : 'manual',
      },
      plans: (plansRes.data || []).map((item: any) => ({
        code: item.code,
        name: item.name,
        price_cents: Number(item.price_cents || 0),
        limits: item.limits || {},
        features: item.features || {},
        trial_days: Number(item.trial_days || 0),
      })),
      invoices,
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return J(
      { error: status < 500 ? error.message : 'Não foi possível carregar faturamento e conta agora.' },
      status
    );
  }
});
