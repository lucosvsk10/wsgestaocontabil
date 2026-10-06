import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { createRemoteJWKSet, jwtVerify } from "npm:jose@5.9.6";

const PRIORITY_CNPJS = new Set(["29880800000126", "32137785000135"]);
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

async function gunzip(value: string) {
  const compressed = bytes(value.replace(/\s/g, ""));
  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream("gzip"));
  return await new Response(stream).text();
}

function attr(value: string, name: string) {
  return value.match(new RegExp(`\\b${name}=["']([^"']+)["']`, "i"))?.[1] || "";
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
    if (action === "targets") {
      const [{ data: extractorLinks, error: linkError }, { data: certificates, error: certificateError }] = await Promise.all([
        admin.from("extractor_companies").select("fiscal_company_id").eq("status", "active"),
        admin.from("fiscal_certificates").select("company_id").eq("is_active", true),
      ]);
      if (linkError || certificateError) throw linkError || certificateError;
      const linked = new Set((extractorLinks || []).map(row => String(row.fiscal_company_id || "")));
      const certified = new Set((certificates || []).map(row => String(row.company_id || "")));
      const ids = [...linked].filter(id => certified.has(id));
      if (!ids.length) return json({ ok: true, companies: [] });
      const { data: companies, error: companiesError } = await admin.from("fiscal_companies")
        .select("id,cnpj,razao_social,uf").in("id", ids).eq("status", "ativa");
      if (companiesError) throw companiesError;
      const items = (companies || []).map(row => ({
        cnpj: digits(row.cnpj), name: row.razao_social, uf: row.uf,
        priority: PRIORITY_CNPJS.has(digits(row.cnpj)) ? 0 : 1,
      })).filter(row => row.cnpj.length === 14).sort((a, b) => a.priority - b.priority || a.name.localeCompare(b.name));
      return json({ ok: true, companies: items });
    }
    const cnpj = digits(body.cnpj);
    if (cnpj.length !== 14) return json({ error: "company_invalid" }, 400);
    const { data: company, error: companyError } = await admin.from("fiscal_companies")
      .select("id,cnpj,razao_social,status,created_by,uf,ambiente_padrao")
      .eq("cnpj", cnpj).eq("status", "ativa").maybeSingle();
    if (companyError || !company) throw companyError || new Error("company_missing");
    const { data: extractorLink } = await admin.from("extractor_companies").select("fiscal_company_id")
      .eq("fiscal_company_id", company.id).eq("status", "active").maybeSingle();
    if (!extractorLink) return json({ error: "company_not_allowed" }, 403);

    if (action === "lease") {
      const { data: certificate, error: certificateError } = await admin.from("fiscal_certificates")
        .select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,valid_until")
        .eq("company_id", company.id).eq("is_active", true)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      if (certificateError || !certificate) throw certificateError || new Error("certificate_missing");
      const limit = Math.min(60, Math.max(1, Number(body.limit || 30)));
      const [{ data: sales, error: salesError }, { data: purchases, error: purchaseError }, { data: syncState }] = await Promise.all([
        admin.from("fiscal_sales_reconciliation")
          .select("access_key,model,series,note_number,status,xml_status,xml_attempts")
          .eq("company_id", company.id).in("status", ["found", "cancelled"])
          .neq("xml_status", "saved").not("access_key", "is", null)
          .order("xml_attempts", { ascending: true }).order("note_number", { ascending: false }).limit(limit),
        admin.from("fiscal_dfe_documents")
          .select("id,access_key,model,note_number,series,issue_date,parse_error")
          .eq("company_id", company.id).eq("direction", "entrada").eq("model", "55")
          .eq("full_xml", false).not("access_key", "is", null)
          .order("issue_date", { ascending: false }).limit(limit),
        admin.from("fiscal_dfe_sync_state").select("ult_nsu,max_nsu,last_synced_at")
          .eq("user_id", company.created_by).eq("cnpj", cnpj)
          .eq("environment", company.ambiente_padrao === "homologacao" ? "homologacao" : "producao")
          .eq("uf_code", String(company.uf || "AL").toUpperCase() === "SP" ? "35" : "27").maybeSingle(),
      ]);
      if (salesError || purchaseError) throw salesError || purchaseError;
      const tasks = [
        ...(sales || []).filter(row => digits(row.access_key).length === 44).map(row => ({
          kind: "sale", access_key: digits(row.access_key), model: String(row.model || "55"),
          series: String(row.series || "1"), note_number: Number(row.note_number || 0), xml_attempts: Number(row.xml_attempts || 0),
        })),
        ...(purchases || []).filter(row => digits(row.access_key).length === 44).map(row => ({
          kind: "purchase", id: row.id, access_key: digits(row.access_key), model: "55",
          series: String(row.series || "1"), note_number: Number(row.note_number || 0),
        })),
      ].slice(0, limit);
      return json({
        ok: true,
        company: { id: company.id, cnpj, name: company.razao_social },
        distribution: {
          uf_code: String(company.uf || "AL").toUpperCase() === "SP" ? "35" : "27",
          environment: company.ambiente_padrao === "homologacao" ? "homologacao" : "producao",
          ult_nsu: String(syncState?.ult_nsu || "0").replace(/\D/g, "").padStart(15, "0"),
          due: !syncState?.last_synced_at ||
            digits(syncState?.ult_nsu) < digits(syncState?.max_nsu) ||
            Date.now() - new Date(syncState.last_synced_at).getTime() >= 55 * 60_000,
        },
        certificate_base64: await decrypt(certificate.certificate_ciphertext, certificate.certificate_iv),
        certificate_password: await decrypt(certificate.password_ciphertext, certificate.password_iv),
        tasks,
      });
    }

    if (action === "submit_distribution") {
      const raw = String(body.raw_xml || "");
      if (!raw.includes("distDFeInt") && !raw.includes("retDistDFeInt")) return json({ error: "distribution_invalid" }, 400);
      const now = new Date().toISOString();
      const environment = company.ambiente_padrao === "homologacao" ? "homologacao" : "producao";
      const ufCode = String(company.uf || "AL").toUpperCase() === "SP" ? "35" : "27";
      let documents = 0, events = 0;
      const expression = /<docZip\b([^>]*)>([\s\S]*?)<\/docZip>/gi;
      let match: RegExpExecArray | null;
      while ((match = expression.exec(raw))) {
        const nsu = attr(match[1], "NSU");
        const schema = attr(match[1], "schema");
        let xml = "";
        try { xml = await gunzip(match[2]); } catch { continue; }
        const accessKey = digits(tag(xml, "chNFe") || xml.match(/\bId=["']NFe(\d{44})["']/i)?.[1] || "");
        if (accessKey.length !== 44) continue;
        if (/evento/i.test(schema) || /<\/?(?:\w+:)?(?:procEventoNFe|evento)/i.test(xml)) {
          const eventType = tag(xml, "tpEvento") || "";
          const eventAt = tag(xml, "dhRegEvento") || tag(xml, "dhEvento") || now;
          await admin.from("fiscal_dfe_events").upsert({
            user_id: company.created_by, company_id: company.id, cnpj, environment, uf_code: ufCode,
            nsu, schema_name: schema, access_key: accessKey, event_type: eventType,
            event_description: tag(xml, "xEvento"), status_code: tag(xml, "cStat"), event_at: eventAt,
            xml, source: "github_national_distribution", updated_at: now,
          }, { onConflict: "user_id,cnpj,environment,uf_code,nsu" });
          if (accessKey.slice(6, 20) === cnpj) {
            const model = accessKey.slice(20, 22), series = String(Number(accessKey.slice(22, 25))), note = Number(accessKey.slice(25, 34));
            const cancelled = eventType === "110111";
            await admin.from("fiscal_sales_documents").upsert({
              company_id: company.id, uf: String(company.uf || ""), model, access_key: accessKey,
              document_number: String(note), series, issue_date: eventAt, status: cancelled ? "Cancelada" : "Referenciada por evento oficial",
              source: "github_national_dfe_issuer_event", source_reference: { event_nsu: nsu, event_type: eventType, xml_pending: true }, updated_at: now,
            }, { onConflict: "company_id,access_key" });
            await admin.from("fiscal_sales_reconciliation").upsert({
              company_id: company.id, model, series, note_number: note, status: cancelled ? "cancelled" : "found",
              access_key: accessKey, issue_date: eventAt, month_code: accessKey.slice(2, 6),
              cstat: cancelled ? "101" : "100", xmotivo: cancelled ? "Cancelamento confirmado por evento oficial" : "Chave confirmada por evento oficial",
              resolved_at: now, updated_at: now, xml_status: "pending",
            }, { onConflict: "company_id,model,series,note_number" });
          }
          events += 1;
          continue;
        }
        const issuer = digits(tag(xml, "CNPJ") || accessKey.slice(6, 20));
        const direction = issuer === cnpj ? "saida" : "entrada";
        const full = /<(?:\w+:)?NFe\b/i.test(xml);
        const parsed = parsedXml(xml);
        await admin.from("fiscal_dfe_documents").upsert({
          user_id: company.created_by, company_id: company.id, cnpj, environment, uf_code: ufCode, nsu,
          source: "github_national_distribution", source_id: nsu, schema_name: schema,
          document_kind: full ? "nfe" : "resumo", direction, access_key: accessKey,
          model: accessKey.slice(20, 22), issue_date: parsed.issue_date, value: parsed.value,
          issuer_cnpj: issuer, issuer_name: parsed.issuer_name,
          note_number: String(Number(accessKey.slice(25, 34))), series: String(Number(accessKey.slice(22, 25))),
          status_code: tag(xml, "cSitNFe") || tag(xml, "cStat"), full_xml: full, xml, updated_at: now,
        }, { onConflict: "user_id,cnpj,environment,uf_code,nsu" });
        documents += 1;
      }
      const ultNsu = digits(tag(raw, "ultNSU") || body.ult_nsu || "0").padStart(15, "0");
      const maxNsu = digits(tag(raw, "maxNSU") || ultNsu).padStart(15, "0");
      await admin.from("fiscal_dfe_sync_state").upsert({
        user_id: company.created_by, cnpj, environment, uf_code: ufCode, ult_nsu: ultNsu, max_nsu: maxNsu,
        last_status_code: tag(raw, "cStat"), last_status_message: tag(raw, "xMotivo"), last_synced_at: now, updated_at: now,
      }, { onConflict: "user_id,cnpj,environment,uf_code" });
      await admin.from("fiscal_purchase_sync_state").upsert({
        company_id: company.id, status: "idle", consecutive_failures: 0, last_error: null,
        last_completed_at: now, next_scheduled_at: new Date(Date.now() + 30 * 60_000).toISOString(), updated_at: now,
      });
      const { data: reconciliation } = await admin.from("fiscal_sales_reconciliation")
        .select("note_number,status,xml_status").eq("company_id", company.id).limit(10000);
      const rows = reconciliation || [];
      const resolved = rows.filter(row => row.status !== "pending").length;
      const found = rows.filter(row => row.status === "found").length;
      const missing = rows.filter(row => row.status === "missing").length;
      const cancelled = rows.filter(row => row.status === "cancelled").length;
      const inutilized = rows.filter(row => row.status === "inutilized").length;
      const pending = rows.filter(row => row.status === "pending").length;
      const xmlRows = rows.filter(row => row.status === "found" || row.status === "cancelled");
      const xmlSaved = xmlRows.filter(row => row.xml_status === "saved").length;
      await admin.from("fiscal_sales_sync_state").upsert({
        company_id: company.id, status: pending ? "running" : "idle", last_error: null,
        latest_number: Math.max(0, ...rows.map(row => Number(row.note_number || 0))),
        cursor_number: Math.max(0, ...rows.map(row => Number(row.note_number || 0))),
        reconciliation_total: rows.length, reconciliation_resolved: resolved,
        reconciliation_found: found, reconciliation_missing: missing,
        reconciliation_cancelled: cancelled, reconciliation_inutilized: inutilized,
        reconciliation_pending: pending, reconciliation_complete: rows.length > 0 && pending === 0,
        xml_expected: xmlRows.length, xml_saved: xmlSaved, xml_pending: xmlRows.length - xmlSaved,
        xml_complete: xmlRows.length > 0 && xmlSaved === xmlRows.length,
        last_completed_at: now, next_scheduled_at: new Date(Date.now() + 30 * 60_000).toISOString(), updated_at: now,
      });
      return json({ ok: true, documents, events, ult_nsu: ultNsu, max_nsu: maxNsu });
    }

    const kind = body.kind === "purchase" ? "purchase" : "sale";
    const accessKey = digits(body.access_key);
    if (accessKey.length !== 44) return json({ error: "access_key_invalid" }, 400);
    if (kind === "sale" && accessKey.slice(6, 20) !== cnpj) return json({ error: "access_key_mismatch" }, 400);
    const ownershipQuery = kind === "sale"
      ? admin.from("fiscal_sales_reconciliation").select("access_key").eq("company_id", company.id).eq("access_key", accessKey).limit(1).maybeSingle()
      : admin.from("fiscal_dfe_documents").select("access_key").eq("company_id", company.id).eq("access_key", accessKey).limit(1).maybeSingle();
    const { data: ownedTask, error: ownershipError } = await ownershipQuery;
    if (ownershipError) throw ownershipError;
    if (!ownedTask) return json({ error: "task_not_owned_by_company" }, 400);
    if (action === "submit_error") {
      const reason = String(body.error || "xml_download_failed").slice(0, 300);
      if (kind === "sale") await admin.from("fiscal_sales_reconciliation").update({
        xml_status: "retrying", xml_attempts: Number(body.xml_attempts || 0) + 1,
        xml_last_error: reason, xml_last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString(),
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
        xml_status: "saved", xml_attempts: Number(body.xml_attempts || 0) + 1,
        xml_last_error: null, xml_last_checked_at: now, detail_status: "saved", detail_last_error: null, updated_at: now,
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
