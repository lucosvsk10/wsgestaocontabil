import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const recoveryWindowStart=()=>{const n=new Date();return new Date(Date.UTC(n.getUTCFullYear(),n.getUTCMonth()-1,1,0,0,0,0)).toISOString()};

async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("secret_missing");const d=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",d,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,iv:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(iv)},await K(),B(c)))}
const tag=(xml:string,n:string)=>xml.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`i`))?.[1]?.trim()||"";
function decodeEntities(v:string){return v.replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&amp;/g,"&")}
function validXml(v:string){const xml=decodeEntities(String(v||"")).trim();return /<(?:\w+:)?(?:nfeProc|procNFe|NFe)\b/i.test(xml)&&xml.length>1000?xml:""}
function parseDownloadHtml(all:string){
 const direct=validXml(all);if(direct)return direct;
 if(/manifesta[cç][aã]o[^<]*(?:necess[aá]ria|obrigat[oó]ria|destinat[aá]rio)|ci[eê]ncia da opera[cç][aã]o/i.test(all))throw Error("manifestation_required");
 if(/CNPJ base do certificado digital[^<]*difere/i.test(all)||/certificado digital[^<]*(?:não|nao)[^<]*(?:participa|envolvido|destinat)/i.test(all))throw Error("certificate_not_involved");
 const candidates:string[]=[];
 const m=all.match(/var\s+stringJson\s*=\s*(\{[\s\S]*?\})\s*;/);if(m?.[1])candidates.push(m[1]);
 const script=all.match(/stringJson\s*[=:]\s*['"]([\s\S]*?)['"]\s*[;,]/i);if(script?.[1])candidates.push(script[1].replace(/\\"/g,'"').replace(/\\n/g,""));
 candidates.push(all.trim());
 for(const raw of candidates){try{const data=JSON.parse(raw);for(const value of [data?.xml,data?.Xml,data?.XML,data?.conteudoXml,data?.documentoXml,data?.body,data?.body_text]){const xml=validXml(String(value||""));if(xml)return xml}}catch{}}
 const embedded=all.match(/(?:"xml"|"Xml"|"XML"|"conteudoXml")\s*:\s*"((?:\\.|[^"\\])*)"/i);if(embedded?.[1]){try{const xml=validXml(JSON.parse(`"${embedded[1]}"`));if(xml)return xml}catch{}}
 throw Error("xml_payload_not_found")
}
async function downloadBridge(pfx:string,pass:string,key:string){
 const r=await fetch("https://ws-svrs-consit.vercel.app/api/download",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({certificate_base64:pfx,certificate_password:pass,access_key:key,model:"55",document_type:"nfe",sistema:"Nfe"}),signal:AbortSignal.timeout(45000)});
 const raw=await r.text();let o:any={};try{o=JSON.parse(raw)}catch{o={body_text:raw}};
 if(!r.ok)throw Error(`bridge_http_${r.status}:${String(o?.error||o?.message||"").slice(0,120)}`);
 for(const value of [o?.xml,o?.body_text,o?.body,o?.data?.xml]){if(value){try{return parseDownloadHtml(String(value))}catch(e){const code=e instanceof Error?e.message:String(e);if(code==="certificate_not_involved"||code==="manifestation_required")throw e}}}
 return parseDownloadHtml(JSON.stringify(o));
}
async function download(pfx:string,pass:string,key:string){let last="xml_download_failed";for(let attempt=0;attempt<2;attempt++){try{return await downloadBridge(pfx,pass,key)}catch(e){last=e instanceof Error?e.message:String(e);if(last==="certificate_not_involved"||last==="manifestation_required")throw Error(last);if(attempt<1)await sleep(1400)}}throw Error(last)}

Deno.serve(async req=>{try{
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
 if(!t?.token||req.headers.get("x-debug-token")!==String(t.token))return J({error:"unauthorized"},403);
 const body=await req.json().catch(()=>({})) as any;
 const only=String(body.company_id||""),targetKey=digits(body.access_key),batch=Math.min(8,Math.max(1,Number(body.batch||2))),cutoff=recoveryWindowStart(),retryBefore=new Date(Date.now()-10*60000).toISOString();
 let cq=admin.from("fiscal_companies").select("id,cnpj,created_by,status").eq("status","ativa");if(only)cq=cq.eq("id",only);
 const {data:companies,error:ce}=await cq;if(ce)throw ce;const out:any[]=[];
 for(const c of companies||[]){
  const {data:cert}=await admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv").eq("company_id",c.id).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(!cert){out.push({company_id:c.id,error:"certificate_missing"});continue}
  const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv),companyCnpj=digits(c.cnpj);let rows:any[]=[];const seen=new Set<string>();
  const addRows=(items:any[])=>{for(const row of items||[]){const key=digits(row.access_key);if(!/^\d{44}$/.test(key)||seen.has(key))continue;seen.add(key);rows.push(row);if(rows.length>=batch)break}};
  const cols="id,access_key,source,note_number,series,status_code,status_text,issue_date,updated_at,parse_error,direction,issuer_cnpj,recipient_cnpj";
  if(targetKey){const {data,error}=await admin.from("fiscal_dfe_documents").select(cols).eq("company_id",c.id).eq("model","55").eq("access_key",targetKey).eq("full_xml",false).gte("issue_date",cutoff).limit(1);if(error)throw error;addRows(data||[])}
  else{
   const {data:fresh,error:freshError}=await admin.from("fiscal_dfe_documents").select(cols).eq("company_id",c.id).eq("direction","entrada").eq("model","55").eq("full_xml",false).not("access_key","is",null).gte("issue_date",cutoff).or("parse_error.is.null,parse_error.eq.metadata_from_sefaz_al_entry_report").order("issue_date",{ascending:false}).order("note_number",{ascending:false}).limit(Math.max(batch*4,batch));if(freshError)throw freshError;addRows(fresh||[]);
   if(rows.length<batch){const {data:retry,error:retryError}=await admin.from("fiscal_dfe_documents").select(cols).eq("company_id",c.id).eq("direction","entrada").eq("model","55").eq("full_xml",false).not("access_key","is",null).gte("issue_date",cutoff).like("parse_error","xml_retry:%").lt("updated_at",retryBefore).order("updated_at",{ascending:true}).order("issue_date",{ascending:false}).limit(Math.max(batch*3,batch-rows.length));if(retryError)throw retryError;addRows(retry||[])}
  }
  let saved=0,failed=0,blocked=0;
  for(const row of rows.slice(0,batch)){const key=digits(row.access_key),now=new Date().toISOString();try{
   if(!/^\d{44}$/.test(key))throw Error("invalid_key");const xml=await download(pfx,pass,key);const issue=tag(xml,"dhEmi")||tag(xml,"dEmi")||null,total=Number(tag(xml,"vNF")||0),emit=tag(xml,"emit"),dest=tag(xml,"dest"),issuer=digits(tag(emit,"CNPJ")||tag(emit,"CPF")),issuerName=tag(emit,"xNome"),recipient=digits(tag(dest,"CNPJ")||tag(dest,"CPF")),nn=tag(xml,"nNF")||row.note_number,serie=tag(xml,"serie")||row.series,direction=issuer===companyCnpj?"saida":recipient===companyCnpj?"entrada":"relacionada";
   const patch:any={full_xml:true,xml,document_kind:"nfe",schema_name:"procNFe_v4.00",source:"xml_backfill_vercel_svrs_nfe",source_id:key,parse_error:null,direction,updated_at:now};if(issue)patch.issue_date=issue;if(total)patch.value=total;if(issuer)patch.issuer_cnpj=issuer;if(issuerName)patch.issuer_name=issuerName;if(recipient)patch.recipient_cnpj=recipient;if(nn)patch.note_number=nn;if(serie)patch.series=serie;
   const {error}=await admin.from("fiscal_dfe_documents").update(patch).eq("company_id",c.id).eq("access_key",key).eq("full_xml",false);if(error)throw error;saved++
  }catch(e){const msg=e instanceof Error?e.message:String(e),isRecipient=digits(row.recipient_cnpj)===companyCnpj&&digits(row.issuer_cnpj)!==companyCnpj,needsManifest=msg==="manifestation_required"||(msg==="certificate_not_involved"&&isRecipient),marker=needsManifest?"xml_requires_manifestation":`xml_retry:${msg}`;if(needsManifest)blocked++;else failed++;await admin.from("fiscal_dfe_documents").update({parse_error:marker,updated_at:now}).eq("company_id",c.id).eq("access_key",key).eq("full_xml",false)}await sleep(350)
  }
  out.push({company_id:c.id,processed:rows.length,saved,failed,blocked,targeted:Boolean(targetKey),cutoff,transport:"vercel"})
 }
 return J({ok:true,companies:out,cutoff,transport:"vercel"})
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});