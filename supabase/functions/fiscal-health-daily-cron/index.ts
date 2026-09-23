import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json", "cache-control": "no-store" },
});
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const bounds = () => {
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1, 3, 0, 0)).toISOString(),
    next: new Date(Date.UTC(year, month + 1, 1, 3, 0, 0)).toISOString(),
    startDay: `${year}-${String(month + 1).padStart(2, "0")}-01`,
    today: `${year}-${String(month + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`,
  };
};

type Issue = { issue_code: string; severity: "attention" | "error"; title: string; message: string; data?: Record<string, unknown> };

async function internalCall(base: string, name: string, token: string, body: any, timeout = 100000) {
  const response = await fetch(`${base}/functions/v1/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-debug-token": token },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const payload = await response.json().catch(() => ({})) as any;
  return { ok: response.ok, status: response.status, payload };
}

async function fetchPaged(makeQuery: () => any) {
  const rows: any[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 100000; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < pageSize) break;
  }
  return rows;
}

async function auditPurchases(admin: any, base: string, token: string, company: any, purchaseState: any, hasCredential: boolean, range: ReturnType<typeof bounds>) {
  const issues: Issue[] = [];
  let source: any = null;
  if (String(company.uf || "").toUpperCase() === "AL" && hasCredential) {
    try {
      const report = await internalCall(base, "fiscal-purchases-sefaz-al-report", token, { company_id: company.id, start: range.startDay, end: range.today, dry_run: true, include_keys: true });
      if (report.ok && !report.payload?.error) source = report.payload;
      else if (Number(purchaseState?.consecutive_failures || 0) >= 3) issues.push({ issue_code: "PURCHASE_SOURCE_UNAVAILABLE", severity: "error", title: "Fonte de compras indisponível", message: "A conferência com a fonte fiscal falhou repetidamente. O sistema continuará tentando automaticamente.", data: { error: report.payload?.error || `HTTP ${report.status}` } });
    } catch (error) {
      if (Number(purchaseState?.consecutive_failures || 0) >= 3) issues.push({ issue_code: "PURCHASE_SOURCE_UNAVAILABLE", severity: "error", title: "Fonte de compras indisponível", message: "A conferência com a fonte fiscal falhou repetidamente. O sistema continuará tentando automaticamente.", data: { error: error instanceof Error ? error.message : String(error) } });
    }
  }
  const sourceKeys: string[] = Array.isArray(source?.purchase_keys) ? source.purchase_keys.map(digits).filter((key: string) => key.length === 44) : [];
  let query = admin.from("fiscal_dfe_documents").select("access_key,full_xml,xml,parse_error,updated_at,source").eq("company_id", company.id).eq("direction", "entrada").eq("model", "55").neq("document_kind", "evento").gte("issue_date", range.start).lt("issue_date", range.next);
  if (sourceKeys.length) query = query.in("access_key", sourceKeys);
  const rows = await fetchPaged(() => query.order("issue_date", { ascending: true }));
  const byKey = new Map<string, any[]>();
  for (const row of rows) { const key = digits(row.access_key); if (key.length !== 44) continue; const list = byKey.get(key) || []; list.push(row); byKey.set(key, list); }
  const expectedKeys = sourceKeys.length ? sourceKeys : [...byKey.keys()];
  const stored = expectedKeys.filter((key) => byKey.has(key)).length;
  if (source && stored < Number(source.purchase_unique_keys || 0)) issues.push({ issue_code: "PURCHASE_COUNT_MISMATCH", severity: "error", title: "Compras incompletas", message: `A fonte fiscal apresenta ${Number(source.purchase_unique_keys || 0)} NF-e de compra no mês, mas ${stored} estão salvas no sistema.`, data: { expected: Number(source.purchase_unique_keys || 0), stored } });
  const manifestationKeys = expectedKeys.filter((key) => (byKey.get(key) || []).some((row) => String(row.parse_error || "") === "xml_requires_manifestation"));
  if (manifestationKeys.length) issues.push({ issue_code: "MANIFESTATION_REQUIRED", severity: "attention", title: "Manifestação fiscal necessária", message: `${manifestationKeys.length} nota(s) de compra precisam de manifestação para a SEFAZ liberar o XML integral.`, data: { count: manifestationKeys.length, access_keys: manifestationKeys.slice(0, 20) } });
  const manifestationSentKeys = expectedKeys.filter((key) => { const matches = byKey.get(key) || []; if (matches.some((row) => row.full_xml && row.xml)) return false; return matches.some((row) => String(row.parse_error || "") === "xml_retry:manifestation_sent" && Number.isFinite(Date.parse(row.updated_at || "")) && Date.now() - Date.parse(row.updated_at) > 30 * 60 * 1000); });
  if (manifestationSentKeys.length) issues.push({ issue_code: "MANIFESTATION_XML_PENDING", severity: "attention", title: "XML ainda aguardando a SEFAZ", message: `${manifestationSentKeys.length} nota(s) já tiveram a manifestação registrada, mas o XML ainda não foi liberado após 30 minutos.`, data: { count: manifestationSentKeys.length, access_keys: manifestationSentKeys.slice(0, 20) } });
  const xmlPending = expectedKeys.filter((key) => { const matches = byKey.get(key) || []; if (matches.some((row) => row.full_xml && row.xml)) return false; return !matches.some((row) => ["xml_requires_manifestation", "xml_retry:manifestation_sent"].includes(String(row.parse_error || ""))); });
  if (xmlPending.length) issues.push({ issue_code: "PURCHASE_XML_PENDING", severity: "error", title: "XML de compra pendente", message: `${xmlPending.length} nota(s) de compra continuam sem XML integral após as tentativas automáticas.`, data: { count: xmlPending.length, access_keys: xmlPending.slice(0, 20) } });
  const nfseRows = await fetchPaged(() => admin.from("fiscal_dfe_documents").select("full_xml,xml,issue_date").eq("company_id", company.id).eq("direction", "entrada").like("source", "national_nfse%").neq("document_kind", "evento").gte("issue_date", range.start).lt("issue_date", range.next).order("issue_date", { ascending: true }));
  const nfsePending = nfseRows.filter((row: any) => !(row.full_xml && row.xml)).length;
  if (nfsePending) issues.push({ issue_code: "PURCHASE_NFSE_XML_PENDING", severity: "error", title: "XML de NFS-e pendente", message: `${nfsePending} NFS-e de compra continua sem documento integral.`, data: { count: nfsePending } });
  return issues;
}

async function auditSales(admin: any, company: any, salesState: any, health: any, range: ReturnType<typeof bounds>) {
  const issues: Issue[] = [];
  const companyId = String(company.id);
  if (!salesState) {
    issues.push({ issue_code: "SALES_STATE_MISSING", severity: "error", title: "Busca de vendas não inicializada", message: "A empresa está ativa no Extrator, mas não possui estado de sincronização de vendas." });
    return issues;
  }
  const status = String(salesState.status || "");
  const lastStarted = salesState.last_started_at ? Date.parse(salesState.last_started_at) : 0;
  const lastCompleted = salesState.last_completed_at ? Date.parse(salesState.last_completed_at) : 0;

  if (status === "waiting_sales_reference") {
    issues.push({ issue_code: "SALES_REFERENCE_MISSING", severity: "error", title: "Vendas sem referência inicial", message: "A rotina ainda não conseguiu descobrir a sequência inicial de vendas. O bootstrap automático continuará tentando.", data: { last_started_at: salesState.last_started_at, latest_number: salesState.latest_number } });
    return issues;
  }
  if (status === "waiting_certificate") {
    issues.push({ issue_code: "SALES_CERTIFICATE_MISSING", severity: "error", title: "Vendas bloqueadas por certificado", message: "A busca de vendas aguarda um certificado A1 ativo e válido." });
    return issues;
  }
  if (status === "unsupported_source") {
    issues.push({ issue_code: "SALES_CONNECTOR_UNSUPPORTED", severity: "error", title: "Fonte de vendas sem conector", message: salesState.last_error || "Ainda não existe conector automático de vendas para esta UF/modelo." });
    return issues;
  }
  if (status === "queued" && !lastStarted && Date.now() - Date.parse(salesState.updated_at || "1970-01-01") > 30 * 60 * 1000) {
    issues.push({ issue_code: "SALES_WORKER_NOT_STARTED", severity: "error", title: "Worker de vendas não iniciou", message: "A empresa está na fila de vendas, mas o worker não iniciou dentro da janela esperada." });
  }
  if (salesState.last_error && Number(health?.sales_failure_count || 0) >= 3) {
    issues.push({ issue_code: "SALES_SYNC_FAILURE", severity: "error", title: "Falha persistente na busca de vendas", message: "A rotina de vendas falhou repetidamente e precisa de atenção.", data: { error: salesState.last_error } });
  }

  if (String(company.uf || "").toUpperCase() === "SP") {
    const rows = await fetchPaged(() => admin.from("fiscal_sales_documents").select("access_key,xml,issue_date").eq("company_id", companyId).eq("model","65").gte("issue_date", range.start).lt("issue_date", range.next).order("issue_date",{ascending:true}));
    const withoutXml = rows.filter((row:any)=>!row.xml).length;
    if (withoutXml) issues.push({ issue_code:"SALES_XML_PENDING", severity:"error", title:"XML de venda pendente", message: withoutXml+" NFC-e de SP continuam sem XML integral.", data:{count:withoutXml} });
    if (!lastCompleted || Date.now()-lastCompleted > 4*60*60*1000) issues.push({ issue_code:"SALES_SYNC_STALE", severity:"error", title:"Busca de vendas atrasada", message:"A consulta oficial de NFC-e/SP não concluiu nas últimas 4 horas.", data:{last_completed_at:salesState.last_completed_at} });
    return issues;
  }

  if (String(company.uf || "").toUpperCase() !== "AL") return issues;
  const latest = Number(salesState.latest_number || 0);
  const all = await fetchPaged(() => admin.from("fiscal_sales_reconciliation").select("status,access_key,issue_date,note_number").eq("company_id", companyId).eq("model", "65").eq("series", "1").lte("note_number", latest || 999999999).order("note_number", { ascending: true }));
  const counts: Record<string, number> = {};
  for (const row of all) counts[row.status] = (counts[row.status] || 0) + 1;
  const unresolved = Number(counts.pending || 0) + Number(counts.error || 0);
  const resolved = all.length - unresolved;
  const sequenceComplete = latest > 0 && all.length === latest && unresolved === 0;
  if (sequenceComplete) {
    const stale = salesState.reconciliation_complete !== true || Number(salesState.reconciliation_total || 0) !== latest || Number(salesState.reconciliation_resolved || 0) !== resolved || Number(salesState.reconciliation_pending || 0) !== 0 || String(salesState.status || "") === "reconciling";
    if (stale) await admin.from("fiscal_sales_sync_state").update({ status: "idle", reconciliation_total: latest, reconciliation_resolved: resolved, reconciliation_found: Number(counts.found || 0), reconciliation_cancelled: Number(counts.cancelled || 0), reconciliation_inutilized: Number(counts.inutilized || 0), reconciliation_not_authorized: Number(counts.not_authorized || 0), reconciliation_missing: Number(counts.not_found || 0), reconciliation_pending: 0, reconciliation_complete: true, reconciliation_completed_at: new Date().toISOString(), last_error: salesState.last_error || null, updated_at: new Date().toISOString() }).eq("company_id", companyId);
    if (Number(counts.found || 0)===0 && salesState.last_error) {
      issues.push({ issue_code:"SALES_ZERO_UNCONFIRMED", severity:"attention", title:"Zero vendas ainda não confirmado", message:salesState.last_error, data:{latest_number:latest,reconciliation_complete:true} });
    }
  } else if (latest > 0) {
    issues.push({ issue_code: "SALES_RECONCILIATION_PENDING", severity: Number(health?.sales_failure_count || 0) >= 3 ? "error" : "attention", title: "Conferência de vendas pendente", message: `A sequência de vendas ainda não terminou: ${resolved}/${latest} posições resolvidas.`, data: { total: latest, resolved, unresolved } });
  }
  const foundThisMonth = all.filter((row) => row.status === "found" && row.issue_date && row.issue_date >= range.start && row.issue_date < range.next);
  const expectedKeys = [...new Set(foundThisMonth.map((row) => digits(row.access_key)).filter((key) => key.length === 44))];
  const documents = await fetchPaged(() => admin.from("fiscal_sales_documents").select("access_key,xml,issue_date").eq("company_id", companyId).gte("issue_date", range.start).lt("issue_date", range.next).order("issue_date", { ascending: true }));
  const saved = new Set(documents.map((row: any) => digits(row.access_key)).filter(Boolean));
  const withXml = new Set(documents.filter((row: any) => row.xml).map((row: any) => digits(row.access_key)).filter(Boolean));
  const missing = expectedKeys.filter((key) => !saved.has(key));
  if (missing.length) issues.push({ issue_code: "SALES_COUNT_MISMATCH", severity: "error", title: "Vendas incompletas", message: `${missing.length} venda(s) encontradas na sequência fiscal ainda não estão salvas na base de documentos.`, data: { count: missing.length, access_keys: missing.slice(0, 20) } });
  const xmlPending = expectedKeys.filter((key) => saved.has(key) && !withXml.has(key));
  if (xmlPending.length) issues.push({ issue_code: "SALES_XML_PENDING", severity: "error", title: "XML de venda pendente", message: `${xmlPending.length} venda(s) continuam sem XML integral após a reconciliação.`, data: { count: xmlPending.length, access_keys: xmlPending.slice(0, 20) } });
  return issues;
}

async function persistIssues(admin: any, companyId: string, issues: Issue[]) {
  const now = new Date().toISOString();
  const { data: existing, error } = await admin.from("fiscal_health_alerts").select("id,issue_code").eq("company_id", companyId).is("resolved_at", null);
  if (error) throw error;
  const active = new Map((existing || []).map((row: any) => [String(row.issue_code), row]));
  const seen = new Set<string>();
  let created = 0, updated = 0, resolved = 0;
  for (const issue of issues) {
    seen.add(issue.issue_code);
    const current: any = active.get(issue.issue_code);
    if (current) { const { error: updateError } = await admin.from("fiscal_health_alerts").update({ severity: issue.severity, title: issue.title, message: issue.message, data: issue.data || {}, last_seen_at: now, updated_at: now }).eq("id", current.id); if (updateError) throw updateError; updated += 1; }
    else { const { error: insertError } = await admin.from("fiscal_health_alerts").insert({ company_id: companyId, issue_code: issue.issue_code, severity: issue.severity, title: issue.title, message: issue.message, data: issue.data || {}, first_seen_at: now, last_seen_at: now, created_at: now, updated_at: now }); if (insertError) throw insertError; created += 1; }
  }
  for (const row of existing || []) { if (seen.has(String(row.issue_code))) continue; const { error: resolveError } = await admin.from("fiscal_health_alerts").update({ resolved_at: now, updated_at: now }).eq("id", row.id); if (resolveError) throw resolveError; resolved += 1; }
  return { created, updated, resolved };
}

Deno.serve(async (req) => {
  try {
    const base = Deno.env.get("SUPABASE_URL");
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!base || !service) return json({ error: "configuration_missing" }, 500);
    const admin = createClient(base, service, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: tokenRow } = await admin.from("_fiscal_sales_debug_token").select("token").eq("id", true).maybeSingle();
    const token = String(tokenRow?.token || "");
    if (!token || req.headers.get("x-debug-token") !== token) return json({ error: "unauthorized" }, 403);
    const range = bounds();
    const [fiscals, certs, credentials, purchases, sales, health] = await Promise.all([
      admin.from("fiscal_companies").select("id,company_id,cnpj,razao_social,nome_fantasia,status,uf").eq("status", "ativa"),
      admin.from("fiscal_certificates").select("company_id,valid_until,is_active,created_at").eq("is_active", true).order("created_at", { ascending: false }),
      admin.from("fiscal_state_credentials").select("company_id,uf,is_active").eq("is_active", true),
      admin.from("fiscal_purchase_sync_state").select("*"),
      admin.from("fiscal_sales_sync_state").select("*"),
      admin.from("fiscal_sync_health").select("*"),
    ]);
    for (const result of [fiscals, certs, credentials, purchases, sales, health]) if (result.error) throw result.error;
    const certByCompany = new Map<string, any>();
    for (const cert of certs.data || []) if (!certByCompany.has(String(cert.company_id))) certByCompany.set(String(cert.company_id), cert);
    const credentialSet = new Set((credentials.data || []).filter((row: any) => String(row.uf || "").toUpperCase() === "AL").map((row: any) => String(row.company_id)));
    const purchaseByCompany = new Map((purchases.data || []).map((row: any) => [String(row.company_id), row]));
    const salesByCompany = new Map((sales.data || []).map((row: any) => [String(row.company_id), row]));
    const healthByCompany = new Map((health.data || []).map((row: any) => [String(row.company_id), row]));
    const monitored = (fiscals.data || []).filter((company: any) => certByCompany.has(String(company.id)) && (purchaseByCompany.has(String(company.id)) || salesByCompany.has(String(company.id))));
    const results: any[] = [];
    for (const company of monitored) {
      const id = String(company.id);
      const cert = certByCompany.get(id);
      try {
        let issues: Issue[] = [];
        if (cert?.valid_until && Date.parse(`${cert.valid_until}T23:59:59Z`) < Date.now()) issues = [{ issue_code: "CERTIFICATE_EXPIRED", severity: "error", title: "Certificado A1 vencido", message: "A extração fiscal desta empresa está bloqueada porque o certificado A1 venceu.", data: { valid_until: cert.valid_until } }];
        else issues = [...await auditPurchases(admin, base, token, company, purchaseByCompany.get(id), String(company.uf || "").toUpperCase() !== "AL" || credentialSet.has(id), range), ...await auditSales(admin, company, salesByCompany.get(id), healthByCompany.get(id), range)];
        const persistence = await persistIssues(admin, id, issues);
        results.push({ company_id: id, issues: issues.map((issue) => issue.issue_code), ...persistence });
      } catch (error) {
        const issues: Issue[] = [{ issue_code: "DAILY_AUDIT_FAILURE", severity: "error", title: "Falha na verificação diária", message: "A auditoria automática desta empresa não conseguiu concluir todas as verificações.", data: { error: error instanceof Error ? error.message : String(error) } }];
        const persistence = await persistIssues(admin, id, issues);
        results.push({ company_id: id, issues: ["DAILY_AUDIT_FAILURE"], error: error instanceof Error ? error.message : String(error), ...persistence });
      }
    }
    return json({ ok: true, ran_at: new Date().toISOString(), monitored: monitored.length, companies: results });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
