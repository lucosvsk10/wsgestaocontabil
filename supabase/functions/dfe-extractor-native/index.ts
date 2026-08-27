import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const BRIDGE_URL = "https://ws-dfe-bridge.vercel.app/distribuicao";

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
const tag = (xml: string, name: string) => xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`, "i"))?.[1]?.trim() || "";
const attr = (source: string, name: string) => source.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] || "";
const decodeEntities = (value: string) => value.replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&").replaceAll("&quot;", '"').replaceAll("&apos;", "'");

async function gunzipBase64(value: string) {
  const binary = atob(value.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return decoder.decode(await new Response(stream).arrayBuffer());
}

function parseDocument(xml: string, schema: string, nsu: string, companyCnpj: string) {
  const clean = decodeEntities(xml);
  const emitBlock = tag(clean, "emit");
  const destBlock = tag(clean, "dest");
  const emitCnpj = digits(tag(emitBlock, "CNPJ") || tag(clean, "CNPJ"));
  const destCnpj = digits(tag(destBlock, "CNPJ"));
  const accessKey = tag(clean, "chNFe") || (clean.match(/Id=["']NFe(\d{44})["']/i)?.[1] || "");
  const issueDate = tag(clean, "dhEmi") || tag(clean, "dEmi");
  const value = Number(tag(clean, "vNF") || 0);
  const issuerName = tag(emitBlock, "xNome") || tag(clean, "xNome");
  const number = tag(clean, "nNF");
  const series = tag(clean, "serie");
  const statusCode = tag(clean, "cSitNFe") || tag(clean, "cStat");
  const fullXml = /procNFe|NFe/i.test(schema) && !/resNFe/i.test(schema);
  const direction = /resNFe/i.test(schema)
    ? (emitCnpj === companyCnpj ? "saida" : "entrada")
    : emitCnpj === companyCnpj ? "saida" : destCnpj === companyCnpj ? "entrada" : "relacionada";
  return { nsu, schema, fullXml, direction, accessKey, issueDate, value, issuerCnpj: emitCnpj, issuerName, recipientCnpj: destCnpj, number, series, statusCode, xml: clean };
}

async function requestDistribution(auth: string, pfxBase64: string, password: string, cnpj: string, ufCode: string, ultNSU: string, environment: "homologacao" | "producao") {
  const response = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: { "Authorization": auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      certificate_base64: pfxBase64,
      certificate_password: password,
      cnpj,
      ufCode,
      uf_code: ufCode,
      ultNSU,
      ult_nsu: ultNSU,
      environment,
    }),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(`Bridge fiscal respondeu HTTP ${response.status}: ${payload.error || "erro desconhecido"}${payload.raw ? ` — ${String(payload.raw).slice(0, 500)}` : ""}`);
  if (!payload.raw_xml) throw new Error("Bridge fiscal respondeu sem XML bruto.");
  return payload;
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

    const body = await req.json() as Record<string, unknown>;
    if (!await verifyEngineToken(String(body.engine_token || ""), user.id)) return json({ error: "Sessão da Feature expirada. Desbloqueie novamente." }, 401);
    const pfxBase64 = String(body.certificate_base64 || "").trim();
    const password = String(body.certificate_password || "");
    if (!pfxBase64 || !password) return json({ error: "Informe o certificado A1 e a senha." }, 400);

    const cert = lerCertificado(Buffer.from(pfxBase64, "base64"), password);
    const cnpj = digits(cert.titular.cnpj);
    if (cnpj.length !== 14) return json({ error: "O certificado precisa pertencer a uma pessoa jurídica com CNPJ." }, 422);
    if (cert.validadeInicio > new Date() || cert.validadeFim < new Date()) return json({ error: "Certificado fora do período de validade." }, 422);

    const environment = body.environment === "homologacao" ? "homologacao" : "producao";
    const ufCode = digits(body.uf_code || "27").padStart(2, "0").slice(-2);
    const ultNSU = digits(body.ult_nsu || "0").padStart(15, "0").slice(-15);
    const bridge = await requestDistribution(auth, pfxBase64, password, cnpj, ufCode, ultNSU, environment);
    const text = String(bridge.raw_xml || "");
    const response = bridge.response || { cStat: tag(text, "cStat"), xMotivo: tag(text, "xMotivo"), dhResp: tag(text, "dhResp"), ultNSU: tag(text, "ultNSU"), maxNSU: tag(text, "maxNSU") };

    const docs: Array<Record<string, unknown>> = [];
    const re = /<docZip\b([^>]*)>([\s\S]*?)<\/docZip>/gi;
    let match: RegExpExecArray | null;
    while ((match = re.exec(text))) {
      const nsu = attr(match[1], "NSU");
      const schema = attr(match[1], "schema");
      try {
        const xml = await gunzipBase64(match[2]);
        docs.push(parseDocument(xml, schema, nsu, cnpj));
      } catch (error) {
        docs.push({ nsu, schema, parseError: error instanceof Error ? error.message : String(error), fullXml: false, direction: "relacionada" });
      }
    }

    return json({
      ok: response.cStat === "137" || response.cStat === "138",
      environment,
      provider: "Ambiente Nacional NF-e",
      endpoint: BRIDGE_URL,
      transport: bridge.transport || "Vercel Node/OpenSSL bridge",
      tlsProtocol: bridge.tlsProtocol || null,
      alpn: bridge.alpn || null,
      certificate: { cnpj, nome: cert.titular.nome, validadeFim: cert.validadeFim.toISOString(), validoAgora: true },
      response,
      documents: docs,
    });
  } catch (reason) {
    console.error("dfe-extractor-native", reason);
    return json({ error: reason instanceof Error ? reason.message : String(reason) }, 500);
  }
});
