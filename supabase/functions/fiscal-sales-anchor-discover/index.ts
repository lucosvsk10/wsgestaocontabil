import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
async function key(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw new Error("secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,iv:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(iv)},await key(),B(c)))}
function dv(base:string){let sum=0,w=2;for(let i=base.length-1;i>=0;i--){sum+=Number(base[i])*w;w=w===9?2:w+1}let d=11-(sum%11);return String(d>=10?0:d)}
function synthetic(cnpj:string,month:string,n:number,model:string,series:number){const base="27"+month+cnpj+model+String(series).padStart(3,"0")+String(n).padStart(9,"0")+"1"+"00000000";return base+dv(base)}
function addDays(iso:string,days:number){const d=new Date(iso+"T12:00:00-03:00");d.setUTCDate(d.getUTCDate()+days);return new Intl.DateTimeFormat("en-CA",{timeZone:"America/Maceio",year:"numeric",month:"2-digit",day:"2-digit"}).format(d)}
function monthCode(iso:string){return iso.slice(2,4)+iso.slice(5,7)}
function prevMonth(code:string){let y=2000+Number(code.slice(0,2)),m=Number(code.slice(2));m--;if(m===0){m=12;y--}return String(y).slice(-2)+String(m).padStart(2,"0")}
function nextMonth(code:string){let y=2000+Number(code.slice(0,2)),m=Number(code.slice(2));m++;if(m===13){m=1;y++}return String(y).slice(-2)+String(m).padStart(2,"0")}
async function cons(pfx:string,pass:string,keyValue:string){const payload=`<consSitNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>1</tpAmb><xServ>CONSULTAR</xServ><chNFe>${keyValue}</chNFe></consSitNFe>`;const soap=`<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">${payload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;const r=await fetch("https://ws-svrs-consit.vercel.app/api/consit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({certificate_base64:pfx,certificate_password:pass,soap_body:soap}),signal:AbortSignal.timeout(22000)});if(!r.ok)throw new Error("consit_http_"+r.status);const o=await r.json().catch(()=>({})) as any;const txt=String(o?.body||"");return{cstat:(txt.match(/<cStat>(\d+)<\/cStat>/)||[])[1]||null,xmotivo:(txt.match(/<xMotivo>([\s\S]*?)<\/xMotivo>/)||[])[1]||null,real:(txt.match(/\[(\d{44})\]/)||[])[1]||null}}
async function download(pfx:string,pass:string,accessKey:string){try{const r=await fetch("https://ws-svrs-consit.vercel.app/api/download",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({certificate_base64:pfx,certificate_password:pass,access_key:accessKey}),signal:AbortSignal.timeout(22000)});if(!r.ok)return null;const o=await r.json().catch(()=>({})) as any;const html=String(o?.body_text||"");const m=html.match(/var\s+stringJson\s*=\s*(\{[\s\S]*?\})\s*;/);if(!m)return null;return JSON.parse(m[1])?.xml||null}catch{return null}}
function tag(xml:string,name:string){return xml.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`))?.[1]||null}
function relation(issueDate:string|null,keyMonth:string,targetDate:string,targetMonth:string){if(issueDate){const d=issueDate.slice(0,10);return d<=targetDate?"before":"after"}if(keyMonth<targetMonth)return"before";if(keyMonth>targetMonth)return"after";return"unknown"}

Deno.serve(async req=>{try{
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const token=req.headers.get("x-debug-token")||"";
  const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
  if(!token||token!==String(t?.token||""))return J({error:"unauthorized"},403);
  const b=await req.json().catch(()=>({})) as any;
  const companyId=String(b.company_id||""),model=String(b.model||"65").replace(/\D/g,""),series=Math.max(1,Math.min(999,Number(b.series||1)));
  if(!companyId||!["55","65"].includes(model))return J({error:"invalid_request"},400);
  const [{data:startRpc},{data:todayRpc}]=await Promise.all([admin.rpc("extractor_minimum_history_start"),admin.rpc("extractor_local_date")]);
  const today=/^\d{4}-\d{2}-\d{2}$/.test(String(todayRpc||""))?String(todayRpc):new Intl.DateTimeFormat("en-CA",{timeZone:"America/Maceio",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const start=/^\d{4}-\d{2}-\d{2}$/.test(String(b.start_date||""))?String(b.start_date):String(startRpc||today);
  const target=addDays(start,-1),targetMonth=monthCode(target);
  const {data:company,error:ce}=await admin.from("fiscal_companies").select("id,cnpj,uf,status").eq("id",companyId).maybeSingle();
  if(ce)throw ce;if(!company||company.status!=="ativa"||String(company.uf||"").toUpperCase()!=="AL")return J({ok:true,skipped:"company_not_active_al"});
  const {data:cert,error:cerror}=await admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv").eq("company_id",companyId).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(cerror)throw cerror;if(!cert)return J({ok:true,skipped:"certificate_missing"});
  const existingSales=await admin.from("fiscal_sales_documents").select("access_key,document_number,issue_date,series,model").eq("company_id",companyId).eq("model",model).eq("series",String(series)).lt("issue_date",start+"T00:00:00-03:00").order("issue_date",{ascending:false}).limit(1).maybeSingle();
  if(existingSales.data?.document_number)return J({ok:true,source:"stored_sale",company_id:companyId,model,series,start_date:start,end_date:today,anchor_date:target,anchor_number:Number(existingSales.data.document_number),anchor_key:existingSales.data.access_key||null,anchor_issue_date:existingSales.data.issue_date||null});
  const existingDfe=await admin.from("fiscal_dfe_documents").select("access_key,note_number,issue_date,series,model,full_xml").eq("company_id",companyId).eq("direction","saida").eq("model",model).eq("series",String(series)).lt("issue_date",start+"T00:00:00-03:00").order("issue_date",{ascending:false}).limit(1).maybeSingle();
  if(existingDfe.data?.note_number)return J({ok:true,source:"stored_dfe",company_id:companyId,model,series,start_date:start,end_date:today,anchor_date:target,anchor_number:Number(existingDfe.data.note_number),anchor_key:existingDfe.data.access_key||null,anchor_issue_date:existingDfe.data.issue_date||null});
  const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv),cnpj=digits(company.cnpj);
  let probes=0,cooldown=false;const maxProbes=Math.min(36,Math.max(10,Number(b.max_probes||28)));const cache=new Map<number,any>();
  async function probe(n:number){if(n<1||probes>=maxProbes)return null;if(cache.has(n))return cache.get(n);probes++;let candidate:any=null;for(const m of [targetMonth,prevMonth(targetMonth),nextMonth(targetMonth)]){const q=await cons(pfx,pass,synthetic(cnpj,m,n,model,series));if(q.cstat==="656"){cooldown=true;break}const real=digits(q.real);if(real.length===44&&real.slice(6,20)===cnpj&&real.slice(20,22)===model&&Number(real.slice(22,25))===series&&Number(real.slice(25,34))===n){const xml=await download(pfx,pass,real);const issue=xml?(tag(xml,"dhEmi")||tag(xml,"dEmi")):null;candidate={note_number:n,access_key:real,key_month:real.slice(2,6),issue_date:issue,relation:relation(issue,real.slice(2,6),target,targetMonth),xml_confirmed:Boolean(xml)};break}}cache.set(n,candidate);return candidate}
  async function near(n:number){for(const d of [0,-1,1,-2,2]){const v=n+d;if(v<1)continue;const c=await probe(v);if(c)return c;if(cooldown||probes>=maxProbes)break}return null}
  let low:any=null,high:any=null,n=1;
  while(probes<maxProbes&&!cooldown&&n<=16777216){const c=await near(n);if(c){if(c.relation==="before"){if(!low||c.note_number>low.note_number)low=c;n=Math.max(n*2,c.note_number*2);continue}if(c.relation==="after"){high=c;break}/* same month without XML: stay safe and treat as upper bound */high=c;break}else{if(low){high={note_number:n,missing:true};break}n*=2}}
  if(low&&high&&!cooldown){let lo=low.note_number,hi=Number(high.note_number||lo+1);for(let i=0;i<8&&hi-lo>3&&probes<maxProbes;i++){const mid=Math.floor((lo+hi)/2);const c=await near(mid);if(!c){hi=mid;continue}if(c.relation==="before"){if(c.note_number>low.note_number)low=c;lo=Math.max(lo,c.note_number)}else{hi=Math.min(hi,c.note_number)}}}
  if(!low)return J({ok:true,company_id:companyId,model,series,start_date:start,end_date:today,anchor_date:target,anchor_found:false,probes,cooldown,retry:true});
  return J({ok:true,company_id:companyId,model,series,start_date:start,end_date:today,anchor_date:target,anchor_found:true,anchor_number:low.note_number,anchor_key:low.access_key,anchor_issue_date:low.issue_date,anchor_key_month:low.key_month,xml_confirmed:low.xml_confirmed,probes,cooldown,search_high:high?.note_number||null});
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});