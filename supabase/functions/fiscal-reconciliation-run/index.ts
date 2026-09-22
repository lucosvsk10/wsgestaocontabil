import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization,x-client-info,apikey,content-type"};
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"content-type":"application/json","cache-control":"no-store"}});
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const validDate=(v:unknown)=>/^\d{4}-\d{2}-\d{2}$/.test(String(v||""));
const startTs=(d:string)=>d+"T00:00:00-03:00";
const endTs=(d:string)=>d+"T23:59:59.999-03:00";

type DocType="purchase_nfe55"|"sale_nfe55"|"sale_nfce65"|"purchase_nfse"|"sale_nfse";

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
    const start=String(body.start||"2026-07-31"),end=String(body.end||"2026-09-21");
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
        const [purchaseState,salesState,nfseState,dfeStates,credRows]=await Promise.all([
          admin.from("fiscal_purchase_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
          admin.from("fiscal_sales_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
          admin.from("fiscal_nfse_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
          admin.from("fiscal_dfe_sync_state").select("ult_nsu,max_nsu,last_status_code,last_status_message,last_synced_at").eq("cnpj",cnpj).order("last_synced_at",{ascending:false}).limit(5),
          admin.from("fiscal_state_credentials").select("id,uf,is_active,last_verification_status,last_verified_at").eq("company_id",companyId).eq("is_active",true),
        ]);
        const pState=purchaseState.data||null,sState=salesState.data||null,nState=nfseState.data||null;
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

        // NF-e purchases: exact AL portal when available, otherwise national DFe cursor completeness.
        if(uf==="AL"&&alReport?.ok&&Array.isArray(alReport.purchase_all_keys)){
          const source=new Set<string>(alReport.purchase_all_keys.map(dg).filter((k:string)=>k.length===44));
          await upsert(admin,companyId,start,end,"purchase_nfe55",{
            sourceName:"SEFAZ/AL relatório NF-e",
            sourceConfirmed:true,sourceKeys:source,siteKeys:keySet(nfe55In),
            xmlPending:nfe55In.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfe55In.length-keySet(nfe55In).size,
            details:{cancelled:Number(alReport.purchase_cancelled_unique_keys||0),portal_credential:true},
          });
        }else{
          const caughtUp=Boolean(dfe&&String(dfe.ult_nsu||"")===String(dfe.max_nsu||"")&&String(dfe.last_status_code||"")!=="");
          const site=keySet(nfe55In);
          await upsert(admin,companyId,start,end,"purchase_nfe55",{
            sourceName:"NFeDistribuicaoDFe",
            sourceConfirmed:caughtUp,sourceKeys:site,siteKeys:site,
            xmlPending:nfe55In.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfe55In.length-keySet(nfe55In).size,
            blocked:!caughtUp,
            reason:caughtUp?null:"Distribuição nacional ainda não está comprovadamente em dia.",
            details:{ult_nsu:dfe?.ult_nsu||null,max_nsu:dfe?.max_nsu||null,cstat:dfe?.last_status_code||null},
          });
        }

        // NF-e 55 sales in AL need the authenticated state report; SP has no implemented issuer listing yet.
        if(uf==="AL"&&alReport?.ok&&Array.isArray(alReport.self_issued_keys)){
          const source55=new Set<string>(alReport.self_issued_keys.map(dg).filter((k:string)=>k.length===44&&k.slice(20,22)==="55"));
          await upsert(admin,companyId,start,end,"sale_nfe55",{
            sourceName:"SEFAZ/AL relatório NF-e emitidas",
            sourceConfirmed:true,sourceKeys:source55,siteKeys:keySet(nfe55Out),
            xmlPending:nfe55Out.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfe55Out.length-keySet(nfe55Out).size,
            details:{portal_credential:true},
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
          const confirmed=Boolean(sState?.last_completed_at&&!sState?.last_error);
          await upsert(admin,companyId,start,end,"sale_nfce65",{
            sourceName:"SEFAZ/SP SAE-NFC-e",sourceConfirmed:confirmed,
            sourceKeys:keySet(src),siteKeys:keySet(nfce65Out),
            xmlPending:nfce65Out.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfce65Out.length-keySet(nfce65Out).size,
            blocked:!confirmed,reason:confirmed?null:(sState?.last_error||"Consulta SAE-NFC-e não concluída."),
            details:{sync_status:sState?.status||null,last_completed_at:sState?.last_completed_at||null},
          });
        }else if(uf==="AL"){
          const rec=await paged<any>((from,to)=>admin.from("fiscal_sales_reconciliation")
            .select("access_key,status,issue_date,series,note_number,xml_status")
            .eq("company_id",companyId).eq("model","65")
            .in("status",["found","cancelled"])
            .gte("issue_date",startTs(start)).lte("issue_date",endTs(end)).range(from,to));
          const confirmed=Boolean(sState?.reconciliation_complete&&Number(sState?.reconciliation_pending||0)===0);
          await upsert(admin,companyId,start,end,"sale_nfce65",{
            sourceName:"SVRS/SEFAZ NFC-e reconciliation",sourceConfirmed:confirmed,
            sourceKeys:keySet(rec),siteKeys:keySet(nfce65Out),
            xmlPending:nfce65Out.filter(r=>!r.full_xml||!r.xml).length,duplicateCount:nfce65Out.length-keySet(nfce65Out).size,
            blocked:!confirmed,
            reason:confirmed?null:(sState?.last_error||"Reconciliação de NFC-e ainda não foi concluída."),
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