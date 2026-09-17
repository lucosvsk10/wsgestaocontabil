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

const CADENCE = { purchases_minutes: 10, sales_hours: 3, watchdog_minutes: 10, xml_backfill_minutes: 1 };
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const minutesSince = (value?: string | null) => {
  if (!value) return Infinity;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? Math.max(0, (Date.now() - timestamp) / 60000) : Infinity;
};
const latestDate = (...values: Array<string | null | undefined>) => {
  let result: string | null = null;
  let best = 0;
  for (const value of values) {
    if (!value) continue;
    const timestamp = Date.parse(value);
    if (Number.isFinite(timestamp) && timestamp >= best) {
      result = value;
      best = timestamp;
    }
  }
  return result;
};
const parsePeriod = (value: unknown) => [7, 30, 90].includes(Number(value)) ? Number(value) : 30;
const deltaPercent = (current: number, previous: number) => previous ? Number((((current - previous) / previous) * 100).toFixed(1)) : current ? null : 0;
const errorScope = (message?: string | null): "external" | "internal" | null => {
  if (!message) return null;
  const text = message.toLowerCase();
  return ["sefaz", "svrs", "receita", "upstream", "timeout", "timed out", "http 502", "http 503", "http 504", "econnreset", "connection reset"]
    .some((token) => text.includes(token)) ? "external" : "internal";
};
const monthLabel = (value?: string | null) => {
  const text = String(value || "");
  return /^\d{4}$/.test(text) ? `${text.slice(2, 4)}/${text.slice(0, 2)}` : null;
};

const emptyMetric = () => ({
  count: 0,
  value: 0,
  full_xml: 0,
  pending_xml: 0,
  previous_count: 0,
  previous_value: 0,
  count_delta_percent: 0 as number | null,
  value_delta_percent: 0 as number | null,
  last_document_at: null as string | null,
});

async function fetchPaged(makeQuery: () => any) {
  const rows: any[] = [];
  const size = 1000;
  for (let from = 0; from < 100000; from += size) {
    const { data, error } = await makeQuery().range(from, from + size - 1);
    if (error) throw error;
    const page = data || [];
    rows.push(...page);
    if (page.length < size) break;
  }
  return rows;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!serviceKey || !url) return json({ error: "Configuração ausente" }, 500);

  const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado" }, 401);

  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: "Não autenticado" }, 401);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "Acesso exclusivo para administradores" }, 403);

  try {
    const body = await req.json().catch(() => ({})) as any;
    const days = parsePeriod(body.period_days);
    const now = new Date();
    const periodEnd = now.toISOString();
    const periodStart = new Date(now.getTime() - days * 86400000).toISOString();
    const previousStart = new Date(now.getTime() - days * 2 * 86400000).toISOString();

    const [officeResult, fiscalResult] = await Promise.all([
      admin.from("companies").select("id,company_name,trade_name,cnpj").order("company_name"),
      admin.from("fiscal_companies").select("id,company_id,cnpj,razao_social,nome_fantasia,status,uf,last_sync_at").order("updated_at", { ascending: false }),
    ]);
    if (officeResult.error || fiscalResult.error) throw officeResult.error || fiscalResult.error;

    const officeCompanies = officeResult.data || [];
    const fiscalCompanies = fiscalResult.data || [];
    const fiscalIds = fiscalCompanies.map((row: any) => String(row.id));
    const empty = { data: [], error: null } as any;

    const [certs, credentials, purchaseStates, salesStates, healthRows] = await Promise.all([
      fiscalIds.length ? admin.from("fiscal_certificates").select("company_id,valid_until,is_active,created_at").in("company_id", fiscalIds).eq("is_active", true).order("created_at", { ascending: false }) : Promise.resolve(empty),
      fiscalIds.length ? admin.from("fiscal_state_credentials").select("company_id,uf,is_active,last_verified_at,last_verification_status").in("company_id", fiscalIds).eq("is_active", true) : Promise.resolve(empty),
      fiscalIds.length ? admin.from("fiscal_purchase_sync_state").select("company_id,paused,status,consecutive_failures,last_status_code,last_status_message,last_started_at,last_completed_at,last_failed_at,last_error,next_scheduled_at,updated_at").in("company_id", fiscalIds) : Promise.resolve(empty),
      fiscalIds.length ? admin.from("fiscal_sales_sync_state").select("company_id,paused,status,latest_number,cursor_number,backfill_days,scanned_numbers,found_documents,last_started_at,last_completed_at,next_scheduled_at,last_error,updated_at,reconciliation_total,reconciliation_resolved,reconciliation_pending,history_start_month,xml_expected,xml_saved,xml_pending,detail_expected,detail_saved,detail_pending").in("company_id", fiscalIds) : Promise.resolve(empty),
      fiscalIds.length ? admin.from("fiscal_sync_health").select("company_id,purchases_last_checked_at,sales_last_checked_at,purchases_last_recovery_at,sales_last_recovery_at,purchases_failure_count,sales_failure_count,last_recovery_reason,last_checked_at,updated_at,sales_reconciliation_stall_since,sales_xml_stall_since,sales_detail_stall_since").in("company_id", fiscalIds) : Promise.resolve(empty),
    ]);
    for (const result of [certs, credentials, purchaseStates, salesStates, healthRows]) if (result.error) throw result.error;

    const purchaseDocuments = fiscalIds.length ? await fetchPaged(() => admin
      .from("fiscal_dfe_documents")
      .select("company_id,issue_date,value,full_xml,xml,created_at,updated_at,nsu")
      .in("company_id", fiscalIds)
      .eq("direction", "entrada")
      .neq("document_kind", "evento")
      .gte("issue_date", previousStart)
      .lt("issue_date", periodEnd)
      .order("issue_date", { ascending: true })) : [];

    const salesDocuments = fiscalIds.length ? await fetchPaged(() => admin
      .from("fiscal_sales_documents")
      .select("company_id,issue_date,total_value,xml,first_seen_at,updated_at")
      .in("company_id", fiscalIds)
      .gte("issue_date", previousStart)
      .lt("issue_date", periodEnd)
      .order("issue_date", { ascending: true })) : [];

    const fiscalByOffice = new Map<string, any>();
    const fiscalByCnpj = new Map<string, any>();
    for (const fiscal of fiscalCompanies) {
      if (fiscal.company_id && !fiscalByOffice.has(String(fiscal.company_id))) fiscalByOffice.set(String(fiscal.company_id), fiscal);
      const cnpj = digits(fiscal.cnpj);
      if (cnpj && !fiscalByCnpj.has(cnpj)) fiscalByCnpj.set(cnpj, fiscal);
    }
    const certByFiscal = new Map<string, any>();
    for (const cert of certs.data || []) if (!certByFiscal.has(String(cert.company_id))) certByFiscal.set(String(cert.company_id), cert);
    const credentialByFiscal = new Map<string, any>();
    for (const item of credentials.data || []) if (String(item.uf || "").toUpperCase() === "AL") credentialByFiscal.set(String(item.company_id), item);
    const purchaseByFiscal = new Map((purchaseStates.data || []).map((row: any) => [String(row.company_id), row]));
    const salesByFiscal = new Map((salesStates.data || []).map((row: any) => [String(row.company_id), row]));
    const healthByFiscal = new Map((healthRows.data || []).map((row: any) => [String(row.company_id), row]));

    const metricsByFiscal = new Map<string, any>();
    const metricsFor = (companyId: string) => {
      if (!metricsByFiscal.has(companyId)) metricsByFiscal.set(companyId, { purchases: emptyMetric(), sales: emptyMetric(), latest_nsu: null as string | null });
      return metricsByFiscal.get(companyId);
    };

    for (const document of purchaseDocuments) {
      const metrics = metricsFor(String(document.company_id));
      const issuedAt = Date.parse(document.issue_date || "");
      if (!Number.isFinite(issuedAt)) continue;
      const current = issuedAt >= Date.parse(periodStart);
      const value = Number(document.value || 0);
      if (current) {
        metrics.purchases.count += 1;
        metrics.purchases.value += value;
        if (document.full_xml && document.xml) metrics.purchases.full_xml += 1;
        metrics.purchases.last_document_at = latestDate(metrics.purchases.last_document_at, document.updated_at, document.created_at, document.issue_date);
      } else {
        metrics.purchases.previous_count += 1;
        metrics.purchases.previous_value += value;
      }
      const nsu = digits(document.nsu);
      if (nsu && (!metrics.latest_nsu || Number(nsu) > Number(metrics.latest_nsu))) metrics.latest_nsu = nsu;
    }

    for (const document of salesDocuments) {
      const metrics = metricsFor(String(document.company_id));
      const issuedAt = Date.parse(document.issue_date || "");
      if (!Number.isFinite(issuedAt)) continue;
      const current = issuedAt >= Date.parse(periodStart);
      const value = Number(document.total_value || 0);
      if (current) {
        metrics.sales.count += 1;
        metrics.sales.value += value;
        if (document.xml) metrics.sales.full_xml += 1;
        metrics.sales.last_document_at = latestDate(metrics.sales.last_document_at, document.updated_at, document.first_seen_at, document.issue_date);
      } else {
        metrics.sales.previous_count += 1;
        metrics.sales.previous_value += value;
      }
    }

    for (const metrics of metricsByFiscal.values()) {
      for (const metric of [metrics.purchases, metrics.sales]) {
        metric.pending_xml = Math.max(0, metric.count - metric.full_xml);
        metric.count_delta_percent = deltaPercent(metric.count, metric.previous_count);
        metric.value_delta_percent = deltaPercent(metric.value, metric.previous_value);
        metric.value = Number(metric.value.toFixed(2));
        metric.previous_value = Number(metric.previous_value.toFixed(2));
      }
    }

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);
    const purchaseFreshLimit = Math.max(30, CADENCE.purchases_minutes * 3);
    const salesFreshLimit = Math.max(240, CADENCE.sales_hours * 60 + 60);
    const watchdogFreshLimit = Math.max(30, CADENCE.watchdog_minutes * 3);

    const companyHealth = officeCompanies.map((office: any) => {
      const officeCnpj = digits(office.cnpj);
      const fiscal = fiscalByOffice.get(String(office.id)) || fiscalByCnpj.get(officeCnpj) || null;
      const fiscalId = fiscal ? String(fiscal.id) : "";
      const cert = fiscalId ? certByFiscal.get(fiscalId) : null;
      const purchase = fiscalId ? purchaseByFiscal.get(fiscalId) as any : null;
      const sales = fiscalId ? salesByFiscal.get(fiscalId) as any : null;
      const health = fiscalId ? healthByFiscal.get(fiscalId) as any : null;
      const metrics = fiscalId ? metricsFor(fiscalId) : { purchases: emptyMetric(), sales: emptyMetric(), latest_nsu: null };

      const certExpiry = cert?.valid_until ? new Date(`${cert.valid_until}T23:59:59Z`) : null;
      const certificateStatus: "missing" | "valid" | "expired" = !cert ? "missing" : certExpiry && certExpiry.getTime() < today.getTime() ? "expired" : "valid";
      const fiscalActive = Boolean(fiscal && String(fiscal.status || "").toLowerCase() === "ativa");
      const needsStateCredentials = String(fiscal?.uf || "").toUpperCase() === "AL";
      const hasStateCredentials = !needsStateCredentials || Boolean(fiscalId && credentialByFiscal.get(fiscalId));
      const captureEnabled = fiscalActive && certificateStatus === "valid" && hasStateCredentials;

      const purchaseLast = latestDate(purchase?.last_completed_at, health?.purchases_last_checked_at, purchase?.updated_at);
      const salesLast = latestDate(sales?.last_completed_at, health?.sales_last_checked_at, sales?.updated_at);
      const purchaseFresh = Boolean(purchase) && minutesSince(purchaseLast) <= purchaseFreshLimit;
      const salesFresh = Boolean(sales) && minutesSince(salesLast) <= salesFreshLimit;
      const watchdogFresh = !health || minutesSince(health.last_checked_at || health.updated_at) <= watchdogFreshLimit;
      const purchaseFailures = Math.max(Number(purchase?.consecutive_failures || 0), Number(health?.purchases_failure_count || 0));
      const salesFailures = Number(health?.sales_failure_count || 0);
      const purchaseError = purchase?.last_error || (String(purchase?.last_status_code || "") === "137" ? null : purchase?.last_status_message) || null;
      const salesError = sales?.last_error || null;
      const salesStalled = Boolean(health?.sales_reconciliation_stall_since || health?.sales_xml_stall_since || health?.sales_detail_stall_since);
      const persistentFailure = purchaseFailures >= 3 || salesFailures >= 3 || Boolean(purchaseError && minutesSince(purchaseLast) > purchaseFreshLimit * 2) || Boolean(salesError && minutesSince(salesLast) > salesFreshLimit * 2);

      let state: "neutral" | "ready" | "healthy" | "attention" | "error" = "neutral";
      let stateLabel = "Captura não configurada";
      let stateDetail = "Esta empresa não participa da captura fiscal automática.";
      let reasonCode = "NOT_CONFIGURED";
      let canStart = false;

      if (officeCnpj.length !== 14) {
        stateLabel = "Cadastro incompleto";
        stateDetail = "O cadastro ainda não possui CNPJ válido para vinculação fiscal.";
        reasonCode = "REGISTRATION_PENDING";
      } else if (!fiscalActive) {
        stateLabel = "Captura não configurada";
        stateDetail = "Não há configuração fiscal ativa para esta empresa.";
      } else if (certificateStatus === "missing") {
        stateLabel = "Sem certificado A1";
        stateDetail = "A empresa fica neutra até que um certificado A1 seja configurado.";
        reasonCode = "NO_CERTIFICATE";
      } else if (certificateStatus === "expired") {
        state = "error";
        stateLabel = "Certificado A1 vencido";
        stateDetail = "A captura fiscal está bloqueada até a renovação do certificado.";
        reasonCode = "CERTIFICATE_EXPIRED";
      } else if (!hasStateCredentials) {
        state = "attention";
        stateLabel = "Acesso estadual pendente";
        stateDetail = "O A1 está válido, mas a captura completa de vendas em AL depende do acesso estadual.";
        reasonCode = "STATE_CREDENTIALS_MISSING";
      } else if (!purchase && !sales) {
        state = "ready";
        stateLabel = "Pronta para iniciar";
        stateDetail = "A1 válido e requisitos atendidos. A primeira extração ainda não foi iniciada.";
        reasonCode = "READY_TO_START";
        canStart = true;
      } else if (!purchase || !sales) {
        state = "attention";
        stateLabel = "Inicialização incompleta";
        stateDetail = "Uma das rotinas fiscais ainda não foi inicializada.";
        reasonCode = "PARTIAL_INITIALIZATION";
        canStart = true;
      } else if (persistentFailure) {
        state = "error";
        stateLabel = "Falha na captura fiscal";
        stateDetail = "Há falhas persistentes que exigem intervenção.";
        reasonCode = "PERSISTENT_FAILURE";
      } else if (purchase?.paused || sales?.paused || purchaseError || salesError || !purchaseFresh || !salesFresh || !watchdogFresh || salesStalled) {
        state = "attention";
        stateLabel = "Requer atenção";
        stateDetail = purchase?.paused || sales?.paused ? "Uma das rotinas fiscais está pausada." : purchaseError || salesError ? "Foi registrada uma falha recente; o sistema ainda está dentro da janela de recuperação." : salesStalled ? "Há uma etapa de vendas sem progresso recente." : "Uma das rotinas está atrasada em relação à cadência esperada.";
        reasonCode = purchaseError || salesError ? "RECENT_FAILURE" : salesStalled ? "SALES_STALLED" : "STALE_SYNC";
      } else {
        state = "healthy";
        stateLabel = "Saudável";
        stateDetail = "Compras, vendas e monitoramento estão dentro da cadência esperada.";
        reasonCode = "HEALTHY";
      }

      const purchaseSnapshot = purchase ? {
        status: purchase.status || null,
        label: purchase.paused ? "Pausada" : purchaseError ? "Falha recente" : purchaseFresh ? "Em dia" : "Atrasada",
        last_started_at: purchase.last_started_at || null,
        last_completed_at: purchaseLast,
        last_failed_at: purchase.last_failed_at || null,
        next_scheduled_at: purchase.next_scheduled_at || null,
        last_error: purchaseError,
        error_scope: errorScope(purchaseError),
        failure_count: purchaseFailures,
        fresh: purchaseFresh,
        paused: Boolean(purchase.paused),
        last_status_code: purchase.last_status_code || null,
        last_status_message: String(purchase.last_status_code || "") === "137" ? null : purchase.last_status_message || null,
      } : null;

      const salesSnapshot = sales ? {
        status: sales.status || null,
        label: sales.paused ? "Pausada" : salesError ? "Falha recente" : salesStalled ? "Etapa sem progresso" : salesFresh ? "Em dia" : "Atrasada",
        last_started_at: sales.last_started_at || null,
        last_completed_at: salesLast,
        next_scheduled_at: sales.next_scheduled_at || null,
        last_error: salesError,
        error_scope: errorScope(salesError),
        failure_count: salesFailures,
        fresh: salesFresh,
        paused: Boolean(sales.paused),
        latest_number: sales.latest_number ?? null,
        cursor_number: sales.cursor_number ?? null,
        scanned_numbers: sales.scanned_numbers ?? null,
        found_documents: sales.found_documents ?? null,
        history_start_month: sales.history_start_month || null,
        backfill_days: sales.backfill_days ?? null,
        reconciliation_total: sales.reconciliation_total ?? null,
        reconciliation_resolved: sales.reconciliation_resolved ?? null,
        reconciliation_pending: sales.reconciliation_pending ?? null,
        xml_expected: sales.xml_expected ?? null,
        xml_saved: sales.xml_saved ?? null,
        xml_pending: sales.xml_pending ?? null,
        detail_expected: sales.detail_expected ?? null,
        detail_saved: sales.detail_saved ?? null,
        detail_pending: sales.detail_pending ?? null,
      } : null;

      const timeline: any[] = [];
      const addEvent = (at: string | null | undefined, kind: string, title: string, detail: string, status: string) => { if (at) timeline.push({ at, kind, title, detail, status }); };
      addEvent(purchase?.last_failed_at, "error", "Falha em compras", purchaseError || "A execução de compras falhou.", "error");
      addEvent(purchaseLast, "purchase", "Compras verificadas", `${metrics.purchases.count} documento(s) nos últimos ${days} dias`, purchaseFresh ? "ok" : "attention");
      addEvent(salesLast, "sale", "Vendas verificadas", `${metrics.sales.count} documento(s) nos últimos ${days} dias`, salesFresh ? "ok" : "attention");
      addEvent(health?.sales_last_recovery_at || health?.purchases_last_recovery_at, "recovery", "Recuperação automática", health?.last_recovery_reason || "Rotina de recuperação executada", "attention");
      addEvent(health?.last_checked_at, "watchdog", "Watchdog fiscal", watchdogFresh ? "Monitoramento em dia" : "Monitoramento atrasado", watchdogFresh ? "ok" : "attention");
      timeline.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

      const salesHistory = monthLabel(sales?.history_start_month);
      const technicalPurchases = purchase ? `Distribuição DF-e por NSU${metrics.latest_nsu ? ` · último NSU observado ${metrics.latest_nsu}` : ""}` : "Rotina de compras ainda não iniciada";
      const technicalSales = sales ? `${salesHistory ? `Histórico desde ${salesHistory}` : sales?.backfill_days ? `Backfill inicial de ${sales.backfill_days} dias` : "Consulta numérica"}${sales?.cursor_number != null || sales?.latest_number != null ? ` · cursor ${sales?.cursor_number ?? "—"}/${sales?.latest_number ?? "—"}` : ""}` : "Rotina de vendas ainda não iniciada";

      return {
        office_company_id: String(office.id),
        fiscal_company_id: fiscalId || null,
        company_name: office.company_name,
        trade_name: office.trade_name || null,
        cnpj: office.cnpj || null,
        uf: fiscal?.uf || null,
        state,
        state_label: stateLabel,
        state_detail: stateDetail,
        reason_code: reasonCode,
        capture_enabled: captureEnabled,
        can_start: canStart,
        certificate_status: certificateStatus,
        certificate_valid_until: cert?.valid_until || null,
        has_state_credentials: hasStateCredentials,
        last_checked_at: latestDate(health?.last_checked_at, purchaseLast, salesLast, fiscal?.last_sync_at),
        purchase: purchaseSnapshot,
        sales: salesSnapshot,
        metrics: { period_days: days, period_start: periodStart, period_end: periodEnd, previous_start: previousStart, purchases: metrics.purchases, sales: metrics.sales },
        technical_window: { purchases: technicalPurchases, sales: technicalSales },
        timeline: timeline.slice(0, 8),
      };
    });

    const summary = {
      total: companyHealth.length,
      monitored: companyHealth.filter((row: any) => row.state !== "neutral").length,
      healthy: companyHealth.filter((row: any) => row.state === "healthy").length,
      ready: companyHealth.filter((row: any) => row.state === "ready").length,
      attention: companyHealth.filter((row: any) => row.state === "attention").length,
      error: companyHealth.filter((row: any) => row.state === "error").length,
      neutral: companyHealth.filter((row: any) => row.state === "neutral").length,
    };

    return json({ ok: true, generated_at: periodEnd, period_days: days, summary, cadence: CADENCE, company_health: companyHealth });
  } catch (error) {
    console.error("admin-fiscal-health-v2 failed", error);
    return json({ error: error instanceof Error ? error.message : "Não foi possível carregar a saúde fiscal" }, 500);
  }
});
