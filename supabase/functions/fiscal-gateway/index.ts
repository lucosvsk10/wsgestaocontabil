// fiscal-gateway: native replacement for the Vercel bridges
//   ws-svrs-consit      -> /fiscal-gateway/api/consit, /api/download
//   ws-dfe-bridge       -> /fiscal-gateway/api/distribuicao
//   ws-nfse-sefin-probe -> /fiscal-gateway/api/fiscal-soap, /api/nfe-event, /api/sefaz-al-registry,
//                          /api/sefaz-al-entry-report, /api/sefaz-al-sales-report, /api/sefaz-al-report
// Request/response contracts are kept identical to the Vercel handlers so callers only swap the base URL.
import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { SignedXml } from "npm:xml-crypto@6.1.2";
import JSZip from "npm:jszip@3.10.1";
import { b64, gzipB64, httpsRequest, Material, materialFromBody, mergeCookies, pfxToPem } from "./transport.ts";

const E = new TextEncoder();
const GATEWAY_TOKEN_SHA256 = "7725295432774011f678a73ced1ae9761a168ba47df4f008f971f90ac0bd2352";
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), {
  status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
});
async function sha256Hex(v: string) {
  const d = await crypto.subtle.digest("SHA-256", E.encode(v));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
async function bearerAuthorized(req: Request) {
  const t = String(req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  return Boolean(t) && safeEqual(await sha256Hex(t), GATEWAY_TOKEN_SHA256);
}
async function hmacHex(secret: string, msg: string) {
  const key = await crypto.subtle.importKey("raw", E.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, E.encode(msg));
  return Array.from(new Uint8Array(sig)).map(b => b.toString(16).padStart(2, "0")).join("");
}
async function dfeHmacAuthorized(req: Request, raw: string) {
  const secret = Deno.env.get("DFE_BRIDGE_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!secret) return false;
  const ts = String(req.headers.get("x-ws-timestamp") || "");
  const sig = String(req.headers.get("x-ws-signature") || "");
  const ms = Number(ts);
  if (!Number.isFinite(ms) || Math.abs(Date.now() - ms) > 5 * 60 * 1000) return false;
  for (const body of [raw, JSON.stringify(JSON.parse(raw || "{}"))]) {
    if (safeEqual(sig, await hmacHex(secret, `dfe-bridge:${ts}:${body}`))) return true;
  }
  return false;
}
const tag = (xml: string, name: string) => xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`, "i"))?.[1]?.trim() || "";
const tags = (xml: string, name: string) => [...String(xml || "").matchAll(new RegExp(`<(?:(?:\\w+):)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:(?:\\w+):)?${name}>`, "gi"))].map(m => m[1].trim());
const stripDecl = (xml: unknown) => String(xml || "").replace(/^<\?xml[^>]*\?>\s*/i, "");
function decodeXmlEntities(v: string) {
  let s = String(v || "");
  for (let i = 0; i < 3; i++) {
    const n = s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
    if (n === s) break;
    s = n;
  }
  return s;
}
const envelope = (tagName: string, ns: string, payload: string) =>
  `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><${tagName} xmlns="${ns}">${payload}</${tagName}></soap12:Body></soap12:Envelope>`;
const soapPost = (endpoint: string, material: Material, soap: string, contentType: string) =>
  httpsRequest(endpoint, { method: "POST", material, body: soap, headers: { "Content-Type": contentType, "Accept": "application/soap+xml, text/xml, */*" } });
const okWrap = (r: { status: number; text: string }, endpoint: string, extra: Record<string, unknown> = {}, decode = false) =>
  json(r.status >= 200 && r.status < 300 ? 200 : 502, { ok: r.status >= 200 && r.status < 300, http: r.status, endpoint, ...extra, text: decode ? decodeXmlEntities(r.text) : r.text });

// ---------- ws-svrs-consit ----------
async function routeConsit(b: any) {
  if (!b.certificate_base64 || !b.certificate_password || !b.soap_body) return json(400, { error: "missing_fields" });
  const material = await materialFromBody(b);
  const r = await httpsRequest("https://nfce.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx", {
    method: "POST", material, body: String(b.soap_body), timeoutMs: 20000,
    headers: { "Content-Type": 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4/nfeConsultaNF"', "User-Agent": "WS-Gestao/1.0" },
  });
  return json(200, { ok: true, status: r.status, body: r.text });
}
async function routeDownload(b: any) {
  if (!b.certificate_base64 || !b.certificate_password || !b.access_key) return json(400, { error: "missing_fields" });
  const material = await materialFromBody(b);
  const form = new URLSearchParams({ sistema: "Nfce", OrigemSite: "SiteSefaz", Ambiente: "1", ChaveAcessoDfe: String(b.access_key) }).toString();
  const r = await httpsRequest("https://dfe-portal.svrs.rs.gov.br/BpeSSL/DownloadXmlDfe", {
    method: "POST", material, body: form, timeoutMs: 20000,
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Accept": "application/xml,text/xml,*/*", "User-Agent": "WS-Gestao/1.0" },
  });
  const ct = String(r.headers["content-type"] || "");
  return json(200, { ok: true, status: r.status, headers: r.headers, body_base64: b64(r.body), body_text: r.text, is_xml: ct.toLowerCase().includes("xml") });
}

// ---------- ws-dfe-bridge ----------
async function routeDistribuicao(b: any) {
  const pfx = String(b.certificate_base64 || "");
  const pwd = String(b.certificate_password || "");
  if (!pfx || !pwd || pfx.length > 3_500_000 || pwd.length > 256) return json(400, { error: "Invalid certificate bundle" });
  const cnpj = digits(b.cnpj);
  if (cnpj.length !== 14) return json(400, { error: "Invalid CNPJ" });
  const environment = b.environment === "homologacao" ? "homologacao" : "producao";
  const host = environment === "homologacao" ? "hom1.nfe.fazenda.gov.br" : "www1.nfe.fazenda.gov.br";
  const nsu = digits(b.ult_nsu || "0").padStart(15, "0").slice(-15);
  const uf = digits(b.uf_code || "27").padStart(2, "0").slice(-2);
  const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg><distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${environment === "homologacao" ? "2" : "1"}</tpAmb><cUFAutor>${uf}</cUFAutor><CNPJ>${cnpj}</CNPJ><distNSU><ultNSU>${nsu}</ultNSU></distNSU></distDFeInt></nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;
  const material = await materialFromBody(b);
  const r = await httpsRequest(`https://${host}/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx`, {
    method: "POST", material, body: soap, timeoutMs: 30000,
    headers: { "Content-Type": "application/soap+xml; charset=utf-8", "Accept": "application/soap+xml, text/xml, */*", "User-Agent": "WS-Gestao-DFe-Bridge/1.0" },
  });
  if (r.status < 200 || r.status >= 300) return json(502, { error: `Ambiente Nacional HTTP ${r.status}` });
  return json(200, {
    ok: true, transport: "Supabase Edge/rustls + A1 + TLS 1.2 + HTTP/1.1 + SOAP 1.2", tlsProtocol: null, alpn: null,
    response: { cStat: tag(r.text, "cStat"), xMotivo: tag(r.text, "xMotivo"), ultNSU: tag(r.text, "ultNSU"), maxNSU: tag(r.text, "maxNSU") },
    raw_xml: r.text,
  });
}

// ---------- ws-nfse-sefin-probe / fiscal-soap ----------
const nfeEndpoint = (model: string, env: string) => {
  const prod = env === "production";
  if (model === "65") return prod ? "https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx" : "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx";
  return prod ? "https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx" : "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx";
};
const cteBase = (env: string) => env === "production" ? "https://cte.svrs.rs.gov.br/ws" : "https://cte-homologacao.svrs.rs.gov.br/ws";
const mdfeBase = (env: string) => env === "production" ? "https://mdfe.svrs.rs.gov.br/ws" : "https://mdfe-homologacao.svrs.rs.gov.br/ws";

async function probe(url: string, material: Material) {
  const r = await httpsRequest(url + (url.includes("?") ? "&WSDL" : "?WSDL"), { method: "GET", material });
  return { ok: r.status >= 200 && r.status < 500, http: r.status, endpoint: r.endpoint, wsdl_detected: /wsdl|definitions|schema/i.test(r.text), response_excerpt: r.text.slice(0, 350) };
}

async function routeFiscalSoap(b: any) {
  const action = String(b.action || "");
  const env = b.environment === "production" ? "production" : "homologation";
  const tpAmb = env === "production" ? "1" : "2";
  if (action === "sp-tls-peer-info") return json(410, { ok: false, error: "sp_tls_peer_info_not_available_in_native_gateway" });
  if (action === "sp-nfe-recover-key") return json(410, { ok: false, error: "sp_nfe_recovery_disabled_after_guard_failure", disabled: true });
  const material = await materialFromBody(b);
  if (!material) return json(500, { error: "certificate_required" });

  if (action === "nfe-probe") return json(200, await probe(nfeEndpoint(String(b.model) === "65" ? "65" : "55", env), material));
  if (action === "cte-probe") return json(200, await probe(`${cteBase(env)}/CTeStatusServicoV4/CTeStatusServicoV4.asmx`, material));
  if (action === "mdfe-probe") return json(200, await probe(`${mdfeBase(env)}/MDFeStatusServico/MDFeStatusServico.asmx`, material));

  if (action === "nfe-distribution") {
    const cnpj = digits(b.cnpj);
    const ufCode = digits(b.uf_code || b.ufCode).padStart(2, "0");
    const ultNSU = digits(b.ult_nsu || b.ultNSU || "0").padStart(15, "0");
    const accessKey = digits(b.access_key || b.chNFe);
    if (!/^\d{14}$/.test(cnpj) || !/^\d{2}$/.test(ufCode) || (accessKey && !/^\d{44}$/.test(accessKey))) return json(400, { error: "invalid_distribution_target" });
    const endpoint = env === "production" ? "https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx" : "https://hom.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx";
    const query = accessKey ? `<consChNFe><chNFe>${accessKey}</chNFe></consChNFe>` : `<distNSU><ultNSU>${ultNSU}</ultNSU></distNSU>`;
    const inner = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${ufCode}</cUFAutor><CNPJ>${cnpj}</CNPJ>${query}</distDFeInt>`;
    const ns = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe";
    const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDistDFeInteresse xmlns="${ns}"><nfeDadosMsg>${inner}</nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;
    return okWrap(await soapPost(endpoint, material, soap, `application/soap+xml; charset=utf-8; action="${ns}/nfeDistDFeInteresse"`), endpoint, {}, true);
  }
  if (action === "cte-distribution") {
    const cnpj = digits(b.cnpj);
    const ufCode = digits(b.uf_code || b.ufCode).padStart(2, "0");
    const ultNSU = digits(b.ult_nsu || b.ultNSU || "0").padStart(15, "0").slice(-15);
    if (!/^\d{14}$/.test(cnpj) || !/^\d{2}$/.test(ufCode)) return json(400, { error: "invalid_cte_distribution_target" });
    const endpoint = env === "production" ? "https://www1.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx" : "https://hom.cte.fazenda.gov.br/CTeDistribuicaoDFe/CTeDistribuicaoDFe.asmx";
    const ns = "http://www.portalfiscal.inf.br/cte/wsdl/CTeDistribuicaoDFe";
    const inner = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/cte" versao="1.00"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${ufCode}</cUFAutor><CNPJ>${cnpj}</CNPJ><distNSU><ultNSU>${ultNSU}</ultNSU></distNSU></distDFeInt>`;
    const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Header><cteCabecMsg xmlns="${ns}"><cUF>${ufCode}</cUF><versaoDados>1.00</versaoDados></cteCabecMsg></soap12:Header><soap12:Body><cteDistDFeInteresse xmlns="${ns}"><cteDadosMsg>${inner}</cteDadosMsg></cteDistDFeInteresse></soap12:Body></soap12:Envelope>`;
    return okWrap(await soapPost(endpoint, material, soap, `application/soap+xml; charset=utf-8; action="${ns}/cteDistDFeInteresse"`), endpoint, {}, true);
  }
  if (action === "mdfe-distribution") {
    const cnpj = digits(b.cnpj);
    const ufCode = digits(b.uf_code || b.ufCode).padStart(2, "0");
    const ultNSU = digits(b.ult_nsu || b.ultNSU || "0").padStart(15, "0").slice(-15);
    if (!/^\d{14}$/.test(cnpj) || !/^\d{2}$/.test(ufCode)) return json(400, { error: "invalid_mdfe_distribution_target" });
    const endpoint = env === "production" ? "https://mdfe.svrs.rs.gov.br/ws/MDFeDistribuicaoDFe/MDFeDistribuicaoDFe.asmx" : "https://mdfe-homologacao.svrs.rs.gov.br/ws/MDFeDistribuicaoDFe/MDFeDistribuicaoDFe.asmx";
    const ns = "http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeDistribuicaoDFe";
    const inner = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/mdfe" versao="1.00"><tpAmb>${tpAmb}</tpAmb><CNPJ>${cnpj}</CNPJ><distNSU><ultNSU>${ultNSU}</ultNSU></distNSU></distDFeInt>`;
    const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Header><mdfeCabecMsg xmlns="${ns}"><cUF>${ufCode}</cUF><versaoDados>1.00</versaoDados></mdfeCabecMsg></soap12:Header><soap12:Body><mdfeDadosMsg xmlns="${ns}">${inner}</mdfeDadosMsg></soap12:Body></soap12:Envelope>`;
    return okWrap(await soapPost(endpoint, material, soap, `application/soap+xml; charset=utf-8; action="${ns}/mdfeDistDFeInteresse"`), endpoint, {}, true);
  }
  if (action === "sp-nfe-portal-probe") {
    const r = await httpsRequest("https://www.nfe.fazenda.sp.gov.br/ConsultaNFe/consulta/publica/ConsultarNFe.aspx", { method: "GET", material, headers: { Accept: "text/html,application/xhtml+xml,*/*" } });
    const text = r.text;
    return json(r.status >= 200 && r.status < 400 ? 200 : 502, {
      ok: r.status >= 200 && r.status < 400, http: r.status, endpoint: r.endpoint,
      title: text.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.trim() || "",
      captcha: /captcha|recaptcha|imagem.*seguran|c[oó]digo.*imagem/i.test(text),
      certificate_hint: /certificado digital|certificate/i.test(text),
      forms: [...text.matchAll(/<form\b[\s\S]*?<\/form>/gi)].slice(0, 4).map(m => m[0].replace(/\s+/g, " ").slice(0, 5000)),
      links: [...text.matchAll(/(?:href|action)=["']([^"']+)["']/gi)].map(m => m[1]).filter(Boolean).slice(0, 80),
      scripts: [...text.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m => m[1]).filter(Boolean).slice(0, 40),
      excerpt: text.replace(/\s+/g, " ").slice(0, 12000),
    });
  }
  if (action === "nfe-consult" || action === "sp-nfe-consult") {
    const accessKey = digits(b.access_key || b.chNFe);
    const spOnly = action === "sp-nfe-consult";
    if (!/^\d{44}$/.test(accessKey) || accessKey.slice(20, 22) !== "55" || (spOnly && accessKey.slice(0, 2) !== "35")) {
      return json(400, { error: spOnly ? "invalid_sp_nfe_access_key" : "invalid_nfe_access_key" });
    }
    const isSp = accessKey.slice(0, 2) === "35";
    const endpoint = isSp
      ? (env === "production" ? "https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx" : "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx")
      : (env === "production" ? "https://nfe.svrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx" : "https://nfe-homologacao.sefazrs.rs.gov.br/ws/NfeConsulta/NfeConsulta4.asmx");
    const ns = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4";
    const soap = envelope("nfeDadosMsg", ns, `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${tpAmb}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`);
    return okWrap(await soapPost(endpoint, material, soap, `application/soap+xml; charset=utf-8; action="${ns}/nfeConsultaNF"`), endpoint);
  }
  if (action === "sp-nfe-authorize") {
    const signed = stripDecl(b.signed_xml);
    if (!signed.includes("<NFe") && !signed.includes(":NFe")) return json(400, { error: "invalid_nfe_xml" });
    const endpoint = env === "production" ? "https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx" : "https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx";
    const idLote = digits(b.id_lote || Date.now()).slice(-15).padStart(15, "0");
    const ns = "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4";
    const soap = envelope("nfeDadosMsg", ns, `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${signed}</enviNFe>`);
    return okWrap(await soapPost(endpoint, material, soap, `application/soap+xml; charset=utf-8; action="${ns}/nfeAutorizacaoLote"`), endpoint, { idLote });
  }
  if (action === "sp-nfce-list") {
    const start = String(b.start || b.dataHoraInicial || "").trim();
    const end = String(b.end || b.dataHoraFinal || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start)) return json(400, { error: "invalid_start_datetime" });
    if (end && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(end)) return json(400, { error: "invalid_end_datetime" });
    const endpoint = env === "production" ? "https://nfce.fazenda.sp.gov.br/ws/NFCeListagemChaves.asmx" : "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFCeListagemChaves.asmx";
    const ns = "http://www.portalfiscal.inf.br/nfe/wsdl/NFCeListagemChaves";
    const soap = envelope("nfeDadosMsg", ns, `<nfceListagemChaves xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><tpAmb>${tpAmb}</tpAmb><dataHoraInicial>${start}</dataHoraInicial>${end ? `<dataHoraFinal>${end}</dataHoraFinal>` : ""}</nfceListagemChaves>`);
    return okWrap(await soapPost(endpoint, material, soap, `application/soap+xml; charset=utf-8; action="${ns}/nfceListagemChaves"`), endpoint);
  }
  if (action === "sp-nfce-download") {
    const accessKey = digits(b.access_key || b.chNFCe);
    if (!/^\d{44}$/.test(accessKey)) return json(400, { error: "invalid_access_key" });
    const endpoint = env === "production" ? "https://nfce.fazenda.sp.gov.br/ws/NFCeDownloadXML.asmx" : "https://homologacao.nfce.fazenda.sp.gov.br/ws/NFCeDownloadXML.asmx";
    const ns = "http://www.portalfiscal.inf.br/nfe/wsdl/NFCeDownloadXML";
    const soap = envelope("nfeDadosMsg", ns, `<nfceDownloadXML xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><tpAmb>${tpAmb}</tpAmb><chNFCe>${accessKey}</chNFCe></nfceDownloadXML>`);
    return okWrap(await soapPost(endpoint, material, soap, `application/soap+xml; charset=utf-8; action="${ns}/nfceDownloadXML"`), endpoint);
  }
  if (action === "nfe-authorize") {
    const model = String(b.model) === "65" ? "65" : "55";
    const signed = stripDecl(b.signed_xml);
    if (!signed.includes("<NFe") && !signed.includes(":NFe")) return json(400, { error: "invalid_nfe_xml" });
    const endpoint = nfeEndpoint(model, env);
    const idLote = String(Date.now()).slice(-15).padStart(15, "0");
    const soap = envelope("nfeDadosMsg", "http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4", `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${signed}</enviNFe>`);
    return okWrap(await soapPost(endpoint, material, soap, "application/soap+xml; charset=utf-8"), endpoint, { idLote });
  }

  let endpoint = "", soap = "", contentType = "application/soap+xml; charset=utf-8";
  if (action === "cte-status") {
    endpoint = `${cteBase(env)}/CTeStatusServicoV4/CTeStatusServicoV4.asmx`;
    const ns = "http://www.portalfiscal.inf.br/cte/wsdl/CTeStatusServicoV4";
    soap = envelope("cteDadosMsg", ns, `<consStatServCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><tpAmb>${tpAmb}</tpAmb><cUF>${digits(b.cuf || "27")}</cUF><xServ>STATUS</xServ></consStatServCTe>`);
    contentType = `application/soap+xml; charset=utf-8; action="${ns}/cteStatusServicoCTe"`;
  } else if (action === "cte-authorize") {
    endpoint = `${cteBase(env)}/CTeRecepcaoSincV4/CTeRecepcaoSincV4.asmx`;
    const xml = stripDecl(b.signed_xml);
    if (!xml.includes("<CTe") && !xml.includes(":CTe")) return json(400, { error: "invalid_cte_xml" });
    const ns = "http://www.portalfiscal.inf.br/cte/wsdl/CTeRecepcaoSincV4";
    soap = envelope("cteDadosMsg", ns, await gzipB64(xml));
    contentType = `application/soap+xml; charset=utf-8; action="${ns}/cteRecepcao"`;
  } else if (action === "mdfe-status") {
    endpoint = `${mdfeBase(env)}/MDFeStatusServico/MDFeStatusServico.asmx`;
    soap = envelope("mdfeDadosMsg", "http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeStatusServico", `<consStatServMDFe xmlns="http://www.portalfiscal.inf.br/mdfe" versao="3.00"><tpAmb>${tpAmb}</tpAmb><xServ>STATUS</xServ></consStatServMDFe>`);
  } else if (action === "mdfe-nonclosed") {
    const cnpj = digits(b.cnpj);
    if (!/^\d{14}$/.test(cnpj)) return json(400, { error: "invalid_mdfe_issuer" });
    endpoint = `${mdfeBase(env)}/MDFeConsNaoEnc/MDFeConsNaoEnc.asmx`;
    const ns = "http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeConsNaoEnc";
    soap = envelope("mdfeDadosMsg", ns, `<consMDFeNaoEnc xmlns="http://www.portalfiscal.inf.br/mdfe" versao="3.00"><tpAmb>${tpAmb}</tpAmb><xServ>CONSULTAR NÃO ENCERRADOS</xServ><CNPJ>${cnpj}</CNPJ></consMDFeNaoEnc>`);
    contentType = `application/soap+xml; charset=utf-8; action="${ns}/mdfeConsNaoEnc"`;
  } else if (action === "mdfe-authorize") {
    endpoint = `${mdfeBase(env)}/MDFeRecepcaoSinc/MDFeRecepcaoSinc.asmx`;
    const xml = stripDecl(b.signed_xml);
    if (!xml.includes("<MDFe") && !xml.includes(":MDFe")) return json(400, { error: "invalid_mdfe_xml" });
    const ns = "http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeRecepcaoSinc";
    soap = envelope("mdfeDadosMsg", ns, await gzipB64(xml));
    contentType = `application/soap+xml; charset=utf-8; action="${ns}/mdfeRecepcao"`;
  } else {
    return json(400, { error: "invalid_action" });
  }
  return okWrap(await soapPost(endpoint, material, soap, contentType), endpoint);
}

// ---------- ws-nfse-sefin-probe / nfe-event ----------
function eventDate() {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Maceio", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false })
    .formatToParts(new Date()).reduce((acc: any, x) => (acc[x.type] = x.value, acc), {});
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}-03:00`;
}
async function routeNfeEvent(b: any) {
  const action = String(b.action || "event").toLowerCase();
  const pfx = String(b.certificate_base64 || "");
  const password = String(b.certificate_password || "");
  const hasPfx = Boolean(pfx && password);
  const hasPem = Boolean(b.certificate_pem && b.private_key_pem);
  if (!hasPfx && !hasPem) return json(400, { error: "certificate_required" });
  const material = await materialFromBody(b);

  if (action === "nfse-dfe") {
    const cnpj = digits(b.cnpj);
    if (!/^\d{14}$/.test(cnpj)) return json(400, { error: "invalid_cnpj" });
    const qs = new URLSearchParams({ tipoNSU: "DISTRIBUICAO", lote: "true", cnpjConsulta: cnpj });
    let result: any = null, lastError: any = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        result = await httpsRequest(`https://adn.nfse.gov.br/contribuintes/DFe/${Math.max(0, Number(b.nsu) || 0)}?${qs}`, { method: "GET", material, timeoutMs: 45000, headers: { Accept: "application/json" } });
        if (![500, 502, 503, 504].includes(result.status)) break;
        lastError = new Error(`adn_http_${result.status}`);
        result = null;
      } catch (e) { lastError = e; }
      if (attempt < 2) await new Promise(r => setTimeout(r, 350 * (attempt + 1)));
    }
    if (!result) throw lastError || new Error("adn_transport_failed");
    let parsed: any;
    try { parsed = result.text ? JSON.parse(result.text) : {}; } catch { parsed = { raw: result.text.slice(0, 2000) }; }
    return json(200, { ok: result.status >= 200 && result.status < 300, action: "nfse-dfe", host: "adn.nfse.gov.br", http: result.status, response: parsed });
  }

  if (!hasPfx) return json(400, { error: "pfx_required_for_event" });
  const { key, cert } = pfxToPem(pfx, password);
  const AN = "https://www.nfe.fazenda.gov.br/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx";
  if (action === "probe") {
    const r = await httpsRequest(AN + "?WSDL", { method: "GET", material, timeoutMs: 45000 });
    return json(r.status >= 200 && r.status < 500 ? 200 : 502, { ok: r.status >= 200 && r.status < 500, action: "probe", host: "www.nfe.fazenda.gov.br", http: r.status, wsdl_detected: /NFeRecepcaoEvento4|definitions|wsdl/i.test(r.text), response_excerpt: r.text.slice(0, 500) });
  }
  if (action !== "event") return json(400, { error: "invalid_action" });
  const accessKey = digits(b.access_key);
  const cnpj = digits(b.cnpj);
  if (!/^\d{44}$/.test(accessKey) || !/^\d{14}$/.test(cnpj)) return json(400, { error: "invalid_payload" });
  if (accessKey.slice(6, 20) === cnpj) return json(422, { error: "recipient_cannot_equal_issuer" });

  const xml = `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${Date.now()}</idLote><evento versao="1.00"><infEvento Id="ID210210${accessKey}01"><cOrgao>91</cOrgao><tpAmb>1</tpAmb><CNPJ>${cnpj}</CNPJ><chNFe>${accessKey}</chNFe><dhEvento>${eventDate()}</dhEvento><tpEvento>210210</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento></infEvento></evento></envEvento>`;
  const signer: any = new SignedXml({ privateKey: key, publicCert: cert });
  signer.signatureAlgorithm = "http://www.w3.org/2000/09/xmldsig#rsa-sha1";
  signer.canonicalizationAlgorithm = "http://www.w3.org/TR/2001/REC-xml-c14n-20010315";
  signer.addReference({
    xpath: "//*[local-name()='infEvento']",
    transforms: ["http://www.w3.org/2000/09/xmldsig#enveloped-signature", "http://www.w3.org/TR/2001/REC-xml-c14n-20010315"],
    digestAlgorithm: "http://www.w3.org/2000/09/xmldsig#sha1",
  });
  signer.computeSignature(xml, { location: { reference: "//*[local-name()='infEvento']", action: "after" } });
  const signed = signer.getSignedXml();
  const r = await httpsRequest(AN, {
    method: "POST", material, timeoutMs: 45000,
    body: `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">${signed}</nfeDadosMsg></soap12:Body></soap12:Envelope>`,
    headers: { "Content-Type": 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"' },
  });
  const cStats = tags(r.text, "cStat");
  const motives = tags(r.text, "xMotivo");
  const faults = tags(r.text, "Text").concat(tags(r.text, "faultstring"));
  const eventCStat = cStats.length ? cStats[cStats.length - 1] : "";
  const ok = ["135", "136", "573"].includes(eventCStat);
  return json(ok ? 200 : 422, {
    ok, action: "event", host: "www.nfe.fazenda.gov.br", http: r.status,
    lote_cStat: cStats[0] || "", event_cStat: eventCStat, xMotivo: motives.length ? motives[motives.length - 1] : "",
    soap_fault: faults[0] || "",
    response_excerpt: r.text.replace(/<Signature[\s\S]*?<\/Signature>/gi, "<Signature>...</Signature>").slice(0, 1800),
  });
}

// ---------- SEFAZ/AL portals (no client certificate) ----------
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36";
const portal = (url: string, o: { method?: string; headers?: Record<string, string>; body?: string } = {}) =>
  httpsRequest(url, { method: o.method || "GET", body: o.body, headers: { "User-Agent": BROWSER_UA, ...(o.headers || {}) }, timeoutMs: 60000 });

async function routeRegistry(b: any) {
  const cnpj = digits(b.cnpj);
  if (!/^\d{14}$/.test(cnpj)) return json(400, { error: "invalid_cnpj" });
  let lastError: any = null;
  for (const url of [
    "https://gcs2.sefaz.al.gov.br/sfz-gcs-web/documentos/visualizarDocumento.action?key=CXzeoQhIvK4%3D",
    "https://gcs.sefaz.al.gov.br/sfz-gcs-web/documentos/visualizarDocumento.action?key=CXzeoQhIvK4%3D",
  ]) {
    try {
      let r = await httpsRequest(url, { method: "GET", headers: { "User-Agent": "WS-Gestao-Contabil/2.0", Accept: "application/zip,application/octet-stream,*/*" } });
      for (let hop = 0; hop < 4 && [301, 302, 303, 307, 308].includes(r.status) && r.headers["location"]; hop++) {
        r = await httpsRequest(new URL(r.headers["location"], r.endpoint).toString(), { method: "GET", headers: { "User-Agent": "WS-Gestao-Contabil/2.0", Accept: "application/zip,application/octet-stream,*/*" } });
      }
      if (r.status < 200 || r.status >= 300) throw new Error(`registry_http_${r.status}`);
      const zip = await JSZip.loadAsync(r.body);
      const files = Object.values(zip.files).filter((f: any) => !f.dir) as any[];
      if (!files.length) throw new Error("registry_zip_empty");
      const text = await files[0].async("string");
      if (!text || text.length < 1000) throw new Error("registry_payload_invalid");
      for (const line of text.replace(/\r/g, "").split("\n")) {
        const m = line.match(/(\d{9})\D*(\d{14})\D*([HN])/i);
        if (!m || m[2] !== cnpj) continue;
        return json(200, { ok: true, found: true, state_registration: m[1], ie_indicator: "1", icms_taxpayer: true, state_registry_status: m[3].toUpperCase() === "H" ? "Habilitado" : "Não habilitado", state_source: "SEFAZ/AL - SINTEGRA" });
      }
      return json(200, { ok: true, found: false });
    } catch (e) { lastError = e; }
  }
  throw lastError || new Error("registry_unavailable");
}

async function malhaToken(username: string, password: string) {
  const r = await portal("https://contribuinte.sefaz.al.gov.br/auth/authenticate", {
    method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ username, password, rememberMe: false }),
  });
  let payload: any = {};
  try { payload = JSON.parse(r.text); } catch { /* */ }
  return { status: r.status, token: String(payload.id_token || "") };
}

async function routeEntryReport(b: any) {
  const username = String(b.username || ""), password = String(b.password || ""), cnpj = digits(b.cnpj);
  const start = String(b.start || ""), end = String(b.end || "");
  if (!username || !password || !/^\d{14}$/.test(cnpj) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return json(400, { error: "invalid_payload" });
  const verifyOnly = Boolean(b.verify_only);
  const auth = await malhaToken(username, password);
  if (auth.status < 200 || auth.status >= 300 || !auth.token) {
    const invalid = [400, 401, 403].includes(auth.status);
    return json(invalid ? 422 : 500, { error: invalid ? "invalid_credentials" : `sefaz_login_${auth.status}`, login_valid: invalid ? false : null });
  }
  const q = new URLSearchParams({ numeroCnpj: cnpj, dataInicial: start, dataFinal: end, tipo: "xlsx" });
  const r = await portal(`https://contribuinte.sefaz.al.gov.br/malhafiscal/sfz-malhafiscal-api/api/relatorios/notas-fiscais-entrada?${q}`, {
    headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/octet-stream", Referer: "https://contribuinte.sefaz.al.gov.br/malhafiscal/" },
  });
  const contentType = String(r.headers["content-type"] || "");
  const ok = r.status >= 200 && r.status < 300 && r.body.length > 100;
  const result = ok
    ? { ok: true, login_valid: true, report_access: true, http: r.status, content_type: contentType, bytes: r.body.length, ...(verifyOnly ? {} : { xlsx_base64: b64(r.body) }) }
    : { ok: verifyOnly, login_valid: true, report_access: false, http: r.status, content_type: contentType, error: r.status === 401 || r.status === 403 ? "report_permission_denied" : "entry_report_failed", response_excerpt: r.text.replace(/\s+/g, " ").slice(0, 500) };
  return json(result.ok ? 200 : 502, result);
}

function brDate(iso: string) { const m = String(iso || "").match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? `${m[3]}/${m[2]}/${m[1]}` : ""; }
function gwtEscape(v: string) { return String(v || "").replace(/\\/g, "\\\\").replace(/\|/g, "\\!").replace(/\0/g, "\\0"); }

async function scaLogin(base: string, username: string, password: string, maxRedirects: number) {
  let cookie = "";
  let r = await portal(base + "/sca_default_login_page");
  cookie = mergeCookies(cookie, r.setCookie);
  r = await portal(base + "/sca_security_check", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded", Cookie: cookie, Origin: base, Referer: base + "/sca_default_login_page" },
    body: new URLSearchParams({ sca_login: username, sca_senha: password, btn_entrar: "Entrar" }).toString(),
  });
  cookie = mergeCookies(cookie, r.setCookie);
  let location = r.headers["location"];
  for (let i = 0; i < maxRedirects && location; i++) {
    r = await portal(new URL(location, base).toString(), { headers: { Cookie: cookie, Referer: base } });
    cookie = mergeCookies(cookie, r.setCookie);
    location = r.headers["location"];
  }
  return { cookie, last: r, location };
}

async function routeSalesReport(b: any) {
  const username = String(b.username || ""), password = String(b.password || ""), cnpj = digits(b.cnpj), ie = digits(b.ie);
  const start = String(b.start || ""), end = String(b.end || "");
  const format = String(b.format || "csv").toLowerCase() === "pdf" ? "pdf" : "csv";
  const verifyOnly = Boolean(b.verify_only);
  if (!username || !password || !/^[0-9]{14}$/.test(cnpj) || !/^\d{8,9}$/.test(ie) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) return json(400, { error: "invalid_payload" });

  // 1) Modern malha fiscal API.
  const auth = await malhaToken(username, password);
  let modern: any;
  if (!auth.token) modern = { ok: false, http: auth.status, error: [400, 401, 403].includes(auth.status) ? "invalid_credentials" : "modern_auth_failed" };
  else {
    const path = "/malhafiscal/sfz-malhafiscal-api/api/relatorios/notas-fiscais-saida";
    const q = new URLSearchParams({ numeroCnpj: cnpj, dataInicial: start, dataFinal: end, tipo: "xlsx" });
    const r = await portal(`https://contribuinte.sefaz.al.gov.br${path}?${q}`, { headers: { Authorization: `Bearer ${auth.token}`, Accept: "application/octet-stream", Referer: "https://contribuinte.sefaz.al.gov.br/malhafiscal/" } });
    const ok = r.status >= 200 && r.status < 300 && r.body.length > 100;
    modern = { ok, http: r.status, content_type: String(r.headers["content-type"] || ""), bytes: r.body.length, route: path,
      error: ok ? null : ([401, 403].includes(r.status) ? "sales_report_permission_denied" : "modern_sales_report_http_" + r.status),
      ...(ok ? { data_base64: b64(r.body), format: "xlsx" } : { response_excerpt: r.text.replace(/\s+/g, " ").slice(0, 500) }) };
  }
  if (modern.ok) return json(200, { ...modern, login_valid: true, report_access: true, modern: true });
  if (modern.error === "invalid_credentials") return json(422, { ...modern, login_valid: false, report_access: false });

  // 2) Legacy nfeas GWT portal.
  const base = "https://nfeas.sefaz.al.gov.br";
  const session = await scaLogin(base, username, password, 8);
  const loginText = session.last.text;
  if (/senha inv[aá]lida|usu[aá]rio inv[aá]lido|sca_default_login_page/i.test(String(session.last.headers["location"] || "") + " " + loginText) || !session.cookie) {
    return json(422, { error: "invalid_credentials", login_valid: false });
  }
  let cookie = session.cookie;
  const app = `${base}/gwtapp/`;
  const landing = await portal(app, { headers: { Cookie: cookie, Accept: "text/html,*/*" } });
  cookie = mergeCookies(cookie, landing.setCookie);
  const strings = [app, "65B6BD5745F6531C4EBB72A58A01D410", "br.gov.al.sefaz.nfe.relatorios.web.client.shared.NFeRelatoriosRemoteService", "consultarQuantidadeNotasFiscaisDeEntradaIhSaida", "br.gov.al.sefaz.nfe.shared.legado.NotaFiscalConsultaDTO/3510275579", "'A','C','D'", brDate(end) + " 23:59", brDate(start) + " 00:00", ie, cnpj, "-1", "AL"];
  const values = [1, 2, 3, 4, 1, 5, 5, 6, -1, 0, 0, 7, 8, 0, 0, 0, 9, 0, 10, 0, 0, 0, 11, 0, 12];
  const rpc = await portal(`${base}/gwtapp/nfeRelatoriosRemoteService.rpc`, {
    method: "POST",
    headers: { "Content-Type": "text/x-gwt-rpc; charset=utf-8", "X-GWT-Permutation": "17B9688C7FCB092178ADBD10B81EA1F8", "X-GWT-Module-Base": app, Origin: base, Referer: app, Cookie: cookie },
    body: "7|0|" + strings.length + "|" + strings.map(gwtEscape).join("|") + "|" + values.join("|") + "|",
  });
  const access = { http: rpc.status, permitted: rpc.status >= 200 && rpc.status < 300 && /^\/\/OK/.test(rpc.text), denied: /n[aã]o possui permiss[aã]o|sem permiss[aã]o|access denied/i.test(rpc.text), response_excerpt: rpc.text.replace(/\s+/g, " ").slice(0, 420) };
  const modernAttempt = { http: modern.http, error: modern.error, route: modern.route, content_type: modern.content_type, bytes: modern.bytes };
  if (verifyOnly || !access.permitted) {
    const res = { ok: verifyOnly ? access.permitted : false, login_valid: true, report_access: access.permitted, permission_denied: access.denied, http: access.http, landing_http: landing.status, rpc: access, error: access.permitted ? null : (access.denied ? "sales_report_permission_denied" : "sales_report_access_unconfirmed"), modern_attempt: modernAttempt };
    return json(res.ok ? 200 : (res.permission_denied ? 403 : 502), res);
  }
  const q = new URLSearchParams({ ufEntrada: "AL", numeroCnpjEntrada: cnpj, numeroCacealEntrada: ie, ufDestino: "", numeroCnpjDestino: "", numeroCacealDestino: "", dataEmissaoInicial: brDate(start) + " 00:00", dataEmissaoFinal: brDate(end) + " 23:59", dataAutorizacaoInicial: "", dataAutorizacaoFinal: "", codigoStatus: "A,C,D", placaVeiculo: "", tipoProcessoEmissao: "-1", tipoOperacao: "-1" });
  let report: any = null, usedUrl = "";
  for (const url of [`${base}/gwtapp/arquivozip/notasFiscais.zip?${q}`, `${base}/gwtapp/relatorio/relatorioEntradasIhSaidas.${format}?${q}`, `${base}/relatorio/relatorioEntradasIhSaidas.${format}?${q}`]) {
    const cur = await portal(url, { headers: { Cookie: cookie, Referer: app, Accept: format === "csv" ? "text/csv,text/plain,*/*" : "application/pdf,*/*" } });
    if (!report || cur.status !== 404) { report = cur; usedUrl = url; }
    if (cur.status >= 200 && cur.status < 300 && cur.body.length > 0) break;
  }
  const text = report?.text || "";
  const loginPage = /sca_default_login_page|sca_security_check|name=["']sca_login/i.test(text);
  const ok = Boolean(report && report.status >= 200 && report.status < 300 && !loginPage && report.body.length > 0);
  return json(ok ? 200 : 502, {
    ok, error: ok ? null : (loginPage ? "sales_report_auth_required" : "sales_report_http_" + String(report?.status || 0)),
    http: report?.status || 0, content_type: String(report?.headers?.["content-type"] || ""), bytes: report?.body?.length || 0,
    landing_http: landing.status, route: usedUrl ? new URL(usedUrl).pathname : null,
    ...(ok ? { data_base64: b64(report.body) } : { response_excerpt: text.replace(/\s+/g, " ").slice(0, 700) }),
    modern_attempt: modernAttempt,
  });
}

async function routeAlReport(b: any) {
  const username = String(b.username || ""), password = String(b.password || ""), cnpj = digits(b.cnpj);
  const action = String(b.action || "inutilization");
  if (!username || !password || !/^\d{14}$/.test(cnpj)) return json(400, { error: "invalid_payload" });
  const base = "https://nfce.sefaz.al.gov.br";
  let { cookie } = await scaLogin(base, username, password, 6);
  const landing = await portal(`${base}/paginaRelatorioContribuinte.htm`, { headers: { Cookie: cookie, Referer: `${base}/` } });
  cookie = mergeCookies(cookie, landing.setCookie);
  const text = landing.text;
  const available = [...text.matchAll(/<option\s+value=["'](\d{14})["']/gi)].map(m => m[1]);
  const selected = available.includes(cnpj) ? cnpj : available.length === 1 ? available[0] : "";
  if (action === "menu") {
    if (/sca_default_login_page|name=["']sca_login/i.test(text)) return json(422, { ok: false, login_valid: false, error: "nfce_portal_login_required", http: landing.status });
    const rel = (v: string) => { try { const u = new URL(v, base); return u.pathname + u.search; } catch { return v.slice(0, 240); } };
    const re = /(relat|consulta|nota|nfce|xml|download|inutil|emit|saida|entrada)/i;
    const links = [...text.matchAll(/href=["']([^"'#]+)["']/gi)].map(m => String(m[1] || "")).filter(v => re.test(v)).map(rel).filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 120);
    const forms = [...text.matchAll(/<form\b[^>]*>/gi)].map(raw => {
      const t = raw[0];
      const a = (t.match(/action=["']([^"']+)["']/i) || [])[1] || "";
      return { action: a ? (() => { try { return new URL(a, base).pathname; } catch { return a.slice(0, 180); } })() : "", method: (t.match(/method=["']([^"']+)["']/i) || [])[1] || "" };
    }).filter((v, i, a) => v.action && a.findIndex(x => x.action === v.action && x.method === v.method) === i).slice(0, 60);
    const actions = [...new Set([...text.matchAll(/(?:action|url|href)\s*[:=]\s*["']([^"']+)["']/gi)].map(m => String(m[1] || "")).filter(v => re.test(v)))].slice(0, 120);
    const labels = [...text.matchAll(/>([^<>]{2,120})</g)].map(m => m[1].replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim()).filter(v => re.test(v)).filter((v, i, a) => v && a.indexOf(v) === i).slice(0, 120);
    return json(200, { ok: true, login_valid: true, http: landing.status, company_available: Boolean(selected), available_count: available.length, links, forms, actions, labels });
  }
  if (!selected) return json(422, { ok: false, error: "company_not_available_in_state_portal", available_count: available.length });
  const report = await portal(`${base}/emitirRelatorioInutilizacaoDeNumeracaoDeNotaFiscal.htm?cnpj=${encodeURIComponent(selected)}`, {
    headers: { Cookie: cookie, Referer: `${base}/paginaRelatorioContribuinte.htm`, Accept: "application/pdf,text/html;q=0.9,*/*;q=0.8" },
  });
  const contentType = String(report.headers["content-type"] || "");
  const isPdf = new TextDecoder().decode(report.body.subarray(0, 5)) === "%PDF-" || /application\/pdf/i.test(contentType);
  if (!isPdf) return json(422, { ok: false, error: "report_not_pdf", http: report.status, content_type: contentType, response_excerpt: report.text.replace(/\s+/g, " ").slice(0, 600) });
  const ok = report.status >= 200 && report.status < 300;
  return json(ok ? 200 : 422, { ok, http: report.status, content_type: contentType, selected_cnpj: selected, bytes: report.body.length, pdf_base64: b64(report.body) });
}

// ---------- router ----------
Deno.serve(async req => {
  const path = new URL(req.url).pathname.replace(/^.*\/fiscal-gateway/, "").replace(/\/+$/, "") || "/";
  if (req.method === "GET" && (path === "/" || path === "/api/health")) return json(200, { ok: true, service: "fiscal-gateway", transport: "supabase-edge-native-mtls" });
  if (req.method !== "POST") return json(405, { error: "method_not_allowed" });
  const raw = await req.text();
  if (raw.length > 8 * 1024 * 1024) return json(413, { error: "payload_too_large" });
  let body: any;
  try { body = raw ? JSON.parse(raw) : {}; } catch { return json(400, { error: "invalid_json" }); }
  try {
    switch (path) {
      // ws-svrs-consit had no gateway auth: the caller must supply its own A1 certificate.
      case "/api/consit": return await routeConsit(body);
      case "/api/download": return await routeDownload(body);
      case "/api/distribuicao":
        if (!(await dfeHmacAuthorized(req, raw))) return json(401, { error: "Unauthorized" });
        return await routeDistribuicao(body);
      case "/api/fiscal-soap":
      case "/api/nfe-event":
      case "/api/sefaz-al-registry":
      case "/api/sefaz-al-entry-report":
      case "/api/sefaz-al-sales-report":
      case "/api/sefaz-al-report":
        if (!(await bearerAuthorized(req))) return json(401, { error: "unauthorized" });
        if (path === "/api/fiscal-soap") return await routeFiscalSoap(body);
        if (path === "/api/nfe-event") return await routeNfeEvent(body);
        if (path === "/api/sefaz-al-registry") return await routeRegistry(body);
        if (path === "/api/sefaz-al-entry-report") return await routeEntryReport(body);
        if (path === "/api/sefaz-al-sales-report") return await routeSalesReport(body);
        return await routeAlReport(body);
      default:
        return json(404, { error: "unknown_route", path });
    }
  } catch (error) {
    console.error("fiscal-gateway error", path, error instanceof Error ? error.message : String(error));
    return json(500, { error: error instanceof Error ? error.message : String(error) });
  }
});
