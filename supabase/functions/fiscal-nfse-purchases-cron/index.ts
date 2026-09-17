import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}}),digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`i`))?.[1]?.trim()||"",section=(x:string,n:string)=>tag(x,n);
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
async function gun(v:string){const bytes=Uint8Array.from(atob(v.replace(/\s/g,"")),c=>c.charCodeAt(0)),stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));return D.decode(await new Response(stream).arrayBuffer())}
function parseNFSe(xml:string,companyCnpj:string){const inf=section(xml,"infNFSe")||xml,emit=section(inf,"emit"),dps=section(inf,"DPS"),infDps=section(dps,"infDPS")||dps,toma=section(infDps,"toma"),issuer=digits(tag(emit,"CNPJ")||tag(emit,"CPF")),recipient=digits(tag(toma,"CNPJ")||tag(toma,"CPF")),direction=issuer===companyCnpj?"saida":recipient===companyCnpj?"entrada":"relacionada",status=tag(inf,"cStat");return{direction,issuer,issuerName:tag(emit,"xNome"),recipient,number:tag(inf,"nNFSe")||tag(infDps,"nDPS"),series:tag(infDps,"serie"),issue:tag(infDps,"dhEmi")||tag(inf,"dhProc")||null,value:Number(tag(inf,"vLiq")||tag(infDps,"vServ")||0),status,statusText:status==="100"?"Autorizada":status?`cStat ${status}`:"Fiscal"}}

async function fetchAdnBatch(gatewayToken:string,pfx:string,pass:string,cnpj:string,nsu:number){
 const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/nfe-event",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${gatewayToken}`},body:JSON.stringify({action:"nfse-dfe",certificate_base64:pfx,certificate_password:pass,cnpj,nsu}),signal:AbortSignal.timeout(60000)});
 const o=await r.json().catch(()=>({})) as any;
 if(!r.ok)throw Error(`gateway_http_${r.status}:${String(o?.error||"").slice(0,120)}`);
 const status=Number(o?.http||0),data=o?.response||{};
 if(status===404)return {status,data:{}};
 if(!o?.ok||status<200||status>=300)throw Error(`adn_http_${status||"unknown"}`);
 return {status,data};
}

Deno.serve(async req=>{const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);try{
 const [{data:t},{data:g}]=await Promise.all([
  admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle(),
  admin.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle(),
 ]);
 if(!t?.token||req.headers.get("x-debug-token")!==String(t.token))return J({error:"unauthorized"},403);
 const gatewayToken=String(g?.token||"");if(!gatewayToken)return J({error:"gateway_token_missing"},500);
 const body=await req.json().catch(()=>({}))as any,only=String(body.company_id||""),maxBatches=Math.min(20,Math.max(1,Number(body.max_batches||8)));
 let q=admin.from("fiscal_companies").select("id,cnpj,created_by,status,fiscal_settings").eq("status","ativa");if(only)q=q.eq("id",only);
 const{data:companies,error:ce}=await q;if(ce)throw ce;const out:any[]=[];
 for(const c of companies||[]){let state:any=null;try{
  ({data:state}=await admin.from("fiscal_nfse_sync_state").select("*").eq("company_id",c.id).maybeSingle());const now=new Date();
  if(state?.next_scheduled_at&&!body.force&&new Date(state.next_scheduled_at)>now){out.push({company_id:c.id,status:"not_due",last_nsu:Number(state.last_nsu||0)});continue}
  await admin.from("fiscal_nfse_sync_state").upsert({company_id:c.id,status:"running",last_started_at:now.toISOString(),last_error:null,updated_at:now.toISOString()});
  const{data:fc}=await admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv").eq("company_id",c.id).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();if(!fc)throw Error("certificate_missing");
  const pfx=await dec(fc.certificate_ciphertext,fc.certificate_iv),pass=await dec(fc.password_ciphertext,fc.password_iv),settings=(c.fiscal_settings||{})as any,historyStart=String(settings.history_window_mode==="previous_full_month_plus_current"?settings.history_start_date||"":"");
  let current=Number(state?.last_nsu||0),saved=0,events=0,batches=0,skippedOlder=0;
  for(let i=0;i<maxBatches;i++){
   const {status,data}=await fetchAdnBatch(gatewayToken,pfx,pass,digits(c.cnpj),current);if(status===404)break;
   const lote=Array.isArray(data?.LoteDFe)?data.LoteDFe:[];batches++;if(!lote.length)break;let advanced=false;
   for(const item of lote){const nsu=Number(item.NSU||0);if(nsu>current){current=nsu;advanced=true}const key=String(item.ChaveAcesso||""),raw=String(item.ArquivoXml||"");let xml="";try{xml=await gun(raw)}catch{try{xml=atob(raw)}catch{continue}}const tipo=String(item.TipoDocumento||"").toUpperCase();
    if(tipo==="NFSE"||/<NFSe\b/i.test(xml)){const d=parseNFSe(xml,digits(c.cnpj));if(historyStart&&d.issue&&d.issue.slice(0,10)<historyStart){skippedOlder++;continue}if(d.direction!=="relacionada"){const{error}=await admin.from("fiscal_dfe_documents").upsert({user_id:c.created_by,company_id:c.id,cnpj:digits(c.cnpj),environment:"producao",uf_code:"00",nsu:`NFSE-${String(nsu).padStart(15,"0")}`,source:"national_nfse_adn",source_id:key||String(nsu),schema_name:"NFSe_Nacional",document_kind:"nfse",direction:d.direction,access_key:key||null,model:"NFS-e",issue_date:d.issue,value:d.value,issuer_cnpj:d.issuer||null,issuer_name:d.issuerName||null,recipient_cnpj:d.recipient||null,note_number:d.number||null,series:d.series||null,status_code:d.status||null,status_text:d.statusText,full_xml:true,xml,updated_at:new Date().toISOString()},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(error)throw error;saved++}}
    else{const eventDate=tag(xml,"dhEvento")||tag(xml,"dhProc")||null;if(historyStart&&eventDate&&eventDate.slice(0,10)<historyStart){skippedOlder++;continue}const lower=xml.toLowerCase(),cancelled=lower.includes("cancel"),eventKey=key||tag(xml,"chNFSe")||tag(xml,"chaveAcesso");await admin.from("fiscal_dfe_events").upsert({user_id:c.created_by,company_id:c.id,cnpj:digits(c.cnpj),environment:"producao",uf_code:"00",nsu:`NFSE-EVENT-${String(nsu).padStart(15,"0")}`,schema_name:tipo||"Evento_NFSe",access_key:eventKey||null,event_type:tag(xml,"tpEvento")||tipo||"EVENTO_NFSE",event_description:tag(xml,"xDesc")||tag(xml,"descEvento")||(cancelled?"Cancelamento de NFS-e":"Evento de NFS-e"),status_code:tag(xml,"cStat")||null,event_at:eventDate,xml,source:"national_nfse_adn",updated_at:new Date().toISOString()},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(cancelled&&eventKey)await admin.from("fiscal_dfe_documents").update({status_code:"101",status_text:"Cancelada",updated_at:new Date().toISOString()}).eq("company_id",c.id).eq("access_key",eventKey);events++}
   }
   await admin.from("fiscal_nfse_sync_state").upsert({company_id:c.id,last_nsu:current,status:"running",documents_saved:Number(state?.documents_saved||0)+saved,events_saved:Number(state?.events_saved||0)+events,updated_at:new Date().toISOString()});
   if(!advanced||lote.length<50)break;
  }
  const next=new Date(Date.now()+3*3600000).toISOString();await admin.from("fiscal_nfse_sync_state").upsert({company_id:c.id,last_nsu:current,status:"idle",documents_saved:Number(state?.documents_saved||0)+saved,events_saved:Number(state?.events_saved||0)+events,last_completed_at:new Date().toISOString(),next_scheduled_at:next,last_error:null,updated_at:new Date().toISOString()});out.push({company_id:c.id,status:"ok",history_start:historyStart||null,last_nsu:current,saved,events,skipped_older:skippedOlder,batches,transport:"vercel-node"});
 }catch(e){const msg=e instanceof Error?e.message:String(e);await admin.from("fiscal_nfse_sync_state").upsert({company_id:c.id,status:"retrying",last_error:msg,next_scheduled_at:new Date(Date.now()+15*60000).toISOString(),updated_at:new Date().toISOString()});out.push({company_id:c.id,status:"retrying",error:msg})}}
 return J({ok:true,companies:out,transport:"vercel-node"})
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});
