import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { bounds, getInternalToken, manifestAndRecover, purchaseVerification, salesVerification } from "./verify.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json", "cache-control": "no-store" },
});
const ageMinutes = (value?: string | null) => value && Number.isFinite(Date.parse(value)) ? Math.max(0, (Date.now() - Date.parse(value)) / 60000) : Infinity;
const emptyMetric = () => ({ count: 0, value: 0, full_xml: 0, pending_xml: 0, previous_count: 0, previous_value: 0, count_delta_percent: 0, value_delta_percent: 0, last_document_at: null as string | null });

async function requireAdmin(admin: any, req: Request) {
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado" }, 401);
  const { data } = await admin.auth.getUser(token);
  if (!data.user) return json({ error: "Não autenticado" }, 401);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", data.user.id).eq("role", "admin").maybeSingle();
  return role ? null : json({ error: "Acesso exclusivo para administradores" }, 403);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  if (req.method !== "POST") return json({ error: "Método não permitido" }, 405);

  const base = Deno.env.get("SUPABASE_URL");
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !service) return json({ error: "Configuração ausente" }, 500);
  const admin = createClient(base, service, { auth: { persistSession: false, autoRefreshToken: false } });
  const denied = await requireAdmin(admin, req);
  if (denied) return denied;

  try {
    const body = await req.json().catch(() => ({})) as any;
    const action = String(body.action || "status");
    const live = body.verify === true || action === "verify";
    const range = bounds();
    const internalToken = await getInternalToken(admin);

    if (action === "repair_manifestation") {
      const companyId = String(body.company_id || "");
      if (!companyId) return json({ error: "company_id obrigatório" }, 400);
      const results = await manifestAndRecover(admin, base, internalToken, companyId, range);
      return json({ ok: true, attempted: results.length, recovered: results.filter((item: any) => item.recovered).length, results });
    }

    const [offices, fiscals, certs, credentials, purchaseStates, salesStates, healthRows] = await Promise.all([
      admin.from("companies").select("id,company_name,trade_name,cnpj").order("company_name"),
      admin.from("fiscal_companies").select("id,company_id,cnpj,razao_social,nome_fantasia,status,uf,last_sync_at").order("updated_at", { ascending: false }),
      admin.from("fiscal_certificates").select("company_id,valid_until,is_active,created_at").eq("is_active", true).order("created_at", { ascending: false }),
      admin.from("fiscal_state_credentials").select("company_id,uf,is_active,last_verified_at,last_verification_status").eq("is_active", true),
      admin.from("fiscal_purchase_sync_state").select("*"),
      admin.from("fiscal_sales_sync_state").select("*"),
      admin.from("fiscal_sync_health").select("*"),
    ]);
    for (const result of [offices, fiscals, certs, credentials, purchaseStates, salesStates, healthRows]) if (result.error) throw result.error;

    const officeById = new Map((offices.data || []).map((row: any) => [String(row.id), row]));
    const certByFiscal = new Map<string, any>();
    for (const row of certs.data || []) if (!certByFiscal.has(String(row.company_id))) certByFiscal.set(String(row.company_id), row);
    const credentialByFiscal = new Map((credentials.data || []).filter((row: any) => String(row.uf || "").toUpperCase() === "AL").map((row: any) => [String(row.company_id), row]));
    const purchaseByFiscal = new Map((purchaseStates.data || []).map((row: any) => [String(row.company_id), row]));
    const salesByFiscal = new Map((salesStates.data || []).map((row: any) => [String(row.company_id), row]));
    const healthByFiscal = new Map((healthRows.data || []).map((row: any) => [String(row.company_id), row]));

    const monitored = (fiscals.data || []).filter((fiscal: any) => {
      const id = String(fiscal.id);
      return String(fiscal.status || "").toLowerCase() === "ativa" && certByFiscal.has(id) && (purchaseByFiscal.has(id) || salesByFiscal.has(id));
    });

    const companyHealth: any[] = [];
    for (const fiscal of monitored) {
      const fiscalId = String(fiscal.id);
      const office: any = officeById.get(String(fiscal.company_id)) || { id: fiscal.company_id || fiscalId, company_name: fiscal.razao_social, trade_name: fiscal.nome_fantasia, cnpj: fiscal.cnpj };
      const cert = certByFiscal.get(fiscalId);
      const purchaseState: any = purchaseByFiscal.get(fiscalId);
      let salesState: any = salesByFiscal.get(fiscalId);
      const oldHealth: any = healthByFiscal.get(fiscalId);
      const hasStateCredentials = String(fiscal.uf || "").toUpperCase() !== "AL" || credentialByFiscal.has(fiscalId);
      const expired = Boolean(cert?.valid_until && Date.parse(`${cert.valid_until}T23:59:59Z`) < Date.now());

      let purchase: any;
      try {
        purchase = await purchaseVerification(admin, base, internalToken, fiscal, hasStateCredentials, live, range);
      } catch (error) {
        purchase = { source: "Base fiscal", source_checked: false, source_error: error instanceof Error ? error.message : String(error), expected_nfe: null, stored_nfe: 0, nfse_count: 0, xml_ready: 0, xml_total: 0, pending_xml: 0, requires_manifestation: 0, manifestation_sent: 0, missing_count: 0, auto_repaired: 0 };
      }

      const salesEnabled = Boolean(salesState && hasStateCredentials && !String(salesState.status || "").startsWith("waiting_"));
      let sales: any = null;
      if (salesEnabled) {
        try {
          sales = await salesVerification(admin, fiscalId, range.start, range.next, salesState);
          if (sales.repaired_state) {
            const { data } = await admin.from("fiscal_sales_sync_state").select("*").eq("company_id", fiscalId).maybeSingle();
            if (data) salesState = data;
          }
        } catch (error) {
          sales = { expected: null, stored: 0, xml_ready: 0, pending_xml: 0, sequence_total: Number(salesState?.latest_number || 0), sequence_resolved: Number(salesState?.reconciliation_resolved || 0), sequence_complete: false, error: error instanceof Error ? error.message : String(error) };
        }
      }

      const purchaseCountOk = purchase.expected_nfe == null || Number(purchase.stored_nfe) === Number(purchase.expected_nfe);
      const purchaseXmlOk = Number(purchase.pending_xml || 0) === 0;
      const salesCountOk = !salesEnabled || (sales?.expected != null && Number(sales.stored) === Number(sales.expected));
      const salesXmlOk = !salesEnabled || Number(sales?.pending_xml || 0) === 0;
      const countMismatch = !purchaseCountOk || !salesCountOk;
      const xmlMismatch = !purchaseXmlOk || !salesXmlOk;
      const repairing = Number(purchase.auto_repaired || 0) > 0 || Number(purchase.manifestation_sent || 0) > 0;
      const needsManifestation = Number(purchase.requires_manifestation || 0) > 0;
      const persistentPurchase = Number(purchaseState?.consecutive_failures || 0) >= 3 && (countMismatch || xmlMismatch);
      const persistentSales = Boolean(salesState?.last_error) && Number(oldHealth?.sales_failure_count || 0) >= 3 && (countMismatch || xmlMismatch);

      let state: "healthy" | "attention" | "error" = "healthy";
      let stateLabel = "Tudo certo";
      let stateDetail = "As quantidades conferem e os documentos disponíveis estão íntegros.";
      let reasonCode = "VERIFIED_OK";
      if (expired) {
        state = "error"; stateLabel = "Certificado vencido"; stateDetail = "A extração parou porque o certificado A1 venceu."; reasonCode = "CERTIFICATE_EXPIRED";
      } else if (persistentPurchase || persistentSales) {
        state = "error"; stateLabel = "Falha persistente"; stateDetail = "O sistema tentou corrigir automaticamente, mas a divergência continua."; reasonCode = "PERSISTENT_FAILURE";
      } else if (needsManifestation) {
        state = "attention"; stateLabel = "Ação necessária"; stateDetail = `${purchase.requires_manifestation} nota(s) de compra precisam de manifestação para a SEFAZ liberar o XML.`; reasonCode = "MANIFESTATION_REQUIRED";
      } else if (countMismatch || xmlMismatch || repairing) {
        state = "attention"; stateLabel = repairing ? "Corrigindo automaticamente" : "Conferência pendente"; stateDetail = countMismatch ? "A quantidade encontrada na fonte ainda não bate com a quantidade salva." : "Há documento(s) sem XML integral e o sistema está tentando recuperar."; reasonCode = countMismatch ? "COUNT_MISMATCH" : "XML_PENDING";
      } else if (live && hasStateCredentials && purchase.source_error) {
        state = "attention"; stateLabel = "Fonte indisponível agora"; stateDetail = "Os dados locais estão consistentes, mas a conferência ao vivo com a fonte fiscal não respondeu nesta tentativa."; reasonCode = "SOURCE_UNAVAILABLE";
      }

      if (state === "healthy" && salesEnabled && oldHealth && (Number(oldHealth.sales_failure_count || 0) > 0 || oldHealth.sales_xml_stall_since || oldHealth.sales_reconciliation_stall_since)) {
        await admin.from("fiscal_sync_health").update({ sales_status: "healthy", sales_failure_count: 0, sales_xml_stall_since: null, sales_reconciliation_stall_since: null, sales_detail_stall_since: null, last_checked_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("company_id", fiscalId);
      }

      const purchaseMetric = emptyMetric();
      purchaseMetric.count = Number(purchase.expected_nfe ?? purchase.stored_nfe) + Number(purchase.nfse_count || 0);
      purchaseMetric.full_xml = Number(purchase.xml_ready || 0);
      purchaseMetric.pending_xml = Number(purchase.pending_xml || 0);
      purchaseMetric.last_document_at = purchaseState?.last_completed_at || null;
      const salesMetric = emptyMetric();
      salesMetric.count = Number(sales?.expected ?? sales?.stored ?? 0);
      salesMetric.full_xml = Number(sales?.xml_ready || 0);
      salesMetric.pending_xml = Number(sales?.pending_xml || 0);
      salesMetric.last_document_at = salesState?.updated_at || null;

      const purchaseFresh = purchaseState ? ageMinutes(purchaseState.last_completed_at || purchaseState.updated_at) <= 240 : false;
      const salesFresh = !salesEnabled || ageMinutes(salesState?.last_completed_at || salesState?.updated_at) <= 360;
      companyHealth.push({
        office_company_id: String(office.id || fiscal.company_id || fiscalId),
        fiscal_company_id: fiscalId,
        company_name: office.company_name || fiscal.razao_social,
        trade_name: office.trade_name || fiscal.nome_fantasia || null,
        cnpj: office.cnpj || fiscal.cnpj || null,
        uf: fiscal.uf || null,
        state,
        state_label: stateLabel,
        state_detail: stateDetail,
        reason_code: reasonCode,
        capture_enabled: true,
        can_start: false,
        certificate_status: expired ? "expired" : "valid",
        certificate_valid_until: cert?.valid_until || null,
        has_state_credentials: hasStateCredentials,
        last_checked_at: new Date().toISOString(),
        purchase: purchaseState ? { status: purchaseState.status || null, label: purchase.source_checked && purchaseCountOk ? "Quantidade conferida" : purchaseFresh && !purchaseState.last_error ? "Em dia" : "Verificando", last_started_at: purchaseState.last_started_at || null, last_completed_at: purchaseState.last_completed_at || purchaseState.updated_at || null, last_failed_at: purchaseState.last_failed_at || null, next_scheduled_at: purchaseState.next_scheduled_at || null, last_error: purchaseState.last_error || null, error_scope: null, failure_count: Number(purchaseState.consecutive_failures || 0), fresh: purchaseFresh, paused: Boolean(purchaseState.paused), last_status_code: purchaseState.last_status_code || null, last_status_message: purchaseState.last_status_message || null } : null,
        sales: salesState ? { status: salesState.status || null, label: !salesEnabled ? "Não configurada" : salesCountOk && salesXmlOk ? "Quantidade conferida" : "Verificando", last_started_at: salesState.last_started_at || null, last_completed_at: salesState.last_completed_at || salesState.updated_at || null, next_scheduled_at: salesState.next_scheduled_at || null, last_error: salesState.last_error || null, error_scope: null, failure_count: 0, fresh: salesFresh, paused: Boolean(salesState.paused), latest_number: salesState.latest_number ?? null, cursor_number: salesState.cursor_number ?? null, reconciliation_total: sales?.sequence_total ?? salesState.reconciliation_total ?? null, reconciliation_resolved: sales?.sequence_resolved ?? salesState.reconciliation_resolved ?? null, reconciliation_pending: sales?.sequence_complete ? 0 : salesState.reconciliation_pending ?? null, xml_expected: sales?.expected ?? null, xml_saved: sales?.xml_ready ?? null, xml_pending: sales?.pending_xml ?? null, detail_expected: salesState.detail_expected ?? null, detail_saved: salesState.detail_saved ?? null, detail_pending: salesState.detail_pending ?? null } : null,
        metrics: { period_days: 30, period_start: range.start, period_end: range.next, previous_start: range.previous, purchases: purchaseMetric, sales: salesMetric },
        technical_window: { purchases: purchase.source_checked ? `Conferência atual pela SEFAZ/AL · ${purchase.expected_nfe ?? 0} NF-e de terceiros na fonte` : "Conferência pela rotina fiscal e documentos já capturados", sales: salesEnabled ? `Sequência fiscal ${sales?.sequence_resolved ?? 0}/${sales?.sequence_total ?? 0}` : "Busca de vendas não configurada para esta empresa" },
        timeline: [],
        verification: {
          checked_at: new Date().toISOString(),
          live,
          status: state === "healthy" ? "ok" : state === "error" ? "error" : repairing ? "repairing" : "attention",
          purchases: { ...purchase, message: needsManifestation ? `${purchase.requires_manifestation} XML aguardam manifestação.` : purchaseCountOk && purchaseXmlOk ? "Quantidade e XML conferidos." : "O sistema identificou uma diferença e iniciou a correção." },
          sales: salesEnabled ? { ...sales, enabled: true, message: salesCountOk && salesXmlOk ? "Quantidade e XML conferidos." : "A conferência encontrou uma diferença." } : { enabled: false, expected: null, stored: 0, xml_ready: 0, pending_xml: 0, sequence_total: 0, sequence_resolved: 0, message: "A extração de vendas não está configurada para esta empresa." },
        },
      });
    }

    const summary = {
      total: companyHealth.length,
      monitored: companyHealth.length,
      healthy: companyHealth.filter((row) => row.state === "healthy").length,
      ready: 0,
      attention: companyHealth.filter((row) => row.state === "attention").length,
      error: companyHealth.filter((row) => row.state === "error").length,
      neutral: 0,
    };
    return json({ ok: true, generated_at: new Date().toISOString(), period_days: 30, summary, cadence: { purchases_minutes: 10, sales_hours: 3, watchdog_minutes: 10, xml_backfill_minutes: 1 }, company_health: companyHealth });
  } catch (error) {
    console.error("admin-fiscal-health-v2", error);
    return json({ error: error instanceof Error ? error.message : "Não foi possível conferir a saúde fiscal" }, 500);
  }
});
