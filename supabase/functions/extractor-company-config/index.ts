import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { consume, limited } from '../_shared/rate-limit.ts';
import {
  readJsonLimited,
  validateCertificateInput,
  RequestError,
} from '../_shared/request-guards.ts';
import { Buffer } from 'node:buffer';
import { lerCertificado } from 'npm:nfse-node@0.3.2/certificado';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const J = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'content-type': 'application/json' },
  });
const digits = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const clean = (v: unknown) => String(v ?? '').trim();
const E = new TextEncoder();
const b64 = (bytes: Uint8Array) => Buffer.from(bytes).toString('base64');

async function aesKey() {
  const secret =
    Deno.env.get('ACCOUNTING_ENGINE_SESSION_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw new Error('Chave de criptografia do cofre fiscal não configurada.');
  const digest = await crypto.subtle.digest('SHA-256', E.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt']);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    await aesKey(),
    E.encode(value)
  );
  return { ciphertext: b64(new Uint8Array(cipher)), iv: b64(iv) };
}

async function extractorContext(req: Request) {
  const auth = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!auth) throw Object.assign(new Error('Não autenticado'), { status: 401 });
  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!user) throw Object.assign(new Error('Não autenticado'), { status: 401 });
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  const platformAdmin = roles?.some((r: any) => r.role === 'admin') || false;
  const { data: members, error: memberError } = await admin
    .from('organization_members')
    .select('organization_id,role,status')
    .eq('user_id', user.id)
    .eq('status', 'active');
  if (memberError) throw memberError;
  const orgs = (members || [])
    .filter((m: any) => platformAdmin || ['owner', 'admin'].includes(String(m.role)))
    .map((m: any) => String(m.organization_id));
  if (!orgs.length)
    throw Object.assign(
      new Error('Sua conta não possui permissão para gerenciar empresas do Extrator.'),
      { status: 403 }
    );
  const { data: accounts, error: accountError } = await admin
    .from('extractor_accounts')
    .select('id,organization_id,status,lifetime_access,access_expires_at,name')
    .in('organization_id', orgs)
    .eq('status', 'active')
    .order('created_at');
  if (accountError) throw accountError;
  const now = Date.now();
  const account = (accounts || []).find(
    (a: any) =>
      a.lifetime_access === true ||
      (a.access_expires_at && new Date(a.access_expires_at).getTime() > now)
  );
  if (!account)
    throw Object.assign(new Error('O pacote Extrator não está ativo para esta conta.'), {
      status: 403,
    });
  return { admin, user, account, auth, url, platformAdmin };
}

async function registryLookup(ctx: any, cnpj: string) {
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
  try {
    const response = await fetch(`${ctx.url}/functions/v1/saas-registry-lookup`, {
      method: 'POST',
      headers: { authorization: ctx.auth, apikey: anon, 'content-type': 'application/json' },
      body: JSON.stringify({ organization_id: ctx.account.organization_id, cnpj }),
      signal: AbortSignal.timeout(30000),
    });
    const data = (await response.json().catch(() => ({}))) as any;
    if (response.ok && data?.ok) return data;
    console.warn('extractor registry lookup', response.status, data?.error || data);
  } catch (error) {
    console.warn('extractor registry lookup failed', error);
  }
  return null;
}

const regime = (value: unknown) => {
  const v = clean(value).toLowerCase();
  if (v === 'mei' || v === 'simples') return 'simples_nacional';
  if (v === 'presumido') return 'lucro_presumido';
  if (v === 'real') return 'lucro_real';
  return v || null;
};
const bounded = (value: unknown, max: number) => clean(value).slice(0, max);
const companyOverrides = (value: any) => ({
  trade_name: bounded(value?.trade_name, 120) || null,
  state_registration: digits(value?.state_registration).slice(0, 20) || null,
  municipality: bounded(value?.municipality, 120) || null,
  phone: bounded(value?.phone, 24) || null,
  address: {
    street: bounded(value?.address?.street, 160) || null,
    number: bounded(value?.address?.number, 30) || null,
    district: bounded(value?.address?.district, 100) || null,
    postal_code: digits(value?.address?.postal_code).slice(0, 8) || null,
    complement: bounded(value?.address?.complement, 120) || null,
  },
});

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);
  try {
    const ctx = await extractorContext(req);
    const body = await readJsonLimited(req, 2900000);
    const action = String(body.action || 'add_from_certificate');
    const denied = limited(
      await consume(
        ctx.admin,
        'extractor_config_' + (['list','list_office_clients'].includes(action) ? 'read' : 'write'),
        ctx.user.id,
        ['list','list_office_clients'].includes(action) ? 60 : 6,
        600
      )
    );
    if (denied) return denied;

    if (action === 'save_account') {
      const name = clean(body.name);
      if (name.length < 2 || name.length > 120)
        return J({ error: 'Informe um nome entre 2 e 120 caracteres.' }, 422);
      const { data, error } = await ctx.admin
        .from('extractor_accounts')
        .update({ name })
        .eq('id', ctx.account.id)
        .select('id,name')
        .single();
      if (error) throw error;
      return J({ ok: true, account: data });
    }

    if (action === 'list') {
      const { data, error } = await ctx.admin
        .from('extractor_companies')
        .select(
          'id,status,automatic_sync,fiscal_company_id,profile_overrides,created_at,updated_at,fiscal_companies(id,cnpj,razao_social,nome_fantasia,inscricao_estadual,uf,municipio,codigo_municipio,last_sync_at,status,regime_tributario,ambiente_padrao,endereco,created_at,updated_at,fiscal_certificates(id,certificate_name,holder_cnpj,holder_name,valid_from,valid_until,is_active,created_at))'
        )
        .eq('account_id', ctx.account.id)
        .neq('status', 'removed')
        .order('created_at');
      if (error) throw error;
      return J({ ok: true, companies: data || [] });
    }

    if (action === 'list_office_clients') {
      if (!ctx.platformAdmin) return J({ error: 'Disponível apenas no acesso administrativo da WS.' }, 403);

      const { data: officeCompanies, error: officeError } = await ctx.admin
        .from('companies')
        .select('id,cnpj,company_name,trade_name,state_registration,tax_regime,email,phone,postal_code,street,street_number,complement,district,city,state,city_ibge_code,company_size')
        .order('company_name');
      if (officeError) throw officeError;

      const officeIds = (officeCompanies || []).map((row: any) => row.id);
      let fiscalRows: any[] = [];
      if (officeIds.length) {
        const { data, error } = await ctx.admin
          .from('fiscal_companies')
          .select('id,company_id,cnpj,razao_social,nome_fantasia,inscricao_estadual,uf,municipio,codigo_municipio,status,fiscal_certificates(id,is_active,valid_until)')
          .in('company_id', officeIds);
        if (error) throw error;
        fiscalRows = data || [];
      }

      const { data: currentLinks, error: linkError } = await ctx.admin
        .from('extractor_companies')
        .select('fiscal_company_id,status')
        .eq('account_id', ctx.account.id)
        .neq('status', 'removed');
      if (linkError) throw linkError;
      const linked = new Set((currentLinks || []).map((row: any) => String(row.fiscal_company_id)));
      const fiscalByOffice = new Map(fiscalRows.map((row: any) => [String(row.company_id), row]));

      const companies = (officeCompanies || [])
        .filter((row: any) => digits(row.cnpj).length === 14)
        .map((row: any) => {
          const fiscal = fiscalByOffice.get(String(row.id)) || null;
          const certs = Array.isArray(fiscal?.fiscal_certificates) ? fiscal.fiscal_certificates : [];
          const activeCert = certs.find((item: any) => {
            if (!item?.is_active) return false;
            if (!item?.valid_until) return true;
            const end = new Date(`${item.valid_until}T23:59:59`);
            return !Number.isNaN(end.getTime()) && end.getTime() >= Date.now();
          }) || null;
          return {
            office_company_id: row.id,
            company_name: row.company_name,
            trade_name: row.trade_name,
            cnpj: digits(row.cnpj),
            state_registration: row.state_registration,
            city: row.city,
            state: row.state,
            fiscal_company_id: fiscal?.id || null,
            already_linked: Boolean(fiscal?.id && linked.has(String(fiscal.id))),
            certificate: activeCert
              ? { configured: true, valid_until: activeCert.valid_until }
              : { configured: false, valid_until: null },
          };
        })
        .filter((row: any) => row.certificate.configured);

      return J({ ok: true, companies });
    }

    if (action === 'import_office_client') {
      if (!ctx.platformAdmin) return J({ error: 'Disponível apenas no acesso administrativo da WS.' }, 403);
      const officeCompanyId = String(body.office_company_id || '');
      if (!officeCompanyId) return J({ error: 'Selecione um cliente do painel.' }, 422);

      const { data: office, error: officeError } = await ctx.admin
        .from('companies')
        .select('id,cnpj,company_name,trade_name,state_registration,tax_regime,email,phone,postal_code,street,street_number,complement,district,city,state,city_ibge_code,company_size,registry_payload')
        .eq('id', officeCompanyId)
        .maybeSingle();
      if (officeError) throw officeError;
      if (!office) return J({ error: 'Cliente não encontrado no painel administrativo.' }, 404);

      const cnpj = digits(office.cnpj);
      if (cnpj.length !== 14) return J({ error: 'Somente clientes com CNPJ podem ser importados para o Extrator.' }, 422);

      const { data: eligibleFiscal, error: eligibleError } = await ctx.admin
        .from('fiscal_companies')
        .select('id,fiscal_certificates(id,is_active,valid_until)')
        .eq('company_id', office.id)
        .maybeSingle();
      if (eligibleError) throw eligibleError;
      const eligibleCerts = Array.isArray(eligibleFiscal?.fiscal_certificates)
        ? eligibleFiscal.fiscal_certificates
        : [];
      const validA1 = eligibleCerts.some((item: any) => {
        if (!item?.is_active) return false;
        if (!item?.valid_until) return true;
        const end = new Date(`${item.valid_until}T23:59:59`);
        return !Number.isNaN(end.getTime()) && end.getTime() >= Date.now();
      });
      if (!eligibleFiscal?.id || !validA1) {
        return J({ error: 'Esta empresa só pode ser importada depois que o certificado A1 estiver ativo e válido no Painel do Administrador.' }, 422);
      }

      let { data: fiscal, error: fiscalError } = await ctx.admin
        .from('fiscal_companies')
        .select('id,company_id,cnpj,razao_social,nome_fantasia,inscricao_estadual,uf,municipio,codigo_municipio,status')
        .eq('company_id', office.id)
        .maybeSingle();
      if (fiscalError) throw fiscalError;

      if (!fiscal) {
        const byCnpj = await ctx.admin
          .from('fiscal_companies')
          .select('id,company_id,cnpj,razao_social,nome_fantasia,inscricao_estadual,uf,municipio,codigo_municipio,status')
          .eq('cnpj', cnpj)
          .maybeSingle();
        if (byCnpj.error) throw byCnpj.error;
        fiscal = byCnpj.data || null;
      }

      const fiscalPayload = {
        company_id: office.id,
        cnpj,
        razao_social: office.company_name,
        nome_fantasia: office.trade_name || office.company_name,
        inscricao_estadual: office.state_registration || null,
        endereco: {
          logradouro: office.street || '',
          numero: office.street_number || '',
          bairro: office.district || '',
          cep: office.postal_code || '',
          complemento: office.complement || '',
        },
        uf: office.state || null,
        codigo_municipio: office.city_ibge_code || null,
        municipio: office.city || null,
        regime_tributario: regime(office.tax_regime),
        ambiente_padrao: 'producao',
        status: 'ativa',
        updated_at: new Date().toISOString(),
        fiscal_settings: {
          origin_scope: 'office_client',
          extractor_account_id: ctx.account.id,
          imported_from_admin_at: new Date().toISOString(),
        },
      };

      if (fiscal?.id) {
        if (fiscal.company_id && String(fiscal.company_id) !== String(office.id)) {
          return J({ error: 'Este CNPJ já está vinculado a outro cliente do escritório.' }, 409);
        }
        const updated = await ctx.admin
          .from('fiscal_companies')
          .update(fiscalPayload)
          .eq('id', fiscal.id)
          .select('id,cnpj,razao_social,nome_fantasia,uf,municipio')
          .single();
        if (updated.error) throw updated.error;
        fiscal = updated.data;
      } else {
        const created = await ctx.admin
          .from('fiscal_companies')
          .insert({ ...fiscalPayload, created_by: ctx.user.id })
          .select('id,cnpj,razao_social,nome_fantasia,uf,municipio')
          .single();
        if (created.error) throw created.error;
        fiscal = created.data;
      }

      const { data: existingLink, error: existingLinkError } = await ctx.admin
        .from('extractor_companies')
        .select('id,status')
        .eq('account_id', ctx.account.id)
        .eq('fiscal_company_id', fiscal.id)
        .maybeSingle();
      if (existingLinkError) throw existingLinkError;

      if (existingLink?.id) {
        const { error } = await ctx.admin
          .from('extractor_companies')
          .update({ status: 'active', automatic_sync: true, updated_at: new Date().toISOString() })
          .eq('id', existingLink.id);
        if (error) throw error;
      } else {
        const { error } = await ctx.admin.from('extractor_companies').insert({
          account_id: ctx.account.id,
          fiscal_company_id: fiscal.id,
          status: 'active',
          automatic_sync: true,
          profile_overrides: {},
        });
        if (error?.code === 'P0001' && String(error.message || '').includes('extractor_company_limit_reached')) {
          throw new RequestError('O limite de empresas deste plano foi atingido.', 422);
        }
        if (error) throw error;
      }

      await ctx.admin.from('saas_audit_logs').insert({
        organization_id: ctx.account.organization_id,
        actor_user_id: ctx.user.id,
        action: 'extractor_office_company_imported',
        resource_type: 'fiscal_company',
        resource_id: fiscal.id,
        is_sensitive: false,
        metadata: { office_company_id: office.id, extractor_account_id: ctx.account.id },
      });

      return J({
        ok: true,
        already_linked: Boolean(existingLink?.id && existingLink.status !== 'removed'),
        company: {
          id: fiscal.id,
          cnpj: fiscal.cnpj,
          legal_name: fiscal.razao_social,
          trade_name: fiscal.nome_fantasia,
          state: fiscal.uf,
          city: fiscal.municipio,
        },
      });
    }

    if (action === 'update_profile') {
      const companyId = String(body.company_id || '');
      if (!companyId) return J({ error: 'Empresa inválida.' }, 422);
      const profile = companyOverrides(body.profile || {});
      const { data, error } = await ctx.admin
        .from('extractor_companies')
        .update({ profile_overrides: profile, updated_at: new Date().toISOString() })
        .eq('account_id', ctx.account.id)
        .eq('fiscal_company_id', companyId)
        .neq('status', 'removed')
        .select('id,profile_overrides')
        .maybeSingle();
      if (error) throw error;
      if (!data) return J({ error: 'Empresa não encontrada nesta conta.' }, 404);
      await ctx.admin.from('saas_audit_logs').insert({
        organization_id: ctx.account.organization_id,
        actor_user_id: ctx.user.id,
        action: 'extractor_company_profile_updated',
        resource_type: 'fiscal_company',
        resource_id: companyId,
        is_sensitive: false,
        metadata: { fields: Object.keys(profile) },
      });
      return J({ ok: true, profile: data.profile_overrides || {} });
    }

    if (action === 'remove') {
      const companyId = String(body.company_id || '');
      if (!companyId) return J({ error: 'Empresa inválida.' }, 422);
      const { data: removed, error } = await ctx.admin
        .from('extractor_companies')
        .update({ status: 'removed', updated_at: new Date().toISOString() })
        .eq('account_id', ctx.account.id)
        .eq('fiscal_company_id', companyId)
        .select('id');
      if (error) throw error;
      if (!removed?.length) return J({ error: 'Empresa não encontrada nesta conta.' }, 404);
      return J({ ok: true });
    }

    if (action !== 'add_from_certificate') return J({ error: 'Ação inválida.' }, 400);
    const pfx = String(body.certificate_base64 || '');
    const password = String(body.certificate_password || '');
    if (!pfx || !password)
      return J({ error: 'Selecione o certificado A1 e informe a senha.' }, 422);

    validateCertificateInput(pfx, password, body.certificate_name);
    let cert: any;
    try {
      cert = lerCertificado(Buffer.from(pfx, 'base64'), password);
    } catch {
      return J(
        { error: 'Não foi possível abrir o certificado. Confira o arquivo e a senha.' },
        422
      );
    }
    const cnpj = digits(cert.titular.cnpj);
    if (cnpj.length !== 14)
      return J({ error: 'O certificado A1 não possui um CNPJ empresarial válido.' }, 422);
    const validUntil = cert.validadeFim as Date;
    if (
      !Number.isFinite(validUntil?.getTime()) ||
      validUntil.getTime() < Date.now() ||
      cert.validadeInicio?.getTime() > Date.now()
    )
      return J(
        { error: `O certificado A1 venceu em ${validUntil.toLocaleDateString('pt-BR')}.` },
        422
      );

    const registry = await registryLookup(ctx, cnpj);
    const d = registry?.data || {};
    const now = new Date().toISOString();
    const companyPayload: any = {
      cnpj,
      razao_social: clean(d.legal_name) || clean(cert.titular.nome) || `CNPJ ${cnpj}`,
      nome_fantasia: clean(d.trade_name) || null,
      inscricao_estadual: digits(d.state_registration) || null,
      endereco: {
        logradouro: clean(d.street),
        numero: clean(d.street_number),
        bairro: clean(d.district),
        cep: digits(d.postal_code),
        complemento: clean(d.complement),
      },
      uf: clean(d.state).toUpperCase() || null,
      codigo_municipio: digits(d.city_ibge_code) || null,
      municipio: clean(d.city) || null,
      regime_tributario: regime(d.tax_regime),
      ambiente_padrao: 'producao',
      status: 'ativa',
      updated_at: now,
      fiscal_settings: {
        origin_scope: 'extractor',
        extractor_account_id: ctx.account.id,
        registry_sources: registry?.sources || {},
        registry_checked_at: now,
      },
    };

    const pfxCrypt = await encrypt(pfx),
      passCrypt = await encrypt(password);
    const { data: companyId, error: saveError } = await ctx.admin.rpc(
      'extractor_save_verified_certificate',
      {
        p_account_id: ctx.account.id,
        p_actor_id: ctx.user.id,
        p_company: companyPayload,
        p_certificate: {
          certificate_name: body.certificate_name,
          certificate_ciphertext: pfxCrypt.ciphertext,
          certificate_iv: pfxCrypt.iv,
          password_ciphertext: passCrypt.ciphertext,
          password_iv: passCrypt.iv,
          holder_cnpj: cnpj,
          holder_name: cert.titular.nome || null,
          valid_from: cert.validadeInicio.toISOString().slice(0, 10),
          valid_until: cert.validadeFim.toISOString().slice(0, 10),
          serial_number: String(cert.serialNumber || '') || null,
        },
      }
    );
    if (saveError?.code === '42501')
      throw new RequestError(
        'Sua conta não tem permissão para vincular esta empresa ao Extrator.',
        403
      );
    if (
      saveError?.code === 'P0001' &&
      String(saveError?.message || '').includes('extractor_company_limit_reached')
    )
      throw new RequestError(
        'Você atingiu o limite de empresas do seu plano. Faça upgrade para adicionar outra empresa.',
        422
      );
    if (saveError || !companyId) throw saveError || new Error('save_failed');
    // Scheduled workers pick up the committed queue, preserving save certainty.
    return J({
      ok: true,
      company: {
        id: companyId,
        cnpj,
        legal_name: companyPayload.razao_social,
        trade_name: companyPayload.nome_fantasia,
        state_registration: companyPayload.inscricao_estadual,
        state: companyPayload.uf,
        city: companyPayload.municipio,
        city_ibge_code: companyPayload.codigo_municipio,
        certificate_valid_until: cert.validadeFim.toISOString().slice(0, 10),
      },
      registry_found: Boolean(registry?.ok),
      state_registry_found: Boolean(digits(d.state_registration)),
    });
  } catch (error: any) {
    console.error('extractor-company-config', { code: error?.code || 'request_failed' });
    const status =
      error instanceof RequestError
        ? error.status
        : [401, 403].includes(error?.status)
          ? error.status
          : 500;
    return J(
      {
        error:
          status < 500
            ? error.message
            : 'Não foi possível salvar agora. Os dados anteriores foram preservados. Tente novamente.',
      },
      status
    );
  }
});
