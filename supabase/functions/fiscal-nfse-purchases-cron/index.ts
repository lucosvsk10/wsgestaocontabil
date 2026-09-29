import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}}),digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`i`))?.[1]?.trim()||"",section=(x:string,n:string)=>tag(x,n);
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
async function gun(v:string){const bytes=Uint8Array.from(atob(v.replace(/\s/g,"")),c=>c.charCodeAt(0)),stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));return D.decode(await new Response(stream).arrayBuffer())}
function parseNFSe(xml:string,companyCnpj:string){const inf=section(xml,"infNFSe")||xml,emit=section(inf,"emit"),dps=section(inf,"DPS"),infDps=section(dps,"infDPS")||dps,toma=section(infDps,"toma"),issuer=digits(tag(emit,"CNPJ")||tag(emit,"CPF")),recipient=digits(tag(toma,"CNPJ")||tag(toma,"CPF")),direction=issuer===companyCnpj?"saida":recipient===companyCnpj?"entrada":"relacionada",status=tag(inf,"cStat");return{direction,issuer,issuerName:tag(emit,"xNome"),recipient,number:tag(inf,"nNFSe")||tag(infDps,"nDPS"),series:tag(infDps,"serie"),issue:tag(infDps,"dhEmi")||tag(inf,"dhProc")||null,value:Number(tag(inf,"vLiq")||tag(infDps,"vServ")||0),status,statusText:status==="100"?"Autorizada":status?`cStat ${status}`:"Fiscal"}}

async function fetchAdnBatch(gatewayToken:string,material:any,cnpj:string,nsu:number){
 const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/nfe-event",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${gatewayToken}`},body:JSON.stringify({action:"nfse-dfe",...material,cnpj,nsu}),signal:AbortSignal.timeout(60000)});
 const o=await r.json().catch(()=>({})) as any;
 if(!r.ok)throw Error(`gateway_http_${r.status}:${String(o?.error||"").slice(0,120)}`);
 const status=Number(o?.http||0),data=o?.response||{};
 if(status===404)return {status,data:{}};
 if(!o?.ok||status<200||status>=300)throw Error(`adn_http_${status||"unknown"}`);
 return {status,data};
}

Deno.serve(async req => {
  const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try {
    const [{ data: t }, { data: g }] = await Promise.all([
      admin.from("_fiscal_sales_debug_token").select("token").eq("id", true).maybeSingle(),
      admin.from("_fiscal_vercel_gateway_token").select("token").eq("id", true).maybeSingle(),
    ]);
    if (!t?.token || req.headers.get("x-debug-token") !== String(t.token)) return J({ error: "unauthorized" }, 403);
    const gatewayToken = String(g?.token || "");
    if (!gatewayToken) return J({ error: "gateway_token_missing" }, 500);

    const body = await req.json().catch(() => ({})) as any;
    const only = String(body.company_id || "");
    const maxBatches = Math.min(20, Math.max(1, Number(body.max_batches || 8)));
    let query = admin.from("fiscal_companies").select("id,cnpj,created_by,status,fiscal_settings").eq("status", "ativa");
    if (only) query = query.eq("id", only);
    const { data: companies, error: companiesError } = await query;
    if (companiesError) throw companiesError;

    const out: any[] = [];
    for (const company of companies || []) {
      let state: any = null;
      try {
        ({ data: state } = await admin.from("fiscal_nfse_sync_state").select("*").eq("company_id", company.id).maybeSingle());
        const now = new Date();
        if (state?.next_scheduled_at && !body.force && new Date(state.next_scheduled_at) > now) {
          out.push({ company_id: company.id, status: "not_due", last_nsu: Number(state.last_nsu || 0) });
          continue;
        }

        const startedAt = now.toISOString();
        await admin.from("fiscal_nfse_sync_state").upsert({
          company_id: company.id,
          status: "running",
          source_exhausted: false,
          last_started_at: startedAt,
          last_error: null,
          updated_at: startedAt,
        });

        const { data: certificate } = await admin.from("fiscal_certificates")
          .select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv")
          .eq("company_id", company.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (!certificate) throw Error("certificate_missing");

        const pfx = await dec(certificate.certificate_ciphertext, certificate.certificate_iv);
        const password = await dec(certificate.password_ciphertext, certificate.password_iv);
        const parsedCertificate = lerCertificado(Buffer.from(pfx, "base64"), password);
        const gatewayMaterial = {
          certificate_pem: parsedCertificate.certificadoPem,
          private_key_pem: parsedCertificate.chavePrivadaPem,
          chain_pem: parsedCertificate.cadeiaPem || [],
        };
        const settings = (company.fiscal_settings || {}) as any;
        const historyStart = String(
          settings.history_window_mode === "previous_full_month_plus_current" ? settings.history_start_date || "" : "",
        );

        let current = Number(state?.last_nsu || 0);
        let saved = 0;
        let events = 0;
        let batches = 0;
        let skippedOlder = 0;
        let sourceExhausted = false;
        let terminalReason = "batch_limit";

        for (let index = 0; index < maxBatches; index++) {
          const { status, data } = await fetchAdnBatch(gatewayToken, gatewayMaterial, digits(company.cnpj), current);
          if (status === 404) {
            sourceExhausted = true;
            terminalReason = "source_404";
            break;
          }

          const lote = Array.isArray(data?.LoteDFe) ? data.LoteDFe : [];
          batches++;
          if (!lote.length) {
            sourceExhausted = true;
            terminalReason = "empty_batch";
            break;
          }

          let advanced = false;
          for (const item of lote) {
            const nsu = Number(item.NSU || 0);
            if (nsu > current) {
              current = nsu;
              advanced = true;
            }
            const key = String(item.ChaveAcesso || "");
            const raw = String(item.ArquivoXml || "");
            let xml = "";
            try {
              xml = await gun(raw);
            } catch {
              try { xml = atob(raw); } catch { continue; }
            }
            const tipo = String(item.TipoDocumento || "").toUpperCase();

            if (tipo === "NFSE" || /<NFSe\b/i.test(xml)) {
              const document = parseNFSe(xml, digits(company.cnpj));
              if (historyStart && document.issue && document.issue.slice(0, 10) < historyStart) {
                skippedOlder++;
                continue;
              }
              if (document.direction !== "relacionada") {
                const { error } = await admin.from("fiscal_dfe_documents").upsert({
                  user_id: company.created_by,
                  company_id: company.id,
                  cnpj: digits(company.cnpj),
                  environment: "producao",
                  uf_code: "00",
                  nsu: `NFSE-${String(nsu).padStart(15, "0")}`,
                  source: "national_nfse_adn",
                  source_id: key || String(nsu),
                  schema_name: "NFSe_Nacional",
                  document_kind: "nfse",
                  direction: document.direction,
                  access_key: key || null,
                  model: "NFS-e",
                  issue_date: document.issue,
                  value: document.value,
                  issuer_cnpj: document.issuer || null,
                  issuer_name: document.issuerName || null,
                  recipient_cnpj: document.recipient || null,
                  note_number: document.number || null,
                  series: document.series || null,
                  status_code: document.status || null,
                  status_text: document.statusText,
                  full_xml: true,
                  xml,
                  updated_at: new Date().toISOString(),
                }, { onConflict: "user_id,cnpj,environment,uf_code,nsu" });
                if (error) throw error;
                saved++;
              }
            } else {
              const eventDate = tag(xml, "dhEvento") || tag(xml, "dhProc") || null;
              if (historyStart && eventDate && eventDate.slice(0, 10) < historyStart) {
                skippedOlder++;
                continue;
              }
              const cancelled = xml.toLowerCase().includes("cancel");
              const eventKey = key || tag(xml, "chNFSe") || tag(xml, "chaveAcesso");
              const { error } = await admin.from("fiscal_dfe_events").upsert({
                user_id: company.created_by,
                company_id: company.id,
                cnpj: digits(company.cnpj),
                environment: "producao",
                uf_code: "00",
                nsu: `NFSE-EVENT-${String(nsu).padStart(15, "0")}`,
                schema_name: tipo || "Evento_NFSe",
                access_key: eventKey || null,
                event_type: tag(xml, "tpEvento") || tipo || "EVENTO_NFSE",
                event_description: tag(xml, "xDesc") || tag(xml, "descEvento") || (cancelled ? "Cancelamento de NFS-e" : "Evento de NFS-e"),
                status_code: tag(xml, "cStat") || null,
                event_at: eventDate,
                xml,
                source: "national_nfse_adn",
                updated_at: new Date().toISOString(),
              }, { onConflict: "user_id,cnpj,environment,uf_code,nsu" });
              if (error) throw error;
              if (cancelled && eventKey) {
                await admin.from("fiscal_dfe_documents")
                  .update({ status_code: "101", status_text: "Cancelada", updated_at: new Date().toISOString() })
                  .eq("company_id", company.id)
                  .eq("access_key", eventKey);
              }
              events++;
            }
          }

          if (!advanced) throw Error("adn_cursor_not_advancing");
          await admin.from("fiscal_nfse_sync_state").upsert({
            company_id: company.id,
            last_nsu: current,
            status: "running",
            source_exhausted: false,
            documents_saved: Number(state?.documents_saved || 0) + saved,
            events_saved: Number(state?.events_saved || 0) + events,
            last_run_documents: saved,
            last_run_events: events,
            last_run_batches: batches,
            updated_at: new Date().toISOString(),
          });

          if (lote.length < 50) {
            sourceExhausted = true;
            terminalReason = "partial_final_batch";
            break;
          }
        }

        const finishedAt = new Date().toISOString();
        const nextScheduledAt = new Date(Date.now() + (sourceExhausted ? 3 * 60 * 60_000 : 60_000)).toISOString();
        const finalState: Record<string, unknown> = {
          company_id: company.id,
          last_nsu: current,
          status: sourceExhausted ? "idle" : "catching_up",
          source_exhausted: sourceExhausted,
          documents_saved: Number(state?.documents_saved || 0) + saved,
          events_saved: Number(state?.events_saved || 0) + events,
          last_run_documents: saved,
          last_run_events: events,
          last_run_batches: batches,
          consecutive_failures: 0,
          next_scheduled_at: nextScheduledAt,
          last_error: null,
          updated_at: finishedAt,
        };
        if (sourceExhausted) {
          finalState.last_completed_at = finishedAt;
          finalState.last_caught_up_at = finishedAt;
        }
        const { error: stateError } = await admin.from("fiscal_nfse_sync_state").upsert(finalState);
        if (stateError) throw stateError;

        out.push({
          company_id: company.id,
          status: sourceExhausted ? "caught_up" : "catching_up",
          source_exhausted: sourceExhausted,
          terminal_reason: terminalReason,
          history_start: historyStart || null,
          last_nsu: current,
          saved,
          events,
          skipped_older: skippedOlder,
          batches,
          transport: "vercel-node",
        });
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : String(caught);
        await admin.from("fiscal_nfse_sync_state").upsert({
          company_id: company.id,
          status: "retrying",
          source_exhausted: false,
          consecutive_failures: Number(state?.consecutive_failures || 0) + 1,
          last_error: message,
          next_scheduled_at: new Date(Date.now() + 15 * 60_000).toISOString(),
          updated_at: new Date().toISOString(),
        });
        out.push({ company_id: company.id, status: "retrying", error: message });
      }
    }
    return J({ ok: true, companies: out, transport: "vercel-node" });
  } catch (caught) {
    return J({ error: caught instanceof Error ? caught.message : String(caught) }, 500);
  }
});
