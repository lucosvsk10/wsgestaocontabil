import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info, x-debug-token",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "content-type": "application/json" },
});
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const fromB64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));

const AL = {
  uf: "AL",
  source: "sefaz_al",
  version: "1",
  moduleBase: "https://nfeas.sefaz.al.gov.br/gwtapp/",
  bootstrap: "https://nfeas.sefaz.al.gov.br/gwtapp/gwtapp.nocache.js",
  rpcEndpoint: "https://nfeas.sefaz.al.gov.br/gwtapp/nfeRelatoriosRemoteService.rpc",
  serviceInterface: "br.gov.al.sefaz.nfe.relatorios.web.client.shared.NFeRelatoriosRemoteService",
  policy: "65B6BD5745F6531C4EBB72A58A01D410",
  queryDto: "br.gov.al.sefaz.nfe.shared.legado.NotaFiscalConsultaDTO/3510275579",
  methods: {
    page: "consultarNotasFiscaisDeEntradaIhSaidaPaginada",
    count: "consultarQuantidadeNotasFiscaisDeEntradaIhSaida",
    max: "obterQuantidadeMaximaNotasEntradaIhSaida",
    report: "consultarRelatoriosEntradaIhSaida",
  },
};

async function vaultKey() {
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("Chave do cofre fiscal não configurada");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
}

async function decrypt(ciphertext: string, iv: string) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await vaultKey(), fromB64(ciphertext));
  return decoder.decode(plain);
}

async function authorize(req: Request, admin: any) {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (bearer) {
    const { data: { user } } = await admin.auth.getUser(bearer);
    if (user) {
      const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
      if (roles?.some((row: any) => row.role === "admin")) return { ok: true, userId: user.id, mode: "admin" };
    }
  }

  const debugToken = req.headers.get("x-debug-token") || "";
  if (debugToken) {
    const { data } = await admin.from("_fiscal_sales_debug_token").select("token").eq("id", true).maybeSingle();
    if (data && String(data.token) === debugToken) return { ok: true, userId: null, mode: "diagnostic" };
  }
  return { ok: false, userId: null, mode: "none" };
}

async function loadCompanyContext(admin: any, companyId: string) {
  const { data: company, error: companyError } = await admin
    .from("fiscal_companies")
    .select("id,cnpj,razao_social,uf,status,ambiente_padrao")
    .eq("id", companyId)
    .single();
  if (companyError || !company) throw new Error("Empresa fiscal não encontrada");
  if (company.status === "inativa") throw new Error("Empresa fiscal inativa");
  if (String(company.uf || "").toUpperCase() !== "AL") throw new Error("O conector atual suporta apenas Alagoas");

  const { data: certRow, error: certError } = await admin
    .from("fiscal_certificates")
    .select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,valid_until")
    .eq("company_id", companyId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();
  if (certError || !certRow) throw new Error("Certificado A1 ativo não encontrado");

  const pfx = await decrypt(certRow.certificate_ciphertext, certRow.certificate_iv);
  const password = await decrypt(certRow.password_ciphertext, certRow.password_iv);
  const certificate = lerCertificado(Buffer.from(pfx, "base64"), password);
  const holderCnpj = String(certificate.titular?.cnpj || "").replace(/\D/g, "");
  const companyCnpj = String(company.cnpj || "").replace(/\D/g, "");
  if (holderCnpj !== companyCnpj) throw new Error("O certificado A1 não corresponde ao CNPJ da empresa");
  if (certificate.validadeFim < new Date()) throw new Error("Certificado A1 vencido");

  return { company, certRow, certificate, holderCnpj };
}

async function startRun(admin: any, companyId: string, userId: string | null, action: string, start?: string, end?: string) {
  const { data, error } = await admin.from("fiscal_sales_connector_runs").insert({
    company_id: companyId,
    uf: "AL",
    connector: "sefaz_al",
    status: "running",
    stage: action,
    message: "Executando conector estadual de vendas",
    period_start: start || null,
    period_end: end || null,
    created_by: userId,
  }).select("id").single();
  if (error) throw error;
  return data.id as string;
}

async function finishRun(admin: any, runId: string, values: Record<string, unknown>) {
  await admin.from("fiscal_sales_connector_runs").update({
    ...values,
    finished_at: new Date().toISOString(),
  }).eq("id", runId);
}

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let runId = "";

  try {
    const access = await authorize(req, admin);
    if (!access.ok) return json({ error: "Acesso não autorizado" }, 403);

    const body = await req.json().catch(() => ({})) as Record<string, any>;
    const companyId = String(body.company_id || "");
    const action = String(body.action || "status");
    if (!companyId) return json({ error: "company_id obrigatório" }, 422);

    const context = await loadCompanyContext(admin, companyId);

    if (action === "status") {
      const { data: state } = await admin.from("fiscal_sales_connector_state").select("*").eq("company_id", companyId).eq("uf", "AL").maybeSingle();
      return json({
        ok: true,
        ready: state?.last_status === "ready",
        connector: AL,
        state: state || null,
        certificate: { holderCnpj: context.holderCnpj, validUntil: context.certRow.valid_until },
      });
    }

    runId = await startRun(admin, companyId, access.userId, action, body.period_start, body.period_end);

    if (action === "sync") {
      await finishRun(admin, runId, {
        status: "blocked",
        stage: "rpc_transport",
        message: "RPC estadual identificado, mas o transporte GWT ainda está em validação. Nenhuma venda foi gravada.",
        diagnostics: { connector: AL },
      });
      return json({
        ok: false,
        ready: false,
        run_id: runId,
        reason: "gwt_transport_pending",
        message: "Conector AL ainda não está autorizado a persistir vendas até a validação do RPC.",
      }, 409);
    }

    await finishRun(admin, runId, {
      status: "completed",
      stage: "mapped",
      message: "Estrutura RPC da SEFAZ/AL mapeada",
      diagnostics: {
        connector: AL,
        certificateHolder: context.holderCnpj,
        discovered: {
          module: "Entradas e Saídas",
          paginatedQuery: AL.methods.page,
          quantityQuery: AL.methods.count,
          reportQuery: AL.methods.report,
          dto: AL.queryDto,
        },
      },
    });

    await admin.from("fiscal_sales_connector_state").upsert({
      company_id: companyId,
      uf: "AL",
      connector_version: AL.version,
      last_status: "mapped",
      last_message: "RPC de Entradas e Saídas identificado; transporte em validação",
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "company_id,uf" });

    return json({ ok: true, run_id: runId, connector: AL, status: "mapped" });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (runId) await finishRun(admin, runId, { status: "error", message });
    return json({ ok: false, error: message, run_id: runId || null }, 500);
  }
});
