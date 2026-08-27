import http from 'node:http';
import https from 'node:https';
import { Buffer } from 'node:buffer';

const PORT = Number(process.env.PORT || 8787);
const BRIDGE_SECRET = process.env.DFE_BRIDGE_SECRET || '';

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

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(Buffer.from(chunk));
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}');
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'GET' && req.url === '/health') {
    res.end(JSON.stringify({ ok: true, service: 'ws-dfe-bridge' }));
    return;
  }

  if (req.method !== 'POST' || req.url !== '/distribuicao') {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not found' }));
    return;
  }

  if (BRIDGE_SECRET && req.headers.authorization !== `Bearer ${BRIDGE_SECRET}`) {
    res.statusCode = 401;
    res.end(JSON.stringify({ error: 'Unauthorized' }));
    return;
  }

  try {
    const body = await readJson(req);
    const pfxBase64 = String(body.certificate_base64 || '');
    const password = String(body.certificate_password || '');
    const cnpj = digits(body.cnpj || '');
    const ufCode = digits(body.uf_code || '27');
    const ultNSU = digits(body.ult_nsu || '0');
    const environment = body.environment === 'homologacao' ? 'homologacao' : 'producao';

    if (!pfxBase64 || !password || cnpj.length !== 14) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'certificate_base64, certificate_password e CNPJ válido são obrigatórios' }));
      return;
    }

    const result = await postToAmbienteNacional({ pfxBase64, password, cnpj, ufCode, ultNSU, environment });
    if (result.status < 200 || result.status >= 300) {
      res.statusCode = 502;
      res.end(JSON.stringify({ error: `Ambiente Nacional HTTP ${result.status}`, raw: result.text.slice(0, 1200) }));
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
    res.statusCode = 500;
    res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`ws-dfe-bridge listening on ${PORT}`);
});
