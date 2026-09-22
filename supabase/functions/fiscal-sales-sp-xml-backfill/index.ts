import "jsr:@supabase/functions-js@2.5.0/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(x:string,n:string)=>x.match(new RegExp("<(?:\\\\w+:)?"+n+"(?:\\\\s[^>]*)?>([\\\\s\\\\S]*?)<\\\\/(?:\\\\w+:)?"+n+">","i"))?.[1]?.trim()||"";
const de=(v:string)=>String(v||"").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,"\"").replace(/&amp;/g,"&");
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode("ws-fiscal-vault:"+s));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
async function gunzip(v:string){const b=Uint8Array.from(atob(v.replace(/\s/g,"")),c=>c.charCodeAt(0));return D.decode(await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).arrayBuffer())}

Deno.serve(async req=>{try{
  const a=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tok=req.headers.get("x-debug-token")||"";
  const [{data:t},{data:g}]=await Promise.all([
    a.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle(),
    a.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle()
  ]);
  if(!tok||tok!==String(t?.token||""))return J({error:"unauthorized"},403);
  const b=await req.json().catch(()=>({})) as any,companyId=String(b.company_id||""),batch=Math.min(30,Math.max(1,Number(b.batch||20)));
  const {data:c,error:ce}=await a.from("fiscal_companies").select("id,cnpj,razao_social,uf,ambiente_padrao,created_by,status").eq("id",companyId).single();
  if(ce||!c)throw Error("company_missing");if(c.status!=="ativa"||String(c.uf).toUpperCase()!=="SP")return J({ok:true,skipped:"company_not_sp"});
  const {data:cert,error:er}=await a.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv").eq("company_id",companyId).eq("is_active",true).order("created_at",{ascending:false}).limit(1).single();
  if(er||!cert)throw Error("certificate_missing");
  const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv),parsed=lerCertificado(Buffer.from(pfx,"base64"),pass),gatewayToken=String(g?.token||"");
  if(!gatewayToken)throw Error("gateway_token_missing");
  const {data:rows,error:re}=await a.from("fiscal_sales_documents").select("access_key,document_number,series,issue_date,status,xml").eq("company_id",companyId).eq("model","55").is("xml",null).order("issue_date",{ascending:false}).limit(batch);
  if(re)throw re;
  let saved=0,summaryOnly=0,failed=0;const failures:any[]=[];
  for(const row of rows||[]){const key=dg(row.access_key),now=new Date().toISOString();try{
    if(key.length!==44||key.slice(6,20)!==dg(c.cnpj)||key.slice(20,22)!=="55")throw Error("invalid_key");
    const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+gatewayToken},body:JSON.stringify({action:"nfe-distribution",environment:c.ambiente_padrao==="homologacao"?"homologation":"production",certificate_pem:parsed.certificadoPem,private_key_pem:parsed.chavePrivadaPem,chain_pem:parsed.cadeiaPem||[],cnpj:c.cnpj,uf_code:"35",access_key:key}),signal:AbortSignal.timeout(70000)});
    const o=await r.json().catch(()=>({})) as any;if(!r.ok||!o?.ok)throw Error("gateway_"+r.status+":"+String(o?.error||"failed"));
    const raw=de(String(o.text||"")),docs:any[]=[];const rx=/<docZip\b([^>]*)>([\s\S]*?)<\/docZip>/gi;let m;
    while((m=rx.exec(raw)))try{const xml=await gunzip(m[2]),sm=String(m[1]||"").match(/schema=["']([^"']+)["']/i),schema=sm?.[1]||"",access=tag(xml,"chNFe")||xml.match(/Id=["']NFe(\d{44})/i)?.[1]||"";if(access===key)docs.push({xml,schema,full:/(?:procNFe|nfeProc)/i.test(schema)||/<(?:\w+:)?NFe\b/i.test(xml)})}catch{}
    const full=docs.find(d=>d.full);if(!full){if(docs.length){summaryOnly++;failures.push({key,error:"summary_only",schemas:docs.map(d=>d.schema)});continue}throw Error("no_document:"+String(tag(raw,"cStat")||"")+":"+String(tag(raw,"xMotivo")||"")+":"+raw.slice(0,180).replace(/\s+/g," "))}
    const xml=String(full.xml),issue=tag(xml,"dhEmi")||tag(xml,"dEmi")||row.issue_date||null,totalText=tag(xml,"vNF"),total=totalText?Number(totalText):null,series=tag(xml,"serie")||row.series||String(Number(key.slice(22,25))),number=tag(xml,"nNF")||row.document_number||String(Number(key.slice(25,34))),dest=tag(xml,"dest")||"",recipient=dg(tag(dest,"CNPJ")||tag(dest,"CPF"))||null,status=tag(xml,"xMotivo")||row.status||"Autorizada";
    const {error:se}=await a.from("fiscal_sales_documents").update({document_number:number,series,issue_date:issue,status,total_value:total,recipient_document:recipient,xml,source:"sefaz_sp_nfe55_distribution_xml",source_reference:{service:"NFeDistribuicaoDFe_consChNFe",official:true,xml_pending:false},updated_at:now}).eq("company_id",companyId).eq("access_key",key);if(se)throw se;
    const {data:du,error:de}=await a.from("fiscal_dfe_documents").update({schema_name:full.schema||"procNFe_v4.00",document_kind:"nfe",direction:"saida",issue_date:issue,value:total,recipient_cnpj:recipient,note_number:number,series,status_code:"100",full_xml:true,xml,source:"sefaz_sp_nfe55_distribution_xml",source_id:key,model:"55",status_text:status,parse_error:null,updated_at:now}).eq("company_id",companyId).eq("access_key",key).select("id");if(de)throw de;
    if(!du?.length){const {error:ie}=await a.from("fiscal_dfe_documents").upsert({user_id:c.created_by,company_id:companyId,cnpj:c.cnpj,environment:c.ambiente_padrao==="homologacao"?"homologacao":"producao",uf_code:"35",nsu:"SP-NFE55-"+key,schema_name:full.schema||"procNFe_v4.00",document_kind:"nfe",direction:"saida",access_key:key,issue_date:issue,value:total,issuer_cnpj:c.cnpj,issuer_name:c.razao_social,recipient_cnpj:recipient,note_number:number,series,status_code:"100",full_xml:true,xml,source:"sefaz_sp_nfe55_distribution_xml",source_id:key,model:"55",status_text:status,updated_at:now},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});if(ie)throw ie}
    await a.from("fiscal_sales_reconciliation").update({xml_status:"saved",xml_attempts:1,xml_last_error:null,xml_last_checked_at:now,detail_status:"saved",detail_attempts:1,detail_last_error:null,detail_last_checked_at:now,issue_date:issue,updated_at:now}).eq("company_id",companyId).eq("access_key",key);
    saved++;
  }catch(e){failed++;const msg=e instanceof Error?e.message:String(e);failures.push({key,error:msg});await a.from("fiscal_sales_reconciliation").update({xml_status:"retrying",xml_attempts:1,xml_last_error:msg,xml_last_checked_at:now,updated_at:now}).eq("company_id",companyId).eq("access_key",key)}}
  return J({ok:true,company_id:companyId,processed:(rows||[]).length,saved,summary_only:summaryOnly,failed,failures:failures.slice(0,12)});
}catch(e){return J({error:e instanceof Error?e.message:String(e)},500)}});