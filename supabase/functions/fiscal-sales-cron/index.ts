import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const numericNote = (value: unknown) => {
  const parsed = Number(String(value ?? "").replace(/\D/g, ""));
  return Number.isFinite(parsed) ? parsed : 0;
};

Deno.serve(async req => {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const token = req.headers.get("x-debug-token") || "";
    const { data: internal } = await admin
      .from("_fiscal_sales_debug_token")
      .select("token")
      .eq("id", true)
      .maybeSingle();
    if (!token || token !== String(internal?.token || "")) {
      return json({ error: "unauthorized" }, 403);
    }

    const now = new Date();
    const next = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    const base = Deno.env.get("SUPABASE_URL")!;
    const headers = {
      "content-type": "application/json",
      "x-debug-token": String(internal.token),
    };

    const { data: companies, error } = await admin
      .from("fiscal_companies")
      .select("id,status,uf,fiscal_settings")
      .eq("status", "ativa")
      .eq("uf", "AL");
    if (error) throw error;

    const out: any[] = [];

    for (const company of companies || []) {
      try {
        const { data: state } = await admin
          .from("fiscal_sales_sync_state")
          .select("*")
          .eq("company_id", company.id)
          .maybeSingle();

        if (state?.paused === true || company?.fiscal_settings?.sales_sync_paused === true) {
          out.push({ company_id: company.id, status: "paused" });
          continue;
        }

        const { data: cert } = await admin
          .from("fiscal_certificates")
          .select("id")
          .eq("company_id", company.id)
          .eq("is_active", true)
          .gte("valid_until", now.toISOString().slice(0, 10))
          .limit(1)
          .maybeSingle();

        if (!cert) {
          await admin.from("fiscal_sales_sync_state").upsert({
            company_id: company.id,
            status: "waiting_certificate",
            last_error: null,
            next_scheduled_at: next.toISOString(),
            updated_at: now.toISOString(),
          });
          out.push({ company_id: company.id, status: "waiting_certificate" });
          continue;
        }

        await admin.from("fiscal_sales_sync_state").upsert({
          company_id: company.id,
          status: "running",
          last_started_at: now.toISOString(),
          last_error: null,
          next_scheduled_at: next.toISOString(),
          updated_at: now.toISOString(),
        });

        const configuredStart = String(company?.fiscal_settings?.history_start_date || "");
        const historyStart = /^\d{4}-\d{2}-\d{2}$/.test(configuredStart)
          ? configuredStart
          : null;

        let dfeQuery = admin
          .from("fiscal_dfe_documents")
          .select("note_number,issue_date")
          .eq("company_id", company.id)
          .eq("direction", "saida")
          .neq("document_kind", "evento")
          .order("issue_date", { ascending: false })
          .limit(2000);
        if (historyStart) {
          dfeQuery = dfeQuery.gte("issue_date", `${historyStart}T00:00:00Z`);
        }

        const [{ data: salesRows }, { data: dfeRows }] = await Promise.all([
          admin
            .from("fiscal_sales_documents")
            .select("document_number")
            .eq("company_id", company.id)
            .order("document_number", { ascending: false })
            .limit(2000),
          dfeQuery,
        ]);

        const maxSaved = Math.max(
          0,
          ...(salesRows || []).map((row: any) => numericNote(row.document_number))
        );
        const maxKnownDfe = Math.max(
          0,
          ...(dfeRows || []).map((row: any) => numericNote(row.note_number))
        );
        const oldLatest = Number(state?.latest_number || 0);
        const baseLatest = Math.max(oldLatest, maxSaved, maxKnownDfe);

        if (!baseLatest) {
          await admin
            .from("fiscal_sales_sync_state")
            .upsert({
              company_id: company.id,
              status: "waiting_sales_reference",
              last_error: null,
              next_scheduled_at: next.toISOString(),
              updated_at: new Date().toISOString(),
            });
          out.push({
            company_id: company.id,
            status: "waiting_sales_reference",
            reason: "no_known_sale_reference",
          });
          continue;
        }

        let discovered = baseLatest;
        let discovery: any = null;
        try {
          const response = await fetch(`${base}/functions/v1/fiscal-sales-discover-latest`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              company_id: company.id,
              base_number: baseLatest,
              lookahead: 12,
            }),
            signal: AbortSignal.timeout(60000),
          });
          discovery = await response.json().catch(() => ({}));
          if (response.ok && !discovery?.cooldown) {
            discovered = Math.max(discovered, Number(discovery?.latest || 0));
          }
        } catch (err) {
          discovery = { error: err instanceof Error ? err.message : String(err) };
        }

        const latest = Math.max(baseLatest, discovered);

        await admin.from("fiscal_sales_sync_state").upsert({
          company_id: company.id,
          status: "reconciling",
          latest_number: latest,
          cursor_number: latest,
          reconciliation_total: latest,
          reconciliation_started_at: state?.reconciliation_started_at || now.toISOString(),
          next_scheduled_at: next.toISOString(),
          last_error: null,
          updated_at: new Date().toISOString(),
        });

        const reconcileResponse = await fetch(
          `${base}/functions/v1/fiscal-sales-reconcile`,
          {
            method: "POST",
            headers,
            body: JSON.stringify({ company_id: company.id, batch: 24 }),
            signal: AbortSignal.timeout(115000),
          }
        );
        const reconciliation = await reconcileResponse.json().catch(() => ({}));
        if (!reconcileResponse.ok) {
          throw new Error(reconciliation?.error || "Falha na reconciliação");
        }

        let classification: any = null;
        try {
          const response = await fetch(
            `${base}/functions/v1/fiscal-sales-classify-gaps`,
            {
              method: "POST",
              headers,
              body: JSON.stringify({ company_id: company.id }),
              signal: AbortSignal.timeout(60000),
            }
          );
          classification = await response.json().catch(() => ({}));
          if (!response.ok) {
            classification = {
              error: classification?.error || "Falha ao classificar lacunas",
            };
          }
        } catch (err) {
          classification = { error: err instanceof Error ? err.message : String(err) };
        }

        const completedAt = new Date().toISOString();
        await admin
          .from("fiscal_sales_sync_state")
          .update({
            last_completed_at: completedAt,
            last_error: null,
            next_scheduled_at: next.toISOString(),
            updated_at: completedAt,
          })
          .eq("company_id", company.id);

        await admin
          .from("fiscal_companies")
          .update({ last_sync_at: completedAt })
          .eq("id", company.id);

        out.push({
          company_id: company.id,
          status: "ok",
          latest,
          previous_latest: oldLatest,
          seeded_from_saved_sales: maxSaved,
          seeded_from_visible_dfe: maxKnownDfe,
          discovery,
          reconciliation,
          classification,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        await admin.from("fiscal_sales_sync_state").upsert({
          company_id: company.id,
          status: "error",
          last_error: message,
          next_scheduled_at: next.toISOString(),
          updated_at: new Date().toISOString(),
        });
        out.push({ company_id: company.id, status: "error", error: message });
      }
    }

    return json({ ok: true, ran_at: now.toISOString(), companies: out });
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : String(err) }, 500);
  }
});
