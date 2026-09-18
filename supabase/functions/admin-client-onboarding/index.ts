import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { consume, limited } from '../_shared/rate-limit.ts';
import { readJsonLimited, validateCertificateInput, RequestError } from '../_shared/request-guards.ts';
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
    headers: { ...cors, 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

const DEFAULT_CLIENT_PASSWORD = '5BWasgc1@';
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const clean = (value: unknown) => String(value ?? '').trim();
const bounded = (value: unknown, max: number) => clean(value).slice(0, max);
const normalizeUsername = (value: unknown) => clean(value).toLowerCase();
const validUsername = (value: string) => /^[a-z0-9][a-z0-9._-]{2,31}$/.test(value);
const bool = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  return ['s', 'sim', 'true', '1', 'yes'].includes(clean(value).toLowerCase());
};
const meaningful = (value: any) =>
  value !== undefined &&
  value !== null &&
  (typeof value === 'boolean' || typeof value === 'number' || clean(value) !== '');

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

async function adminContext(req: Request) {
  const auth = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!auth) throw new RequestError('Não autenticado.', 401);
  const url = Deno.env.get('SUPABASE_URL')!;
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const admin = createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const {
    data: { user },
  } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!user) throw new RequestError('Não autenticado.', 401);
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  if (!roles?.some((row: any) => row.role === 'admin')) {
    throw new RequestError('Acesso exclusivo para administradores.', 403);
  }
  return { admin, user };
}

function regimeFromText(value: unknown) {
  const text = clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (!text) return '';
  if (text.includes('MEI') || text.includes('MICROEMPREENDEDOR INDIVIDUAL')) return 'mei';
  if (text.includes('SIMPLES')) return 'simples';
  if (text.includes('LUCRO PRESUMIDO') || text.includes('PRESUMIDO')) return 'presumido';
  if (text.includes('LUCRO REAL') || text === 'REAL') return 'real';
  return '';
}
function fiscalRegime(value: unknown) {
  const v = regimeFromText(value) || clean(value).toLowerCase();
  if (v === 'mei' || v === 'simples') return 'simples_nacional';
  if (v === 'presumido') return 'lucro_presumido';
  if (v === 'real') return 'lucro_real';
  return v || null;
}
function detectTaxRegime(raw: any) {
  const mei = raw?.simples?.mei ?? raw?.opcao_pelo_mei;
  const simples = raw?.simples?.simples ?? raw?.opcao_pelo_simples;
  if (bool(mei)) return { value: 'mei', label: 'MEI', year: null };
  if (bool(simples)) return { value: 'simples', label: 'Simples Nacional', year: null };
  const history = Array.isArray(raw?.regime_tributario) ? [...raw.regime_tributario] : [];
  history.sort((a: any, b: any) => Number(b?.ano || 0) - Number(a?.ano || 0));
  for (const item of history) {
    const label = clean(item?.forma_de_tributacao || item?.regime_tributario || item?.descricao);
    const value = regimeFromText(label);
    if (value) return { value, label, year: item?.ano ? Number(item.ano) : null };
  }
  return { value: '', label: '', year: null };
}
function normalizeQsa(items: any[]) {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, 30)
    .map((item: any) => ({
      name: clean(item?.nome_socio || item?.nome || item?.nome_socio_razao_social),
      qualification: clean(
        item?.qualificacao_socio || item?.qualificacao || item?.qualificacao_socio_nome
      ),
      entry_date: clean(item?.data_entrada_sociedade || item?.data_entrada),
    }))
    .filter((item: any) => item.name);
}
function normalizeSecondaryCnaes(items: any[]) {
  if (!Array.isArray(items)) return [];
  return items
    .slice(0, 60)
    .map((item: any) => ({
      code: digits(item?.codigo || item?.id || item?.cnae),
      description: clean(item?.descricao || item?.text || item?.nome),
    }))
    .filter((item: any) => item.code || item.description);
}
function normalizeCnpjWs(raw: any, cnpj: string) {
  const e = raw?.estabelecimento || {};
  const state = clean(e?.estado?.sigla).toUpperCase();
  const activeIes = Array.isArray(e?.inscricoes_estaduais)
    ? e.inscricoes_estaduais.filter((item: any) => item?.ativo !== false)
    : [];
  const preferredIe =
    activeIes.find((item: any) => clean(item?.estado?.sigla).toUpperCase() === state) ||
    activeIes[0] ||
    null;
  const phone = [clean(e?.ddd1), clean(e?.telefone1)].filter(Boolean).join('');
  const secondaryPhone = [clean(e?.ddd2), clean(e?.telefone2)].filter(Boolean).join('');
  const regime = detectTaxRegime(raw);
  const primaryCnae = e?.atividade_principal || {};
  const registry = {
    registration_status: clean(e?.situacao_cadastral),
    registration_status_reason: clean(e?.motivo_situacao_cadastral),
    registration_status_date: clean(e?.data_situacao_cadastral),
    opening_date: clean(e?.data_inicio_atividade),
    establishment_type: clean(e?.tipo || e?.tipo_estabelecimento),
    legal_nature: clean(raw?.natureza_juridica?.descricao || raw?.natureza_juridica),
    legal_nature_code: digits(raw?.natureza_juridica?.id || raw?.natureza_juridica_id),
    company_size: clean(raw?.porte?.descricao || raw?.porte),
    share_capital: Number(raw?.capital_social || 0) || null,
    primary_cnae_code: digits(primaryCnae?.id),
    primary_cnae_description: clean(primaryCnae?.descricao),
    secondary_cnaes: normalizeSecondaryCnaes(e?.atividades_secundarias),
    qsa: normalizeQsa(raw?.socios),
    secondary_phone: digits(secondaryPhone),
    simples: bool(raw?.simples?.simples),
    mei: bool(raw?.simples?.mei),
    tax_regime_label: regime.label,
    tax_regime_year: regime.year,
    state_registrations: activeIes
      .map((item: any) => ({
        state: clean(item?.estado?.sigla).toUpperCase(),
        ie: digits(item?.inscricao_estadual),
        active: item?.ativo !== false,
      }))
      .filter((item: any) => item.ie),
  };
  return {
    legal_name: clean(raw?.razao_social),
    trade_name: clean(e?.nome_fantasia),
    tax_id: cnpj,
    state_registration: digits(preferredIe?.inscricao_estadual),
    tax_regime: regime.value,
    email: clean(e?.email),
    phone: digits(phone),
    mobile: digits(secondaryPhone),
    postal_code: digits(e?.cep),
    street: [clean(e?.tipo_logradouro), clean(e?.logradouro)].filter(Boolean).join(' '),
    street_number: clean(e?.numero),
    complement: clean(e?.complemento),
    district: clean(e?.bairro),
    city: clean(e?.cidade?.nome),
    state,
    city_ibge_code: digits(e?.cidade?.ibge_id),
    cnae_primary: digits(primaryCnae?.id),
    registration_status: registry.registration_status,
    company_size: registry.company_size,
    federal_source: 'CNPJ.ws',
    state_source: preferredIe ? 'CNPJ.ws' : '',
    registry,
  };
}
function normalizeBrasilApi(raw: any, cnpj: string) {
  const regime = detectTaxRegime(raw);
  const registry = {
    registration_status: clean(raw?.descricao_situacao_cadastral),
    registration_status_reason: clean(raw?.descricao_motivo_situacao_cadastral),
    registration_status_date: clean(raw?.data_situacao_cadastral),
    opening_date: clean(raw?.data_inicio_atividade),
    establishment_type: clean(raw?.descricao_identificador_matriz_filial),
    legal_nature: clean(raw?.natureza_juridica),
    legal_nature_code: digits(raw?.codigo_natureza_juridica),
    company_size: clean(raw?.porte),
    share_capital: Number(raw?.capital_social || 0) || null,
    primary_cnae_code: digits(raw?.cnae_fiscal),
    primary_cnae_description: clean(raw?.cnae_fiscal_descricao),
    secondary_cnaes: normalizeSecondaryCnaes(raw?.cnaes_secundarios),
    qsa: normalizeQsa(raw?.qsa),
    simples: Boolean(raw?.opcao_pelo_simples),
    mei: Boolean(raw?.opcao_pelo_mei),
    tax_regime_label: regime.label,
    tax_regime_year: regime.year,
  };
  return {
    legal_name: clean(raw?.razao_social),
    trade_name: clean(raw?.nome_fantasia),
    tax_id: cnpj,
    state_registration: '',
    tax_regime: regime.value,
    email: clean(raw?.email),
    phone: digits(raw?.ddd_telefone_1),
    mobile: digits(raw?.ddd_telefone_2),
    postal_code: digits(raw?.cep),
    street: [clean(raw?.descricao_tipo_de_logradouro), clean(raw?.logradouro)]
      .filter(Boolean)
      .join(' '),
    street_number: clean(raw?.numero),
    complement: clean(raw?.complemento),
    district: clean(raw?.bairro),
    city: clean(raw?.municipio),
    state: clean(raw?.uf).toUpperCase(),
    city_ibge_code: digits(raw?.codigo_municipio_ibge),
    cnae_primary: digits(raw?.cnae_fiscal),
    registration_status: registry.registration_status,
    company_size: registry.company_size,
    federal_source: 'BrasilAPI',
    state_source: '',
    registry,
  };
}
function mergeRegistry(a: any = {}, b: any = {}) {
  const merged: any = { ...a };
  for (const [key, value] of Object.entries(b || {})) {
    if (Array.isArray(value)) {
      if (!value.length) continue;
      const current = Array.isArray(merged[key]) ? merged[key] : [];
      const seen = new Set(current.map((item: any) => JSON.stringify(item)));
      merged[key] = [...current, ...value.filter((item: any) => !seen.has(JSON.stringify(item)))];
      continue;
    }
    if (!meaningful(merged[key]) && meaningful(value)) merged[key] = value;
  }
  return merged;
}
function mergeFederal(ws: any | null, brasil: any | null, cnpj: string) {
  if (!ws && !brasil) throw new RequestError('Nenhuma fonte cadastral respondeu para este CNPJ.', 502);
  const primary = ws || brasil || {};
  const secondary = brasil || ws || {};
  const merged: any = { tax_id: cnpj };
  const keys = [
    'legal_name','trade_name','state_registration','tax_regime','email','phone','mobile',
    'postal_code','street','street_number','complement','district','city','state',
    'city_ibge_code','cnae_primary','registration_status','company_size','state_source'
  ];
  for (const key of keys) {
    const preferred = key === 'tax_regime' ? brasil?.[key] || ws?.[key] : primary?.[key];
    const fallback = key === 'tax_regime' ? ws?.[key] : secondary?.[key];
    merged[key] = meaningful(preferred) ? preferred : meaningful(fallback) ? fallback : '';
  }
  merged.registry = mergeRegistry(ws?.registry, brasil?.registry);
  merged.federal_sources = [ws?.federal_source, brasil?.federal_source].filter(Boolean);
  merged.federal_source = merged.federal_sources.join(' + ');
  return merged;
}
async function fetchJson(url: string, timeoutMs = 12000) {
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
async function lookupFederal(cnpj: string) {
  const [wsResult, brasilResult] = await Promise.allSettled([
    fetchJson(`https://publica.cnpj.ws/cnpj/${cnpj}`, 15000),
    fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, 15000),
  ]);
  const ws = wsResult.status === 'fulfilled' ? normalizeCnpjWs(wsResult.value, cnpj) : null;
  const brasil = brasilResult.status === 'fulfilled' ? normalizeBrasilApi(brasilResult.value, cnpj) : null;
  return mergeFederal(ws, brasil, cnpj);
}
async function lookupSintegraWs(cnpj: string, uf: string) {
  const token = clean(Deno.env.get('SINTEGRAWS_TOKEN'));
  if (!token) return null;
  try {
    const url = new URL('https://www.sintegraws.com.br/api/v1/execute-api.php');
    url.searchParams.set('token', token);
    url.searchParams.set('cnpj', cnpj);
    url.searchParams.set('plugin', 'ST');
    const raw = await fetchJson(url.toString(), 20000);
    if (raw?.status !== 'OK' || String(raw?.code ?? '0') !== '0') return null;
    const ie = digits(raw?.inscricao_estadual);
    if (!ie) return null;
    return {
      state_registration: ie,
      state: clean(raw?.uf || uf).toUpperCase(),
      city: clean(raw?.municipio),
      postal_code: digits(raw?.cep),
      street: clean(raw?.logradouro),
      street_number: clean(raw?.numero),
      complement: clean(raw?.complemento),
      district: clean(raw?.bairro),
      state_registry_status: clean(raw?.situacao_ie),
      state_source: 'SintegraWS',
    };
  } catch {
    return null;
  }
}
async function lookupAlStateRegistration(admin: any, cnpj: string) {
  try {
    const { data: gateway } = await admin
      .from('_fiscal_vercel_gateway_token')
      .select('token')
      .eq('id', true)
      .maybeSingle();
    const token = clean(gateway?.token);
    if (!token) return null;
    const response = await fetch('https://ws-nfse-sefin-probe.vercel.app/api/sefaz-al-registry', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify({ cnpj }),
      signal: AbortSignal.timeout(60000),
    });
    const raw = await response.json().catch(() => ({})) as any;
    if (!response.ok || !raw?.ok || !raw?.found) return null;
    return {
      state_registration: digits(raw.state_registration),
      state_registry_status: clean(raw.state_registry_status),
      state_source: clean(raw.state_source || 'SEFAZ/AL - SINTEGRA'),
    };
  } catch {
    return null;
  }
}
async function lookupRegistry(admin: any, cnpj: string) {
  const federal = await lookupFederal(cnpj);
  const uf = clean(federal?.state).toUpperCase();
  let stateData: any = null;
  if (!digits(federal?.state_registration) && uf === 'AL') {
    stateData = await lookupAlStateRegistration(admin, cnpj);
  }
  if (!stateData && !digits(federal?.state_registration)) {
    stateData = await lookupSintegraWs(cnpj, uf);
  }
  const data = stateData ? { ...federal, ...stateData } : federal;
  data.registry = {
    ...(federal.registry || {}),
    state_registry_status:
      stateData?.state_registry_status || federal.registry?.state_registry_status || '',
    state_source: stateData?.state_source || federal.state_source || '',
  };
  return data;
}

function officePayload(data: any, identifier: string) {
  const street = bounded(data.street, 160);
  const number = bounded(data.street_number, 30);
  const district = bounded(data.district, 100);
  const city = bounded(data.city, 120);
  const state = bounded(data.state, 2).toUpperCase();
  const postal = digits(data.postal_code).slice(0, 8);
  const address = [
    [street, number].filter(Boolean).join(', '),
    district,
    [city, state].filter(Boolean).join(' / '),
    postal ? `CEP ${postal}` : '',
  ].filter(Boolean).join(' · ');
  return {
    cnpj: identifier || null,
    company_name: bounded(data.legal_name || data.company_name, 180).toUpperCase(),
    trade_name: bounded(data.trade_name, 180).toUpperCase() || null,
    address: address || bounded(data.address, 400) || null,
    company_size: bounded(data.company_size || data.registry?.company_size, 80) || null,
    state_registration: digits(data.state_registration).slice(0, 30) || null,
    registration_status: bounded(data.registration_status || data.registry?.registration_status, 80) || null,
    tax_regime: bounded(data.tax_regime, 80) || null,
    email: bounded(data.email, 180).toLowerCase() || null,
    phone: digits(data.phone).slice(0, 20) || null,
    postal_code: postal || null,
    street: street || null,
    street_number: number || null,
    complement: bounded(data.complement, 120) || null,
    district: district || null,
    city: city || null,
    state: state || null,
    city_ibge_code: digits(data.city_ibge_code).slice(0, 10) || null,
    cnae_primary: digits(data.cnae_primary).slice(0, 12) || null,
    registry_payload: data.registry || {},
    registry_updated_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

async function upsertFiscalCompany(admin: any, actorId: string, officeCompany: any, data: any) {
  const cnpj = digits(officeCompany.cnpj);
  if (cnpj.length !== 14) return null;
  const now = new Date().toISOString();
  const payload = {
    company_id: officeCompany.id,
    cnpj,
    razao_social: officeCompany.company_name,
    nome_fantasia: officeCompany.trade_name || officeCompany.company_name,
    inscricao_estadual: officeCompany.state_registration || null,
    endereco: {
      logradouro: officeCompany.street || '',
      numero: officeCompany.street_number || '',
      bairro: officeCompany.district || '',
      cep: officeCompany.postal_code || '',
      complemento: officeCompany.complement || '',
    },
    uf: officeCompany.state || null,
    codigo_municipio: officeCompany.city_ibge_code || null,
    municipio: officeCompany.city || null,
    regime_tributario: fiscalRegime(officeCompany.tax_regime),
    ambiente_padrao: 'producao',
    status: 'ativa',
    fiscal_settings: {
      origin_scope: 'office_client',
      registry_checked_at: now,
      registry_sources: data?.federal_sources || [],
    },
    updated_at: now,
  };

  const { data: byCompany, error: byCompanyError } = await admin
    .from('fiscal_companies')
    .select('id,company_id,cnpj')
    .eq('company_id', officeCompany.id)
    .maybeSingle();
  if (byCompanyError) throw byCompanyError;
  if (byCompany?.id) {
    const { error } = await admin.from('fiscal_companies').update(payload).eq('id', byCompany.id);
    if (error) throw error;
    return byCompany.id;
  }

  const { data: byCnpj, error: byCnpjError } = await admin
    .from('fiscal_companies')
    .select('id,company_id,cnpj')
    .eq('cnpj', cnpj)
    .maybeSingle();
  if (byCnpjError) throw byCnpjError;
  if (byCnpj?.id) {
    if (byCnpj.company_id && String(byCnpj.company_id) !== String(officeCompany.id)) {
      throw new RequestError('Este CNPJ já está vinculado a outro cliente do escritório.', 409);
    }
    const { error } = await admin
      .from('fiscal_companies')
      .update({ ...payload, company_id: officeCompany.id })
      .eq('id', byCnpj.id);
    if (error) throw error;
    return byCnpj.id;
  }

  const { data: created, error } = await admin
    .from('fiscal_companies')
    .insert({ ...payload, created_by: actorId })
    .select('id')
    .single();
  if (error) throw error;
  return created.id;
}

async function saveCertificate(admin: any, actorId: string, fiscalCompanyId: string, cnpj: string, body: any) {
  const pfx = String(body.certificate_base64 || '');
  const password = String(body.certificate_password || '');
  if (!pfx && !password) return null;
  if (!pfx || !password) throw new RequestError('Informe o arquivo A1 e a senha juntos.', 422);
  validateCertificateInput(pfx, password, body.certificate_name);

  let cert: any;
  try {
    cert = lerCertificado(Buffer.from(pfx, 'base64'), password);
  } catch {
    throw new RequestError('Não foi possível abrir o certificado. Confira o arquivo e a senha.', 422);
  }
  const holderCnpj = digits(cert.titular.cnpj);
  if (holderCnpj.length !== 14 || holderCnpj !== cnpj) {
    throw new RequestError('O certificado A1 não pertence ao CNPJ informado para este cliente.', 422);
  }
  const validUntil = cert.validadeFim as Date;
  if (!Number.isFinite(validUntil?.getTime()) || validUntil.getTime() < Date.now()) {
    throw new RequestError('O certificado A1 está vencido.', 422);
  }

  const pfxCrypt = await encrypt(pfx);
  const passCrypt = await encrypt(password);
  const now = new Date().toISOString();
  await admin
    .from('fiscal_certificates')
    .update({ is_active: false, updated_at: now })
    .eq('company_id', fiscalCompanyId)
    .eq('is_active', true);
  const { error } = await admin.from('fiscal_certificates').insert({
    company_id: fiscalCompanyId,
    certificate_name: bounded(body.certificate_name || 'certificado-a1.pfx', 220),
    certificate_ciphertext: pfxCrypt.ciphertext,
    certificate_iv: pfxCrypt.iv,
    password_ciphertext: passCrypt.ciphertext,
    password_iv: passCrypt.iv,
    holder_cnpj: holderCnpj,
    holder_name: clean(cert.titular.nome) || null,
    valid_from: cert.validadeInicio.toISOString().slice(0, 10),
    valid_until: cert.validadeFim.toISOString().slice(0, 10),
    serial_number: String(cert.serialNumber || '') || null,
    fingerprint: null,
    is_active: true,
    inspected_at: now,
    updated_at: now,
    created_by: actorId,
  });
  if (error) throw error;
  return {
    holder_cnpj: holderCnpj,
    holder_name: clean(cert.titular.nome),
    valid_until: cert.validadeFim.toISOString().slice(0, 10),
  };
}

Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido.' }, 405);

  let createdUserId = '';
  let createdCompanyId = '';
  try {
    const ctx = await adminContext(req);
    const body = await readJsonLimited(req, 3000000);
    const action = String(body.action || 'lookup');
    const denied = limited(
      await consume(
        ctx.admin,
        action === 'lookup' ? 'admin_client_lookup' : 'admin_client_create',
        ctx.user.id,
        action === 'lookup' ? 30 : 10,
        600
      )
    );
    if (denied) return denied;

    if (action === 'lookup') {
      const cnpj = digits(body.cnpj);
      if (cnpj.length !== 14) return J({ error: 'Informe um CNPJ válido com 14 dígitos.' }, 422);
      const data = await lookupRegistry(ctx.admin, cnpj);
      return J({
        ok: true,
        data,
        state_registry_found: Boolean(digits(data.state_registration)),
        sources: {
          federal: data.federal_sources || (data.federal_source ? [data.federal_source] : []),
          state: data.registry?.state_source || data.state_source || '',
        },
      });
    }

    if (action !== 'create') return J({ error: 'Ação inválida.' }, 400);

    const mode = ['certificate', 'cnpj', 'manual'].includes(String(body.mode))
      ? String(body.mode)
      : 'manual';
    const username = normalizeUsername(body.username);
    if (!validUsername(username)) {
      return J(
        { error: 'Use um nome de usuário com 3 a 32 caracteres: letras, números, ponto, hífen ou sublinhado.' },
        422
      );
    }

    const identifier = digits(body?.company?.tax_id || body?.company?.cnpj || body?.company?.cpf);
    if (![11, 14].includes(identifier.length)) {
      return J({ error: 'Informe um CPF ou CNPJ válido.' }, 422);
    }
    if (mode !== 'manual' && identifier.length !== 14) {
      return J({ error: 'Os modos A1 e CNPJ exigem um CNPJ empresarial válido.' }, 422);
    }

    let registryData = body.company || {};
    if (identifier.length === 14 && mode !== 'manual') {
      try {
        const lookedUp = await lookupRegistry(ctx.admin, identifier);
        registryData = { ...lookedUp, ...body.company, registry: mergeRegistry(lookedUp.registry, body.company?.registry) };
      } catch (error) {
        if (!clean(body.company?.legal_name || body.company?.company_name)) throw error;
      }
    }

    if (mode === 'certificate') {
      const pfx = String(body.certificate_base64 || '');
      const password = String(body.certificate_password || '');
      if (!pfx || !password) return J({ error: 'Selecione o certificado A1 e informe a senha.' }, 422);
      validateCertificateInput(pfx, password, body.certificate_name);
      try {
        const cert = lerCertificado(Buffer.from(pfx, 'base64'), password);
        const certCnpj = digits(cert.titular.cnpj);
        if (certCnpj !== identifier) {
          return J({ error: 'O CNPJ do certificado é diferente do CNPJ deste cadastro.' }, 422);
        }
        if (!registryData.legal_name && cert.titular.nome) registryData.legal_name = cert.titular.nome;
      } catch (error) {
        if (error instanceof RequestError) throw error;
        return J({ error: 'Não foi possível abrir o certificado. Confira o arquivo e a senha.' }, 422);
      }
    }

    const companyPayload = officePayload(registryData, identifier);
    if (!companyPayload.company_name) {
      return J({ error: 'Informe a razão social ou o nome completo do cliente.' }, 422);
    }

    const { data: existingCompany } = await ctx.admin
      .from('companies')
      .select('id,company_name')
      .eq('cnpj', identifier)
      .maybeSingle();
    if (existingCompany?.id) {
      return J({ error: 'Este CPF/CNPJ já pertence a um cliente cadastrado no painel.' }, 409);
    }

    const { data: existingUsername } = await ctx.admin
      .from('users')
      .select('id')
      .ilike('username', username)
      .limit(1)
      .maybeSingle();
    if (existingUsername?.id) return J({ error: 'Esse nome de usuário já está em uso.' }, 409);

    const technicalEmail = `${username}@acesso.wsgestaocontabil.com`;
    const { data: authUser, error: authError } = await ctx.admin.auth.admin.createUser({
      email: technicalEmail,
      password: DEFAULT_CLIENT_PASSWORD,
      email_confirm: true,
      user_metadata: { name: companyPayload.trade_name || companyPayload.company_name, username },
    });
    if (authError || !authUser.user) throw authError || new Error('Falha ao criar acesso do cliente.');
    createdUserId = authUser.user.id;

    const { error: userError } = await ctx.admin.from('users').insert({
      id: createdUserId,
      email: technicalEmail,
      name: companyPayload.trade_name || companyPayload.company_name,
      role: 'client',
      username,
      must_change_password: true,
      password_changed_at: null,
    });
    if (userError) throw userError;

    const { data: officeCompany, error: companyError } = await ctx.admin
      .from('companies')
      .insert(companyPayload)
      .select('*')
      .single();
    if (companyError) throw companyError;
    createdCompanyId = officeCompany.id;

    const { error: linkError } = await ctx.admin.from('company_user_links').insert({
      company_id: createdCompanyId,
      user_id: createdUserId,
      is_primary: true,
    });
    if (linkError) throw linkError;

    const fiscalCompanyId =
      identifier.length === 14
        ? await upsertFiscalCompany(ctx.admin, ctx.user.id, officeCompany, registryData)
        : null;

    let certificate = null;
    if (mode === 'certificate' && fiscalCompanyId) {
      certificate = await saveCertificate(
        ctx.admin,
        ctx.user.id,
        fiscalCompanyId,
        identifier,
        body
      );
    }

    await ctx.admin.from('saas_audit_logs').insert({
      actor_user_id: ctx.user.id,
      action: 'office_client_created',
      resource_type: 'company',
      resource_id: createdCompanyId,
      is_sensitive: true,
      metadata: {
        mode,
        username,
        has_fiscal_profile: Boolean(fiscalCompanyId),
        has_certificate: Boolean(certificate),
      },
    });

    return J({
      ok: true,
      company: officeCompany,
      user: { id: createdUserId, username },
      fiscal_company_id: fiscalCompanyId,
      certificate,
      default_password: DEFAULT_CLIENT_PASSWORD,
      must_change_password: true,
    });
  } catch (error: any) {
    console.error('admin-client-onboarding', error);
    try {
      const service = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { persistSession: false, autoRefreshToken: false } }
      );
      if (createdCompanyId) await service.from('companies').delete().eq('id', createdCompanyId);
      if (createdUserId) await service.auth.admin.deleteUser(createdUserId);
    } catch (cleanupError) {
      console.error('admin-client-onboarding cleanup', cleanupError);
    }
    const status =
      error instanceof RequestError
        ? error.status
        : error?.code === '23505'
          ? 409
          : [401, 403, 409, 422].includes(Number(error?.status))
            ? Number(error.status)
            : 500;
    return J(
      {
        error:
          status < 500
            ? error.message
            : 'Não foi possível criar o cliente agora. Nenhum acesso incompleto foi mantido.',
      },
      status
    );
  }
});
