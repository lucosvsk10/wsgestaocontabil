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

function taxRegimeFromPublicData(data: any) {
  const simples = String(data?.simples?.simples ?? data?.opcao_pelo_simples ?? "").toLowerCase();
  const mei = String(data?.simples?.mei ?? data?.opcao_pelo_mei ?? "").toLowerCase();
  if (["s", "sim", "true", "1"].includes(mei)) return "mei";
  if (["s", "sim", "true", "1"].includes(simples)) return "simples";
  return "";
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
  return {
    legal_name: clean(raw?.razao_social),
    trade_name: clean(e?.nome_fantasia),
    tax_id: cnpj,
    state_registration: digits(preferredIe?.inscricao_estadual),
    ie_indicator: preferredIe ? "1" : "",
    icms_taxpayer: Boolean(preferredIe),
    tax_regime: taxRegimeFromPublicData(raw),
    email: clean(e?.email),
    phone: digits(phone),
    postal_code: digits(e?.cep),
    street: [clean(e?.tipo_logradouro), clean(e?.logradouro)].filter(Boolean).join(" "),
    street_number: clean(e?.numero),
    complement: clean(e?.complemento),
    district: clean(e?.bairro),
    city: clean(e?.cidade?.nome),
    state,
    city_ibge_code: digits(e?.cidade?.ibge_id),
    cnae_primary: digits(e?.atividade_principal?.id),
    registration_status: clean(e?.situacao_cadastral),
    federal_source: "CNPJ.ws",
    state_source: preferredIe ? "CNPJ.ws" : "",
  };
}

function normalizeBrasilApi(raw: any, cnpj: string) {
  const phone = clean(raw?.ddd_telefone_1 || raw?.ddd_telefone_2);
  return {
    legal_name: clean(raw?.razao_social),
    trade_name: clean(raw?.nome_fantasia),
    tax_id: cnpj,
    state_registration: "",
    ie_indicator: "",
    icms_taxpayer: false,
    tax_regime: taxRegimeFromPublicData(raw),
    email: clean(raw?.email),
    phone: digits(phone),
    postal_code: digits(raw?.cep),
    street: [clean(raw?.descricao_tipo_de_logradouro), clean(raw?.logradouro)].filter(Boolean).join(" "),
    street_number: clean(raw?.numero),
    complement: clean(raw?.complemento),
    district: clean(raw?.bairro),
    city: clean(raw?.municipio),
    state: clean(raw?.uf).toUpperCase(),
    city_ibge_code: digits(raw?.codigo_municipio_ibge),
    cnae_primary: digits(raw?.cnae_fiscal),
    registration_status: clean(raw?.descricao_situacao_cadastral),
    federal_source: "BrasilAPI",
    state_source: "",
  };
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
  try {
    const raw = await fetchJson(`https://publica.cnpj.ws/cnpj/${cnpj}`);
    return normalizeCnpjWs(raw, cnpj);
  } catch (firstError) {
    console.warn("CNPJ.ws lookup failed", firstError);
    const raw = await fetchJson(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`);
    return normalizeBrasilApi(raw, cnpj);
  }
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
  if (digits(base?.state_registration)) return base;
  const uf = clean(base?.state).toUpperCase();
  if (uf === "AL") {
    const al = await lookupAlStateRegistration(cnpj);
    if (al) return { ...base, ...al };
  }
  const sintegra = await lookupSintegraWs(cnpj, uf);
  return sintegra ? { ...base, ...sintegra } : base;
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
    return out({
      ok: true,
      data,
      sources: {
        federal: data.federal_source || "",
        state: data.state_source || "",
      },
      state_registry_found: Boolean(digits(data.state_registration)),
    });
  } catch (error) {
    console.error(error);
    return out({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
