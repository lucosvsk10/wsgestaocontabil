import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import JSZip from "npm:jszip@3.10.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const out = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const clean = (value: unknown) => String(value ?? "").trim();
const bool = (value: unknown) => {
  if (typeof value === "boolean") return value;
  return ["s", "sim", "true", "1", "yes"].includes(clean(value).toLowerCase());
};
const meaningful = (value: any) =>
  value !== undefined && value !== null && (typeof value === "boolean" || typeof value === "number" || clean(value) !== "");

function regimeFromText(value: unknown) {
  const text = clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  if (!text) return "";
  if (text.includes("MEI") || text.includes("MICROEMPREENDEDOR INDIVIDUAL")) return "mei";
  if (text.includes("SIMPLES")) return "simples";
  if (text.includes("LUCRO PRESUMIDO") || text.includes("PRESUMIDO")) return "presumido";
  if (text.includes("LUCRO REAL") || text.includes("REAL")) return "real";
  return "";
}

function detectTaxRegime(raw: any) {
  const mei = raw?.simples?.mei ?? raw?.opcao_pelo_mei;
  const simples = raw?.simples?.simples ?? raw?.opcao_pelo_simples;
  if (bool(mei)) return { value: "mei", label: "MEI", year: null };
  if (bool(simples)) return { value: "simples", label: "Simples Nacional", year: null };

  const history = Array.isArray(raw?.regime_tributario) ? [...raw.regime_tributario] : [];
  history.sort((a: any, b: any) => Number(b?.ano || 0) - Number(a?.ano || 0));
  for (const item of history) {
    const label = clean(item?.forma_de_tributacao || item?.regime_tributario || item?.descricao);
    const value = regimeFromText(label);
    if (value) return { value, label, year: item?.ano ? Number(item.ano) : null };
  }
  return { value: "", label: "", year: null };
}

function normalizeQsa(items: any[]) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 30).map((item: any) => ({
    name: clean(item?.nome_socio || item?.nome || item?.nome_socio_razao_social),
    qualification: clean(item?.qualificacao_socio || item?.qualificacao || item?.qualificacao_socio_nome),
    entry_date: clean(item?.data_entrada_sociedade || item?.data_entrada),
  })).filter((item: any) => item.name);
}

function normalizeSecondaryCnaes(items: any[]) {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 60).map((item: any) => ({
    code: digits(item?.codigo || item?.id || item?.cnae),
    description: clean(item?.descricao || item?.text || item?.nome),
  })).filter((item: any) => item.code || item.description);
}

function normalizeCnpjWs(raw: any, cnpj: string) {
  const e = raw?.estabelecimento || {};
  const state = clean(e?.estado?.sigla).toUpperCase();
  const activeIes = Array.isArray(e?.inscricoes_estaduais)
    ? e.inscricoes_estaduais.filter((item: any) => item?.ativo !== false)
    : [];
  const preferredIe =
    activeIes.find((item: any) => clean(item?.estado?.sigla).toUpperCase() === state) || activeIes[0] || null;
  const phone = [clean(e?.ddd1), clean(e?.telefone1)].filter(Boolean).join("");
  const secondaryPhone = [clean(e?.ddd2), clean(e?.telefone2)].filter(Boolean).join("");
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
    state_registrations: activeIes.map((item: any) => ({
      state: clean(item?.estado?.sigla).toUpperCase(),
      ie: digits(item?.inscricao_estadual),
      active: item?.ativo !== false,
    })).filter((item: any) => item.ie),
  };
  return {
    legal_name: clean(raw?.razao_social),
    trade_name: clean(e?.nome_fantasia),
    tax_id: cnpj,
    state_registration: digits(preferredIe?.inscricao_estadual),
    ie_indicator: preferredIe ? "1" : "",
    icms_taxpayer: Boolean(preferredIe),
    tax_regime: regime.value,
    email: clean(e?.email),
    phone: digits(phone),
    mobile: digits(secondaryPhone),
    postal_code: digits(e?.cep),
    street: [clean(e?.tipo_logradouro), clean(e?.logradouro)].filter(Boolean).join(" "),
    street_number: clean(e?.numero),
    complement: clean(e?.complemento),
    district: clean(e?.bairro),
    city: clean(e?.cidade?.nome),
    state,
    city_ibge_code: digits(e?.cidade?.ibge_id),
    cnae_primary: digits(primaryCnae?.id),
    registration_status: registry.registration_status,
    federal_source: "CNPJ.ws",
    state_source: preferredIe ? "CNPJ.ws" : "",
    registry,
  };
}

function normalizeBrasilApi(raw: any, cnpj: string) {
  const phone1 = clean(raw?.ddd_telefone_1);
  const phone2 = clean(raw?.ddd_telefone_2);
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
    secondary_phone: digits(phone2),
    simples: Boolean(raw?.opcao_pelo_simples),
    mei: Boolean(raw?.opcao_pelo_mei),
    tax_regime_label: regime.label,
    tax_regime_year: regime.year,
    special_situation: clean(raw?.situacao_especial),
    special_situation_date: clean(raw?.data_situacao_especial),
  };
  return {
    legal_name: clean(raw?.razao_social),
    trade_name: clean(raw?.nome_fantasia),
    tax_id: cnpj,
    state_registration: "",
    ie_indicator: "",
    icms_taxpayer: false,
    tax_regime: regime.value,
    email: clean(raw?.email),
    phone: digits(phone1),
    mobile: digits(phone2),
    postal_code: digits(raw?.cep),
    street: [clean(raw?.descricao_tipo_de_logradouro), clean(raw?.logradouro)].filter(Boolean).join(" "),
    street_number: clean(raw?.numero),
    complement: clean(raw?.complemento),
    district: clean(raw?.bairro),
    city: clean(raw?.municipio),
    state: clean(raw?.uf).toUpperCase(),
    city_ibge_code: digits(raw?.codigo_municipio_ibge),
    cnae_primary: digits(raw?.cnae_fiscal),
    registration_status: registry.registration_status,
    federal_source: "BrasilAPI",
    state_source: "",
    registry,
  };
}

function mergeRegistry(a: any = {}, b: any = {}) {
  const merged: any = { ...a };
  for (const [key, value] of Object.entries(b || {})) {
    if (Array.isArray(value)) {
      if (!value.length) continue;
      if (key === "qsa" || key === "secondary_cnaes" || key === "state_registrations") {
        const current = Array.isArray(merged[key]) ? merged[key] : [];
        const signature = (item: any) => JSON.stringify(item);
        const seen = new Set(current.map(signature));
        merged[key] = [...current, ...value.filter((item: any) => !seen.has(signature(item)))];
      } else if (!Array.isArray(merged[key]) || !merged[key].length) merged[key] = value;
      continue;
    }
    if (!meaningful(merged[key]) && meaningful(value)) merged[key] = value;
  }
  return merged;
}

function mergeFederal(ws: any | null, brasil: any | null, cnpj: string) {
  if (!ws && !brasil) throw new Error("Nenhuma fonte cadastral respondeu para este CNPJ");
  const primary = ws || brasil || {};
  const secondary = brasil || ws || {};
  const merged: any = { tax_id: cnpj };
  const keys = [
    "legal_name", "trade_name", "state_registration", "ie_indicator", "tax_regime", "email", "phone", "mobile",
    "postal_code", "street", "street_number", "complement", "district", "city", "state", "city_ibge_code",
    "cnae_primary", "registration_status", "state_source",
  ];
  for (const key of keys) {
    const preferred = key === "tax_regime" ? (brasil?.[key] || ws?.[key]) : primary?.[key];
    const fallback = key === "tax_regime" ? ws?.[key] : secondary?.[key];
    merged[key] = meaningful(preferred) ? preferred : meaningful(fallback) ? fallback : "";
  }
  merged.icms_taxpayer = Boolean(ws?.state_registration || brasil?.state_registration || ws?.icms_taxpayer || brasil?.icms_taxpayer);
  merged.registry = mergeRegistry(ws?.registry, brasil?.registry);
  merged.federal_sources = [ws?.federal_source, brasil?.federal_source].filter(Boolean);
  merged.federal_source = merged.federal_sources.join(" + ");
  return merged;
}

async function fetchJson(url: string, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json", "User-Agent": "WS-Gestao-Contabil/1.0" },
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

  const ws = wsResult.status === "fulfilled" ? normalizeCnpjWs(wsResult.value, cnpj) : null;
  const brasil = brasilResult.status === "fulfilled" ? normalizeBrasilApi(brasilResult.value, cnpj) : null;
  if (wsResult.status === "rejected") console.warn("CNPJ.ws lookup failed", wsResult.reason);
  if (brasilResult.status === "rejected") console.warn("BrasilAPI lookup failed", brasilResult.reason);
  return mergeFederal(ws, brasil, cnpj);
}

async function lookupSintegraWs(cnpj: string, uf: string) {
  const token = clean(Deno.env.get("SINTEGRAWS_TOKEN"));
  if (!token) return null;
  try {
    const url = new URL("https://www.sintegraws.com.br/api/v1/execute-api.php");
    url.searchParams.set("token", token);
    url.searchParams.set("cnpj", cnpj);
    url.searchParams.set("plugin", "ST");
    const raw = await fetchJson(url.toString(), 20000);
    if (raw?.status !== "OK" || String(raw?.code ?? "0") !== "0") return null;
    const ie = digits(raw?.inscricao_estadual);
    if (!ie) return null;
    return {
      state_registration: ie,
      ie_indicator: raw?.contribuinte_icms === false ? "9" : "1",
      icms_taxpayer: raw?.contribuinte_icms !== false,
      state: clean(raw?.uf || uf).toUpperCase(),
      city: clean(raw?.municipio),
      postal_code: digits(raw?.cep),
      street: clean(raw?.logradouro),
      street_number: clean(raw?.numero),
      complement: clean(raw?.complemento),
      district: clean(raw?.bairro),
      state_registry_status: clean(raw?.situacao_ie),
      state_source: "SintegraWS",
    };
  } catch (error) {
    console.warn("SintegraWS lookup failed", error);
    return null;
  }
}

let alRegistryCache: { expiresAt: number; text: string } | null = null;
const AL_REGISTRY_URLS = [
  "https://gcs2.sefaz.al.gov.br/sfz-gcs-web/documentos/visualizarDocumento.action?key=CXzeoQhIvK4%3D",
  "https://gcs.sefaz.al.gov.br/sfz-gcs-web/documentos/visualizarDocumento.action?key=CXzeoQhIvK4%3D",
];

async function loadAlRegistryText() {
  if (alRegistryCache && alRegistryCache.expiresAt > Date.now()) return alRegistryCache.text;
  let lastError: unknown = null;
  for (const url of AL_REGISTRY_URLS) {
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "WS-Gestao-Contabil/1.0" },
        redirect: "follow",
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const bytes = await response.arrayBuffer();
      const zip = await JSZip.loadAsync(bytes);
      const files = Object.values(zip.files).filter(file => !file.dir);
      if (!files.length) throw new Error("ZIP da SEFAZ/AL sem arquivo de cadastro");
      const text = await files[0].async("string");
      if (!text || text.length < 1000) throw new Error("Base SEFAZ/AL vazia ou inválida");
      alRegistryCache = { expiresAt: Date.now() + 6 * 60 * 60 * 1000, text };
      return text;
    } catch (error) {
      lastError = error;
      console.warn("SEFAZ/AL registry download failed", url, error);
    }
  }
  throw lastError || new Error("Base SEFAZ/AL indisponível");
}

async function lookupAlStateRegistration(cnpj: string) {
  try {
    const text = await loadAlRegistryText();
    const compact = text.replace(/\r/g, "");
    for (const line of compact.split("\n")) {
      const match = line.match(/(\d{9})\D*(\d{14})\D*([HN])/i);
      if (!match || match[2] !== cnpj) continue;
      return {
        state_registration: match[1],
        ie_indicator: "1",
        icms_taxpayer: true,
        state_registry_status: match[3].toUpperCase() === "H" ? "Habilitado" : "Não habilitado",
        state_source: "SEFAZ/AL - SINTEGRA",
      };
    }
  } catch (error) {
    console.warn("SEFAZ/AL IE lookup failed", error);
  }
  return null;
}

async function enrichStateRegistry(cnpj: string, base: any) {
  const uf = clean(base?.state).toUpperCase();
  let stateData: any = null;
  if (uf === "AL" && !digits(base?.state_registration)) stateData = await lookupAlStateRegistration(cnpj);
  if (!stateData && !digits(base?.state_registration)) stateData = await lookupSintegraWs(cnpj, uf);
  const data = stateData ? { ...base, ...stateData } : base;
  data.registry = {
    ...(data.registry || {}),
    state_registry_status: stateData?.state_registry_status || data.registry?.state_registry_status || "",
    state_source: stateData?.state_source || data.state_source || "",
  };
  return data;
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return out({ error: "Método não permitido" }, 405);
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return out({ error: "Não autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return out({ error: "Não autenticado" }, 401);

    const body = await req.json();
    const organizationId = clean(body?.organization_id);
    const cnpj = digits(body?.cnpj);
    if (!organizationId) return out({ error: "Organização obrigatória" }, 422);
    if (cnpj.length !== 14) return out({ error: "Informe um CNPJ válido com 14 dígitos" }, 422);

    const { data: member } = await admin
      .from("organization_members")
      .select("status")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    const platformAdmin = roles?.some((row: any) => ["admin", "fiscal", "contabil", "geral"].includes(row.role));
    if (!member && !platformAdmin) return out({ error: "Sem acesso à organização" }, 403);

    const federal = await lookupFederal(cnpj);
    const data = await enrichStateRegistry(cnpj, federal);
    const filled = [
      "legal_name", "trade_name", "state_registration", "tax_regime", "email", "phone", "mobile", "postal_code",
      "street", "street_number", "complement", "district", "city", "state", "city_ibge_code", "cnae_primary",
    ].filter(key => meaningful(data?.[key]));
    return out({
      ok: true,
      data,
      registry: data.registry || {},
      sources: {
        federal: data.federal_sources || (data.federal_source ? [data.federal_source] : []),
        state: data.state_source || data.registry?.state_source || "",
      },
      filled_fields: filled,
      state_registry_found: Boolean(digits(data.state_registration)),
    });
  } catch (error) {
    console.error(error);
    return out({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
