import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const toBase64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
};

async function verifyEngineToken(token: string, userId: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
  if (signature !== expected) return false;
  try {
    const decoded = JSON.parse(fromBase64Url(payload));
    return decoded.uid === userId && Number(decoded.exp) > Date.now();
  } catch { return false; }
}

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

function validCpf(value: string) {
  const cpf = digits(value);
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += Number(cpf[i]) * (10 - i);
  let check = (sum * 10) % 11; if (check === 10) check = 0;
  if (check !== Number(cpf[9])) return false;
  sum = 0;
  for (let i = 0; i < 10; i++) sum += Number(cpf[i]) * (11 - i);
  check = (sum * 10) % 11; if (check === 10) check = 0;
  return check === Number(cpf[10]);
}

function validCnpj(value: string) {
  const cnpj = digits(value);
  if (!/^\d{14}$/.test(cnpj) || /^(\d)\1+$/.test(cnpj)) return false;
  const calc = (base: string, weights: number[]) => {
    const sum = weights.reduce((acc, weight, index) => acc + Number(base[index]) * weight, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  const d1 = calc(cnpj.slice(0, 12), [5,4,3,2,9,8,7,6,5,4,3,2]);
  const d2 = calc(cnpj.slice(0, 12) + d1, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return cnpj.endsWith(`${d1}${d2}`);
}

function nowBrazilIso() {
  const date = new Date();
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}-03:00`;
}

function buildPayload(raw: Record<string, unknown>) {
  const issueDate = nowBrazilIso();
  const competence = issueDate.slice(0, 10);
  const cnpjTomador = digits(raw.cnpjTomador);
  const cpfTomador = digits(raw.cpfTomador);
  const payload: Record<string, unknown> = {
    data_emissao: issueDate,
    serie_dps: Number(raw.serie || 1),
    numero_dps: Number(raw.numero || 1),
    data_competencia: competence,
    emitente_dps: "1",
    codigo_municipio_emissora: Number(digits(raw.municipioEmissor)),
    cnpj_prestador: digits(raw.cnpjPrestador),
    codigo_opcao_simples_nacional: String(raw.simples || "1"),
    codigo_municipio_prestacao: digits(raw.municipioPrestacao || raw.municipioEmissor),
    codigo_tributacao_nacional_iss: digits(raw.codigoTributacao),
    descricao_servico: String(raw.descricao || "").trim(),
    valor_servico: Number(raw.valor || 0),
    tributacao_iss: Number(raw.tributacaoIss || 1),
  };
  if (cnpjTomador) payload.cnpj_tomador = cnpjTomador;
  if (cpfTomador) payload.cpf_tomador = cpfTomador;
  return payload;
}

function validate(raw: Record<string, unknown>) {
  const errors: string[] = [];
  const warnings: string[] = [];
  const cnpj = digits(raw.cnpjPrestador);
  const municipality = digits(raw.municipioEmissor);
  const serviceMunicipality = digits(raw.municipioPrestacao || raw.municipioEmissor);
  const code = digits(raw.codigoTributacao);
  const cnpjTomador = digits(raw.cnpjTomador);
  const cpfTomador = digits(raw.cpfTomador);

  if (!validCnpj(cnpj)) errors.push("CNPJ do prestador inválido.");
  if (!/^\d{7}$/.test(municipality)) errors.push("Código IBGE do município emissor deve ter 7 dígitos.");
  if (!/^\d{7}$/.test(serviceMunicipality)) errors.push("Código IBGE do município da prestação deve ter 7 dígitos.");
  if (!code) errors.push("Informe o código de tributação nacional do ISS.");
  if (!String(raw.descricao || "").trim()) errors.push("Informe a descrição do serviço.");
  if (!(Number(raw.valor) > 0)) errors.push("O valor do serviço deve ser maior que zero.");
  if (cnpjTomador && !validCnpj(cnpjTomador)) errors.push("CNPJ do tomador inválido.");
  if (cpfTomador && !validCpf(cpfTomador)) errors.push("CPF do tomador inválido.");
  if (cnpjTomador && cpfTomador) errors.push("Informe CNPJ ou CPF do tomador, não os dois.");
  if (!cnpjTomador && !cpfTomador) warnings.push("Tomador sem CPF/CNPJ: confirme se a operação permite tomador não identificado.");
  if (!String(raw.numero || "").trim()) warnings.push("Número da DPS não informado; foi usado 1.");
  return { valid: errors.length === 0, errors, warnings, payload: buildPayload(raw) };
}

async function focusRequest(token: string, environment: string, method: string, path: string, body?: unknown) {
  const base = environment === "producao" ? "https://api.focusnfe.com.br" : "https://homologacao.focusnfe.com.br";
  const response = await fetch(`${base}${path}`, {
    method,
    headers: {
      Authorization: `Basic ${btoa(`${token}:`)}`,
      Accept: "application/json",
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const text = await response.text();
  let parsed: unknown = text;
  try { parsed = JSON.parse(text); } catch { /* mantém texto */ }
  return { status: response.status, ok: response.ok, response: parsed };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => row.role === "admin")) return json({ error: "Acesso exclusivo para administradores" }, 403);

    const body = await req.json();
    if (!await verifyEngineToken(String(body.engine_token || ""), user.id)) return json({ error: "Sessão da Feature expirada. Desbloqueie novamente." }, 401);

    const action = String(body.action || "validate");
    const environment = body.environment === "producao" ? "producao" : "homologacao";
    const providerToken = String(body.provider_token || Deno.env.get("FOCUS_NFE_TOKEN") || "").trim();

    if (action === "validate") {
      const result = validate((body.data || {}) as Record<string, unknown>);
      return json({ ...result, provider: "focus-nfe", environment });
    }

    if (action === "issue") {
      if (environment !== "homologacao") return json({ error: "A Feature está travada em homologação. Produção não é permitida neste laboratório." }, 403);
      if (!providerToken) return json({ error: "Informe um token de homologação da Focus NFe." }, 400);
      const result = validate((body.data || {}) as Record<string, unknown>);
      if (!result.valid) return json({ ...result, provider: "focus-nfe", environment }, 422);
      const reference = `ws-${digits((body.data || {}).cnpjPrestador).slice(-8)}-${Date.now()}`;
      const remote = await focusRequest(providerToken, environment, "POST", `/v2/nfsen?ref=${encodeURIComponent(reference)}`, result.payload);
      return json({ ...result, reference, provider: "focus-nfe", environment, status: remote.status, ok: remote.ok, response: remote.response }, remote.ok ? 200 : remote.status);
    }

    if (action === "query") {
      if (!providerToken) return json({ error: "Informe o token de homologação da Focus NFe." }, 400);
      const reference = String(body.reference || "").trim();
      if (!reference) return json({ error: "Informe a referência da emissão." }, 400);
      const remote = await focusRequest(providerToken, environment, "GET", `/v2/nfsen/${encodeURIComponent(reference)}`);
      return json({ reference, provider: "focus-nfe", environment, status: remote.status, ok: remote.ok, response: remote.response }, remote.ok ? 200 : remote.status);
    }

    return json({ error: "Ação inválida." }, 400);
  } catch (reason) {
    console.error("nfse-feature", reason);
    return json({ error: reason instanceof Error ? reason.message : "Falha interna na Feature." }, 500);
  }
});
