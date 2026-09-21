import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { readJsonLimited, RequestError } from "../_shared/request-guards.ts";
import { consume, limited } from "../_shared/rate-limit.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const J = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "content-type": "application/json" },
  });
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const clean = (value: unknown) => String(value ?? "").trim();

async function adminContext(req: Request) {
  const authorization =
    req.headers.get("authorization") || req.headers.get("Authorization") || "";
  if (!authorization) throw new RequestError("Não autenticado", 401);

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const {
    data: { user },
  } = await admin.auth.getUser(authorization.replace(/^Bearer\s+/i, ""));
  if (!user) throw new RequestError("Não autenticado", 401);

  const { data: roles, error: roleError } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id);
  if (roleError) throw roleError;
  if (!(roles || []).some((row: any) => row.role === "admin")) {
    throw new RequestError("Disponível apenas para administradores da WS.", 403);
  }

  const rate = limited(await consume(admin, "admin-issuer-context", user.id, 180, 600));
  if (rate) return { denied: rate };
  return { admin, user };
}

async function aesKey() {
  const secret =
    Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") ||
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("Chave do cofre fiscal indisponível.");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`ws-fiscal-vault:${secret}`),
  );
  return crypto.subtle.importKey(
    "raw",
    digest,
    { name: "AES-GCM" },
    false,
    ["decrypt"],
  );
}

async function decryptVaultValue(ciphertext: string, iv: string) {
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: Buffer.from(iv, "base64") },
    await aesKey(),
    Buffer.from(ciphertext, "base64"),
  );
  return new TextDecoder().decode(plain);
}

function normalizeRegime(value: unknown) {
  const raw = clean(value).toLowerCase();
  if (!raw) return null;
  if (raw.includes("mei")) return "mei";
  if (raw.includes("simples")) return "simples";
  if (raw.includes("presum")) return "presumido";
  if (raw.includes("real")) return "real";
  return raw;
}

function crtFromRegime(value: string | null) {
  if (value === "simples") return "1";
  if (value === "presumido" || value === "real") return "3";
  return null;
}

async function resolveFiscalCompany(admin: any, office: any) {
  let query = await admin
    .from("fiscal_companies")
    .select(
      "id,company_id,cnpj,razao_social,nome_fantasia,inscricao_estadual,inscricao_municipal,endereco,uf,codigo_municipio,municipio,regime_tributario,ambiente_padrao,status,fiscal_settings",
    )
    .eq("company_id", office.id)
    .maybeSingle();
  if (query.error) throw query.error;
  if (query.data) return query.data;

  const cnpj = digits(office.cnpj || office.document_number);
  if (cnpj.length !== 14) return null;
  query = await admin
    .from("fiscal_companies")
    .select(
      "id,company_id,cnpj,razao_social,nome_fantasia,inscricao_estadual,inscricao_municipal,endereco,uf,codigo_municipio,municipio,regime_tributario,ambiente_padrao,status,fiscal_settings",
    )
    .eq("cnpj", cnpj)
    .maybeSingle();
  if (query.error) throw query.error;
  return query.data || null;
}

async function selectCompany(admin: any, user: any, officeCompanyId: string) {
  const { data: office, error: officeError } = await admin
    .from("companies")
    .select(
      "id,company_name,trade_name,cnpj,document_type,document_number,state_registration,tax_regime,email,phone,postal_code,street,street_number,complement,district,city,state,city_ibge_code,cnae_primary,registry_payload",
    )
    .eq("id", officeCompanyId)
    .maybeSingle();
  if (officeError) throw officeError;
  if (!office) throw new RequestError("Cliente não encontrado no painel administrativo.", 404);

  const cnpj = digits(office.cnpj || office.document_number);
  if (cnpj.length !== 14) {
    throw new RequestError("A emissão administrativa exige um cliente com CNPJ válido.", 422);
  }

  const fiscal = await resolveFiscalCompany(admin, office);
  if (!fiscal?.id) {
    throw new RequestError(
      "Este cliente ainda não possui perfil fiscal vinculado. Configure o A1 no cadastro do cliente.",
      422,
    );
  }

  const { data: certificates, error: certificateError } = await admin
    .from("fiscal_certificates")
    .select(
      "id,company_id,certificate_name,valid_from,valid_until,is_active,certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,holder_cnpj,holder_name,serial_number",
    )
    .eq("company_id", fiscal.id)
    .eq("is_active", true)
    .order("valid_until", { ascending: false });
  if (certificateError) throw certificateError;

  const now = Date.now();
  const certificate = (certificates || []).find((item: any) => {
    const start = item.valid_from
      ? new Date(`${item.valid_from}T00:00:00-03:00`).getTime()
      : 0;
    const end = item.valid_until
      ? new Date(`${item.valid_until}T23:59:59-03:00`).getTime()
      : 0;
    return (
      end >= now &&
      (!start || start <= now) &&
      clean(item.certificate_ciphertext) &&
      clean(item.certificate_iv) &&
      clean(item.password_ciphertext) &&
      clean(item.password_iv)
    );
  });
  if (!certificate) {
    throw new RequestError(
      "Este cliente não possui certificado A1 ativo e válido para emissão.",
      422,
    );
  }
  if (digits(certificate.holder_cnpj) && digits(certificate.holder_cnpj) !== cnpj) {
    throw new RequestError("O A1 vinculado não pertence ao CNPJ selecionado.", 409);
  }

  const slug = `ws-office-issuer-${office.id}`;
  let { data: organization, error: orgError } = await admin
    .from("organizations")
    .select("id,name,slug,status,owner_user_id")
    .eq("slug", slug)
    .maybeSingle();
  if (orgError) throw orgError;

  const displayName = office.trade_name || office.company_name;
  if (!organization) {
    const inserted = await admin
      .from("organizations")
      .insert({
        name: displayName,
        slug,
        status: "active",
        owner_user_id: user.id,
      })
      .select("id,name,slug,status,owner_user_id")
      .single();
    if (inserted.error) throw inserted.error;
    organization = inserted.data;
  } else if (
    organization.name !== displayName ||
    organization.status !== "active"
  ) {
    const updated = await admin
      .from("organizations")
      .update({ name: displayName, status: "active", updated_at: new Date().toISOString() })
      .eq("id", organization.id)
      .select("id,name,slug,status,owner_user_id")
      .single();
    if (updated.error) throw updated.error;
    organization = updated.data;
  }

  const membership = await admin.from("organization_members").upsert(
    {
      organization_id: organization.id,
      user_id: user.id,
      role: "admin",
      status: "active",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "organization_id,user_id" },
  );
  if (membership.error) throw membership.error;

  const { data: existingProfile, error: profileError } = await admin
    .from("saas_company_fiscal_profiles")
    .select("*")
    .eq("organization_id", organization.id)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (profileError) throw profileError;

  const address = fiscal.endereco || {};
  const regime = normalizeRegime(office.tax_regime || fiscal.regime_tributario);
  const identity = {
    company_id: office.id,
    legal_name: office.company_name || fiscal.razao_social,
    trade_name: office.trade_name || fiscal.nome_fantasia || office.company_name,
    tax_id: cnpj,
    state_registration:
      office.state_registration || fiscal.inscricao_estadual || null,
    municipal_registration: fiscal.inscricao_municipal || null,
    tax_regime: regime,
    cnae_primary: office.cnae_primary || null,
    phone: office.phone || null,
    email: office.email || null,
    postal_code: digits(office.postal_code || address.cep) || null,
    street: office.street || address.logradouro || null,
    street_number: office.street_number || address.numero || null,
    complement: office.complement || address.complemento || null,
    district: office.district || address.bairro || null,
    city: office.city || fiscal.municipio || null,
    state: office.state || fiscal.uf || null,
    city_ibge_code: digits(office.city_ibge_code || fiscal.codigo_municipio) || null,
    certificate_expires_at: certificate.valid_until
      ? `${certificate.valid_until}T23:59:59-03:00`
      : null,
    certificate_subject: certificate.holder_name || null,
    updated_at: new Date().toISOString(),
  };

  let profile: any;
  if (!existingProfile) {
    const inserted = await admin
      .from("saas_company_fiscal_profiles")
      .insert({
        organization_id: organization.id,
        ...identity,
        business_mode: "mixed",
        fiscal_environment: "homologation",
        enabled_documents: [],
        crt: crtFromRegime(regime),
        series_nfe: 1,
        next_number_nfe: 1,
        series_nfce: 1,
        next_number_nfce: 1,
        series_nfse: "1",
        next_number_nfse: 1,
        series_cte: "1",
        next_number_cte: 1,
        series_mdfe: "1",
        next_number_mdfe: 1,
        notes: "Workspace interno do escritório para emissão em nome do cliente.",
      })
      .select("*")
      .single();
    if (inserted.error) throw inserted.error;
    profile = inserted.data;
  } else {
    const updated = await admin
      .from("saas_company_fiscal_profiles")
      .update({
        ...identity,
        crt: existingProfile.crt || crtFromRegime(regime),
      })
      .eq("id", existingProfile.id)
      .select("*")
      .single();
    if (updated.error) throw updated.error;
    profile = updated.data;
  }

  const pfxBase64 = await decryptVaultValue(
    String(certificate.certificate_ciphertext),
    String(certificate.certificate_iv),
  );
  const password = await decryptVaultValue(
    String(certificate.password_ciphertext),
    String(certificate.password_iv),
  );
  const { error: bundleError } = await admin.rpc("set_saas_certificate_bundle", {
    _org_id: organization.id,
    _pfx_base64: pfxBase64,
    _password: password,
  });
  if (bundleError) throw bundleError;

  const audit = await admin.from("saas_audit_logs").insert({
    organization_id: organization.id,
    actor_user_id: user.id,
    action: "admin_issuer_company_selected",
    resource_type: "office_company",
    resource_id: office.id,
    is_sensitive: true,
    metadata: {
      fiscal_company_id: fiscal.id,
      certificate_id: certificate.id,
      certificate_valid_until: certificate.valid_until,
      source: "admin_issuer_context",
    },
  });
  if (audit.error) console.warn("admin issuer audit", audit.error.code || audit.error.message);

  return {
    ok: true,
    organization: {
      id: organization.id,
      name: displayName,
      slug: organization.slug,
      office_company_id: office.id,
      cnpj,
    },
    profile: {
      id: profile.id,
      company_id: office.id,
      legal_name: profile.legal_name,
      trade_name: profile.trade_name,
      tax_id: profile.tax_id,
      fiscal_environment: profile.fiscal_environment,
      certificate_expires_at: identity.certificate_expires_at,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return J({ error: "Método não permitido" }, 405);
  try {
    const ctx: any = await adminContext(req);
    if (ctx.denied) return ctx.denied;
    const body = await readJsonLimited(req, 65536);
    const companyId = clean(body.company_id);
    if (!companyId) throw new RequestError("Selecione uma empresa emitente.", 422);
    return J(await selectCompany(ctx.admin, ctx.user, companyId));
  } catch (error) {
    console.error("admin-issuer-context", error);
    return J(
      {
        error:
          error instanceof RequestError
            ? error.message
            : "Não foi possível preparar a empresa emitente agora.",
      },
      error instanceof RequestError ? error.status : 500,
    );
  }
});
