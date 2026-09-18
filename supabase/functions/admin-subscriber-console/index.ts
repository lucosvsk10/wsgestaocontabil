import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

const encoder = new TextEncoder();
const toHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const toBase64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
};

async function passwordHash(password: string, saltHex: string, iterations: number) {
  const salt = new Uint8Array(saltHex.match(/.{1,2}/g)?.map((part) => Number.parseInt(part, 16)) ?? []);
  const material = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, material, 256);
  return toHex(new Uint8Array(bits));
}

async function signToken(userId: string) {
  const payload = toBase64Url(JSON.stringify({ uid: userId, exp: Date.now() + 60 * 60 * 1000, nonce: crypto.randomUUID() }));
  const secret = Deno.env.get("ADMIN_SUBSCRIBER_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
  return `${payload}.${toBase64Url(signature)}`;
}

async function verifyToken(token: string, userId: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const secret = Deno.env.get("ADMIN_SUBSCRIBER_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
  if (signature !== expected) return false;
  try {
    const decoded = JSON.parse(fromBase64Url(payload));
    return decoded.uid === userId && Number(decoded.exp) > Date.now();
  } catch {
    return false;
  }
}

async function listAuthUsers(admin: any) {
  const all: any[] = [];
  for (let page = 1; page <= 20; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const users = data?.users || [];
    all.push(...users);
    if (users.length < 1000) break;
  }
  return all;
}

const isTestEmail = (email: string | null | undefined) => {
  const value = String(email || "").toLowerCase();
  return (
    value === "wsteste@gmail.com" ||
    value === "testemp@gmail.com" ||
    value === "test@testuser.com" ||
    value.startsWith("checkout-qa-") ||
    value.startsWith("codex-") ||
    value.startsWith("codex.") ||
    value.startsWith("test_user_") ||
    /^testuser\d+@testuser\.com$/.test(value)
  );
};

const daysBetween = (value: string | null | undefined) => {
  if (!value) return 0;
  return Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86400000));
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Não autenticado." }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado." }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => row.role === "admin")) {
      return json({ error: "Acesso exclusivo para administradores." }, 403);
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "bootstrap");
    const { data: settings } = await admin
      .from("admin_subscriber_console_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (action === "bootstrap") return json({ configured: Boolean(settings) });

    if (action === "set_password") {
      const password = String(body.password || "");
      if (password.length < 8) return json({ error: "A senha deve ter pelo menos 8 caracteres." }, 400);
      if (settings) return json({ error: "A senha deste painel já foi configurada." }, 409);
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltHex = toHex(salt);
      const iterations = 210000;
      const hash = await passwordHash(password, saltHex, iterations);
      const { error } = await admin.from("admin_subscriber_console_settings").insert({
        id: 1,
        password_salt: saltHex,
        password_hash: hash,
        password_iterations: iterations,
        configured_by: user.id,
      });
      if (error) throw error;
      return json({ token: await signToken(user.id) });
    }

    if (action === "unlock") {
      if (!settings) return json({ error: "Defina a senha deste painel primeiro.", setup_required: true }, 409);
      const hash = await passwordHash(
        String(body.password || ""),
        settings.password_salt,
        Number(settings.password_iterations || 210000),
      );
      if (hash !== settings.password_hash) return json({ error: "Senha incorreta." }, 401);
      return json({ token: await signToken(user.id) });
    }

    const token = String(body.console_token || "");
    if (!await verifyToken(token, user.id)) return json({ error: "Sessão protegida expirada." }, 401);

    if (action !== "data") return json({ error: "Ação inválida." }, 400);

    const [
      authUsers,
      { data: organizations, error: organizationsError },
      { data: members, error: membersError },
      { data: profiles, error: profilesError },
      { data: subscriptions, error: subscriptionsError },
      { data: invoices, error: invoicesError },
      { data: checkouts, error: checkoutsError },
      { data: extractorAccounts, error: extractorAccountsError },
      { data: extractorCompanies, error: extractorCompaniesError },
      { data: emissions, error: emissionsError },
    ] = await Promise.all([
      listAuthUsers(admin),
      admin.from("organizations").select("id,name,slug,status,owner_user_id,created_at,updated_at"),
      admin.from("organization_members").select("id,organization_id,user_id,role,status,created_at,updated_at"),
      admin.from("users").select("id,name,email"),
      admin.from("saas_subscriptions").select("id,organization_id,status,provider,current_period_start,current_period_end,cancel_at_period_end,created_at,updated_at,product_code,billing_mode,trial_started_at,trial_ends_at,access_expires_at,provider_status,saas_plans(id,code,name,product_code,price_cents)"),
      admin.from("saas_invoices").select("id,invoice_number,organization_id,subscription_id,provider,description,period_start,period_end,due_date,total_cents,status,payment_method,paid_at,provider_status,created_at").order("created_at", { ascending: false }),
      admin.from("saas_billing_checkouts").select("id,organization_id,subscription_id,billing_mode,status,failure_code,created_at,updated_at").order("created_at", { ascending: false }),
      admin.from("extractor_accounts").select("id,organization_id,name,status,plan_code,monthly_xml_limit,current_period_start,created_at,updated_at,access_source,access_expires_at,lifetime_access"),
      admin.from("extractor_companies").select("id,account_id,fiscal_company_id,status,created_at"),
      admin.from("saas_fiscal_emissions").select("id,organization_id,status,created_at"),
    ]);

    const error = organizationsError || membersError || profilesError || subscriptionsError ||
      invoicesError || checkoutsError || extractorAccountsError || extractorCompaniesError || emissionsError;
    if (error) throw error;

    const authMap = new Map(authUsers.map((item: any) => [item.id, item]));
    const profileMap = new Map((profiles || []).map((item: any) => [item.id, item]));
    const memberByOrg = new Map<string, any[]>();
    for (const member of members || []) {
      const list = memberByOrg.get(member.organization_id) || [];
      list.push(member);
      memberByOrg.set(member.organization_id, list);
    }

    const invoicesByOrg = new Map<string, any[]>();
    for (const invoice of invoices || []) {
      const list = invoicesByOrg.get(invoice.organization_id) || [];
      list.push(invoice);
      invoicesByOrg.set(invoice.organization_id, list);
    }

    const checkoutsByOrg = new Map<string, any[]>();
    for (const checkout of checkouts || []) {
      const list = checkoutsByOrg.get(checkout.organization_id) || [];
      list.push(checkout);
      checkoutsByOrg.set(checkout.organization_id, list);
    }

    const emissionsByOrg = new Map<string, { total: number; last30: number; lastAt: string | null }>();
    const thirtyDaysAgo = Date.now() - 30 * 86400000;
    for (const emission of emissions || []) {
      const current = emissionsByOrg.get(emission.organization_id) || { total: 0, last30: 0, lastAt: null };
      current.total += 1;
      if (new Date(emission.created_at).getTime() >= thirtyDaysAgo) current.last30 += 1;
      if (!current.lastAt || emission.created_at > current.lastAt) current.lastAt = emission.created_at;
      emissionsByOrg.set(emission.organization_id, current);
    }

    const companyByAccount = new Map<string, any[]>();
    for (const company of extractorCompanies || []) {
      if (company.status !== "active") continue;
      const list = companyByAccount.get(company.account_id) || [];
      list.push(company);
      companyByAccount.set(company.account_id, list);
    }

    const organizationsMap = new Map((organizations || []).map((item: any) => [item.id, item]));

    const personFor = (userId: string | null | undefined) => {
      const authUser: any = userId ? authMap.get(userId) : null;
      const profile: any = userId ? profileMap.get(userId) : null;
      return {
        id: userId || null,
        name: profile?.name || authUser?.user_metadata?.name || authUser?.user_metadata?.full_name || null,
        email: profile?.email || authUser?.email || null,
        created_at: authUser?.created_at || null,
        last_login_at: authUser?.last_sign_in_at || null,
        email_confirmed_at: authUser?.email_confirmed_at || null,
      };
    };

    const membersFor = (orgId: string) =>
      (memberByOrg.get(orgId) || []).map((member: any) => ({
        ...member,
        user: personFor(member.user_id),
      }));

    const decorateCommon = (org: any, product: "issuer" | "extractor", productCreatedAt: string | null) => {
      const owner = personFor(org.owner_user_id);
      const orgMembers = membersFor(org.id);
      return {
        id: `${product}:${org.id}`,
        product,
        organization: {
          id: org.id,
          name: org.name,
          slug: org.slug,
          status: org.status,
          created_at: org.created_at,
        },
        owner,
        members: orgMembers,
        customer_since: productCreatedAt || org.created_at,
        account_age_days: daysBetween(productCreatedAt || org.created_at),
        invoices: (invoicesByOrg.get(org.id) || []).slice(0, 24),
        checkouts: (checkoutsByOrg.get(org.id) || []).slice(0, 12),
      };
    };

    const issuerLatestByOrg = new Map<string, any>();
    for (const subscription of (subscriptions || []).sort((a: any, b: any) =>
      String(b.created_at).localeCompare(String(a.created_at)))) {
      const plan: any = Array.isArray(subscription.saas_plans) ? subscription.saas_plans[0] : subscription.saas_plans;
      const productCode = subscription.product_code || plan?.product_code;
      if (productCode !== "issuer" || issuerLatestByOrg.has(subscription.organization_id)) continue;
      issuerLatestByOrg.set(subscription.organization_id, subscription);
    }

    const rows: any[] = [];
    let hiddenTestAccounts = 0;

    for (const [orgId, subscription] of issuerLatestByOrg.entries()) {
      const org: any = organizationsMap.get(orgId);
      if (!org) continue;
      const owner = personFor(org.owner_user_id);
      if (isTestEmail(owner.email)) {
        hiddenTestAccounts += 1;
        continue;
      }
      const common = decorateCommon(org, "issuer", subscription.created_at);
      const emission = emissionsByOrg.get(org.id) || { total: 0, last30: 0, lastAt: null };
      const plan: any = Array.isArray(subscription.saas_plans) ? subscription.saas_plans[0] : subscription.saas_plans;
      rows.push({
        ...common,
        access: {
          status: subscription.status,
          provider_status: subscription.provider_status,
          billing_mode: subscription.billing_mode,
          provider: subscription.provider,
          trial_ends_at: subscription.trial_ends_at,
          current_period_end: subscription.current_period_end,
          access_expires_at: subscription.access_expires_at,
          cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
        },
        plan: {
          code: plan?.code || null,
          name: plan?.name || "Emissor Fiscal",
          price_cents: Number(plan?.price_cents || 0),
        },
        usage: {
          primary: emission.total,
          primary_label: "notas emitidas",
          secondary: emission.last30,
          secondary_label: "nos últimos 30 dias",
          last_activity_at: emission.lastAt,
          limit: null,
        },
      });
    }

    for (const account of extractorAccounts || []) {
      const org: any = organizationsMap.get(account.organization_id);
      if (!org) continue;
      const owner = personFor(org.owner_user_id);
      if (isTestEmail(owner.email)) {
        hiddenTestAccounts += 1;
        continue;
      }
      const common = decorateCommon(org, "extractor", account.created_at);
      const activeCompanies = companyByAccount.get(account.id) || [];
      let used = 0;
      if (activeCompanies.length && account.current_period_start) {
        const fiscalIds = activeCompanies.map((item: any) => item.fiscal_company_id);
        const periodEnd = new Date(account.current_period_start);
        periodEnd.setUTCMonth(periodEnd.getUTCMonth() + 1);
        const { count } = await admin
          .from("fiscal_dfe_documents")
          .select("id", { count: "exact", head: true })
          .in("company_id", fiscalIds)
          .neq("document_kind", "evento")
          .eq("full_xml", true)
          .gte("issue_date", account.current_period_start)
          .lt("issue_date", periodEnd.toISOString());
        used = Number(count || 0);
      }
      rows.push({
        ...common,
        access: {
          status: account.status,
          provider_status: null,
          billing_mode: account.access_source,
          provider: null,
          trial_ends_at: null,
          current_period_end: null,
          access_expires_at: account.access_expires_at,
          cancel_at_period_end: false,
          lifetime_access: Boolean(account.lifetime_access),
        },
        plan: {
          code: account.plan_code,
          name: account.plan_code || "Extrator Fiscal",
          price_cents: 0,
        },
        usage: {
          primary: used,
          primary_label: "XML íntegros no período",
          secondary: activeCompanies.length,
          secondary_label: activeCompanies.length === 1 ? "empresa ativa" : "empresas ativas",
          last_activity_at: null,
          limit: Number(account.monthly_xml_limit || 0),
        },
      });
    }

    rows.sort((a, b) => String(b.customer_since || "").localeCompare(String(a.customer_since || "")));

    const summary = {
      issuer: rows.filter((row) => row.product === "issuer").length,
      extractor: rows.filter((row) => row.product === "extractor").length,
      active: rows.filter((row) => ["active", "trialing"].includes(String(row.access.status))).length,
      overdue: rows.filter((row) => ["past_due", "overdue"].includes(String(row.access.status))).length,
      hidden_test_accounts: hiddenTestAccounts,
    };

    return json({ rows, summary, generated_at: new Date().toISOString() });
  } catch (error) {
    console.error("admin-subscriber-console", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});