import http from 'node:http';
import https from 'node:https';
import { Buffer } from 'node:buffer';
import { createHmac, timingSafeEqual } from 'node:crypto';

const PORT = Number(process.env.PORT || 8787);
const BRIDGE_SECRET = process.env.DFE_BRIDGE_SECRET || '';
const MAX_BODY_BYTES = 8 * 1024 * 1024;

const digits = (v = '') => String(v).replace(/\D/g, '');
const tag = (xml, name) => xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`, 'i'))?.[1]?.trim() || '';

function soapEnvelope({ cnpj, ufCode, ultNSU, environment }) {
  const tpAmb = environment === 'homologacao' ? '2' : '1';
  const nsu = digits(ultNSU || '0').padStart(15, '0').slice(-15);
  return `<?xml version="1.0" encoding="utf-8"?>
<soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope">
  <soap12:Body>
    <nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe">
      <nfeDadosMsg>
        <distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01">
          <tpAmb>${tpAmb}</tpAmb>
          <cUFAutor>${digits(ufCode).padStart(2, '0').slice(-2)}</cUFAutor>
          <CNPJ>${digits(cnpj)}</CNPJ>
          <distNSU><ultNSU>${nsu}</ultNSU></distNSU>
        </distDFeInt>
      </nfeDadosMsg>
    </nfeDistDFeInteresse>
  </soap12:Body>
</soap12:Envelope>`;
}

function postToAmbienteNacional({ pfxBase64, password, cnpj, ufCode, ultNSU, environment }) {
  const hostname = environment === 'homologacao' ? 'hom1.nfe.fazenda.gov.br' : 'www1.nfe.fazenda.gov.br';
  const path = '/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';
  const body = Buffer.from(soapEnvelope({ cnpj, ufCode, ultNSU, environment }), 'utf8');

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      port: 443,
      path,
      method: 'POST',
      pfx: Buffer.from(pfxBase64, 'base64'),
      passphrase: password,
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.2',
      ALPNProtocols: ['http/1.1'],
      servername: hostname,
      rejectUnauthorized: true,
      agent: false,
      headers: {
        'Content-Type': 'application/soap+xml; charset=utf-8',
        'Accept': 'application/soap+xml, text/xml, */*',
        'Content-Length': String(body.length),
        'Connection': 'close',
        'User-Agent': 'WS-Gestao-DFe-Bridge/1.0',
      },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        resolve({
          status: res.statusCode || 0,
          text,
          tlsProtocol: typeof res.socket?.getProtocol === 'function' ? res.socket.getProtocol() : null,
          alpn: res.socket?.alpnProtocol || null,
        });
      });
    });

    req.setTimeout(30000, () => req.destroy(new Error('Timeout de 30s no Ambiente Nacional')));
    req.on('error', reject);
    req.end(body);
  });
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error('request_too_large');
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

function authorized(req, rawBody) {
  if (!BRIDGE_SECRET) return false;
  const timestamp = String(req.headers['x-ws-timestamp'] || '');
  const signature = String(req.headers['x-ws-signature'] || '');
  const unixMs = Number(timestamp);
  if (!Number.isFinite(unixMs) || Math.abs(Date.now() - unixMs) > 5 * 60 * 1000) return false;
  const expected = createHmac('sha256', BRIDGE_SECRET)
    .update(`dfe-bridge:${timestamp}:${rawBody}`)
    .digest('hex');
  const receivedBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return receivedBuffer.length === expectedBuffer.length && timingSafeEqual(receivedBuffer, expectedBuffer);
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (req.method === 'GET' && req.url === '/health') {
    res.end(JSON.stringify({ ok: true, service: 'ws-dfe-bridge' }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/distribuicao') {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  try {
    if (!String(req.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
      res.statusCode = 415;
      res.end(JSON.stringify({ error: 'Unsupported media type' }));
      return;
    }
    const rawBody = await readBody(req);
    if (!authorized(req, rawBody)) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: 'Unauthorized' }));
      return;
    }
    const body = JSON.parse(rawBody || '{}');
    const pfxBase64 = String(body.certificate_base64 || '');
    const password = String(body.certificate_password || '');

    if (!pfxBase64 || !password || pfxBase64.length > 7_000_000 || password.length > 256) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'certificate_base64 e certificate_password são obrigatórios' }));
      return;
    }

    const cnpj = digits(body.cnpj || '');
    const ufCode = digits(body.uf_code || '27');
    const ultNSU = digits(body.ult_nsu || '0');
    const environment = body.environment === 'homologacao' ? 'homologacao' : 'producao';

    if (cnpj.length !== 14) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'CNPJ válido é obrigatório' }));
      return;
    }

    const result = await postToAmbienteNacional({ pfxBase64, password, cnpj, ufCode, ultNSU, environment });
    if (result.status < 200 || result.status >= 300) {
      res.statusCode = 502;
      res.end(JSON.stringify({ error: `Ambiente Nacional HTTP ${result.status}` }));
      return;
    }

    res.end(JSON.stringify({
      ok: true,
      transport: 'Node/OpenSSL + PFX + TLS 1.2 + HTTP/1.1 + SOAP 1.2',
      tlsProtocol: result.tlsProtocol,
      alpn: result.alpn,
      response: {
        cStat: tag(result.text, 'cStat'),
        xMotivo: tag(result.text, 'xMotivo'),
        ultNSU: tag(result.text, 'ultNSU'),
        maxNSU: tag(result.text, 'maxNSU'),
      },
      raw_xml: result.text,
    }));
  } catch (error) {
    res.statusCode = error instanceof Error && error.message === 'request_too_large' ? 413 : 500;
    res.end(JSON.stringify({ error: res.statusCode === 413 ? 'Request too large' : 'Internal server error' }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ws-dfe-bridge listening on ${PORT}`);
});
