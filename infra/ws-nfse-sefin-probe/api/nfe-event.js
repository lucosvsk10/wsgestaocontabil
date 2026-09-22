const https = require('node:https');
const crypto = require('node:crypto');
const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');

const AN_HOST = 'www.nfe.fazenda.gov.br';
const AN_PATH = '/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx';
const AN_WSDL_PATH = '/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx?WSDL';
const ADN_HOST = 'adn.nfse.gov.br';
const GATEWAY_TOKEN_SHA256 = '7725295432774011f678a73ced1ae9761a168ba47df4f008f971f90ac0bd2352';

function json(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.setEncoding('utf8');
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 6 * 1024 * 1024) reject(new Error('payload_too_large'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

function digits(v) {
  return String(v || '').replace(/\D/g, '');
}

function sha256(value) {
  return crypto.createHash('sha256').update(String(value || '')).digest('hex');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function authorized(req) {
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return supplied && safeEqual(sha256(supplied), GATEWAY_TOKEN_SHA256);
}

function tags(xml, name) {
  return [...String(xml || '').matchAll(
    new RegExp(`<(?:(?:\\w+):)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:(?:\\w+):)?${name}>`, 'gi')
  )].map(m => m[1].trim());
}

function pems(pfxB64, password) {
  const p12 = forge.pkcs12.pkcs12FromAsn1(
    forge.asn1.fromDer(forge.util.decode64(String(pfxB64).replace(/\s+/g, ''))),
    false,
    String(password || '')
  );
  let key = null;
  const certs = [];
  for (const sc of p12.safeContents) {
    for (const bag of sc.safeBags) {
      if (!key && bag.key) key = bag.key;
      if (bag.cert) certs.push(bag.cert);
    }
  }
  if (!key || !certs.length) throw new Error('pfx_parse_failed');
  return {
    key: forge.pki.privateKeyToPem(key),
    cert: forge.pki.certificateToPem(certs[0]),
    chain: certs.slice(1).map(cert => forge.pki.certificateToPem(cert)),
  };
}

function eventDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Maceio',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false,
  }).formatToParts(new Date()).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}-03:00`;
}

function buildEvent(cnpj, accessKey) {
  const id = `ID210210${accessKey}01`;
  return `<envEvento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><idLote>${Date.now()}</idLote><evento versao="1.00"><infEvento Id="${id}"><cOrgao>91</cOrgao><tpAmb>1</tpAmb><CNPJ>${cnpj}</CNPJ><chNFe>${accessKey}</chNFe><dhEvento>${eventDate()}</dhEvento><tpEvento>210210</tpEvento><nSeqEvento>1</nSeqEvento><verEvento>1.00</verEvento><detEvento versao="1.00"><descEvento>Ciencia da Operacao</descEvento></detEvento></infEvento></evento></envEvento>`;
}

function signEvent(xml, privateKey, cert) {
  const signer = new SignedXml({ privateKey, publicCert: cert });
  signer.signatureAlgorithm = 'http://www.w3.org/2000/09/xmldsig#rsa-sha1';
  signer.canonicalizationAlgorithm = 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315';
  signer.addReference({
    xpath: "//*[local-name()='infEvento']",
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
  });
  signer.computeSignature(xml, {
    location: { reference: "//*[local-name()='infEvento']", action: 'after' },
  });
  return signer.getSignedXml();
}

function soap(xml) {
  return `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4">${xml}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
}

function requestHttps({ hostname, method, path, pfxB64, password, certPem, privateKeyPem, chainPem = [], body = '', headers = {} }) {
  return new Promise((resolve, reject) => {
    const finalHeaders = {
      'User-Agent': 'WS-Gestao-Fiscal-Bridge/3.2',
      'Connection': 'close',
      ...headers,
    };
    if (body) finalHeaders['Content-Length'] = Buffer.byteLength(body);
    const pemMode = Boolean(certPem && privateKeyPem);
    let material;
    if (pemMode) {
      material = {
        cert: [String(certPem), ...(Array.isArray(chainPem) ? chainPem.map(String).filter(Boolean) : [])].join('\n'),
        key: String(privateKeyPem),
      };
    } else {
      // Normalize legacy PKCS#12 in userland with node-forge before OpenSSL sees it.
      // This avoids Unsupported PKCS12 PFX data on older A1 containers while
      // keeping the original encrypted vault material unchanged.
      const normalized = pems(String(pfxB64 || ''), String(password || ''));
      material = {
        cert: [normalized.cert, ...(normalized.chain || [])].join('\n'),
        key: normalized.key,
      };
    }
    const request = https.request({
      hostname,
      port: 443,
      path,
      method,
      ...material,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      servername: hostname,
      timeout: 45000,
      headers: finalHeaders,
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({
        host: hostname,
        status: response.statusCode || 0,
        text: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    request.on('timeout', () => request.destroy(new Error('gateway_timeout')));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function probeTransport(pfxB64, password) {
  return requestHttps({ hostname: AN_HOST, method: 'GET', path: AN_WSDL_PATH, pfxB64, password });
}

async function transmitEvent(pfxB64, password, signedXml) {
  return requestHttps({
    hostname: AN_HOST,
    method: 'POST',
    path: AN_PATH,
    pfxB64,
    password,
    body: soap(signedXml),
    headers: {
      'Content-Type': 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"',
    },
  });
}

async function distributeNfse(material, cnpj, nsu) {
  const qs = new URLSearchParams({ tipoNSU: 'DISTRIBUICAO', lote: 'true', cnpjConsulta: cnpj });
  let lastError = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      const result = await requestHttps({
        hostname: ADN_HOST,
        method: 'GET',
        path: `/contribuintes/DFe/${Math.max(0, Number(nsu) || 0)}?${qs}`,
        ...material,
        headers: { Accept: 'application/json' },
      });
      if (![500, 502, 503, 504].includes(Number(result.status || 0))) return result;
      lastError = new Error(`adn_http_${result.status}`);
    } catch (error) {
      lastError = error;
      const code = String(error?.code || '');
      const message = String(error?.message || error || '');
      if (!['ECONNRESET','EPIPE','ETIMEDOUT','ECONNABORTED'].includes(code) && !/socket hang up|timeout|reset/i.test(message)) throw error;
    }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 350 * (attempt + 1)));
  }
  throw lastError || new Error('adn_transport_failed');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await readBody(req);
    const action = String(body.action || 'event').toLowerCase();
    const pfx = String(body.certificate_base64 || '');
    const password = String(body.certificate_password || '');
    const certPem = String(body.certificate_pem || '');
    const privateKeyPem = String(body.private_key_pem || '');
    const chainPem = Array.isArray(body.chain_pem) ? body.chain_pem.map(String).filter(Boolean) : [];
    const hasPfx = Boolean(pfx && password);
    const hasPem = Boolean(certPem && privateKeyPem);
    if (!hasPfx && !hasPem) return json(res, 400, { error: 'certificate_required' });

    if (action === 'nfse-dfe') {
      const cnpj = digits(body.cnpj);
      if (!/^\d{14}$/.test(cnpj)) return json(res, 400, { error: 'invalid_cnpj' });
      const material = hasPem ? { certPem, privateKeyPem, chainPem } : { pfxB64: pfx, password };
      const result = await distributeNfse(material, cnpj, body.nsu);
      let parsed;
      try { parsed = result.text ? JSON.parse(result.text) : {}; }
      catch { parsed = { raw: result.text.slice(0, 2000) }; }
      return json(res, 200, {
        ok: result.status >= 200 && result.status < 300,
        action: 'nfse-dfe',
        host: result.host,
        http: result.status,
        response: parsed,
      });
    }

    if (!hasPfx) return json(res, 400, { error: 'pfx_required_for_event' });
    const { key, cert } = pems(pfx, password);

    if (action === 'probe') {
      const result = await probeTransport(pfx, password);
      return json(res, result.status >= 200 && result.status < 500 ? 200 : 502, {
        ok: result.status >= 200 && result.status < 500,
        action: 'probe',
        host: result.host,
        http: result.status,
        wsdl_detected: /NFeRecepcaoEvento4|definitions|wsdl/i.test(result.text),
        response_excerpt: result.text.slice(0, 500),
      });
    }

    if (action !== 'event') return json(res, 400, { error: 'invalid_action' });

    const accessKey = digits(body.access_key);
    const cnpj = digits(body.cnpj);
    if (!/^\d{44}$/.test(accessKey) || !/^\d{14}$/.test(cnpj)) {
      return json(res, 400, { error: 'invalid_payload' });
    }
    if (accessKey.slice(6, 20) === cnpj) {
      return json(res, 422, { error: 'recipient_cannot_equal_issuer' });
    }

    const signed = signEvent(buildEvent(cnpj, accessKey), key, cert);
    const result = await transmitEvent(pfx, password, signed);
    const cStats = tags(result.text, 'cStat');
    const motives = tags(result.text, 'xMotivo');
    const faults = tags(result.text, 'Text').concat(tags(result.text, 'faultstring'));
    const eventCStat = cStats.length ? cStats[cStats.length - 1] : '';
    const eventMotivo = motives.length ? motives[motives.length - 1] : '';
    const ok = ['135', '136', '573'].includes(eventCStat);

    return json(res, ok ? 200 : 422, {
      ok,
      action: 'event',
      host: result.host,
      http: result.status,
      lote_cStat: cStats[0] || '',
      event_cStat: eventCStat,
      xMotivo: eventMotivo,
      soap_fault: faults[0] || '',
      response_excerpt: result.text.replace(/<Signature[\s\S]*?<\/Signature>/gi, '<Signature>...</Signature>').slice(0, 1800),
    });
  } catch (error) {
    console.error('Fiscal gateway error', error);
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};
