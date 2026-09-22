const https = require('node:https');
const tlsModule = require('node:tls');
const crypto = require('node:crypto');
const zlib = require('node:zlib');
const { SignedXml } = require('xml-crypto');

const ICP_BRASIL_V10_ROOT = `-----BEGIN CERTIFICATE-----
MIIGrDCCBJSgAwIBAgIJANLVi0S/gZNCMA0GCSqGSIb3DQEBDQUAMIGYMQswCQYD
VQQGEwJCUjETMBEGA1UECgwKSUNQLUJyYXNpbDE9MDsGA1UECww0SW5zdGl0dXRv
IE5hY2lvbmFsIGRlIFRlY25vbG9naWEgZGEgSW5mb3JtYWNhbyAtIElUSTE1MDMG
A1UEAwwsQXV0b3JpZGFkZSBDZXJ0aWZpY2Fkb3JhIFJhaXogQnJhc2lsZWlyYSB2
MTAwHhcNMTkwNzAxMTkxNTU5WhcNMzIwNzAxMTIwMDU5WjCBmDELMAkGA1UEBhMC
QlIxEzARBgNVBAoMCklDUC1CcmFzaWwxPTA7BgNVBAsMNEluc3RpdHV0byBOYWNp
b25hbCBkZSBUZWNub2xvZ2lhIGRhIEluZm9ybWFjYW8gLSBJVEkxNTAzBgNVBAMM
LEF1dG9yaWRhZGUgQ2VydGlmaWNhZG9yYSBSYWl6IEJyYXNpbGVpcmEgdjEwMIIC
IjANBgkqhkiG9w0BAQEFAAOCAg8AMIICCgKCAgEAk3AxKl1ZtP0pNyjChqO7qNkn
+/sClZeqiV/Kd7KnnbkDbI2y3VWcUG7feCE/deIxot6GH6JXncRG794UZl+4doD0
D0/cEwBd4DvrDSZm0RT40xhmYYOTxZDJxv+coTHdmsT5aNmSkktfjzYX4HQHh/7M
em+kTOpT/3E4K6B7KVs9HkOT7nXx5yU1qYbVWqI0qpJM9mOTSFx8C9HiKcHvLCvt
1ioXKPAmFuHPkayOcXP2MXeb+VRNjWKU4E+L2t5uZPKVx1M/9i1DztlLb4K8OfYg
GaPDUSF1sxnoGk5qZHLleO6KjCpmuQepmgsBvxi2YNO7X2YUwQQx1AXNSolgtkAR
5gt+1WzxhbFUhItQqlhqxgWHefLmiT5T/Ctz/P2v+zSO4efkkIzsi1iwD+ypZvM2
lnIvB24RcSN6jzmCahLPX4CwjwIK6JsSoMVxIhpZHCguUP4LXqP8IWUZ6WgS/4zB
7B9E0EICl2rM1PRy+6ulv+ZOW256e8a0pijUB+hXM1msUq9L92476FAAX8va3sP7
+Uut94+bGHmubcTLImWUPrxNT7QyrvE3FyHicfiHioeFL2oV4cXTLZrEq2wS8R4P
KPdSzNn5Z9e2uMEGYQaSNO+OwvVycpIhOBOqrm12wJ9ZhWKtM5UOo34/o37r5ZBI
TYXAGbhqQDB9mWXwH+0CAwEAAaOB9jCB8zBOBgNVHSAERzBFMEMGBWBMAQEAMDow
OAYIKwYBBQUHAgEWLGh0dHA6Ly9hY3JhaXouaWNwYnJhc2lsLmdvdi5ici9EUENh
Y3JhaXoucGRmMEAGA1UdHwQ5MDcwNaAzoDGGL2h0dHA6Ly9hY3JhaXouaWNwYnJh
c2lsLmdvdi5ici9MQ1JhY3JhaXp2MTAuY3JsMB8GA1UdIwQYMBaAFHTzfv/8n1N6
8Xzrqz6kptoYukVjMB0GA1UdDgQWBBR0837//J9TevF866s+pKbaGLpFYzAPBgNV
HRMBAf8EBTADAQH/MA4GA1UdDwEB/wQEAwIBBjANBgkqhkiG9w0BAQ0FAAOCAgEA
eCNhBSuy/Ih/T+1VOtAJju85SrtoE3vET1qXASpmjQllDHG/ph7VFNRAkC+gha+B
CbjoA5oJ/8wwl+Qdp1KGz6nXXFTLx3osU+kjm0srmBf9nyXHPqvFyvBeB0A7sYb7
TmII9GKD20oCxsdkccR/oE/JuTaNnGq0GYZ2aDb5v62uLi21Y6P9UBiTxZqQ4ojW
ET6kXNjlK238jpXv17FR8Sg3VusCvX7Q8eJkavvHHZDeWck2fSA+ycAc2JeL2Z0B
MSxGWpH32WM9J8+6XqCJUXHiWEV0zCE8wDYiYC+047pTxQI/gB/FcU7jvylh98DJ
kQPHd/Tp6Og3ynlDA9n9uBbxYHVRZs9vsZ/7xTFaxRe+zk8dhgKgZ/3RrcMFB570
2t8LFbyuUE/kQVY6rZ0QJ9qMWQ7VPLRwRhiMeU3k8WDJb/tBbOXHBqldTbWyQ+mp
MEDWhbrzE/IED82wAuO23Tb05cYk2xC7+Izef8fSc3XdJDuPSbcDpWukzyCDtSEH
isLiGEtIbYRiPsF3czlQPsnIEVoTTCWxHCH1zYR6zScSv18Qh69qVe2J40K5jZoP
GEOhq/oKhVJQAdvAFW5Odp7mF3Tk9nivjjsctJSxY26LFiV5GRV+07SSse4ti0aO
jO5PLg5SWjfcOtBG2rz02EIvQAmLcb0kGBtfdj0lW/w=
-----END CERTIFICATE-----`;

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
function digits(v) { return String(v ?? '').replace(/\\D/g, ''); }
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
function decodeXmlEntities(v) { return String(v || '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&'); }
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
    const needsIcpBrasilV10 = ['nfe.fazenda.sp.gov.br', 'homologacao.nfe.fazenda.sp.gov.br', 'nfce.fazenda.sp.gov.br', 'homologacao.nfce.fazenda.sp.gov.br'].includes(target.hostname);
    const request = https.request({
      hostname: target.hostname,
      port: 443,
      path: target.pathname + target.search,
      method,
      ...material,
      ...(needsIcpBrasilV10 ? { ca: [...tlsModule.rootCertificates, ICP_BRASIL_V10_ROOT] } : {}),
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
    const socket = tlsModule.connect({
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


function xmlEscape(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}
function nfeDv(base) {
  let sum = 0, weight = 2;
  for (let i = base.length - 1; i >= 0; i -= 1) {
    sum += Number(base[i]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  const result = 11 - (sum % 11);
  return result >= 10 ? 0 : result;
}
function saoPauloNowIso() {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
  }).formatToParts(new Date()).reduce((acc, x) => (acc[x.type] = x.value, acc), {});
  return `${p.year}-${p.month}-${p.day}T${p.hour}:${p.minute}:${p.second}-03:00`;
}
function buildSpNfeRecoveryProbe(body) {
  const cnpj = digits(body.issuer_cnpj);
  const ie = digits(body.issuer_ie);
  const cMun = digits(body.issuer_city_code);
  const cep = digits(body.issuer_zip || '01001000');
  const series = digits(body.series || '1').padStart(3, '0').slice(-3);
  const nNF = digits(body.note_number).padStart(9, '0').slice(-9);
  if (!/^\d{14}$/.test(cnpj) || !ie || !/^35\d{5}$/.test(cMun) || !/^\d{9}$/.test(nNF)) {
    throw new Error('invalid_sp_recovery_issuer');
  }
  const dhEmi = saoPauloNowIso();
  const aamm = dhEmi.slice(2, 4) + dhEmi.slice(5, 7);
  const seedHex = sha256(`${cnpj}|${series}|${nNF}|${dhEmi}`).slice(0, 12);
  const cNF = String(Number(BigInt('0x' + seedHex) % 100000000n)).padStart(8, '0');
  const base = `35${aamm}${cnpj}55${series}${nNF}1${cNF}`;
  const accessKey = base + String(nfeDv(base));
  const crtInput = digits(body.crt);
  const actualCrt = ['1', '2', '3', '4'].includes(crtInput) ? crtInput : '1';
  // Deliberately use the opposite tax regime in the recovery probe. Existing
  // natural keys are caught by 539 before business validation; an unused
  // number cannot be authorized because the issuer regime then fails validation.
  const crt = actualCrt === '3' ? '1' : '3';
  const issuerName = xmlEscape(body.issuer_name || 'EMITENTE');
  const tradeName = xmlEscape(body.issuer_trade_name || body.issuer_name || 'EMITENTE');
  const street = xmlEscape(body.issuer_street || 'RUA TESTE');
  const number = xmlEscape(body.issuer_number || 'S/N');
  const district = xmlEscape(body.issuer_district || 'CENTRO');
  const city = xmlEscape(body.issuer_city || 'SAO PAULO');
  const tax = crt === '1'
    ? '<ICMS><ICMSSN102><orig>0</orig><CSOSN>102</CSOSN></ICMSSN102></ICMS>'
    : '<ICMS><ICMS00><orig>0</orig><CST>00</CST><modBC>3</modBC><vBC>1.00</vBC><pICMS>18.0000</pICMS><vICMS>0.18</vICMS></ICMS00></ICMS>';
  const federalTax = crt === '3'
    ? '<PIS><PISAliq><CST>01</CST><vBC>1.00</vBC><pPIS>1.6500</pPIS><vPIS>0.02</vPIS></PISAliq></PIS><COFINS><COFINSAliq><CST>01</CST><vBC>1.00</vBC><pCOFINS>7.6000</pCOFINS><vCOFINS>0.08</vCOFINS></COFINSAliq></COFINS>'
    : '<PIS><PISOutr><CST>49</CST><qBCProd>0.0000</qBCProd><vAliqProd>0.0000</vAliqProd><vPIS>0.00</vPIS></PISOutr></PIS><COFINS><COFINSOutr><CST>49</CST><qBCProd>0.0000</qBCProd><vAliqProd>0.0000</vAliqProd><vCOFINS>0.00</vCOFINS></COFINSOutr></COFINS>';
  // Safety invariant: the destination is deliberately identical to the issuer.
  // An unused number is therefore rejected (rule 220); an already-authorized
  // natural key is detected first as duplicate 539 and reveals the real key.
  const xml = `<?xml version="1.0" encoding="UTF-8"?><NFe xmlns="http://www.portalfiscal.inf.br/nfe"><infNFe Id="NFe${accessKey}" versao="4.00"><ide><cUF>35</cUF><cNF>${cNF}</cNF><natOp>VENDA</natOp><mod>55</mod><serie>${Number(series)}</serie><nNF>${Number(nNF)}</nNF><dhEmi>${dhEmi}</dhEmi><tpNF>1</tpNF><idDest>1</idDest><cMunFG>${cMun}</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>${accessKey.slice(-1)}</cDV><tpAmb>1</tpAmb><finNFe>1</finNFe><indFinal>0</indFinal><indPres>1</indPres><indIntermed>0</indIntermed><procEmi>0</procEmi><verProc>WSRECOVERY1</verProc></ide><emit><CNPJ>${cnpj}</CNPJ><xNome>${issuerName}</xNome><xFant>${tradeName}</xFant><enderEmit><xLgr>${street}</xLgr><nro>${number}</nro><xBairro>${district}</xBairro><cMun>${cMun}</cMun><xMun>${city}</xMun><UF>SP</UF><CEP>${cep}</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderEmit><IE>${ie}</IE><CRT>${crt}</CRT></emit><dest><CNPJ>${cnpj}</CNPJ><xNome>${issuerName}</xNome><enderDest><xLgr>${street}</xLgr><nro>${number}</nro><xBairro>${district}</xBairro><cMun>${cMun}</cMun><xMun>${city}</xMun><UF>SP</UF><CEP>${cep}</CEP><cPais>1058</cPais><xPais>BRASIL</xPais></enderDest><indIEDest>1</indIEDest><IE>${ie}</IE></dest><det nItem="1"><prod><cProd>WSRECOVERY</cProd><cEAN>SEM GTIN</cEAN><xProd>CONSULTA TECNICA DE CHAVE NF-E</xProd><NCM>01012100</NCM><CFOP>5102</CFOP><uCom>UN</uCom><qCom>1.0000</qCom><vUnCom>1.0000000000</vUnCom><vProd>1.00</vProd><cEANTrib>SEM GTIN</cEANTrib><uTrib>UN</uTrib><qTrib>1.0000</qTrib><vUnTrib>1.0000000000</vUnTrib><indTot>1</indTot></prod><imposto>${tax}${federalTax}<IBSCBS><CST>000</CST><cClassTrib>000001</cClassTrib><gIBSCBS><vBC>1.00</vBC><gIBSUF><pIBSUF>0.1000</pIBSUF><vIBSUF>0.00</vIBSUF></gIBSUF><gIBSMun><pIBSMun>0.0000</pIBSMun><vIBSMun>0.00</vIBSMun></gIBSMun><vIBS>0.00</vIBS><gCBS><pCBS>0.9000</pCBS><vCBS>0.01</vCBS></gCBS></gIBSCBS></IBSCBS></imposto><vItem>1.00</vItem></det><total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vICMSDeson>0.00</vICMSDeson><vFCP>0.00</vFCP><vBCST>0.00</vBCST><vST>0.00</vST><vFCPST>0.00</vFCPST><vFCPSTRet>0.00</vFCPSTRet><vProd>1.00</vProd><vFrete>0.00</vFrete><vSeg>0.00</vSeg><vDesc>0.00</vDesc><vII>0.00</vII><vIPI>0.00</vIPI><vIPIDevol>0.00</vIPIDevol><vPIS>0.00</vPIS><vCOFINS>0.00</vCOFINS><vOutro>0.00</vOutro><vNF>1.00</vNF></ICMSTot><IBSCBSTot><vBCIBSCBS>1.00</vBCIBSCBS><gIBS><gIBSUF><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vIBSUF>0.00</vIBSUF></gIBSUF><gIBSMun><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vIBSMun>0.00</vIBSMun></gIBSMun><vIBS>0.00</vIBS><vCredPres>0.00</vCredPres><vCredPresCondSus>0.00</vCredPresCondSus></gIBS><gCBS><vDif>0.00</vDif><vDevTrib>0.00</vDevTrib><vCBS>0.01</vCBS><vCredPres>0.00</vCredPres><vCredPresCondSus>0.00</vCredPresCondSus></gCBS></IBSCBSTot><vNFTot>1.00</vNFTot></total><transp><modFrete>9</modFrete></transp><pag><detPag><indPag>0</indPag><tPag>01</tPag><vPag>1.00</vPag></detPag></pag></infNFe></NFe>`;
  const privateKey = String(body.private_key_pem || '');
  const cert = String(body.certificate_pem || '');
  if (!privateKey || !cert) throw new Error('pem_required_for_sp_recovery');
  const signer = new SignedXml({
    privateKey,
    publicCert: cert,
    canonicalizationAlgorithm: 'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    signatureAlgorithm: 'http://www.w3.org/2000/09/xmldsig#rsa-sha1',
  });
  signer.addReference({
    xpath: "//*[local-name(.)='infNFe']",
    transforms: [
      'http://www.w3.org/2000/09/xmldsig#enveloped-signature',
      'http://www.w3.org/TR/2001/REC-xml-c14n-20010315',
    ],
    digestAlgorithm: 'http://www.w3.org/2000/09/xmldsig#sha1',
  });
  signer.getKeyInfoContent = SignedXml.getKeyInfoContent;
  signer.computeSignature(xml, { location: { reference: "//*[local-name(.)='infNFe']", action: 'after' } });
  return { signedXml: signer.getSignedXml(), probeKey: accessKey };
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
      const accessKey = String(b.access_key || b.chNFe || '').replace(/\D/g, '');
      if (!/^\d{14}$/.test(cnpj) || !/^\d{2}$/.test(ufCode) || (accessKey && !/^\d{44}$/.test(accessKey))) {
        return json(res, 400, { error: 'invalid_distribution_target' });
      }
      const endpoint = env === 'production'
        ? 'https://www1.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx'
        : 'https://hom.nfe.fazenda.gov.br/NFeDistribuicaoDFe/NFeDistribuicaoDFe.asmx';
      const query = accessKey ? `<consChNFe><chNFe>${accessKey}</chNFe></consChNFe>` : `<distNSU><ultNSU>${ultNSU}</ultNSU></distNSU>`;
      const inner = `<distDFeInt xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.01"><tpAmb>${env === 'production' ? '1' : '2'}</tpAmb><cUFAutor>${ufCode}</cUFAutor><CNPJ>${cnpj}</CNPJ>${query}</distDFeInt>`;
      const ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeDistribuicaoDFe';
      const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDistDFeInteresse xmlns="${ns}"><nfeDadosMsg>${inner}</nfeDadosMsg></nfeDistDFeInteresse></soap12:Body></soap12:Envelope>`;
      const result = await requestHttps(endpoint, material, {
        body: soap,
        contentType: `application/soap+xml; charset=utf-8; action="${ns}/nfeDistDFeInteresse"`,
        accept: 'application/soap+xml, text/xml, */*',
      });
      return json(res, result.status >= 200 && result.status < 300 ? 200 : 502, {
        ok: result.status >= 200 && result.status < 300,
        http: result.status,
        endpoint,
        text: decodeXmlEntities(result.text),
      });
    }


    if (action === 'sp-nfe-recover-key') {
      if (env !== 'production') return json(res, 400, { error: 'sp_recovery_requires_production' });
      const { signedXml, probeKey } = buildSpNfeRecoveryProbe(b);
      const endpoint = 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx';
      const idLote = String(Date.now()).slice(-15).padStart(15, '0');
      const inner = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${stripDecl(signedXml)}</enviNFe>`;
      const ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4';
      const soap = envelope('nfeDadosMsg', ns, inner);
      const result = await requestHttps(endpoint, material, {
        body: soap,
        contentType: `application/soap+xml; charset=utf-8; action="${ns}/nfeAutorizacaoLote"`,
        accept: 'application/soap+xml, text/xml, */*',
      });
      const cStats = [...String(result.text || '').matchAll(/<(?:\w+:)?cStat>(\d+)<\/(?:\w+:)?cStat>/g)].map(m => m[1]);
      const motives = [...String(result.text || '').matchAll(/<(?:\w+:)?xMotivo>([\s\S]*?)<\/(?:\w+:)?xMotivo>/g)].map(m => m[1].trim());
      const cStat = cStats[cStats.length - 1] || '';
      const xMotivo = motives[motives.length - 1] || '';
      const recoveredKey = [...xMotivo.matchAll(/(\d{44})/g)].map(m => m[1]).find(k => k !== probeKey) || '';
      if (cStat === '539' && /^\d{44}$/.test(recoveredKey)) {
        return json(res, 200, { ok: true, exists: true, cStat, xMotivo, access_key: recoveredKey });
      }
      if (cStat === '100') {
        console.error('CRITICAL: SP recovery probe unexpectedly authorized', { note_number: String(b.note_number || ''), series: String(b.series || '') });
        return json(res, 500, { error: 'sp_recovery_probe_unexpected_authorization', critical: true, cStat, xMotivo });
      }
      return json(res, 200, { ok: true, exists: false, cStat, xMotivo });
    }

    // SEFAZ/SP NF-e 55: direct status consultation and authorization endpoint.
    // These routes are required because SP is a native authorizer and is not served by SVRS.
    if (action === 'sp-nfe-consult') {
      const accessKey = String(b.access_key || b.chNFe || '').replace(/\D/g, '');
      if (!/^\d{44}$/.test(accessKey) || accessKey.slice(0, 2) !== '35' || accessKey.slice(20, 22) !== '55') {
        return json(res, 400, { error: 'invalid_sp_nfe_access_key' });
      }
      const endpoint = env === 'production'
        ? 'https://nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx'
        : 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeconsultaprotocolo4.asmx';
      const inner = `<consSitNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><tpAmb>${env === 'production' ? '1' : '2'}</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
      const ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4';
      const soap = envelope('nfeDadosMsg', ns, inner);
      const result = await requestHttps(endpoint, material, {
        body: soap,
        contentType: `application/soap+xml; charset=utf-8; action="${ns}/nfeConsultaNF"`,
        accept: 'application/soap+xml, text/xml, */*',
      });
      return json(res, result.status >= 200 && result.status < 300 ? 200 : 502, {
        ok: result.status >= 200 && result.status < 300,
        http: result.status,
        endpoint,
        text: result.text,
      });
    }

    if (action === 'sp-nfe-authorize') {
      const signed = stripDecl(b.signed_xml);
      if (!signed.includes('<NFe') && !signed.includes(':NFe')) return json(res, 400, { error: 'invalid_nfe_xml' });
      const endpoint = env === 'production'
        ? 'https://nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx'
        : 'https://homologacao.nfe.fazenda.sp.gov.br/ws/nfeautorizacao4.asmx';
      const idLote = String(b.id_lote || Date.now()).replace(/\D/g, '').slice(-15).padStart(15, '0');
      const inner = `<enviNFe xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00"><idLote>${idLote}</idLote><indSinc>1</indSinc>${signed}</enviNFe>`;
      const ns = 'http://www.portalfiscal.inf.br/nfe/wsdl/NFeAutorizacao4';
      const soap = envelope('nfeDadosMsg', ns, inner);
      const result = await requestHttps(endpoint, material, {
        body: soap,
        contentType: `application/soap+xml; charset=utf-8; action="${ns}/nfeAutorizacaoLote"`,
        accept: 'application/soap+xml, text/xml, */*',
      });
      return json(res, result.status >= 200 && result.status < 300 ? 200 : 502, {
        ok: result.status >= 200 && result.status < 300,
        http: result.status,
        endpoint,
        idLote,
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
