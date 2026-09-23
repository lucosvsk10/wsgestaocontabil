import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";
const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode("ws-fiscal-vault:"+s));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
Deno.serve(async req=>{try{
 const a=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const tok=req.headers.get("x-debug-token")||"";
 const [{data:t},{data:g}]=await Promise.all([
  a.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle(),
  a.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle()
 ]);
 if(!tok||tok!==String(t?.token||""))return J({error:"unauthorized"},403);
 const b=await req.json().catch(()=>({})) as any,cid=String(b.company_id||"");
 const {data:cert,error}=await a.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv").eq("company_id",cid).eq("is_active",true).order("created_at",{ascending:false}).limit(1).single();
 if(error||!cert)return J({error:"certificate_missing"},422);
 const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv),parsed=lerCertificado(Buffer.from(pfx,"base64"),pass);
 const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+String(g?.token||"")},body:JSON.stringify({action:"sp-nfe-portal-probe",environment:"production",certificate_pem:parsed.certificadoPem,private_key_pem:parsed.chavePrivadaPem,chain_pem:parsed.cadeiaPem||[]}),signal:AbortSignal.timeout(70000)});
 const out=await r.json().catch(()=>({}));return J(out,r.status);
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});