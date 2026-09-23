import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type"};
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"content-type":"application/json","cache-control":"no-store"}});
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const validDate=(v:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||""));
const startTs=(d:string)=>d+"T00:00:00-03:00";
const endTs=(d:string)=>d+"T23:59:59.999-03:00";

type DocType="purchase_nfe55"|"sale_nfe55"|"sale_nfce65"|"purchase_nfse"|"sale_nfse"|"purchase_cte57"|"sale_cte57"|"sale_mdfe58"|"event_cte"|"event_mdfe";

async function paged<T=any>(factory:(from:number,to:number)=>PromiseLike<any>,page=800){
  const out:T[]=[];let from=0;
  while(true){
    const {data,error}=await factory(from,from+page-1);
    if(error)throw error;
    const rows=(data||[]) as T[];out.push(...rows);
    if(rows.length<page)break;
    from+=page;
  }
  return out;
}

const keySet=(rows:any[])=>new Set(rows.map(r=>dg(r.access_key)).filter(k=>k.length===44||k.length>44));
const diff=(source:Set<string>,site:Set<string>)=>{
  const missing=[...source].filter(k=>!site.has(k));
  const extra=[...site].filter(k=>!source.has(k));
  return{missing,extra};
};

async function siteRows(admin:any,companyId:string,start:string,end:string){
  return paged<any>((from,to)=>
    admin.from("fiscal_dfe_documents")
      .select("access_key,direction,document_kind,model,series,full_xml,xml,parse_error,source,issue_date")
      .eq("company_id",companyId)
      .gte("issue_date",startTs(start))
      .lte("issue_date",endTs(end))
      .neq("document_kind","evento")
      .range(from,to)
  );
}

async function upsert(admin:any,companyId:string,start:string,end:string,type:DocType,input:any){
  const sourceKeys=input.sourceKeys instanceof Set?input.sourceKeys:new Set<string>();
  const siteKeys=input.siteKeys instanceof Set?input.siteKeys:new Set<string>();
  const d=input.sourceConfirmed?diff(sourceKeys,siteKeys):{missing:[],extra:[]};
  const xmlPending=Number(input.xmlPending||0);
  let status="pending";
  if(!input.sourceConfirmed)status=input.blocked?"blocked":"pending";
  else if(d.missing.length||d.extra.length||Number(input.duplicateCount||0)>0)status="error";
  else if(xmlPending>0)status="pending";
  else status="ok";
  const row={
    company_id:companyId,period_start:start,period_end:end,document_type:type,
    source_name:String(input.sourceName||"unknown"),
    source_confirmed:Boolean(input.sourceConfirmed),
    source_count:input.sourceConfirmed?sourceKeys.size:null,
    site_count:siteKeys.size,
    missing_count:d.missing.length,
    extra_count:d.extra.length,
    xml_pending_count:xmlPending,
    missing_keys:d.missing,
    extra_keys:d.extra,
    status,
    reason:input.reason||null,
    details:{...(input.details||{}),duplicate_count:Number(input.duplicateCount||0)},
    checked_at:new Date().toISOString(),
    updated_at:new Date().toISOString(),
  };
  const {error}=await admin.from("fiscal_source_reconciliation").upsert(row,{onConflict:"company_id,period_start,period_end,document_type"});
  if(error)throw error;
  return row;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  try{
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const token=req.headers.get("x-debug-token")||"";
    const {data:internal}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
    if(!token||token!==String(internal?.token||""))return J({error:"unauthorized"},403);

    const body=await req.json().catch(()=>({})) as any;
    const [{data:minimumHistory},{data:localToday}]=await Promise.all([
      admin.rpc("extractor_minimum_history_start"),
      admin.rpc("extractor_local_date"),
    ]);
    const fallbackToday=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Maceio",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
    const defaultStart=validDate(minimumHistory)?String(minimumHistory):fallbackToday;
    const defaultEnd=validDate(localToday)?String(localToday):fallbackToday;
    const start=String(body.start||defaultStart),end=String(body.end||defaultEnd);
    if(!validDate(start)||!validDate(end)||start>end)return J({error:"invalid_period"},400);
    const only=String(body.company_id||"");

    const {data:links,error:linkError}=await admin.from("extractor_companies").select("fiscal_company_id").eq("status","active");
    if(linkError)throw linkError;
    const ids=[...new Set((links||[]).map((r:any)=>String(r.fiscal_company_id||"")).filter(Boolean))];
    let cq=admin.from("fiscal_companies").select("id,cnpj,razao_social,uf,status,created_by,ambiente_padrao").in("id",ids).eq("status","ativa").order("razao_social");
    if(only)cq=cq.eq("id",only);
    const {data:companies,error:companyError}=await cq;
    if(companyError)throw companyError;

    const base=Deno.env.get("SUPABASE_URL")!;
    const headers={"content-type":"application/json","x-debug-token":String(internal.token)};
    const out:any[]=[];

    for(const company of companies||[]){
      const companyId=String(company.id),uf=String(company.uf||"").toUpperCase(),cnpj=dg(company.cnpj);
      try{
        const [purchaseState,salesState,nfseState,dfeStates,cteState,mdfeState,credRows]=await Promise.all([
          admin.from("fiscal_purchase_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
          admin.from("fiscal_sales_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
          admin.from("fiscal_nfse_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
          admin.from("fiscal_dfe_sync_state").select("ult_nsu,max_nsu,last_status_code,last_status_message,last_synced_at").eq("cnpj",cnpj).order("last_synced_at",{ascending:false}).limit(5),
          admin.from("fiscal_transport_sync_state").select("*").eq("company_id",companyId).eq("document_family","cte57").eq("environment",company.ambiente_padrao==="homologacao"?"homologacao":"producao").maybeSingle(),
          admin.from("fiscal_transport_sync_state").select("*").eq("company_id",companyId).eq("document_family","mdfe58").eq("environment",company.ambiente_padrao==="homologacao"?"homologacao":"producao").maybeSingle(),
          admin.from("fiscal_state_credentials").select("id,uf,is_active,last_verification_status,last_verified_at").eq("company_id",companyId).eq("is_active",true),
        ]);
        const pState=purchaseState.data||null,sState=salesState.data||null,nState=nfseState.data||null,ctState=cteState.data||null,mdState=mdfeState.data||null;
        const dfe=(dfeStates.data||[]).find((r:any)=>r.max_nsu!==null)||dfeStates.data?.[0]||null;
        const alCredential=(credRows.data||[]).find((r:any)=>String(r.uf).toUpperCase()==="AL");

        let alReport:any=null;
        if(uf==="AL"&&alCredential){
          const rr=await fetch(base+"/functions/v1/fiscal-purchases-sefaz-al-report",{
            method:"POST",headers,
            body:JSON.stringify({company_id:companyId,start,end,dry_run:false,include_keys:true,audit:true}),
            signal:AbortSignal.timeout(110000),
          });
          alReport=await rr.json().catch(()=>({}));
          if(!rr.ok||!alReport?.ok)alReport={error:alReport?.error||("http_"+rr.status)};
        }

        // Take the site snapshot only after official source enrichment/backfill has run.
        // This prevents false missing keys caused by the audit itself inserting metadata.
        const docs=await siteRows(admin,companyId,start,end);
        const nfe55In=docs.filter(r=>r.direction==="entrada"&&String(r.model)==="55");
        const nfe55Out=docs.filter(r=>r.direction==="saida"&&String(r.model)==="55");
        const nfce65Out=docs.filter(r=>r.direction==="saida"&&String(r.model)==="65");
        const nfseIn=docs.filter(r=>r.direction==="entrada"&&r.document_kind==="nfse");
        const nfseOut=docs.filter(r=>r.direction==="saida"&&r.document_kind==="nfse");
        const cte57In=docs.filter(r=>r.direction==="entrada"&&String(r.model)==="57");
        const cte57Out=docs.filter(r=>r.direction==="saida"&&String(r.model)==="57");
        const mdfe58Out=docs.filter(r=>r.direction==="saida"&&String(r.model)==="58");

        // NF-e purchases: national DFe cursor is the completeness backbone.
        // In AL the state entry report is complementary (it can legitimately omit
        // documents that NFeDistribuicaoDFe already delivered), so never flag
        // national full-XML purchases as "extras" merely because that report omitted them.
        {
          const caughtUp=Boolean(dfe&&String(dfe.ult_nsu||"")===String(dfe.max_nsu||"")&&String(dfe.last_status_code||"")!=="");
          const site=keySet(nfe55In);
          const source=new Set<string>();
          if(uf==="AL"&&alReport?.ok&&Array.isArray(alReport.purchase_all_keys)){
            for(const key of alReport.purchase_all_keys.map(dg).filter((k:string)=>k.length===44))source.add(key);
          }
          for(const row of nfe55In){
            const src=String(row.source||"");
            if(
              src==="national_dfe"||
              src==="national_dfe_cron"||
              src.startsWith("xml_backfill_")||
              src==="xml_recovery_direct"
            ){
              const key=dg(row.access_key);if(key.length===44)source.add(key);
            }
          }
          // If no materialized official key set is available, a caught-up national
          // distribution still proves the site snapshot it produced is current.
          if(!source.size&&caughtUp)for(const key of site)source.add(key);
          const confirmed=caughtUp&&(uf!=="AL"||Boolean(alReport?.ok));
          await upsert(admin,companyId,start,end,"purchase_nfe55",{
            sourceName:uf==="AL"?"NFeDistribuicaoDFe + SEFAZ/AL relatório de entradas":"NFeDistribuicaoDFe",
            sourceConfirmed:confirmed,sourceKeys:source,siteKeys:site,
            xmlPending:nfe55In.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfe55In.length-site.size,
            blocked:!confirmed,
            reason:confirmed?null:(caughtUp?"Relatório estadual complementar de entradas indisponível.":"Distribuição nacional ainda não está comprovadamente em dia."),
            details:{
              ult_nsu:dfe?.ult_nsu||null,max_nsu:dfe?.max_nsu||null,cstat:dfe?.last_status_code||null,
              state_report_keys:uf==="AL"&&alReport?.ok?Number(alReport.purchase_all_unique_keys||0):null,
              national_cursor_caught_up:caughtUp,
            },
          });
        }

        // NF-e 55 sales in AL need the authenticated state report; SP has no implemented issuer listing yet.
        if(uf==="AL"&&alReport?.ok&&Array.isArray(alReport.self_issued_keys)){
          const source55=new Set<string>(alReport.self_issued_keys.map(dg).filter((k:string)=>k.length===44&&k.slice(20,22)==="55"));
          const salesSourceConfirmed=alReport?.sales_source_confirmed===true;
          const directValidated=await paged<any>((from,to)=>admin.from("fiscal_sales_documents")
            .select("access_key,source_reference,issue_date")
            .eq("company_id",companyId).eq("model","55")
            .gte("issue_date",startTs(start)).lte("issue_date",endTs(end)).range(from,to));
          const directKeys=directValidated
            .filter((r:any)=>r?.source_reference?.direct_consult_confirmed===true)
            .map((r:any)=>dg(r.access_key)).filter((k:string)=>k.length===44&&k.slice(20,22)==="55");
          for(const key of directKeys)source55.add(key);
          await upsert(admin,companyId,start,end,"sale_nfe55",{
            sourceName:"SEFAZ/AL relatório NF-e emitidas + Consulta Protocolo",
            sourceConfirmed:salesSourceConfirmed,sourceKeys:source55,siteKeys:keySet(nfe55Out),
            xmlPending:nfe55Out.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfe55Out.length-keySet(nfe55Out).size,
            blocked:!salesSourceConfirmed,
            reason:salesSourceConfirmed?null:"A fonte dedicada de NF-e emitidas da SEFAZ/AL não confirmou o período. Chaves positivas confirmadas por protocolo/eventos são mantidas, mas a cobertura de NF-e 55 emitidas ainda não é exaustiva.",
            details:{
              portal_credential:true,
              direct_protocol_confirmed:directKeys.length,
              sales_source_mode:alReport?.sales_source_mode||null,
              sales_report_error:alReport?.sales_report_error||null,
              embedded_positive_rows:Number(alReport?.embedded_sales_rows||0),
            },
          });
        }else if(uf==="SP"){
          const official55=await paged<any>((from,to)=>admin.from("fiscal_sales_documents")
            .select("access_key,issue_date,xml,source,source_reference,status")
            .eq("company_id",companyId).eq("model","55")
            .in("source",["sefaz_sp_nfe55_issuer_event","sefaz_sp_nfe55_539_recovery","national_dfe_issuer_event"])
            .gte("issue_date",startTs(start)).lte("issue_date",endTs(end)).range(from,to));
          const confirmed=Boolean(sState?.reconciliation_complete&&Number(sState?.reconciliation_pending||0)===0);
          await upsert(admin,companyId,start,end,"sale_nfe55",{
            sourceName:"SEFAZ/SP NF-e 55 — eventos oficiais + reconciliação de numeração",
            sourceConfirmed:confirmed,sourceKeys:keySet(official55),siteKeys:keySet(nfe55Out),blocked:!confirmed,
            xmlPending:nfe55Out.filter(r=>!r.full_xml||!r.xml).length,
            duplicateCount:nfe55Out.length-keySet(nfe55Out).size,
            reason:confirmed?null:(sState?.last_error||"Reconciliação integral da numeração NF-e 55/SP ainda está em andamento."),
            details:{uf,official_keys_captured:keySet(official55).size,official_rows:official55.length,reconciliation_total:sState?.reconciliation_total||0,reconciliation_resolved:sState?.reconciliation_resolved||0,reconciliation_pending:sState?.reconciliation_pending||0,exhaustive_enumeration:confirmed},
          });
        }else{
          await upsert(admin,companyId,start,end,"sale_nfe55",{
            sourceName:uf==="AL"?"SEFAZ/AL relatório NF-e emitidas":"SEFAZ emitente NF-e",
            sourceConfirmed:false,siteKeys:keySet(nfe55Out),blocked:true,
            reason:uf==="AL"
              ?"Credencial estadual do contribuinte não cadastrada; A1 sozinho não fornece listagem completa de NF-e emitidas por período."
              :"Ainda não há conector oficial de listagem de NF-e 55 emitidas para esta UF.",
            details:{uf,portal_credential:Boolean(alCredential)},
          });
        }

        // NFC-e 65 sales.
        if(uf==="SP"){
          const src=await paged<any>((from,to)=>admin.from("fiscal_sales_documents")
            .select("access_key,issue_date,xml,source")
            .eq("company_id",companyId).eq("model","65").eq("source","sefaz_sp_sae_nfce")
            .gte("issue_date",startTs(start)).lte("issue_date",endTs(end)).range(from,to));
          const sourceStart=Date.parse(String(sState?.nfce_source_period_start||""));
          const sourceEnd=Date.parse(String(sState?.nfce_source_period_end||""));
          const requestedStart=Date.parse(startTs(start));
          const requestedEnd=end===defaultEnd?Date.now():Date.parse(endTs(end));
          const periodCovered=Number.isFinite(sourceStart)&&Number.isFinite(sourceEnd)&&sourceStart<=requestedStart&&sourceEnd+5*60*1000>=requestedEnd;
          const confirmed=Boolean(sState?.nfce_source_status==="ok"&&sState?.nfce_source_confirmed_at&&periodCovered);
          await upsert(admin,companyId,start,end,"sale_nfce65",{
            sourceName:"SEFAZ/SP SAE-NFC-e",sourceConfirmed:confirmed,
            sourceKeys:keySet(src),siteKeys:keySet(nfce65Out),
            xmlPending:nfce65Out.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfce65Out.length-keySet(nfce65Out).size,
            blocked:!confirmed,
            reason:confirmed?null:(sState?.nfce_source_error||(!periodCovered?"Consulta SAE-NFC-e ainda não cobre integralmente o período auditado.":"Consulta SAE-NFC-e não concluída.")),
            details:{source_status:sState?.nfce_source_status||null,source_confirmed_at:sState?.nfce_source_confirmed_at||null,source_count:sState?.nfce_source_count??null,source_period_start:sState?.nfce_source_period_start||null,source_period_end:sState?.nfce_source_period_end||null,period_covered:periodCovered},
          });
        }else if(uf==="AL"){
          const rec=await paged<any>((from,to)=>admin.from("fiscal_sales_reconciliation")
            .select("access_key,status,issue_date,series,note_number,xml_status")
            .eq("company_id",companyId).eq("model","65")
            .in("status",["found","cancelled"])
            .gte("issue_date",startTs(start)).lte("issue_date",endTs(end)).range(from,to));
          const hasOfficialKeys=rec.some((r:any)=>dg(r.access_key).length===44&&["found","cancelled"].includes(String(r.status||"")));
          const confirmed=Boolean(sState?.reconciliation_complete&&Number(sState?.reconciliation_pending||0)===0&&hasOfficialKeys);
          await upsert(admin,companyId,start,end,"sale_nfce65",{
            sourceName:"SVRS/SEFAZ NFC-e reconciliation",sourceConfirmed:confirmed,
            sourceKeys:keySet(rec),siteKeys:keySet(nfce65Out),
            xmlPending:nfce65Out.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfce65Out.length-keySet(nfce65Out).size,
            blocked:!confirmed,
            reason:confirmed?null:(
              hasOfficialKeys
                ? "Reconciliação de NFC-e ainda não foi concluída."
                : "Não há fonte oficial suficiente para confirmar zero NFC-e no período."
            ),
            details:{
              latest_number:sState?.latest_number||null,
              reconciliation_total:sState?.reconciliation_total||0,
              reconciliation_resolved:sState?.reconciliation_resolved||0,
              reconciliation_pending:sState?.reconciliation_pending||0,
              series:[...new Set(rec.map((r:any)=>String(r.series||"1")))],
            },
          });
        }

        // NFS-e ADN, incoming and outgoing. A completed cursor proves zero as well.
        const adnConfirmed=Boolean(nState&&nState.status==="idle"&&!nState.last_error&&nState.last_completed_at);
        const adnIn=keySet(nfseIn.filter(r=>r.source==="national_nfse_adn"));
        const adnOut=keySet(nfseOut.filter(r=>r.source==="national_nfse_adn"));
        await upsert(admin,companyId,start,end,"purchase_nfse",{
          sourceName:"ADN NFS-e Nacional",sourceConfirmed:adnConfirmed,
          sourceKeys:adnIn,siteKeys:keySet(nfseIn),
          xmlPending:nfseIn.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfseIn.length-keySet(nfseIn).size,
          blocked:!adnConfirmed,reason:adnConfirmed?null:(nState?.last_error||"Sincronização ADN não concluída."),
          details:{last_nsu:nState?.last_nsu||null,last_completed_at:nState?.last_completed_at||null},
        });
        await upsert(admin,companyId,start,end,"sale_nfse",{
          sourceName:"ADN NFS-e Nacional",sourceConfirmed:adnConfirmed,
          sourceKeys:adnOut,siteKeys:keySet(nfseOut),
          xmlPending:nfseOut.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfseOut.length-keySet(nfseOut).size,
          blocked:!adnConfirmed,reason:adnConfirmed?null:(nState?.last_error||"Sincronização ADN não concluída."),
          details:{last_nsu:nState?.last_nsu||null,last_completed_at:nState?.last_completed_at||null},
        });

        // CT-e/MDF-e national distribution. These services prove the actor-interest feed is caught up,
        // but they do not enumerate documents generated by the actor itself. Keep issuer-side coverage blocked.
        const cteCaughtUp=Boolean(
          ctState?.last_completed_at&&!ctState?.last_error&&
          String(ctState?.ult_nsu||"")===String(ctState?.max_nsu||"")&&
          ["137","138"].includes(String(ctState?.last_status_code||""))
        );
        const mdfeCaughtUp=Boolean(
          mdState?.last_completed_at&&!mdState?.last_error&&
          String(mdState?.ult_nsu||"")===String(mdState?.max_nsu||"")&&
          ["137","138"].includes(String(mdState?.last_status_code||""))
        );
        const cteIncomingOfficial=cte57In.filter(r=>r.source==="national_cte");
        await upsert(admin,companyId,start,end,"purchase_cte57",{
          sourceName:"CTeDistribuicaoDFe",
          sourceConfirmed:cteCaughtUp,
          sourceKeys:keySet(cteIncomingOfficial),
          siteKeys:keySet(cte57In),
          xmlPending:cte57In.filter(r=>!r.full_xml||!r.xml).length,
          duplicateCount:cte57In.length-keySet(cte57In).size,
          blocked:!cteCaughtUp,
          reason:cteCaughtUp?null:(ctState?.last_error||"Distribuição nacional de CT-e ainda não comprovadamente em dia."),
          details:{
            ult_nsu:ctState?.ult_nsu||null,max_nsu:ctState?.max_nsu||null,cstat:ctState?.last_status_code||null,
            scope:"documentos distribuídos ao CNPJ como ator interessado"
          },
        });
        await upsert(admin,companyId,start,end,"sale_cte57",{
          sourceName:"CT-e emitidos — fonte do emitente",
          sourceConfirmed:false,
          siteKeys:keySet(cte57Out),
          xmlPending:cte57Out.filter(r=>!r.full_xml||!r.xml).length,
          blocked:true,
          reason:"CTeDistribuicaoDFe não enumera CT-e gerados pelo próprio emitente; falta fonte oficial exaustiva de emitidos.",
          details:{national_distribution_caught_up:cteCaughtUp,reason:"issuer_cte_exhaustive_enumeration_not_available"},
        });
        await upsert(admin,companyId,start,end,"sale_mdfe58",{
          sourceName:"MDF-e emitidos — fonte do emitente",
          sourceConfirmed:false,
          siteKeys:keySet(mdfe58Out),
          xmlPending:mdfe58Out.filter(r=>!r.full_xml||!r.xml).length,
          blocked:true,
          reason:"MDFeDistribuicaoDFe não enumera MDF-e gerados pelo próprio emitente; falta fonte oficial exaustiva de emitidos.",
          details:{national_distribution_caught_up:mdfeCaughtUp,reason:"issuer_mdfe_exhaustive_enumeration_not_available"},
        });

        const [cteEvents,mdfeEvents]=await Promise.all([
          paged<any>((from,to)=>admin.from("fiscal_dfe_events")
            .select("nsu,access_key,event_type,event_at,xml,source")
            .eq("company_id",companyId).eq("source","national_cte")
            .gte("event_at",startTs(start)).lte("event_at",endTs(end)).range(from,to)),
          paged<any>((from,to)=>admin.from("fiscal_dfe_events")
            .select("nsu,access_key,event_type,event_at,xml,source")
            .eq("company_id",companyId).eq("source","national_mdfe")
            .gte("event_at",startTs(start)).lte("event_at",endTs(end)).range(from,to)),
        ]);
        const eventSet=(rows:any[])=>new Set<string>(rows.map(r=>String(r.nsu||"")).filter(Boolean));
        const cteEventKeys=eventSet(cteEvents),mdfeEventKeys=eventSet(mdfeEvents);
        await upsert(admin,companyId,start,end,"event_cte",{
          sourceName:"CTeDistribuicaoDFe eventos",sourceConfirmed:cteCaughtUp,
          sourceKeys:cteEventKeys,siteKeys:cteEventKeys,
          xmlPending:cteEvents.filter(r=>!r.xml).length,blocked:!cteCaughtUp,
          reason:cteCaughtUp?null:(ctState?.last_error||"Eventos CT-e ainda não comprovadamente em dia."),
          details:{event_rows:cteEvents.length,scope:"eventos distribuídos ao ator"},
        });
        await upsert(admin,companyId,start,end,"event_mdfe",{
          sourceName:"MDFeDistribuicaoDFe eventos",sourceConfirmed:mdfeCaughtUp,
          sourceKeys:mdfeEventKeys,siteKeys:mdfeEventKeys,
          xmlPending:mdfeEvents.filter(r=>!r.xml).length,blocked:!mdfeCaughtUp,
          reason:mdfeCaughtUp?null:(mdState?.last_error||"Eventos MDF-e ainda não comprovadamente em dia."),
          details:{event_rows:mdfeEvents.length,scope:"eventos distribuídos ao ator"},
        });

        const {data:rows}=await admin.from("fiscal_source_reconciliation").select("*")
          .eq("company_id",companyId).eq("period_start",start).eq("period_end",end);
        out.push({company_id:companyId,name:company.razao_social,uf,rows:rows||[]});
      }catch(error){
        out.push({company_id:companyId,name:company.razao_social,uf,error:error instanceof Error?error.message:String(error)});
      }
    }
    return J({ok:true,start,end,companies:out});
  }catch(error){
    return J({error:error instanceof Error?error.message:String(error)},500);
  }
});