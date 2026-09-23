import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,"i"))?.[1]?.trim()||"";
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

Deno.serve(async req=>{
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  try{
    const [{data:t},{data:g}]=await Promise.all([
      admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle(),
      admin.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle(),
    ]);
    if(!t?.token||req.headers.get("x-debug-token")!==String(t.token))return J({error:"unauthorized"},403);
    const gatewayToken=String(g?.token||"");if(!gatewayToken)return J({error:"gateway_token_missing"},500);
    const body=await req.json().catch(()=>({})) as any;
    const companyId=String(body.company_id||"");
    const keys=[...new Set((Array.isArray(body.access_keys)?body.access_keys:[body.access_key]).map(dg).filter((k:string)=>/^\d{44}$/.test(k)&&k.slice(20,22)==="55"))].slice(0,20);
    if(!companyId||!keys.length)return J({error:"company_and_keys_required"},400);

    const {data:c,error:ce}=await admin.from("fiscal_companies").select("id,cnpj,ambiente_padrao,status").eq("id",companyId).maybeSingle();
    if(ce)throw ce;if(!c||c.status!=="ativa")return J({error:"company_not_active"},422);
    const cnpj=dg(c.cnpj);
    const invalid=keys.filter((k:string)=>k.slice(6,20)!==cnpj);
    if(invalid.length)return J({error:"issuer_key_mismatch",keys:invalid},422);
    const {data:cert,error:certError}=await admin.from("fiscal_certificates")
      .select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv")
      .eq("company_id",companyId).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
    if(certError)throw certError;if(!cert)return J({error:"certificate_missing"},422);
    const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv);
    const parsed=lerCertificado(Buffer.from(pfx,"base64"),pass);
    const material={certificate_pem:parsed.certificadoPem,private_key_pem:parsed.chavePrivadaPem,chain_pem:parsed.cadeiaPem||[]};
    const environment=c.ambiente_padrao==="homologacao"?"homologation":"production";
    const out:any[]=[];

    for(const key of keys){
      const now=new Date().toISOString();
      try{
        const response=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{
          method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${gatewayToken}`},
          body:JSON.stringify({action:"nfe-consult",environment,...material,access_key:key}),
          signal:AbortSignal.timeout(65000)
        });
        const payload=await response.json().catch(()=>({})) as any;
        if(!response.ok||!payload?.ok||!payload?.text)throw Error(`gateway_${response.status}:${String(payload?.error||"consult_failed").slice(0,220)}`);
        const xml=String(payload.text||"");
        const cStats=[...xml.matchAll(/<(?:\w+:)?cStat>(\d+)<\/(?:\w+:)?cStat>/g)].map(m=>m[1]);
        const motives=[...xml.matchAll(/<(?:\w+:)?xMotivo>([\s\S]*?)<\/(?:\w+:)?xMotivo>/g)].map(m=>m[1].trim());
        const primary=cStats[0]||"";
        const exists=["100","101","110","301","302"].includes(primary)&&xml.includes(key);
        const cancelled=exists&&(/<(?:\w+:)?tpEvento>110111<\/(?:\w+:)?tpEvento>/i.test(xml)||motives.some(m=>/cancelad/i.test(m)));
        const status=cancelled?"Cancelada":(motives[0]||"Autorizada");
        if(exists){
          const {data:salesDoc}=await admin.from("fiscal_sales_documents").select("source_reference").eq("company_id",companyId).eq("access_key",key).maybeSingle();
          const prior=(salesDoc?.source_reference&&typeof salesDoc.source_reference==="object")?salesDoc.source_reference:{};
          await admin.from("fiscal_sales_documents").update({
            status,source_reference:{...prior,direct_consult_confirmed:true,direct_consult_cstat:primary,direct_consult_xmotivo:motives[0]||null,direct_consult_checked_at:now,official:true},updated_at:now
          }).eq("company_id",companyId).eq("access_key",key);
          await admin.from("fiscal_dfe_documents").update({
            status_code:cancelled?"101":(primary||"100"),status_text:status,updated_at:now
          }).eq("company_id",companyId).eq("access_key",key);
          await admin.from("fiscal_sales_reconciliation").update({
            status:cancelled?"cancelled":"found",cstat:cancelled?"101":(primary||"100"),xmotivo:status,last_checked_at:now,resolved_at:now,updated_at:now
          }).eq("company_id",companyId).eq("model","55").eq("access_key",key);
        }
        out.push({access_key:key,confirmed:exists,cStat:primary||null,xMotivo:motives[0]||null,cancelled});
      }catch(error){
        out.push({access_key:key,confirmed:false,error:error instanceof Error?error.message:String(error)});
      }
      await sleep(300);
    }
    return J({ok:true,company_id:companyId,results:out,confirmed:out.filter(x=>x.confirmed).length});
  }catch(error){
    return J({error:error instanceof Error?error.message:String(error)},500);
  }
});
