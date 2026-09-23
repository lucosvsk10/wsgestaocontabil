import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import * as XLSX from "npm:xlsx@0.18.5";

const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
async function auth(username:string,password:string){const r=await fetch("https://contribuinte.sefaz.al.gov.br/auth/authenticate",{method:"POST",headers:{"content-type":"application/json","accept":"application/json"},body:JSON.stringify({username,password,rememberMe:false}),signal:AbortSignal.timeout(45000)});const o=await r.json().catch(()=>({})) as any;const token=String(o?.id_token||"");if(!r.ok||!token)throw Error(`auth_http_${r.status}`);return token}
async function get(url:string,token:string,accept="application/json"){const r=await fetch(url,{headers:{"authorization":`Bearer ${token}`,"accept":accept,"referer":"https://contribuinte.sefaz.al.gov.br/malhafiscal/"},signal:AbortSignal.timeout(90000)});const buf=new Uint8Array(await r.arrayBuffer());return{ok:r.ok,status:r.status,type:r.headers.get("content-type")||"",buf}}
function rowsFromXlsx(buf:Uint8Array){const wb=XLSX.read(buf,{type:"array",cellDates:true});const out:any[]=[];for(const name of wb.SheetNames){const ws=wb.Sheets[name];const rows=XLSX.utils.sheet_to_json(ws,{defval:null,raw:false}) as any[];out.push({sheet:name,rows});}return out}
function keyFromRow(row:any){for(const [k,v] of Object.entries(row||{})){const label=String(k).toLowerCase();const val=dg(v);if((label.includes("chave")||label.includes("chnfe")||label.includes("chave de acesso"))&&val.length===44)return val;}for(const v of Object.values(row||{})){const m=String(v??"").match(/\b\d{44}\b/);if(m)return m[0];}return""}
function competenceList(start:string,end:string){const out:string[]=[];let y=Number(start.slice(0,4)),m=Number(start.slice(5,7));const ey=Number(end.slice(0,4)),em=Number(end.slice(5,7));while(y<ey||(y===ey&&m<=em)){out.push(String(y)+String(m).padStart(2,"0"));m++;if(m===13){m=1;y++}}return out}
Deno.serve(async req=>{try{
 const a=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const tok=req.headers.get("x-debug-token")||"";const{data:t}=await a.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();if(tok!==String(t?.token||""))return J({error:"unauthorized"},403);
 const b=await req.json().catch(()=>({})) as any,cid=String(b.company_id||"");if(!cid)return J({error:"company_id_required"},400);
 const{data:c}=await a.from("fiscal_companies").select("id,cnpj,inscricao_estadual,uf,status").eq("id",cid).maybeSingle();if(!c||c.status!=="ativa"||String(c.uf||"").toUpperCase()!=="AL")return J({error:"company_not_active_al"},422);
 const{data:cred}=await a.from("fiscal_state_credentials").select("username_ciphertext,username_iv,password_ciphertext,password_iv,last_verification_status,is_active").eq("company_id",cid).eq("uf","AL").eq("is_active",true).maybeSingle();if(!cred||cred.last_verification_status!=="valid")return J({error:"state_credential_not_valid"},409);
 const username=await dec(cred.username_ciphertext,cred.username_iv),password=await dec(cred.password_ciphertext,cred.password_iv),token=await auth(username,password);
 const today=new Intl.DateTimeFormat("en-CA",{timeZone:"America/Maceio",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
 const{data:minStart}=await a.rpc("extractor_minimum_history_start");const start=/^\d{4}-\d{2}-\d{2}$/.test(String(b.start||""))?String(b.start):String(minStart||today.slice(0,8)+"01"),end=/^\d{4}-\d{2}-\d{2}$/.test(String(b.end||""))?String(b.end):today;
 const root=dg(c.cnpj).slice(0,8),comps=competenceList(start,end),results:any[]=[];
 const caceal=dg((c as any).inscricao_estadual||"");
 const noteApiResults:any[]=[];
 for(const comp of comps){
   const year=comp.slice(0,4),month=String(Number(comp.slice(4,6)));
   for(const tipoDocumento of ["NFE","NFCE"]){
     const u=new URL("https://contribuinte.sefaz.al.gov.br/malhafiscal/sfz-malhafiscal-api/api/notaFiscal");
     const params={caceal,anoCompetencia:year,mesCompetencia:month,tipoDocumento,tipoOperacao:"S",pagina:"1",tamanhoPagina:"200",ehExpurgo:"false",apenasNfe:"false",chaveAcesso:""};
     for(const [k,v] of Object.entries(params))u.searchParams.set(k,v);
     const rr=await get(u.toString(),token,"application/json");
     const txt=new TextDecoder().decode(rr.buf);
     let parsed:any=null;try{parsed=JSON.parse(txt)}catch{}
     noteApiResults.push({competencia:comp,tipoDocumento,http:rr.status,type:rr.type,bytes:rr.buf.length,payload:parsed??txt.slice(0,1200)});
   }
 }
 const year=Number(end.slice(0,4));
 const summaryUrl=new URL("https://contribuinte.sefaz.al.gov.br/malhafiscal/sfz-malhafiscal-api/api/escrituracao-nao-extemporaneo");
 summaryUrl.searchParams.set("raizCnpj",root);summaryUrl.searchParams.set("anoCompetencia",String(year));
 const summaryResp=await get(summaryUrl.toString(),token,"application/json");
 let summary:any=null;try{summary=JSON.parse(new TextDecoder().decode(summaryResp.buf))}catch{summary=null}

 for(const comp of comps){
   const u=new URL("https://contribuinte.sefaz.al.gov.br/malhafiscal/sfz-malhafiscal-api/api/relatorios/escrituacao-nao-extemporaneo");
   u.searchParams.set("raizCnpj",root);u.searchParams.set("tipo","xlsx");u.searchParams.set("competencia",comp);
   const r=await get(u.toString(),token,"application/octet-stream");
   if(!r.ok){results.push({competencia:comp,http:r.status,type:r.type,bytes:r.buf.length,keys:0});continue}
   let sheets:any[]=[];try{sheets=rowsFromXlsx(r.buf)}catch(e){results.push({competencia:comp,http:r.status,type:r.type,bytes:r.buf.length,parse_error:e instanceof Error?e.message:String(e),keys:0});continue}
   const rows=sheets.flatMap(s=>s.rows||[]),keys=[...new Set(rows.map(keyFromRow).filter((k:string)=>/^\d{44}$/.test(k)&&k.slice(6,20)===dg(c.cnpj)))];
   results.push({competencia:comp,http:r.status,type:r.type,bytes:r.buf.length,sheets:sheets.map(s=>({sheet:s.sheet,rows:s.rows.length,columns:s.rows[0]?Object.keys(s.rows[0]).slice(0,30):[]})),keys:keys.length,access_keys:keys.slice(0,500)});
 }
 return J({ok:true,company_id:cid,period:{start,end},root_cnpj:root,note_api:noteApiResults,summary_http:summaryResp.status,summary_type:summaryResp.type,summary:Array.isArray(summary)?summary.slice(0,500):summary,results,total_keys:results.reduce((n,x)=>n+Number(x.keys||0),0)});
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});