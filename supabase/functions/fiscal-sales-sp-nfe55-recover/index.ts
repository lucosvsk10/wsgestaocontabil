import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp("<(?:\\w+:)?"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?"+n+">","i"))?.[1]?.trim()||"";
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode("ws-fiscal-vault:"+s));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
function keyInfo(value:unknown){
  const k=dg(value);if(k.length!==44)return null;
  return {key:k,uf:k.slice(0,2),month:Number("20"+k.slice(2,6)),issuer:k.slice(6,20),model:k.slice(20,22),series:Number(k.slice(22,25)),number:Number(k.slice(25,34))};
}
function crt(regime:unknown){const r=String(regime||"").toLowerCase();return r.includes("simples")?"1":"3"}
async function gateway(token:string,body:any){
  const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify(body),signal:AbortSignal.timeout(70000)});
  const o=await r.json().catch(()=>({})) as any;
  if(!r.ok||!o?.ok)throw Error("gateway_"+r.status+":"+String(o?.error||o?.xMotivo||"failed").slice(0,300));
  return o;
}
async function saveFound(admin:any,c:any,key:string,source:string,sourceReference:any,consultText:string){
  const info=keyInfo(key);if(!info||info.issuer!==dg(c.cnpj)||info.model!=="55")throw Error("recovered_key_mismatch");
  const stats=[...consultText.matchAll(/<(?:\w+:)?cStat>(\d+)<\/(?:\w+:)?cStat>/g)].map(m=>m[1]);
  const motives=[...consultText.matchAll(/<(?:\w+:)?xMotivo>([\s\S]*?)<\/(?:\w+:)?xMotivo>/g)].map(m=>m[1].trim());
  const cancelled=/<(?:\w+:)?tpEvento>110111<\/(?:\w+:)?tpEvento>/i.test(consultText)||stats.includes("101");
  const cStat=cancelled?"101":(stats.includes("100")?"100":stats[stats.length-1]||"100");
  const status=cancelled?"Cancelada":(motives.find(x=>/autorizado o uso/i.test(x))||motives[0]||"Autorizada");
  const issue=tag(consultText,"dhRecbto")||null;
  const now=new Date().toISOString(),series=String(info.series),number=String(info.number);
  const {error:se}=await admin.from("fiscal_sales_documents").upsert({
    company_id:c.id,uf:"SP",model:"55",access_key:key,document_number:number,series,issue_date:issue,status,total_value:null,
    recipient_document:null,recipient_name:null,xml:null,source,source_reference:{...sourceReference,protocol:tag(consultText,"nProt")||null,xml_pending:true},updated_at:now
  },{onConflict:"company_id,access_key"});if(se)throw se;
  const {error:de}=await admin.from("fiscal_dfe_documents").upsert({
    user_id:c.created_by,company_id:c.id,cnpj:c.cnpj,environment:"producao",uf_code:"35",nsu:"SP-NFE55-"+key,
    schema_name:"retConsSitNFe_v4.00",document_kind:"nfe",direction:"saida",access_key:key,issue_date:issue,value:null,
    issuer_cnpj:c.cnpj,issuer_name:c.razao_social,note_number:number,series,status_code:cStat,full_xml:false,xml:null,
    source,source_id:key,model:"55",status_text:status,updated_at:now
  },{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(de)throw de;
  const {error:re}=await admin.from("fiscal_sales_reconciliation").upsert({
    company_id:c.id,model:"55",series,note_number:info.number,status:cancelled?"cancelled":"found",access_key:key,issue_date:issue,
    cstat:cStat,xmotivo:status,attempts:1,last_checked_at:now,resolved_at:now,updated_at:now,
    xml_status:"pending",xml_attempts:0,detail_status:"pending",detail_attempts:0,event_status:cancelled?"pending":"not_applicable",event_attempts:0
  },{onConflict:"company_id,model,series,note_number"});if(re)throw re;
  return {cancelled,issue};
}
Deno.serve(async req=>{try{
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tok=req.headers.get("x-debug-token")||"";
  const [{data:t},{data:g},{data:minHistory}]=await Promise.all([
    admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle(),
    admin.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle(),
    admin.rpc("extractor_minimum_history_start")
  ]);
  if(!tok||tok!==String(t?.token||""))return J({error:"unauthorized"},403);
  const gatewayToken=String(g?.token||"");if(!gatewayToken)throw Error("gateway_token_missing");
  const b=await req.json().catch(()=>({})) as any,companyId=String(b.company_id||""),batch=Math.min(24,Math.max(1,Number(b.batch||16))),lookahead=Math.min(60,Math.max(8,Number(b.lookahead||20)));
  const {data:c,error:ce}=await admin.from("fiscal_companies").select("id,cnpj,razao_social,nome_fantasia,inscricao_estadual,uf,codigo_municipio,municipio,regime_tributario,endereco,status,ambiente_padrao,created_by").eq("id",companyId).single();
  if(ce||!c)throw Error("company_missing");if(c.status!=="ativa"||String(c.uf).toUpperCase()!=="SP")return J({ok:true,skipped:"company_not_sp"});
  if(c.ambiente_padrao==="homologacao")return J({ok:true,skipped:"homologation"});
  const {data:cert,error:cerror}=await admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv,valid_until").eq("company_id",companyId).eq("is_active",true).order("created_at",{ascending:false}).limit(1).single();
  if(cerror||!cert)throw Error("certificate_missing");
  const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv);
  const parsed=lerCertificado(Buffer.from(pfx,"base64"),pass);
  const certificate={certificate_pem:parsed.certificadoPem,private_key_pem:parsed.chavePrivadaPem,chain_pem:parsed.cadeiaPem||[]};
  const cnpj=dg(c.cnpj),historyStart=/^\d{4}-\d{2}-\d{2}$/.test(String(minHistory||""))?String(minHistory):new Date(Date.now()-53*86400000).toISOString().slice(0,10),historyMonth=Number(historyStart.slice(0,4)+historyStart.slice(5,7));
  const [{data:events,error:ee},{data:saved,error:se},{data:rec,error:re}]=await Promise.all([
    admin.from("fiscal_dfe_events").select("access_key").eq("company_id",companyId).not("access_key","is",null).limit(10000),
    admin.from("fiscal_sales_documents").select("access_key,series,document_number").eq("company_id",companyId).eq("model","55").limit(10000),
    admin.from("fiscal_sales_reconciliation").select("series,note_number,status,access_key").eq("company_id",companyId).eq("model","55").limit(10000)
  ]);
  if(ee)throw ee;if(se)throw se;if(re)throw re;
  const infos:any[]=[];
  for(const row of [...(events||[]),...(saved||[]),...(rec||[])]){const i=keyInfo((row as any).access_key);if(i&&i.uf==="35"&&i.issuer===cnpj&&i.model==="55")infos.push(i)}
  const seriesList=[...new Set(infos.map(i=>i.series).filter(n=>Number.isFinite(n)))].sort((a,b)=>a-b);
  if(!seriesList.length)return J({ok:true,company_id:companyId,complete:false,reason:"series_not_discovered",processed:0});
  const existingBySeries=new Map<number,Map<number,any>>();
  for(const row of rec||[]){const s=Number(row.series),n=Number(row.note_number);if(!existingBySeries.has(s))existingBySeries.set(s,new Map());existingBySeries.get(s)!.set(n,row)}
  const scopes:any[]=[];const candidates:any[]=[];
  for(const series of seriesList){
    const si=infos.filter(i=>i.series===series),before=si.filter(i=>i.month<historyMonth),inside=si.filter(i=>i.month>=historyMonth);
    const prior=before.length?Math.max(...before.map(i=>i.number)):0;
    const minInside=inside.length?Math.min(...inside.map(i=>i.number)):0;
    const maxInside=inside.length?Math.max(...inside.map(i=>i.number)):prior;
    if(!maxInside)continue;
    const floor=prior?prior+1:Math.max(1,minInside-30),end=maxInside+lookahead,map=existingBySeries.get(series)||new Map();
    scopes.push({series,floor,max_known:maxInside,end});
    for(let n=floor;n<=end;n++){
      const row=map.get(n);
      if(!row||["pending","error","not_found"].includes(String(row.status||"")))candidates.push({series,n,inside_known:n<=maxInside,priority:n<=maxInside?0:1});
    }
  }
  candidates.sort((a,b)=>a.priority-b.priority||a.series-b.series||a.n-b.n);
  let found=0,cancelled=0,unused=0,failed=0;const failures:any[]=[];
  for(const item of candidates.slice(0,batch)){
    const now=new Date().toISOString();
    try{
      const recovery=await gateway(gatewayToken,{action:"sp-nfe-recover-key",environment:"production",...certificate,
        issuer_cnpj:c.cnpj,issuer_ie:c.inscricao_estadual,issuer_name:c.razao_social,issuer_trade_name:c.nome_fantasia,
        issuer_city_code:c.codigo_municipio,issuer_city:c.municipio,issuer_street:c.endereco?.logradouro,issuer_number:c.endereco?.numero,
        issuer_district:c.endereco?.bairro,issuer_zip:c.endereco?.cep,crt:crt(c.regime_tributario),series:item.series,note_number:item.n});
      if(recovery.exists&&/^\d{44}$/.test(String(recovery.access_key||""))){
        const key=String(recovery.access_key),info=keyInfo(key);
        if(!info||info.issuer!==cnpj||info.model!=="55"||info.series!==item.series||info.number!==item.n)throw Error("recovery_key_identity_mismatch");
        const consult=await gateway(gatewayToken,{action:"sp-nfe-consult",environment:"production",...certificate,access_key:key});
        const result=await saveFound(admin,c,key,"sefaz_sp_nfe55_539_recovery",{service:"NFeAutorizacao4_recovery_539",recovery_cstat:recovery.cStat,official:true},String(consult.text||""));
        if(result.cancelled)cancelled++;else found++;
      }else{
        const {error:ue}=await admin.from("fiscal_sales_reconciliation").upsert({
          company_id:companyId,model:"55",series:String(item.series),note_number:item.n,status:"not_authorized",access_key:null,issue_date:null,
          cstat:String(recovery.cStat||"SP_NO_AUTHORIZATION"),xmotivo:String(recovery.xMotivo||"Numeração sem NF-e autorizada na SEFAZ/SP"),
          attempts:1,tried_months:[],last_checked_at:now,resolved_at:now,updated_at:now,
          xml_status:"not_applicable",xml_attempts:0,detail_status:"not_applicable",detail_attempts:0,event_status:"not_applicable",event_attempts:0
        },{onConflict:"company_id,model,series,note_number"});if(ue)throw ue;unused++;
      }
    }catch(e){failed++;const msg=e instanceof Error?e.message:String(e);failures.push({series:item.series,note_number:item.n,error:msg});await admin.from("fiscal_sales_reconciliation").upsert({
      company_id:companyId,model:"55",series:String(item.series),note_number:item.n,status:"error",xmotivo:msg,attempts:1,last_checked_at:now,updated_at:now
    },{onConflict:"company_id,model,series,note_number"}).catch(()=>{})}
    await sleep(180);
  }
  const {data:after,error:ae}=await admin.from("fiscal_sales_reconciliation").select("series,note_number,status,access_key").eq("company_id",companyId).eq("model","55").limit(10000);if(ae)throw ae;
  let total=0,resolved=0,pending=0,foundTotal=0,cancelTotal=0,notAuthTotal=0;const finalScopes:any[]=[];
  for(const scope of scopes){
    const rows=(after||[]).filter((r:any)=>Number(r.series)===scope.series);
    const recoveredMax=Math.max(scope.max_known,...rows.filter((r:any)=>["found","cancelled"].includes(String(r.status))).map((r:any)=>Number(r.note_number)||0));
    const end=recoveredMax+lookahead,byN=new Map(rows.map((r:any)=>[Number(r.note_number),r]));let localPending=0;
    for(let n=scope.floor;n<=end;n++){total++;const st=String((byN.get(n) as any)?.status||"");if(["found","cancelled","not_authorized","inutilized"].includes(st)){resolved++;if(st==="found")foundTotal++;if(st==="cancelled")cancelTotal++;if(st==="not_authorized")notAuthTotal++;}else{pending++;localPending++;}}
    finalScopes.push({...scope,max_known:recoveredMax,end,pending:localPending});
  }
  const complete=total>0&&pending===0&&failed===0,completedAt=new Date().toISOString(),maxFound=Math.max(0,...(after||[]).filter((r:any)=>["found","cancelled"].includes(String(r.status))).map((r:any)=>Number(r.note_number)||0));
  await admin.from("fiscal_sales_sync_state").upsert({
    company_id:companyId,paused:false,status:complete?"idle":"queued",latest_number:maxFound||null,cursor_number:maxFound||null,
    initial_backfill_done:complete,reconciliation_total:total,reconciliation_resolved:resolved,reconciliation_found:foundTotal,
    reconciliation_cancelled:cancelTotal,reconciliation_not_authorized:notAuthTotal,reconciliation_pending:pending,
    reconciliation_complete:complete,reconciliation_started_at:completedAt,reconciliation_completed_at:complete?completedAt:null,
    last_completed_at:completedAt,last_error:failed?String(failed)+" falha(s) na recuperação NF-e 55/SP":null,
    next_scheduled_at:new Date(Date.now()+(complete?30:5)*60000).toISOString(),updated_at:completedAt
  },{onConflict:"company_id"});
  await admin.from("fiscal_companies").update({last_sync_at:completedAt}).eq("id",companyId);
  return J({ok:true,company_id:companyId,history_start:historyStart,series:finalScopes,processed:Math.min(batch,candidates.length),found,cancelled,unused,failed,pending,complete,failures:failures.slice(0,8)});
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});