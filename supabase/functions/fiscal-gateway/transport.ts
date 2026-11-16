// Native mTLS transport for SEFAZ / SVRS / Ambiente Nacional, running inside Supabase Edge.
// Replaces the Node `https` bridges that used to run on Vercel.
// Uses Deno.connectTls (rustls) with the A1 client certificate + ICP-Brasil roots added to the default trust store.
import forge from "npm:node-forge@1.3.1";

const E = new TextEncoder();
const D = new TextDecoder();

// ICP-Brasil v10 root embedded as fallback (same one the Vercel gateway shipped).
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

let rootsPromise: Promise<string[]> | null = null;
export function icpRoots(): Promise<string[]> {
  if (!rootsPromise) {
    rootsPromise = (async () => {
      const roots = [ICP_BRASIL_V10_ROOT];
      await Promise.all(["v5", "v11", "v12"].map(async v => {
        try {
          const r = await fetch(`https://acraiz.icpbrasil.gov.br/credenciadas/RAIZ/ICP-Brasil${v}.crt`, { signal: AbortSignal.timeout(6000) });
          if (!r.ok) return;
          const buf = new Uint8Array(await r.arrayBuffer());
          const txt = D.decode(buf);
          if (txt.includes("BEGIN CERTIFICATE")) roots.push(txt);
          else {
            let bin = "";
            buf.forEach(b => bin += String.fromCharCode(b));
            roots.push(forge.pki.certificateToPem(forge.pki.certificateFromAsn1(forge.asn1.fromDer(bin))));
          }
        } catch { /* keep embedded root */ }
      }));
      return roots;
    })();
  }
  return rootsPromise;
}

export type Material = { cert: string; key: string } | null;

// PFX -> PEM, cached per worker so repeated calls for the same company skip the PKCS#12 decryption.
const pemCache = new Map<string, { cert: string; key: string }>();
async function cacheKey(pfx: string, pwd: string) {
  const d = await crypto.subtle.digest("SHA-256", E.encode(pfx + "\u0000" + pwd));
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, "0")).join("");
}
export function pfxToPem(pfxB64: string, password: string) {
  const p12 = forge.pkcs12.pkcs12FromAsn1(forge.asn1.fromDer(forge.util.decode64(pfxB64.replace(/\s+/g, ""))), false, password);
  let key: any = null;
  const certs: any[] = [];
  for (const sc of p12.safeContents) for (const bag of sc.safeBags) {
    if (!key && bag.key) key = bag.key;
    if (bag.cert) certs.push(bag.cert);
  }
  if (!key || !certs.length) throw new Error("pfx_parse_failed");
  const pubPem = forge.pki.publicKeyToPem(forge.pki.setRsaPublicKey(key.n, key.e));
  const leaf = certs.find(c => forge.pki.publicKeyToPem(c.publicKey) === pubPem) || certs[0];
  const ordered = [leaf, ...certs.filter(c => c !== leaf)];
  return {
    key: forge.pki.privateKeyToPem(key),
    cert: forge.pki.certificateToPem(leaf),
    chain: ordered.slice(1).map(c => forge.pki.certificateToPem(c)),
    full: ordered.map(c => forge.pki.certificateToPem(c)).join("\n"),
  };
}
export async function materialFromBody(b: any): Promise<Material> {
  const pfx = String(b?.certificate_base64 || "").replace(/\s+/g, "");
  const pwd = String(b?.certificate_password || "");
  if (pfx) {
    const k = await cacheKey(pfx, pwd);
    const hit = pemCache.get(k);
    if (hit) return hit;
    const p = pfxToPem(pfx, pwd);
    const m = { cert: p.full, key: p.key };
    if (pemCache.size > 64) pemCache.clear();
    pemCache.set(k, m);
    return m;
  }
  const cert = String(b?.certificate_pem || "");
  const key = String(b?.private_key_pem || "");
  const chain = Array.isArray(b?.chain_pem) ? b.chain_pem.map(String).filter(Boolean) : [];
  if (cert && key) return { cert: [cert, ...chain].join("\n"), key };
  return null;
}

export type HttpResult = {
  status: number;
  headers: Record<string, string>;
  setCookie: string[];
  body: Uint8Array;
  text: string;
  endpoint: string;
};

function concat(parts: Uint8Array[]) {
  const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0));
  let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
function indexOfSeq(buf: Uint8Array, seq: number[], from = 0) {
  outer: for (let i = from; i <= buf.length - seq.length; i++) {
    for (let j = 0; j < seq.length; j++) if (buf[i + j] !== seq[j]) continue outer;
    return i;
  }
  return -1;
}
function dechunk(buf: Uint8Array): Uint8Array {
  const parts: Uint8Array[] = [];
  let pos = 0;
  while (pos < buf.length) {
    const lineEnd = indexOfSeq(buf, [13, 10], pos);
    if (lineEnd < 0) break;
    const size = parseInt(D.decode(buf.slice(pos, lineEnd)).split(";")[0].trim(), 16);
    if (!Number.isFinite(size) || size <= 0) break;
    const start = lineEnd + 2;
    parts.push(buf.slice(start, start + size));
    pos = start + size + 2;
  }
  return concat(parts);
}

function withTimeout<T>(p: Promise<T>, ms: number, msg: string): Promise<T> {
  let t: number | undefined;
  return Promise.race([
    p,
    new Promise<never>((_, rej) => { t = setTimeout(() => rej(new Error(msg)), Math.max(1, ms)); }),
  ]).finally(() => clearTimeout(t));
}

export async function httpsRequest(url: string, opts: {
  method?: string; headers?: Record<string, string>; body?: string | Uint8Array;
  material?: Material; timeoutMs?: number;
} = {}): Promise<HttpResult> {
  const target = new URL(url);
  const method = opts.method || (opts.body ? "POST" : "GET");
  const bodyBytes = opts.body == null ? null : typeof opts.body === "string" ? E.encode(opts.body) : opts.body;
  const tlsOpts: any = {
    hostname: target.hostname,
    port: Number(target.port || 443),
    caCerts: await icpRoots(),
    alpnProtocols: ["http/1.1"],
  };
  if (opts.material) { tlsOpts.cert = opts.material.cert; tlsOpts.key = opts.material.key; }
  const timeoutMs = opts.timeoutMs ?? 60000;
  const deadline = Date.now() + timeoutMs;
  const conn = await withTimeout(Deno.connectTls(tlsOpts), Math.min(timeoutMs, 30000), "fiscal_gateway_connect_timeout");
  try {
    const headers: Record<string, string> = {
      "Host": target.host,
      "User-Agent": "WS-Gestao-Fiscal-Gateway/5.0",
      "Connection": "close",
      ...(opts.headers || {}),
    };
    if (bodyBytes) headers["Content-Length"] = String(bodyBytes.length);
    let head = `${method} ${target.pathname}${target.search} HTTP/1.1\r\n`;
    for (const [k, v] of Object.entries(headers)) head += `${k}: ${v}\r\n`;
    head += "\r\n";
    await conn.write(bodyBytes ? concat([E.encode(head), bodyBytes]) : E.encode(head));

    const chunks: Uint8Array[] = [];
    const buf = new Uint8Array(65536);
    let headerEnd = -1;
    let contentLength = -1;
    let chunked = false;
    let total = 0;
    while (true) {
      const remaining = deadline - Date.now();
      if (remaining <= 0) throw new Error("fiscal_gateway_timeout");
      let n: number | null;
      try {
        n = await withTimeout(conn.read(buf), remaining, "fiscal_gateway_timeout");
      } catch (e) {
        // IIS servers commonly drop the socket without TLS close_notify: treat as EOF once we have data.
        if (chunks.length && /close_notify|unexpected-eof|UnexpectedEof|connection reset/i.test(String((e as Error)?.message || e))) break;
        throw e;
      }
      if (n === null) break;
      chunks.push(buf.slice(0, n));
      total += n;
      if (headerEnd < 0) {
        const all = concat(chunks);
        headerEnd = indexOfSeq(all, [13, 10, 13, 10]);
        if (headerEnd >= 0) {
          const headText = D.decode(all.slice(0, headerEnd));
          contentLength = Number(headText.match(/\r\ncontent-length:\s*(\d+)/i)?.[1] ?? -1);
          chunked = /\r\ntransfer-encoding:\s*chunked/i.test(headText);
        }
      }
      if (headerEnd >= 0) {
        const bodySoFar = total - headerEnd - 4;
        if (contentLength >= 0 && bodySoFar >= contentLength) break;
        if (chunked) {
          const last = chunks[chunks.length - 1];
          const tail = last.length >= 5 ? last.slice(-5) : concat(chunks).slice(-5);
          if (tail.length === 5 && tail[0] === 48 && tail[1] === 13 && tail[2] === 10 && tail[3] === 13 && tail[4] === 10) break;
        }
      }
    }
    const raw = concat(chunks);
    const he = indexOfSeq(raw, [13, 10, 13, 10]);
    if (he < 0) throw new Error("fiscal_gateway_bad_response");
    const lines = D.decode(raw.slice(0, he)).split("\r\n");
    const status = Number(lines[0].match(/^HTTP\/1\.[01] (\d{3})/)?.[1] || 0);
    const hdrs: Record<string, string> = {};
    const setCookie: string[] = [];
    for (const line of lines.slice(1)) {
      const i = line.indexOf(":");
      if (i <= 0) continue;
      const k = line.slice(0, i).trim().toLowerCase();
      const v = line.slice(i + 1).trim();
      if (k === "set-cookie") setCookie.push(v);
      else hdrs[k] = hdrs[k] ? `${hdrs[k]}, ${v}` : v;
    }
    let body = raw.slice(he + 4);
    if (/chunked/i.test(hdrs["transfer-encoding"] || "")) body = dechunk(body);
    else if (contentLength >= 0) body = body.slice(0, contentLength);
    if (/gzip/i.test(hdrs["content-encoding"] || "") && body.length) {
      body = new Uint8Array(await new Response(new Blob([body]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer());
    }
    return { status, headers: hdrs, setCookie, body, text: D.decode(body), endpoint: url };
  } finally {
    try { conn.close(); } catch { /* already closed */ }
  }
}

export function b64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
export async function gzipB64(text: string) {
  const out = new Uint8Array(await new Response(new Blob([E.encode(text)]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer());
  return b64(out);
}
export function mergeCookies(current: string, setCookie: string[]) {
  const jar = new Map<string, string>();
  for (const p of String(current || "").split(/;\s*/)) { const i = p.indexOf("="); if (i > 0) jar.set(p.slice(0, i), p.slice(i + 1)); }
  for (const raw of setCookie || []) { const pair = String(raw || "").split(";", 1)[0]; const i = pair.indexOf("="); if (i > 0) jar.set(pair.slice(0, i), pair.slice(i + 1)); }
  return [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
}
