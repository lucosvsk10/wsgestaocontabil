import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { Buffer } from 'node:buffer';
import { lerCertificado } from 'npm:nfse-node@0.3.2/certificado';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

const DEFAULT_CLIENT_PASSWORD = '5BWasgc1@';
const enc = new TextEncoder();
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const clean = (value: unknown) => String(value ?? '').trim();
const normalizeUsername = (value: unknown) => clean(value).toLowerCase();
const validUsername = (value: string) => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value);
const bool = (value: unknown) => typeof value === 'boolean'
  ? value
  : ['s','sim','true','1','yes'].includes(clean(value).toLowerCase());

const b64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));
async function aesKey() {
  const secret = Deno.env.get('ACCOUNTING_ENGINE_SESSION_SECRET') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!secret) throw new Error('Chave do cofre não configurada.');
  const digest = await crypto.subtle.digest('SHA-256', enc.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt']);
}
async function encrypt(value: string) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await aesKey(), enc.encode(value));
  return { ciphertext: b64(new Uint8Array(cipher)), iv: b64(iv) };
}

function regimeFromText(value: unknown) {
  const text = clean(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
  if (text.includes('MEI') || text.includes('MICROEMPREENDEDOR INDIVIDUAL')) return 'mei';
  if (text.includes('SIMPLES')) return 'simples';
  if (text.includes('PRESUMIDO')) return 'presumido';
  if (text.includes('LUCRO REAL') || text === 'REAL') return 'real';
  return '';
}
function detectTaxRegime(raw: any) {
  if (bool(raw?.simples?.mei ?? raw?.opcao_pelo_mei)) return 'mei';
  if (bool(raw?.simples?.simples ?? raw?.opcao_pelo_simples)) return 'simples';
  const history = Array.isArray(raw?.regime_tributario) ? [...raw.regime_tributario] : [];
  history.sort((a: any,b: any) => Number(b?.ano || 0) - Number(a?.ano || 0));
  for (const item of history) {
    const value = regimeFromText(item?.forma_de_tributacao || item?.regime_tributario || item?.descricao);
    if (value) return value;
  }
  return '';
}
async function fetchJson(url: string, timeoutMs = 15000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: 'application/json', 'User-Agent': 'WS-Gestao-Contabil/1.0' },
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timer);
  }
}
const ieValue = (item: any) =>
  digits(item?.inscricao_estadual ?? item?.inscricao ?? item?.numero ?? item?.ie ?? item?.value);
const ieUf = (item: any) => clean(item?.estado?.sigla ?? item?.uf ?? item?.estado).toUpperCase();

function normalizeCnpjWs(raw: any, cnpj: string) {
  const e = raw?.estabelecimento || {};
  const state = clean(e?.estado?.sigla ?? e?.uf).toUpperCase();
  const ies = Array.isArray(e?.inscricoes_estaduais)
    ? e.inscricoes_estaduais.filter((x:any)=>x?.ativo !== false && ieValue(x))
    : [];
  const ie = ies.find((x:any)=>ieUf(x) === state) || ies[0] || null;
  const primary = e?.atividade_principal || {};
  const regime = detectTaxRegime(raw);
  return {
    company_name: clean(raw?.razao_social),
    trade_name: clean(e?.nome_fantasia),
    cnpj,
    state_registration: ieValue(ie),
    registration_status: clean(e?.situacao_cadastral),
    tax_regime: regime,
    email: clean(e?.email),
    phone: digits([clean(e?.ddd1), clean(e?.telefone1)].filter(Boolean).join('')),
    postal_code: digits(e?.cep),
    street: [clean(e?.tipo_logradouro), clean(e?.logradouro)].filter(Boolean).join(' '),
    street_number: clean(e?.numero),
    complement: clean(e?.complemento),
    district: clean(e?.bairro),
    city: clean(e?.cidade?.nome),
    state,
    city_ibge_code: digits(e?.cidade?.ibge_id),
    cnae_primary: digits(primary?.id),
    company_size: clean(raw?.porte?.descricao || raw?.porte),
    registry_payload: {
      opening_date: clean(e?.data_inicio_atividade),
      legal_nature: clean(raw?.natureza_juridica?.descricao || raw?.natureza_juridica),
      share_capital: Number(raw?.capital_social || 0) || null,
      primary_cnae_description: clean(primary?.descricao),
      state_registrations: ies.map((x:any)=>({ state: ieUf(x), ie: ieValue(x), active: x?.ativo !== false })).filter((x:any)=>x.ie),
      source: 'CNPJ.ws',
    },
  };
}
function normalizeBrasilApi(raw: any, cnpj: string) {
  return {
    company_name: clean(raw?.razao_social),
    trade_name: clean(raw?.nome_fantasia),
    cnpj,
    state_registration: '',
    registration_status: clean(raw?.descricao_situacao_cadastral),
    tax_regime: detectTaxRegime(raw),
    email: clean(raw?.email),
    phone: digits(raw?.ddd_telefone_1),
    postal_code: digits(raw?.cep),
    street: [clean(raw?.descricao_tipo_de_logradouro), clean(raw?.logradouro)].filter(Boolean).join(' '),
    street_number: clean(raw?.numero),
    complement: clean(raw?.complemento),
    district: clean(raw?.bairro),
    city: clean(raw?.municipio),
    state: clean(raw?.uf).toUpperCase(),
    city_ibge_code: digits(raw?.codigo_municipio_ibge),
    cnae_primary: digits(raw?.cnae_fiscal),
    company_size: clean(raw?.porte),
    registry_payload: {
      opening_date: clean(raw?.data_inicio_atividade),
      legal_nature: clean(raw?.natureza_juridica),
      share_capital: Number(raw?.capital_social || 0) || null,
      primary_cnae_description: clean(raw?.cnae_fiscal_descricao),
      source: 'BrasilAPI',
    },
  };
}
function mergeCompany(primary: any, secondary: any, cnpj: string) {
  if (!primary && !secondary) throw new Error('Nenhuma fonte cadastral respondeu para este CNPJ.');
  const out: any = { cnpj, document_type: 'cnpj', document_number: cnpj };
  const keys = ['company_name','trade_name','state_registration','registration_status','tax_regime','email','phone','postal_code','street','street_number','complement','district','city','state','city_ibge_code','cnae_primary','company_size'];
  for (const key of keys) out[key] = clean(primary?.[key]) || clean(secondary?.[key]) || '';
  out.registry_payload = { ...(secondary?.registry_payload || {}), ...(primary?.registry_payload || {}) };
  return out;
}
async function lookupAlIe(admin: any, cnpj: string) {
  try {
    const { data } = await admin.from('_fiscal_vercel_gateway_token').select('token').eq('id', true).maybeSingle();
    if (!data?.token) return '';
    const response = await fetch('https://ws-nfse-sefin-probe.vercel.app/api/sefaz-al-registry', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.token}` },
      body: JSON.stringify({ cnpj }),
      signal: AbortSignal.timeout(60000),
    });
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload?.ok && payload?.found ? digits(payload.state_registration) : '';
  } catch {
    return '';
  }
}
async function lookupSintegra(cnpj: string) {
  const token = clean(Deno.env.get('SINTEGRAWS_TOKEN'));
  if (!token) return '';
  try {
    const url = new URL('https://www.sintegraws.com.br/api/v1/execute-api.php');
    url.searchParams.set('token', token);
    url.searchParams.set('cnpj', cnpj);
    url.searchParams.set('plugin', 'ST');
    const raw = await fetchJson(url.toString(), 20000);
    return raw?.status === 'OK' && String(raw?.code ?? '0') === '0' ? digits(raw?.inscricao_estadual) : '';
  } catch {
    return '';
  }
}
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function lookupCnpjWsViaDatabase(admin: any, cnpj: string) {
  try {
    const { data: requestId, error: requestError } = await admin.rpc(
      'internal_company_registry_request',
      { _cnpj: cnpj }
    );
    if (requestError || !requestId) return null;

    for (let attempt = 0; attempt < 12; attempt += 1) {
      if (attempt) await sleep(250);
      const { data, error } = await admin.rpc(
        'internal_company_registry_response',
        { _request_id: Number(requestId) }
      );
      if (error) return null;
      if (data && !data?._error) return data;
    }
  } catch {
    return null;
  }
  return null;
}

async function lookupRegistry(admin: any, cnpj: string) {
  const [ws, brasil] = await Promise.allSettled([
    fetchJson(`https://publica.cnpj.ws/cnpj/${cnpj}`),
    fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`),
  ]);
  let a = ws.status === 'fulfilled' ? normalizeCnpjWs(ws.value, cnpj) : null;
  const b = brasil.status === 'fulfilled' ? normalizeBrasilApi(brasil.value, cnpj) : null;

  if (!a?.state_registration) {
    const dbRaw = await lookupCnpjWsViaDatabase(admin, cnpj);
    if (dbRaw) a = normalizeCnpjWs(dbRaw, cnpj);
  }

  const company = mergeCompany(a, b, cnpj);
  if (!company.state_registration) {
    company.state_registration = company.state === 'AL' ? await lookupAlIe(admin, cnpj) : '';
    if (!company.state_registration) company.state_registration = await lookupSintegra(cnpj);
  }
  company.registry_payload = {
    ...(company.registry_payload || {}),
    looked_up_at: new Date().toISOString(),
    state_registration_found: Boolean(company.state_registration),
  };
  company.address = [company.street, company.street_number, company.complement, company.district, company.city, company.state, company.postal_code].filter(Boolean).join(', ');
  return company;
}
function parseCertificate(base64: string, password: string, name: string) {
  if (!base64 || !password || !/\.(pfx|p12)$/i.test(name)) throw new Error('Selecione o certificado A1 e informe a senha.');
  if (base64.length > 3_000_000) throw new Error('O certificado deve ter no máximo 2 MB.');
  const cert = lerCertificado(Buffer.from(base64, 'base64'), password);
  return {
    raw: cert,
    cnpj: digits(cert.titular.cnpj),
    holder_name: clean(cert.titular.nome),
    valid_from: cert.validadeInicio.toISOString().slice(0,10),
    valid_until: cert.validadeFim.toISOString().slice(0,10),
    serial_number: clean((cert as any).serialNumber),
  };
}
async function adminContext(req: Request) {
  const auth = req.headers.get('Authorization');
  if (!auth) throw new Error('Não autenticado');
  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: { user } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i,''));
  if (!user) throw new Error('Não autenticado');
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  if (!roles?.some((r:any)=>r.role === 'admin')) throw new Error('Acesso exclusivo para administradores');
  return { admin, user };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido' }, 405);

  let createdAuthUser: string | null = null;
  let createdOfficeCompany: string | null = null;
  let createdFiscalCompany: string | null = null;
  let adoptedFiscalCompany: string | null = null;

  try {
    const { admin, user } = await adminContext(req);
    const body = await req.json().catch(()=>({})) as Record<string,any>;
    const action = clean(body.action || 'lookup_cnpj');

    if (action === 'lookup_cnpj') {
      const cnpj = digits(body.cnpj);
      if (cnpj.length !== 14) return json({ error: 'Informe um CNPJ válido.' }, 422);
      return json({ ok: true, company: await lookupRegistry(admin, cnpj) });
    }

    if (action === 'inspect_certificate') {
      const cert = parseCertificate(clean(body.certificate_base64), clean(body.certificate_password), clean(body.certificate_name));
      if (cert.cnpj.length !== 14) return json({ error: 'O certificado não possui um CNPJ empresarial válido.' }, 422);
      let company: any;
      try {
        company = await lookupRegistry(admin, cert.cnpj);
      } catch {
        company = {
          company_name: cert.holder_name || '',
          trade_name: '',
          cnpj: cert.cnpj,
          document_type: 'cnpj',
          document_number: cert.cnpj,
          state_registration: '',
          registry_payload: { certificate_only: true },
        };
      }
      return json({
        ok: true,
        company,
        certificate: {
          holder_cnpj: cert.cnpj,
          holder_name: cert.holder_name,
          valid_from: cert.valid_from,
          valid_until: cert.valid_until,
        },
      });
    }

    if (action !== 'create') return json({ error: 'Ação inválida.' }, 400);

    const method = ['certificate','cnpj','manual'].includes(body.method) ? body.method : 'manual';
    const source = body.company || {};
    const documentType = source.document_type === 'cpf' ? 'cpf' : source.document_type === 'other' ? 'other' : 'cnpj';
    const documentNumber = documentType === 'other'
      ? clean(source.document_number || source.cnpj)
      : digits(source.document_number || source.cnpj);
    const cnpj = documentType === 'cnpj' ? digits(documentNumber) : '';
    const companyName = clean(source.company_name || source.legal_name);
    const tradeName = clean(source.trade_name);
    const username = normalizeUsername(body.username);
    if (!companyName) return json({ error: 'Informe a razão social ou nome do cliente.' }, 422);
    if (!validUsername(username)) return json({ error: 'Usuário inválido. Use 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.' }, 422);
    if (documentType === 'cnpj' && cnpj.length !== 14) return json({ error: 'CNPJ inválido.' }, 422);
    if (documentType === 'cpf' && documentNumber.length !== 11) return json({ error: 'CPF inválido.' }, 422);
    if (documentType === 'other' && documentNumber.length < 3) return json({ error: 'Informe um documento válido.' }, 422);

    const [{ data: duplicateCompany }, { data: duplicateUser }] = await Promise.all([
      admin.from('companies').select('id').eq('document_number', documentNumber).maybeSingle(),
      admin.from('users').select('id').ilike('username', username).maybeSingle(),
    ]);
    if (duplicateCompany?.id) return json({ error: 'Já existe um cliente com este documento.' }, 409);
    if (duplicateUser?.id) return json({ error: 'Esse nome de usuário já está em uso.' }, 409);

    let cert: any = null;
    if (method === 'certificate') {
      cert = parseCertificate(clean(body.certificate_base64), clean(body.certificate_password), clean(body.certificate_name));
      if (cert.cnpj !== cnpj) return json({ error: 'O CNPJ do certificado é diferente do CNPJ do cadastro.' }, 422);
    }

    const loginEmail = `${username}@acesso.wsgestaocontabil.com`;
    const { data: authUser, error: authError } = await admin.auth.admin.createUser({
      email: loginEmail,
      password: DEFAULT_CLIENT_PASSWORD,
      email_confirm: true,
      user_metadata: { name: tradeName || companyName, username, office_client: true },
    });
    if (authError || !authUser.user) throw authError || new Error('Não foi possível criar o acesso do cliente.');
    createdAuthUser = authUser.user.id;

    const { error: profileError } = await admin.from('users').insert({
      id: createdAuthUser,
      email: loginEmail,
      name: tradeName || companyName,
      role: 'client',
      username,
      must_change_password: true,
    });
    if (profileError) throw profileError;

    const registryManagedValues = {
      company_name: companyName,
      trade_name: tradeName || '',
      company_size: clean(source.company_size),
      state_registration: clean(source.state_registration),
      registration_status: clean(source.registration_status),
      tax_regime: clean(source.tax_regime),
      email: clean(source.email),
      phone: digits(source.phone),
      postal_code: digits(source.postal_code),
      street: clean(source.street),
      street_number: clean(source.street_number),
      complement: clean(source.complement),
      district: clean(source.district),
      city: clean(source.city),
      state: clean(source.state).toUpperCase().slice(0,2),
      city_ibge_code: digits(source.city_ibge_code),
      cnae_primary: digits(source.cnae_primary),
    };
    const registryPayload = source.registry_payload && typeof source.registry_payload === 'object'
      ? {
          ...source.registry_payload,
          _sync: {
            managed_values: registryManagedValues,
            last_source_sync_at: new Date().toISOString(),
            mode: 'registry_safe_merge',
          },
        }
      : {};

    const companyPayload = {
      company_name: companyName,
      trade_name: tradeName || null,
      cnpj: cnpj || null,
      document_type: documentType,
      document_number: documentNumber,
      address: clean(source.address) || [source.street,source.street_number,source.complement,source.district,source.city,source.state,source.postal_code].map(clean).filter(Boolean).join(', ') || null,
      company_size: clean(source.company_size) || null,
      state_registration: clean(source.state_registration) || null,
      registration_status: clean(source.registration_status) || null,
      tax_regime: clean(source.tax_regime) || null,
      email: clean(source.email) || null,
      phone: digits(source.phone) || null,
      postal_code: digits(source.postal_code) || null,
      street: clean(source.street) || null,
      street_number: clean(source.street_number) || null,
      complement: clean(source.complement) || null,
      district: clean(source.district) || null,
      city: clean(source.city) || null,
      state: clean(source.state).toUpperCase().slice(0,2) || null,
      city_ibge_code: digits(source.city_ibge_code) || null,
      cnae_primary: digits(source.cnae_primary) || null,
      registry_payload: registryPayload,
      registry_updated_at: Object.keys(registryPayload).length ? new Date().toISOString() : null,
    };
    const { data: officeCompany, error: officeError } = await admin.from('companies').insert(companyPayload).select('id').single();
    if (officeError || !officeCompany) throw officeError || new Error('Não foi possível criar o cliente.');
    createdOfficeCompany = officeCompany.id;

    const { error: linkError } = await admin.from('company_user_links').insert({
      company_id: createdOfficeCompany,
      user_id: createdAuthUser,
      is_primary: true,
    });
    if (linkError) throw linkError;

    let fiscalCompanyId: string | null = null;
    if (cnpj) {
      const { data: existingFiscal, error: existingError } = await admin.from('fiscal_companies')
        .select('id,company_id')
        .eq('cnpj', cnpj)
        .maybeSingle();
      if (existingError) throw existingError;
      if (existingFiscal?.company_id && existingFiscal.company_id !== createdOfficeCompany)
        throw new Error('Este CNPJ já está vinculado a outro cliente fiscal.');

      const fiscalPayload = {
        cnpj,
        razao_social: companyName,
        nome_fantasia: tradeName || null,
        inscricao_estadual: clean(source.state_registration) || null,
        endereco: {
          cep: digits(source.postal_code) || null,
          logradouro: clean(source.street) || null,
          numero: clean(source.street_number) || null,
          complemento: clean(source.complement) || null,
          bairro: clean(source.district) || null,
          municipio: clean(source.city) || null,
          uf: clean(source.state).toUpperCase().slice(0,2) || null,
        },
        uf: clean(source.state).toUpperCase().slice(0,2) || null,
        codigo_municipio: digits(source.city_ibge_code) || null,
        municipio: clean(source.city) || null,
        regime_tributario: clean(source.tax_regime) || null,
        status: 'ativa',
        ambiente_padrao: 'producao',
        company_id: createdOfficeCompany,
        updated_at: new Date().toISOString(),
        created_by: user.id,
      };

      if (existingFiscal?.id) {
        fiscalCompanyId = existingFiscal.id;
        adoptedFiscalCompany = existingFiscal.id;
        const { error } = await admin.from('fiscal_companies').update(fiscalPayload).eq('id', fiscalCompanyId);
        if (error) throw error;
      } else {
        const { data: fiscal, error } = await admin.from('fiscal_companies').insert(fiscalPayload).select('id').single();
        if (error || !fiscal) throw error || new Error('Não foi possível criar o perfil fiscal.');
        fiscalCompanyId = fiscal.id;
        createdFiscalCompany = fiscal.id;
      }

      if (cert && fiscalCompanyId) {
        const pfxCrypt = await encrypt(clean(body.certificate_base64));
        const passCrypt = await encrypt(clean(body.certificate_password));
        await admin.from('fiscal_certificates').update({ is_active: false, updated_at: new Date().toISOString() })
          .eq('company_id', fiscalCompanyId).eq('is_active', true);
        const { error } = await admin.from('fiscal_certificates').insert({
          company_id: fiscalCompanyId,
          certificate_name: clean(body.certificate_name) || 'certificado-a1.pfx',
          certificate_ciphertext: pfxCrypt.ciphertext,
          certificate_iv: pfxCrypt.iv,
          password_ciphertext: passCrypt.ciphertext,
          password_iv: passCrypt.iv,
          holder_cnpj: cert.cnpj,
          holder_name: cert.holder_name || null,
          valid_from: cert.valid_from,
          valid_until: cert.valid_until,
          serial_number: cert.serial_number || null,
          fingerprint: null,
          is_active: true,
          inspected_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: user.id,
        });
        if (error) throw error;
      }
    }

    await admin.from('saas_audit_logs').insert({
      actor_user_id: user.id,
      action: 'create_office_client',
      resource_type: 'company',
      resource_id: createdOfficeCompany,
      is_sensitive: true,
      metadata: { method, username, fiscal_company_id: fiscalCompanyId, certificate_saved: Boolean(cert) },
    }).catch(()=>null);

    return json({
      ok: true,
      company_id: createdOfficeCompany,
      user_id: createdAuthUser,
      fiscal_company_id: fiscalCompanyId,
      username,
      default_password: DEFAULT_CLIENT_PASSWORD,
      must_change_password: true,
    });
  } catch (error: any) {
    try {
      const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { auth: { persistSession: false, autoRefreshToken: false } });
      if (createdFiscalCompany) await admin.from('fiscal_companies').delete().eq('id', createdFiscalCompany);
      if (adoptedFiscalCompany && createdOfficeCompany) await admin.from('fiscal_companies').update({ company_id: null }).eq('id', adoptedFiscalCompany).eq('company_id', createdOfficeCompany);
      if (createdOfficeCompany) await admin.from('companies').delete().eq('id', createdOfficeCompany);
      if (createdAuthUser) await admin.auth.admin.deleteUser(createdAuthUser);
    } catch (rollbackError) {
      console.error('admin-client-onboarding rollback failed', rollbackError);
    }
    console.error('admin-client-onboarding', error);
    const message = error?.message || 'Não foi possível concluir o cadastro.';
    const status = /Não autenticado/.test(message) ? 401 : /Acesso exclusivo/.test(message) ? 403 : 500;
    return json({ error: message }, status);
  }
});
