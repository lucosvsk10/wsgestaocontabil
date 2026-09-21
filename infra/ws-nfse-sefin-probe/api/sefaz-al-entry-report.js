const https = require('node:https');
const crypto = require('node:crypto');

const HOST = 'contribuinte.sefaz.al.gov.br';
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
      if (raw.length > 256 * 1024) reject(new Error('payload_too_large'));
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
function requestUrl(url, { method = 'GET', headers = {}, body = '' } = {}) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: target.hostname,
      port: 443,
      path: target.pathname + target.search,
      method,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      servername: target.hostname,
      timeout: 60000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36',
        'Connection': 'close',
        ...headers,
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    }, response => {
      const chunks = [];
      response.on('data', c => chunks.push(Buffer.from(c)));
      response.on('end', () => resolve({ status: response.statusCode || 0, headers: response.headers, body: Buffer.concat(chunks) }));
    });
    request.on('timeout', () => request.destroy(new Error('sefaz_al_entry_report_timeout')));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function getToken(username, password) {
  const raw = JSON.stringify({ username, password, rememberMe: false });
  const response = await requestUrl(`https://${HOST}/auth/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: raw,
  });
  let payload = {};
  try { payload = JSON.parse(response.body.toString('utf8')); } catch {}
  const token = String(payload.id_token || '');
  if (response.status < 200 || response.status >= 300 || !token) {
    const error = new Error(`sefaz_login_${response.status}`);
    error.status = response.status;
    throw error;
  }
  return token;
}

async function getEntryReport(username, password, cnpj, start, end, verifyOnly = false) {
  const token = await getToken(username, password);
  const query = new URLSearchParams({ numeroCnpj: cnpj, dataInicial: start, dataFinal: end, tipo: 'xlsx' });
  const url = `https://${HOST}/malhafiscal/sfz-malhafiscal-api/api/relatorios/notas-fiscais-entrada?${query}`;
  const response = await requestUrl(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/octet-stream',
      'Referer': `https://${HOST}/malhafiscal/`,
    },
  });
  const contentType = String(response.headers['content-type'] || '');
  const ok = response.status >= 200 && response.status < 300 && response.body.length > 100;
  if (!ok) {
    return {
      ok: verifyOnly,
      login_valid: true,
      report_access: false,
      http: response.status,
      content_type: contentType,
      error: response.status === 401 || response.status === 403 ? 'report_permission_denied' : 'entry_report_failed',
      response_excerpt: response.body.toString('utf8').replace(/\s+/g, ' ').slice(0, 500),
    };
  }
  return {
    ok: true,
    login_valid: true,
    report_access: true,
    http: response.status,
    content_type: contentType,
    bytes: response.body.length,
    ...(verifyOnly ? {} : { xlsx_base64: response.body.toString('base64') }),
  };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const body = await readBody(req);
    const username = String(body.username || '');
    const password = String(body.password || '');
    const cnpj = digits(body.cnpj);
    const start = String(body.start || '');
    const end = String(body.end || '');
    if (!username || !password || !/^\d{14}$/.test(cnpj) || !/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end) || start > end) {
      return json(res, 400, { error: 'invalid_payload' });
    }
    const verifyOnly = Boolean(body.verify_only);
    const result = await getEntryReport(username, password, cnpj, start, end, verifyOnly);
    return json(res, result.ok ? 200 : 502, result);
  } catch (error) {
    console.error('SEFAZ AL entry report gateway error', error);
    const message = error instanceof Error ? error.message : String(error);
    const invalidLogin = /^sefaz_login_(400|401|403)$/.test(message);
    return json(res, invalidLogin ? 422 : 500, {
      error: invalidLogin ? 'invalid_credentials' : message,
      login_valid: invalidLogin ? false : null,
    });
  }
};
