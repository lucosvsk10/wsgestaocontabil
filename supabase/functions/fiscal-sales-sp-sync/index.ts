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
function nfeDv(base:string){let sum=0,weight=2;for(let i=base.length-1;i>=0;i--){sum+=Number(base[i])*weight;weight=weight===9?2:weight+1}let result=11-(sum%11);if(result>=10)result=0;return String(result)}
function syntheticSpNfe55Key(cnpj:string,month:string,noteNumber:number,series=1){const base="35"+month+dg(cnpj)+"55"+String(series).padStart(3,"0")+String(noteNumber).padStart(9,"0")+"1"+"00000000";return base+nfeDv(base)}
function recentMonthCodes(){const now=new Date(),out:string[]=[];for(let offset=0;offset<2;offset++){const d=new Date(Date.UTC(now.getUTCFullYear(),now.getUTCMonth()-offset,1));out.push(String(d.getUTCFullYear()).slice(-2)+String(d.getUTCMonth()+1).padStart(2,"0"))}return out}

async function gateway(token:string,body:any){
  const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(body),signal:AbortSignal.timeout(70000)});
  const o=await r.json().catch(()=>({})) as any;
  if(!r.ok||!o?.ok)throw new Error("gateway_"+r.status+":"+String(o?.error||o?.response_excerpt||"failed").slice(0,300));
  return String(o.text||"");
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
      const rootStat=stats[0]||"",protocol=tag(text,"nProt"),received=tag(text,"dhRecbto");
      if(!["100","101"].includes(rootStat)&&!stats.includes("100"))throw new Error("sp_consult_"+(rootStat||"unknown")+":"+(reasons[0]||"sem_motivo"));
      const status=cancelled?"Cancelada":(reasons[0]||"Autorizada");
      const series=String(Number(key.slice(22,25))),number=String(Number(key.slice(25,34))),nowIso=new Date().toISOString(),issue=meta?.last_event_at||received||null;
      const {error:se}=await admin.from("fiscal_sales_documents").upsert({company_id:c.id,uf:"SP",model:"55",access_key:key,document_number:number,series,issue_date:issue,status,total_value:null,recipient_document:meta?.recipient||null,recipient_name:null,xml:null,source:"sefaz_sp_nfe55_issuer_event",source_reference:{service:"NFeDistribuicaoDFe+NFeConsultaProtocolo4",event_nsus:meta?.nsus||[],event_types:meta?.events||[],protocol:protocol||null,xml_pending:true},updated_at:nowIso},{onConflict:"company_id,access_key"});
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
  if(Number(b.scan_nfe55_start)>0){
    const scanStart=Math.max(1,Number(b.scan_nfe55_start)),scanEnd=Math.min(scanStart+59,Math.max(scanStart,Number(b.scan_nfe55_end||scanStart+20))),series=Math.max(1,Number(b.scan_nfe55_series||1));
    const months=Array.isArray(b.scan_nfe55_months)&&b.scan_nfe55_months.length?b.scan_nfe55_months.map((v:any)=>dg(v).slice(-4)).filter((v:string)=>v.length===4):recentMonthCodes();
    const hits:any[]=[],results:any[]=[];
    for(let noteNumber=scanStart;noteNumber<=scanEnd;noteNumber++){
      let found:any=null;
      for(const month of months){
        const synthetic=syntheticSpNfe55Key(c.cnpj,month,noteNumber,series);
        const text=await gateway(gatewayToken,{action:"sp-nfe-consult",environment:c.ambiente_padrao==="homologacao"?"homologation":"production",...gatewayCertificate,access_key:synthetic});
        const cStat=tag(text,"cStat"),xMotivo=tag(text,"xMotivo");
        const candidates=[...String(xMotivo||"").matchAll(/(\d{44})/g)].map(m=>m[1]);
        const realKey=candidates.find(k=>k!==synthetic)||(cStat==="100"?synthetic:null);
        results.push({note_number:noteNumber,month,cStat,xMotivo,real_key:realKey});
        if(realKey){found={note_number:noteNumber,month,access_key:realKey,cStat,xMotivo};hits.push(found);break}
        if(cStat==="656")return J({ok:false,cooldown:true,hits,results},429);
        await new Promise(r=>setTimeout(r,180));
      }
      await new Promise(r=>setTimeout(r,180));
    }
    return J({ok:true,scan:{start:scanStart,end:scanEnd,series,months},hits,results});
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
  const {data:maxRow}=await admin.from("fiscal_sales_documents").select("document_number").eq("company_id",companyId).eq("model","65").order("document_number",{ascending:false}).limit(1).maybeSingle();
  await admin.from("fiscal_sales_sync_state").upsert({company_id:companyId,paused:false,status:pending?"queued":"idle",latest_number:Number(maxRow?.document_number||0)||null,cursor_number:Number(maxRow?.document_number||0)||null,initial_backfill_done:pending===0,last_started_at:state?.last_started_at||completedAt,last_completed_at:completedAt,next_scheduled_at:new Date(Date.now()+30*60000).toISOString(),last_error:failed?String(failed)+" XML(s) falharam; retry automático":null,updated_at:completedAt},{onConflict:"company_id"});
  await admin.from("fiscal_companies").update({last_sync_at:completedAt}).eq("id",companyId);
  return J({ok:true,company_id:companyId,nfe55,nfce65:{period:{start:start.toISOString(),end:end.toISOString()},listed:all.length,already_saved:existing.size,missing:missing.length,saved,failed,pending,segments}});
}catch(e){
  const msg=e instanceof Error?e.message:String(e);console.error("fiscal-sales-sp-sync",msg);return J({error:msg},500)
}});
