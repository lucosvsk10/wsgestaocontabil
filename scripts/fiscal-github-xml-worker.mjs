import https from 'node:https';
import { Buffer } from 'node:buffer';

const FUNCTION_URL = 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-github-xml-worker';
const PRIORITY = new Set(['29880800000126', '32137785000135']);

let cachedOidcToken = null;
let cachedOidcExpiresAt = 0;

async function oidcToken() {
  if (cachedOidcToken && cachedOidcExpiresAt - Date.now() > 90_000) return cachedOidcToken;
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !requestToken) throw new Error('github_oidc_unavailable');
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}audience=ws-fiscal-xml-worker`, {
    headers: { authorization: `Bearer ${requestToken}` },
  });
  const body = await response.json();
  if (!response.ok || !body.value) throw new Error(`github_oidc_${response.status}`);
  const payload = JSON.parse(Buffer.from(body.value.split('.')[1], 'base64url').toString('utf8'));
  cachedOidcToken = body.value;
  cachedOidcExpiresAt = Number(payload.exp || 0) * 1000;
  return cachedOidcToken;
}

async function edge(body) {
  const token = await oidcToken();
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`edge_${response.status}:${result.error || 'invalid_response'}`);
  return result;
}

function requestDownload({ certificate, password, accessKey, sistema }) {
  const form = new URLSearchParams({
    sistema,
    OrigemSite: 'SiteSefaz', Ambiente: '1', ChaveAcessoDfe: accessKey,
  }).toString();
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname: 'dfe-portal.svrs.rs.gov.br', port: 443, path: '/BpeSSL/DownloadXmlDfe', method: 'POST',
      pfx: Buffer.from(certificate, 'base64'), passphrase: password,
      minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2', ALPNProtocols: ['http/1.1'],
      servername: 'dfe-portal.svrs.rs.gov.br', rejectUnauthorized: true, agent: false,
      headers: {
        'content-type': 'application/x-www-form-urlencoded', 'content-length': String(Buffer.byteLength(form)),
        accept: 'application/xml, text/xml, application/json, text/html, */*', connection: 'close',
        'user-agent': 'WS-Gestao-GitHub-Fiscal-Worker/1.0',
      },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if ((response.statusCode || 0) < 200 || (response.statusCode || 0) >= 300) return reject(new Error(`download_http_${response.statusCode || 0}`));
        const match = text.match(/var\s+stringJson\s*=\s*(\{[\s\S]*?\})\s*;/);
        if (match) {
          try { const xml = JSON.parse(match[1])?.xml; if (xml) return resolve(xml); } catch {}
        }
        const xmlMatch = text.match(/(<(?:nfeProc|NFe)\b[\s\S]*<\/(?:nfeProc|NFe)>)/i);
        if (xmlMatch) return resolve(xmlMatch[1]);
        reject(new Error('xml_not_released'));
      });
    });
    request.setTimeout(45000, () => request.destroy(new Error('download_timeout')));
    request.on('error', reject);
    request.end(form);
  });
}

async function downloadXml(input) {
  const systems = input.model === '65' ? ['Nfce'] : ['Nfe', 'Nfce'];
  let lastError = null;
  for (const sistema of systems) {
    try {
      return await requestDownload({ ...input, sistema });
    } catch (error) {
      lastError = error;
      if (!(error instanceof Error) || error.message !== 'xml_not_released') throw error;
    }
  }
  throw lastError || new Error('xml_not_released');
}

function distribute({ certificate, password, cnpj, ufCode, ultNsu, environment }) {
  const tpAmb = environment === 'homologacao' ? '2' : '1';
  const hostname = environment === 'homologacao' ? 'hom1.nfe.fazenda.gov.br' : 'www1.nfe.fazenda.gov.br';
  const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDistDFeInteresse xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe"><nfeDadosMsg><distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${tpAmb}</tpAmb><cUFAutor>${ufCode}</cUFAutor><CNPJ>${cnpj}</CNPJ><distNSU><ultNSU>${String(ultNsu || '0').padStart(15, '0')}</ultNSU></distNSU></distDFeInt></nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;
  return new Promise((resolve, reject) => {
    const request = https.request({
      hostname, port: 443, path: '/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx', method: 'POST',
      pfx: Buffer.from(certificate, 'base64'), passphrase: password,
      minVersion: 'TLSv1.2', maxVersion: 'TLSv1.2', ALPNProtocols: ['http/1.1'], servername: hostname,
      rejectUnauthorized: true, agent: false,
      headers: { 'content-type': 'application/soap+xml; charset=utf-8', 'content-length': String(Buffer.byteLength(soap)), accept: 'application/soap+xml, text/xml, */*', connection: 'close', 'user-agent': 'WS-Gestao-GitHub-Fiscal-Worker/1.0' },
    }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(Buffer.from(chunk)));
      response.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        if ((response.statusCode || 0) < 200 || (response.statusCode || 0) >= 300) reject(new Error(`distribution_http_${response.statusCode || 0}`));
        else resolve(text);
      });
    });
    request.setTimeout(45000, () => request.destroy(new Error('distribution_timeout')));
    request.on('error', reject);
    request.end(soap);
  });
}

const targetResponse = await edge({ action: 'targets' });
const targets = (targetResponse.companies || []).map(company => company.cnpj);
let saved = 0;
let failed = 0;
let unreported = 0;
for (const cnpj of targets) {
  let lease;
  try {
    lease = await edge({ action: 'lease', cnpj, limit: PRIORITY.has(cnpj) ? 40 : 8 });
  } catch (error) {
    failed += 1;
    console.error(JSON.stringify({ cnpj, lease_error: error instanceof Error ? error.message : String(error) }));
    continue;
  }
  if (lease.distribution?.due) try {
    const raw = await distribute({
      certificate: lease.certificate_base64, password: lease.certificate_password, cnpj,
      ufCode: lease.distribution.uf_code, ultNsu: lease.distribution.ult_nsu, environment: lease.distribution.environment,
    });
    await edge({ action: 'submit_distribution', cnpj, raw_xml: raw, ult_nsu: lease.distribution.ult_nsu });
  } catch (error) {
    console.error(JSON.stringify({ cnpj, distribution_error: error instanceof Error ? error.message : String(error) }));
  }
  for (const task of lease.tasks || []) {
    try {
      const xml = await downloadXml({
        certificate: lease.certificate_base64, password: lease.certificate_password,
        accessKey: task.access_key, model: task.model,
      });
      await edge({ action: 'submit_xml', cnpj, kind: task.kind, access_key: task.access_key, xml_attempts: task.xml_attempts, xml });
      saved += 1;
    } catch (error) {
      failed += 1;
      const reason = error instanceof Error ? error.message : String(error);
      try {
        await edge({ action: 'submit_error', cnpj, kind: task.kind, access_key: task.access_key, xml_attempts: task.xml_attempts, error: reason });
      } catch (reportingError) {
        unreported += 1;
        console.error(JSON.stringify({
          cnpj,
          access_key: task.access_key,
          task_error: reason,
          reporting_error: reportingError instanceof Error ? reportingError.message : String(reportingError),
        }));
      }
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}
console.log(JSON.stringify({ ok: true, saved, failed, unreported }));
