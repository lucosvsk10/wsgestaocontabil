import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import * as https from "node:https";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

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

function postNodeHttpsTls12(endpoint: string, soap: string, pfx: Buffer, password: string): Promise<{ text: string; status: number; tlsProtocol: string; alpn: string | false }> {
  const url = new URL(endpoint);
  const action = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe/nfeDistDFeInteresse";
  const body = Buffer.from(soap, "utf8");

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      pfx,
      passphrase: password,
      minVersion: "TLSv1.2",
      maxVersion: "TLSv1.2",
      ALPNProtocols: ["http/1.1"],
      servername: url.hostname,
      rejectUnauthorized: true,
      agent: false,
      headers: {
        "Content-Type": "text/xml; charset=utf-8",
        "SOAPAction": `"${action}"`,
        "Accept": "text/xml, */*",
        "Content-Length": String(body.length),
        "Connection": "close",
        "User-Agent": "WS-Gestao-DFe/2.0",
      },
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
      res.on("end", () => {
        const text = Buffer.concat(chunks).toString("utf8");
        const socket = res.socket as any;
        resolve({
          text,
          status: res.statusCode || 0,
          tlsProtocol: typeof socket?.getProtocol === "function" ? String(socket.getProtocol() || "") : "",
          alpn: socket?.alpnProtocol || false,
        });
      });
    });

    req.setTimeout(30000, () => req.destroy(new Error("Timeout de 30s no Ambiente Nacional.")));
    req.on("error", (error) => reject(new Error(`Falha HTTPS TLS 1.2 no Ambiente Nacional: ${error.message}`)));
    req.write(body);
    req.end();
  });
}

async function requestDistribution(pfx: Buffer, password: string, cnpj: string, ufCode: string, ultNSU: string, environment: "homologacao" | "producao") {
  const endpoint = environment === "producao"
    ? "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx"
    : "https://hom.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
  const tpAmb = environment === "producao" ? "1" : "2";
  const nsu = digits(ultNSU || "0").padStart(15, "0").slice(-15);
  const soap = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <soap:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>${tpAmb}</tpAmb>
          <cUFAutor>${ufCode}</cUFAutor>
          <CNPJ>${cnpj}</CNPJ>
          <distNSU><ultNSU>${nsu}</ultNSU></distNSU>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap:Body>
</soap:Envelope>`;

  const result = await postNodeHttpsTls12(endpoint, soap, pfx, password);
  if (result.status < 200 || result.status >= 300) throw new Error(`Ambiente Nacional respondeu HTTP ${result.status}: ${result.text.slice(0, 1200)}`);
  return { endpoint, ...result, transport: "node:https + PFX nativo + TLS 1.2 + HTTP/1.1 + SOAP 1.1" };
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

    const pfx = Buffer.from(pfxBase64, "base64");
    const cert = lerCertificado(pfx, password);
    const cnpj = digits(cert.titular.cnpj);
    if (cnpj.length !== 14) return json({ error: "O certificado precisa pertencer a uma pessoa jurídica com CNPJ." }, 422);
    if (cert.validadeInicio > new Date() || cert.validadeFim < new Date()) return json({ error: "Certificado fora do período de validade." }, 422);

    const environment = body.environment === "homologacao" ? "homologacao" : "producao";
    const ufCode = digits(body.uf_code || "27").padStart(2, "0").slice(-2);
    const ultNSU = digits(body.ult_nsu || "0").padStart(15, "0").slice(-15);
    const { endpoint, text, transport, tlsProtocol, alpn } = await requestDistribution(pfx, password, cnpj, ufCode, ultNSU, environment);
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
      tlsProtocol,
      alpn,
      certificate: { cnpj, nome: cert.titular.nome, validadeFim: cert.validadeFim.toISOString(), validoAgora: true },
      response,
      documents: docs,
    });
  } catch (reason) {
    console.error("dfe-extractor-native", reason);
    return json({ error: reason instanceof Error ? reason.message : String(reason) }, 500);
  }
});
