import { ICP_BRASIL_V10_PEM } from "./ca.ts";

export type CertificadoMtls = {
  chavePrivadaPem: string;
  certificadoPem: string;
  cadeiaPem: string[];
};

const STATUS_URL = "https://cte-homologacao.svrs.rs.gov.br/ws/CTeStatusServicoV4/CTeStatusServicoV4.asmx";
const ISSUE_URL = "https://cte-homologacao.svrs.rs.gov.br/ws/CTeRecepcaoSincV4/CTeRecepcaoSincV4.asmx";
const SERPRO_SSL_V1_URL = "http://repositorio.serpro.gov.br/cadeias/serprossl.crt";
const SERPRO_SSL_V1_SHA256 = "08fc942d5176e568acbef9c595f36a20de6acf9ea30c6f5fcedd48216ed5b070";

let serproCaPromise: Promise<string> | null = null;

function pemDer(pem: string) {
  const match = pem.match(/-----BEGIN CERTIFICATE-----([\s\S]*?)-----END CERTIFICATE-----/);
  if (!match) throw new Error("Certificado da CA SERPRO SSLv1 inválido.");
  const base64 = match[1].replace(/\s/g, "");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

async function sha256Hex(bytes: Uint8Array) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function loadSerproSslV1() {
  if (!serproCaPromise) {
    serproCaPromise = (async () => {
      const response = await fetch(SERPRO_SSL_V1_URL);
      if (!response.ok) throw new Error(`Não foi possível carregar a CA SERPRO SSLv1: HTTP ${response.status}.`);
      const pem = (await response.text()).trim();
      const fingerprint = await sha256Hex(pemDer(pem));
      if (fingerprint !== SERPRO_SSL_V1_SHA256) {
        throw new Error("Fingerprint da CA SERPRO SSLv1 não confere com o certificado oficial pinado.");
      }
      return pem;
    })().catch((error) => {
      serproCaPromise = null;
      throw error;
    });
  }
  return await serproCaPromise;
}

async function postSoap(cert: CertificadoMtls, endpoint: string, namespace: string, innerXml: string) {
  const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><cteDadosMsg xmlns="${namespace}">${innerXml}</cteDadosMsg></soap12:Body></soap12:Envelope>`;
  const serproSslV1 = await loadSerproSslV1();
  const client = Deno.createHttpClient({
    caCerts: [ICP_BRASIL_V10_PEM, serproSslV1],
    cert: [cert.certificadoPem, ...cert.cadeiaPem].join("\n"),
    key: cert.chavePrivadaPem,
    http1: true,
  });
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/soap+xml; charset=utf-8",
        "Accept": "application/soap+xml, text/xml, */*",
      },
      body: soap,
      client,
    } as RequestInit & { client: Deno.HttpClient });
    const text = await response.text();
    if (!response.ok) throw new Error(`SVRS CT-e respondeu HTTP ${response.status}: ${text.slice(0, 1200)}`);
    return text;
  } finally {
    client.close();
  }
}

export async function statusCte(cert: CertificadoMtls, cUF = "27") {
  const xml = `<consStatServCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><tpAmb>2</tpAmb><cUF>${cUF}</cUF><xServ>STATUS</xServ></consStatServCTe>`;
  const text = await postSoap(cert, STATUS_URL, "http://www.portalfiscal.inf.br/cte/wsdl/CTeStatusServicoV4", xml);
  return { endpoint: STATUS_URL, text };
}

export async function authorizeCte(cert: CertificadoMtls, signedXml: string) {
  const text = await postSoap(cert, ISSUE_URL, "http://www.portalfiscal.inf.br/cte/wsdl/CTeRecepcaoSincV4", signedXml.replace(/^<\?xml[^>]*\?>\s*/i, ""));
  return { endpoint: ISSUE_URL, text };
}

const all = (xml: string, tag: string) => [...xml.matchAll(new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([^<]*)<\\/(?:\\w+:)?${tag}>`, "g"))].map((match) => match[1]);

export function parseCteResponse(xml: string) {
  const cStats = all(xml, "cStat");
  const motivos = all(xml, "xMotivo");
  const chaves = all(xml, "chCTe");
  const protocolos = all(xml, "nProt");
  const cStat = cStats[cStats.length - 1] || cStats[0] || null;
  return {
    authorized: cStat === "100",
    cStat,
    xMotivo: motivos[motivos.length - 1] || motivos[0] || null,
    chCTe: chaves[chaves.length - 1] || null,
    nProt: protocolos[protocolos.length - 1] || null,
    raw: xml,
  };
}
