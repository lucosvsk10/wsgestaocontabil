import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" },
});
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const monthBounds = () => {
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 3, 0, 0)).toISOString();
  const next = new Date(Date.UTC(year, month + 1, 1, 3, 0, 0)).toISOString();
  const previous = new Date(Date.UTC(year, month - 1, 1, 3, 0, 0)).toISOString();
  const today = `${year}-${String(month + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`;
  return { start, next, previous, today, startDay: `${year}-${String(month + 1).padStart(2, "0")}-01` };
};
const ageMinutes = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? Math.max(0, (Date.now() - Date.parse(value)) / 60000) : Infinity;
const emptyMetric = () => ({ count: 0, value: 0, full_xml: 0, pending_xml: 0, previous_count: 0, previous_value: 0, count_delta_percent: 0, value_delta_percent: 0, last_document_at: null as string | null });

async function authAdmin(admin: any, req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { error: json({ error: "Não autenticado" }, 401) };
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return { error: json({ error: "Não autenticado" }, 401) };
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  if (!role) return { error: json({ error: "Acesso exclusivo para administradores" }, 403) };
  return { user: data.user };
}
async function internalToken(admin: any) {
  const { data } = await admin.from("_fiscal_sales_debug_token").select("token").eq("id", true).maybeSingle();
  return String(data?.token || "");
}
async function internalCall(base: string, name: string, token: string, body: any, timeout = 90000) {
  const response = await fetch(`${base}/functions/v1/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-debug-token": token },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const payload = await response.json().catch(() => ({})) as any;
  return { ok: response.ok, status: response.status, payload };
}
async function loadRowsForKeys(admin: any, companyId: string, keys: string[]) {
  const rows: any[] = [];
  for (let index = 0; index < keys.length; index += 100) {
    const { data, error } = await admin.from("fiscal_dfe_documents")
      .select("id,access_key,issue_date,value,full_xml,xml,parse_error,direction,model,document_kind,source,updated_at")
      .eq("company_id", companyId)
      .in("access_key", keys.slice(index, index + 100));
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}
function keyStats(keys: string[], rows: any[]) {
  const byKey = new Map<string, any[]>();
  for (const row of rows) {
    const key = digits(row.access_key);
    if (!key) continue;
    const list = byKey.get(key) || [];
    list.push(row);
    byKey.set(key, list);
  }
  let xmlReady = 0;
  let requiresManifestation = 0;
  let manifestationSent = 0;
  let normalPending = 0;
  for (const key of keys) {
    const list = byKey.get(key) || [];
    if (list.some((row) => row.full_xml && row.xml)) {
      xmlReady += 1;
      continue;
    }
    if (list.some((row) => String(row.parse_error || "") === "xml_retry:manifestation_sent")) manifestationSent += 1;
    else if (list.some((row) => String(row.parse_error || "") === "xml_requires_manifestation")) requiresManifestation += 1;
    else normalPending += 1;
  }
  return { stored: [...byKey.keys()].filter((key) => keys.includes(key)).length, xmlReady, requiresManifestation, manifestationSent, normalPending };
}
async function currentNfseStats(admin: any, companyId: string, start: string, next: string) {
  const { data, error } = await admin.from("fiscal_dfe_documents")
    .select("access_key,full_xml,xml,issue_date,updated_at")
    .eq("company_id", companyId)
    .eq("direction", "entrada")
    .gte("issue_date", start)
    .lt("issue_date", next)
    .like("source", "national_nfse%")
    .neq("document_kind", "evento");
  if (error) throw error;
  const byKey = new Map<string, any[]>();
  for (const row of data || []) {
    const key = String(row.access_key || `row:${row.issue_date}:${row.updated_at}`);
    const list = byKey.get(key) || [];
    list.push(row);
    byKey.set(key, list);
  }
  return { count: byKey.size, xmlReady: [...byKey.values()].filter((list) => list.some((row) => row.full_xml && row.xml)).length };
}
async function salesVerification(admin: any, companyId: string, start: string, next: string, state: any) {
  const latest = Number(state?.latest_number || 0);
  const { data: allRecon, error: reconError } = await admin.from("fiscal_sales_reconciliation")
    .select("status,access_key,issue_date,note_number")
    .eq("company_id", companyId)
    .eq("model", "65")
    .eq("series", "1")
    .lte("note_number", latest || 999999999);
  if (reconError) throw reconError;
  const rows = allRecon || [];
  const counts: Record<string, number> = { found: 0, cancelled: 0, inutilized: 0, not_authorized: 0, not_found: 0, pending: 0, error: 0 };
  for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;
  const pendingSequence = Number(counts.pending || 0) + Number(counts.error || 0);
  const resolved = rows.length - pendingSequence;
  const sequenceComplete = latest > 0 && rows.length === latest && pendingSequence === 0;
  const staleState = Boolean(state && sequenceComplete && (!state.reconciliation_complete || Number(state.reconciliation_resolved || 0) !== resolved || state.status === "reconciling"));
  if (staleState) {
    await admin.from("fiscal_sales_sync_state").update({
      reconciliation_total: latest,
      reconciliation_resolved: resolved,
      reconciliation_found: counts.found || 0,
      reconciliation_cancelled: counts.cancelled || 0,
      reconciliation_inutilized: counts.inutilized || 0,
      reconciliation_not_authorized: counts.not_authorized || 0,
      reconciliation_missing: counts.not_found || 0,
      reconciliation_pending: 0,
      reconciliation_complete: true,
      reconciliation_completed_at: new Date().toISOString(),
      status: "idle",
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("company_id", companyId);
  }
  const monthFound = rows.filter((row) => row.status === "found" && row.issue_date && row.issue_date >= start && row.issue_date < next);
  const expectedKeys = [...new Set(monthFound.map((row) => digits(row.access_key)).filter((key) => key.length === 44))];
  const { data: salesDocs, error: salesError } = await admin.from("fiscal_sales_documents")
    .select("access_key,xml,issue_date,total_value,updated_at")
    .eq("company_id", companyId)
    .gte("issue_date", start)
    .lt("issue_date", next);
  if (salesError) throw salesError;
  const savedKeys = new Set((salesDocs || []).map((row) => digits(row.access_key)).filter(Boolean));
  const xmlKeys = new Set((salesDocs || []).filter((row) => row.xml).map((row) => digits(row.access_key)).filter(Boolean));
  return {
    expected: expectedKeys.length || (salesDocs || []).length,
    stored: expectedKeys.length ? expectedKeys.filter((key) => savedKeys.has(key)).length : (salesDocs || []).length,
    xml_ready: expectedKeys.length ? expectedKeys.filter((key) => xmlKeys.has(key)).length : (salesDocs || []).filter((row) => row.xml).length,
    pending_xml: expectedKeys.length ? expectedKeys.filter((key) => !xmlKeys.has(key)).length : (salesDocs || []).filter((row) => !row.xml).length,
    cancelled: rows.filter((row) => row.status === "cancelled" && row.issue_date && row.issue_date >= start && row.issue_date < next).length,
    sequence_total: latest || rows.length,
    sequence_resolved: resolved,
    sequence_complete: sequenceComplete,
    repaired_state: staleState,
  };
}
async function purchaseVerification(admin: any, base: string, token: string, company: any, hasStateCredentials: boolean, verify: boolean, bounds: ReturnType<typeof monthBounds>) {
  let source: any = null;
  let sourceError: string | null = null;
  let autoRepaired = 0;
  if (verify && String(company.uf || "").toUpperCase() === "AL" && hasStateCredentials && token) {
    try {
      const check = await internalCall(base, "fiscal-purchases-sefaz-al-report", token, { company_id: company.id, start: bounds.startDay, end: bounds.today, dry_run: true, include_keys: true });
      if (!check.ok || check.payload?.error) throw new Error(check.payload?.error || `HTTP ${check.status}`);
      source = check.payload;
      if (Number(source.purchase_existing_keys || 0) < Number(source.purchase_unique_keys || 0)) {
        const repair = await internalCall(base, "fiscal-purchases-sefaz-al-report", token, { company_id: company.id, start: bounds.startDay, end: bounds.today, dry_run: false, include_keys: true });
        if (repair.ok && !repair.payload?.error) {
          autoRepaired += Number(repair.payload?.inserted || 0);
          source = repair.payload;
        }
      }
    } catch (error) {
      sourceError = error instanceof Error ? error.message : String(error);
    }
  }
  let purchaseKeys: string[] = Array.isArray(source?.purchase_keys) ? source.purchase_keys.map(digits).filter((key: string) => key.length === 44) : [];
  if (!purchaseKeys.length) {
    const { data, error } = await admin.from("fiscal_dfe_documents")
      .select("access_key")
      .eq("company_id", company.id)
      .eq("direction", "entrada")
      .eq("model", "55")
      .neq("document_kind", "evento")
      .gte("issue_date", bounds.start)
      .lt("issue_date", bounds.next)
      .not("access_key", "is", null);
    if (error) throw error;
    purchaseKeys = [...new Set((data || []).map((row) => digits(row.access_key)).filter((key) => key.length === 44))];
  }
  let rows = purchaseKeys.length ? await loadRowsForKeys(admin, company.id, purchaseKeys) : [];
  let stats = keyStats(purchaseKeys, rows);
  if (verify && token && stats.normalPending > 0) {
    const pendingKeys = purchaseKeys.filter((key) => {
      const list = rows.filter((row) => digits(row.access_key) === key);
      return !list.some((row) => row.full_xml && row.xml) && !list.some((row) => ["xml_requires_manifestation", "xml_retry:manifestation_sent"].includes(String(row.parse_error || "")));
    }).slice(0, 3);
    for (const accessKey of pendingKeys) {
      try {
        const repair = await internalCall(base, "fiscal-purchases-xml-backfill", token, { company_id: company.id, access_key: accessKey, batch: 1 }, 70000);
        if (repair.ok && !repair.payload?.error) autoRepaired += Number(repair.payload?.companies?.[0]?.saved || 0);
      } catch {}
    }
    if (pendingKeys.length) {
      rows = await loadRowsForKeys(admin, company.id, purchaseKeys);
      stats = keyStats(purchaseKeys, rows);
    }
  }
  const nfse = await currentNfseStats(admin, company.id, bounds.start, bounds.next);
  const expectedNfe = source ? Number(source.purchase_unique_keys || 0) : null;
  return {
    source: source ? "SEFAZ/AL" : "Base fiscal",
    source_checked: Boolean(source),
    source_error: sourceError,
    expected_nfe: expectedNfe,
    stored_nfe: stats.stored,
    nfse_count: nfse.count,
    xml_ready: stats.xmlReady + nfse.xmlReady,
    xml_total: purchaseKeys.length + nfse.count,
    pending_xml: stats.normalPending + stats.requiresManifestation + stats.manifestationSent + Math.max(0, nfse.count - nfse.xmlReady),
    requires_manifestation: stats.requiresManifestation,
    manifestation_sent: stats.manifestationSent,
    missing_count: expectedNfe == null ? 0 : Math.max(0, expectedNfe - stats.stored),
    auto_repaired: autoRepaired,
  };
}
async function manifestAndRecover(admin: any, base: string, token: string, companyId: string, bounds: ReturnType<typeof monthBounds>) {
  const { data, error } = await admin.from("fiscal_dfe_documents")
    .select("access_key")
    .eq("company_id", companyId)
    .eq("direction", "entrada")
    .eq("model", "55")
    .eq("full_xml", false)
    .eq("parse_error", "xml_requires_manifestation")
    .gte("issue_date", bounds.start)
    .lt("issue_date", bounds.next)
    .not("access_key", "is", null);
  if (error) throw error;
  const keys = [...new Set((data || []).map((row) => digits(row.access_key)).filter((key) => key.length === 44))].slice(0, 5);
  const results: any[] = [];
  for (const accessKey of keys) {
    const event = await internalCall(base, "fiscal-purchases-manifest", token, { action: "event", confirm: true, company_id: companyId, access_key: accessKey }, 70000);
    let recovered = false;
    if (event.ok && (event.payload?.registered || event.payload?.already_complete || event.payload?.ok)) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const backfill = await internalCall(base, "fiscal-purchases-xml-backfill", token, { company_id: companyId, access_key: accessKey, batch: 1 }, 70000);
      recovered = Boolean(backfill.ok && Number(backfill.payload?.companies?.[0]?.saved || 0) > 0);
      results.push({ access_key: accessKey, event: event.payload, recovered, backfill: backfill.payload });
    } else results.push({ access_key: accessKey, event: event.payload, recovered: false });
  }
  return results;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const base = Deno.env.get("SUPABASE_URL");
  if (!service || !base) return json({ error: "Configuração ausente" }, 500);
  const admin = createClient(base, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const auth = await authAdmin(admin, req);
  if (auth.error) return auth.error;
  try {
    const body = await req.json().catch(() => ({})) as any;
    const action = String(body.action || "status");
    const verify = body.verify === true || action === "verify";
    const bounds = monthBounds();
    const token = await internalToken(admin);
    if (action === "repair_manifestation") {
      const companyId = String(body.company_id || "");
      if (!companyId) return json({ error: "company_id obrigatório" }, 400);
      const results = await manifestAndRecover(admin, base, token, companyId, bounds);
      return json({ ok: true, attempted: results.length, recovered: results.filter((item) => item.recovered).length, results });
    }

    const [officeResult, fiscalResult, certResult, credentialResult, purchaseStateResult, salesStateResult, healthResult] = await Promise.all([
      admin.from("companies").select("id,company_name,trade_name,cnpj").order("company_name"),
      admin.from("fiscal_companies").select("id,company_id,cnpj,razao_social,nome_fantasia,status,uf,last_sync_at").order("updated_at", { ascending: false }),
      admin.from("fiscal_certificates").select("company_id,valid_until,is_active,created_at").eq("is_active", true).order("created_at", { ascending: false }),
      admin.from("fiscal_state_credentials").select("company_id,uf,is_active,last_verified_at,last_verification_status").eq("is_active", true),
      admin.from("fiscal_purchase_sync_state").select("*"),
      admin.from("fiscal_sales_sync_state").select("*"),
      admin.from("fiscal_sync_health").select("*"),
    ]);
    for (const result of [officeResult, fiscalResult, certResult, credentialResult, purchaseStateResult, salesStateResult, healthResult]) if (result.error) throw result.error;
    const officeById = new Map((officeResult.data || []).map((row: any) => [String(row.id), row]));
    const certByCompany = new Map<string, any>();
    for (const row of certResult.data || []) if (!certByCompany.has(String(row.company_id))) certByCompany.set(String(row.company_id), row);
    const credentialByCompany = new Map((credentialResult.data || []).filter((row: any) => String(row.uf || "").toUpperCase() === "AL").map((row: any) => [String(row.company_id), row]));
    const purchaseByCompany = new Map((purchaseStateResult.data || []).map((row: any) => [String(row.company_id), row]));
    const salesByCompany = new Map((salesStateResult.data || []).map((row: any) => [String(row.company_id), row]));
    const healthByCompany = new Map((healthResult.data || []).map((row: any) => [String(row.company_id), row]));
    const monitoredFiscal = (fiscalResult.data || []).filter((fiscal: any) => String(fiscal.status || "").toLowerCase() === "ativa" && certByCompany.get(String(fiscal.id)) && (purchaseByCompany.has(String(fiscal.id)) || salesByCompany.has(String(fiscal.id))));

    const companies: any[] = [];
    for (const fiscal of monitoredFiscal) {
      const companyId = String(fiscal.id);
      const office = officeById.get(String(fiscal.company_id)) || { id: fiscal.company_id || companyId, company_name: fiscal.razao_social, trade_name: fiscal.nome_fantasia, cnpj: fiscal.cnpj };
      const cert = certByCompany.get(companyId);
      const purchaseState = purchaseByCompany.get(companyId) as any;
      let salesState = salesByCompany.get(companyId) as any;
      const oldHealth = healthByCompany.get(companyId) as any;
      const credential = credentialByCompany.get(companyId);
      const certExpired = Boolean(cert?.valid_until && Date.parse(`${cert.valid_until}T23:59:59Z`) < Date.now());
      const hasStateCredentials = String(fiscal.uf || "").toUpperCase() !== "AL" || Boolean(credential);
      let purchaseCheck: any;
      let salesCheck: any = null;
      try {
        purchaseCheck = await purchaseVerification(admin, base, token, fiscal, hasStateCredentials, verify, bounds);
      } catch (error) {
        purchaseCheck = { source: "Base fiscal", source_checked: false, source_error: error instanceof Error ? error.message : String(error), expected_nfe: null, stored_nfe: 0, nfse_count: 0, xml_ready: 0, xml_total: 0, pending_xml: 0, requires_manifestation: 0, manifestation_sent: 0, missing_count: 0, auto_repaired: 0 };
      }
      const salesEnabled = Boolean(salesState && hasStateCredentials && !String(salesState.status || "").startsWith("waiting_"));
      if (salesEnabled) {
        try {
          salesCheck = await salesVerification(admin, companyId, bounds.start, bounds.next, salesState);
          if (salesCheck.repaired_state) {
            const { data: refreshed } = await admin.from("fiscal_sales_sync_state").select("*").eq("company_id", companyId).maybeSingle();
            if (refreshed) salesState = refreshed;
          }
        } catch (error) {
          salesCheck = { expected: null, stored: 0, xml_ready: 0, pending_xml: 0, sequence_total: Number(salesState?.latest_number || 0), sequence_resolved: Number(salesState?.reconciliation_resolved || 0), sequence_complete: false, error: error instanceof Error ? error.message : String(error) };
        }
      }
      const purchaseExpected = purchaseCheck.expected_nfe;
      const purchaseCountOk = purchaseExpected == null || Number(purchaseCheck.stored_nfe) === Number(purchaseExpected);
      const purchaseXmlOk = Number(purchaseCheck.pending_xml || 0) === 0;
      const salesCountOk = !salesEnabled || (salesCheck && salesCheck.expected != null && Number(salesCheck.stored) === Number(salesCheck.expected));
      const salesXmlOk = !salesEnabled || Number(salesCheck?.pending_xml || 0) === 0;
      const sourceUnavailable = verify && hasStateCredentials && Boolean(purchaseCheck.source_error);
      const autoRepairing = Number(purchaseCheck.auto_repaired || 0) > 0 || Number(purchaseCheck.manifestation_sent || 0) > 0;
      const needsManifestation = Number(purchaseCheck.requires_manifestation || 0) > 0;
      const countMismatch = !purchaseCountOk || !salesCountOk;
      const xmlMismatch = !purchaseXmlOk || !salesXmlOk;
      const repeatedPurchaseFailure = Number(purchaseState?.consecutive_failures || 0) >= 3 && (countMismatch || xmlMismatch);
      const repeatedSalesFailure = Boolean(salesState?.last_error) && Number(oldHealth?.sales_failure_count || 0) >= 3 && (countMismatch || xmlMismatch);
      let state: "healthy" | "attention" | "error" = "healthy";
      let stateLabel = "Tudo certo";
      let stateDetail = "As quantidades conferem e os documentos disponíveis estão íntegros.";
      let reasonCode = "VERIFIED_OK";
      if (certExpired) {
        state = "error"; stateLabel = "Certificado vencido"; stateDetail = "A extração parou porque o certificado A1 venceu."; reasonCode = "CERTIFICATE_EXPIRED";
      } else if (repeatedPurchaseFailure || repeatedSalesFailure) {
        state = "error"; stateLabel = "Falha persistente"; stateDetail = "O sistema tentou corrigir automaticamente, mas a divergência continua."; reasonCode = "PERSISTENT_FAILURE";
      } else if (needsManifestation) {
        state = "attention"; stateLabel = "Ação necessária"; stateDetail = `${purchaseCheck.requires_manifestation} nota(s) de compra precisam de manifestação para a SEFAZ liberar o XML.`; reasonCode = "MANIFESTATION_REQUIRED";
      } else if (countMismatch || xmlMismatch || autoRepairing) {
        state = "attention"; stateLabel = autoRepairing ? "Corrigindo automaticamente" : "Conferência pendente"; stateDetail = countMismatch ? "A quantidade encontrada na fonte ainda não bate com a quantidade salva." : "Há documento(s) sem XML integral e o sistema está tentando recuperar."; reasonCode = countMismatch ? "COUNT_MISMATCH" : "XML_PENDING";
      } else if (sourceUnavailable) {
        state = "attention"; stateLabel = "Fonte indisponível agora"; stateDetail = "Os dados locais estão consistentes, mas a conferência ao vivo com a fonte fiscal não respondeu nesta tentativa."; reasonCode = "SOURCE_UNAVAILABLE";
      }
      if (state === "healthy" && oldHealth && (Number(oldHealth.sales_failure_count || 0) > 0 || oldHealth.sales_xml_stall_since || oldHealth.sales_reconciliation_stall_since)) {
        await admin.from("fiscal_sync_health").update({ sales_status: salesEnabled ? "healthy" : oldHealth.sales_status, sales_failure_count: salesEnabled ? 0 : oldHealth.sales_failure_count, sales_xml_stall_since: salesEnabled ? null : oldHealth.sales_xml_stall_since, sales_reconciliation_stall_since: salesEnabled ? null : oldHealth.sales_reconciliation_stall_since, sales_detail_stall_since: salesEnabled ? null : oldHealth.sales_detail_stall_since, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("company_id", companyId);
      }
      const purchaseMetric = emptyMetric();
      purchaseMetric.count = Number(purchaseCheck.expected_nfe ?? purchaseCheck.stored_nfe) + Number(purchaseCheck.nfse_count || 0);
      purchaseMetric.full_xml = Number(purchaseCheck.xml_ready || 0);
      purchaseMetric.pending_xml = Number(purchaseCheck.pending_xml || 0);
      purchaseMetric.last_document_at = purchaseState?.last_completed_at || null;
      const salesMetric = emptyMetric();
      salesMetric.count = Number(salesCheck?.expected ?? salesCheck?.stored ?? 0);
      salesMetric.full_xml = Number(salesCheck?.xml_ready || 0);
      salesMetric.pending_xml = Number(salesCheck?.pending_xml || 0);
      salesMetric.last_document_at = salesState?.updated_at || null;
      const purchaseFresh = purchaseState ? ageMinutes(purchaseState.last_completed_at || purchaseState.updated_at) <= 240 : false;
      const salesFresh = !salesEnabled || ageMinutes(salesState?.last_completed_at || salesState?.updated_at) <= 360;
      companies.push({
        office_company_id: String(office.id || fiscal.company_id || companyId), fiscal_company_id: companyId, company_name: office.company_name || fiscal.razao_social, trade_name: office.trade_name || fiscal.nome_fantasia || null, cnpj: office.cnpj || fiscal.cnpj || null, uf: fiscal.uf || null,
        state, state_label: stateLabel, state_detail: stateDetail, reason_code: reasonCode, capture_enabled: true, can_start: false, certificate_status: certExpired ? "expired" : "valid", certificate_valid_until: cert?.valid_until || null, has_state_credentials: hasStateCredentials, last_checked_at: new Date().toISOString(),
        purchase: purchaseState ? { status: purchaseState.status || null, label: purchaseCheck.source_checked && purchaseCountOk ? "Quantidade conferida" : purchaseFresh && !purchaseState.last_error ? "Em dia" : "Verificando", last_started_at: purchaseState.last_started_at || null, last_completed_at: purchaseState.last_completed_at || purchaseState.updated_at || null, last_failed_at: purchaseState.last_failed_at || null, next_scheduled_at: purchaseState.next_scheduled_at || null, last_error: purchaseState.last_error || null, error_scope: null, failure_count: Number(purchaseState.consecutive_failures || 0), fresh: purchaseFresh, paused: Boolean(purchaseState.paused), last_status_code: purchaseState.last_status_code || null, last_status_message: purchaseState.last_status_message || null } : null,
        sales: salesState ? { status: salesState.status || null, label: !salesEnabled ? "Não configurada" : salesCountOk && salesXmlOk ? "Quantidade conferida" : "Verificando", last_started_at: salesState.last_started_at || null, last_completed_at: salesState.last_completed_at || salesState.updated_at || null, next_scheduled_at: salesState.next_scheduled_at || null, last_error: salesState.last_error || null, error_scope: null, failure_count: 0, fresh: salesFresh, paused: Boolean(salesState.paused), latest_number: salesState.latest_number ?? null, cursor_number: salesState.cursor_number ?? null, reconciliation_total: salesCheck?.sequence_total ?? salesState.reconciliation_total ?? null, reconciliation_resolved: salesCheck?.sequence_resolved ?? salesState.reconciliation_resolved ?? null, reconciliation_pending: salesCheck?.sequence_complete ? 0 : salesState.reconciliation_pending ?? null, xml_expected: salesCheck?.expected ?? null, xml_saved: salesCheck?.xml_ready ?? null, xml_pending: salesCheck?.pending_xml ?? null, detail_expected: salesState.detail_expected ?? null, detail_saved: salesState.detail_saved ?? null, detail_pending: salesState.detail_pending ?? null } : null,
        metrics: { period_days: 30, period_start: bounds.start, period_end: bounds.next, previous_start: bounds.previous, purchases: purchaseMetric, sales: salesMetric },
        technical_window: { purchases: purchaseCheck.source_checked ? `Conferência atual pela SEFAZ/AL · ${purchaseCheck.expected_nfe ?? 0} NF-e de terceiros na fonte` : "Conferência pela rotina fiscal e documentos já capturados", sales: salesEnabled ? `Sequência fiscal ${salesCheck?.sequence_resolved ?? 0}/${salesCheck?.sequence_total ?? 0}` : "Busca de vendas não configurada para esta empresa" },
        timeline: [],
        verification: { checked_at: new Date().toISOString(), live: verify, status: state === "healthy" ? "ok" : state === "error" ? "error" : autoRepairing ? "repairing" : "attention", purchases: { ...purchaseCheck, message: needsManifestation ? `${purchaseCheck.requires_manifestation} XML aguardam manifestação.` : purchaseCountOk && purchaseXmlOk ? "Quantidade e XML conferidos." : "O sistema identificou uma diferença e iniciou a correção." }, sales: salesEnabled ? { ...salesCheck, enabled: true, message: salesCountOk && salesXmlOk ? "Quantidade e XML conferidos." : "A conferência encontrou uma diferença." } : { enabled: false, expected: null, stored: 0, xml_ready: 0, pending_xml: 0, sequence_total: 0, sequence_resolved: 0, message: "A extração de vendas não está configurada para esta empresa." } },
      });
    }
    const summary = { total: companies.length, monitored: companies.length, healthy: companies.filter((row) => row.state === "healthy").length, ready: 0, attention: companies.filter((row) => row.state === "attention").length, error: companies.filter((row) => row.state === "error").length, neutral: 0 };
    return json({ ok: true, generated_at: new Date().toISOString(), period_days: 30, summary, cadence: { purchases_minutes: 10, sales_hours: 3, watchdog_minutes: 10, xml_backfill_minutes: 1 }, company_health: companies });
  } catch (error) {
    console.error("admin-fiscal-health-v2", error);
    return json({ error: error instanceof Error ? error.message : "Não foi possível conferir a saúde fiscal" }, 500);
  }
});
