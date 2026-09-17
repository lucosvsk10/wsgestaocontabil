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

const CADENCE = {
  purchases_minutes: 10,
  sales_hours: 3,
  watchdog_minutes: 10,
  xml_backfill_minutes: 1,
};

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const ageMinutes = (value?: string | null) => {
  if (!value) return Infinity;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? Math.max(0, (Date.now() - ts) / 60000) : Infinity;
};
const maxDate = (...values: Array<string | null | undefined>) => {
  let best: string | null = null;
  let bestTs = 0;
  for (const value of values) {
    if (!value) continue;
    const ts = Date.parse(value);
    if (Number.isFinite(ts) && ts >= bestTs) {
      best = value;
      bestTs = ts;
    }
  }
  return best;
};
const isOkStatus = (status?: string | null) => !status || ["idle", "ok", "healthy", "success", "completed", "ready", "active"].includes(String(status).toLowerCase());
const periodDays = (value: unknown) => {
  const n = Number(value);
  return [7, 30, 90].includes(n) ? n : 30;
};
const deltaPercent = (current: number, previous: number) => {
  if (!previous) return current === 0 ? 0 : null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
};
const classifyError = (message?: string | null): "external" | "internal" | null => {
  if (!message) return null;
  const text = message.toLowerCase();
  if (["sefaz", "svrs", "receita", "upstream", "timeout", "timed out", "gateway timeout", "http 502", "http 503", "http 504", "econnreset", "connection reset"].some((token) => text.includes(token))) return "external";
  return "internal";
};
const monthLabel = (value?: string | null) => {
  const text = String(value || "");
  if (!/^\d{4}$/.test(text)) return null;
  return `${text.slice(2, 4)}/${text.slice(0, 2)}`;
};

type Metric = {
  count: number;
  value: number;
  full_xml: number;
  pending_xml: number;
  previous_count: number;
  previous_value: number;
  count_delta_percent: number | null;
  value_delta_percent: number | null;
  last_document_at: string | null;
};

const emptyMetric = (): Metric => ({
  count: 0,
  value: 0,
  full_xml: 0,
  pending_xml: 0,
  previous_count: 0,
  previous_value: 0,
  count_delta_percent: 0,
  value_delta_percent: 0,
  last_document_at: null,
});

async function fetchPaged(makeQuery: () => any) {
  const all: any[] = [];
  const pageSize = 1000;
  for (let from = 0; from < 100000; from += pageSize) {
    const { data, error } = await makeQuery().range(from, from + pageSize - 1);
    if (error) throw error;
    const rows = data || [];
    all.push(...rows);
    if (rows.length < pageSize) break;
  }
  return all;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!service || !url) return json({ error: "Configuração ausente" }, 500);

  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado" }, 401);

  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: "Não autenticado" }, 401);

  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", auth.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "Acesso exclusivo para administradores" }, 403);

  try {
    const body = await req.json().catch(() => ({})) as any;
    const days = periodDays(body.period_days);
    const generatedAt = new Date();
    const periodEnd = generatedAt.toISOString();
    const periodStart = new Date(generatedAt.getTime() - days * 86400000).toISOString();
    const previousStart = new Date(generatedAt.getTime() - days * 2 * 86400000).toISOString();

    const [officeResult, fiscalResult] = await Promise.all([
      admin.from("companies").select("id,company_name,trade_name,cnpj,is_fiscal_automation_client").order("company_name"),
      admin.from("fiscal_companies").select("id,company_id,cnpj,razao_social,nome_fantasia,status,uf,last_sync_at,fiscal_settings").order("updated_at", { ascending: false }),
    ]);
    if (officeResult.error || fiscalResult.error) throw officeResult.error || fiscalResult.error;

    const officeCompanies = officeResult.data || [];
    const fiscalCompanies = fiscalResult.data || [];
    const fiscalIds = fiscalCompanies.map((row: any) => String(row.id));

    const empty = { data: [], error: null } as any;
    const [certResult, credentialResult, purchaseResult, salesResult, healthResult, logsResult] = await Promise.all([
      fiscalIds.length
        ? admin.from("fiscal_certificates").select("company_id,valid_until,is_active,created_at,updated_at").in("company_id", fiscalIds).eq("is_active", true).order("created_at", { ascending: false })
        : Promise.resolve(empty),
      fiscalIds.length
        ? admin.from("fiscal_state_credentials").select("company_id,uf,is_active,last_verified_at,last_verification_status").in("company_id", fiscalIds).eq("is_active", true)
        : Promise.resolve(empty),
      fiscalIds.length
        ? admin.from("fiscal_purchase_sync_state").select("company_id,paused,status,consecutive_failures,last_status_code,last_status_message,last_started_at,last_completed_at,last_failed_at,last_error,next_scheduled_at,updated_at").in("company_id", fiscalIds)
        : Promise.resolve(empty),
      fiscalIds.length
        ? admin.from("fiscal_sales_sync_state").select("company_id,paused,status,latest_number,cursor_number,initial_floor_number,backfill_days,initial_backfill_done,scanned_numbers,found_documents,last_started_at,last_completed_at,next_scheduled_at,last_error,updated_at,reconciliation_total,reconciliation_resolved,reconciliation_pending,reconciliation_complete,reconciliation_started_at,reconciliation_completed_at,history_start_month,xml_expected,xml_saved,xml_pending,xml_failed,xml_complete,detail_expected,detail_saved,detail_pending,detail_complete").in("company_id", fiscalIds)
        : Promise.resolve(empty),
      fiscalIds.length
        ? admin.from("fiscal_sync_health").select("company_id,purchases_status,sales_status,purchases_last_checked_at,sales_last_checked_at,purchases_last_progress_at,sales_last_progress_at,purchases_last_recovery_at,sales_last_recovery_at,purchases_failure_count,sales_failure_count,recovery_count,last_recovery_reason,last_checked_at,updated_at,sales_reconciliation_stall_since,sales_xml_stall_since,sales_detail_stall_since").in("company_id", fiscalIds)
        : Promise.resolve(empty),
      fiscalIds.length
        ? admin.from("fiscal_sync_logs").select("company_id,sync_type,periodo_inicio,periodo_fim,documentos_encontrados,documentos_processados,documentos_erro,status,mensagem_erro,created_at,completed_at").in("company_id", fiscalIds).order("created_at", { ascending: false }).limit(500)
        : Promise.resolve(empty),
    ]);

    for (const result of [certResult, credentialResult, purchaseResult, salesResult, healthResult, logsResult]) {
      if (result.error) throw result.error;
    }

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
    for (const cert of certResult.data || []) {
      const key = String(cert.company_id);
      if (!certByFiscal.has(key)) certByFiscal.set(key, cert);
    }
    const credentialByFiscal = new Map<string, any>();
    for (const credential of credentialResult.data || []) {
      if (String(credential.uf || "").toUpperCase() !== "AL") continue;
      credentialByFiscal.set(String(credential.company_id), credential);
    }
    const purchaseByFiscal = new Map((purchaseResult.data || []).map((row: any) => [String(row.company_id), row]));
    const salesByFiscal = new Map((salesResult.data || []).map((row: any) => [String(row.company_id), row]));
    const healthByFiscal = new Map((healthResult.data || []).map((row: any) => [String(row.company_id), row]));

    const logsByFiscal = new Map<string, any[]>();
    for (const log of logsResult.data || []) {
      const key = String(log.company_id);
      const list = logsByFiscal.get(key) || [];
      if (list.length < 8) list.push(log);
      logsByFiscal.set(key, list);
    }

    const metricsByFiscal = new Map<string, { purchases: Metric; sales: Metric; latest_nsu: string | null }>();
    const metricsFor = (companyId: string) => {
      let value = metricsByFiscal.get(companyId);
      if (!value) {
        value = { purchases: emptyMetric(), sales: emptyMetric(), latest_nsu: null };
        metricsByFiscal.set(companyId, value);
      }
      return value;
    };

    for (const doc of purchaseDocuments) {
      const companyId = String(doc.company_id);
      const metrics = metricsFor(companyId);
      const issued = Date.parse(doc.issue_date || "");
      if (!Number.isFinite(issued)) continue;
      const amount = Number(doc.value || 0);
      const current = issued >= Date.parse(periodStart);
      if (current) {
        metrics.purchases.count += 1;
        metrics.purchases.value += amount;
        if (doc.full_xml && doc.xml) metrics.purchases.full_xml += 1;
        metrics.purchases.last_document_at = maxDate(metrics.purchases.last_document_at, doc.updated_at, doc.created_at, doc.issue_date);
      } else {
        metrics.purchases.previous_count += 1;
        metrics.purchases.previous_value += amount;
      }
      const nsu = digits(doc.nsu);
      if (nsu && (!metrics.latest_nsu || Number(nsu) > Number(metrics.latest_nsu))) metrics.latest_nsu = nsu;
    }

    for (const doc of salesDocuments) {
      const companyId = String(doc.company_id);
      const metrics = metricsFor(companyId);
      const issued = Date.parse(doc.issue_date || "");
      if (!Number.isFinite(issued)) continue;
      const amount = Number(doc.total_value || 0);
      const current = issued >= Date.parse(periodStart);
      if (current) {
        metrics.sales.count += 1;
        metrics.sales.value += amount;
        if (doc.xml) metrics.sales.full_xml += 1;
        metrics.sales.last_document_at = maxDate(metrics.sales.last_document_at, doc.updated_at, doc.first_seen_at, doc.issue_date);
      } else {
        metrics.sales.previous_count += 1;
        metrics.sales.previous_value += amount;
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

    const nowDay = new Date();
    nowDay.setUTCHours(0, 0, 0, 0);
    const purchaseFreshLimit = Math.max(30, CADENCE.purchases_minutes * 3);
    const salesFreshLimit = Math.max(240, CADENCE.sales_hours * 60 + 60);
    const watchdogFreshLimit = Math.max(30, CADENCE.watchdog_minutes * 3);

    const companyHealth = officeCompanies.map((office: any) => {
      const officeCnpj = digits(office.cnpj);
      const fiscal = fiscalByOffice.get(String(office.id)) || fiscalByCnpj.get(officeCnpj) || null;
      const fiscalId = fiscal ? String(fiscal.id) : "";
      const cert = fiscalId ? certByFiscal.get(fiscalId) : null;
      const credential = fiscalId ? credentialByFiscal.get(fiscalId) : null;
      const purchase = fiscalId ? purchaseByFiscal.get(fiscalId) as any : null;
      const sales = fiscalId ? salesByFiscal.get(fiscalId) as any : null;
      const health = fiscalId ? healthByFiscal.get(fiscalId) as any : null;
      const metrics = fiscalId ? metricsFor(fiscalId) : { purchases: emptyMetric(), sales: emptyMetric(), latest_nsu: null };

      const certExpiry = cert?.valid_until ? new Date(`${cert.valid_until}T23:59:59Z`) : null;
      const certificateStatus: "missing" | "valid" | "expired" = !cert
        ? "missing"
        : certExpiry && certExpiry.getTime() < nowDay.getTime() ? "expired" : "valid";
      const fiscalActive = Boolean(fiscal && String(fiscal.status || "").toLowerCase() === "ativa");
      const needsStateCredentials = String(fiscal?.uf || "").toUpperCase() === "AL";
      const hasStateCredentials = !needsStateCredentials || Boolean(credential);
      const captureEnabled = fiscalActive && certificateStatus === "valid";

      const purchaseLast = maxDate(purchase?.last_completed_at, health?.purchases_last_checked_at, purchase?.updated_at);
      const salesLast = maxDate(sales?.last_completed_at, health?.sales_last_checked_at, sales?.updated_at);
      const purchaseFresh = Boolean(purchase) && ageMinutes(purchaseLast) <= purchaseFreshLimit;
      const salesFresh = Boolean(sales) && ageMinutes(salesLast) <= salesFreshLimit;
      const watchdogFresh = !health || ageMinutes(health?.last_checked_at || health?.updated_at) <= watchdogFreshLimit;
      const purchaseFailures = Math.max(Number(purchase?.consecutive_failures || 0), Number(health?.purchases_failure_count || 0));
      const salesFailures = Number(health?.sales_failure_count || 0);
      const stalls = Boolean(health?.sales_reconciliation_stall_since || health?.sales_xml_stall_since || health?.sales_detail_stall_since);
      const purchaseError = purchase?.last_error || (String(purchase?.last_status_code || "") === "137" ? null : purchase?.last_status_message) || null;
      const salesError = sales?.last_error || null;
      const persistentFailure = purchaseFailures >= 3 || salesFailures >= 3 ||
        Boolean(purchaseError && ageMinutes(purchaseLast) > purchaseFreshLimit * 2) ||
        Boolean(salesError && ageMinutes(salesLast) > salesFreshLimit * 2);

      let state: "neutral" | "ready" | "healthy" | "attention" | "error" = "neutral";
      let stateLabel = "Captura não configurada";
      let stateDetail = "Esta empresa não participa da captura fiscal automática.";
      let reasonCode = "NOT_CONFIGURED";
      let canStart = false;

      if (officeCnpj.length !== 14) {
        state = "neutral";
        stateLabel = "Cadastro incompleto";
        stateDetail = "O cadastro ainda não possui CNPJ válido para vinculação fiscal.";
        reasonCode = "REGISTRATION_PENDING";
      } else if (!fiscalActive) {
        state = "neutral";
        stateLabel = "Captura não configurada";
        stateDetail = "Não há configuração fiscal ativa para esta empresa.";
        reasonCode = "NOT_CONFIGURED";
      } else if (certificateStatus === "missing") {
        state = "neutral";
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
        stateDetail = purchaseFailures >= 3 || salesFailures >= 3
          ? "Há falhas consecutivas que exigem intervenção."
          : "A rotina permanece com erro além da janela normal de recuperação.";
        reasonCode = "PERSISTENT_FAILURE";
      } else if (purchase?.paused || sales?.paused || purchaseError || salesError || !purchaseFresh || !salesFresh || !watchdogFresh || stalls) {
        state = "attention";
        stateLabel = "Requer atenção";
        stateDetail = purchase?.paused || sales?.paused
          ? "Uma das rotinas fiscais está pausada."
          : purchaseError || salesError
            ? "Foi registrada uma falha recente; o sistema ainda está dentro da janela de recuperação."
            : stalls
              ? "Há uma etapa de vendas sem progresso recente."
              : "Uma das rotinas está atrasada em relação à cadência esperada.";
        reasonCode = purchaseError || salesError ? "RECENT_FAILURE" : stalls ? "SALES_STALLED" : "STALE_SYNC";
      } else {
        state = "healthy";
        stateLabel = "Saudável";
        stateDetail = "Compras, vendas e monitoramento estão dentro da cadência esperada.";
        reasonCode = "HEALTHY";
      }

      const purchaseSnapshot = purchase ? {
        status: purchase.status || health?.purchases_status || null,
        label: purchase?.paused ? "Pausada" : purchaseError ? "Falha recente" : purchaseFresh ? "Em dia" : "Atrasada",
        last_started_at: purchase.last_started_at || null,
        last_completed_at: purchaseLast,
        last_failed_at: purchase.last_failed_at || null,
        next_scheduled_at: purchase.next_scheduled_at || null,
        last_error: purchaseError,
        error_scope: classifyError(purchaseError),
        failure_count: purchaseFailures,
        fresh: purchaseFresh,
        paused: Boolean(purchase.paused),
        last_status_code: purchase.last_status_code || null,
        last_status_message: String(purchase.last_status_code || "") === "137" ? null : purchase.last_status_message || null,
      } : null;

      const salesSnapshot = sales ? {
        status: sales.status || health?.sales_status || null,
        label: sales?.paused ? "Pausada" : salesError ? "Falha recente" : stalls ? "Etapa sem progresso" : salesFresh ? "Em dia" : "Atrasada",
        last_started_at: sales.last_started_at || null,
        last_completed_at: salesLast,
        next_scheduled_at: sales.next_scheduled_at || null,
        last_error: salesError,
        error_scope: classifyError(salesError),
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
      const pushTimeline = (at: string | null | undefined, kind: string, title: string, detail: string, status: string) => {
        if (at) timeline.push({ at, kind, title, detail, status });
      };

      for (const log of logsByFiscal.get(fiscalId) || []) {
        const error = log.mensagem_erro || null;
        const detailParts = [];
        if (log.periodo_inicio && log.periodo_fim) detailParts.push(`${log.periodo_inicio} a ${log.periodo_fim}`);
        if (Number(log.documentos_encontrados || 0) > 0) detailParts.push(`${log.documentos_encontrados} encontrado(s)`);
        if (Number(log.documentos_erro || 0) > 0) detailParts.push(`${log.documentos_erro} erro(s)`);
        if (error) detailParts.push(error);
        pushTimeline(log.completed_at || log.created_at, String(log.sync_type || "").includes("sale") ? "sale" : "purchase", String(log.sync_type || "Sincronização fiscal"), detailParts.join(" · ") || "Execução registrada", error ? "error" : String(log.status || "").toLowerCase().includes("erro") ? "attention" : "ok");
      }

      if (!timeline.length) {
        pushTimeline(purchase?.last_failed_at, "error", "Falha em compras", purchaseError || "A execução de compras falhou.", "error");
        pushTimeline(purchaseLast, "purchase", "Compras verificadas", `${metrics.purchases.count} documento(s) no período analítico`, purchaseFresh ? "ok" : "attention");
        pushTimeline(salesLast, "sale", "Vendas verificadas", `${metrics.sales.count} documento(s) no período analítico`, salesFresh ? "ok" : "attention");
        pushTimeline(health?.sales_last_recovery_at || health?.purchases_last_recovery_at, "recovery", "Recuperação automática", health?.last_recovery_reason || "Rotina de recuperação executada", "attention");
        pushTimeline(health?.last_checked_at, "watchdog", "Watchdog fiscal", watchdogFresh ? "Monitoramento em dia" : "Monitoramento atrasado", watchdogFresh ? "ok" : "attention");
      }
      timeline.sort((a, b) => Date.parse(b.at) - Date.parse(a.at));

      const salesHistory = monthLabel(sales?.history_start_month);
      const technicalPurchases = purchase
        ? `Distribuição DF-e por NSU${metrics.latest_nsu ? ` · último NSU observado ${metrics.latest_nsu}` : ""}`
        : "Rotina de compras ainda não iniciada";
      const technicalSales = sales
        ? `${salesHistory ? `Histórico desde ${salesHistory}` : sales?.backfill_days ? `Backfill inicial de ${sales.backfill_days} dias` : "Consulta numérica"}${sales?.cursor_number != null || sales?.latest_number != null ? ` · cursor ${sales?.cursor_number ?? "—"}/${sales?.latest_number ?? "—"}` : ""}`
        : "Rotina de vendas ainda não iniciada";

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
        last_checked_at: maxDate(health?.last_checked_at, purchaseLast, salesLast, fiscal?.last_sync_at),
        purchase: purchaseSnapshot,
        sales: salesSnapshot,
        metrics: {
          period_days: days,
          period_start: periodStart,
          period_end: periodEnd,
          previous_start: previousStart,
          purchases: metrics.purchases,
          sales: metrics.sales,
        },
        technical_window: {
          purchases: technicalPurchases,
          sales: technicalSales,
        },
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

    return json({
      ok: true,
      generated_at: periodEnd,
      period_days: days,
      summary,
      cadence: CADENCE,
      companies: companyHealth,
    });
  } catch (error) {
    console.error("admin-fiscal-health failed", error);
    return json({ error: error instanceof Error ? error.message : "Não foi possível carregar a saúde fiscal" }, 500);
  }
});
