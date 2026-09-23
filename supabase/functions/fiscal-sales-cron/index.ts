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
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

const monthCodesBetween = (start: string, end: string) => {
  const out: string[] = [];
  const sy = Number(start.slice(0, 4)), sm = Number(start.slice(5, 7));
  const ey = Number(end.slice(0, 4)), em = Number(end.slice(5, 7));
  for (let y = sy; y <= ey; y += 1) {
    for (let m = 1; m <= 12; m += 1) {
      if (y === sy && m < sm) continue;
      if (y === ey && m > em) break;
      out.push(String(y).slice(-2) + String(m).padStart(2, "0"));
    }
  }
  return out.slice(-6);
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
    const next = new Date(now.getTime() + 15 * 60 * 1000);
    const [{ data: minimumHistory }, { data: localToday }] = await Promise.all([
      admin.rpc("extractor_minimum_history_start"),
      admin.rpc("extractor_local_date"),
    ]);
    const brazilNow = new Date(Date.now() - 3 * 60 * 60 * 1000);
    const fallbackStart = new Date(Date.UTC(brazilNow.getUTCFullYear(), brazilNow.getUTCMonth() - 1, 1))
      .toISOString()
      .slice(0, 10);
    const historyStart = /^\d{4}-\d{2}-\d{2}$/.test(String(minimumHistory || ""))
      ? String(minimumHistory)
      : fallbackStart;
    const historyEnd = /^\d{4}-\d{2}-\d{2}$/.test(String(localToday || ""))
      ? String(localToday)
      : brazilNow.toISOString().slice(0, 10);
    const historyStartMonth = historyStart.slice(2, 4) + historyStart.slice(5, 7);
    const discoveryMonths = monthCodesBetween(historyStart, historyEnd);
    const base = Deno.env.get("SUPABASE_URL")!;
    const headers = {
      "content-type": "application/json",
      "x-debug-token": String(internal.token),
    };

    const [{ data: companies, error }, { data: extractorLinks }] = await Promise.all([
      admin
        .from("fiscal_companies")
        .select("id,cnpj,status,uf,fiscal_settings")
        .eq("status", "ativa"),
      admin
        .from("extractor_companies")
        .select("fiscal_company_id")
        .eq("status", "active"),
    ]);
    if (error) throw error;
    const extractorCompanyIds = new Set(
      (extractorLinks || []).map((row: any) => String(row.fiscal_company_id || ""))
    );

    const out: any[] = [];
    let bootstrapAttempted = false;

    for (const company of companies || []) {
      try {
        const isExtractor = extractorCompanyIds.has(String(company.id));
        const configuredStart = String(company?.fiscal_settings?.history_start_date || "");
        const companyHistoryStart = isExtractor
          ? historyStart
          : /^\d{4}-\d{2}-\d{2}$/.test(configuredStart)
            ? configuredStart
            : null;
        const companyHistoryEnd = isExtractor ? historyEnd : null;

        const { data: state } = await admin
          .from("fiscal_sales_sync_state")
          .select("*")
          .eq("company_id", company.id)
          .maybeSingle();

        if (state?.paused === true || company?.fiscal_settings?.sales_sync_paused === true) {
          out.push({ company_id: company.id, status: "paused" });
          continue;
        }

        const lastStartedAt = state?.last_started_at ? new Date(state.last_started_at).getTime() : 0;
        if (
          state?.status === "running" &&
          Number.isFinite(lastStartedAt) &&
          lastStartedAt > 0 &&
          Date.now() - lastStartedAt < 15 * 60 * 1000
        ) {
          out.push({ company_id: company.id, status: "already_running" });
          continue;
        }

        const nextScheduledAt = state?.next_scheduled_at
          ? new Date(state.next_scheduled_at).getTime()
          : 0;
        if (
          state?.status !== "queued" &&
          Number.isFinite(nextScheduledAt) &&
          nextScheduledAt > Date.now()
        ) {
          out.push({ company_id: company.id, status: "not_due" });
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
            last_error: "Certificado A1 ativo não encontrado",
            next_scheduled_at: next.toISOString(),
            updated_at: now.toISOString(),
          });
          out.push({ company_id: company.id, status: "waiting_certificate" });
          continue;
        }

        const companyUf = String(company.uf || "").toUpperCase();

        if (companyUf === "SP") {
          await admin.from("fiscal_sales_sync_state").upsert({
            company_id: company.id,
            status: "running",
            last_started_at: now.toISOString(),
            last_error: null,
            next_scheduled_at: next.toISOString(),
            updated_at: now.toISOString(),
          });
          const spResponse = await fetch(`${base}/functions/v1/fiscal-sales-sp-sync`, {
            method: "POST",
            headers,
            body: JSON.stringify({ company_id: company.id }),
            signal: AbortSignal.timeout(115000),
          });
          const spSync = await spResponse.json().catch(() => ({}));
          if (!spResponse.ok) {
            throw new Error(spSync?.error || "Falha na sincronização oficial NFC-e/SP");
          }
          out.push({ company_id: company.id, status: "ok", source: "sefaz_sp_sae_nfce", sync: spSync });
          continue;
        }

        if (companyUf !== "AL") {
          const reason = `Conector automático de vendas ainda não disponível para UF ${companyUf || "não informada"}`;
          await admin.from("fiscal_sales_sync_state").upsert({
            company_id: company.id,
            status: "unsupported_source",
            last_error: reason,
            next_scheduled_at: null,
            updated_at: now.toISOString(),
          });
          out.push({ company_id: company.id, status: "unsupported_source", reason });
          continue;
        }

        // NFC-e 65 can be discovered/reconciled from the A1 + SVRS sequence.
        // The SEFAZ/AL portal credential remains useful for exhaustive NF-e 55 issuer reporting,
        // but it must not block the NFC-e engine.
        let stateCredentialStatus = "not_configured";
        if (isExtractor) {
          const { data: stateCredential, error: credentialError } = await admin
            .from("fiscal_state_credentials")
            .select("id,last_verification_status,last_verified_at")
            .eq("company_id", company.id)
            .eq("uf", "AL")
            .eq("is_active", true)
            .maybeSingle();
          if (credentialError) throw credentialError;
          stateCredentialStatus = stateCredential?.last_verification_status || "not_configured";
        }

        await admin.from("fiscal_sales_sync_state").upsert({
          company_id: company.id,
          status: "running",
          last_started_at: now.toISOString(),
          last_error: null,
          next_scheduled_at: next.toISOString(),
          updated_at: now.toISOString(),
        });

        if (
          isExtractor &&
          (state?.history_start_month !== historyStartMonth ||
          Number(state?.backfill_days || 0) !== Math.max(1, Math.ceil(
            (new Date(`${historyEnd}T00:00:00-03:00`).getTime() -
              new Date(`${historyStart}T00:00:00-03:00`).getTime()) / 86400000
          ) + 1))
        ) {
          await admin
            .from("fiscal_sales_sync_state")
            .update({
              history_start_month: historyStartMonth,
              backfill_days: Math.max(1, Math.ceil(
                (new Date(`${historyEnd}T00:00:00-03:00`).getTime() -
                  new Date(`${historyStart}T00:00:00-03:00`).getTime()) / 86400000
              ) + 1),
              updated_at: new Date().toISOString(),
            })
            .eq("company_id", company.id);
        }

        const companyCnpj = digits(company.cnpj);
        const [{ data: knownSalesModels }, { data: issuerEventRows }] = await Promise.all([
          admin.from("fiscal_sales_documents")
            .select("model,series,document_number,issue_date")
            .eq("company_id", company.id)
            .in("model", ["55","65"])
            .order("issue_date", { ascending: false })
            .limit(2500),
          admin.from("fiscal_dfe_events")
            .select("access_key,event_at")
            .eq("company_id", company.id)
            .order("event_at", { ascending: false })
            .limit(5000),
        ]);

        const seriesScores = new Map<string, { model: string; series: string; score: number; eventNumbers: number[]; eventKeys: string[] }>();
        const addSeries = (model: string, series: string, weight: number, noteNumber = 0, accessKey = "") => {
          if (!["55","65"].includes(model) || !/^\d{1,3}$/.test(series)) return;
          const normalizedSeries = String(Math.max(1, Number(series)));
          const key = model + ":" + normalizedSeries;
          const current = seriesScores.get(key) || { model, series: normalizedSeries, score: 0, eventNumbers: [], eventKeys: [] };
          current.score += weight;
          if (noteNumber > 0 && !current.eventNumbers.includes(noteNumber)) current.eventNumbers.push(noteNumber);
          if (accessKey && !current.eventKeys.includes(accessKey)) current.eventKeys.push(accessKey);
          seriesScores.set(key, current);
        };
        for (const row of knownSalesModels || []) {
          if (String(row.model || "") === "65") addSeries("65", String(row.series || "1"), 8);
        }
        for (const row of issuerEventRows || []) {
          const accessKey = digits(row.access_key);
          if (accessKey.length !== 44 || accessKey.slice(6,20) !== companyCnpj || accessKey.slice(20,22) !== "65") continue;
          const series = String(Number(accessKey.slice(22,25)));
          const noteNumber = Number(accessKey.slice(25,34));
          addSeries("65", series, 3, noteNumber, accessKey);
        }
        const chosen = [...seriesScores.values()].sort((a,b) => b.score - a.score || Number(a.series) - Number(b.series))[0] || null;
        const targetModel = "65";
        const targetSeries = chosen?.series || "1";
        const issuerSeedNumbers = chosen?.eventNumbers || [];
        const maxIssuerEvent = Math.max(0, ...issuerSeedNumbers);
        const minIssuerEvent = Math.min(...issuerSeedNumbers.filter((n:number) => n > 0), Number.POSITIVE_INFINITY);

        let dfeQuery = admin
          .from("fiscal_dfe_documents")
          .select("note_number,issue_date")
          .eq("company_id", company.id)
          .eq("direction", "saida")
          .neq("document_kind", "evento")
          .eq("model", targetModel)
          .eq("series", targetSeries)
          .order("issue_date", { ascending: false })
          .limit(2000);
        if (companyHistoryStart) {
          dfeQuery = dfeQuery.gte("issue_date", `${companyHistoryStart}T00:00:00-03:00`);
        }
        if (companyHistoryEnd) {
          dfeQuery = dfeQuery.lte("issue_date", `${companyHistoryEnd}T23:59:59.999-03:00`);
        }

        let salesQuery = admin
          .from("fiscal_sales_documents")
          .select("document_number")
          .eq("company_id", company.id)
          .eq("model", targetModel)
          .eq("series", targetSeries)
          .order("document_number", { ascending: false })
          .limit(2000);
        if (companyHistoryStart) {
          salesQuery = salesQuery.gte("issue_date", `${companyHistoryStart}T00:00:00-03:00`);
        }
        if (companyHistoryEnd) {
          salesQuery = salesQuery.lte("issue_date", `${companyHistoryEnd}T23:59:59.999-03:00`);
        }

        let priorSalesQuery: any = null;
        let priorDfeQuery: any = null;
        if (isExtractor && companyHistoryStart) {
          priorSalesQuery = admin
            .from("fiscal_sales_documents")
            .select("document_number,issue_date")
            .eq("company_id", company.id)
            .eq("model", targetModel)
            .eq("series", targetSeries)
            .lt("issue_date", `${companyHistoryStart}T00:00:00-03:00`)
            .order("issue_date", { ascending: false })
            .limit(1);
          priorDfeQuery = admin
            .from("fiscal_dfe_documents")
            .select("note_number,issue_date")
            .eq("company_id", company.id)
            .eq("direction", "saida")
            .neq("document_kind", "evento")
            .eq("model", targetModel)
            .eq("series", targetSeries)
            .lt("issue_date", `${companyHistoryStart}T00:00:00-03:00`)
            .order("issue_date", { ascending: false })
            .limit(1);
        }

        const [
          { data: salesRows },
          { data: dfeRows },
          priorSalesResult,
          priorDfeResult,
        ] = await Promise.all([
          salesQuery,
          dfeQuery,
          priorSalesQuery || Promise.resolve({ data: [] }),
          priorDfeQuery || Promise.resolve({ data: [] }),
        ]);

        const savedNumbers = (salesRows || [])
          .map((row: any) => numericNote(row.document_number))
          .filter((value: number) => value > 0);
        const dfeNumbers = (dfeRows || [])
          .map((row: any) => numericNote(row.note_number))
          .filter((value: number) => value > 0);
        const maxSaved = Math.max(0, ...savedNumbers);
        const maxKnownDfe = Math.max(0, ...dfeNumbers);
        const minKnownWindow = Math.min(
          ...[...savedNumbers, ...dfeNumbers].filter((value: number) => value > 0),
          Number.POSITIVE_INFINITY
        );
        const priorNumbers = [
          ...((priorSalesResult as any)?.data || []).map((row: any) => numericNote(row.document_number)),
          ...((priorDfeResult as any)?.data || []).map((row: any) => numericNote(row.note_number)),
        ].filter((value: number) => value > 0);
        const priorLatest = Math.max(0, ...priorNumbers);
        const oldLatest = Number(state?.latest_number || 0);
        const persistedFloor = Number(state?.initial_floor_number || 0);
        const legacyStateCompatible = targetModel === "65";
        const trustedStateLatest =
          legacyStateCompatible && (persistedFloor > 0 || maxSaved > 0 || maxKnownDfe > 0 || priorLatest > 0)
            ? oldLatest
            : 0;
        let baseLatest = Math.max(trustedStateLatest, maxSaved, maxKnownDfe, priorLatest, maxIssuerEvent);
        let scopeStartNumber = isExtractor
          ? legacyStateCompatible && persistedFloor > 0
            ? persistedFloor
            : priorLatest > 0
              ? priorLatest + 1
              : Number.isFinite(minKnownWindow)
                ? Math.max(1, minKnownWindow)
                : Number.isFinite(minIssuerEvent)
                  ? Math.max(1, minIssuerEvent)
                  : 0
          : 1;

        let bootstrap: any = null;
        if (!baseLatest || (isExtractor && !scopeStartNumber)) {
          if (bootstrapAttempted) {
            await admin.from("fiscal_sales_sync_state").upsert({
              company_id: company.id,
              status: "waiting_sales_reference",
              last_error: "Descoberta automática da referência aguardando o próximo turno.",
              next_scheduled_at: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            }, { onConflict: "company_id" });
            out.push({ company_id: company.id, status: "waiting_sales_reference", reason: "anchor_queue" });
            continue;
          }
          bootstrapAttempted = true;
          try {
            const anchorResponse = await fetch(`${base}/functions/v1/fiscal-sales-anchor-discover`, {
              method: "POST",
              headers,
              body: JSON.stringify({
                company_id: company.id,
                start_date: companyHistoryStart || historyStart,
                model: targetModel,
                series: Number(targetSeries),
                max_probes: 28,
              }),
              signal: AbortSignal.timeout(110000),
            });
            bootstrap = await anchorResponse.json().catch(() => ({}));
            const anchorIssueDate = String(bootstrap?.anchor_issue_date || "").slice(0,10);
            const historyFloorMs = new Date((companyHistoryStart || historyStart) + "T00:00:00-03:00").getTime() - 45 * 86400000;
            const anchorFresh = !anchorIssueDate || new Date(anchorIssueDate + "T00:00:00-03:00").getTime() >= historyFloorMs;
            if (anchorResponse.ok && bootstrap?.anchor_found && Number(bootstrap?.anchor_number || 0) > 0 && anchorFresh) {
              baseLatest = Number(bootstrap.anchor_number);
              scopeStartNumber = baseLatest + 1;
              await admin.from("fiscal_sales_sync_state").upsert({
                company_id: company.id,
                latest_number: baseLatest,
                cursor_number: baseLatest,
                initial_floor_number: scopeStartNumber,
                history_start_month: historyStartMonth,
                status: "running",
                last_error: null,
                next_scheduled_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              }, { onConflict: "company_id" });
            } else if (!bootstrap?.cooldown) {
              const fallbackResponse = await fetch(`${base}/functions/v1/fiscal-sales-discover-latest`, {
                method: "POST",
                headers,
                body: JSON.stringify({
                  company_id: company.id,
                  base_number: 0,
                  bootstrap_start: 1,
                  lookahead: 24,
                  model: targetModel,
                  series: Number(targetSeries),
                  months: discoveryMonths,
                }),
                signal: AbortSignal.timeout(90000),
              });
              const fallback = await fallbackResponse.json().catch(() => ({}));
              bootstrap = { anchor: bootstrap, fallback };
              if (fallbackResponse.ok && !fallback?.cooldown && Number(fallback?.latest || 0) > 0) {
                baseLatest = Number(fallback.latest);
                scopeStartNumber = 1;
                await admin.from("fiscal_sales_sync_state").upsert({
                  company_id: company.id,
                  latest_number: baseLatest,
                  cursor_number: baseLatest,
                  initial_floor_number: 1,
                  history_start_month: historyStartMonth,
                  status: "running",
                  last_error: null,
                  next_scheduled_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                }, { onConflict: "company_id" });
              }
            }
          } catch (err) {
            bootstrap = { error: err instanceof Error ? err.message : String(err) };
          }
        }

        if (!baseLatest || (isExtractor && !scopeStartNumber)) {
          await admin
            .from("fiscal_sales_sync_state")
            .upsert({
              company_id: company.id,
              status: "waiting_sales_reference",
              last_error: bootstrap?.error || "Procurando automaticamente uma referência NFC-e 65 próxima ao período. NF-e 55 é conferida pela fonte estadual separada.",
              next_scheduled_at: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
              updated_at: new Date().toISOString(),
            });
          out.push({
            company_id: company.id,
            status: "waiting_sales_reference",
            reason: isExtractor ? "automatic_bootstrap_pending" : "no_known_sale_reference",
            bootstrap,
          });
          continue;
        }

        let discovered = baseLatest;
        let discovery: any = bootstrap;
        try {
          const response = await fetch(`${base}/functions/v1/fiscal-sales-discover-latest`, {
            method: "POST",
            headers,
            body: JSON.stringify({
              company_id: company.id,
              base_number: baseLatest,
              model: targetModel,
              series: Number(targetSeries),
              lookahead: 72,
              months: discoveryMonths,
              preferred_month: bootstrap?.anchor_key_month || historyStartMonth,
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

        // Do not reopen a fully reconciled interval when discovery found no newer NFC-e.
        // This also protects previously verified history from being rewritten by an older worker.
        if (
          Boolean(state?.reconciliation_complete) &&
          Number(state?.reconciliation_pending || 0) === 0 &&
          latest <= baseLatest
        ) {
          const completedAt = new Date().toISOString();
          await admin.from("fiscal_sales_sync_state").update({
            status: "idle",
            last_error: null,
            last_completed_at: completedAt,
            next_scheduled_at: next.toISOString(),
            updated_at: completedAt,
          }).eq("company_id", company.id);
          await admin.from("fiscal_companies").update({ last_sync_at: completedAt }).eq("id", company.id);
          out.push({
            company_id: company.id,
            status: "ok",
            latest,
            previous_latest: oldLatest,
            discovery,
            reconciliation: { skipped: true, reason: "already_complete_no_new_number" },
            state_credential_status: stateCredentialStatus,
            target_model: targetModel,
            target_series: targetSeries,
          });
          continue;
        }

        await admin.from("fiscal_sales_sync_state").upsert({
          company_id: company.id,
          status: "reconciling",
          latest_number: latest,
          cursor_number: latest,
          initial_floor_number: isExtractor ? scopeStartNumber : 1,
          reconciliation_total: Math.max(0, latest - (isExtractor ? scopeStartNumber : 1) + 1),
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
            body: JSON.stringify({
              company_id: company.id,
              model: targetModel,
              series: Number(targetSeries),
              batch: 24,
              ...(isExtractor ? { start_number: scopeStartNumber } : {}),
            }),
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
          if (targetModel !== "65" || targetSeries !== "1") {
            classification = { skipped: true, reason: "series_specific_gap_classifier_pending", model: targetModel, series: targetSeries };
          } else if (!response.ok) {
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
          scope_start_number: isExtractor ? scopeStartNumber : 1,
          prior_window_latest: priorLatest,
          discovery,
          reconciliation,
          classification,
          state_credential_status: stateCredentialStatus,
          target_model: targetModel,
          target_series: targetSeries,
          issuer_event_seed: maxIssuerEvent || null,
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
