import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json","cache-control":"no-store"}});
const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
async function K(){const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");if(!s)throw Error("vault_secret_missing");const h=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));return crypto.subtle.importKey("raw",h,{name:"AES-GCM"},false,["decrypt"])}
async function dec(c:string,i:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(i)},await K(),B(c)))}
function crtFor(regime:unknown){return String(regime||"").toLowerCase().includes("simples")?"1":"3"}
function keyInfo(v:unknown){const k=dg(v);if(k.length!==44)return null;return{key:k,issuer:k.slice(6,20),model:k.slice(20,22),series:Number(k.slice(22,25)),number:Number(k.slice(25,34)),month:"20"+k.slice(2,6)}}
async function gatewayObject(token:string,body:any){
  const r=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap",{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${token}`},body:JSON.stringify(body),signal:AbortSignal.timeout(70000)});
  const o=await r.json().catch(()=>({})) as any;
  if(!r.ok||!o?.ok)throw Error(`gateway_${r.status}:${String(o?.error||o?.xMotivo||"failed").slice(0,260)}`);
  return o;
}
async function gatewayText(token:string,body:any){
  const o=await gatewayObject(token,body);
  return String(o?.text||"");
}
const tag=(x:string,n:string)=>x.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,"i"))?.[1]?.trim()||"";

Deno.serve(async req=>{try{
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const supplied=req.headers.get("x-debug-token")||"";
  const [{data:t},{data:g}]=await Promise.all([
    admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle(),
    admin.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle(),
  ]);
  if(!supplied||supplied!==String(t?.token||""))return J({error:"unauthorized"},403);
  const gatewayToken=String(g?.token||"");if(!gatewayToken)throw Error("gateway_token_missing");
  const b=await req.json().catch(()=>({})) as any,companyId=String(b.company_id||"");
  if(!companyId)return J({error:"company_id_required"},400);
  const {data:c,error:ce}=await admin.from("fiscal_companies").select("id,cnpj,razao_social,nome_fantasia,inscricao_estadual,uf,codigo_municipio,municipio,regime_tributario,endereco,status,ambiente_padrao,created_by").eq("id",companyId).maybeSingle();
  if(ce)throw ce;if(!c||c.status!=="ativa"||String(c.uf||"").toUpperCase()!=="AL")return J({error:"company_not_active_al"},422);
  const {data:cert,error:cerror}=await admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv").eq("company_id",companyId).eq("is_active",true).order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(cerror)throw cerror;if(!cert)return J({error:"certificate_missing"},422);
  const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv);
  const parsed=lerCertificado(Buffer.from(pfx,"base64"),pass);
  const material={certificate_pem:parsed.certificadoPem,private_key_pem:parsed.chavePrivadaPem,chain_pem:parsed.cadeiaPem||[]};
  const cnpj=dg(c.cnpj);
  const {data:known,error:ke}=await admin.from("fiscal_sales_documents").select("access_key,series,document_number,issue_date").eq("company_id",companyId).eq("model","55").not("access_key","is",null).order("issue_date",{ascending:false,nullsFirst:false}).limit(100);
  if(ke)throw ke;
  const {data:events,error:ee}=await admin.from("fiscal_dfe_events").select("access_key,event_at").eq("company_id",companyId).not("access_key","is",null).order("event_at",{ascending:false}).limit(5000);
  if(ee)throw ee;
  const candidates=[...(known||[]).map((r:any)=>r.access_key),...(events||[]).map((r:any)=>r.access_key)].map(keyInfo).filter((i:any)=>i&&i.issuer===cnpj&&i.model==="55");
  const control=candidates.sort((a:any,b:any)=>b.number-a.number)[0];
  if(!control)return J({ok:false,reason:"control_key_missing",company_id:companyId},409);
  const probeBase={
    action:"al-nfe-recover-key",environment:"production",...material,
    issuer_cnpj:c.cnpj,issuer_ie:c.inscricao_estadual,issuer_name:c.razao_social,issuer_trade_name:c.nome_fantasia,
    issuer_city_code:c.codigo_municipio,issuer_city:c.municipio,issuer_street:c.endereco?.logradouro,issuer_number:c.endereco?.numero,
    issuer_district:c.endereco?.bairro,issuer_zip:c.endereco?.cep,crt:crtFor(c.regime_tributario)
  };
  const check=await gatewayObject(gatewayToken,{...probeBase,series:control.series,note_number:control.number});
  const controlOk=Boolean(check?.exists&&String(check?.cStat||"")==="539"&&dg(check?.access_key)===control.key);
  if(!controlOk)return J({ok:false,reason:"control_539_failed",company_id:companyId,control:{series:control.series,note_number:control.number},response:{cStat:check?.cStat||null,xMotivo:check?.xMotivo||null,access_key:check?.access_key||null}},409);

  const action=String(b.action||"probe");
  const series=Math.max(1,Number(b.series||control.series));
  const start=Math.max(1,Number(b.start_number||control.number));
  const count=Math.min(20,Math.max(1,Number(b.count||1)));
  const results:any[]=[];
  for(let n=start;n<start+count;n++){
    const r=await gatewayObject(gatewayToken,{...probeBase,series,note_number:n});
    if(r?.critical||String(r?.error||"").includes("unexpected_authorization"))throw Error("critical_probe_authorization");
    const out:any={series,note_number:n,exists:Boolean(r?.exists),cStat:String(r?.cStat||""),xMotivo:String(r?.xMotivo||"").slice(0,500),access_key:dg(r?.access_key)||null};
    if(r?.exists&&/^\d{44}$/.test(dg(r.access_key))){
      const info=keyInfo(r.access_key);
      if(!info||info.issuer!==cnpj||info.model!=="55"||info.series!==series||info.number!==n)throw Error("recovered_key_identity_mismatch");
      const text=await gatewayText(gatewayToken,{action:"nfe-consult",environment:"production",...material,access_key:r.access_key});
      const stats=[...text.matchAll(/<(?:\w+:)?cStat>(\d+)<\/(?:\w+:)?cStat>/g)].map(m=>m[1]);
      const motives=[...text.matchAll(/<(?:\w+:)?xMotivo>([\s\S]*?)<\/(?:\w+:)?xMotivo>/g)].map(m=>m[1].trim());
      const root=stats[0]||"",cancelled=stats.includes("101")||motives.some(m=>/cancelad/i.test(m));
      const issue=tag(text,"dhEmi")||null,status=cancelled?"Cancelada":(motives.find(m=>/autorizado/i.test(m))||motives[0]||"Autorizada"),now=new Date().toISOString();
      if(["100","101"].includes(root)||stats.includes("100")){
        await admin.from("fiscal_sales_documents").upsert({company_id:companyId,uf:"AL",model:"55",access_key:info.key,document_number:String(info.number),series:String(info.series),issue_date:issue,status,total_value:null,xml:null,source:"sefaz_al_nfe55_539_recovery",source_reference:{official:true,service:"SVRS_NFeAutorizacao4_recovery_539",recovery_cstat:r.cStat,xml_pending:true},updated_at:now},{onConflict:"company_id,access_key"});
        await admin.from("fiscal_dfe_documents").upsert({user_id:c.created_by,company_id:companyId,cnpj:c.cnpj,environment:"producao",uf_code:"27",nsu:`AL-NFE55-${info.key}`,schema_name:"retConsSitNFe_v4.00",document_kind:"nfe",direction:"saida",access_key:info.key,issue_date:issue,value:null,issuer_cnpj:c.cnpj,issuer_name:c.razao_social,note_number:String(info.number),series:String(info.series),status_code:cancelled?"101":"100",full_xml:false,xml:null,parse_error:"official_xml_pending",source:"sefaz_al_nfe55_539_recovery",source_id:info.key,model:"55",status_text:status,updated_at:now},{onConflict:"user_id,cnpj,environment,uf_code,nsu"});
        await admin.from("fiscal_sales_reconciliation").upsert({company_id:companyId,model:"55",series:String(info.series),note_number:info.number,status:cancelled?"cancelled":"found",access_key:info.key,issue_date:issue,cstat:cancelled?"101":"100",xmotivo:status,attempts:1,last_checked_at:now,resolved_at:now,updated_at:now,xml_status:"pending",xml_attempts:0,detail_status:"saved",detail_attempts:1,event_status:cancelled?"pending":"not_applicable",event_attempts:0},{onConflict:"company_id,model,series,note_number"});
        out.confirmed=true;out.status=status;out.issue_date=issue;
      }else{out.confirmed=false;out.consult_cstat=root||null;out.consult_xmotivo=motives[0]||null}
    }
    results.push(out);
    if(action==="probe")break;
    await new Promise(r=>setTimeout(r,250));
  }
  return J({ok:true,company_id:companyId,control:{series:control.series,note_number:control.number,access_key:control.key},control_539:true,results});
}catch(e){const msg=e instanceof Error?e.message:String(e);console.error("fiscal-sales-al-nfe55-recover",msg);return J({error:msg},500)}});