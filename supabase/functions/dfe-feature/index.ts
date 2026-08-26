import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import https from "node:https";
import { checkServerIdentity, rootCertificates } from "node:tls";
import { X509Certificate } from "node:crypto";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const ICP_BRASIL_V10_PEM = `-----BEGIN CERTIFICATE-----
MIIGrDCCBJSgAwIBAgIJANLVi0S/gZNCMA0GCSqGSIb3DQEBDQUAMIGYMQswCQYD
VQQGEwJCUjETMBEGA1UECgwKSUNQLUJyYXNpbDE9MDsGA1UECww0SW5zdGl0dXRv
IE5hY2lvbmFsIGRlIFRlY25vbG9naWEgZGEgSW5mb3JtYWNhbyAtIElUSTE1MDMG
A1UEAwwsQXV0b3JpZGFkZSBDZXJ0aWZpY2Fkb3JhIFJhaXogQnJhc2lsZWlyYSB2
MTAwHhcNMTkwNzAxMTkxNTU5WhcNMzIwNzAxMTIwMDU5WjCBmDELMAkGA1UEBhMC
QlIxEzARBgNVBAoMCklDUC1CcmFzaWwxPTA7BgNVBAsMNEluc3RpdHV0byBOYWNp
b25hbCBkZSBUZWNub2xvZ2lhIGRhIEluZm9ybWFjYW8gLSBJVEkxNTAzBgNVBAMM
LEF1dG9yaWRhZGUgQ2VydGlmaWNhZG9yYSBSYWl6IEJyYXNpbGVpcmEgdjEwMIIC
IjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAk3AxKl1ZtP0pNyjChqO7qNkn
+/sClZeqiV/Kd7KnnbkDbI2y3VWcUG7feCE/deIxot6GH6JXncRG794UZl+4doD0
D0/cEwBd4DvrDSZm0RT40xhmYYOTxZDJxv+coTHdmsT5aNmSkktfjzYX4HQHh/7M
em+kTOpT/3E4K6B7KVs9HkOT7nXx5yU1qYbVWqI0qpJM9mOTSFx8C9HiKcHvLCvt
1ioXKPAmFuHPkayOcXP2MXeb+VRNjWKU4E+L2t5uZPKVx1M/9i1DztlLb4K8OfYg
GaPDUSF1sxnoGk5qZHLleO6KjCpmuQepmgsBvxi2YNO7X2YUwQQx1AXNSolgtkAR
5gt+1WzxhbFUhItQqlhqxgWHefLmiT5T/Ctz/P2v+zSO4efkkIzsi1iwD+ypZvM2
lnIvB24RcSN6jzmCahLPX4CwjwIK6JsSoMVxIhpZHCguUP4LXqP8IWUZ6WgS/4zB
7B9E0EICl2rM1PRy+6ulv+ZOW256e8a0pijUB+hXM1msUq9L92476FAAX8va3sP7
+Uut94+bGHmubcTLImWUPrxNT7QyrvE3FyHicfiHioeFL2oV4cXTLZrEq2wS8R4P
KPdSzNn5Z9e2uMEGYQaSNO+OwvVycpIhOBOqrm12wJ9ZhWKtM5UOo34/o37r5ZBI
TYXAGbhqQDB9mWXwH+0CAwEAAaOB9jCB8zBOBgNVHSAERzBFMEMGBWBMAQEAMDow
OAYIKwYBBQUHAgEWLGh0dHA6Ly9hY3JhaXouaWNwYnJhc2lsLmdvdi5ici9EUENh
Y3JhaXoucGRmMEAGA1UdHwQ5MDcwNaAzoDGGL2h0dHA6Ly9hY3JhaXouaWNwYnJh
c2lsLmdvdi5ici9MQ1JhY3JhaXp2MTAuY3JsMB8GA1UdIwQYMBaAFHTzfv/8n1N6
8Xzrqz6kptoYukVjMB0GA1UdDgQWBBR0837//J9TevF866s+pKbaGLpFYzAPBgNV
HRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQ0FAAOCAgEA
eCNhBSuy/Ih/T+1VOtAJju85SrtoE3vET1qXASpmjQllDHG/ph7VFNRAkC+gha+B
CbjoA5oJ/8wwl+Qdp1KGz6nXXFTLx3osU+kjm0srmBf9nyXHPqvFyvBeB0A7sYb7
TmII9GKD20oCxsdkccR/oE/JuTaNnGq0GYZ2aDb5v62uLi21Y6P9UBiTxZqQ4ojW
ET6kXNjlK238jpXv17FR8Sg3VusCvX7Q8eJkavvHHZDeWck2fSA+ycAc2JeL2Z0B
MSxGWpH32WM9J8+6XqCJUXHiWEV0zCE8wDYiYC+047pTxQI/gB/FcU7jvylh98DJ
kQPHd/Tp6Og3ynlDA9n9uBbxYHVRZs9vsZ/7xTFaxRe+zk8dhgKgZ/3RrcMFB570
2t8LFbyuUE/kQVY6rZ0QJ9qMWQ7VPLRwRhiMeU3k8WDJb/tBbOXHBqldTbWyQ+mp
MEDWhbrzE/IED82wAuO23Tb05cYk2xC7+Izef8fSc3XdJDuPSbcDpWukzyCDtSEH
isLiGEtIbYRiPsF3czlQPsnIEVoTTCWxHCH1zYR6zScSv18Qh69qVe2J40K5jZoP
GEOhq/oKhVJQAdvAFW5Odp7mF3Tk9nivjjsctJSxY26LFiV5GRV+07SSse4ti0aO
jO5PLg5SWjfcOtBG2rz02EIvQAmLcb0kGBtfdj0lW/w=
-----END CERTIFICATE-----
`;

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
const money = (value: unknown) => Number(value || 0).toFixed(2);

function certificateFromBody(body: Record<string, unknown>) {
  const pfxBase64 = String(body.certificate_base64 || "").trim();
  const password = String(body.certificate_password || "");
  if (!pfxBase64) throw new Error("Selecione um certificado A1 (.pfx ou .p12).");
  if (!password) throw new Error("Informe a senha do certificado A1.");
  const pfx = Buffer.from(pfxBase64, "base64");
  const cert = lerCertificado(pfx, password);
  return { pfx, password, cert };
}
function certInfo(cert: ReturnType<typeof lerCertificado>) {
  return {
    cnpj: cert.titular.cnpj,
    cpf: cert.titular.cpf,
    nome: cert.titular.nome,
    validadeInicio: cert.validadeInicio.toISOString(),
    validadeFim: cert.validadeFim.toISOString(),
    validoAgora: cert.validadeInicio <= new Date() && cert.validadeFim >= new Date(),
  };
}

function validateSale(raw: Record<string, unknown>, model: "55" | "65") {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (digits(raw.cnpjEmitente).length !== 14) errors.push("Informe o CNPJ do emitente.");
  if (!String(raw.ie || "").trim()) errors.push("Informe a inscrição estadual.");
  if (!String(raw.razaoSocial || "").trim()) errors.push("Informe a razão social.");
  if (digits(raw.codigoMunicipio).length !== 7) errors.push("Código IBGE do município deve ter 7 dígitos.");
  if (!String(raw.logradouro || "").trim() || !String(raw.numeroEndereco || "").trim() || !String(raw.bairro || "").trim() || !String(raw.nomeMunicipio || "").trim() || digits(raw.cep).length !== 8) errors.push("Complete o endereço do emitente.");
  if (!String(raw.produto || "").trim()) errors.push("Informe o produto.");
  if (digits(raw.ncm).length !== 8) errors.push("NCM deve ter 8 dígitos.");
  if (digits(raw.cfop).length !== 4) errors.push("CFOP deve ter 4 dígitos.");
  if (!(Number(raw.quantidade) > 0)) errors.push("Quantidade deve ser maior que zero.");
  if (!(Number(raw.valorUnitario) > 0)) errors.push("Valor unitário deve ser maior que zero.");
  if (!String(raw.csosn || "").trim() && String(raw.crt || "1") === "1") errors.push("Informe o CSOSN.");
  if (model === "65" && (!String(raw.cscId || "").trim() || !String(raw.csc || "").trim())) warnings.push("CSC/ID CSC de homologação não informado. Isso não impede o teste de conexão, mas impede a NFC-e completa.");
  if (model === "55" && !digits(raw.destDocumento)) errors.push("NF-e modelo 55 exige destinatário identificado neste laboratório.");
  return { valid: errors.length === 0, errors, warnings };
}

function extractReturn(xml: string) {
  const pick = (tag: string) => xml.match(new RegExp(`<${tag}>([^<]+)</${tag}>`))?.[1] || null;
  return { cStat: pick("cStat"), xMotivo: pick("xMotivo"), chNFe: pick("chNFe"), nProt: pick("nProt"), raw: xml };
}

const pemFromRaw = (raw: Buffer) => {
  const base64 = raw.toString("base64").match(/.{1,64}/g)?.join("\n") || "";
  return `-----BEGIN CERTIFICATE-----\n${base64}\n-----END CERTIFICATE-----\n`;
};

function validatedServerChain(hostname: string) {
  return new Promise<string[]>((resolve, reject) => {
    const req = https.request({ hostname, port: 443, method: "HEAD", rejectUnauthorized: false, agent: false });
    req.once("socket", (socket: any) => socket.once("secureConnect", () => {
      try {
        const peer = socket.getPeerCertificate(true);
        if (!peer?.raw) throw new Error("A SVRS não apresentou certificado TLS.");
        const hostnameError = checkServerIdentity(hostname, peer);
        if (hostnameError) throw hostnameError;
        const now = Date.now();
        const leaf = new X509Certificate(peer.raw);
        if (now < Date.parse(leaf.validFrom) || now > Date.parse(leaf.validTo)) throw new Error("Certificado TLS da SVRS fora da validade.");
        const root = new X509Certificate(ICP_BRASIL_V10_PEM);
        const intermediates: string[] = [];
        let currentPeer = peer;
        let current = leaf;
        const seen = new Set<string>();
        for (let depth = 0; depth < 8; depth++) {
          if (current.verify(root.publicKey)) {
            socket.destroy();
            resolve(intermediates);
            return;
          }
          const issuerPeer = currentPeer.issuerCertificate;
          if (!issuerPeer?.raw) throw new Error("Cadeia TLS incompleta apresentada pela SVRS.");
          const issuer = new X509Certificate(issuerPeer.raw);
          if (issuer.fingerprint256 === current.fingerprint256 || seen.has(issuer.fingerprint256)) throw new Error("Cadeia TLS da SVRS não termina na raiz ICP-Brasil confiável.");
          if (!current.verify(issuer.publicKey)) throw new Error("Assinatura inválida na cadeia TLS da SVRS.");
          if (now < Date.parse(issuer.validFrom) || now > Date.parse(issuer.validTo)) throw new Error("Certificado intermediário da SVRS fora da validade.");
          seen.add(issuer.fingerprint256);
          intermediates.push(pemFromRaw(Buffer.from(issuer.raw)));
          currentPeer = issuerPeer;
          current = issuer;
        }
        throw new Error("Cadeia TLS da SVRS excede o limite de validação.");
      } catch (error) {
        socket.destroy();
        reject(error);
      }
    }));
    req.once("error", reject);
    req.setTimeout(15000, () => req.destroy(new Error("Tempo limite ao validar o certificado TLS da SVRS.")));
    req.end();
  });
}

async function testSefazStatus(pfx: Buffer, password: string, model: "55" | "65") {
  const endpoint = model === "65"
    ? "https://nfce-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx"
    : "https://nfe-homologacao.svrs.rs.gov.br/ws/NfeStatusServico/NfeStatusServico4.asmx";
  const soap = `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeStatusServico4">
      <consStatServ xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>2</tpAmb><cUF>27</cUF><xServ>STATUS</xServ></consStatServ>
    </nfeDadosMsg>
  </soap12:Body>
</soap12:Envelope>`;
  const url = new URL(endpoint);
  const serverChain = await validatedServerChain(url.hostname);
  return new Promise<string>((resolve, reject) => {
    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname,
      method: "POST",
      pfx,
      passphrase: password,
      rejectUnauthorized: true,
      ca: [...rootCertificates, ICP_BRASIL_V10_PEM, ...serverChain],
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "Content-Length": Buffer.byteLength(soap, "utf8"),
      },
      timeout: 20000,
    }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
      res.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        if ((res.statusCode || 500) >= 400) reject(new Error(`SVRS respondeu HTTP ${res.statusCode}: ${body.slice(0, 700)}`));
        else resolve(body);
      });
    });
    req.on("timeout", () => req.destroy(new Error("Tempo limite ao conectar com a SVRS.")));
    req.on("error", reject);
    req.write(soap);
    req.end();
  });
}

async function loadSped() {
  return await import("npm:node-sped-nfe@1.2.52");
}
async function toolsFor(model: "55" | "65", raw: Record<string, unknown>, pfx: Buffer, password: string) {
  const { Tools } = await loadSped();
  return new Tools({ mod: model, tpAmb: 2, UF: "AL", versao: "4.00", CSC: String(raw.csc || ""), CSCid: String(raw.cscId || ""), timeout: 45 }, { pfx, senha: password });
}

async function buildXml(model: "55" | "65", raw: Record<string, unknown>) {
  const validation = validateSale(raw, model);
  if (!validation.valid) {
    const error = new Error(validation.errors.join(" "));
    (error as any).validation = validation;
    throw error;
  }
  const { Make } = await loadSped();
  const nfe = new Make();
  const qty = Number(raw.quantidade);
  const unit = Number(raw.valorUnitario);
  const total = qty * unit;
  const numero = String(raw.numeroNota || "1");
  const serie = String(raw.serie || "1");
  const cNF = String(Math.floor(Math.random() * 100000000)).padStart(8, "0");
  nfe.tagInfNFe({ Id: null, versao: "4.00" });
  nfe.tagIde({ cUF: "27", cNF, natOp: "VENDA", mod: model, serie, nNF: numero, dhEmi: nfe.formatData(), tpNF: "1", idDest: "1", cMunFG: digits(raw.codigoMunicipio), tpImp: model === "65" ? "4" : "1", tpEmis: "1", cDV: "0", tpAmb: "2", finNFe: "1", indFinal: "1", indPres: "1", indIntermed: "0", procEmi: "0", verProc: "WS-FEATURE-1.1" });
  nfe.tagEmit({ CNPJ: digits(raw.cnpjEmitente), xNome: String(raw.razaoSocial), xFant: String(raw.nomeFantasia || raw.razaoSocial), IE: String(raw.ie), CRT: String(raw.crt || "1") });
  nfe.tagEnderEmit({ xLgr: String(raw.logradouro), nro: String(raw.numeroEndereco), xCpl: String(raw.complemento || "") || null, xBairro: String(raw.bairro), cMun: digits(raw.codigoMunicipio), xMun: String(raw.nomeMunicipio), UF: "AL", CEP: digits(raw.cep), cPais: "1058", xPais: "BRASIL", fone: digits(raw.telefone) || null });
  const destDoc = digits(raw.destDocumento);
  if (destDoc) {
    nfe.tagDest({ ...(destDoc.length === 14 ? { CNPJ: destDoc } : { CPF: destDoc }), xNome: String(raw.destNome || (model === "65" ? "CONSUMIDOR" : "DESTINATARIO")), indIEDest: "9" });
    if (model === "55") nfe.tagEnderDest({ xLgr: String(raw.destLogradouro || "RUA TESTE"), nro: String(raw.destNumero || "1"), xBairro: String(raw.destBairro || "CENTRO"), cMun: digits(raw.destCodigoMunicipio || raw.codigoMunicipio), xMun: String(raw.destMunicipio || raw.nomeMunicipio), UF: String(raw.destUF || "AL"), CEP: digits(raw.destCep || raw.cep), cPais: "1058", xPais: "BRASIL" });
  }
  nfe.tagProd([{ cProd: String(raw.codigoProduto || "1"), cEAN: "SEM GTIN", xProd: String(raw.produto), NCM: digits(raw.ncm), CFOP: digits(raw.cfop), uCom: String(raw.unidade || "UN"), qCom: qty.toFixed(4), vUnCom: unit.toFixed(10), vProd: total.toFixed(2), cEANTrib: "SEM GTIN", uTrib: String(raw.unidade || "UN"), qTrib: qty.toFixed(4), vUnTrib: unit.toFixed(10), indTot: "1" }]);
  if (String(raw.crt || "1") === "1") nfe.tagProdICMSSN(0, { orig: String(raw.origem || "0"), CSOSN: String(raw.csosn || "400") });
  else nfe.tagProdICMS(0, { orig: String(raw.origem || "0"), CST: String(raw.cst || "00"), modBC: 3, vBC: 0, pICMS: 0, vICMS: 0 });
  nfe.tagProdPIS(0, { CST: "49", qBCProd: 0, vAliqProd: 0, vPIS: 0 });
  nfe.tagProdCOFINS(0, { CST: "49", qBCProd: 0, vAliqProd: 0, vCOFINS: 0 });
  nfe.tagTotal();
  nfe.tagTransp({ modFrete: 9 });
  nfe.tagDetPag([{ indPag: 0, tPag: String(raw.formaPagamento || "17"), vPag: money(total) }]);
  nfe.tagTroco("0.00");
  return { xml: nfe.xml(), total, validation };
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
    if (body.environment === "producao") return json({ error: "Produção bloqueada. Este laboratório usa somente homologação." }, 403);
    const model: "55" | "65" = body.model === "55" ? "55" : "65";
    const raw = (body.data || {}) as Record<string, unknown>;
    const action = String(body.action || "validate");
    if (action === "validate") return json({ ...validateSale(raw, model), model, environment: "homologacao", provider: "sefaz-svrs" });
    const { pfx, password, cert } = certificateFromBody(body);
    const certificate = certInfo(cert);
    if (!certificate.validoAgora) return json({ error: "Certificado fora do período de validade.", certificate }, 422);
    if (cert.titular.cnpj && digits(raw.cnpjEmitente) && cert.titular.cnpj !== digits(raw.cnpjEmitente)) return json({ error: "O CNPJ informado não corresponde ao certificado.", certificate }, 422);
    if (action === "inspect_certificate") return json({ ok: true, certificate });
    if (action === "test_connection") {
      const response = await testSefazStatus(pfx, password, model);
      const parsed = extractReturn(response);
      return json({ ok: parsed.cStat === "107", connected: parsed.cStat === "107", certificate, model, environment: "homologacao", endpoint: model === "65" ? "SVRS NFC-e homologação" : "SVRS NF-e homologação", response: parsed });
    }
    const tools = await toolsFor(model, raw, pfx, password);
    if (action === "preview") {
      const built = await buildXml(model, raw);
      const signed = await tools.xmlSign(built.xml);
      return json({ ok: true, valid: true, signed: true, certificate, model, total: built.total, xml: signed, warnings: built.validation.warnings });
    }
    if (action === "issue") {
      const built = await buildXml(model, raw);
      const signed = await tools.xmlSign(built.xml);
      const response = await tools.sefazEnviaLote(signed, { indSinc: 1 });
      const parsed = extractReturn(response);
      return json({ ok: parsed.cStat === "100" || parsed.cStat === "104", certificate, model, total: built.total, response: parsed });
    }
    if (action === "query") {
      const key = digits(body.reference);
      if (key.length !== 44) return json({ error: "Informe a chave de acesso com 44 dígitos." }, 400);
      const response = await tools.consultarNFe(key);
      return json({ ok: true, model, response: extractReturn(response) });
    }
    return json({ error: "Ação inválida." }, 400);
  } catch (reason) {
    console.error("dfe-feature", reason);
    const anyReason = reason as any;
    return json({ error: reason instanceof Error ? reason.message : String(reason), errors: anyReason?.validation?.errors ?? [], warnings: anyReason?.validation?.warnings ?? [], detail: anyReason?.stderr || anyReason?.code || null }, 500);
  }
});
