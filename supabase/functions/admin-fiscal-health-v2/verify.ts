const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");

export const bounds = () => {
  const local = new Date(Date.now() - 3 * 60 * 60 * 1000);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  return {
    start: new Date(Date.UTC(year, month, 1, 3, 0, 0)).toISOString(),
    next: new Date(Date.UTC(year, month + 1, 1, 3, 0, 0)).toISOString(),
    previous: new Date(Date.UTC(year, month - 1, 1, 3, 0, 0)).toISOString(),
    today: `${year}-${String(month + 1).padStart(2, "0")}-${String(local.getUTCDate()).padStart(2, "0")}`,
    startDay: `${year}-${String(month + 1).padStart(2, "0")}-01`,
  };
};

export async function getInternalToken(admin: any) {
  const { data } = await admin.from("_fiscal_sales_debug_token").select("token").eq("id", true).maybeSingle();
  return String(data?.token || "");
}

async function internalCall(base: string, name: string, token: string, body: any, timeout = 90000) {
  const response = await fetch(`${base}/functions/v1/${name}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-debug-token": token },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeout),
  });
  const payload = await response.json().catch(() => ({})) as any;
  return { ok: response.ok, status: response.status, payload };
}

async function loadRowsForKeys(admin: any, companyId: string, keys: string[]) {
  const rows: any[] = [];
  for (let index = 0; index < keys.length; index += 100) {
    const { data, error } = await admin.from("fiscal_dfe_documents")
      .select("id,access_key,issue_date,value,full_xml,xml,parse_error,direction,model,document_kind,source,updated_at")
      .eq("company_id", companyId)
      .in("access_key", keys.slice(index, index + 100));
    if (error) throw error;
    rows.push(...(data || []));
  }
  return rows;
}

function statsForKeys(keys: string[], rows: any[]) {
  const byKey = new Map<string, any[]>();
  for (const row of rows) {
    const key = digits(row.access_key);
    if (!key) continue;
    const list = byKey.get(key) || [];
    list.push(row);
    byKey.set(key, list);
  }
  let xmlReady = 0;
  let requiresManifestation = 0;
  let manifestationSent = 0;
  let normalPending = 0;
  for (const key of keys) {
    const list = byKey.get(key) || [];
    if (list.some((row) => row.full_xml && row.xml)) {
      xmlReady += 1;
      continue;
    }
    if (list.some((row) => String(row.parse_error || "") === "xml_retry:manifestation_sent")) manifestationSent += 1;
    else if (list.some((row) => String(row.parse_error || "") === "xml_requires_manifestation")) requiresManifestation += 1;
    else normalPending += 1;
  }
  return {
    stored: [...byKey.keys()].filter((key) => keys.includes(key)).length,
    xmlReady,
    requiresManifestation,
    manifestationSent,
    normalPending,
  };
}

async function currentNfseStats(admin: any, companyId: string, range: ReturnType<typeof bounds>) {
  const { data, error } = await admin.from("fiscal_dfe_documents")
    .select("access_key,full_xml,xml,issue_date,updated_at")
    .eq("company_id", companyId)
    .eq("direction", "entrada")
    .gte("issue_date", range.start)
    .lt("issue_date", range.next)
    .like("source", "national_nfse%")
    .neq("document_kind", "evento");
  if (error) throw error;
  const byKey = new Map<string, any[]>();
  for (const row of data || []) {
    const key = String(row.access_key || `row:${row.issue_date}:${row.updated_at}`);
    const list = byKey.get(key) || [];
    list.push(row);
    byKey.set(key, list);
  }
  return {
    count: byKey.size,
    xmlReady: [...byKey.values()].filter((list) => list.some((row) => row.full_xml && row.xml)).length,
  };
}

export async function purchaseVerification(admin: any, base: string, token: string, company: any, hasStateCredentials: boolean, verify: boolean, range: ReturnType<typeof bounds>) {
  let source: any = null;
  let sourceError: string | null = null;
  let autoRepaired = 0;

  if (verify && String(company.uf || "").toUpperCase() === "AL" && hasStateCredentials && token) {
    try {
      let check = await internalCall(base, "fiscal-purchases-sefaz-al-report", token, {
        company_id: company.id,
        start: range.startDay,
        end: range.today,
        dry_run: true,
        include_keys: true,
      });
      if (!check.ok || check.payload?.error) throw new Error(check.payload?.error || `HTTP ${check.status}`);
      source = check.payload;
      if (Number(source.purchase_existing_keys || 0) < Number(source.purchase_unique_keys || 0)) {
        check = await internalCall(base, "fiscal-purchases-sefaz-al-report", token, {
          company_id: company.id,
          start: range.startDay,
          end: range.today,
          dry_run: false,
          include_keys: true,
        });
        if (check.ok && !check.payload?.error) {
          autoRepaired += Number(check.payload?.inserted || 0);
          source = check.payload;
        }
      }
    } catch (error) {
      sourceError = error instanceof Error ? error.message : String(error);
    }
  }

  let keys: string[] = Array.isArray(source?.purchase_keys)
    ? source.purchase_keys.map(digits).filter((key: string) => key.length === 44)
    : [];

  if (!keys.length) {
    const { data, error } = await admin.from("fiscal_dfe_documents")
      .select("access_key")
      .eq("company_id", company.id)
      .eq("direction", "entrada")
      .eq("model", "55")
      .neq("document_kind", "evento")
      .gte("issue_date", range.start)
      .lt("issue_date", range.next)
      .not("access_key", "is", null);
    if (error) throw error;
    keys = [...new Set((data || []).map((row) => digits(row.access_key)).filter((key) => key.length === 44))];
  }

  let rows = keys.length ? await loadRowsForKeys(admin, company.id, keys) : [];
  let stats = statsForKeys(keys, rows);

  if (verify && token && stats.normalPending > 0) {
    const pendingKeys = keys.filter((key) => {
      const matches = rows.filter((row) => digits(row.access_key) === key);
      return !matches.some((row) => row.full_xml && row.xml) &&
        !matches.some((row) => ["xml_requires_manifestation", "xml_retry:manifestation_sent"].includes(String(row.parse_error || "")));
    }).slice(0, 3);

    for (const accessKey of pendingKeys) {
      try {
        const recovery = await internalCall(base, "fiscal-purchases-xml-backfill", token, { company_id: company.id, access_key: accessKey, batch: 1 }, 70000);
        if (recovery.ok && !recovery.payload?.error) autoRepaired += Number(recovery.payload?.companies?.[0]?.saved || 0);
      } catch {}
    }
    if (pendingKeys.length) {
      rows = await loadRowsForKeys(admin, company.id, keys);
      stats = statsForKeys(keys, rows);
    }
  }

  const nfse = await currentNfseStats(admin, company.id, range);
  const expectedNfe = source ? Number(source.purchase_unique_keys || 0) : null;
  return {
    source: source ? "SEFAZ/AL" : "Base fiscal",
    source_checked: Boolean(source),
    source_error: sourceError,
    expected_nfe: expectedNfe,
    stored_nfe: stats.stored,
    nfse_count: nfse.count,
    xml_ready: stats.xmlReady + nfse.xmlReady,
    xml_total: keys.length + nfse.count,
    pending_xml: stats.normalPending + stats.requiresManifestation + stats.manifestationSent + Math.max(0, nfse.count - nfse.xmlReady),
    requires_manifestation: stats.requiresManifestation,
    manifestation_sent: stats.manifestationSent,
    missing_count: expectedNfe == null ? 0 : Math.max(0, expectedNfe - stats.stored),
    auto_repaired: autoRepaired,
  };
}

export async function salesVerification(admin: any, companyId: string, start: string, next: string, state: any) {
  const latest = Number(state?.latest_number || 0);
  const { data, error } = await admin.from("fiscal_sales_reconciliation")
    .select("status,access_key,issue_date,note_number")
    .eq("company_id", companyId)
    .eq("model", "65")
    .eq("series", "1")
    .lte("note_number", latest || 999999999);
  if (error) throw error;

  const rows = data || [];
  const counts: Record<string, number> = { found: 0, cancelled: 0, inutilized: 0, not_authorized: 0, not_found: 0, pending: 0, error: 0 };
  for (const row of rows) counts[row.status] = (counts[row.status] || 0) + 1;
  const pendingSequence = Number(counts.pending || 0) + Number(counts.error || 0);
  const resolved = rows.length - pendingSequence;
  const sequenceComplete = latest > 0 && rows.length === latest && pendingSequence === 0;
  const staleState = Boolean(state && sequenceComplete && (!state.reconciliation_complete || Number(state.reconciliation_resolved || 0) !== resolved || state.status === "reconciling"));

  if (staleState) {
    await admin.from("fiscal_sales_sync_state").update({
      reconciliation_total: latest,
      reconciliation_resolved: resolved,
      reconciliation_found: counts.found || 0,
      reconciliation_cancelled: counts.cancelled || 0,
      reconciliation_inutilized: counts.inutilized || 0,
      reconciliation_not_authorized: counts.not_authorized || 0,
      reconciliation_missing: counts.not_found || 0,
      reconciliation_pending: 0,
      reconciliation_complete: true,
      reconciliation_completed_at: new Date().toISOString(),
      status: "idle",
      last_error: null,
      updated_at: new Date().toISOString(),
    }).eq("company_id", companyId);
  }

  const monthFound = rows.filter((row) => row.status === "found" && row.issue_date && row.issue_date >= start && row.issue_date < next);
  const keys = [...new Set(monthFound.map((row) => digits(row.access_key)).filter((key) => key.length === 44))];
  const { data: documents, error: documentsError } = await admin.from("fiscal_sales_documents")
    .select("access_key,xml,issue_date,total_value,updated_at")
    .eq("company_id", companyId)
    .gte("issue_date", start)
    .lt("issue_date", next);
  if (documentsError) throw documentsError;

  const saved = new Set((documents || []).map((row) => digits(row.access_key)).filter(Boolean));
  const withXml = new Set((documents || []).filter((row) => row.xml).map((row) => digits(row.access_key)).filter(Boolean));
  return {
    expected: keys.length || (documents || []).length,
    stored: keys.length ? keys.filter((key) => saved.has(key)).length : (documents || []).length,
    xml_ready: keys.length ? keys.filter((key) => withXml.has(key)).length : (documents || []).filter((row) => row.xml).length,
    pending_xml: keys.length ? keys.filter((key) => !withXml.has(key)).length : (documents || []).filter((row) => !row.xml).length,
    cancelled: rows.filter((row) => row.status === "cancelled" && row.issue_date && row.issue_date >= start && row.issue_date < next).length,
    sequence_total: latest || rows.length,
    sequence_resolved: resolved,
    sequence_complete: sequenceComplete,
    repaired_state: staleState,
  };
}

export async function manifestAndRecover(admin: any, base: string, token: string, companyId: string, range: ReturnType<typeof bounds>) {
  const { data, error } = await admin.from("fiscal_dfe_documents")
    .select("access_key")
    .eq("company_id", companyId)
    .eq("direction", "entrada")
    .eq("model", "55")
    .eq("full_xml", false)
    .eq("parse_error", "xml_requires_manifestation")
    .gte("issue_date", range.start)
    .lt("issue_date", range.next)
    .not("access_key", "is", null);
  if (error) throw error;

  const keys = [...new Set((data || []).map((row) => digits(row.access_key)).filter((key) => key.length === 44))].slice(0, 5);
  const results: any[] = [];
  for (const accessKey of keys) {
    const event = await internalCall(base, "fiscal-purchases-manifest", token, { action: "event", confirm: true, company_id: companyId, access_key: accessKey }, 70000);
    let recovered = false;
    if (event.ok && (event.payload?.registered || event.payload?.already_complete || event.payload?.ok)) {
      await new Promise((resolve) => setTimeout(resolve, 1200));
      const backfill = await internalCall(base, "fiscal-purchases-xml-backfill", token, { company_id: companyId, access_key: accessKey, batch: 1 }, 70000);
      recovered = Boolean(backfill.ok && Number(backfill.payload?.companies?.[0]?.saved || 0) > 0);
      results.push({ access_key: accessKey, event: event.payload, recovered, backfill: backfill.payload });
    } else {
      results.push({ access_key: accessKey, event: event.payload, recovered: false });
    }
  }
  return results;
}
