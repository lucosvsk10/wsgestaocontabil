import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import * as XLSX from "https://esm.sh/xlsx@0.18.5";

const E = new TextEncoder();
const D = new TextDecoder();
const B = (value: string) => Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});

async function vaultKey() {
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("vault_secret_missing");
  const hash = await crypto.subtle.digest("SHA-256", E.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, ["decrypt"]);
}
async function decrypt(ciphertext: string, iv: string) {
  return D.decode(await crypto.subtle.decrypt({ name: "AES-GCM", iv: B(iv) }, await vaultKey(), B(ciphertext)));
}
function iso(value: any) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  if (typeof value === "number" && Number.isFinite(value)) {
    const p = XLSX.SSF.parse_date_code(value);
    if (p) return `${p.y}-${String(p.m).padStart(2, "0")}-${String(p.d).padStart(2, "0")}T${String(p.H || 0).padStart(2, "0")}:${String(p.M || 0).padStart(2, "0")}:${String(Math.floor(p.S || 0)).padStart(2, "0")}-03:00`;
  }
  const text = String(value || "").trim();
  const match = text.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
  if (!match) return null;
  return `${match[3]}-${match[2]}-${match[1]}T${match[4] || "00"}:${match[5] || "00"}:${match[6] || "00"}-03:00`;
}
function money(value: any) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const text = String(value ?? "0").trim().replace(/\s/g, "");
  if (!text) return 0;
  if (/^[-+]?\d+(?:\.\d+)?$/.test(text)) return Number(text);
  if (text.includes(",")) return Number(text.replace(/\./g, "").replace(",", "."));
  return Number(text);
}
const localToday = () => {
  const now = new Date(Date.now() - 3 * 60 * 60 * 1000);
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`;
};
async function fetchReport(gatewayToken: string, username: string, password: string, cnpj: string, start: string, end: string) {
  const response = await fetch("https://ws-nfse-sefin-probe.vercel.app/api/sefaz-al-entry-report", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${gatewayToken}` },
    body: JSON.stringify({ username, password, cnpj, start, end }),
    signal: AbortSignal.timeout(90000),
  });
  const payload = await response.json().catch(() => ({})) as any;
  if (!response.ok || !payload?.ok || !payload?.xlsx_base64) {
    throw new Error(`sefaz_report_gateway_${response.status}:${String(payload?.error || "invalid_response").slice(0, 180)}`);
  }
  return B(String(payload.xlsx_base64));
}

Deno.serve(async (req) => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const { data: internalToken } = await admin.from("_fiscal_sales_debug_token").select("token").eq("id", true).maybeSingle();
    if (!internalToken?.token || req.headers.get("x-debug-token") !== String(internalToken.token)) return json({ error: "unauthorized" }, 403);

    const body = await req.json().catch(() => ({})) as any;
    const companyId = String(body.company_id || "");
    if (!companyId) return json({ error: "company_id_required" }, 400);

    const now = new Date();
    const { data: company, error: companyError } = await admin
      .from("fiscal_companies")
      .select("cnpj,created_by,ambiente_padrao,uf,fiscal_settings")
      .eq("id", companyId)
      .single();
    if (companyError) throw companyError;

    const settings = (company.fiscal_settings || {}) as any;
    const [{ data: extractorLink }, { data: minimumHistory }, { data: extractorToday }] = await Promise.all([
      admin.from("extractor_companies")
        .select("id")
        .eq("fiscal_company_id", companyId)
        .eq("status", "active")
        .limit(1)
        .maybeSingle(),
      admin.rpc("extractor_minimum_history_start"),
      admin.rpc("extractor_local_date"),
    ]);
    const isExtractor = Boolean(extractorLink?.id);
    const standardStart = /^\d{4}-\d{2}-\d{2}$/.test(String(minimumHistory || ""))
      ? String(minimumHistory)
      : (() => {
          const local = new Date(Date.now() - 3 * 60 * 60 * 1000);
          return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1)).toISOString().slice(0, 10);
        })();
    const today = /^\d{4}-\d{2}-\d{2}$/.test(String(extractorToday || ""))
      ? String(extractorToday)
      : localToday();
    const legacyConfiguredStart = String(
      settings.history_window_mode === "previous_full_month_plus_current"
        ? settings.history_start_date || ""
        : ""
    );
    const configuredStart = isExtractor ? standardStart : legacyConfiguredStart;
    const defaultStart = isExtractor
      ? standardStart
      : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
    let start = String(body.start || defaultStart);
    let end = String(body.end || today);
    if (configuredStart && /^\d{4}-\d{2}-\d{2}$/.test(configuredStart) && start < configuredStart) {
      start = configuredStart;
    }
    if (end > today) end = today;
    if (start > end) {
      return json({
        error: "period_outside_company_history_window",
        start,
        end,
        configured_start: configuredStart || null,
      }, 422);
    }

    const dryRun = Boolean(body.dry_run);
    const includeKeys = Boolean(body.include_keys);
    const { data: credential, error: credentialError } = await admin
      .from("fiscal_state_credentials")
      .select("username_ciphertext,username_iv,password_ciphertext,password_iv")
      .eq("company_id", companyId)
      .eq("uf", "AL")
      .eq("is_active", true)
      .limit(1)
      .single();
    if (credentialError) throw credentialError;

    const { data: gatewayRow } = await admin.from("_fiscal_vercel_gateway_token").select("token").eq("id", true).maybeSingle();
    const gatewayToken = String(gatewayRow?.token || "");
    if (!gatewayToken) throw new Error("gateway_token_missing");

    const username = await decrypt(credential.username_ciphertext, credential.username_iv);
    const password = await decrypt(credential.password_ciphertext, credential.password_iv);
    const companyCnpj = digits(company.cnpj);
    const bytes = await fetchReport(gatewayToken, username, password, companyCnpj, start, end);
    const workbook = XLSX.read(bytes, { type: "array", cellDates: false });
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const textRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: false }) as any[][];
    const rawRows = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "", raw: true }) as any[][];
    const headerIndex = textRows.findIndex((row) => String(row?.[0] || "").trim() === "Emissão" && String(row?.[16] || "").includes("Chave"));
    if (headerIndex < 0) throw new Error("report_header_not_found");

    const environment = company.ambiente_padrao === "homologacao" ? "homologacao" : "producao";
    const parsed: any[] = [];
    for (let index = headerIndex + 1; index < textRows.length; index += 1) {
      const row = textRows[index];
      const raw = rawRows[index] || [];
      const accessKey = digits(row?.[16] || raw?.[16]);
      if (accessKey.length !== 44) continue;
      const issueDate = iso(raw?.[0] !== "" ? raw?.[0] : row?.[0]);
      if (configuredStart && issueDate && issueDate.slice(0, 10) < configuredStart) continue;
      const seriesNumber = String(row?.[15] || "").split("/").map((part: string) => part.trim());
      const issuerCnpj = digits(row?.[5] || raw?.[5]);
      const statusText = String(row?.[21] || "").trim();
      const active = /ativa/i.test(statusText);
      const cancelled = /cancel/i.test(statusText);
      const value = money(raw?.[23] !== "" ? raw?.[23] : row?.[23]);
      const direction = issuerCnpj && issuerCnpj === companyCnpj ? "saida" : "entrada";
      parsed.push({
        user_id: company.created_by,
        company_id: companyId,
        cnpj: companyCnpj,
        environment,
        uf_code: "27",
        nsu: `alr:${accessKey}`,
        source: "sefaz_al_entry_report_vercel",
        source_id: accessKey,
        schema_name: "sefaz-al-entry-report",
        document_kind: "nfe",
        direction,
        access_key: accessKey,
        model: accessKey.slice(20, 22) || "55",
        issue_date: issueDate,
        value: Number.isFinite(value) ? value : 0,
        issuer_cnpj: issuerCnpj || null,
        issuer_name: String(row?.[13] || "").trim() || null,
        recipient_cnpj: companyCnpj,
        note_number: seriesNumber[1] || null,
        series: seriesNumber[0] || null,
        status_code: cancelled ? "101" : active ? "100" : null,
        status_text: statusText || null,
        full_xml: false,
        xml: null,
        parse_error: "metadata_from_sefaz_al_entry_report",
        updated_at: new Date().toISOString(),
      });
    }

    const keys = [...new Set(parsed.map((row) => row.access_key))];
    const purchaseKeys = [...new Set(parsed.filter((row) => row.direction === "entrada" && row.status_code !== "101").map((row) => row.access_key))];
    const selfIssuedKeys = [...new Set(parsed.filter((row) => row.direction === "saida").map((row) => row.access_key))];
    const existing = new Map<string, any[]>();
    for (let index = 0; index < keys.length; index += 100) {
      const { data: rows } = await admin
        .from("fiscal_dfe_documents")
        .select("id,access_key,source,full_xml,xml,direction")
        .eq("company_id", companyId)
        .in("access_key", keys.slice(index, index + 100));
      for (const row of rows || []) {
        if (!row.access_key) continue;
        const list = existing.get(row.access_key) || [];
        list.push(row);
        existing.set(row.access_key, list);
      }
    }

    let inserted = 0;
    let updated = 0;
    let duplicatesTouched = 0;
    if (!dryRun) {
      for (const sourceRow of parsed) {
        const found = existing.get(sourceRow.access_key) || [];
        if (!found.length) {
          const { error } = await admin.from("fiscal_dfe_documents").insert(sourceRow);
          if (error) throw error;
          inserted += 1;
          continue;
        }
        for (const row of found) {
          const patch = {
            issue_date: sourceRow.issue_date,
            value: sourceRow.value,
            issuer_cnpj: sourceRow.issuer_cnpj,
            issuer_name: sourceRow.issuer_name,
            recipient_cnpj: sourceRow.recipient_cnpj,
            note_number: sourceRow.note_number,
            series: sourceRow.series,
            model: sourceRow.model,
            direction: sourceRow.direction,
            status_code: sourceRow.status_code,
            status_text: sourceRow.status_text,
            updated_at: new Date().toISOString(),
          };
          const { error } = await admin.from("fiscal_dfe_documents").update(patch).eq("id", row.id);
          if (error) throw error;
          updated += 1;
        }
        duplicatesTouched += Math.max(0, found.length - 1);
      }
      if (configuredStart && start === configuredStart && end >= localToday()) {
        await admin.from("fiscal_companies").update({
          fiscal_settings: { ...settings, purchase_history_bootstrap_complete: true, purchase_history_bootstrap_completed_at: new Date().toISOString() },
          updated_at: new Date().toISOString(),
        }).eq("id", companyId);
      }
    }

    const purchaseExistingKeys = purchaseKeys.filter((key) => existing.has(key)).length + (dryRun ? 0 : inserted);
    const byStatus: Record<string, number> = {};
    const byModel: Record<string, number> = {};
    for (const row of parsed) {
      byStatus[row.status_text || "Sem situação"] = (byStatus[row.status_text || "Sem situação"] || 0) + 1;
      byModel[row.model || "?"] = (byModel[row.model || "?"] || 0) + 1;
    }

    return json({
      ok: true,
      start,
      end,
      configured_start: configuredStart || null,
      total_report: parsed.length,
      unique_keys: keys.length,
      purchase_unique_keys: purchaseKeys.length,
      purchase_existing_keys: Math.min(purchaseKeys.length, purchaseExistingKeys),
      self_issued_unique_keys: selfIssuedKeys.length,
      existing_keys: existing.size,
      inserted,
      updated,
      duplicates_touched: duplicatesTouched,
      by_status: byStatus,
      by_model: byModel,
      ...(includeKeys ? { purchase_keys: purchaseKeys } : {}),
      transport: "vercel-node",
    });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
