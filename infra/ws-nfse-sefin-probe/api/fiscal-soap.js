const https = require('node:https');
const tls = require('node:tls');
const crypto = require('node:crypto');
const zlib = require('node:zlib');

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
      if (raw.length > 8 * 1024 * 1024) reject(new Error('payload_too_large'));
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch { reject(new Error('invalid_json')); }
    });
    req.on('error', reject);
  });
}
function sha256(v) { return crypto.createHash('sha256').update(String(v || '')).digest('hex'); }
function safeEqual(a, b) {
  const aa = Buffer.from(String(a || ''));
  const bb = Buffer.from(String(b || ''));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}
function authorized(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  return token && safeEqual(sha256(token), GATEWAY_TOKEN_SHA256);
}
function stripDecl(xml) { return String(xml || '').replace(/^<\?xml[^>]*\?>\s*/i, ''); }
function tls(body) {
  const pfxB64 = String(body.certificate_base64 || '').replace(/\s+/g, '');
  const password = String(body.certificate_password || '');
  if (pfxB64) return { pfx: Buffer.from(pfxB64, 'base64'), passphrase: password };
  const cert = String(body.certificate_pem || '');
  const key = String(body.private_key_pem || '');
  const chain = Array.isArray(body.chain_pem) ? body.chain_pem.map(String).filter(Boolean) : [];
  if (!cert || !key) throw new Error('certificate_required');
  return { cert: [cert, ...chain].join('\n'), key };
}
function requestHttps(url, material, { method = 'POST', body = '', contentType = '', accept = '*/*' } = {}) {
  const target = new URL(url);
  return new Promise((resolve, reject) => {
    const headers = { 'User-Agent': 'WS-Gestao-Fiscal-Gateway/4.1', 'Connection': 'close', 'Accept': accept };
    if (body) {
      headers['Content-Type'] = contentType;
      headers['Content-Length'] = Buffer.byteLength(body);
    }
    const request = https.request({
      hostname: target.hostname,
      port: 443,
      path: target.pathname + target.search,
      method,
      ...material,
      minVersion: 'TLSv1.2',
      rejectUnauthorized: true,
      servername: target.hostname,
      timeout: 60000,
      headers,
    }, response => {
      const chunks = [];
      response.on('data', c => chunks.push(Buffer.from(c)));
      response.on('end', () => resolve({ status: response.statusCode || 0, text: Buffer.concat(chunks).toString('utf8'), endpoint: url }));
    });
    request.on('timeout', () => request.destroy(new Error('fiscal_gateway_timeout')));
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}
function nfeEndpoint(model, env) {
  const prod = env === 'production';
  if (model === '65') return prod ? 'https://nfce.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx' : 'https://nfce-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx';
  return prod ? 'https://nfe.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx' : 'https://nfe-homologacao.svrs.rs.gov.br/ws/NfeAutorizacao/NFeAutorizacao4.asmx';
}
function cteBase(env) { return env === 'production' ? 'https://cte.svrs.rs.gov.br/ws' : 'https://cte-homologacao.svrs.rs.gov.br/ws'; }
function mdfeBase(env) { return env === 'production' ? 'https://mdfe.svrs.rs.gov.br/ws' : 'https://mdfe-homologacao.svrs.rs.gov.br/ws'; }
function envelope(tag, namespace, payload) {
  return `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><${tag} xmlns="${namespace}">${payload}</${tag}></soap12:Body></soap12:Envelope>`;
}
async function probe(url, material) {
  const result = await requestHttps(url + (url.includes('?') ? '&WSDL' : '?WSDL'), material, { method: 'GET' });
  return { ok: result.status >= 200 && result.status < 500, http: result.status, endpoint: result.endpoint, wsdl_detected: /wsdl|definitions|schema/i.test(result.text), response_excerpt: result.text.slice(0, 350) };
}

function peerCertificateInfo(hostname) {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({
      host: hostname,
      port: 443,
      servername: hostname,
      rejectUnauthorized: false,
      minVersion: 'TLSv1.2',
    }, () => {
      try {
        const chain = [];
        const seen = new Set();
        let cert = socket.getPeerCertificate(true);
        while (cert && cert.raw && !seen.has(cert.fingerprint256)) {
          seen.add(cert.fingerprint256);
          chain.push({
            subject: cert.subject || null,
            issuer: cert.issuer || null,
            fingerprint256: cert.fingerprint256 || null,
            valid_from: cert.valid_from || null,
            valid_to: cert.valid_to || null,
            info_access: cert.infoAccess || null,
            raw_base64: cert.raw.toString('base64'),
          });
          if (!cert.issuerCertificate || cert.issuerCertificate === cert) break;
          cert = cert.issuerCertificate;
        }
        const result = {
          authorized: socket.authorized,
          authorization_error: socket.authorizationError || null,
          protocol: socket.getProtocol(),
          cipher: socket.getCipher(),
          chain,
        };
        socket.end();
        resolve(result);
      } catch (error) {
        socket.destroy();
        reject(error);
      }
    });
    socket.setTimeout(15000, () => socket.destroy(new Error('tls_peer_timeout')));
    socket.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'method_not_allowed' });
  if (!authorized(req)) return json(res, 401, { error: 'unauthorized' });
  try {
    const b = await readBody(req);
    const action = String(b.action || '');
    const env = b.environment === 'production' ? 'production' : 'homologation';
    const material = action === 'sp-tls-peer-info' ? null : tls(b);

    if (action === 'nfe-probe') return json(res, 200, await probe(nfeEndpoint(String(b.model) === '65' ? '65' : '55', env), material));
    if (action === 'cte-probe') return json(res, 200, await probe(`${cteBase(env)}/CTeStatusServicoV4/CTeStatusServicoV4.asmx`, material));
    if (action === 'mdfe-probe') return json(res, 200, await probe(`${mdfeBase(env)}/MDFeStatusServico/MDFeStatusServico.asmx`, material));

    if (action === 'sp-tls-peer-info') {
      return json(res, 200, {
        ok: true,
        host: 'nfce.fazenda.sp.gov.br',
        tls: await peerCertificateInfo('nfce.fazenda.sp.gov.br'),
      });
    }

    // Redundant transport for the national DF-e distribution service. This is used by the
    // extractor as a fallback when the dedicated bridge is unavailable.
    if (action === 'nfe-distribution') {
      const cnpj = String(b.cnpj || '').replace(/\D/g, '');
      const ufCode = String(b.uf_code || b.ufCode || '').replace(/\D/g, '').padStart(2, '0');
      const ultNSU = String(b.ult_nsu || b.ultNSU || '0').replace(/\D/g, '').padStart(15, '0');
      if (!/^\d{14}$/.test(cnpj) || !/^\d{2}$/.test(ufCode)) {
        return json(res, 400, { error: 'invalid_distribution_target' });
      }
      const endpoint = env === 'production'
        ? 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx'
        : 'https://hom.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';
      const inner = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${env === 'production' ? '1' : '2'}</tpAmb><cUFAutor>${ufCode}</cUFAutor><CNPJ>${cnpj}</CNPJ><distNSU><ultNSU>${ultNSU}</ultNSU></distNSU></distDFeInt>`;
      const ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe';
      const soap = envelope('nfeDadosMsg', ns, inner);
      const result = await requestHttps(endpoint, material, {
        body: soap,
        contentType: `application/soap+xml; charset=utf-8; action="${ns}/nfeDistDFeInteresse"`,
        accept: 'application/soap+xml, text/xml, */*',
      });
      return json(res, result.status >= 200 && result.status < 300 ? 200 : 502, {
        ok: result.status >= 200 && result.status < 300,
        http: result.status,
        endpoint,
        text: result.text,
      });
    }

    // SEFAZ/SP SAE-NFC-e: official A1-authenticated listing and XML download service.
    if (action === 'sp-nfce-list') {
      const start = String(b.start || b.dataHoraInicial || '').trim();
      const end = String(b.end || b.dataHoraFinal || '').trim();
      if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(start)) {
        return json(res, 400, { error: 'invalid_start_datetime' });
      }
      if (end && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(end)) {
        return json(res, 400, { error: 'invalid_end_datetime' });
      }
      const endpoint = env === 'production'
        ? 'https://nfce.fazenda.sp.gov.br/ws/NFCeListagemChaves.asmx'
        : 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFCeListagemChaves.asmx';
      const inner = `<nfceListagemChaves xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><tpAmb>${env === 'production' ? '1' : '2'}</tpAmb><dataHoraInicial>${start}</dataHoraInicial>${end ? `<dataHoraFinal>${end}</dataHoraFinal>` : ''}</nfceListagemChaves>`;
      const ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFCeListagemChaves';
      const soap = envelope('nfeDadosMsg', ns, inner);
      const result = await requestHttps(endpoint, material, {
        body: soap,
        contentType: `application/soap+xml; charset=utf-8; action="${ns}/nfceListagemChaves"`,
        accept: 'application/soap+xml, text/xml, */*',
      });
      return json(res, result.status >= 200 && result.status < 300 ? 200 : 502, {
        ok: result.status >= 200 && result.status < 300,
        http: result.status,
        endpoint,
        text: result.text,
      });
    }

    if (action === 'sp-nfce-download') {
      const accessKey = String(b.access_key || b.chNFCe || '').replace(/\D/g, '');
      if (!/^\d{44}$/.test(accessKey)) return json(res, 400, { error: 'invalid_access_key' });
      const endpoint = env === 'production'
        ? 'https://nfce.fazenda.sp.gov.br/ws/NFCeDownloadXML.asmx'
        : 'https://homologacao.nfce.fazenda.sp.gov.br/ws/NFCeDownloadXML.asmx';
      const inner = `<nfceDownloadXML xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00"><tpAmb>${env === 'production' ? '1' : '2'}</tpAmb><chNFCe>${accessKey}</chNFCe></nfceDownloadXML>`;
      const ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFCeDownloadXML';
      const soap = envelope('nfeDadosMsg', ns, inner);
      const result = await requestHttps(endpoint, material, {
        body: soap,
        contentType: `application/soap+xml; charset=utf-8; action="${ns}/nfceDownloadXML"`,
        accept: 'application/soap+xml, text/xml, */*',
      });
      return json(res, result.status >= 200 && result.status < 300 ? 200 : 502, {
        ok: result.status >= 200 && result.status < 300,
        http: result.status,
        endpoint,
        text: result.text,
      });
    }

    let endpoint = '', soap = '', contentType = 'application/soap+xml; charset=utf-8';
    if (action === 'nfe-authorize') {
      const model = String(b.model) === '65' ? '65' : '55';
      const signed = stripDecl(b.signed_xml);
      if (!signed.includes('<NFe') && !signed.includes(':NFe')) return json(res, 400, { error: 'invalid_nfe_xml' });
      endpoint = nfeEndpoint(model, env);
      const idLote = String(Date.now()).slice(-15).padStart(15, '0');
      const inner = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${signed}</enviNFe>`;
      soap = envelope('nfeDadosMsg', 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4', inner);
      const result = await requestHttps(endpoint, material, { body: soap, contentType, accept: 'application/soap+xml, text/xml, */*' });
      return json(res, result.status >= 200 && result.status < 300 ? 200 : 502, { ok: result.status >= 200 && result.status < 300, http: result.status, endpoint, idLote, text: result.text });
    }
    if (action === 'cte-status') {
      endpoint = `${cteBase(env)}/CTeStatusServicoV4/CTeStatusServicoV4.asmx`;
      const inner = `<consStatServCTe xmlns="http://www.portalfiscal.inf.br/cte" versao="4.00"><tpAmb>${env === 'production' ? '1' : '2'}</tpAmb><cUF>${String(b.cuf || '27').replace(/\D/g, '')}</cUF><xServ>STATUS</xServ></consStatServCTe>`;
      const ns = 'http://www.portalfiscal.inf.br/cte/wsdl/CTeStatusServicoV4';
      soap = envelope('cteDadosMsg', ns, inner);
      contentType = `application/soap+xml; charset=utf-8; action="${ns}/cteStatusServicoCTe"`;
    } else if (action === 'cte-authorize') {
      endpoint = `${cteBase(env)}/CTeRecepcaoSincV4/CTeRecepcaoSincV4.asmx`;
      const xml = stripDecl(b.signed_xml);
      if (!xml.includes('<CTe') && !xml.includes(':CTe')) return json(res, 400, { error: 'invalid_cte_xml' });
      const payload = zlib.gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
      const ns = 'http://www.portalfiscal.inf.br/cte/wsdl/CTeRecepcaoSincV4';
      soap = envelope('cteDadosMsg', ns, payload);
      contentType = `application/soap+xml; charset=utf-8; action="${ns}/cteRecepcao"`;
    } else if (action === 'mdfe-status') {
      endpoint = `${mdfeBase(env)}/MDFeStatusServico/MDFeStatusServico.asmx`;
      const inner = `<consStatServMDFe xmlns="http://www.portalfiscal.inf.br/mdfe" versao="3.00"><tpAmb>${env === 'production' ? '1' : '2'}</tpAmb><xServ>STATUS</xServ></consStatServMDFe>`;
      const ns = 'http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeStatusServico';
      soap = envelope('mdfeDadosMsg', ns, inner);
    } else if (action === 'mdfe-authorize') {
      endpoint = `${mdfeBase(env)}/MDFeRecepcaoSinc/MDFeRecepcaoSinc.asmx`;
      const xml = stripDecl(b.signed_xml);
      if (!xml.includes('<MDFe') && !xml.includes(':MDFe')) return json(res, 400, { error: 'invalid_mdfe_xml' });
      const payload = zlib.gzipSync(Buffer.from(xml, 'utf8')).toString('base64');
      const ns = 'http://www.portalfiscal.inf.br/mdfe/wsdl/MDFeRecepcaoSinc';
      soap = envelope('mdfeDadosMsg', ns, payload);
      contentType = `application/soap+xml; charset=utf-8; action="${ns}/mdfeRecepcao"`;
    } else {
      return json(res, 400, { error: 'invalid_action' });
    }

    const result = await requestHttps(endpoint, material, { body: soap, contentType, accept: 'application/soap+xml, text/xml, */*' });
    return json(res, result.status >= 200 && result.status < 300 ? 200 : 502, { ok: result.status >= 200 && result.status < 300, http: result.status, endpoint, text: result.text });
  } catch (error) {
    console.error('Fiscal SOAP gateway error', error);
    return json(res, 500, {
      error: error instanceof Error ? error.message : String(error),
      code: error && typeof error === 'object' && 'code' in error ? error.code : null,
      cause: error && typeof error === 'object' && error.cause ? String(error.cause) : null,
    });
  }
};
