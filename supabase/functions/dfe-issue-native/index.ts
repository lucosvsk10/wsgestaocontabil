import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";
import { buildNativeNfeXml } from "./xml.ts";
import { signNfeXml } from "./sign.ts";
import { authorizeNfeNative, parseAuthorization } from "./sefaz.ts";
import { addNfceSupplement } from "./qrcode.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const encoder = new TextEncoder();
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const toBase64Url = (value: Uint8Array | string) => { const bytes = typeof value === "string" ? encoder.encode(value) : value; return btoa(String.fromCharCode(...bytes)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", ""); };
const fromBase64Url = (value: string) => { const normalized = value.replaceAll("-", "+").replaceAll("_", "/"); return atob(normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=")); };
async function verifyEngineToken(token: string, userId: string) {
  const [payload, signature] = token.split("."); if (!payload || !signature) return false;
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const expected = toBase64Url(new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(payload))));
  if (signature !== expected) return false;
  try { const decoded = JSON.parse(fromBase64Url(payload)); return decoded.uid === userId && Number(decoded.exp) > Date.now(); } catch { return false; }
}

function validate(raw: Record<string, unknown>, model: "55" | "65") {
  const errors: string[] = [];
  if (digits(raw.cnpjEmitente).length !== 14) errors.push("CNPJ emitente inválido.");
  if (!digits(raw.ie)) errors.push("Inscrição estadual obrigatória.");
  if (!String(raw.razaoSocial || "").trim()) errors.push("Razão social obrigatória.");
  if (digits(raw.codigoMunicipio).length !== 7) errors.push("Município IBGE inválido.");
  if (digits(raw.ncm).length !== 8) errors.push("NCM deve ter 8 dígitos.");
  if (digits(raw.cfop).length !== 4) errors.push("CFOP deve ter 4 dígitos.");
  if (!(Number(raw.quantidade) > 0)) errors.push("Quantidade deve ser maior que zero.");
  if (!(Number(raw.valorUnitario) > 0)) errors.push("Valor unitário deve ser maior que zero.");
  if (model === "55" && !digits(raw.destDocumento)) errors.push("NF-e modelo 55 exige destinatário neste laboratório.");
  return errors;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  try {
    const auth = req.headers.get("Authorization"); if (!auth) return json({ error: "Não autenticado" }, 401);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", "")); if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id); if (!roles?.some((row: any) => row.role === "admin")) return json({ error: "Acesso exclusivo para administradores" }, 403);

    const body = await req.json() as Record<string, unknown>;
    if (!await verifyEngineToken(String(body.engine_token || ""), user.id)) return json({ error: "Sessão da Feature expirada. Desbloqueie novamente." }, 401);
    if (body.environment === "producao") return json({ error: "Produção bloqueada." }, 403);

    const model: "55" | "65" = body.model === "55" ? "55" : "65";
    const raw = (body.data || {}) as Record<string, unknown>;
    const errors = validate(raw, model); if (errors.length) return json({ error: "Dados fiscais incompletos.", errors }, 422);

    const pfxBase64 = String(body.certificate_base64 || "").trim(); const password = String(body.certificate_password || "");
    if (!pfxBase64 || !password) return json({ error: "Carregue o certificado A1." }, 422);
    const cert = lerCertificado(Buffer.from(pfxBase64, "base64"), password);
    if (cert.titular.cnpj && cert.titular.cnpj !== digits(raw.cnpjEmitente)) return json({ error: "O CNPJ do XML não corresponde ao certificado A1." }, 422);

    const built = buildNativeNfeXml(model, raw);
    const signedBase = signNfeXml(built.xml, cert.chavePrivadaPem, cert.certificadoPem);
    const signedXml = addNfceSupplement(signedBase, model, built.chaveAcesso);
    const authResult = await authorizeNfeNative(cert, model, signedXml);
    const parsed = parseAuthorization(authResult.text);
    const accessKey = parsed.protocol.chNFe || built.chaveAcesso;

    if (parsed.authorized) {
      const now = new Date().toISOString();
      const issuerCnpj = digits(raw.cnpjEmitente);
      const { error: saveError } = await admin.from("fiscal_dfe_documents").upsert({
        user_id: user.id,
        cnpj: issuerCnpj,
        environment: "homologacao",
        uf_code: "27",
        nsu: `WS-${accessKey}`,
        schema_name: model === "55" ? "ws-issued-NFe55" : "ws-issued-NFCe65",
        document_kind: "nfe",
        direction: "saida",
        access_key: accessKey,
        issue_date: now,
        value: Number(built.total || 0),
        issuer_cnpj: issuerCnpj,
        issuer_name: String(raw.razaoSocial || cert.titular.nome || ""),
        recipient_cnpj: digits(raw.destDocumento) || null,
        note_number: String(raw.numeroNota || ""),
        series: String(raw.serie || ""),
        status_code: String(parsed.protocol?.cStat || "100"),
        full_xml: true,
        xml: signedXml,
        updated_at: now,
      }, { onConflict: "user_id,cnpj,environment,uf_code,nsu" });
      if (saveError) console.error("dfe-issue-native history save", saveError);
    }

    return json({ ok: parsed.authorized, authorized: parsed.authorized, connected: true, signed: true, sent: true, model, environment: "homologacao", generator: "ws-native-nfe-4.00", chaveAcesso: accessKey, total: built.total, idLote: authResult.idLote, endpoint: authResult.endpoint, response: parsed, xmlAssinado: signedXml });
  } catch (reason) {
    console.error("dfe-issue-native", reason);
    return json({ error: reason instanceof Error ? reason.message : String(reason) }, 500);
  }
});
