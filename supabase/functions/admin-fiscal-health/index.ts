import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null);
  const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const url = Deno.env.get("SUPABASE_URL");
  if (!service || !url) return json({ error: "Configuração ausente" }, 500);
  const admin = createClient(url, service);
  const token = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Não autenticado" }, 401);
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ error: "Não autenticado" }, 401);
  const { data: role } = await admin.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
  if (!role) return json({ error: "Acesso exclusivo para administradores" }, 403);
  const [purchases, sales, health] = await Promise.all([
    admin.from("fiscal_purchase_sync_state").select("company_id,status,consecutive_failures,last_status_code,last_status_message,last_started_at,last_completed_at,last_failed_at,last_error,next_scheduled_at,updated_at").order("updated_at", { ascending: false }),
    admin.from("fiscal_sales_sync_state").select("company_id,status,paused,latest_number,cursor_number,reconciliation_total,reconciliation_resolved,reconciliation_pending,reconciliation_complete,last_error,updated_at").order("updated_at", { ascending: false }),
    admin.from("fiscal_sync_health").select("company_id,purchases_status,sales_status,purchases_last_success_at,sales_last_success_at,purchases_failure_count,sales_failure_count,updated_at").order("updated_at", { ascending: false }),
  ]);
  if (purchases.error || sales.error || health.error) return json({ error: "Não foi possível carregar os logs fiscais" }, 500);
  return json({ purchases: purchases.data ?? [], sales: sales.data ?? [], health: health.data ?? [], generated_at: new Date().toISOString() });
});
