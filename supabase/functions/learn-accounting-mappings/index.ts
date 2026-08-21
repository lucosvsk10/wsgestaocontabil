import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});

type Entry = {
  rubricCode?: string;
  rubricDescription?: string;
  section?: string;
  kind?: string;
  eventType?: string;
  debitCode?: string;
  debitDescription?: string;
  debitCostCenter?: string;
  creditCode?: string;
  creditDescription?: string;
  creditCostCenter?: string;
  history?: string;
};

const normalize = (value: unknown) => String(value ?? "")
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-zA-Z0-9]+/g, " ")
  .trim()
  .toLowerCase();

const signatureFor = (entry: Entry) => [
  normalize(entry.rubricCode),
  normalize(entry.rubricDescription),
  normalize(entry.section),
  normalize(entry.kind),
  normalize(entry.eventType),
].join("|");

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: { user } } = await admin.auth.getUser(auth.replace("Bearer ", ""));
    if (!user) return json({ error: "Não autenticado" }, 401);

    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: { role: string }) => ["admin", "fiscal", "contabil", "geral"].includes(row.role))) {
      return json({ error: "Acesso negado" }, 403);
    }

    const body = await req.json();
    const companyKey = String(body.company_id || "");
    const module = String(body.module || "folha");
    const entries: Entry[] = [
      ...(Array.isArray(body.entries) ? body.entries : []),
      ...(Array.isArray(body.deferredEntries) ? body.deferredEntries : []),
    ];

    if (!companyKey) return json({ error: "Empresa não informada" }, 422);

    const valid = entries.filter((entry) =>
      entry.debitCode?.trim() &&
      entry.creditCode?.trim() &&
      (entry.rubricCode?.trim() || entry.rubricDescription?.trim() || entry.history?.trim())
    );

    if (!valid.length) return json({ learned: 0 });

    const signatures = valid.map(signatureFor);
    const { data: existing } = await admin
      .from("accounting_mapping_rules")
      .select("signature,times_confirmed")
      .eq("company_key", companyKey)
      .eq("module", module)
      .in("signature", signatures);
    const confirmedBySignature = new Map((existing ?? []).map((row: { signature: string; times_confirmed: number }) => [row.signature, row.times_confirmed]));

    const now = new Date().toISOString();
    const rows = valid.map((entry) => {
      const signature = signatureFor(entry);
      return {
        company_key: companyKey,
        module,
        signature,
        rubric_code: String(entry.rubricCode || ""),
        rubric_description: String(entry.rubricDescription || entry.history || ""),
        normalized_description: normalize(entry.rubricDescription || entry.history),
        section: String(entry.section || ""),
        kind: String(entry.kind || ""),
        event_type: String(entry.eventType || ""),
        debit_code: String(entry.debitCode),
        debit_description: String(entry.debitDescription || ""),
        debit_cost_center: String(entry.debitCostCenter || ""),
        credit_code: String(entry.creditCode),
        credit_description: String(entry.creditDescription || ""),
        credit_cost_center: String(entry.creditCostCenter || ""),
        history_template: String(entry.history || ""),
        source: "user_approved",
        times_confirmed: (confirmedBySignature.get(signature) ?? 0) + 1,
        is_active: true,
        created_by: user.id,
        updated_by: user.id,
        updated_at: now,
      };
    });

    const { error } = await admin
      .from("accounting_mapping_rules")
      .upsert(rows, { onConflict: "company_key,module,signature" });
    if (error) throw error;

    return json({ learned: rows.length });
  } catch (error) {
    console.error("learn-accounting-mappings", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
