import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store" },
  });

const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const noteNumber = (value: unknown) => {
  const parsed = Number(digits(value));
  return Number.isFinite(parsed) ? parsed : 0;
};

function monthCodesBetween(start: string, end: string) {
  const out: string[] = [];
  let year = Number(start.slice(0, 4));
  let month = Number(start.slice(5, 7));
  const endYear = Number(end.slice(0, 4));
  const endMonth = Number(end.slice(5, 7));
  while (year < endYear || (year === endYear && month <= endMonth)) {
    out.push(String(year).slice(-2) + String(month).padStart(2, "0"));
    month += 1;
    if (month === 13) {
      month = 1;
      year += 1;
    }
  }
  return out.slice(-6);
}

Deno.serve(async (req) => {
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const supplied = req.headers.get("x-debug-token") || "";
    const { data: internal } = await admin
      .from("_fiscal_sales_debug_token")
      .select("token")
      .eq("id", true)
      .maybeSingle();
    if (!supplied || supplied !== String(internal?.token || "")) {
      return json({ error: "unauthorized" }, 403);
    }

    const body = await req.json().catch(() => ({})) as any;
    const onlyCompanyId = String(body.company_id || "");
    const baseUrl = Deno.env.get("SUPABASE_URL")!;
    const headers = { "content-type": "application/json", "x-debug-token": supplied };
    const localToday = new Intl.DateTimeFormat("sv-SE", {
      timeZone: "America/Maceio",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    const { data: minimumHistory } = await admin.rpc("extractor_minimum_history_start");
    const historyStart = /^\d{4}-\d{2}-\d{2}$/.test(String(minimumHistory || ""))
      ? String(minimumHistory)
      : localToday.slice(0, 8) + "01";
    const historyStartMonth = historyStart.slice(2, 4) + historyStart.slice(5, 7);
    const months = monthCodesBetween(historyStart, localToday);

    const { data: links, error: linksError } = await admin
      .from("extractor_companies")
      .select("fiscal_company_id")
      .eq("status", "active");
    if (linksError) throw linksError;
    const extractorIds = [...new Set((links || [])
      .map((row: any) => String(row.fiscal_company_id || ""))
      .filter(Boolean))];
    if (!extractorIds.length) return json({ ok: true, companies: [] });

    let companyQuery = admin
      .from("fiscal_companies")
      .select("id,cnpj,razao_social,status,uf")
      .in("id", extractorIds)
      .eq("status", "ativa")
      .eq("uf", "AL")
      .order("razao_social");
    if (onlyCompanyId) companyQuery = companyQuery.eq("id", onlyCompanyId);
    const { data: companies, error: companiesError } = await companyQuery;
    if (companiesError) throw companiesError;

    const output: any[] = [];
    for (const company of companies || []) {
      const companyId = String(company.id);
      const { data: leased, error: leaseError } = await admin.rpc(
        "claim_fiscal_sales_worker_lease",
        { p_company_id: companyId, p_worker: "nfe55", p_seconds: 240 }
      );
      if (leaseError) throw leaseError;
      if (!leased) {
        output.push({ company_id: companyId, status: "locked" });
        continue;
      }

      try {
        const [{ data: syncState, error: stateError }, { data: salesRows }, { data: eventRows }] =
          await Promise.all([
            admin
              .from("fiscal_sales_sync_state")
              .select("paused,nfe55_series_states")
              .eq("company_id", companyId)
              .maybeSingle(),
            admin
              .from("fiscal_sales_documents")
              .select("series,document_number,issue_date")
              .eq("company_id", companyId)
              .eq("model", "55")
              .order("issue_date", { ascending: false })
              .limit(5000),
            admin
              .from("fiscal_dfe_events")
              .select("access_key,event_at")
              .eq("company_id", companyId)
              .order("event_at", { ascending: false })
              .limit(5000),
          ]);
        if (stateError) throw stateError;
        if (syncState?.paused) {
          output.push({ company_id: companyId, status: "paused" });
          continue;
        }

        const companyCnpj = digits(company.cnpj);
        const candidates = new Map<string, { numbers: number[]; months: string[] }>();
        const add = (seriesValue: unknown, numberValue: unknown, issueValue: unknown) => {
          const series = String(Math.max(1, Math.min(999, Number(seriesValue || 1))));
          const number = noteNumber(numberValue);
          const current = candidates.get(series) || { numbers: [], months: [] };
          if (number > 0 && !current.numbers.includes(number)) current.numbers.push(number);
          const issue = String(issueValue || "");
          if (/^\d{4}-\d{2}/.test(issue)) {
            const month = issue.slice(2, 4) + issue.slice(5, 7);
            if (!current.months.includes(month)) current.months.push(month);
          }
          candidates.set(series, current);
        };
        for (const row of salesRows || []) add(row.series, row.document_number, row.issue_date);
        for (const row of eventRows || []) {
          const key = digits(row.access_key);
          if (
            key.length !== 44 ||
            key.slice(6, 20) !== companyCnpj ||
            key.slice(20, 22) !== "55"
          ) continue;
          add(Number(key.slice(22, 25)), Number(key.slice(25, 34)), row.event_at);
        }
        if (!candidates.size) candidates.set("1", { numbers: [], months: [] });

        const states = { ...(syncState?.nfe55_series_states || {}) } as Record<string, any>;
        const selected = [...candidates.entries()]
          .sort(([seriesA], [seriesB]) => {
            const timeA = Date.parse(String(states[seriesA]?.last_completed_at || "1970-01-01"));
            const timeB = Date.parse(String(states[seriesB]?.last_completed_at || "1970-01-01"));
            return timeA - timeB || Number(seriesA) - Number(seriesB);
          })[0];
        const [series, candidate] = selected;
        const previous = states[series] || {};
        const observed = candidate.numbers.filter((value) => value > 0);
        const observedLatest = Math.max(0, ...observed);
        const observedFirst = Math.min(...observed, Number.POSITIVE_INFINITY);
        let latest = Math.max(Number(previous.latest_number || 0), observedLatest);
        let cursor = Math.max(Number(previous.cursor_number || 0), latest);
        let firstNumber = Number(previous.initial_floor_number || 0);
        if (!firstNumber && Number.isFinite(observedFirst)) firstNumber = observedFirst;
        if (!firstNumber) firstNumber = 1;
        const preferredMonth = candidate.months[0] || months[months.length - 1] || historyStartMonth;

        const callDiscovery = async (payload: Record<string, unknown>) => {
          const response = await fetch(`${baseUrl}/functions/v1/fiscal-sales-discover-latest`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              company_id: companyId,
              model: "55",
              series: Number(series),
              months,
              preferred_month: preferredMonth,
              lookahead: 12,
              ...payload,
            }),
            signal: AbortSignal.timeout(90000),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result?.error || "nfe55_discovery_failed");
          return result;
        };

        const previousRuns = Number(previous.run_count || 0);
        const progressiveCycle =
          latest > 0 &&
          Number(previous.cursor_number || 0) > latest + 11 &&
          previousRuns % 2 === 1;
        const scanMode = progressiveCycle ? "progressive" : latest > 0 ? "frontier" : "bootstrap";
        const discovery = progressiveCycle
          ? await callDiscovery({
              base_number: latest,
              scan_start: Number(previous.cursor_number) + 1,
            })
          : latest > 0
            ? await callDiscovery({ base_number: latest, scan_start: latest + 1 })
            : await callDiscovery({ base_number: 0, bootstrap_start: Math.max(1, cursor + 1) });
        const discoveries = [discovery];
        latest = Math.max(latest, Number(discovery?.latest || 0));
        cursor = Math.max(cursor, Number(discovery?.scanned_through || 0));

        const hits = discoveries.flatMap((item) => Array.isArray(item?.hits) ? item.hits : []);
        for (const hit of hits) {
          await admin.from("fiscal_sales_reconciliation").upsert({
            company_id: companyId,
            model: "55",
            series,
            note_number: Number(hit.note_number),
            status: "pending",
            access_key: String(hit.access_key),
            month_code: String(hit.month),
            xmotivo: "Chave oficial descoberta pela enumeração automática.",
            updated_at: new Date().toISOString(),
          }, { onConflict: "company_id,model,series,note_number" });
        }

        let reconciliation: any = null;
        if (latest > 0) {
          const response = await fetch(`${baseUrl}/functions/v1/fiscal-sales-reconcile`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              company_id: companyId,
              model: "55",
              series: Number(series),
              start_number: firstNumber,
              latest_number: latest,
              history_start_month: historyStartMonth,
              series_scoped: true,
              batch: 30,
            }),
            signal: AbortSignal.timeout(115000),
          });
          reconciliation = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(reconciliation?.error || "nfe55_reconciliation_failed");
        }

        const completedAt = new Date().toISOString();
        states[series] = {
          latest_number: latest,
          cursor_number: cursor,
          initial_floor_number: firstNumber,
          frontier_scanned_through: scanMode === "frontier"
            ? Number(discovery?.scanned_through || latest)
            : Number(previous.frontier_scanned_through || latest),
          miss_streak: Number(discovery?.miss_streak || 0),
          scan_mode: scanMode,
          run_count: previousRuns + 1,
          cooldown: Boolean(discoveries.some((item) => item?.cooldown)),
          status: reconciliation?.counts?.pending || reconciliation?.counts?.error
            ? "reconciling"
            : "monitoring",
          counts: reconciliation?.counts || previous.counts || null,
          last_error: null,
          last_completed_at: completedAt,
        };
        const { error: updateError } = await admin
          .from("fiscal_sales_sync_state")
          .update({ nfe55_series_states: states, updated_at: completedAt })
          .eq("company_id", companyId);
        if (updateError) throw updateError;

        output.push({
          company_id: companyId,
          status: "ok",
          model: "55",
          series,
          first_number: firstNumber,
          latest_number: latest,
          cursor_number: cursor,
          discoveries,
          reconciliation,
        });
      } catch (error) {
        output.push({
          company_id: companyId,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      } finally {
        try {
          await admin.rpc("release_fiscal_sales_worker_lease", {
            p_company_id: companyId,
            p_worker: "nfe55",
          });
        } catch {}
      }
    }

    return json({ ok: true, ran_at: new Date().toISOString(), companies: output });
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
