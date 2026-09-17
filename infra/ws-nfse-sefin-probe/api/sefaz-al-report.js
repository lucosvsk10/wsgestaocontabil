const https = require('node:https');
const crypto = require('node:crypto');

const HOST = 'nfce.sefaz.al.gov.br';
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

function digits(value) {
  return String(value || '').replace(/\D/g, '');
}

function mergeCookies(current, setCookie) {
  const jar = new Map();
  for (const piece of String(current || '').split(/;\s*/)) {
    const idx = piece.indexOf('=');
    if (idx > 0) jar.set(piece.slice(0, idx), piece.slice(idx + 1));
  }
  const values = Array.isArray(setCookie) ? setCookie : setCookie ? [setCookie] : [];
  for (const raw of values) {
    const pair = String(raw || '').split(';', 1)[0];
    const idx = pair.indexOf('=');
    if (idx > 0) jar.set(pair.slice(0, idx), pair.slice(idx + 1));
  }
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

function requestUrl(url, { method = 'GET', headers = {}, body = '' } = {}) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: target.hostname,
      port: target.port || 443,
      path: target.pathname + target.search,
      method,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      servername: target.hostname,
      timeout: 30000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36',
        'Connection': 'close',
        ...headers,
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {}),
      },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => resolve({
        status: response.statusCode || 0,
        headers: response.headers,
        body: Buffer.concat(chunks),
      }));
    });
    req.on('timeout', () => req.destroy(new Error('sefaz_al_timeout')));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

async function login(username, password) {
  const base = `https://${HOST}`;
  let cookie = '';
  let response = await requestUrl(`${base}/sca_default_login_page`);
  cookie = mergeCookies(cookie, response.headers['set-cookie']);

  const form = new URLSearchParams({
    sca_login: username,
    sca_senha: password,
    btn_entrar: 'Entrar',
  }).toString();
  response = await requestUrl(`${base}/sca_security_check`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cookie': cookie,
      'Origin': base,
      'Referer': `${base}/sca_default_login_page`,
    },
    body: form,
  });
  cookie = mergeCookies(cookie, response.headers['set-cookie']);

  let location = response.headers.location;
  for (let i = 0; i < 6 && location; i += 1) {
    const next = new URL(location, base).toString();
    response = await requestUrl(next, { headers: { 'Cookie': cookie, 'Referer': base } });
    cookie = mergeCookies(cookie, response.headers['set-cookie']);
    location = response.headers.location;
  }
  return cookie;
}

async function getInutilizationReport(username, password, targetCnpj) {
  const base = `https://${HOST}`;
  let cookie = await login(username, password);
  const landing = await requestUrl(`${base}/paginaRelatorioContribuinte.htm`, {
    headers: { 'Cookie': cookie, 'Referer': `${base}/` },
  });
  cookie = mergeCookies(cookie, landing.headers['set-cookie']);
  const landingText = landing.body.toString('utf8');
  const available = [...landingText.matchAll(/<option\s+value=["'](\d{14})["']/gi)].map(m => m[1]);
  const selected = available.includes(targetCnpj) ? targetCnpj : available.length === 1 ? available[0] : '';
  if (!selected) {
    return { ok: false, error: 'company_not_available_in_state_portal', available_count: available.length };
  }

  const reportUrl = `${base}/emitirRelatorioInutilizacaoDeNumeracaoDeNotaFiscal.htm?cnpj=${encodeURIComponent(selected)}`;
  const report = await requestUrl(reportUrl, {
    headers: {
      'Cookie': cookie,
      'Referer': `${base}/paginaRelatorioContribuinte.htm`,
      'Accept': 'application/pdf,text/html;q=0.9,*/*;q=0.8',
    },
  });
  const contentType = String(report.headers['content-type'] || '');
  const isPdf = report.body.subarray(0, 5).toString('ascii') === '%PDF-' || /application\/pdf/i.test(contentType);
  if (!isPdf) {
    return {
      ok: false,
      error: 'report_not_pdf',
      http: report.status,
      content_type: contentType,
      response_excerpt: report.body.toString('utf8').replace(/\s+/g, ' ').slice(0, 600),
    };
  }
  return {
    ok: report.status >= 200 && report.status < 300,
    http: report.status,
    content_type: contentType,
    selected_cnpj: selected,
    bytes: report.body.length,
    pdf_base64: report.body.toString('base64'),
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
    if (!username || !password || !/^\d{14}$/.test(cnpj)) {
      return json(res, 400, { error: 'invalid_payload' });
    }
    const result = await getInutilizationReport(username, password, cnpj);
    return json(res, result.ok ? 200 : 422, result);
  } catch (error) {
    console.error('SEFAZ AL report gateway error', error);
    return json(res, 500, { error: error instanceof Error ? error.message : String(error) });
  }
};
