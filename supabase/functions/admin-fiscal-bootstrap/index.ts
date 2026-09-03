import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json" },
});
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const monthCode = (date: Date) => `${String(date.getUTCFullYear()).slice(-2)}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const auth = req.headers.get("authorization") || "";
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => row.role === "admin")) {
      return json({ error: "Acesso exclusivo para administradores" }, 403);
    }

    const body = await req.json().catch(() => ({})) as any;
    const action = String(body.action || "status");

    if (action === "status") {
      const { data: companies, error: companiesError } = await admin
        .from("companies")
        .select("id,company_name,trade_name,cnpj")
        .order("company_name");
      if (companiesError) throw companiesError;

      const { data: fiscalCompanies, error: fiscalError } = await admin
        .from("fiscal_companies")
        .select("id,company_id,cnpj,status,uf,last_sync_at");
      if (fiscalError) throw fiscalError;

      const fiscalIds = (fiscalCompanies || []).map((row: any) => row.id);
      const [certResult, credentialResult, purchaseResult, salesResult, docsResult, salesDocsResult] = await Promise.all([
        fiscalIds.length
          ? admin.from("fiscal_certificates").select("company_id,valid_until,is_active").in("company_id", fiscalIds).eq("is_active", true)
          : Promise.resolve({ data: [], error: null } as any),
        fiscalIds.length
          ? admin.from("fiscal_state_credentials").select("company_id,uf,is_active").in("company_id", fiscalIds).eq("is_active", true)
          : Promise.resolve({ data: [], error: null } as any),
        fiscalIds.length
          ? admin.from("fiscal_purchase_sync_state").select("company_id,status,last_completed_at,last_error").in("company_id", fiscalIds)
          : Promise.resolve({ data: [], error: null } as any),
        fiscalIds.length
          ? admin.from("fiscal_sales_sync_state").select("company_id,status,last_completed_at,last_error,initial_backfill_done,backfill_days").in("company_id", fiscalIds)
          : Promise.resolve({ data: [], error: null } as any),
        fiscalIds.length
          ? admin.from("fiscal_dfe_documents").select("company_id").in("company_id", fiscalIds).limit(10000)
          : Promise.resolve({ data: [], error: null } as any),
        fiscalIds.length
          ? admin.from("fiscal_sales_documents").select("company_id").in("company_id", fiscalIds).limit(10000)
          : Promise.resolve({ data: [], error: null } as any),
      ]);

      const fiscalByOffice = new Map((fiscalCompanies || []).filter((row: any) => row.company_id).map((row: any) => [row.company_id, row]));
      const certByFiscal = new Map((certResult.data || []).map((row: any) => [row.company_id, row]));
      const credentialByFiscal = new Map((credentialResult.data || []).filter((row: any) => row.uf === "AL").map((row: any) => [row.company_id, row]));
      const purchaseByFiscal = new Map((purchaseResult.data || []).map((row: any) => [row.company_id, row]));
      const salesByFiscal = new Map((salesResult.data || []).map((row: any) => [row.company_id, row]));
      const purchaseCounts = new Map<string, number>();
      for (const row of docsResult.data || []) purchaseCounts.set(row.company_id, (purchaseCounts.get(row.company_id) || 0) + 1);
      const salesCounts = new Map<string, number>();
      for (const row of salesDocsResult.data || []) salesCounts.set(row.company_id, (salesCounts.get(row.company_id) || 0) + 1);

      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const rows = (companies || []).map((company: any) => {
        const registrationPending = digits(company.cnpj).length !== 14;
        const fiscal = fiscalByOffice.get(company.id) as any;
        const cert = fiscal ? certByFiscal.get(fiscal.id) as any : null;
        const credential = fiscal ? credentialByFiscal.get(fiscal.id) as any : null;
        const certExpiry = cert?.valid_until ? new Date(`${cert.valid_until}T23:59:59Z`) : null;
        const hasValidCertificate = Boolean(cert && (!certExpiry || certExpiry.getTime() >= today.getTime()));
        const hasStateCredentials = Boolean(credential);
        const purchaseState = fiscal ? purchaseByFiscal.get(fiscal.id) as any : null;
        const salesState = fiscal ? salesByFiscal.get(fiscal.id) as any : null;
        const started = Boolean(purchaseState || salesState);

        let readiness = "not_configured";
        let label = "Fiscal não configurado";
        let detail = "Cadastre a configuração fiscal e o certificado A1.";
        let canStart = false;

        if (registrationPending) {
          readiness = "registration_pending";
          label = "Cadastro pendente";
          detail = "Faltam dados obrigatórios para concluir o cadastro.";
        } else if (!fiscal || fiscal.status !== "ativa") {
          readiness = "not_configured";
        } else if (!hasValidCertificate) {
          readiness = "missing_certificate";
          label = "Sem certificado A1";
          detail = "Importe um certificado A1 válido para liberar a extração.";
        } else if (String(fiscal.uf || "").toUpperCase() === "AL" && !hasStateCredentials) {
          readiness = "missing_state_credentials";
          label = "Falta acesso SEFAZ/AL";
          detail = "Compras podem usar o A1, mas a extração completa de vendas exige o acesso estadual configurado.";
        } else if (!started) {
          readiness = "ready";
          label = "Pronta para iniciar";
          detail = "A empresa está apta para a primeira extração fiscal.";
          canStart = true;
        } else {
          const statuses = [purchaseState?.status, salesState?.status].filter(Boolean).map(String);
          const busy = statuses.some((status) => ["queued", "running", "reconciling", "bootstrap_window", "retrying"].includes(status));
          readiness = busy ? "starting" : "active";
          label = busy ? "Extração em andamento" : "Extração fiscal ativa";
          detail = busy ? "A busca de documentos está em processamento." : "Compras e vendas estão vinculadas aos workers fiscais.";
        }

        return {
          office_company_id: company.id,
          fiscal_company_id: fiscal?.id || null,
          readiness,
          label,
          detail,
          can_start: canStart,
          has_valid_certificate: hasValidCertificate,
          certificate_valid_until: cert?.valid_until || null,
          has_state_credentials: hasStateCredentials,
          purchase_status: purchaseState?.status || null,
          sales_status: salesState?.status || null,
          purchase_documents: fiscal ? purchaseCounts.get(fiscal.id) || 0 : 0,
          sales_documents: fiscal ? salesCounts.get(fiscal.id) || 0 : 0,
          last_sync_at: fiscal?.last_sync_at || purchaseState?.last_completed_at || salesState?.last_completed_at || null,
        };
      });

      return json({ ok: true, companies: rows });
    }

    if (action === "start") {
      const officeCompanyId = String(body.company_id || "");
      if (!officeCompanyId) return json({ error: "Empresa não informada" }, 400);

      const { data: company } = await admin
        .from("companies")
        .select("id,company_name,cnpj")
        .eq("id", officeCompanyId)
        .maybeSingle();
      if (!company || digits(company.cnpj).length !== 14) return json({ error: "Cadastro da empresa incompleto" }, 400);

      const { data: fiscal } = await admin
        .from("fiscal_companies")
        .select("id,status,uf")
        .eq("company_id", officeCompanyId)
        .maybeSingle();
      if (!fiscal || fiscal.status !== "ativa") return json({ error: "Configuração fiscal ativa não encontrada" }, 409);

      const [{ data: cert }, { data: credential }, { data: purchaseState }, { data: salesState }] = await Promise.all([
        admin.from("fiscal_certificates").select("id,valid_until").eq("company_id", fiscal.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        admin.from("fiscal_state_credentials").select("id").eq("company_id", fiscal.id).eq("uf", "AL").eq("is_active", true).limit(1).maybeSingle(),
        admin.from("fiscal_purchase_sync_state").select("company_id").eq("company_id", fiscal.id).maybeSingle(),
        admin.from("fiscal_sales_sync_state").select("company_id").eq("company_id", fiscal.id).maybeSingle(),
      ]);
      if (!cert) return json({ error: "Certificado A1 ativo não encontrado" }, 409);
      if (cert.valid_until && new Date(`${cert.valid_until}T23:59:59Z`).getTime() < Date.now()) return json({ error: "O certificado A1 está vencido" }, 409);
      if (String(fiscal.uf || "").toUpperCase() === "AL" && !credential) return json({ error: "Acesso da SEFAZ/AL ainda não está configurado para esta empresa" }, 409);
      if (purchaseState || salesState) return json({ ok: true, already_started: true, fiscal_company_id: fiscal.id });

      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const nowIso = now.toISOString();
      const historyStartMonth = monthCode(thirtyDaysAgo);

      const purchaseUpsert = await admin.from("fiscal_purchase_sync_state").upsert({
        company_id: fiscal.id,
        paused: false,
        status: "queued",
        consecutive_failures: 0,
        last_error: null,
        next_scheduled_at: nowIso,
        updated_at: nowIso,
      });
      if (purchaseUpsert.error) throw purchaseUpsert.error;

      const salesUpsert = await admin.from("fiscal_sales_sync_state").upsert({
        company_id: fiscal.id,
        paused: false,
        status: "queued",
        backfill_days: 30,
        initial_backfill_done: false,
        reconciliation_complete: false,
        history_start_month: historyStartMonth,
        last_error: null,
        next_scheduled_at: nowIso,
        updated_at: nowIso,
      });
      if (salesUpsert.error) throw salesUpsert.error;

      const [purchaseTrigger, salesTrigger] = await Promise.all([
        admin.rpc("trigger_fiscal_purchases_cron"),
        admin.rpc("trigger_fiscal_sales_cron"),
      ]);

      return json({
        ok: true,
        fiscal_company_id: fiscal.id,
        window_days: 30,
        queued_at: nowIso,
        purchase_triggered: !purchaseTrigger.error,
        sales_triggered: !salesTrigger.error,
      });
    }

    return json({ error: "Ação inválida" }, 400);
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
