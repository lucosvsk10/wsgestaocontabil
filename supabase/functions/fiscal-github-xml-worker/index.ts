import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const TARGET_CNPJS = new Set(["29880800000126", "32137785000135"]);
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const bytes = (value: string) => Uint8Array.from(atob(value), char => char.charCodeAt(0));
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});

async function authenticate(req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) throw new Error("oidc_token_missing");
  const keys = createRemoteJWKSet(new URL("https://token.actions.githubusercontent.com/.well-known/jwks"));
  const { payload } = await jwtVerify(token, keys, {
    issuer: "https://token.actions.githubusercontent.com",
    audience: "ws-fiscal-xml-worker",
  });
  if (payload.repository !== "lucosvsk10/wsgestaocontabil") throw new Error("oidc_repository_denied");
  if (payload.ref !== "refs/heads/main") throw new Error("oidc_ref_denied");
}

async function vaultKey() {
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("vault_secret_missing");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
}

async function decrypt(ciphertext: string, iv: string) {
  return decoder.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: bytes(iv) }, await vaultKey(), bytes(ciphertext)));
}

function tag(xml: string, name: string) {
  return xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`, "i"))?.[1]?.trim() || null;
}

function xmlKey(xml: string) {
  return digits(tag(xml, "chNFe") || xml.match(/\bId=["']NFe(\d{44})["']/i)?.[1] || "");
}

function parsedXml(xml: string) {
  return {
    issue_date: tag(xml, "dhEmi") || tag(xml, "dEmi"),
    value: tag(xml, "vNF") ? Number(tag(xml, "vNF")) : null,
    note_number: tag(xml, "nNF"),
    series: tag(xml, "serie"),
    issuer_cnpj: digits(tag(xml, "CNPJ") || "") || null,
    issuer_name: tag(xml, "xNome"),
  };
}

Deno.serve(async req => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  try {
    await authenticate(req);
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const body = await req.json().catch(() => ({})) as Record<string, unknown>;
    const action = String(body.action || "lease");
    const cnpj = digits(body.cnpj);
    if (!TARGET_CNPJS.has(cnpj)) return json({ error: "company_not_allowed" }, 403);
    const { data: company, error: companyError } = await admin.from("fiscal_companies")
      .select("id,cnpj,razao_social,status")
      .eq("cnpj", cnpj).eq("status", "ativa").maybeSingle();
    if (companyError || !company) throw companyError || new Error("company_missing");

    if (action === "lease") {
      const { data: certificate, error: certificateError } = await admin.from("fiscal_certificates")
        .select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,valid_until")
        .eq("company_id", company.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (certificateError || !certificate) throw certificateError || new Error("certificate_missing");
      const limit = Math.min(60, Math.max(1, Number(body.limit || 30)));
      const [{ data: sales, error: salesError }, { data: purchases, error: purchaseError }] = await Promise.all([
        admin.from("fiscal_sales_reconciliation")
          .select("access_key,model,series,note_number,status,xml_status")
          .eq("company_id", company.id).in("status", ["found", "cancelled"])
          .neq("xml_status", "saved").not("access_key", "is", null)
          .order("xml_attempts", { ascending: true }).order("note_number", { ascending: false }).limit(limit),
        admin.from("fiscal_dfe_documents")
          .select("id,access_key,model,note_number,series,issue_date,parse_error")
          .eq("company_id", company.id).eq("direction", "entrada").eq("model", "55")
          .eq("full_xml", false).not("access_key", "is", null)
          .order("issue_date", { ascending: false }).limit(limit),
      ]);
      if (salesError || purchaseError) throw salesError || purchaseError;
      const tasks = [
        ...(sales || []).filter(row => digits(row.access_key).length === 44).map(row => ({
          kind: "sale", access_key: digits(row.access_key), model: String(row.model || "55"),
          series: String(row.series || "1"), note_number: Number(row.note_number || 0),
        })),
        ...(purchases || []).filter(row => digits(row.access_key).length === 44).map(row => ({
          kind: "purchase", id: row.id, access_key: digits(row.access_key), model: "55",
          series: String(row.series || "1"), note_number: Number(row.note_number || 0),
        })),
      ].slice(0, limit);
      return json({
        ok: true,
        company: { id: company.id, cnpj, name: company.razao_social },
        certificate_base64: await decrypt(certificate.certificate_ciphertext, certificate.certificate_iv),
        certificate_password: await decrypt(certificate.password_ciphertext, certificate.password_iv),
        tasks,
      });
    }

    const accessKey = digits(body.access_key);
    if (accessKey.length !== 44 || accessKey.slice(6, 20) !== cnpj) return json({ error: "access_key_mismatch" }, 400);
    const kind = body.kind === "purchase" ? "purchase" : "sale";
    if (action === "submit_error") {
      const reason = String(body.error || "xml_download_failed").slice(0, 300);
      if (kind === "sale") await admin.from("fiscal_sales_reconciliation").update({
        xml_status: "retrying", xml_last_error: reason, xml_last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
      }).eq("company_id", company.id).eq("access_key", accessKey);
      else await admin.from("fiscal_dfe_documents").update({ parse_error: `xml_retry:${reason}`, updated_at: new Date().toISOString() })
        .eq("company_id", company.id).eq("access_key", accessKey);
      return json({ ok: true });
    }
    if (action !== "submit_xml") return json({ error: "action_invalid" }, 400);
    const xml = String(body.xml || "").trim();
    if (!xml.includes("<") || xml.length > 3_500_000 || xmlKey(xml) !== accessKey) return json({ error: "xml_invalid" }, 400);
    const parsed = parsedXml(xml);
    const now = new Date().toISOString();
    const dfePatch = {
      full_xml: true, xml, document_kind: "nfe", parse_error: null,
      issue_date: parsed.issue_date || undefined, value: parsed.value,
      note_number: parsed.note_number || undefined, series: parsed.series || undefined,
      issuer_cnpj: parsed.issuer_cnpj, issuer_name: parsed.issuer_name,
      source: "github_mtls_xml_recovery", updated_at: now,
    };
    const { error: dfeError } = await admin.from("fiscal_dfe_documents").update(dfePatch)
      .eq("company_id", company.id).eq("access_key", accessKey);
    if (dfeError) throw dfeError;
    if (kind === "sale") {
      const { error: salesDocumentError } = await admin.from("fiscal_sales_documents").update({
        xml, total_value: parsed.value, issue_date: parsed.issue_date || undefined,
        document_number: parsed.note_number || undefined, series: parsed.series || undefined,
        source: "github_mtls_xml_recovery", updated_at: now,
      }).eq("company_id", company.id).eq("access_key", accessKey);
      if (salesDocumentError) throw salesDocumentError;
      const { error: reconciliationError } = await admin.from("fiscal_sales_reconciliation").update({
        xml_status: "saved", xml_last_error: null, xml_last_checked_at: now, detail_status: "saved", detail_last_error: null, updated_at: now,
      }).eq("company_id", company.id).eq("access_key", accessKey);
      if (reconciliationError) throw reconciliationError;
    }
    return json({ ok: true, access_key: accessKey, value: parsed.value });
  } catch (error) {
    console.error("fiscal-github-xml-worker", error instanceof Error ? error.message : String(error));
    const message = error instanceof Error ? error.message : String(error);
    return json({ error: message.startsWith("oidc_") ? "unauthorized" : message }, message.startsWith("oidc_") ? 401 : 500);
  }
});
