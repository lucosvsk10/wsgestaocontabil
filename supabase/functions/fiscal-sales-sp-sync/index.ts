import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp("<(?:\\w+:)?"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?"+n+">","i"))?.[1]?.trim()||"";
const decodeEntities=(s:string)=>s.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&");
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode("ws-fiscal-vault:"+s));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
function extractProc(raw:string){const text=decodeEntities(raw);const m=text.match(/<(?:\w+:)?nfeProc\b[\s\S]*?<\/(?:\w+:)?nfeProc>/i);return m?.[0]?.replace(/<(\/?)\w+:/g,"<$1")||""}
function dtLocal(v:Date){const parts=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Sao_Paulo",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hour12:false}).format(v);return parts.replace(" ","T").slice(0,16)}
async function gzDoc(v:string){const b=Uint8Array.from(atob(v.replace(/\\s/g,"")),c=>c.charCodeAt(0));return D.decode(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer())}

async function gateway(token:string,body:any){
  const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(body),signal:AbortSignal.timeout(70000)});
  const o=await r.json().catch(()=>({})) as any;
  if(!r.ok||!o?.ok)throw new Error("gateway_"+r.status+":"+String(o?.error||o?.response_excerpt||"failed").slice(0,300));
  return String(o.text||"");
}
async function gatewayObject(token:string,body:any){
  const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(body),signal:AbortSignal.timeout(70000)});
  const o=await r.json().catch(()=>({})) as any;
  if(!r.ok||!o?.ok)throw new Error("gateway_"+r.status+":"+String(o?.error||o?.xMotivo||"failed").slice(0,300));
  return o;
}
function keyInfo(v:unknown){const k=dg(v);if(k.length!==44)return null;return{key:k,month:Number("20"+k.slice(2,6)),issuer:k.slice(6,20),model:k.slice(20,22),series:Number(k.slice(22,25)),number:Number(k.slice(25,34))}}
function crtFor(regime:unknown){return String(regime||"").toLowerCase().includes("simples")?"1":"3"}
async function recoverSpNfe55Numbers(admin:any,c:any,gatewayToken:string,gatewayCertificate:any,historyStart:string,batch=12,lookahead=15){
  const cnpj=dg(c.cnpj),historyMonth=Number(historyStart.slice(0,4)+historyStart.slice(5,7));
  const [{data:events,error:ee},{data:rec,error:re}]=await Promise.all([
    admin.from("fiscal_dfe_events").select("access_key").eq("company_id",c.id).not("access_key","is",null).limit(10000),
    admin.from("fiscal_sales_reconciliation").select("series,note_number,status,access_key,cstat").eq("company_id",c.id).eq("model","55").limit(10000)
  ]);
  if(ee)throw ee;if(re)throw re;
  const infos:any[]=[];
  for(const row of [...(events||[]),...(rec||[])]){const i=keyInfo((row as any).access_key);if(i&&i.issuer===cnpj&&i.model==="55")infos.push(i)}
  const seriesList=[...new Set(infos.map(i=>i.series))].sort((a,b)=>a-b);
  if(!seriesList.length)return{complete:false,reason:"series_not_discovered",processed:0};
  const maps=new Map<number,Map<number,any>>();
  for(const row of rec||[]){const s=Number(row.series),n=Number(row.note_number);if(!maps.has(s))maps.set(s,new Map());maps.get(s)!.set(n,row)}
  const scopes:any[]=[],candidates:any[]=[];
  for(const series of seriesList){
    const si=infos.filter(i=>i.series===series),before=si.filter(i=>i.month<historyMonth),inside=si.filter(i=>i.month>=historyMonth);
    const prior=before.length?Math.max(...before.map(i=>i.number)):0,minInside=inside.length?Math.min(...inside.map(i=>i.number)):0,maxInside=inside.length?Math.max(...inside.map(i=>i.number)):prior;
    if(!maxInside)continue;
    const latestMonth=Math.max(...si.map(i=>i.month)),latestRows=si.filter(i=>i.month===latestMonth),latestMin=Math.min(...latestRows.map(i=>i.number)),latestMax=Math.max(...latestRows.map(i=>i.number));
    const floor=prior?prior+1:Math.max(1,minInside-30),end=maxInside+lookahead,map=maps.get(series)||new Map();
    scopes.push({series,floor,max_known:maxInside,end,latest_month:latestMonth,latest_min:latestMin,latest_max:latestMax});
    for(let n=floor;n<=end;n++){const row=map.get(n),st=String(row?.status||"");if(!row||["pending","error","not_found"].includes(st)||(st==="not_authorized"&&String(row?.cstat||"")!=="481")){const priority=n>=latestMin&&n<=latestMax?0:(n<=maxInside?1:2);candidates.push({series,n,priority})}}
  }
  candidates.sort((a,b)=>a.priority-b.priority||a.series-b.series||a.n-b.n);
  let found=0,cancelled=0,unused=0,failed=0,cooldown=false;const failures:any[]=[];
  const probeBody=(series:number,note_number:number)=>({action:"sp-nfe-recover-key",environment:"production",...gatewayCertificate,
    issuer_cnpj:c.cnpj,issuer_ie:c.inscricao_estadual,issuer_name:c.razao_social,issuer_trade_name:c.nome_fantasia,
    issuer_city_code:c.codigo_municipio,issuer_city:c.municipio,issuer_street:c.endereco?.logradouro,issuer_number:c.endereco?.numero,
    issuer_district:c.endereco?.bairro,issuer_zip:c.endereco?.cep,crt:crtFor(c.regime_tributario),series,note_number});
  const control=infos.slice().sort((a,b)=>b.number-a.number)[0];
  let probeValidated=false;
  try{
    if(!control)throw Error("sp_recovery_control_missing");
    const check=await gatewayObject(gatewayToken,probeBody(control.series,control.number));
    probeValidated=Boolean(check?.exists&&String(check?.cStat||"")==="539"&&dg(check?.access_key)===control.key);
    if(!probeValidated)throw Error("sp_recovery_control_failed:"+String(check?.cStat||"")+":"+String(check?.xMotivo||""));
  }catch(e){
    const msg=e instanceof Error?e.message:String(e);
    if(msg.includes("656")||/Consumo Indevido/i.test(msg))cooldown=true;
    failures.push({control:true,series:control?.series||null,note_number:control?.number||null,error:msg});
  }
  if(!probeValidated){
    const now=new Date().toISOString(),waitMinutes=cooldown?65:30;
    await admin.from("fiscal_sales_sync_state").update({
      status:cooldown?"cooldown":"error",reconciliation_complete:false,
      last_error:failures[0]?.error||"Falha ao validar controle 539 da recuperação NF-e 55/SP",
      next_scheduled_at:new Date(Date.now()+waitMinutes*60000).toISOString(),updated_at:now
    }).eq("company_id",c.id);
    return{processed:0,found:0,cancelled:0,unused:0,failed:1,pending:candidates.length,complete:false,cooldown,probe_validated:false,scopes,failures:failures.slice(0,6)};
  }
  for(const item of candidates.slice(0,Math.max(1,Math.min(14,batch)))){
    const now=new Date().toISOString();
    try{
      const recovery=await gatewayObject(gatewayToken,probeBody(item.series,item.n));
      if(recovery.exists&&/^\d{44}$/.test(String(recovery.access_key||""))){
        const key=String(recovery.access_key),info=keyInfo(key);if(!info||info.issuer!==cnpj||info.model!=="55"||info.series!==item.series||info.number!==item.n)throw Error("recovery_key_identity_mismatch");
        const text=await gateway(gatewayToken,{action:"sp-nfe-consult",environment:"production",...gatewayCertificate,access_key:key});
        const stats=[...text.matchAll(/<(?:\w+:)?cStat>(\d+)<\/(?:\w+:)?cStat>/g)].map(m=>m[1]),motives=[...text.matchAll(/<(?:\w+:)?xMotivo>([\s\S]*?)<\/(?:\w+:)?xMotivo>/g)].map(m=>m[1].trim());
        const isCancelled=/<(?:\w+:)?tpEvento>110111<\/(?:\w+:)?tpEvento>/i.test(text)||stats.includes("101"),status=isCancelled?"Cancelada":(motives.find(m=>/autorizado o uso/i.test(m))||motives[0]||"Autorizada"),issue=tag(text,"dhEmi")||null,series=String(info.series),number=String(info.number);
        const source="sefaz_sp_nfe55_539_recovery",sourceReference={service:"NFeAutorizacao4_recovery_539",recovery_cstat:recovery.cStat,protocol:tag(text,"nProt")||null,official:true,xml_pending:true};
        const {error:se}=await admin.from("fiscal_sales_documents").upsert({company_id:c.id,uf:"SP",model:"55",access_key:key,document_number:number,series,issue_date:issue,status,total_value:null,recipient_document:null,recipient_name:null,xml:null,source,source_reference:sourceReference,updated_at:now},{onConflict:"company_id,access_key"});if(se)throw se;
        const {error:de}=await admin.from("fiscal_dfe_documents").upsert({user_id:c.created_by,company_id:c.id,cnpj:c.cnpj,environment:"producao",uf_code:"35",nsu:"SP-NFE55-"+key,schema_name:"retConsSitNFe_v4.00",document_kind:"nfe",direction:"saida",access_key:key,issue_date:issue,value:null,issuer_cnpj:c.cnpj,issuer_name:c.razao_social,note_number:number,series,status_code:isCancelled?"101":"100",full_xml:false,xml:null,source,source_id:key,model:"55",status_text:status,updated_at:now},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(de)throw de;
        const {error:rr}=await admin.from("fiscal_sales_reconciliation").upsert({company_id:c.id,model:"55",series,note_number:info.number,status:isCancelled?"cancelled":"found",access_key:key,issue_date:issue,cstat:isCancelled?"101":"100",xmotivo:status,attempts:1,last_checked_at:now,resolved_at:now,updated_at:now,xml_status:"pending",xml_attempts:0,detail_status:"pending",detail_attempts:0,event_status:isCancelled?"pending":"not_applicable",event_attempts:0},{onConflict:"company_id,model,series,note_number"});if(rr)throw rr;
        if(isCancelled)cancelled++;else found++;
      }else{
        const probeStat=String(recovery.cStat||""),probeReason=String(recovery.xMotivo||"");
        if(["","108","109","656"].includes(probeStat))throw Error("sp_recovery_probe_transient:"+probeStat+":"+probeReason);
        if(probeStat==="204"||recovery?.ambiguous_duplicate){
          throw Error("sp_recovery_duplicate_without_key:"+probeStat+":"+probeReason);
        }
        if(probeStat==="206"){
          const reason="Controle 539 validado; numeração oficialmente inutilizada. "+probeReason;
          const {error:ie}=await admin.from("fiscal_sales_reconciliation").upsert({
            company_id:c.id,model:"55",series:String(item.series),note_number:item.n,status:"inutilized",
            access_key:null,issue_date:null,cstat:"206",xmotivo:reason,attempts:1,tried_months:[],
            last_checked_at:now,resolved_at:now,updated_at:now,xml_status:"not_applicable",xml_attempts:0,
            detail_status:"not_applicable",detail_attempts:0,event_status:"not_applicable",event_attempts:0
          },{onConflict:"company_id,model,series,note_number"});if(ie)throw ie;unused++;
        }else if(probeStat==="220"&&/(destinat[aá]rio|destinatario).*(emitente)|identifica[cç][aã]o.*igual.*emitente/i.test(probeReason)){
          const reason="Controle 539 validado; numeração sem NF-e autorizada. "+probeReason;
          const {error:ue}=await admin.from("fiscal_sales_reconciliation").upsert({
            company_id:c.id,model:"55",series:String(item.series),note_number:item.n,status:"not_authorized",
            access_key:null,issue_date:null,cstat:"220",xmotivo:reason,attempts:1,tried_months:[],
            last_checked_at:now,resolved_at:now,updated_at:now,xml_status:"not_applicable",xml_attempts:0,
            detail_status:"not_applicable",detail_attempts:0,event_status:"not_applicable",event_attempts:0
          },{onConflict:"company_id,model,series,note_number"});if(ue)throw ue;unused++;
        }else{
          throw Error("sp_recovery_unclassified:"+probeStat+":"+probeReason);
        }
      }
    }catch(e){
      const msg=e instanceof Error?e.message:String(e);failed++;failures.push({series:item.series,note_number:item.n,error:msg});
      if(msg.includes("656")||/Consumo Indevido/i.test(msg)){cooldown=true;break}
    }
    await new Promise(r=>setTimeout(r,180));
  }
  const {data:after,error:ae}=await admin.from("fiscal_sales_reconciliation").select("series,note_number,status,access_key").eq("company_id",c.id).eq("model","55").limit(10000);if(ae)throw ae;
  let total=0,resolved=0,pending=0,foundTotal=0,cancelTotal=0,notAuthTotal=0;const finalScopes:any[]=[];
  for(const scope of scopes){
    const rows=(after||[]).filter((r:any)=>Number(r.series)===scope.series),recoveredMax=Math.max(scope.max_known,...rows.filter((r:any)=>["found","cancelled"].includes(String(r.status))).map((r:any)=>Number(r.note_number)||0)),end=recoveredMax+lookahead,byN=new Map(rows.map((r:any)=>[Number(r.note_number),r]));let localPending=0;
    for(let n=scope.floor;n<=end;n++){total++;const st=String((byN.get(n) as any)?.status||"");if(["found","cancelled","not_authorized","inutilized"].includes(st)){resolved++;if(st==="found")foundTotal++;if(st==="cancelled")cancelTotal++;if(st==="not_authorized")notAuthTotal++;}else{pending++;localPending++;}}
    finalScopes.push({...scope,max_known:recoveredMax,end,pending:localPending});
  }
  const complete=total>0&&pending===0&&failed===0,now=new Date().toISOString();
  const waitMinutes=cooldown?65:(complete?30:65);
  await admin.from("fiscal_sales_sync_state").update({status:cooldown?"cooldown":(complete?"idle":"queued"),latest_number:Math.max(0,...(after||[]).filter((r:any)=>["found","cancelled"].includes(String(r.status))).map((r:any)=>Number(r.note_number)||0))||null,cursor_number:Math.max(0,...(after||[]).filter((r:any)=>["found","cancelled"].includes(String(r.status))).map((r:any)=>Number(r.note_number)||0))||null,reconciliation_total:total,reconciliation_resolved:resolved,reconciliation_found:foundTotal,reconciliation_cancelled:cancelTotal,reconciliation_not_authorized:notAuthTotal,reconciliation_pending:pending,reconciliation_complete:complete,reconciliation_completed_at:complete?now:null,last_error:cooldown?"SEFAZ 656: cooldown automático":(failed?String(failed)+" falha(s) NF-e 55/SP":null),next_scheduled_at:new Date(Date.now()+waitMinutes*60000).toISOString(),updated_at:now}).eq("company_id",c.id);
  return{processed:Math.min(14,Math.min(batch,candidates.length)),found,cancelled,unused,failed,pending,complete,cooldown,probe_validated:true,scopes:finalScopes,failures:failures.slice(0,6)};
}


async function backfillSpNfe55Xml(admin:any,c:any,gatewayToken:string,gatewayCertificate:any,historyStart:string,batch=20){
  const cnpj=dg(c.cnpj),monthFloor=String(historyStart||"").slice(0,7).replace("-","");
  const {data:rows,error}=await admin.from("fiscal_sales_documents")
    .select("access_key,document_number,series,issue_date,status,xml,source,source_reference")
    .eq("company_id",c.id).eq("model","55").is("xml",null)
    .order("updated_at",{ascending:true}).limit(Math.max(20,Math.min(100,batch*4)));
  if(error)throw error;
  let saved=0,summaryOnly=0,failed=0,cooldown=false;const failures:any[]=[];
  for(const row of rows||[]){
    if(saved+summaryOnly+failed>=batch)break;
    if(row.source_reference?.xml_unavailable===true)continue;
    const key=dg(row.access_key);if(key.length!==44||key.slice(6,20)!==cnpj||key.slice(20,22)!=="55")continue;
    const keyMonth="20"+key.slice(2,6);if(monthFloor&&keyMonth<monthFloor)continue;
    const now=new Date().toISOString();
    try{
      const o=await gatewayObject(gatewayToken,{action:"nfe-distribution",environment:c.ambiente_padrao==="homologacao"?"homologation":"production",...gatewayCertificate,cnpj,uf_code:"35",access_key:key});
      const raw=String(o.text||""),docs:any[]=[];const re=/<docZip\b([^>]*)>([\s\S]*?)<\/docZip>/gi;let m;
      while((m=re.exec(raw)))try{
        const xml=await gzDoc(m[2]);
        const sm=String(m[1]||"").match(/schema=["']([^"']+)["']/i),schema=sm?.[1]||"";
        const access=tag(xml,"chNFe")||xml.match(/Id=["']NFe(\d{44})/i)?.[1]||"";
        if(access===key)docs.push({xml,schema,full:/(?:procNFe|nfeProc)/i.test(schema)||/<(?:\w+:)?NFe\b/i.test(xml)});
      }catch{}
      const full=docs.find(d=>d.full);
      if(!full){
        if(docs.length){summaryOnly++;failures.push({key,error:"distribution_summary_only",schemas:docs.map(d=>d.schema)});continue}
        throw Error("distribution_no_document:"+String(tag(raw,"cStat")||"")+":"+String(tag(raw,"xMotivo")||""));
      }
      const xml=String(full.xml),issue=tag(xml,"dhEmi")||tag(xml,"dEmi")||row.issue_date||null,totalText=tag(xml,"vNF"),total=totalText?Number(totalText):null,series=tag(xml,"serie")||row.series||String(Number(key.slice(22,25))),number=tag(xml,"nNF")||row.document_number||String(Number(key.slice(25,34))),dest=tag(xml,"dest")||"",recipient=dg(tag(dest,"CNPJ")||tag(dest,"CPF"))||null,status=tag(xml,"xMotivo")||row.status||"Autorizada";
      const {error:se}=await admin.from("fiscal_sales_documents").update({document_number:number,series,issue_date:issue,status,total_value:total,recipient_document:recipient,xml,source:"sefaz_sp_nfe55_distribution_xml",source_reference:{service:"NFeDistribuicaoDFe_consChNFe",official:true,xml_pending:false},updated_at:now}).eq("company_id",c.id).eq("access_key",key);if(se)throw se;
      const {data:du,error:de}=await admin.from("fiscal_dfe_documents").update({schema_name:full.schema||"procNFe_v4.00",document_kind:"nfe",direction:"saida",issue_date:issue,value:total,recipient_cnpj:recipient,note_number:number,series,status_code:"100",full_xml:true,xml,source:"sefaz_sp_nfe55_distribution_xml",source_id:key,model:"55",status_text:status,parse_error:null,updated_at:now}).eq("company_id",c.id).eq("access_key",key).select("id");if(de)throw de;
      if(!du?.length){const {error:ie}=await admin.from("fiscal_dfe_documents").upsert({user_id:c.created_by,company_id:c.id,cnpj:c.cnpj,environment:c.ambiente_padrao==="homologacao"?"homologacao":"producao",uf_code:"35",nsu:"SP-NFE55-"+key,schema_name:full.schema||"procNFe_v4.00",document_kind:"nfe",direction:"saida",access_key:key,issue_date:issue,value:total,issuer_cnpj:c.cnpj,issuer_name:c.razao_social,recipient_cnpj:recipient,note_number:number,series,status_code:"100",full_xml:true,xml,source:"sefaz_sp_nfe55_distribution_xml",source_id:key,model:"55",status_text:status,updated_at:now},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(ie)throw ie}
      await admin.from("fiscal_sales_reconciliation").update({xml_status:"saved",xml_attempts:1,xml_last_error:null,xml_last_checked_at:now,detail_status:"saved",detail_attempts:1,detail_last_error:null,detail_last_checked_at:now,issue_date:issue,updated_at:now}).eq("company_id",c.id).eq("model","55").eq("series",String(Number(series))).eq("note_number",Number(number));
      saved++;
    }catch(e){
      failed++;const msg=e instanceof Error?e.message:String(e);failures.push({key,error:msg});
      const unavailable=/^distribution_no_document:(641|653):/.test(msg);
      if(unavailable){
        const {error:markError}=await admin.from("fiscal_sales_documents").update({source_reference:{...(row.source_reference||{}),xml_pending:true,xml_unavailable:true,xml_unavailable_reason:msg},updated_at:now}).eq("company_id",c.id).eq("access_key",key);
        if(markError)throw markError;
        const parseError=msg.includes(":641:")?"official_xml_unavailable_for_issuer":"official_xml_unavailable_cancelled";
        const {error:dfeError}=await admin.from("fiscal_dfe_documents").update({parse_error:parseError,updated_at:now}).eq("company_id",c.id).eq("access_key",key).eq("direction","saida");
        if(dfeError)throw dfeError;
      }else{
        await admin.from("fiscal_sales_documents").update({updated_at:now}).eq("company_id",c.id).eq("access_key",key);
      }
      const {error:reconciliationError}=await admin.from("fiscal_sales_reconciliation").update({xml_status:"retrying",xml_last_error:msg,xml_last_checked_at:now,updated_at:now}).eq("company_id",c.id).eq("access_key",key);
      if(reconciliationError)throw reconciliationError;
      if(msg.includes("656")||/Consumo Indevido/i.test(msg)){cooldown=true;break}
    }
    await new Promise(r=>setTimeout(r,220));
  }
  return{saved,summary_only:summaryOnly,failed,cooldown,failures:failures.slice(0,10)};
}

async function syncSpNfe55FromIssuerEvents(admin:any,c:any,gatewayToken:string,gatewayCertificate:any,historyStart:string){
  const cnpj=dg(c.cnpj),historyMonth=String(historyStart||"").slice(0,7).replace("-","");
  const {data:events,error:eventError}=await admin.from("fiscal_dfe_events").select("nsu,access_key,event_type,event_description,event_at,xml,updated_at").eq("company_id",c.id).not("access_key","is",null).order("event_at",{ascending:true}).limit(5000);
  if(eventError)throw eventError;
  const byKey=new Map<string,any>();
  for(const ev of events||[]){
    const key=dg(ev.access_key);
    if(key.length!==44||key.slice(6,20)!==cnpj||key.slice(20,22)!=="55")continue;
    const keyMonth="20"+key.slice(2,6);
    if(historyMonth&&keyMonth<historyMonth)continue;
    const current=byKey.get(key)||{key,events:[],nsus:[],recipient:null,last_event_at:null};
    current.events.push(String(ev.event_type||""));
    current.nsus.push(String(ev.nsu||""));
    current.last_event_at=ev.event_at||current.last_event_at;
    const actor=dg(tag(String(ev.xml||""),"CNPJ")||tag(String(ev.xml||""),"CPF"));
    if(actor&&actor!==cnpj)current.recipient=actor;
    byKey.set(key,current);
  }
  const keys=[...byKey.keys()],existing=new Map<string,any>();
  for(let i=0;i<keys.length;i+=300){
    const {data:rows,error}=await admin.from("fiscal_sales_documents").select("access_key,status,xml,updated_at").eq("company_id",c.id).in("access_key",keys.slice(i,i+300));
    if(error)throw error;
    for(const row of rows||[])existing.set(dg(row.access_key),row);
  }
  const pending=keys.filter(k=>!existing.has(k));
  let saved=0,failed=0;
  const failures:any[]=[];
  for(const key of pending.slice(0,250)){
    const meta=byKey.get(key);
    try{
      const text=await gateway(gatewayToken,{action:"sp-nfe-consult",environment:c.ambiente_padrao==="homologacao"?"homologation":"production",...gatewayCertificate,access_key:key});
      const stats=[...text.matchAll(/<(?:\w+:)?cStat>(\d+)<\/(?:\w+:)?cStat>/g)].map(m=>m[1]);
      const reasons=[...text.matchAll(/<(?:\w+:)?xMotivo>([\s\S]*?)<\/(?:\w+:)?xMotivo>/g)].map(m=>m[1].trim());
      const cancelled=/<(?:\w+:)?tpEvento>110111<\/(?:\w+:)?tpEvento>/i.test(text)||stats.includes("101");
      const rootStat=stats[0]||"",protocol=tag(text,"nProt");
      if(!["100","101"].includes(rootStat)&&!stats.includes("100"))throw new Error("sp_consult_"+(rootStat||"unknown")+":"+(reasons[0]||"sem_motivo"));
      const status=cancelled?"Cancelada":(reasons[0]||"Autorizada");
      const series=String(Number(key.slice(22,25))),number=String(Number(key.slice(25,34))),nowIso=new Date().toISOString(),issue=tag(text,"dhEmi")||null;
      const {error:se}=await admin.from("fiscal_sales_documents").upsert({company_id:c.id,uf:"SP",model:"55",access_key:key,document_number:number,series,issue_date:issue,status,total_value:null,recipient_document:meta?.recipient||null,recipient_name:null,xml:null,source:"sefaz_sp_nfe55_issuer_event",source_reference:{service:"NFeDistribuicaoDFe+NFeConsultaProtocolo4",event_nsus:meta?.nsus||[],event_types:meta?.events||[],event_last_at:meta?.last_event_at||null,protocol:protocol||null,xml_pending:true},updated_at:nowIso},{onConflict:"company_id,access_key"});
      if(se)throw se;
      const {error:de}=await admin.from("fiscal_dfe_documents").upsert({user_id:c.created_by,company_id:c.id,cnpj:c.cnpj,environment:c.ambiente_padrao==="homologacao"?"homologacao":"producao",uf_code:"35",nsu:"SP-NFE55-"+key,schema_name:"retConsSitNFe_v4.00",document_kind:"nfe",direction:"saida",access_key:key,issue_date:issue,value:null,issuer_cnpj:c.cnpj,issuer_name:c.razao_social,recipient_cnpj:meta?.recipient||null,note_number:number,series,status_code:cancelled?"101":"100",full_xml:false,xml:null,source:"sefaz_sp_nfe55_issuer_event",source_id:key,model:"55",status_text:status,updated_at:nowIso},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});
      if(de)throw de;
      const {error:re}=await admin.from("fiscal_sales_reconciliation").upsert({company_id:c.id,model:"55",series,note_number:Number(number),status:cancelled?"cancelled":"found",access_key:key,issue_date:issue,cstat:cancelled?"101":"100",xmotivo:status,attempts:1,last_checked_at:nowIso,resolved_at:nowIso,updated_at:nowIso,xml_status:"pending",xml_attempts:0,detail_status:"pending",detail_attempts:0,event_status:cancelled?"pending":"not_applicable",event_attempts:0},{onConflict:"company_id,model,series,note_number"});
      if(re)throw re;
      saved++;
    }catch(e){failed++;failures.push({key,error:e instanceof Error?e.message:String(e)})}
  }
  return {discovered:keys.length,already:keys.length-pending.length,saved,failed,pending_after:Math.max(0,pending.length-saved),failures:failures.slice(0,10)};
}
Deno.serve(async req=>{try{
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tok=req.headers.get("x-debug-token")||"";const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();if(!tok||tok!==String(t?.token||""))return J({error:"unauthorized"},403);
  const b=await req.json().catch(()=>({})) as any,companyId=String(b.company_id||"");
  const {data:c,error:ce}=await admin.from("fiscal_companies").select("id,cnpj,razao_social,nome_fantasia,inscricao_estadual,uf,codigo_municipio,municipio,regime_tributario,endereco,status,ambiente_padrao,created_by,fiscal_settings").eq("id",companyId).single();
  if(ce||!c)throw Error("company_missing");if(c.status!=="ativa"||String(c.uf).toUpperCase()!=="SP")return J({ok:true,skipped:"company_not_sp"});
  const [{data:cert,error:cerror},{data:g},{data:state},{data:minHistory}]=await Promise.all([
    admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,valid_until").eq("company_id",companyId).eq("is_active",true).order("created_at",{ascending:false}).limit(1).single(),
    admin.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle(),
    admin.from("fiscal_sales_sync_state").select("*").eq("company_id",companyId).maybeSingle(),
    admin.rpc("extractor_minimum_history_start")
  ]);
  if(cerror||!cert)throw Error("certificate_missing");const gatewayToken=String(g?.token||"");if(!gatewayToken)throw Error("gateway_token_missing");
  const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv);
  const parsedCertificate=lerCertificado(Buffer.from(pfx,"base64"),pass);
  const gatewayCertificate={certificate_pem:parsedCertificate.certificadoPem,private_key_pem:parsedCertificate.chavePrivadaPem,chain_pem:parsedCertificate.cadeiaPem||[]};

  if(b.action==="nfe55_xml_only"){
    const start=String(minHistory||"2026-08-01");
    const xml=await backfillSpNfe55Xml(admin,c,gatewayToken,gatewayCertificate,start,Math.max(1,Math.min(5,Number(b.batch||1))));
    return J({ok:true,company_id:companyId,nfe55_xml:xml});
  }
  if(b.portal_probe){
    const portal=await gatewayObject(gatewayToken,{action:"sp-nfe-portal-probe",environment:"production",...gatewayCertificate});
    return J({ok:true,company_id:companyId,portal});
  }
  const historyStart=/^\d{4}-\d{2}-\d{2}$/.test(String(minHistory||""))?String(minHistory):new Date(Date.now()-99*86400000).toISOString().slice(0,10);
  const nfe55=await syncSpNfe55FromIssuerEvents(admin,c,gatewayToken,gatewayCertificate,historyStart);
  const now=new Date(),maxStart=new Date(now.getTime()-99*86400000),configured=/^\d{4}-\d{2}-\d{2}$/.test(String(minHistory||""))?new Date(String(minHistory)+"T00:00:00-03:00"):maxStart;
  const initialStart=configured>maxStart?configured:maxStart;
  const lastDone=state?.last_completed_at?new Date(new Date(state.last_completed_at).getTime()-24*3600000):initialStart;
  const start=b.start?new Date(String(b.start)):lastDone,end=b.end?new Date(String(b.end)):now;
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>end)throw Error("invalid_period");
  const keys=new Set<string>(),segments:any[]=[];let cursor=new Date(start);
  while(cursor<end){
    const segmentEnd=new Date(Math.min(end.getTime(),cursor.getTime()+14*86400000));
    const text=await gateway(gatewayToken,{action:"sp-nfce-list",environment:c.ambiente_padrao==="homologacao"?"homologation":"production",...gatewayCertificate,start:dtLocal(cursor),end:dtLocal(segmentEnd)});
    const cStat=tag(text,"cStat"),xMotivo=tag(text,"xMotivo");for(const m of text.matchAll(/<(?:\w+:)?chNFCe>(\d{44})<\/(?:\w+:)?chNFCe>/g))keys.add(m[1]);
    segments.push({start:dtLocal(cursor),end:dtLocal(segmentEnd),cStat,xMotivo,keys:keys.size});
    if(cStat==="656")throw Error("SEFAZ_SP_656");
    cursor=new Date(segmentEnd.getTime()+60000);
  }
  const all=[...keys],existing=new Set<string>();
  for(let i=0;i<all.length;i+=300){const {data:rows}=await admin.from("fiscal_sales_documents").select("access_key").eq("company_id",companyId).in("access_key",all.slice(i,i+300));for(const r of rows||[])existing.add(dg(r.access_key))}
  const missing=all.filter(k=>!existing.has(k));let saved=0,failed=0;const maxDownload=Math.min(120,Math.max(1,Number(b.max_download||60)));
  for(const key of missing.slice(0,maxDownload)){try{
    const raw=await gateway(gatewayToken,{action:"sp-nfce-download",environment:c.ambiente_padrao==="homologacao"?"homologation":"production",...gatewayCertificate,access_key:key});
    const xml=extractProc(raw);if(!xml)throw Error("xml_missing:"+tag(raw,"cStat")+":"+tag(raw,"xMotivo"));
    const issue=tag(xml,"dhEmi")||tag(xml,"dEmi"),total=Number(tag(xml,"vNF")||0),number=tag(xml,"nNF")||String(Number(key.slice(25,34))),series=tag(xml,"serie")||String(Number(key.slice(22,25))),status=tag(xml,"xMotivo")||"Autorizado";
    const nowIso=new Date().toISOString();
    const {error:se}=await admin.from("fiscal_sales_documents").upsert({company_id:companyId,uf:"SP",model:"65",access_key:key,document_number:number,series,issue_date:issue||null,status,total_value:total,xml,source:"sefaz_sp_sae_nfce",source_reference:{service:"NFCeDownloadXML"},updated_at:nowIso},{onConflict:"company_id,access_key"});if(se)throw se;
    const {error:de}=await admin.from("fiscal_dfe_documents").upsert({user_id:c.created_by,company_id:companyId,cnpj:c.cnpj,environment:c.ambiente_padrao==="homologacao"?"homologacao":"producao",uf_code:"35",nsu:"SP-SAE-"+key,schema_name:"procNFe_v4.00",document_kind:"nfe",direction:"saida",access_key:key,issue_date:issue||null,value:total,issuer_cnpj:c.cnpj,issuer_name:c.razao_social,note_number:number,series,status_code:"100",full_xml:true,xml,source:"sefaz_sp_sae_nfce",source_id:key,model:"65",status_text:status,updated_at:nowIso},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(de)throw de;saved++;
  }catch(e){failed++;console.error("sp nfce download",key,e)}}
  const pending=Math.max(0,missing.length-saved),completedAt=new Date().toISOString();
  const nfceSourceOk=segments.length>0&&segments.every((s:any)=>["100","107"].includes(String(s.cStat||"")))&&failed===0&&pending===0;
  const nfceSourceError=nfceSourceOk?null:(failed?String(failed)+" XML(s) NFC-e falharam":pending?String(pending)+" NFC-e pendente(s)":("Retorno SAE não confirmado: "+segments.map((s:any)=>String(s.cStat||"?")).join(",")));
  const {data:maxRow}=await admin.from("fiscal_sales_documents").select("document_number").eq("company_id",companyId).eq("model","65").order("document_number",{ascending:false}).limit(1).maybeSingle();
  await admin.from("fiscal_sales_sync_state").upsert({
    company_id:companyId,
    nfce_source_status:nfceSourceOk?"ok":"error",
    nfce_source_confirmed_at:nfceSourceOk?completedAt:null,
    nfce_source_period_start:start.toISOString(),
    nfce_source_period_end:end.toISOString(),
    nfce_source_count:all.length,
    nfce_source_error:nfceSourceError,
    updated_at:completedAt
  },{onConflict:"company_id"});
  await admin.from("fiscal_companies").update({last_sync_at:completedAt}).eq("id",companyId);
  const nfe55Recovery=b.skip_nfe55_recovery?{skipped:true}:await recoverSpNfe55Numbers(admin,c,gatewayToken,gatewayCertificate,historyStart,Number(b.nfe55_batch||12),Number(b.nfe55_lookahead||15));
  const nfe55Xml=(b.skip_nfe55_xml||nfe55Recovery?.cooldown)?{skipped:true,reason:nfe55Recovery?.cooldown?"recovery_cooldown":"requested"}:await backfillSpNfe55Xml(admin,c,gatewayToken,gatewayCertificate,historyStart,Number(b.nfe55_xml_batch||1));
  if(nfe55Xml?.cooldown){
    const coolUntil=new Date(Date.now()+65*60000).toISOString();
    await admin.from("fiscal_sales_sync_state").update({status:"cooldown",last_error:"SEFAZ 656: cooldown automático",next_scheduled_at:coolUntil,updated_at:new Date().toISOString()}).eq("company_id",companyId);
  }
  return J({ok:true,company_id:companyId,nfe55:{events:nfe55,recovery:nfe55Recovery,xml:nfe55Xml},nfce65:{period:{start:start.toISOString(),end:end.toISOString()},listed:all.length,already_saved:existing.size,missing:missing.length,saved,failed,pending,segments}});
}catch(e){
  const msg=e instanceof Error?e.message:String(e);console.error("fiscal-sales-sp-sync",msg);return J({error:msg},500)
}});
