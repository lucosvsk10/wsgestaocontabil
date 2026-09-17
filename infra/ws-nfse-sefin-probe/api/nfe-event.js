const https = require('node:https');
const forge = require('node-forge');
const { SignedXml } = require('xml-crypto');

const AN_HOST = 'www.nfe.fazenda.gov.br';
const AN_PATH = '/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx';
const AN_WSDL_PATH = '/NFeRecepcaoEvento4/NFeRecepcaoEvento4.asmx?WSDL';

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

function requestHttps({ method, path, pfxB64, password, body = '' }) {
  return new Promise((resolve, reject) => {
    const headers = {
      'User-Agent': 'WS-Gestao-Fiscal-Bridge/3.0',
      'Connection': 'close',
    };
    if (method === 'POST') {
      headers['Content-Type'] = 'application/soap+xml; charset=utf-8; action="http://www.portalfiscal.inf.br/nfe/wsdl/NFeRecepcaoEvento4/nfeRecepcaoEvento"';
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const req = https.request({
      hostname: AN_HOST,
      port: 443,
      path,
      method,
      pfx: Buffer.from(String(pfxB64).replace(/\s+/g, ''), 'base64'),
      passphrase: String(password || ''),
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      servername: AN_HOST,
      timeout: 45000,
      headers,
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({
        host: AN_HOST,
        status: response.statusCode || 0,
        text: Buffer.concat(chunks).toString('utf8'),
      }));
    });
    req.on('timeout', () => req.destroy(new Error('event_timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function probeTransport(pfxB64, password) {
  return requestHttps({ method: 'GET', path: AN_WSDL_PATH, pfxB64, password });
}

async function transmitEvent(pfxB64, password, signedXml) {
  return requestHttps({ method: 'POST', path: AN_PATH, pfxB64, password, body: soap(signedXml) });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  try {
    const body = await readBody(req);
    const action = String(body.action || 'event').toLowerCase();
    const pfx = String(body.certificate_base64 || '');
    const password = String(body.certificate_password || '');
    if (!pfx || !password) return json(res, 400, { error: 'certificate_required' });

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
    console.error('NFe event bridge error', error);
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};
