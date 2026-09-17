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

async function auditCompany(admin: any, base: string, token: string, company: any, purchaseState: any, salesState: any, health: any, hasCredential: boolean, range: ReturnType<typeof bounds>) {
  const issues: Issue[] = [];
  const cert = company.cert;
  if (cert?.valid_until && Date.parse(`${cert.valid_until}T23:59:59Z`) < Date.now()) {
    issues.push({ issue_code: "CERTIFICATE_EXPIRED", severity: "error", title: "Certificado A1 vencido", message: "A extração fiscal desta empresa está bloqueada porque o certificado A1 venceu.", data: { valid_until: cert.valid_until } });
    return issues;
  }

  let source: any = null;
  if (String(company.uf || "").toUpperCase() === "AL" && hasCredential) {
    try {
      const report = await internalCall(base, "fiscal-purchases-sefaz-al-report", token, {
        company_id: company.id,
        start: range.startDay,
        end: range.today,
        dry_run: true,
        include_keys: true,
      });
      if (report.ok && !report.payload?.error) source = report.payload;
      else if (Number(purchaseState?.consecutive_failures || 0) >= 3) {
        issues.push({ issue_code: "PURCHASE_SOURCE_UNAVAILABLE", severity: "error", title: "Fonte de compras indisponível", message: "A conferência com a fonte fiscal falhou repetidamente. O sistema continuará tentando automaticamente.", data: { error: report.payload?.error || `HTTP ${report.status}` } });
      }
    } catch (error) {
      if (Number(purchaseState?.consecutive_failures || 0) >= 3) issues.push({ issue_code: "PURCHASE_SOURCE_UNAVAILABLE", severity: "error", title: "Fonte de compras indisponível", message: "A conferência com a fonte fiscal falhou repetidamente. O sistema continuará tentando automaticamente.", data: { error: error instanceof Error ? error.message : String(error) } });
    }
  }

  const purchaseKeys: string[] = Array.isArray(source?.purchase_keys)
    ? source.purchase_keys.map(digits).filter((key: string) => key.length === 44)
    : [];
  let purchaseQuery = admin.from("fiscal_dfe_documents")
    .select("access_key,full_xml,xml,parse_error,updated_at,source")
    .eq("company_id", company.id)
    .eq("direction", "entrada")
    .eq("model", "55")
    .neq("document_kind", "evento")
    .gte("issue_date", range.start)
    .lt("issue_date", range.next);
  if (purchaseKeys.length) purchaseQuery = purchaseQuery.in("access_key", purchaseKeys);
  const { data: purchaseRows, error: purchaseError } = await purchaseQuery;
  if (purchaseError) throw purchaseError;
  const purchaseByKey = new Map<string, any[]>();
  for (const row of purchaseRows || []) {
    const key = digits(row.access_key);
    if (key.length !== 44) continue;
    const list = purchaseByKey.get(key) || [];
    list.push(row);
    purchaseByKey.set(key, list);
  }
  const expectedPurchaseKeys = purchaseKeys.length ? purchaseKeys : [...purchaseByKey.keys()];
  const storedPurchase = expectedPurchaseKeys.filter((key) => purchaseByKey.has(key)).length;
  if (source && storedPurchase < Number(source.purchase_unique_keys || 0)) {
    issues.push({ issue_code: "PURCHASE_COUNT_MISMATCH", severity: "error", title: "Compras incompletas", message: `A fonte fiscal apresenta ${Number(source.purchase_unique_keys || 0)} NF-e de compra no mês, mas ${storedPurchase} estão salvas no sistema.`, data: { expected: Number(source.purchase_unique_keys || 0), stored: storedPurchase } });
  }

  const manifestationKeys = expectedPurchaseKeys.filter((key) => (purchaseByKey.get(key) || []).some((row) => String(row.parse_error || "") === "xml_requires_manifestation"));
  if (manifestationKeys.length) {
    issues.push({ issue_code: "MANIFESTATION_REQUIRED", severity: "attention", title: "Manifestação fiscal necessária", message: `${manifestationKeys.length} nota(s) de compra precisam de manifestação para a SEFAZ liberar o XML integral.`, data: { count: manifestationKeys.length, access_keys: manifestationKeys.slice(0, 20) } });
  }
  const sentManifestationKeys = expectedPurchaseKeys.filter((key) => {
    const rows = purchaseByKey.get(key) || [];
    if (rows.some((row) => row.full_xml && row.xml)) return false;
    return rows.some((row) => String(row.parse_error || "") === "xml_retry:manifestation_sent" && Date.now() - Date.parse(row.updated_at || "") > 30 * 60 * 1000);
  });
  if (sentManifestationKeys.length) {
    issues.push({ issue_code: "MANIFESTATION_XML_PENDING", severity: "attention", title: "XML ainda aguardando a SEFAZ", message: `${sentManifestationKeys.length} nota(s) já tiveram a manifestação registrada, mas o XML ainda não foi liberado após 30 minutos.`, data: { count: sentManifestationKeys.length, access_keys: sentManifestationKeys.slice(0, 20) } });
  }
  const purchaseXmlPending = expectedPurchaseKeys.filter((key) => {
    const rows = purchaseByKey.get(key) || [];
    if (rows.some((row) => row.full_xml && row.xml)) return false;
    return !rows.some((row) => ["xml_requires_manifestation", "xml_retry:manifestation_sent"].includes(String(row.parse_error || "")));
  });
  if (purchaseXmlPending.length) {
    issues.push({ issue_code: "PURCHASE_XML_PENDING", severity: "error", title: "XML de compra pendente", message: `${purchaseXmlPending.length} nota(s) de compra continuam sem XML integral após as tentativas automáticas.`, data: { count: purchaseXmlPending.length, access_keys: purchaseXmlPending.slice(0, 20) } });
  }

  const { data: nfseRows } = await admin.from("fiscal_dfe_documents")
    .select("full_xml,xml")
    .eq("company_id", company.id)
    .eq("direction", "entrada")
    .like("source", "national_nfse%")
    .neq("document_kind", "evento")
    .gte("issue_date", range.start)
    .lt("issue_date", range.next);
  const nfsePending = (nfseRows || []).filter((row: any) => !(row.full_xml && row.xml)).length;
  if (nfsePending) issues.push({ issue_code: "PURCHASE_NFSE_XML_PENDING", severity: "error", title: "XML de NFS-e pendente", message: `${nfsePending} NFS-e de compra continua sem documento integral.`, data: { count: nfsePending } });

  if (salesState && !String(salesState.status || "").startsWith("waiting_")) {
    const latest = Number(salesState.latest_number || 0);
    if (Number(salesState.reconciliation_pending || 0) > 0 || (latest > 0 && salesState.reconciliation_complete === false)) {
      issues.push({ issue_code: "SALES_RECONCILIATION_PENDING", severity: Number(health?.sales_failure_count || 0) >= 3 ? "error" : "attention", title: "Conferência de vendas pendente", message: `A sequência de vendas ainda não terminou: ${Number(salesState.reconciliation_resolved || 0)}/${Number(salesState.reconciliation_total || latest || 0)} posições resolvidas.`, data: { total: Number(salesState.reconciliation_total || latest || 0), resolved: Number(salesState.reconciliation_resolved || 0) } });
    }
    const { data: reconRows, error: reconError } = await admin.from("fiscal_sales_reconciliation")
      .select("access_key,status,issue_date")
      .eq("company_id", company.id)
      .eq("status", "found")
      .gte("issue_date", range.start)
      .lt("issue_date", range.next);
    if (reconError) throw reconError;
    const expectedSalesKeys = [...new Set((reconRows || []).map((row: any) => digits(row.access_key)).filter((key: string) => key.length === 44))];
    const { data: salesDocs, error: salesDocsError } = await admin.from("fiscal_sales_documents")
      .select("access_key,xml")
      .eq("company_id", company.id)
      .gte("issue_date", range.start)
      .lt("issue_date", range.next);
    if (salesDocsError) throw salesDocsError;
    const saved = new Set((salesDocs || []).map((row: any) => digits(row.access_key)).filter(Boolean));
    const withXml = new Set((salesDocs || []).filter((row: any) => row.xml).map((row: any) => digits(row.access_key)).filter(Boolean));
    const missingSales = expectedSalesKeys.filter((key) => !saved.has(key));
    if (missingSales.length) issues.push({ issue_code: "SALES_COUNT_MISMATCH", severity: "error", title: "Vendas incompletas", message: `${missingSales.length} venda(s) encontradas na sequência fiscal ainda não estão salvas na base de documentos.`, data: { count: missingSales.length, access_keys: missingSales.slice(0, 20) } });
    const salesXmlPending = expectedSalesKeys.filter((key) => saved.has(key) && !withXml.has(key));
    if (salesXmlPending.length) issues.push({ issue_code: "SALES_XML_PENDING", severity: "error", title: "XML de venda pendente", message: `${salesXmlPending.length} venda(s) continuam sem XML integral após a reconciliação.`, data: { count: salesXmlPending.length, access_keys: salesXmlPending.slice(0, 20) } });
    if (salesState.last_error && Number(health?.sales_failure_count || 0) >= 3) issues.push({ issue_code: "SALES_SYNC_FAILURE", severity: "error", title: "Falha persistente na busca de vendas", message: "A rotina de vendas falhou repetidamente e precisa de atenção.", data: { error: salesState.last_error } });
  }

  return issues;
}

async function persistIssues(admin: any, companyId: string, issues: Issue[]) {
  const now = new Date().toISOString();
  const { data: existing, error } = await admin.from("fiscal_health_alerts")
    .select("id,issue_code,resolved_at")
    .eq("company_id", companyId)
    .is("resolved_at", null);
  if (error) throw error;
  const active = new Map((existing || []).map((row: any) => [String(row.issue_code), row]));
  const seen = new Set<string>();
  let created = 0;
  let updated = 0;
  let resolved = 0;
  for (const issue of issues) {
    seen.add(issue.issue_code);
    const current: any = active.get(issue.issue_code);
    if (current) {
      const { error: updateError } = await admin.from("fiscal_health_alerts").update({ severity: issue.severity, title: issue.title, message: issue.message, data: issue.data || {}, last_seen_at: now, updated_at: now }).eq("id", current.id);
      if (updateError) throw updateError;
      updated += 1;
    } else {
      const { error: insertError } = await admin.from("fiscal_health_alerts").insert({ company_id: companyId, issue_code: issue.issue_code, severity: issue.severity, title: issue.title, message: issue.message, data: issue.data || {}, first_seen_at: now, last_seen_at: now, created_at: now, updated_at: now });
      if (insertError) throw insertError;
      created += 1;
    }
  }
  for (const row of existing || []) {
    if (seen.has(String(row.issue_code))) continue;
    const { error: resolveError } = await admin.from("fiscal_health_alerts").update({ resolved_at: now, updated_at: now }).eq("id", row.id);
    if (resolveError) throw resolveError;
    resolved += 1;
  }
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
      const enriched = { ...company, cert: certByCompany.get(id) };
      try {
        const issues = await auditCompany(admin, base, token, enriched, purchaseByCompany.get(id), salesByCompany.get(id), healthByCompany.get(id), String(company.uf || "").toUpperCase() !== "AL" || credentialSet.has(id), range);
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
