const https = require('node:https');
const crypto = require('node:crypto');
const JSZip = require('jszip');

const GATEWAY_TOKEN_SHA256 = '7725295432774011f678a73ced1ae9761a168ba47df4f008f971f90ac0bd2352';
const REGISTRY_URLS = [
  'https://gcs2.sefaz.al.gov.br/sfz-gcs-web/documentos/visualizarDocumento.action?key=CXzeoQhIvK4%3D',
  'https://gcs.sefaz.al.gov.br/sfz-gcs-web/documentos/visualizarDocumento.action?key=CXzeoQhIvK4%3D',
];

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
      if (raw.length > 64 * 1024) reject(new Error('payload_too_large'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}
function sha256(value) { return crypto.createHash('sha256').update(String(value || '')).digest('hex'); }
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function authorized(req) {
  const supplied = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return supplied && safeEqual(sha256(supplied), GATEWAY_TOKEN_SHA256);
}
function digits(value) { return String(value || '').replace(/\D/g, ''); }
function requestBuffer(url) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: target.hostname,
      port: 443,
      path: target.pathname + target.search,
      method: 'GET',
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      servername: target.hostname,
      timeout: 60000,
      headers: {
        'User-Agent': 'WS-Gestao-Contabil/2.0',
        'Accept': 'application/zip,application/octet-stream,*/*',
        'Connection': 'close',
      },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({ status: response.statusCode || 0, body: Buffer.concat(chunks) }));
    });
    request.on('timeout', () => request.destroy(new Error('sefaz_al_registry_timeout')));
    request.on('error', reject);
    request.end();
  });
}

async function lookupRegistry(cnpj) {
  let lastError = null;
  for (const url of REGISTRY_URLS) {
    try {
      const response = await requestBuffer(url);
      if (response.status < 200 || response.status >= 300) throw new Error(`registry_http_${response.status}`);
      const zip = await JSZip.loadAsync(response.body);
      const files = Object.values(zip.files).filter(file => !file.dir);
      if (!files.length) throw new Error('registry_zip_empty');
      const text = await files[0].async('string');
      if (!text || text.length < 1000) throw new Error('registry_payload_invalid');
      for (const line of text.replace(/\r/g, '').split('\n')) {
        const match = line.match(/(\d{9})\D*(\d{14})\D*([HN])/i);
        if (!match || match[2] !== cnpj) continue;
        return {
          ok: true,
          found: true,
          state_registration: match[1],
          ie_indicator: '1',
          icms_taxpayer: true,
          state_registry_status: match[3].toUpperCase() === 'H' ? 'Habilitado' : 'Não habilitado',
          state_source: 'SEFAZ/AL - SINTEGRA',
        };
      }
      return { ok: true, found: false };
    } catch (error) {
      lastError = error;
    }
  }
  throw lastError || new Error('registry_unavailable');
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await readBody(req);
    const cnpj = digits(body.cnpj);
    if (!/^\d{14}$/.test(cnpj)) return json(res, 400, { error: 'invalid_cnpj' });
    const result = await lookupRegistry(cnpj);
    return json(res, 200, result);
  } catch (error) {
    console.error('SEFAZ AL registry gateway error', error);
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};
