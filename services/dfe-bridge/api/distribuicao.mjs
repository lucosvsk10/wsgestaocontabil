import https from 'node:https';
import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';

const BRIDGE_SECRET = process.env.DFE_BRIDGE_SECRET || '';
const MAX_BODY_BYTES = 4 * 1024 * 1024;
const digits = (value = '') => String(value).replace(/\D/g, '');
const tag = (xml, name) => xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`, 'i'))?.[1]?.trim() || '';

function soapEnvelope({ cnpj, ufCode, ultNSU, environment }) {
  const tpAmb = environment === 'homologacao' ? '2' : '1';
  const nsu = digits(ultNSU || '0').padStart(15, '0').slice(-15);
  return `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg><distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${digits(ufCode).padStart(2, '0').slice(-2)}</cUFAutor><CNPJ>${digits(cnpj)}</CNPJ><distNSU><ultNSU>${nsu}</ultNSU></distNSU></distDFeInt></nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;
}

function requestNational({ pfxBase64, password, cnpj, ufCode, ultNSU, environment }) {
  const hostname = environment === 'homologacao' ? 'hom1.nfe.fazenda.gov.br' : 'www1.nfe.fazenda.gov.br';
  const body = Buffer.from(soapEnvelope({ cnpj, ufCode, ultNSU, environment }), 'utf8');
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname, port: 443, path: '/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx', method: 'POST',
      pfx: Buffer.from(pfxBase64, 'base64'), passphrase: password, minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2',
      ALPNProtocols: ['http/1.1'], servername: hostname, rejectUnauthorized: true, agent: false,
      headers: {'Content-Type': 'application/soap+xml; charset=utf-8', Accept: 'application/soap+xml, text/xml, */*', 'Content-Length': String(body.length), Connection: 'close', 'User-Agent': 'WS-Gestao-DFe-Bridge/1.0'},
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({status: response.statusCode || 0, text: Buffer.concat(chunks).toString('utf8'), tlsProtocol: response.socket?.getProtocol?.() || null, alpn: response.socket?.alpnProtocol || null}));
    });
    request.setTimeout(30000, () => request.destroy(new Error('upstream_timeout')));
    request.on('error', reject);
    request.end(body);
  });
}

function authorized(req, rawBody) {
  if (!BRIDGE_SECRET) return false;
  const timestamp = String(req.headers['x-ws-timestamp'] || '');
  const signature = String(req.headers['x-ws-signature'] || '');
  const unixMs = Number(timestamp);
  if (!Number.isFinite(unixMs) || Math.abs(Date.now() - unixMs) > 5 * 60 * 1000) return false;
  const expected = createHmac('sha256', BRIDGE_SECRET).update(`dfe-bridge:${timestamp}:${rawBody}`).digest('hex');
  const received = Buffer.from(signature);
  const expectedBytes = Buffer.from(expected);
  return received.length === expectedBytes.length && timingSafeEqual(received, expectedBytes);
}

export default async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (req.method !== 'POST') return res.status(405).json({error: 'Method not allowed'});
  if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) return res.status(415).json({error: 'Unsupported media type'});
  const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body ?? {});
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES || !authorized(req, rawBody)) return res.status(401).json({error: 'Unauthorized'});
  try {
    const body = JSON.parse(rawBody);
    const pfxBase64 = String(body.certificate_base64 || '');
    const password = String(body.certificate_password || '');
    if (!pfxBase64 || !password || pfxBase64.length > 3_500_000 || password.length > 256) return res.status(400).json({error: 'Invalid certificate bundle'});
    const cnpj = digits(body.cnpj || '');
    if (cnpj.length !== 14) return res.status(400).json({error: 'Invalid CNPJ'});
    const result = await requestNational({pfxBase64, password, cnpj, ufCode: digits(body.uf_code || '27'), ultNSU: digits(body.ult_nsu || '0'), environment: body.environment === 'homologacao' ? 'homologacao' : 'producao'});
    if (result.status < 200 || result.status >= 300) return res.status(502).json({error: `Ambiente Nacional HTTP ${result.status}`});
    return res.status(200).json({ok: true, transport: 'Node/OpenSSL + PFX + TLS 1.2 + HTTP/1.1 + SOAP 1.2', tlsProtocol: result.tlsProtocol, alpn: result.alpn, response: {cStat: tag(result.text, 'cStat'), xMotivo: tag(result.text, 'xMotivo'), ultNSU: tag(result.text, 'ultNSU'), maxNSU: tag(result.text, 'maxNSU')}, raw_xml: result.text});
  } catch (error) {
    console.error('dfe-bridge', error instanceof Error ? error.message : 'unknown');
    return res.status(500).json({error: 'Internal server error'});
  }
}
