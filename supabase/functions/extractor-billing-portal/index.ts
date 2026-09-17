import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { consume, limited } from '../_shared/rate-limit.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const J = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' } });
const safeUrl = (value: unknown) => {
  try {
    const url = new URL(String(value || ''));
    return url.protocol === 'https:' &&
      (url.hostname === 'mercadopago.com' || url.hostname.endsWith('.mercadopago.com') ||
       url.hostname === 'mercadopago.com.br' || url.hostname.endsWith('.mercadopago.com.br'))
      ? url.toString() : '';
  } catch { return ''; }
};

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);
  try {
    const authorization = req.headers.get('authorization') || '';
    if (!authorization) return J({ error: 'Não autenticado' }, 401);
    const url = Deno.env.get('SUPABASE_URL')!;
    const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: auth } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ''));
    const user = auth.user;
    if (!user) return J({ error: 'Não autenticado' }, 401);
    const denied = limited(await consume(admin, 'extractor_billing_portal', user.id, 30, 600));
    if (denied) return denied;

    const { data: memberships, error: memberError } = await admin.from('organization_members')
      .select('organization_id,role,status,created_at')
      .eq('user_id', user.id).eq('status', 'active').order('created_at');
    if (memberError) throw memberError;
    const orgIds = [...new Set((memberships || []).map((row: any) => String(row.organization_id)).filter(Boolean))];
    if (!orgIds.length) return J({ error: 'Conta sem organização vinculada' }, 403);

    const { data: accounts, error: accountError } = await admin.from('extractor_accounts')
      .select('*').in('organization_id', orgIds).in('status', ['trialing','active','past_due']).order('created_at');
    if (accountError) throw accountError;
    const account = (accounts || [])[0];
    if (!account) return J({ error: 'Extrator não habilitado para esta conta' }, 403);
    const organizationId = String(account.organization_id);
    const membership = (memberships || []).find((row: any) => String(row.organization_id) === organizationId) || null;

    const [orgRes, subscriptionRes, invoiceRes, companiesRes] = await Promise.all([
      admin.from('organizations').select('id,name,status,created_at').eq('id', organizationId).maybeSingle(),
      admin.from('saas_subscriptions')
        .select('id,status,provider,provider_subscription_id,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at,product_code,billing_mode,trial_started_at,trial_ends_at,access_expires_at,provider_status,metadata,saas_plans(id,code,name,price_cents,limits,features,trial_days)')
        .eq('organization_id', organizationId).eq('product_code', 'extractor').order('created_at', { ascending: false }).limit(1).maybeSingle(),
      admin.from('saas_invoices')
        .select('id,invoice_number,subscription_id,provider,provider_invoice_id,provider_payment_id,provider_status,provider_status_detail,description,period_start,period_end,due_date,total_cents,status,payment_method,paid_at,checkout_url,receipt_path,fiscal_note_path,created_at,updated_at')
        .eq('organization_id', organizationId).order('created_at', { ascending: false }).limit(24),
      admin.from('extractor_companies').select('id').eq('account_id', account.id).eq('status', 'active'),
    ]);
    if (orgRes.error) throw orgRes.error;
    if (subscriptionRes.error) throw subscriptionRes.error;
    if (invoiceRes.error) throw invoiceRes.error;
    if (companiesRes.error) throw companiesRes.error;

    const subscription: any = subscriptionRes.data || null;
    const plan = Array.isArray(subscription?.saas_plans) ? subscription.saas_plans[0] : subscription?.saas_plans || null;
    let lastCheckout: any = null;
    if (subscription?.id) {
      const { data } = await admin.from('saas_billing_checkouts')
        .select('id,status,billing_mode,checkout_url,provider_reference,created_at')
        .eq('organization_id', organizationId).eq('subscription_id', subscription.id)
        .order('created_at', { ascending: false }).limit(1).maybeSingle();
      lastCheckout = data || null;
    }

    const invoices = (invoiceRes.data || []).map((invoice: any) => ({
      ...invoice,
      checkout_url: safeUrl(invoice.checkout_url),
    }));

    return J({
      ok: true,
      profile: {
        id: user.id,
        email: user.email || null,
        phone: user.phone || null,
        full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
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
        checkout_url: safeUrl(lastCheckout?.checkout_url),
      } : null,
      invoices,
    });
  } catch (error: any) {
    const status = Number(error?.status || 500);
    return J({ error: status < 500 ? error.message : 'Não foi possível carregar faturamento e conta agora.' }, status);
  }
});
