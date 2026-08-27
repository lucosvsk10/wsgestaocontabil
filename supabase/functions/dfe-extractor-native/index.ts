import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";
import { ICP_BRASIL_V10_PEM } from "./ca.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const decoder = new TextDecoder();

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
  const direction = emitCnpj === companyCnpj ? "saida" : destCnpj === companyCnpj ? "entrada" : "relacionada";
  return { nsu, schema, fullXml, direction, accessKey, issueDate, value, issuerCnpj: emitCnpj, issuerName, recipientCnpj: destCnpj, number, series, statusCode, xml: clean };
}

function extractResponse(xml: string) {
  return { cStat: tag(xml, "cStat"), xMotivo: tag(xml, "xMotivo"), dhResp: tag(xml, "dhResp"), ultNSU: tag(xml, "ultNSU"), maxNSU: tag(xml, "maxNSU") };
}

function indexOfBytes(haystack: Uint8Array, needle: Uint8Array) {
  outer: for (let i = 0; i <= haystack.length - needle.length; i++) {
    for (let j = 0; j < needle.length; j++) if (haystack[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

function decodeChunked(body: Uint8Array) {
  const out: number[] = [];
  let pos = 0;
  while (pos < body.length) {
    const lineEnd = indexOfBytes(body.slice(pos), encoder.encode("\r\n"));
    if (lineEnd < 0) break;
    const sizeText = decoder.decode(body.slice(pos, pos + lineEnd)).split(";", 1)[0].trim();
    const size = Number.parseInt(sizeText, 16);
    if (!Number.isFinite(size)) throw new Error("Resposta HTTP chunked inválida do Ambiente Nacional.");
    pos += lineEnd + 2;
    if (size === 0) break;
    out.push(...body.slice(pos, pos + size));
    pos += size + 2;
  }
  return Uint8Array.from(out);
}

async function postRawMtls(endpoint: string, soap: string, cert: ReturnType<typeof lerCertificado>) {
  const url = new URL(endpoint);
  const intermediates = Array.isArray(cert.cadeiaPem) ? cert.cadeiaPem.slice(0, 1) : [];
  const certChain = [cert.certificadoPem, ...intermediates].join("\n");
  const conn = await Deno.connectTls({
    hostname: url.hostname,
    port: 443,
    cert: certChain,
    key: cert.chavePrivadaPem,
    caCerts: [ICP_BRASIL_V10_PEM],
    alpnProtocols: ["http/1.1"],
  });
  try {
    const action = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse";
    const body = encoder.encode(soap);
    const head = [
      `POST ${url.pathname} HTTP/1.1`,
      `Host: ${url.hostname}`,
      `Content-Type: application/soap+xml; charset=utf-8; action=\"${action}\"`,
      "Accept: application/soap+xml, text/xml, */*",
      `Content-Length: ${body.length}`,
      "Connection: close",
      "User-Agent: WS-Gestao-DFe/1.1",
      "",
      "",
    ].join("\r\n");
    await conn.write(encoder.encode(head));
    await conn.write(body);
    const parts: Uint8Array[] = [];
    const buffer = new Uint8Array(32768);
    while (true) {
      const n = await conn.read(buffer);
      if (n === null) break;
      parts.push(buffer.slice(0, n));
    }
    const total = parts.reduce((sum, p) => sum + p.length, 0);
    const raw = new Uint8Array(total);
    let offset = 0;
    for (const p of parts) { raw.set(p, offset); offset += p.length; }
    const sep = indexOfBytes(raw, encoder.encode("\r\n\r\n"));
    if (sep < 0) throw new Error("Resposta HTTP inválida do Ambiente Nacional.");
    const headerText = decoder.decode(raw.slice(0, sep));
    const status = Number(headerText.match(/^HTTP\/\d(?:\.\d)?\s+(\d{3})/i)?.[1] || 0);
    let responseBody = raw.slice(sep + 4);
    if (/transfer-encoding:\s*chunked/i.test(headerText)) responseBody = decodeChunked(responseBody);
    const text = decoder.decode(responseBody);
    if (status < 200 || status >= 300) throw new Error(`Ambiente Nacional respondeu HTTP ${status}: ${text.slice(0, 900)}`);
    return { text, transport: "Deno.connectTls + HTTP/1.1", presentedChain: 1 + intermediates.length };
  } finally {
    conn.close();
  }
}

async function requestDistribution(cert: ReturnType<typeof lerCertificado>, cnpj: string, ufCode: string, ultNSU: string, environment: "homologacao" | "producao") {
  const endpoint = environment === "producao"
    ? "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx"
    : "https://hom1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
  const tpAmb = environment === "producao" ? "1" : "2";
  const nsu = digits(ultNSU || "0").padStart(15, "0").slice(-15);
  const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg><distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${ufCode}</cUFAutor><CNPJ>${cnpj}</CNPJ><distNSU><ultNSU>${nsu}</ultNSU></distNSU></distDFeInt></nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;
  const result = await postRawMtls(endpoint, soap, cert);
  return { endpoint, ...result };
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
    const { endpoint, text, transport, presentedChain } = await requestDistribution(cert, cnpj, ufCode, ultNSU, environment);
    const response = extractResponse(text);
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
      endpoint,
      transport,
      presentedChain,
      availableChainCertificates: Array.isArray(cert.cadeiaPem) ? cert.cadeiaPem.length : 0,
      certificate: { cnpj, nome: cert.titular.nome, validadeFim: cert.validadeFim.toISOString(), validoAgora: true },
      response,
      documents: docs,
    });
  } catch (reason) {
    console.error("dfe-extractor-native", reason);
    return json({ error: reason instanceof Error ? reason.message : String(reason) }, 500);
  }
});
