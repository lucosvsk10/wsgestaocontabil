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
async function gateway(token:string,body:any){
  const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(body),signal:AbortSignal.timeout(70000)});
  const o=await r.json().catch(()=>({})) as any;
  if(!r.ok||!o?.ok)throw new Error("gateway_"+r.status+":"+String(o?.error||o?.response_excerpt||"failed").slice(0,300));
  return String(o.text||"");
}
Deno.serve(async req=>{try{
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tok=req.headers.get("x-debug-token")||"";const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();if(!tok||tok!==String(t?.token||""))return J({error:"unauthorized"},403);
  const b=await req.json().catch(()=>({})) as any,companyId=String(b.company_id||"");
  const {data:c,error:ce}=await admin.from("fiscal_companies").select("id,cnpj,razao_social,uf,status,ambiente_padrao,created_by,fiscal_settings").eq("id",companyId).single();
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
  return J({ok:true,company_id:companyId,period:{start:start.toISOString(),end:end.toISOString()},listed:all.length,already_saved:existing.size,missing:missing.length,saved,failed,pending,segments});
}catch(e){
  const msg=e instanceof Error?e.message:String(e);console.error("fiscal-sales-sp-sync",msg);return J({error:msg},500)
}});
