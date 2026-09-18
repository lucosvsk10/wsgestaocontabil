import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });

const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const clean = (value: unknown) => String(value ?? '').trim();
const bool = (value: unknown) => {
  if (typeof value === 'boolean') return value;
  return ['s', 'sim', 'true', '1', 'yes'].includes(clean(value).toLowerCase());
};
const meaningful = (value: unknown) =>
  value !== undefined &&
  value !== null &&
  (typeof value === 'number' || typeof value === 'boolean' || clean(value) !== '');

const ieValue = (item: any) =>
  digits(item?.inscricao_estadual ?? item?.inscricao ?? item?.numero ?? item?.ie ?? item?.value);
const ieUf = (item: any) => clean(item?.estado?.sigla ?? item?.uf ?? item?.estado).toUpperCase();

function regimeFromText(value: unknown) {
  const text = clean(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
  if (!text) return '';
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
  history.sort((a: any, b: any) => Number(b?.ano || 0) - Number(a?.ano || 0));
  for (const item of history) {
    const value = regimeFromText(
      item?.forma_de_tributacao || item?.regime_tributario || item?.descricao
    );
    if (value) return value;
  }
  return '';
}

async function fetchJson(url: string, timeoutMs = 15000) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: { Accept: 'application/json', 'User-Agent': 'WS-Gestao-Contabil/1.0' },
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

function normalizeCnpjWs(raw: any, cnpj: string) {
  const e = raw?.estabelecimento || {};
  const state = clean(e?.estado?.sigla ?? e?.uf).toUpperCase();
  const ies = Array.isArray(e?.inscricoes_estaduais)
    ? e.inscricoes_estaduais.filter((item: any) => item?.ativo !== false && ieValue(item))
    : [];
  const preferred =
    ies.find((item: any) => ieUf(item) === state) ||
    ies[0] ||
    null;
  const primary = e?.atividade_principal || {};
  return {
    company_name: clean(raw?.razao_social),
    trade_name: clean(e?.nome_fantasia),
    cnpj,
    state_registration: ieValue(preferred),
    registration_status: clean(e?.situacao_cadastral),
    tax_regime: detectTaxRegime(raw),
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
      source: 'CNPJ.ws',
      opening_date: clean(e?.data_inicio_atividade),
      legal_nature: clean(raw?.natureza_juridica?.descricao || raw?.natureza_juridica),
      share_capital: Number(raw?.capital_social || 0) || null,
      primary_cnae_description: clean(primary?.descricao),
      state_registrations: ies
        .map((item: any) => ({
          state: ieUf(item),
          ie: ieValue(item),
          active: item?.ativo !== false,
        }))
        .filter((item: any) => item.ie),
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
    company_size: clean(raw?.porte),
    registry_payload: {
      source: 'BrasilAPI',
      opening_date: clean(raw?.data_inicio_atividade),
      legal_nature: clean(raw?.natureza_juridica),
      share_capital: Number(raw?.capital_social || 0) || null,
      primary_cnae_description: clean(raw?.cnae_fiscal_descricao),
    },
  };
}

function mergeCompany(primary: any, secondary: any, cnpj: string) {
  if (!primary && !secondary) throw new Error('Nenhuma fonte cadastral respondeu.');
  const output: any = { cnpj, document_type: 'cnpj', document_number: cnpj };
  const keys = [
    'company_name',
    'trade_name',
    'state_registration',
    'registration_status',
    'tax_regime',
    'email',
    'phone',
    'postal_code',
    'street',
    'street_number',
    'complement',
    'district',
    'city',
    'state',
    'city_ibge_code',
    'cnae_primary',
    'company_size',
  ];
  for (const key of keys) {
    output[key] = clean(primary?.[key]) || clean(secondary?.[key]) || '';
  }
  output.registry_payload = {
    ...(secondary?.registry_payload || {}),
    ...(primary?.registry_payload || {}),
  };
  return output;
}

async function lookupAlIe(admin: any, cnpj: string) {
  try {
    const { data } = await admin
      .from('_fiscal_vercel_gateway_token')
      .select('token')
      .eq('id', true)
      .maybeSingle();
    if (!data?.token) return '';
    const response = await fetch(
      'https://ws-nfse-sefin-probe.vercel.app/api/sefaz-al-registry',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${data.token}`,
        },
        body: JSON.stringify({ cnpj }),
        signal: AbortSignal.timeout(60000),
      }
    );
    const payload = await response.json().catch(() => ({}));
    return response.ok && payload?.ok && payload?.found
      ? digits(payload.state_registration)
      : '';
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
    return raw?.status === 'OK' && String(raw?.code ?? '0') === '0'
      ? digits(raw?.inscricao_estadual)
      : '';
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
    if (company.state === 'AL') company.state_registration = await lookupAlIe(admin, cnpj);
    if (!company.state_registration) company.state_registration = await lookupSintegra(cnpj);
  }

  company.registry_payload = {
    ...(company.registry_payload || {}),
    looked_up_at: new Date().toISOString(),
    state_registration_found: Boolean(company.state_registration),
  };
  return company;
}

const managedFields = [
  'company_name',
  'trade_name',
  'company_size',
  'state_registration',
  'registration_status',
  'tax_regime',
  'email',
  'phone',
  'postal_code',
  'street',
  'street_number',
  'complement',
  'district',
  'city',
  'state',
  'city_ibge_code',
  'cnae_primary',
] as const;

const comparable = (value: unknown) => clean(value).toUpperCase();

function safeCompanyPatch(current: any, remote: any) {
  const previous = current?.registry_payload?._sync?.managed_values || {};
  const patch: Record<string, unknown> = {};

  for (const field of managedFields) {
    const next = remote?.[field];
    if (!meaningful(next)) continue;
    const nowValue = current?.[field];
    const oldManaged = previous?.[field];
    const canReplace =
      !meaningful(nowValue) ||
      (meaningful(oldManaged) && comparable(nowValue) === comparable(oldManaged));

    if (canReplace && comparable(nowValue) !== comparable(next)) patch[field] = next;
  }

  const managedValues = Object.fromEntries(
    managedFields.map((field) => [field, remote?.[field] ?? ''])
  );

  patch.registry_payload = {
    ...(current?.registry_payload || {}),
    ...(remote?.registry_payload || {}),
    _sync: {
      managed_values: managedValues,
      last_source_sync_at: new Date().toISOString(),
      mode: 'registry_safe_merge',
    },
    auto_sync: {
      last_checked_at: new Date().toISOString(),
      source: 'office-company-registry-sync',
    },
  };
  patch.registry_updated_at = new Date().toISOString();

  const nextStreet = String(patch.street ?? current.street ?? '');
  const nextNumber = String(patch.street_number ?? current.street_number ?? '');
  const nextComplement = String(patch.complement ?? current.complement ?? '');
  const nextDistrict = String(patch.district ?? current.district ?? '');
  const nextCity = String(patch.city ?? current.city ?? '');
  const nextState = String(patch.state ?? current.state ?? '');
  const nextPostal = String(patch.postal_code ?? current.postal_code ?? '');
  const generatedAddress = [
    [nextStreet, nextNumber].filter(Boolean).join(', '),
    nextComplement,
    nextDistrict,
    [nextCity, nextState].filter(Boolean).join(' / '),
    nextPostal ? `CEP ${nextPostal}` : '',
  ].filter(Boolean).join(' · ');

  const previousAddress = current?.registry_payload?._sync?.managed_address;
  const canReplaceAddress =
    !meaningful(current?.address) ||
    (meaningful(previousAddress) && comparable(current.address) === comparable(previousAddress));

  if (generatedAddress && canReplaceAddress) patch.address = generatedAddress;
  (patch.registry_payload as any)._sync.managed_address = generatedAddress;

  return patch;
}

async function authorized(admin: any, req: Request) {
  const internal = clean(req.headers.get('x-internal-token'));
  if (internal) {
    const { data } = await admin
      .from('_company_registry_sync_token')
      .select('token')
      .eq('id', true)
      .maybeSingle();
    if (data?.token && internal === data.token) return true;
  }

  const auth = clean(req.headers.get('authorization'));
  if (!auth) return false;
  const {
    data: { user },
  } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
  if (!user) return false;
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', user.id);
  return Boolean(roles?.some((row: any) => row.role === 'admin'));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } }
  );

  try {
    if (!(await authorized(admin, req))) return json({ error: 'Não autorizado.' }, 401);

    const body = await req.json().catch(() => ({}));
    const batch = Math.max(1, Math.min(Number(body?.batch || 20), 40));
    const staleDays = Math.max(1, Math.min(Number(body?.stale_days || 14), 90));
    const cutoff = new Date(Date.now() - staleDays * 86400000).toISOString();

    const { data: companies, error } = await admin
      .from('companies')
      .select('id,company_name,trade_name,cnpj,document_type,document_number,address,company_size,state_registration,registration_status,tax_regime,email,phone,postal_code,street,street_number,complement,district,city,state,city_ibge_code,cnae_primary,registry_payload,registry_updated_at')
      .eq('document_type', 'cnpj')
      .not('cnpj', 'is', null)
      .or(`registry_updated_at.is.null,registry_updated_at.lt.${cutoff}`)
      .order('registry_updated_at', { ascending: true, nullsFirst: true })
      .limit(batch);
    if (error) throw error;

    const results: any[] = [];
    for (const company of companies || []) {
      const cnpj = digits(company.cnpj || company.document_number);
      if (cnpj.length !== 14) continue;

      try {
        const remote = await lookupRegistry(admin, cnpj);
        const patch = safeCompanyPatch(company, remote);
        const { error: updateError } = await admin
          .from('companies')
          .update(patch)
          .eq('id', company.id);
        if (updateError) throw updateError;

        const { data: fiscal } = await admin
          .from('fiscal_companies')
          .select('id,razao_social,nome_fantasia,inscricao_estadual,uf,municipio,codigo_municipio')
          .eq('company_id', company.id)
          .maybeSingle();

        if (fiscal?.id) {
          const fiscalPatch: Record<string, unknown> = { updated_at: new Date().toISOString() };
          const officeAfter = { ...company, ...patch };
          if (!clean(fiscal.razao_social) && clean(officeAfter.company_name))
            fiscalPatch.razao_social = officeAfter.company_name;
          if (!clean(fiscal.nome_fantasia) && clean(officeAfter.trade_name))
            fiscalPatch.nome_fantasia = officeAfter.trade_name;
          if (!digits(fiscal.inscricao_estadual) && digits(officeAfter.state_registration))
            fiscalPatch.inscricao_estadual = digits(officeAfter.state_registration);
          if (!clean(fiscal.uf) && clean(officeAfter.state))
            fiscalPatch.uf = clean(officeAfter.state).toUpperCase().slice(0, 2);
          if (!clean(fiscal.municipio) && clean(officeAfter.city))
            fiscalPatch.municipio = officeAfter.city;
          if (!digits(fiscal.codigo_municipio) && digits(officeAfter.city_ibge_code))
            fiscalPatch.codigo_municipio = digits(officeAfter.city_ibge_code);

          await admin.from('fiscal_companies').update(fiscalPatch).eq('id', fiscal.id);
        }

        results.push({
          company_id: company.id,
          cnpj,
          ok: true,
          ie: digits(remote.state_registration) || null,
          changed_fields: Object.keys(patch).filter((key) => !['registry_payload','registry_updated_at'].includes(key)),
        });
      } catch (companyError) {
        results.push({
          company_id: company.id,
          cnpj,
          ok: false,
          error: companyError instanceof Error ? companyError.message : String(companyError),
        });
      }
    }

    return json({
      ok: true,
      checked: results.length,
      updated: results.filter((item) => item.ok).length,
      failed: results.filter((item) => !item.ok).length,
      stale_days: staleDays,
      results,
    });
  } catch (error) {
    console.error('admin-company-registry-sync', error);
    return json(
      { error: error instanceof Error ? error.message : 'Falha ao sincronizar dados cadastrais.' },
      500
    );
  }
});
