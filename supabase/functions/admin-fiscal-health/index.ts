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

type DocMetric = {
  company_id: string;
  total: number;
  full: number;
  pending: number;
  last_document_at: string | null;
};

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

  const [purchases, sales, health, companies] = await Promise.all([
    admin
      .from("fiscal_purchase_sync_state")
      .select("company_id,paused,status,consecutive_failures,last_status_code,last_status_message,last_started_at,last_completed_at,last_failed_at,last_error,next_scheduled_at,updated_at")
      .order("updated_at", { ascending: false }),
    admin
      .from("fiscal_sales_sync_state")
      .select("company_id,paused,status,latest_number,cursor_number,scanned_numbers,found_documents,last_started_at,last_completed_at,next_scheduled_at,last_error,updated_at,reconciliation_total,reconciliation_resolved,reconciliation_pending,reconciliation_complete,reconciliation_started_at,reconciliation_completed_at,xml_expected,xml_saved,xml_pending,xml_failed,xml_complete,detail_expected,detail_saved,detail_pending,detail_complete")
      .order("updated_at", { ascending: false }),
    admin
      .from("fiscal_sync_health")
      .select("company_id,purchases_status,sales_status,purchases_last_checked_at,sales_last_checked_at,purchases_last_progress_at,sales_last_progress_at,purchases_last_recovery_at,sales_last_recovery_at,purchases_failure_count,sales_failure_count,recovery_count,last_recovery_reason,last_checked_at,updated_at,sales_reconciliation_stall_since,sales_xml_stall_since,sales_detail_stall_since")
      .order("updated_at", { ascending: false }),
    admin
      .from("fiscal_companies")
      .select("id,cnpj,razao_social,nome_fantasia,status,last_sync_at")
      .neq("status", "inativa"),
  ]);

  if (purchases.error || sales.error || health.error || companies.error) {
    console.error("admin-fiscal-health query failed", {
      purchases: purchases.error?.message,
      sales: sales.error?.message,
      health: health.error?.message,
      companies: companies.error?.message,
    });
    return json({ error: "Não foi possível carregar os logs fiscais" }, 500);
  }

  const companyIds = [...new Set([
    ...(purchases.data ?? []).map((row: any) => String(row.company_id)),
    ...(sales.data ?? []).map((row: any) => String(row.company_id)),
  ].filter(Boolean))];

  const documentMetrics: DocMetric[] = await Promise.all(companyIds.map(async (companyId) => {
    const base = () => admin
      .from("fiscal_dfe_documents")
      .select("id", { count: "exact", head: true })
      .eq("company_id", companyId)
      .neq("document_kind", "evento");

    const [totalResult, fullResult, latestResult] = await Promise.all([
      base(),
      base().eq("full_xml", true).not("xml", "is", null),
      admin
        .from("fiscal_dfe_documents")
        .select("updated_at")
        .eq("company_id", companyId)
        .neq("document_kind", "evento")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const total = totalResult.count ?? 0;
    const full = fullResult.count ?? 0;
    return {
      company_id: companyId,
      total,
      full,
      pending: Math.max(0, total - full),
      last_document_at: latestResult.data?.updated_at ?? null,
    };
  }));

  return json({
    purchases: purchases.data ?? [],
    sales: sales.data ?? [],
    health: health.data ?? [],
    companies: companies.data ?? [],
    documents: documentMetrics,
    cadence: {
      purchases_minutes: 10,
      sales_hours: 3,
      watchdog_minutes: 10,
      xml_backfill_minutes: 1,
    },
    generated_at: new Date().toISOString(),
  });
});
