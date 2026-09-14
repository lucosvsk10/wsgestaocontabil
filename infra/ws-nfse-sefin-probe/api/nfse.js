const https = require('node:https');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

const SEFIN_HOST = 'sefin.nfse.gov.br';
const SEFIN_PATH = '/SefinNacional/nfse';

function firstEnv(...names) {
  for (const name of names) {
    const value = process.env[name];
    if (value && String(value).trim()) return String(value).trim();
  }
  return '';
}

function pem(value) {
  return String(value || '').replace(/\\n/g, '\n');
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

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
      if (raw.length > 4 * 1024 * 1024) reject(new Error('payload_too_large'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}

function tlsConfig() {
  const password = firstEnv(
    'PFX_PASSWORD', 'PFX_PASS', 'CERT_PASSWORD', 'CERT_PASS',
    'NFSE_PFX_PASSWORD', 'NFSE_CERT_PASSWORD', 'CERTIFICATE_PASSWORD'
  );
  const pfxB64 = firstEnv(
    'PFX_BASE64', 'PFX_B64', 'CERT_PFX_BASE64', 'CERT_PFX_B64',
    'NFSE_PFX_BASE64', 'NFSE_PFX_B64', 'NFSE_CERT_PFX_BASE64',
    'CERTIFICATE_PFX_BASE64', 'CERTIFICATE_BASE64'
  );
  const cert = firstEnv('CERT_PEM', 'NFSE_CERT_PEM', 'TLS_CERT_PEM', 'CERTIFICATE_PEM');
  const key = firstEnv('KEY_PEM', 'NFSE_KEY_PEM', 'TLS_KEY_PEM', 'PRIVATE_KEY_PEM');

  if (pfxB64) {
    return { password, options: { pfx: Buffer.from(pfxB64.replace(/\s+/g, ''), 'base64'), passphrase: password } };
  }
  if (cert && key) {
    return { password, options: { cert: pem(cert), key: pem(key), ...(password ? { passphrase: password } : {}) } };
  }
  return { password, options: null };
}

function postSefin(xml, tls) {
  const payload = JSON.stringify({ dpsXmlGZipB64: zlib.gzipSync(Buffer.from(xml, 'utf8')).toString('base64') });
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: SEFIN_HOST,
      port: 443,
      path: SEFIN_PATH,
      method: 'POST',
      ...tls,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'User-Agent': 'WS-Gestao-NFSe-Bridge/2.0'
      },
      rejectUnauthorized: true,
      timeout: 60000,
      minVersion: 'TLSv1.2'
    }, response => {
      let raw = '';
      response.setEncoding('utf8');
      response.on('data', chunk => raw += chunk);
      response.on('end', () => {
        let parsed;
        try { parsed = raw ? JSON.parse(raw) : {}; }
        catch { parsed = { raw }; }
        resolve({ status: response.statusCode || 0, body: parsed });
      });
    });
    request.on('timeout', () => request.destroy(new Error('sefin_timeout')));
    request.on('error', reject);
    request.end(payload);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });

  try {
    const body = await readBody(req);
    if (body.action !== 'issue') return json(res, 400, { error: 'invalid_action' });
    const xml = String(body.xml || '');
    if (!xml.includes('<DPS') && !xml.includes(':DPS')) return json(res, 400, { error: 'invalid_dps_xml' });

    const serviceMatch = xml.match(/<cTribNac>(\d{6})<\/cTribNac>/);
    if (!serviceMatch) return json(res, 400, { error: 'missing_service_code' });

    const { password, options } = tlsConfig();
    if (!options) return json(res, 500, { error: 'bridge_certificate_not_configured' });

    const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const configuredToken = firstEnv('WS_NFSE_BRIDGE_TOKEN', 'NFSE_BRIDGE_TOKEN', 'BRIDGE_TOKEN');
    const expected = configuredToken || (password ? sha256('ws-nfse-bridge:' + password) : '');
    if (!expected || !safeEqual(supplied, expected)) return json(res, 401, { error: 'unauthorized' });

    const result = await postSefin(xml, options);
    return json(res, 200, {
      ok: result.status >= 200 && result.status < 300,
      sefinStatus: result.status,
      response: result.body,
      serviceCode: serviceMatch[1]
    });
  } catch (error) {
    console.error('NFSe bridge error', error);
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};
