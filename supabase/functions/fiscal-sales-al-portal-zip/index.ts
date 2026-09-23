import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { unzipSync, strFromU8 } from "npm:fflate@0.8.2";

const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
function cookieMerge(current:string,headers:Headers){const jar=new Map<string,string>();for(const p of current.split(/;\s*/)){const i=p.indexOf("=");if(i>0)jar.set(p.slice(0,i),p.slice(i+1))}const list=(headers as any).getSetCookie?.()||[];for(const raw of list){const pair=String(raw).split(";",1)[0];const i=pair.indexOf("=");if(i>0)jar.set(pair.slice(0,i),pair.slice(i+1))}const single=headers.get("set-cookie");if(single&&!list.length){const pair=single.split(";",1)[0],i=pair.indexOf("=");if(i>0)jar.set(pair.slice(0,i),pair.slice(i+1))}return [...jar].map(([k,v])=>`${k}=${v}`).join("; ")}
async function req(url:string,init:RequestInit={},cookie=""){const headers=new Headers(init.headers||{});headers.set("user-agent","Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/153 Safari/537.36");if(cookie)headers.set("cookie",cookie);const r=await fetch(url,{...init,headers,redirect:"manual",signal:AbortSignal.timeout(60000)});const buf=new Uint8Array(await r.arrayBuffer());return{status:r.status,headers:r.headers,buf}}
async function login(username:string,password:string){const base="https://nfeas.sefaz.al.gov.br";let cookie="";let r=await req(base+"/sca_default_login_page",{},cookie);cookie=cookieMerge(cookie,r.headers);const body=new URLSearchParams({sca_login:username,sca_senha:password,btn_entrar:"Entrar"});r=await req(base+"/sca_security_check",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","origin":base,"referer":base+"/sca_default_login_page"},body},cookie);cookie=cookieMerge(cookie,r.headers);let loc=r.headers.get("location");for(let i=0;i<10&&loc;i++){const u=new URL(loc,base).toString();r=await req(u,{headers:{referer:base}},cookie);cookie=cookieMerge(cookie,r.headers);loc=r.headers.get("location")}const text=new TextDecoder().decode(r.buf);if(/senha inv[aá]lida|usu[aá]rio inv[aá]lido|sca_default_login_page/i.test(text+" "+String(loc||"")))throw Error("invalid_credentials");return{cookie,final_status:r.status}}
function brDate(iso:string){const m=iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);return m?`${m[3]}/${m[2]}/${m[1]}`:""}
function zipSig(buf:Uint8Array){return buf.length>=4&&buf[0]===0x50&&buf[1]===0x4b&&((buf[2]===0x03&&buf[3]===0x04)||(buf[2]===0x05&&buf[3]===0x06)||(buf[2]===0x07&&buf[3]===0x08))}
function tag(x:string,n:string){return x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,"i"))?.[1]?.trim()||""}
function parseXml(xml:string,issuer:string){const key=(xml.match(/Id=["']NFe(\d{44})["']/i)||xml.match(/<(?:\w+:)?chNFe>(\d{44})<\/(?:\w+:)?chNFe>/i))?.[1]||"";if(!/^\d{44}$/.test(key)||key.slice(6,20)!==issuer)return null;const model=key.slice(20,22);if(!["55","65"].includes(model))return null;const series=String(Number(key.slice(22,25))),number=String(Number(key.slice(25,34)));return{key,model,series,number,issue:tag(xml,"dhEmi")||tag(xml,"dEmi")||null,total:tag(xml,"vNF")||null,cstat:tag(xml,"cStat")||"100",status:tag(xml,"xMotivo")||"Autorizada",xml}}
function gwtEscape(v:string){return v.replace(/\\/g,"\\\\").replace(/\|/g,"\\!").replace(/\0/g,"\\0")}
function gwtCountPayload(params:{cnpj:string,ie:string,start:string,end:string}){
 const strings=[
  "https://nfeas.sefaz.al.gov.br/gwtapp/",
  "65B6BD5745F6531C4EBB72A58A01D410",
  "br.gov.al.sefaz.nfe.relatorios.web.client.shared.NFeRelatoriosRemoteService",
  "consultarQuantidadeNotasFiscaisDeEntradaIhSaida",
  "br.gov.al.sefaz.nfe.shared.legado.NotaFiscalConsultaDTO/3510275579",
  "'A','C','D'",
  brDate(params.end)+" 23:59",
  brDate(params.start)+" 00:00",
  params.ie,
  params.cnpj,
  "-1",
  "AL"
 ];
 const values=[1,2,3,4,1,5,5,6,-1,0,0,7,8,0,0,0,9,0,10,0,0,0,11,0,12];
 return "7|0|"+strings.length+"|"+strings.map(gwtEscape).join("|")+"|"+values.join("|")+"|";
}
async function gwtCount(cookie:string,params:{cnpj:string,ie:string,start:string,end:string}){
 const endpoint="https://nfeas.sefaz.al.gov.br/gwtapp/nfeRelatoriosRemoteService.rpc";
 const body=gwtCountPayload(params);
 const r=await req(endpoint,{method:"POST",headers:{
   "content-type":"text/x-gwt-rpc; charset=utf-8",
   "x-gwt-permutation":"17B9688C7FCB092178ADBD10B81EA1F8",
   "x-gwt-module-base":"https://nfeas.sefaz.al.gov.br/gwtapp/",
   "origin":"https://nfeas.sefaz.al.gov.br",
   "referer":"https://nfeas.sefaz.al.gov.br/"
 },body},cookie);
 const text=new TextDecoder().decode(r.buf);
 return {http:r.status,type:r.headers.get("content-type")||"",bytes:r.buf.length,ok:r.status>=200&&r.status<300&&/^\/\/(?:OK|EX)/.test(text),response:text.slice(0,2400)};
}
Deno.serve(async req0=>{try{
 const a=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const tok=req0.headers.get("x-debug-token")||"";const{data:t}=await a.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();if(tok!==String(t?.token||""))return J({error:"unauthorized"},403);
 const b=await req0.json().catch(()=>({})) as any,cid=String(b.company_id||"");if(!cid)return J({error:"company_id_required"},400);
 const{data:c}=await a.from("fiscal_companies").select("id,cnpj,inscricao_estadual,razao_social,created_by,uf,status").eq("id",cid).maybeSingle();if(!c||c.status!=="ativa"||String(c.uf||"").toUpperCase()!=="AL")return J({error:"company_not_active_al"},422);
 const{data:cred}=await a.from("fiscal_state_credentials").select("username_ciphertext,username_iv,password_ciphertext,password_iv,last_verification_status,is_active").eq("company_id",cid).eq("uf","AL").eq("is_active",true).maybeSingle();if(!cred||cred.last_verification_status!=="valid")return J({error:"state_credential_not_valid"},409);
 const username=await dec(cred.username_ciphertext,cred.username_iv),password=await dec(cred.password_ciphertext,cred.password_iv),session=await login(username,password);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Maceio",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());const{data:minStart}=await a.rpc("extractor_minimum_history_start");const start=/^\d{4}-\d{2}-\d{2}$/.test(String(b.start||""))?String(b.start):String(minStart||today.slice(0,8)+"01"),end=/^\d{4}-\d{2}-\d{2}$/.test(String(b.end||""))?String(b.end):today;
 const app="https://nfeas.sefaz.al.gov.br/";let cookie=session.cookie;const landing=await req(app,{headers:{accept:"text/html,*/*"}},cookie);cookie=cookieMerge(cookie,landing.headers);
 const landingText=new TextDecoder().decode(landing.buf);
 const diagnosticLinks=[...landingText.matchAll(/(?:href|src|action)=["']([^"'#]+)["']/gi)].map(m=>m[1]).filter(v=>/nfe|relat|gwt|consulta|app|menu/i.test(v)).slice(0,80);
 const diagnosticFrames=[...landingText.matchAll(/<iframe[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]).slice(0,30);
 const diagnosticScripts=[...landingText.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)].map(m=>m[1]).slice(0,50);
 const inlineRoutes=[...new Set([...landingText.matchAll(/["']([^"']*(?:nfe|relat|gwt|consulta)[^"']*)["']/gi)].map(m=>m[1]).filter(v=>v.length<260))].slice(0,80);
 const issuer=dg(c.cnpj),ie=dg(c.inscricao_estadual);const rpcCount=await gwtCount(cookie,{cnpj:issuer,ie,start,end});const variants=[["","-1"],["A,C,D","-1"],["100,101,302","-1"],["A","-1"]];const attempts:any[]=[];let zip:Uint8Array|null=null,chosen:any=null;
 for(const [status,emission] of variants){const q=new URLSearchParams({ufEntrada:"AL",numeroCnpjEntrada:issuer,numeroCacealEntrada:ie,ufDestino:"",numeroCnpjDestino:"",numeroCacealDestino:"",dataEmissaoInicial:brDate(start)+" 00:00",dataEmissaoFinal:brDate(end)+" 23:59",codigoStatus:status,codigoTipoEmissao:emission});const url=app+"gwtapp/arquivozip/notasFiscais.zip?"+q.toString();const r=await req(url,{headers:{accept:"application/zip,application/octet-stream,*/*",referer:app+"gwtapp/"}},cookie);cookie=cookieMerge(cookie,r.headers);const ok=zipSig(r.buf);attempts.push({http:r.status,type:r.headers.get("content-type")||"",bytes:r.buf.length,zip:ok,status_filter:status,emission_filter:emission});if(r.status>=200&&r.status<300&&ok){zip=r.buf;chosen={status,emission};break}}
 if(!zip)return J({ok:false,company_id:cid,period:{start,end},login_http:session.final_status,landing_http:landing.status,rpc_count:rpcCount,attempts,diagnostics:{title:(landingText.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]?.trim()||null,links:diagnosticLinks,frames:diagnosticFrames,scripts:diagnosticScripts,inline_routes:inlineRoutes,excerpt:landingText.replace(/<script[\s\S]*?<\/script>/gi," ").replace(/<style[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/\s+/g," ").trim().slice(0,1200)}},502);
 const files=unzipSync(zip);const docs:any[]=[];const entries=Object.keys(files);for(const name of entries){if(!/\.xml$/i.test(name))continue;let xml="";try{xml=strFromU8(files[name])}catch{xml=new TextDecoder("windows-1252").decode(files[name])}const d=parseXml(xml,issuer);if(d)docs.push(d)}
 const unique=[...new Map(docs.map(d=>[d.key,d])).values()];const action=String(b.action||"probe");let saved=0;
 if(action==="sync"){for(const d of unique){const now=new Date().toISOString();const total=d.total?Number(d.total):null;await a.from("fiscal_sales_documents").upsert({company_id:cid,uf:"AL",model:d.model,access_key:d.key,document_number:d.number,series:d.series,issue_date:d.issue,status:d.status,total_value:total,xml:d.xml,source:"sefaz_al_portal_zip",source_reference:{official:true,portal_zip:true,period_start:start,period_end:end},updated_at:now},{onConflict:"company_id,access_key"});await a.from("fiscal_dfe_documents").upsert({user_id:c.created_by,company_id:cid,cnpj:c.cnpj,environment:"producao",uf_code:"27",nsu:`PORTAL-${d.key}`,schema_name:"procNFe_v4.00",document_kind:"nfe",direction:"saida",access_key:d.key,issue_date:d.issue,value:total,issuer_cnpj:c.cnpj,issuer_name:c.razao_social,note_number:d.number,series:d.series,status_code:d.cstat,full_xml:true,xml:d.xml,source:"sefaz_al_portal_zip",source_id:d.key,model:d.model,status_text:d.status,parse_error:null,updated_at:now},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});await a.from("fiscal_sales_reconciliation").upsert({company_id:cid,model:d.model,series:d.series,note_number:Number(d.number),status:/cancel/i.test(d.status)?"cancelled":"found",access_key:d.key,issue_date:d.issue,month_code:d.key.slice(2,6),cstat:d.cstat,xmotivo:d.status,last_checked_at:now,resolved_at:now,updated_at:now},{onConflict:"company_id,model,series,note_number"});saved++}
   const counts=new Map<string,number>();for(const d of unique)counts.set(d.model,(counts.get(d.model)||0)+1);const now=new Date().toISOString();for(const [model,count] of counts){const documentType=model==="65"?"sale_nfce65":"sale_nfe55";await a.from("fiscal_source_reconciliation").upsert({company_id:cid,document_type:documentType,period_start:start,period_end:end,status:"ok",source_name:"SEFAZ/AL portal - Entradas e Saídas",source_confirmed:true,source_count:count,site_count:count,missing_count:0,extra_count:0,reason:"XML oficial enumerado pelo portal estadual.",checked_at:now,updated_at:now},{onConflict:"company_id,document_type,period_start,period_end"}).catch(()=>{});}
 }
 return J({ok:true,company_id:cid,period:{start,end},rpc_count:rpcCount,zip_bytes:zip.length,entries:entries.length,xml_entries:entries.filter(n=>/\.xml$/i.test(n)).length,documents:unique.length,by_model:unique.reduce((o:any,d:any)=>(o[d.model]=(o[d.model]||0)+1,o),{}),saved,chosen,attempts,preview:unique.slice(0,20).map(d=>({key:d.key,model:d.model,series:d.series,number:d.number,issue:d.issue,status:d.status}))});
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});
