import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const E=new TextEncoder(),D=new TextDecoder(),B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
const sleep=(ms:number)=>new Promise(r=>setTimeout(r,ms));

async function K(){
  const s=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!s)throw new Error("secret_missing");
  const d=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${s}`));
  return crypto.subtle.importKey("raw",d,{name:"AES-GCM"},false,["decrypt"]);
}
async function dec(c:string,iv:string){return D.decode(await crypto.subtle.decrypt({name:"AES-GCM",iv:B(iv)},await K(),B(c)))}
function tag(xml:string,name:string){const m=xml.match(new RegExp(`<${name}>([\\s\\S]*?)<\\/${name}>`));return m?m[1]:null}

async function download(pfx:string,pass:string,key:string){
  const r=await fetch("https://ws-svrs-consit.vercel.app/api/download",{
    method:"POST",
    headers:{"content-type":"application/json"},
    body:JSON.stringify({certificate_base64:pfx,certificate_password:pass,access_key:key}),
    signal:AbortSignal.timeout(25000)
  });
  if(!r.ok)throw new Error(`bridge_http_${r.status}`);
  const o=await r.json().catch(()=>({}));
  const html=String(o?.body_text||"");
  let m=html.match(/var\s+stringJson\s*=\s*(\{[\s\S]*?\})\s*;/);
  if(!m){
    const body=String(o?.body||"");
    m=body.match(/var\s+stringJson\s*=\s*(\{[\s\S]*?\})\s*;/);
  }
  if(!m)throw new Error("xml_payload_not_found");
  let data:any;
  try{data=JSON.parse(m[1])}catch{throw new Error("xml_payload_invalid_json")}
  const xml=String(data?.xml||"");
  if(!/<(?:nfeProc|procNFe|NFe)\b/i.test(xml)||xml.length<1000)throw new Error("xml_not_returned");
  return xml;
}

async function exactCount(admin:any,cid:string,latest:number,statuses:string[]){
  const {count,error}=await admin.from("fiscal_sales_reconciliation").select("*",{count:"exact",head:true}).eq("company_id",cid).eq("model","65").eq("series","1").lte("note_number",latest).in("xml_status",statuses);
  if(error)throw error;
  return Number(count||0);
}

Deno.serve(async req=>{
  try{
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const tok=req.headers.get("x-debug-token")||"";
    const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
    if(!tok||tok!==String(t?.token||""))return json({error:"unauthorized"},403);

    const b=await req.json().catch(()=>({})) as any;
    const batch=Math.min(12,Math.max(1,Number(b.batch||10)));
    const {data:companies,error:ce}=await admin.from("fiscal_companies").select("id,cnpj,razao_social,created_by,status,uf").eq("status","ativa").eq("uf","AL");
    if(ce)throw ce;
    const out:any[]=[];

    for(const company of companies||[]){
      const {data:state}=await admin.from("fiscal_sales_sync_state").select("latest_number,paused").eq("company_id",company.id).maybeSingle();
      if(state?.paused){out.push({company_id:company.id,paused:true});continue}
      const latest=Number(state?.latest_number||0);
      if(!latest){out.push({company_id:company.id,skipped:"latest_number_missing"});continue}

      const {data:claimed,error:claimError}=await admin.rpc("claim_fiscal_sales_worker_lease",{p_company_id:company.id,p_worker:"xml",p_seconds:110});
      if(claimError)throw claimError;
      if(!claimed){out.push({company_id:company.id,locked:true});continue}

      try{
        const {data:cert,error:cerror}=await admin.from("fiscal_certificates").select("certificate_ciphertext,certificate_iv,password_ciphertext,password_iv").eq("company_id",company.id).eq("is_active",true).order("created_at",{ascending:false}).limit(1).single();
        if(cerror||!cert){out.push({company_id:company.id,error:"certificate_missing"});continue}
        const pfx=await dec(cert.certificate_ciphertext,cert.certificate_iv),pass=await dec(cert.password_ciphertext,cert.password_iv);

        const {data:rows,error:re}=await admin.from("fiscal_sales_reconciliation")
          .select("note_number,status,access_key,xmotivo,xml_attempts")
          .eq("company_id",company.id).eq("model","65").eq("series","1").lte("note_number",latest)
          .in("status",["found","cancelled"]).in("xml_status",["pending","retrying"])
          .order("xml_attempts",{ascending:true}).order("note_number",{ascending:false}).limit(batch);
        if(re)throw re;

        let saved=0,failed=0;
        for(const row of rows||[]){
          const now=new Date().toISOString();
          try{
            const key=String(row.access_key||"");
            if(!/^\d{44}$/.test(key))throw new Error("access_key_missing");
            const xml=await download(pfx,pass,key);
            const issue=tag(xml,"dhEmi"),total=tag(xml,"vNF"),serie=tag(xml,"serie")||"1",nnf=tag(xml,"nNF")||String(row.note_number);

            await admin.from("fiscal_sales_documents").upsert({
              company_id:company.id,uf:"AL",model:"65",access_key:key,document_number:nnf,series:serie,issue_date:issue||null,
              status:row.xmotivo||row.status,total_value:total?Number(total):null,xml,source:"xml_backfill_svrs",
              source_reference:{enumerated_number:row.note_number,backfill:true},updated_at:now
            },{onConflict:"company_id,access_key"});

            await admin.from("fiscal_dfe_documents").upsert({
              user_id:company.created_by,company_id:company.id,cnpj:company.cnpj,environment:"producao",uf_code:"27",nsu:`SAIDA-${key}`,
              schema_name:"procNFe_v4.00",document_kind:"nfe",direction:"saida",access_key:key,issue_date:issue||null,value:total?Number(total):null,
              issuer_cnpj:company.cnpj,issuer_name:company.razao_social,note_number:nnf,series:serie,status_code:row.status==="cancelled"?"101":"100",
              full_xml:true,xml,source:"xml_backfill_svrs",source_id:key,model:"65",status_text:row.xmotivo||row.status,updated_at:now
            },{onConflict:"user_id,cnpj,environment,uf_code,nsu"});

            await admin.from("fiscal_sales_reconciliation").update({xml_status:"saved",xml_attempts:Number(row.xml_attempts||0)+1,xml_last_error:null,xml_last_checked_at:now,updated_at:now})
              .eq("company_id",company.id).eq("model","65").eq("series","1").eq("note_number",row.note_number);
            saved++;
          }catch(e){
            failed++;
            const attempts=Number(row.xml_attempts||0)+1;
            await admin.from("fiscal_sales_reconciliation").update({xml_status:"retrying",xml_attempts:attempts,xml_last_error:e instanceof Error?e.message:String(e),xml_last_checked_at:now,updated_at:now})
              .eq("company_id",company.id).eq("model","65").eq("series","1").eq("note_number",row.note_number);
          }
          await sleep(350);
        }

        const expected=await exactCount(admin,company.id,latest,["pending","retrying","saved"]);
        const xmlSaved=await exactCount(admin,company.id,latest,["saved"]);
        const xmlPending=await exactCount(admin,company.id,latest,["pending","retrying"]);
        const complete=expected>0&&xmlSaved===expected&&xmlPending===0;
        await admin.from("fiscal_sales_sync_state").update({xml_expected:expected,xml_saved:xmlSaved,xml_pending:xmlPending,xml_failed:0,xml_complete:complete,updated_at:new Date().toISOString()}).eq("company_id",company.id);
        out.push({company_id:company.id,processed:(rows||[]).length,saved,failed,xml_expected:expected,xml_saved:xmlSaved,xml_pending:xmlPending,xml_failed:0,xml_complete:complete});
      }finally{
        await admin.rpc("release_fiscal_sales_worker_lease",{p_company_id:company.id,p_worker:"xml"}).catch(()=>{});
      }
    }
    return json({ok:true,companies:out});
  }catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}
});
