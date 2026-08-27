import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";
import { buildCteXml, validateCteInput } from "./xml.ts";
import { signCteXml } from "./sign.ts";
import { authorizeCte, parseCteResponse, statusCte } from "./sefaz.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");

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

async function resolveCertificate(admin: ReturnType<typeof createClient>, body: Record<string, any>) {
  let pfxBase64 = String(body.certificate_base64 || "").trim();
  let password = String(body.certificate_password || "");
  let source = "request";

  if (!pfxBase64 || !password) {
    const { data, error } = await admin.rpc("get_ws_test_a1_credentials");
    if (error) throw new Error("Não foi possível carregar o certificado A1 padrão do laboratório.");
    const row = Array.isArray(data) ? data[0] : data;
    pfxBase64 = String(row?.pfx_base64 || "").trim();
    password = String(row?.certificate_password || "");
    source = "vault";
  }

  if (!pfxBase64 || !password) throw new Error("Certificado A1 padrão não configurado.");
  const cert = lerCertificado(Buffer.from(pfxBase64, "base64"), password);
  return { cert, source };
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

    const body = await req.json() as Record<string, any>;
    if (!await verifyEngineToken(String(body.engine_token || ""), user.id)) return json({ error: "Sessão da Feature expirada. Desbloqueie novamente." }, 401);
    if (body.environment === "producao") return json({ error: "Produção CT-e permanece bloqueada. Use homologação." }, 403);

    const { cert, source } = await resolveCertificate(admin, body);
    const cnpj = digits(cert.titular.cnpj);
    if (cnpj.length !== 14) return json({ error: "O certificado precisa possuir CNPJ." }, 422);
    if (cert.validadeInicio > new Date() || cert.validadeFim < new Date()) return json({ error: "Certificado fora do período de validade." }, 422);

    const certificate = { cnpj, nome: cert.titular.nome, validadeFim: cert.validadeFim.toISOString(), validoAgora: true, source };
    const action = String(body.action || "status");

    if (action === "inspect_certificate") return json({ ok: true, environment: "homologacao", certificate });

    if (action === "status") {
      const result = await statusCte(cert, digits(body.data?.cUF || "27"));
      return json({ ok: true, environment: "homologacao", provider: "SVRS", certificate, endpoint: result.endpoint, response: parseCteResponse(result.text) });
    }

    const data = (body.data || {}) as Record<string, any>;
    const validation = validateCteInput(data, cnpj);
    if (!validation.valid) return json({ ok: false, ...validation, certificate }, 422);
    const built = buildCteXml(data, cnpj);
    const signedXml = signCteXml(built.xml, cert.chavePrivadaPem, cert.certificadoPem);

    if (action === "preview") {
      return json({ ok: true, environment: "homologacao", certificate, chave: built.chave, id: built.id, xml: signedXml, validation });
    }

    if (action === "issue") {
      const result = await authorizeCte(cert, signedXml);
      const response = parseCteResponse(result.text);
      return json({ ok: response.authorized, environment: "homologacao", provider: "SVRS", certificate, chave: built.chave, endpoint: result.endpoint, response, signedXml });
    }

    return json({ error: "Ação inválida. Use inspect_certificate, status, preview ou issue." }, 400);
  } catch (reason) {
    console.error("cte-issue-native", reason);
    return json({ error: reason instanceof Error ? reason.message : String(reason) }, 500);
  }
});