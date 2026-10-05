import https from 'node:https';
import { Buffer } from 'node:buffer';

const FUNCTION_URL = 'https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/fiscal-github-xml-worker';
const TARGETS = ['29880800000126', '32137785000135'];

async function oidcToken() {
  const url = process.env.ACTIONS_ID_TOKEN_REQUEST_URL;
  const requestToken = process.env.ACTIONS_ID_TOKEN_REQUEST_TOKEN;
  if (!url || !requestToken) throw new Error('github_oidc_unavailable');
  const response = await fetch(`${url}${url.includes('?') ? '&' : '?'}audience=ws-fiscal-xml-worker`, {
    headers: { authorization: `Bearer ${requestToken}` },
  });
  const body = await response.json();
  if (!response.ok || !body.value) throw new Error(`github_oidc_${response.status}`);
  return body.value;
}

async function edge(token, body) {
  const response = await fetch(FUNCTION_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`edge_${response.status}:${result.error || 'invalid_response'}`);
  return result;
}

function downloadXml({ certificate, password, accessKey, model }) {
  const form = new URLSearchParams({
    sistema: model === '65' ? 'Nfce' : 'Nfe',
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

const token = await oidcToken();
let saved = 0;
let failed = 0;
for (const cnpj of TARGETS) {
  const lease = await edge(token, { action: 'lease', cnpj, limit: 40 });
  for (const task of lease.tasks || []) {
    try {
      const xml = await downloadXml({
        certificate: lease.certificate_base64, password: lease.certificate_password,
        accessKey: task.access_key, model: task.model,
      });
      await edge(token, { action: 'submit_xml', cnpj, kind: task.kind, access_key: task.access_key, xml });
      saved += 1;
    } catch (error) {
      failed += 1;
      await edge(token, { action: 'submit_error', cnpj, kind: task.kind, access_key: task.access_key, error: error instanceof Error ? error.message : String(error) });
    }
    await new Promise(resolve => setTimeout(resolve, 300));
  }
}
console.log(JSON.stringify({ ok: true, saved, failed }));
