import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...cors, "Content-Type": "application/json" },
});
const encoder = new TextEncoder();
const decoder = new TextDecoder();
const BRIDGE_URL = "https://ws-dfe-bridge.vercel.app/api/distribuicao";
const MAX_BATCHES = 5;
const BATCH_WAIT_MS = 1200;
const COOLDOWN_MS = 60 * 60 * 1000;

const fromB64 = (value: string) => Uint8Array.from(atob(value), c => c.charCodeAt(0));
const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
const tag = (xml: string, name: string) => xml.match(new RegExp(`<(?:\\w+:)?${name}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`, "i"))?.[1]?.trim() || "";
const attr = (source: string, name: string) => source.match(new RegExp(`${name}=["']([^"']+)["']`, "i"))?.[1] || "";
const decodeEntities = (value: string) => value
  .replaceAll("&lt;", "<")
  .replaceAll("&gt;", ">")
  .replaceAll("&amp;", "&")
  .replaceAll("&quot;", '"')
  .replaceAll("&apos;", "'");

async function vaultKey() {
  const secret = Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET") || Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!secret) throw new Error("Chave do cofre fiscal não configurada.");
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["decrypt"]);
}

async function decryptVault(ciphertext: string, iv: string) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: fromB64(iv) }, await vaultKey(), fromB64(ciphertext));
  return decoder.decode(plain);
}

async function gunzipBase64(value: string) {
  const bytes = Uint8Array.from(atob(value.replace(/\s/g, "")), c => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return decoder.decode(await new Response(stream).arrayBuffer());
}

function parseDocument(xml: string, schema: string, nsu: string, companyCnpj: string) {
  const clean = decodeEntities(xml);
  const isEvent = /procEventoNFe|eventoNFe/i.test(schema) || /<procEventoNFe\b|<evento\b/i.test(clean);
  const isSummary = /resNFe/i.test(schema);
  const emit = tag(clean, "emit");
  const dest = tag(clean, "dest");
  const issuerCnpj = digits(tag(emit, "CNPJ") || (isSummary ? tag(clean, "CNPJ") : ""));
  const recipientCnpj = digits(tag(dest, "CNPJ"));
  const accessKey = tag(clean, "chNFe") || clean.match(/Id=["']NFe(\d{44})["']/i)?.[1] || "";
  const issueDate = tag(clean, "dhEmi") || tag(clean, "dEmi") || tag(clean, "dhEvento") || null;
  const statusCode = tag(clean, "cSitNFe") || tag(clean, "cStat") || null;
  const fullXml = !isEvent && !isSummary && /procNFe|NFe/i.test(schema);
  const documentKind = isEvent ? "evento" : isSummary ? "resumo" : fullXml ? "nfe" : "documento";
  const direction = isEvent
    ? "relacionada"
    : issuerCnpj === companyCnpj
      ? "saida"
      : recipientCnpj === companyCnpj || isSummary
        ? "entrada"
        : "relacionada";

  return {
    nsu,
    schema,
    documentKind,
    direction,
    accessKey,
    model: accessKey.length === 44 ? accessKey.slice(20, 22) : null,
    issueDate,
    value: Number(tag(clean, "vNF") || 0),
    issuerCnpj,
    issuerName: tag(emit, "xNome") || (isSummary ? tag(clean, "xNome") : ""),
    recipientCnpj,
    number: tag(clean, "nNF") || null,
    series: tag(clean, "serie") || null,
    statusCode,
    fullXml,
    xml: clean,
    eventType: isEvent ? tag(clean, "tpEvento") || null : null,
    eventDescription: isEvent ? tag(clean, "descEvento") || tag(clean, "xEvento") || null : null,
  };
}

async function requestDistribution(
  auth: string,
  pfxBase64: string,
  password: string,
  cnpj: string,
  ufCode: string,
  ultNSU: string,
  environment: "homologacao" | "producao",
) {
  const response = await fetch(BRIDGE_URL, {
    method: "POST",
    headers: { Authorization: auth, "Content-Type": "application/json" },
    body: JSON.stringify({
      certificate_base64: pfxBase64,
      certificate_password: password,
      cnpj,
      ufCode,
      uf_code: ufCode,
      ultNSU,
      ult_nsu: ultNSU,
      environment,
    }),
  });
  const payload = await response.json().catch(() => ({})) as Record<string, any>;
  if (!response.ok) throw new Error(`Bridge fiscal HTTP ${response.status}: ${payload.error || "erro desconhecido"}`);
  if (!payload.raw_xml) throw new Error("Bridge fiscal respondeu sem XML bruto.");
  return payload;
}

const UF_CODE: Record<string, string> = {
  AC:"12", AL:"27", AP:"16", AM:"13", BA:"29", CE:"23", DF:"53", ES:"32", GO:"52",
  MA:"21", MT:"51", MS:"50", MG:"31", PA:"15", PB:"25", PR:"41", PE:"26", PI:"22",
  RJ:"33", RN:"24", RS:"43", RO:"11", RR:"14", SC:"42", SP:"35", SE:"28", TO:"17",
};

serve(async req => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return json({ error: "Não autenticado" }, 401);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: { user } } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ""));
    if (!user) return json({ error: "Não autenticado" }, 401);
    const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", user.id);
    if (!roles?.some((row: any) => row.role === "admin")) return json({ error: "Acesso exclusivo para administradores" }, 403);

    const body = await req.json().catch(() => ({})) as Record<string, any>;
    const companyId = String(body.company_id || "");
    if (!companyId) return json({ error: "company_id obrigatório" }, 422);

    const { data: company, error: companyError } = await admin
      .from("fiscal_companies")
      .select("id,cnpj,razao_social,uf,ambiente_padrao,status")
      .eq("id", companyId)
      .single();
    if (companyError || !company) return json({ error: "Empresa fiscal não encontrada" }, 404);
    if (company.status === "inativa") return json({ error: "Empresa fiscal inativa" }, 422);

    const { data: certRow, error: certError } = await admin
      .from("fiscal_certificates")
      .select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,valid_until")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();
    if (certError || !certRow) return json({ error: "Empresa sem certificado A1 ativo" }, 422);

    const pfxBase64 = await decryptVault(certRow.certificate_ciphertext, certRow.certificate_iv);
    const password = await decryptVault(certRow.password_ciphertext, certRow.password_iv);
    const cert = lerCertificado(Buffer.from(pfxBase64, "base64"), password);
    const cnpj = digits(cert.titular.cnpj);
    if (cnpj !== digits(company.cnpj)) return json({ error: "O A1 não corresponde ao CNPJ cadastrado" }, 422);
    if (cert.validadeInicio > new Date() || cert.validadeFim < new Date()) return json({ error: "Certificado fora da validade" }, 422);

    const environment: "homologacao" | "producao" = body.environment === "homologacao" || company.ambiente_padrao === "homologacao" ? "homologacao" : "producao";
    const ufCode = UF_CODE[String(company.uf || "AL").toUpperCase()] || "27";
    const { data: state } = await admin
      .from("fiscal_dfe_sync_state")
      .select("ult_nsu,max_nsu,last_status_code,last_status_message,last_synced_at")
      .eq("user_id", user.id)
      .eq("cnpj", cnpj)
      .eq("environment", environment)
      .eq("uf_code", ufCode)
      .maybeSingle();

    if (state?.last_status_code === "656" && state.last_synced_at) {
      const elapsed = Date.now() - new Date(state.last_synced_at).getTime();
      if (elapsed < COOLDOWN_MS) {
        return json({
          ok: false,
          cooldown: true,
          retry_after_seconds: Math.ceil((COOLDOWN_MS - elapsed) / 1000),
          response: { cStat: "656", xMotivo: state.last_status_message || "Consumo indevido" },
        }, 429);
      }
    }

    let currentNsu = digits(state?.ult_nsu || "0").padStart(15, "0").slice(-15);
    let lastResponse: any = { cStat: "137", xMotivo: "Nenhum documento localizado", ultNSU: currentNsu, maxNSU: state?.max_nsu || currentNsu };
    let newDocuments = 0;
    let newEvents = 0;
    let batchCount = 0;

    for (let i = 0; i < MAX_BATCHES; i++) {
      if (i > 0) await sleep(BATCH_WAIT_MS);
      const bridge = await requestDistribution(auth, pfxBase64, password, cnpj, ufCode, currentNsu, environment);
      const text = String(bridge.raw_xml || "");
      const response = bridge.response || {
        cStat: tag(text, "cStat"),
        xMotivo: tag(text, "xMotivo"),
        ultNSU: tag(text, "ultNSU"),
        maxNSU: tag(text, "maxNSU"),
      };
      lastResponse = response;
      batchCount++;

      if (String(response.cStat) === "656") {
        await admin.from("fiscal_dfe_sync_state").upsert({
          user_id: user.id,
          cnpj,
          environment,
          uf_code: ufCode,
          ult_nsu: currentNsu,
          max_nsu: state?.max_nsu || currentNsu,
          last_status_code: "656",
          last_status_message: response.xMotivo || "Consumo indevido",
          last_synced_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id,cnpj,environment,uf_code" });
        return json({ ok: false, cooldown: true, retry_after_seconds: 3600, response }, 429);
      }

      const docs: any[] = [];
      const re = /<docZip\b([^>]*)>([\s\S]*?)<\/docZip>/gi;
      let match: RegExpExecArray | null;
      while ((match = re.exec(text))) {
        const nsu = attr(match[1], "NSU");
        const schema = attr(match[1], "schema");
        try { docs.push(parseDocument(await gunzipBase64(match[2]), schema, nsu, cnpj)); }
        catch (error) { console.error("Falha ao interpretar NSU", nsu, error); }
      }

      const events = docs.filter(d => d.documentKind === "evento");
      const notes = docs.filter(d => d.documentKind !== "evento");

      if (events.length) {
        const eventRows = events.map(d => ({
          user_id: user.id,
          company_id: companyId,
          cnpj,
          environment,
          uf_code: ufCode,
          nsu: d.nsu,
          schema_name: d.schema,
          access_key: d.accessKey || null,
          event_type: d.eventType,
          event_description: d.eventDescription,
          status_code: d.statusCode,
          event_at: d.issueDate,
          xml: d.xml,
          source: "national_dfe",
          updated_at: new Date().toISOString(),
        }));
        const { error } = await admin.from("fiscal_dfe_events").upsert(eventRows, { onConflict: "user_id,cnpj,environment,uf_code,nsu" });
        if (error) throw new Error(`Falha ao salvar eventos DF-e: ${error.message}`);
        newEvents += events.length;
      }

      if (notes.length) {
        const noteRows = notes.map(d => ({
          user_id: user.id,
          company_id: companyId,
          cnpj,
          environment,
          uf_code: ufCode,
          nsu: d.nsu,
          source: "national_dfe",
          source_id: d.nsu,
          schema_name: d.schema,
          document_kind: d.documentKind,
          direction: d.direction,
          access_key: d.accessKey || null,
          model: d.model,
          issue_date: d.issueDate,
          value: d.value,
          issuer_cnpj: d.issuerCnpj || null,
          issuer_name: d.issuerName || null,
          recipient_cnpj: d.recipientCnpj || null,
          note_number: d.number,
          series: d.series,
          status_code: d.statusCode,
          full_xml: d.fullXml,
          xml: d.xml,
          updated_at: new Date().toISOString(),
        }));
        const { error } = await admin.from("fiscal_dfe_documents").upsert(noteRows, { onConflict: "user_id,cnpj,environment,uf_code,nsu" });
        if (error) throw new Error(`Falha ao salvar DF-e: ${error.message}`);
        newDocuments += notes.length;
      }

      const nextNsu = digits(response.ultNSU || currentNsu).padStart(15, "0").slice(-15);
      const maxNsu = digits(response.maxNSU || nextNsu).padStart(15, "0").slice(-15);
      currentNsu = nextNsu;
      await admin.from("fiscal_dfe_sync_state").upsert({
        user_id: user.id,
        cnpj,
        environment,
        uf_code: ufCode,
        ult_nsu: nextNsu,
        max_nsu: maxNsu,
        last_status_code: response.cStat || null,
        last_status_message: response.xMotivo || null,
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,cnpj,environment,uf_code" });

      if (String(response.cStat) !== "138" || nextNsu >= maxNsu) break;
    }

    await admin.from("fiscal_companies").update({ last_sync_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", companyId);
    const { data: stored, error: storedError } = await admin
      .from("fiscal_dfe_documents")
      .select("*")
      .eq("company_id", companyId)
      .eq("environment", environment)
      .order("issue_date", { ascending: false })
      .limit(5000);
    if (storedError) throw storedError;

    return json({
      ok: ["137", "138"].includes(String(lastResponse.cStat)),
      provider: "Ambiente Nacional NF-e",
      source: "national_dfe",
      environment,
      response: lastResponse,
      newDocuments,
      newEvents,
      batchCount,
      documents: stored || [],
      scope: {
        received: true,
        emittedByCompany: false,
        note: "Compras/entradas vêm do Ambiente Nacional; vendas usam o conector estadual.",
      },
    });
  } catch (error) {
    console.error("dfe-extractor-native", error);
    return json({ error: error instanceof Error ? error.message : String(error) }, 500);
  }
});
