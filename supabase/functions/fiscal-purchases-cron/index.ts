import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}}),E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0)),dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`i`))?.[1]?.trim()||"",at=(x:string,n:string)=>x.match(new RegExp(`${n}=["']([^"']+)["']`,`i`))?.[1]||"";
const UF:Record<string,string>={AC:"12",AL:"27",AP:"16",AM:"13",BA:"29",CE:"23",DF:"53",ES:"32",GO:"52",MA:"21",MT:"51",MS:"50",MG:"31",PA:"15",PB:"25",PR:"41",PE:"26",PI:"22",RJ:"33",RN:"24",RS:"43",RO:"11",RR:"14",SC:"42",SP:"35",SE:"28",TO:"17"};
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
async function gz(v:string){const b=Uint8Array.from(atob(v.replace(/\s/g,"")),c=>c.charCodeAt(0));return D.decode(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer())}
function parse(xml:string,schema:string,nsu:string,cnpj:string){const emit=tag(xml,"emit"),dest=tag(xml,"dest"),issuer=dg(tag(emit,"CNPJ")||(/resNFe/i.test(schema)?tag(xml,"CNPJ"):"")),recipient=dg(tag(dest,"CNPJ")),sum=/resNFe/i.test(schema),ev=/evento/i.test(schema)||/<evento\b/i.test(xml),full=!sum&&!ev&&/NFe/i.test(schema),access=tag(xml,"chNFe")||xml.match(/Id=["']NFe(\d{44})/i)?.[1]||"";return{nsu,schema,ev,sum,full,access,model:access.slice(20,22)||null,issue:tag(xml,"dhEmi")||tag(xml,"dEmi")||tag(xml,"dhEvento")||null,value:Number(tag(xml,"vNF")||0),issuer,issuerName:tag(emit,"xNome")||(sum?tag(xml,"xNome"):""),recipient,number:tag(xml,"nNF")||null,series:tag(xml,"serie")||null,status:tag(xml,"cSitNFe")||tag(xml,"cStat")||null,xml,direction:ev?"relacionada":issuer===cnpj?"saida":recipient===cnpj||sum?"entrada":"relacionada",eventType:ev?tag(xml,"tpEvento")||null:null,eventDescription:ev?tag(xml,"descEvento")||tag(xml,"xEvento")||null:null}}

async function fetchDistribution(admin:any,pfx:string,pass:string,cnpj:string,uf:string,cur:string,env:string){
  const bodyJson=JSON.stringify({certificate_base64:pfx,certificate_password:pass,cnpj,ufCode:uf,uf_code:uf,ultNSU:cur,ult_nsu:cur,environment:env});
  let primaryError="";
  try{
    const timestamp=String(Date.now()),bridgeSecret=Deno.env.get("DFE_BRIDGE_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const key=await crypto.subtle.importKey("raw",E.encode(bridgeSecret),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const signed=new Uint8Array(await crypto.subtle.sign("HMAC",key,E.encode("dfe-bridge:"+timestamp+":"+bodyJson)));
    const signature=[...signed].map(v=>v.toString(16).padStart(2,"0")).join("");
    const r=await fetch("https://ws-dfe-bridge.vercel.app/api/distribuicao",{method:"POST",headers:{"x-ws-timestamp":timestamp,"x-ws-signature":signature,"content-type":"application/json"},body:bodyJson,signal:AbortSignal.timeout(45000)});
    const p=await r.json().catch(()=>({})) as any;
    if(r.ok&&p?.raw_xml)return{raw:String(p.raw_xml),response:p.response||null,transport:"dfe_bridge"};
    primaryError="bridge_"+r.status+":"+String(p?.error||"erro");
  }catch(e){primaryError=e instanceof Error?e.message:String(e)}
  const {data:g}=await admin.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle();
  const token=String(g?.token||"");if(!token)throw Error(primaryError+"; fallback_token_missing");
  let certificate:any;
  try{certificate=lerCertificado(Buffer.from(pfx,"base64"),pass)}catch(e){throw Error(primaryError+"; local_pfx_parse_failed")}
  const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+token},body:JSON.stringify({action:"nfe-distribution",environment:env==="homologacao"?"homologation":"production",certificate_pem:certificate.certificadoPem,private_key_pem:certificate.chavePrivadaPem,chain_pem:certificate.cadeiaPem||[],cnpj,uf_code:uf,ult_nsu:cur}),signal:AbortSignal.timeout(60000)});
  const o=await r.json().catch(()=>({})) as any;
  if(!r.ok||!o?.ok||!o?.text)throw Error(primaryError+"; fallback_"+r.status+":"+String(o?.error||"erro"));
  return{raw:String(o.text),response:null,transport:"fiscal_soap_fallback"};
}
async function storeDfeDocuments(admin:any,rows:any[]){
  if(!rows.length)return{inserted:0,updated:0};
  const companyId=String(rows[0]?.company_id||"");
  const keys=[...new Set(rows.map((r:any)=>String(r.access_key||"")).filter((k:string)=>k.length>=44))];
  const existing:any[]=[];
  for(let i=0;i<keys.length;i+=200){
    const {data,error}=await admin.from("fiscal_dfe_documents")
      .select("id,access_key,nsu,full_xml,xml,document_kind,schema_name,issue_date,value,issuer_cnpj,issuer_name,recipient_cnpj,note_number,series,status_code,source,source_id,model,status_text")
      .eq("company_id",companyId)
      .neq("document_kind","evento")
      .in("access_key",keys.slice(i,i+200));
    if(error)throw error;
    existing.push(...(data||[]));
  }
  const richness=(r:any)=>(r?.full_xml&&r?.xml?1000000:0)+String(r?.xml||"").length+(r?.document_kind==="nfe"?10000:0);
  const byKey=new Map<string,any>();
  for(const row of existing){
    const key=String(row.access_key||"");
    const current=byKey.get(key);
    if(!current||richness(row)>richness(current))byKey.set(key,row);
  }
  let updated=0;
  const pendingByKey=new Map<string,any>();
  for(const row of rows){
    const key=String(row.access_key||"");
    const old=key?byKey.get(key):null;
    if(old){
      const incomingRich=Boolean(row.full_xml&&row.xml);
      const patch:any={
        direction:row.direction||old.direction,
        model:row.model||old.model,
        issue_date:row.issue_date||old.issue_date,
        value:row.value??old.value,
        issuer_cnpj:row.issuer_cnpj||old.issuer_cnpj,
        issuer_name:row.issuer_name||old.issuer_name,
        recipient_cnpj:row.recipient_cnpj||old.recipient_cnpj,
        note_number:row.note_number||old.note_number,
        series:row.series||old.series,
        status_code:row.status_code||old.status_code,
        updated_at:new Date().toISOString(),
      };
      if(incomingRich||!old.full_xml){
        patch.full_xml=Boolean(row.full_xml||old.full_xml);
        patch.xml=incomingRich?row.xml:old.xml;
        patch.schema_name=incomingRich?(row.schema_name||old.schema_name):old.schema_name;
        patch.document_kind=incomingRich?"nfe":(old.document_kind||row.document_kind);
        patch.source=incomingRich?(row.source||old.source):old.source;
        patch.source_id=incomingRich?(row.source_id||old.source_id):old.source_id;
      }
      const {error}=await admin.from("fiscal_dfe_documents").update(patch).eq("id",old.id);
      if(error)throw error;
      updated++;
      continue;
    }
    if(key){
      const pending=pendingByKey.get(key);
      if(!pending||richness(row)>richness(pending))pendingByKey.set(key,row);
    }else{
      pendingByKey.set("nsu:"+String(row.nsu),row);
    }
  }
  const inserts=[...pendingByKey.values()];
  if(inserts.length){
    const {error}=await admin.from("fiscal_dfe_documents").upsert(inserts,{onConflict:"user_id,cnpj,environment,uf_code,nsu"});
    if(error)throw error;
  }
  return{inserted:inserts.length,updated};
}
Deno.serve(async req=>{const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);try{const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();if(!t?.token||req.headers.get("x-debug-token")!==String(t.token))return J({error:"unauthorized"},403);const now=new Date(),okNext=()=>new Date(Date.now()+3*3600000).toISOString();const [{data:minimumHistory},{data:localToday},{data:extractorLinks}]=await Promise.all([admin.rpc("extractor_minimum_history_start"),admin.rpc("extractor_local_date"),admin.from("extractor_companies").select("fiscal_company_id").eq("status","active")]);const brazilNow=new Date(Date.now()-3*60*60*1000),fallbackStart=new Date(Date.UTC(brazilNow.getUTCFullYear(),brazilNow.getUTCMonth()-1,1)).toISOString().slice(0,10),extractorHistoryStart=/^\d{4}-\d{2}-\d{2}$/.test(String(minimumHistory||""))?String(minimumHistory):fallbackStart,extractorHistoryEnd=/^\d{4}-\d{2}-\d{2}$/.test(String(localToday||""))?String(localToday):brazilNow.toISOString().slice(0,10),extractorCompanyIds=new Set((extractorLinks||[]).map(row=>String(row.fiscal_company_id||"")));const {data:cs,error}=await admin.from("fiscal_companies").select("id,cnpj,uf,status,ambiente_padrao,fiscal_settings,created_by").eq("status","ativa");if(error)throw error;const out:any[]=[];for(const c of cs||[]){let st:any=null;const isExtractor=extractorCompanyIds.has(String(c.id));try{({data:st}=await admin.from("fiscal_purchase_sync_state").select("*").eq("company_id",c.id).maybeSingle());if(st?.paused||c.fiscal_settings?.purchase_sync_paused){await admin.from("fiscal_purchase_sync_state").upsert({company_id:c.id,paused:true,status:"paused",next_scheduled_at:null,updated_at:now.toISOString()});out.push({company_id:c.id,status:"paused"});continue}if(st?.next_scheduled_at&&new Date(st.next_scheduled_at)>now){out.push({company_id:c.id,status:"not_due"});continue}const {data:cert}=await admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv").eq("company_id",c.id).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();if(!cert){await admin.from("fiscal_purchase_sync_state").upsert({company_id:c.id,status:"waiting_certificate",next_scheduled_at:new Date(Date.now()+1800000).toISOString(),last_error:"Certificado A1 ativo não encontrado",updated_at:now.toISOString()});continue}await admin.from("fiscal_purchase_sync_state").upsert({company_id:c.id,status:"running",last_started_at:now.toISOString(),last_error:null,updated_at:now.toISOString()});const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv),cnpj=dg(c.cnpj),uf=UF[String(c.uf||"AL").toUpperCase()]||"27",env=c.ambiente_padrao==="homologacao"?"homologacao":"producao",uid=c.created_by;const {data:s}=await admin.from("fiscal_dfe_sync_state").select("*").eq("user_id",uid).eq("cnpj",cnpj).eq("environment",env).eq("uf_code",uf).maybeSingle();if(s?.last_status_code==="656"&&s.last_synced_at&&Date.now()-new Date(s.last_synced_at).getTime()<3600000){await admin.from("fiscal_purchase_sync_state").upsert({company_id:c.id,status:"cooldown",next_scheduled_at:new Date(new Date(s.last_synced_at).getTime()+3900000).toISOString(),last_error:"SEFAZ 656: cooldown automático",updated_at:now.toISOString()});continue}let cur=dg(s?.ult_nsu||"0").padStart(15,"0"),last:any={cStat:"137"},newDocs=0,newEvents=0;for(let i=0;i<5;i++){const dist=await fetchDistribution(admin,pfx,pass,cnpj,uf,cur,env),raw=dist.raw;if(!raw)throw Error("distribuicao_sem_xml");last=dist.response||{cStat:tag(raw,"cStat"),xMotivo:tag(raw,"xMotivo"),ultNSU:tag(raw,"ultNSU"),maxNSU:tag(raw,"maxNSU")};if(String(last.cStat)==="656"){await admin.from("fiscal_dfe_sync_state").upsert({user_id:uid,cnpj,environment:env,uf_code:uf,ult_nsu:cur,max_nsu:s?.max_nsu||cur,last_status_code:"656",last_status_message:last.xMotivo,last_synced_at:now.toISOString(),updated_at:now.toISOString()},{onConflict:"user_id,cnpj,environment,uf_code"});throw Error("SEFAZ_656")}const docs:any[]=[];const re=/<docZip\b([^>]*)>([\s\S]*?)<\/docZip>/gi;let m;while((m=re.exec(raw)))try{docs.push(parse(await gz(m[2]),at(m[1],"schema"),at(m[1],"NSU"),cnpj))}catch{}const ev=docs.filter(d=>d.ev),nt=docs.filter(d=>!d.ev&&(!isExtractor||!d.issue||(String(d.issue).slice(0,10)>=extractorHistoryStart&&String(d.issue).slice(0,10)<=extractorHistoryEnd)));if(ev.length){const rows=ev.map(d=>({user_id:uid,company_id:c.id,cnpj,environment:env,uf_code:uf,nsu:d.nsu,schema_name:d.schema,access_key:d.access||null,event_type:d.eventType,event_description:d.eventDescription,status_code:d.status,event_at:d.issue,xml:d.xml,source:"national_dfe_cron",updated_at:new Date().toISOString()}));const q=await admin.from("fiscal_dfe_events").upsert(rows,{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(q.error)throw q.error;
const issuerEvents=ev.filter(d=>String(d.access||"").length===44&&String(d.access).slice(6,20)===cnpj&&String(d.access).slice(20,22)==="55");
if(issuerEvents.length){
 const refs=issuerEvents.map(d=>{const key=String(d.access),actor=dg(tag(d.xml,"CNPJ")||tag(d.xml,"CPF")),cancelled=String(d.eventType||"")==="110111";return{company_id:c.id,uf:String(c.uf||"").toUpperCase(),model:"55",access_key:key,document_number:String(Number(key.slice(25,34))),series:String(Number(key.slice(22,25))),issue_date:d.issue||null,status:cancelled?"Cancelada":"Referenciada por evento oficial",total_value:null,recipient_document:actor&&actor!==cnpj?actor:null,recipient_name:null,xml:null,source:"national_dfe_issuer_event",source_reference:{event_nsu:d.nsu,event_type:d.eventType,event_schema:d.schema,issue_month_from_key:"20"+key.slice(2,4)+"-"+key.slice(4,6),xml_pending:true},updated_at:new Date().toISOString()}});
 const sr=await admin.from("fiscal_sales_documents").upsert(refs,{onConflict:"company_id,access_key",ignoreDuplicates:true});if(sr.error)throw sr.error;
 const recs=issuerEvents.map(d=>{const key=String(d.access),cancelled=String(d.eventType||"")==="110111";return{company_id:c.id,model:"55",series:String(Number(key.slice(22,25))),note_number:Number(key.slice(25,34)),status:cancelled?"cancelled":"found",access_key:key,issue_date:d.issue||null,cstat:cancelled?"101":"100",xmotivo:cancelled?"Cancelamento referenciado por evento oficial":"Chave referenciada por evento oficial do Ambiente Nacional",attempts:1,last_checked_at:new Date().toISOString(),resolved_at:new Date().toISOString(),updated_at:new Date().toISOString(),xml_status:"pending",xml_attempts:0,detail_status:"pending",detail_attempts:0,event_status:"found",event_attempts:1}});
 const rr=await admin.from("fiscal_sales_reconciliation").upsert(recs,{onConflict:"company_id,model,series,note_number",ignoreDuplicates:true});if(rr.error)throw rr.error;
}
newEvents+=ev.length}if(nt.length){const rows=nt.map(d=>({user_id:uid,company_id:c.id,cnpj,environment:env,uf_code:uf,nsu:d.nsu,source:"national_dfe_cron",source_id:d.nsu,schema_name:d.schema,document_kind:d.sum?"resumo":d.full?"nfe":"documento",direction:d.direction,access_key:d.access||null,model:d.model,issue_date:d.issue,value:d.value,issuer_cnpj:d.issuer||null,issuer_name:d.issuerName||null,recipient_cnpj:d.recipient||null,note_number:d.number,series:d.series,status_code:d.status,full_xml:d.full,xml:d.xml,updated_at:new Date().toISOString()}));const stored=await storeDfeDocuments(admin,rows);newDocs+=stored.inserted+stored.updated}const next=dg(last.ultNSU||cur).padStart(15,"0"),max=dg(last.maxNSU||next).padStart(15,"0");cur=next;await admin.from("fiscal_dfe_sync_state").upsert({user_id:uid,cnpj,environment:env,uf_code:uf,ult_nsu:next,max_nsu:max,last_status_code:last.cStat,last_status_message:last.xMotivo,last_synced_at:new Date().toISOString(),updated_at:new Date().toISOString()},{onConflict:"user_id,cnpj,environment,uf_code"});if(String(last.cStat)!=="138"||next>=max)break;await new Promise(r=>setTimeout(r,1200))}await admin.from("fiscal_purchase_sync_state").upsert({company_id:c.id,status:"idle",consecutive_failures:0,last_status_code:String(last.cStat||""),last_status_message:String(last.xMotivo||""),last_completed_at:new Date().toISOString(),next_scheduled_at:okNext(),last_error:null,updated_at:new Date().toISOString()});out.push({company_id:c.id,status:"ok",cStat:last.cStat,newDocuments:newDocs,newEvents})}catch(e){const n=Number(st?.consecutive_failures||0)+1,min=Math.min(60,5*2**Math.min(n-1,3));await admin.from("fiscal_purchase_sync_state").upsert({company_id:c.id,status:"retrying",consecutive_failures:n,last_failed_at:new Date().toISOString(),next_scheduled_at:new Date(Date.now()+min*60000).toISOString(),last_error:e instanceof Error?e.message:String(e),updated_at:new Date().toISOString()});out.push({company_id:c.id,status:"retrying",retry_minutes:min})}}return J({ok:true,companies:out})}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});
