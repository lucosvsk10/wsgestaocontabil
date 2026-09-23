import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
async function auth(username:string,password:string){const r=await fetch("https://contribuinte.sefaz.al.gov.br/auth/authenticate",{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({username,password,rememberMe:false}),signal:AbortSignal.timeout(45000)});const o=await r.json().catch(()=>({})) as any;const token=String(o?.id_token||"");if(!r.ok||!token)throw Error(`auth_http_${r.status}`);return token}
async function get(url:string,token:string,accept="*/*"){const r=await fetch(url,{headers:{"authorization":`Bearer ${token}`,"accept":accept,"referer":"https://contribuinte.sefaz.al.gov.br/malhafiscal/"},redirect:"manual",signal:AbortSignal.timeout(45000)});const buf=new Uint8Array(await r.arrayBuffer());return{status:r.status,type:r.headers.get("content-type")||"",location:r.headers.get("location")||"",buf}}
function keys(buf:Uint8Array,cnpj:string){const text=new TextDecoder("latin1").decode(buf);return[...new Set([...text.matchAll(/(?<!\d)(\d{44})(?!\d)/g)].map(m=>m[1]).filter(k=>k.slice(6,20)===cnpj))]}
function excerpt(buf:Uint8Array){return new TextDecoder("utf-8").decode(buf.slice(0,1800)).replace(/\s+/g," ").slice(0,500)}
Deno.serve(async req=>{try{
 const a=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const supplied=req.headers.get("x-debug-token")||"";const{data:t}=await a.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();if(supplied!==String(t?.token||""))return J({error:"unauthorized"},403);
 const b=await req.json().catch(()=>({})) as any,cid=String(b.company_id||"");if(!cid)return J({error:"company_id_required"},400);
 const{data:c}=await a.from("fiscal_companies").select("id,cnpj,inscricao_estadual,uf,status").eq("id",cid).maybeSingle();if(!c||c.status!=="ativa"||String(c.uf||"").toUpperCase()!=="AL")return J({error:"company_not_active_al"},422);
 const{data:cred}=await a.from("fiscal_state_credentials").select("username_ciphertext,username_iv,password_ciphertext,password_iv,last_verification_status,is_active").eq("company_id",cid).eq("uf","AL").eq("is_active",true).maybeSingle();
 if(!cred||!["valid","valid_without_report_permission"].includes(String(cred.last_verification_status||"")))return J({error:"state_credential_not_usable"},409);
 const username=await dec(cred.username_ciphertext,cred.username_iv),password=await dec(cred.password_ciphertext,cred.password_iv),token=await auth(username,password);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Maceio",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());const{data:minStart}=await a.rpc("extractor_minimum_history_start");const start=/^\d{4}-\d{2}-\d{2}$/.test(String(b.start||""))?String(b.start):String(minStart||today.slice(0,8)+"01"),end=/^\d{4}-\d{2}-\d{2}$/.test(String(b.end||""))?String(b.end):today;
 const cnpj=dg(c.cnpj),ie=dg(c.inscricao_estadual),base="https://contribuinte.sefaz.al.gov.br/malhafiscal/";
 const reportParams=new URLSearchParams({numeroCnpj:cnpj,dataInicial:start,dataFinal:end,tipo:"xlsx"}).toString();
 const month=String(Number(end.slice(5,7))),year=end.slice(0,4);
 const listParams=new URLSearchParams({caceal:ie,anoCompetencia:year,mesCompetencia:month,tipoDocumento:"NFE",tipoOperacao:"P",pagina:"1",tamanhoPagina:"200",ehExpurgo:"false",apenasNfe:"true",chaveAcesso:""}).toString();
 const candidates=[
   ["swagger-v3",base+"sfz-malhafiscal-api/v3/api-docs"],
   ["swagger-v2",base+"sfz-malhafiscal-api/v2/api-docs"],
   ["swagger-resources",base+"sfz-malhafiscal-api/swagger-resources"],
   ["saida-singular",base+"sfz-malhafiscal-api/api/relatorios/notas-fiscais-saida?"+reportParams],
   ["saidas-plural",base+"sfz-malhafiscal-api/api/relatorios/notas-fiscais-saidas?"+reportParams],
   ["emitidas",base+"sfz-malhafiscal-api/api/relatorios/notas-fiscais-emitidas?"+reportParams],
   ["emissao",base+"sfz-malhafiscal-api/api/relatorios/notas-fiscais-emissao?"+reportParams],
   ["producao-saida",base+"sfz-malhafiscal-producao-api/api/relatorios/notas-fiscais-saida?"+reportParams],
   ["notaFiscal-generic",base+"sfz-malhafiscal-api/api/notaFiscal?"+listParams],
   ["notaFiscal-proprias",base+"sfz-malhafiscal-api/api/notaFiscal/notasProprias?"+listParams],
   ["notaFiscal-proprias-hifen",base+"sfz-malhafiscal-api/api/notaFiscal/notas-proprias?"+listParams],
 ];
 const out:any[]=[];
 for(const [name,url] of candidates){try{const r=await get(url,token,name.startsWith("swagger")?"application/json":"application/json,application/octet-stream,*/*");const ks=keys(r.buf,cnpj);let pathHints:string[]=[];if(name.startsWith("swagger")&&r.status>=200&&r.status<300){try{const o=JSON.parse(new TextDecoder().decode(r.buf));pathHints=Object.keys(o?.paths||{}).filter((p:string)=>/nota|nfe|relat|saida|emit/i.test(p)).slice(0,250)}catch{}}out.push({name,http:r.status,type:r.type,bytes:r.buf.length,location:r.location||null,key_count:ks.length,keys:ks.slice(0,30),path_hints:pathHints,excerpt:/json|text/i.test(r.type)?excerpt(r.buf):null});}catch(e){out.push({name,error:e instanceof Error?e.message:String(e)})}}
 return J({ok:true,company_id:cid,period:{start,end},results:out});
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});