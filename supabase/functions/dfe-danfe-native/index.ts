import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import QRCode from "npm:qrcode@1.5.4";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const digits = (v: unknown) => String(v ?? "").replace(/\D/g, "");
const esc = (v: unknown) => String(v ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
const money = (v: unknown) => Number(v || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const toBase64Url = (value: Uint8Array | string) => {
  const bytes = typeof value === "string" ? encoder.encode(value) : value;
  return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};
const fromBase64Url = (value: string) => {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "="));
};
async function verifyEngineToken(token: string, userId: string) {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return false;
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
  if (signature !== expected) return false;
  try {
    const decoded = JSON.parse(fromBase64Url(payload));
    return decoded.uid === userId && Number(decoded.exp) > Date.now();
  } catch { return false; }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((r: any) => r.role === "admin")) return json({ error: "Acesso exclusivo para administradores" }, 403);

    const body = await req.json() as Record<string, any>;
    if (!await verifyEngineToken(String(body.engine_token || ""), user.id)) return json({ error: "Sessão da Feature expirada. Desbloqueie novamente." }, 401);
    if (body.environment === "producao") return json({ error: "Produção bloqueada." }, 403);

    const sale = (body.data || {}) as Record<string, unknown>;
    const protocol = (body.protocol || {}) as Record<string, unknown>;
    const chave = digits(protocol.chNFe || body.chaveAcesso);
    const nProt = digits(protocol.nProt);
    if (String(protocol.cStat || "") !== "100" || chave.length !== 44 || !nProt) return json({ error: "O DANFE só pode ser gerado para uma NFC-e autorizada (cStat 100)." }, 422);

    const total = Number(sale.quantidade || 0) * Number(sale.valorUnitario || 0);
    const qrUrl = `http://nfce.sefaz.al.gov.br/QRCode/consultarNFCe.jsp?p=${chave}|3|2`;
    const qrSvg = await QRCode.toString(qrUrl, { type: "svg", errorCorrectionLevel: "M", margin: 1, width: 256 });
    const chaveFmt = chave.replace(/(\d{4})(?=\d)/g, "$1 ");
    const issuedAt = new Date().toLocaleString("pt-BR", { timeZone: "America/Maceio" });
    const homologProduct = "NOTA FISCAL EMITIDA EM AMBIENTE DE HOMOLOGACAO - SEM VALOR FISCAL";

    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>DANFE NFC-e ${chave}</title><style>
      @page{size:80mm auto;margin:2mm}*{box-sizing:border-box}body{margin:0;background:#fff;color:#000;font-family:Arial,Helvetica,sans-serif;font-size:9px;line-height:1.25}.receipt{width:76mm;margin:0 auto}.center{text-align:center}.bold{font-weight:700}.muted{font-size:8px}.sep{border-top:1px dashed #000;margin:2.2mm 0}.issuer{font-size:11px;font-weight:700;margin-bottom:1mm}.title{font-size:10px;font-weight:700}.homolog{border:1.5px solid #000;padding:2mm;margin:2mm 0;font-weight:700;font-size:9px;text-align:center}.items{width:100%;border-collapse:collapse}.items th,.items td{padding:1mm 0;vertical-align:top}.items th{border-bottom:1px solid #000;text-align:left;font-size:7px}.items .num{text-align:right;white-space:nowrap}.total{display:flex;justify-content:space-between;font-size:13px;font-weight:700;margin:1mm 0}.pay{display:flex;justify-content:space-between}.qr{width:32mm;height:32mm;margin:2mm auto}.qr svg{display:block;width:32mm!important;height:32mm!important}.key{font-family:'Courier New',monospace;font-size:8px;word-spacing:1px;line-height:1.35}.protocol{font-size:8px}.footer{margin-top:2mm;font-size:7px;text-align:center}@media screen{body{padding:12px;background:#eee}.receipt{background:#fff;padding:3mm;box-shadow:0 1px 8px #aaa}}@media print{body{background:#fff}.receipt{width:76mm;padding:0;box-shadow:none}.no-print{display:none!important}}
    </style></head><body><div class="receipt">
      <div class="center"><div class="issuer">${esc(sale.razaoSocial)}</div><div>${esc(sale.nomeFantasia || "")}</div><div>CNPJ ${esc(digits(sale.cnpjEmitente))} · IE ${esc(digits(sale.ie))}</div><div>${esc(sale.logradouro)}, ${esc(sale.numeroEndereco)} - ${esc(sale.bairro)}</div><div>${esc(sale.nomeMunicipio)}/AL · CEP ${esc(digits(sale.cep))}</div></div>
      <div class="sep"></div><div class="center title">DANFE NFC-e</div><div class="center muted">Documento Auxiliar da Nota Fiscal de Consumidor Eletrônica</div><div class="center muted">Não permite aproveitamento de crédito de ICMS</div>
      <div class="homolog">EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO<br>SEM VALOR FISCAL</div>
      <table class="items"><thead><tr><th>ITEM / DESCRIÇÃO</th><th class="num">QTD</th><th class="num">VL UNIT.</th><th class="num">TOTAL</th></tr></thead><tbody><tr><td>001<br>${homologProduct}</td><td class="num">${esc(Number(sale.quantidade || 0).toFixed(3))}</td><td class="num">${money(sale.valorUnitario)}</td><td class="num">${money(total)}</td></tr></tbody></table>
      <div class="sep"></div><div class="total"><span>VALOR TOTAL R$</span><span>${money(total)}</span></div><div class="pay"><span>Dinheiro</span><span>R$ ${money(total)}</span></div>
      <div class="sep"></div><div class="center bold">Consulte pela Chave de Acesso em</div><div class="center muted">http://www.sefaz.al.gov.br/nfce/consulta</div><div class="center key">${chaveFmt}</div>
      <div class="qr">${qrSvg}</div><div class="center muted">Consulte via leitor de QR Code</div>
      <div class="sep"></div><div class="center protocol">NFC-e nº ${esc(String(sale.numeroNota || "1"))} · Série ${esc(String(sale.serie || "1"))}<br>Emissão: ${esc(issuedAt)}<br>Protocolo de autorização: ${esc(nProt)}</div>
      <div class="sep"></div><div class="footer">WS Gestão · Emissão direta SEFAZ/SVRS · Ambiente de homologação</div>
      <script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));</script>
    </div></body></html>`;

    return json({ ok: true, html, chaveAcesso: chave, protocolo: nProt, qrUrl });
  } catch (reason) {
    console.error("dfe-danfe-native", reason);
    return json({ error: reason instanceof Error ? reason.message : String(reason) }, 500);
  }
});
