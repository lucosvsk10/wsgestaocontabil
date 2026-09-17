import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const win=()=>{const n=new Date();return Date.UTC(n.getUTCFullYear(),n.getUTCMonth()-1,1)};
async function vk(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,iv:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(iv)},await vk(),B(c)))}

async function bridge(body:any){
  const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/nfe-event",{
    method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body),signal:AbortSignal.timeout(60000),
  });
  const raw=await r.text();let o:any={};try{o=JSON.parse(raw)}catch{o={raw:raw.slice(0,1200)}}
  return {ok:r.ok,status:r.status,payload:o};
}

Deno.serve(async req=>{
  try{
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
    if(req.headers.get("x-debug-token")!==String(t?.token||""))return J({error:"unauthorized"},403);
    const b=await req.json().catch(()=>({})) as any;
    const action=String(b.action||"event").toLowerCase();
    const cid=String(b.company_id||"");
    if(!cid)return J({error:"company_id_required"},400);

    const {data:c}=await admin.from("fiscal_companies").select("cnpj,status").eq("id",cid).maybeSingle();
    if(!c||c.status!=="ativa")return J({error:"company_not_active"},422);
    const cnpj=digits(c.cnpj);
    const {data:ce}=await admin.from("fiscal_certificates")
      .select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv")
      .eq("company_id",cid).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(!ce)return J({error:"certificate_missing"},422);
    const pfx=await dec(ce.certificate_ciphertext,ce.certificate_iv),pass=await dec(ce.password_ciphertext,ce.password_iv);

    if(action==="probe"){
      const out=await bridge({action:"probe",certificate_base64:pfx,certificate_password:pass});
      return J({ok:out.ok,transport:"vercel",probe:out.payload},out.ok?200:502);
    }
    if(action!=="event")return J({error:"invalid_action"},400);
    if(b.confirm!==true)return J({error:"explicit_confirmation_required",confirmation_required:true},409);

    const ak=digits(b.access_key);
    if(!/^\d{44}$/.test(ak))return J({error:"invalid_target"},400);
    const {data:rows}=await admin.from("fiscal_dfe_documents")
      .select("id,access_key,issue_date,direction,recipient_cnpj,issuer_cnpj,parse_error,full_xml")
      .eq("company_id",cid).eq("access_key",ak).order("full_xml",{ascending:false}).limit(20);
    const d=(rows||[]).find((x:any)=>x.full_xml)||(rows||[]).find((x:any)=>String(x.parse_error||'')==='xml_requires_manifestation')||(rows||[])[0];
    if(!d)return J({error:"document_not_found"},404);
    if(d.full_xml)return J({ok:true,already_complete:true});
    if(!Number.isFinite(Date.parse(d.issue_date||""))||Date.parse(d.issue_date||"")<win())return J({error:"outside_required_window"},422);
    const recipient=(rows||[]).some((x:any)=>x.direction==='entrada'&&digits(x.recipient_cnpj)===cnpj&&digits(x.issuer_cnpj)!==cnpj);
    if(!recipient)return J({error:"not_recipient_document"},422);
    const requires=(rows||[]).some((x:any)=>["xml_requires_manifestation","xml_retry:manifestation_sent"].includes(String(x.parse_error||"")));
    if(!requires)return J({error:"manifestation_not_required"},422);

    const out=await bridge({action:"event",certificate_base64:pfx,certificate_password:pass,access_key:ak,cnpj});
    if(!out.ok||!out.payload?.ok)return J({ok:false,error:"manifestation_rejected",bridge:out.payload},out.status||422);
    const now=new Date().toISOString();
    await admin.from("fiscal_dfe_documents").update({parse_error:"xml_retry:manifestation_sent",updated_at:now}).eq("company_id",cid).eq("access_key",ak).eq("full_xml",false);
    return J({ok:true,registered:true,transport:"vercel",cStat:out.payload.event_cStat||out.payload.cStat,xMotivo:out.payload.xMotivo,host:out.payload.host,http:out.payload.http});
  }catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}
});
