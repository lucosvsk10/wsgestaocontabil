import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw new Error("secret_missing");const d=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",d,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,iv:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(iv)},await K(),B(c)))}
const tag=(xml:string,n:string)=>xml.match(new RegExp(`<${n}>([\\s\\S]*?)<\\/${n}>`))?.[1]||null;

async function cons(pfx:string,pass:string,key:string){
  const payload=`<consSitNFe versao="4.00" xmlns="http://www.portalfiscal.inf.br/nfe"><tpAmb>1</tpAmb><xServ>CONSULTAR</xServ><chNFe>${key}</chNFe></consSitNFe>`;
  const soap=`<?xml version="1.0" encoding="utf-8"?><soap12:Envelope xmlns:soap12="http://www.w3.org/2003/05/soap-envelope"><soap12:Body><nfeDadosMsg xmlns="http://www.portalfiscal.inf.br/nfe/wsdl/NFeConsultaProtocolo4">${payload}</nfeDadosMsg></soap12:Body></soap12:Envelope>`;
  const r=await fetch("https://ws-svrs-consit.vercel.app/api/consit",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({certificate_base64:pfx,certificate_password:pass,soap_body:soap}),signal:AbortSignal.timeout(25000)});
  if(!r.ok)throw new Error(`consit_http_${r.status}`);
  const o=await r.json().catch(()=>({}));const body=String(o?.body||"");if(!body)throw new Error("consit_empty");return body;
}

Deno.serve(async req=>{try{
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);const tok=req.headers.get("x-debug-token")||"";const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();if(!tok||tok!==String(t?.token||""))return json({error:"unauthorized"},403);
  const b=await req.json().catch(()=>({})) as any;const batch=Math.min(5,Math.max(1,Number(b.batch||3)));const {data:companies,error:ce}=await admin.from("fiscal_companies").select("id,cnpj,created_by,status,uf").eq("status","ativa").eq("uf","AL");if(ce)throw ce;const out:any[]=[];
  for(const company of companies||[]){
    const {data:cert,error:cerror}=await admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv").eq("company_id",company.id).eq("is_active",true).order("created_at",{ascending:false}).limit(1).single();if(cerror||!cert){out.push({company_id:company.id,error:"certificate_missing"});continue}
    const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv);
    const {data:rows,error:re}=await admin.from("fiscal_sales_reconciliation").select("note_number,access_key,event_attempts").eq("company_id",company.id).eq("model","65").eq("series","1").eq("status","cancelled").in("event_status",["pending","retrying"]).order("event_attempts",{ascending:true}).order("note_number",{ascending:false}).limit(batch);if(re)throw re;
    let saved=0,failed=0;
    for(const row of rows||[]){const now=new Date().toISOString();try{const key=String(row.access_key||"");if(!/^\d{44}$/.test(key))throw new Error("access_key_missing");const xml=await cons(pfx,pass,key);const cStat=tag(xml,"cStat")||"101",xMotivo=tag(xml,"xMotivo")||"Cancelamento homologado",eventAt=tag(xml,"dhRegEvento")||tag(xml,"dhEvento")||null;
      await admin.from("fiscal_dfe_events").upsert({user_id:company.created_by,company_id:company.id,cnpj:company.cnpj,environment:"producao",uf_code:"27",nsu:`CANCEL-${key}`,schema_name:"retConsSitNFe_v4.00",access_key:key,event_type:"110111",event_description:xMotivo,status_code:cStat,event_at:eventAt,xml,source:"svrs_consit",updated_at:now},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});
      await admin.from("fiscal_sales_reconciliation").update({event_status:"saved",event_attempts:Number(row.event_attempts||0)+1,event_last_error:null,event_last_checked_at:now,updated_at:now}).eq("company_id",company.id).eq("model","65").eq("series","1").eq("note_number",row.note_number);saved++;
    }catch(e){failed++;await admin.from("fiscal_sales_reconciliation").update({event_status:"retrying",event_attempts:Number(row.event_attempts||0)+1,event_last_error:e instanceof Error?e.message:String(e),event_last_checked_at:now,updated_at:now}).eq("company_id",company.id).eq("model","65").eq("series","1").eq("note_number",row.note_number)}await sleep(1000)}
    out.push({company_id:company.id,processed:(rows||[]).length,saved,failed});
  }
  return json({ok:true,companies:out});
}catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}});
