import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const E = new TextEncoder();
const D = new TextDecoder();
const B = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function vaultKey() {
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("secret_missing");
  const digest = await crypto.subtle.digest("SHA-256", E.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
}

async function decrypt(ciphertext: string, iv: string) {
  return D.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: B(iv) }, await vaultKey(), B(ciphertext)));
}

function dv(base: string) {
  let sum = 0;
  let weight = 2;
  for (let index = base.length - 1; index >= 0; index -= 1) {
    sum += Number(base[index]) * weight;
    weight = weight === 9 ? 2 : weight + 1;
  }
  let result = 11 - (sum % 11);
  if (result >= 10) result = 0;
  return String(result);
}

function syntheticKey(cnpj: string, monthCode: string, noteNumber: number) {
  const base = `27${monthCode}${cnpj}65${"001"}${String(noteNumber).padStart(9, "0")}1${"00000000"}`;
  return base + dv(base);
}

function monthCodes() {
  const now = new Date();
  const result: string[] = [];
  for (let offset = 0; offset <= 1; offset += 1) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
    result.push(String(d.getUTCFullYear()).slice(-2) + String(d.getUTCMonth() + 1).padStart(2, "0"));
  }
  return result;
}

async function consult(pfx: string, password: string, accessKey: string) {
  const payload = `<consSitNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>1</tpAmb><xServ>CONSULTAR</xServ><chNFe>${accessKey}</chNFe></consSitNFe>`;
  const soap = `<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">${payload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  const response = await fetch("https://ws-svrs-consit.vercel.app/api/consit", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ certificate_base64: pfx, certificate_password: password, soap_body: soap }),
    signal: AbortSignal.timeout(25000),
  });
  if (!response.ok) throw new Error(`consit_http_${response.status}`);
  const parsed = await response.json().catch(() => ({})) as any;
  const text = String(parsed?.body || "");
  if (!text) throw new Error("consit_empty");
  const cStat = text.match(/<cStat>(\d+)<\/cStat>/)?.[1] || null;
  const xMotivo = text.match(/<xMotivo>([\s\S]*?)<\/xMotivo>/)?.[1] || null;
  const realKey = xMotivo?.match(/\[(\d{44})\]/)?.[1] || null;
  return { cStat, xMotivo, realKey };
}

Deno.serve(async req => {
  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token = req.headers.get("x-debug-token") || "";
    const { data: internal } = await admin.from("_fiscal_sales_debug_token").select("token").eq("id", true).maybeSingle();
    if (!token || token !== String(internal?.token || "")) return json({ error: "unauthorized" }, 403);

    const body = await req.json().catch(() => ({})) as any;
    const companyId = String(body.company_id || "");
    if (!companyId) return json({ error: "company_id_required" }, 400);
    const lookahead = Math.min(12, Math.max(1, Number(body.lookahead || 6)));

    const { data: company, error: companyError } = await admin
      .from("fiscal_companies")
      .select("id,cnpj,status,uf")
      .eq("id", companyId)
      .maybeSingle();
    if (companyError) throw companyError;
    if (!company || company.status !== "ativa" || String(company.uf || "").toUpperCase() !== "AL") {
      return json({ ok: true, skipped: "company_not_eligible" });
    }

    const { data: cert, error: certError } = await admin
      .from("fiscal_certificates")
      .select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (certError) throw certError;
    if (!cert) return json({ ok: true, skipped: "certificate_missing" });

    const [{ data: state }, { data: savedRows }] = await Promise.all([
      admin.from("fiscal_sales_sync_state").select("latest_number").eq("company_id", companyId).maybeSingle(),
      admin.from("fiscal_sales_documents").select("document_number").eq("company_id", companyId).order("document_number", { ascending: false }).limit(100),
    ]);
    const maxSaved = Math.max(0, ...(savedRows || []).map((row: any) => Number(row.document_number) || 0));
    const requestedBase = Number(body.base_number || 0);
    const knownBase = Math.max(Number(state?.latest_number || 0), maxSaved);
    const baseNumber = requestedBase > 0 ? requestedBase : knownBase;
    const bootstrap = baseNumber <= 0;
    const bootstrapStart = Math.max(1, Number(body.bootstrap_start || 1));

    const pfx = await decrypt(cert.certificate_ciphertext, cert.certificate_iv);
    const password = await decrypt(cert.password_ciphertext, cert.password_iv);
    const cnpj = digits(company.cnpj);
    const months = monthCodes();
    let latest = bootstrap ? 0 : baseNumber;
    let cooldown = false;
    const hits: Array<{ note_number: number; access_key: string; month: string }> = [];
    let probes = 0;
    const firstNumber = bootstrap ? bootstrapStart : baseNumber + 1;
    const lastNumber = firstNumber + lookahead - 1;

    for (let noteNumber = firstNumber; noteNumber <= lastNumber && !cooldown; noteNumber += 1) {
      for (const month of months) {
        const result = await consult(pfx, password, syntheticKey(cnpj, month, noteNumber));
        probes += 1;
        if (result.cStat === "656") {
          cooldown = true;
          break;
        }
        if (result.realKey) {
          latest = Math.max(latest, noteNumber);
          hits.push({ note_number: noteNumber, access_key: result.realKey, month });
          break;
        }
        await sleep(220);
      }
      await sleep(300);
    }

    return json({ ok: true, company_id: companyId, base_number: baseNumber, bootstrap, bootstrap_start: bootstrapStart, latest, advanced: bootstrap ? latest > 0 : latest > baseNumber, hits, probes, months, cooldown });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
