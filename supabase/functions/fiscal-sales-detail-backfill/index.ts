import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const tag=(xml:string,n:string)=>xml.match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`,`i`))?.[1]?.trim()||null;

async function count(admin:any,cid:string,latest:number,statuses:string[]){
  const {count,error}=await admin.from("fiscal_sales_reconciliation").select("*",{count:"exact",head:true}).eq("company_id",cid).eq("model","65").eq("series","1").lte("note_number",latest).in("detail_status",statuses);
  if(error)throw error;return Number(count||0);
}

Deno.serve(async req=>{try{
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const tok=req.headers.get("x-debug-token")||"";
  const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
  if(!tok||tok!==String(t?.token||""))return json({error:"unauthorized"},403);
  const b=await req.json().catch(()=>({})) as any;
  const batch=Math.min(100,Math.max(1,Number(b.batch||60))),only=String(b.company_id||"");
  let cq=admin.from("fiscal_companies").select("id,cnpj,razao_social,created_by,status,uf").eq("status","ativa").eq("uf","AL");
  if(only)cq=cq.eq("id",only);
  const {data:companies,error:ce}=await cq;if(ce)throw ce;
  const output:any[]=[];
  for(const company of companies||[]){
    const {data:state}=await admin.from("fiscal_sales_sync_state").select("latest_number,paused").eq("company_id",company.id).maybeSingle();
    if(state?.paused){output.push({company_id:company.id,paused:true});continue}
    const latest=Number(state?.latest_number||0);if(!latest){output.push({company_id:company.id,skipped:"latest_number_missing"});continue}
    const {data:rows,error:re}=await admin.from("fiscal_sales_reconciliation")
      .select("note_number,status,access_key,xmotivo,detail_attempts,xml_status,issue_date")
      .eq("company_id",company.id).eq("model","65").eq("series","1").lte("note_number",latest)
      .in("status",["found","cancelled"]).in("detail_status",["pending","retrying"])
      .order("note_number",{ascending:false}).limit(batch);
    if(re)throw re;
    let saved=0,waitingXml=0,failed=0;
    for(const row of rows||[]){const now=new Date().toISOString();try{
      const key=String(row.access_key||"");if(!/^\d{44}$/.test(key))throw new Error("access_key_missing");
      let xml:string|null=null;
      const {data:sdoc}=await admin.from("fiscal_sales_documents").select("id,xml,issue_date,total_value,status").eq("company_id",company.id).eq("access_key",key).maybeSingle();
      if(sdoc?.xml)xml=String(sdoc.xml);
      if(!xml){const {data:dfe}=await admin.from("fiscal_dfe_documents").select("xml").eq("company_id",company.id).eq("access_key",key).eq("full_xml",true).not("xml","is",null).order("updated_at",{ascending:false}).limit(1).maybeSingle();if(dfe?.xml)xml=String(dfe.xml)}
      if(!xml){waitingXml++;await admin.from("fiscal_sales_reconciliation").update({detail_status:"retrying",detail_attempts:Number(row.detail_attempts||0)+1,detail_last_error:"Aguardando XML integral via gateway Vercel",detail_last_checked_at:now,updated_at:now}).eq("company_id",company.id).eq("model","65").eq("series","1").eq("note_number",row.note_number);continue}
      const issue=tag(xml,"dhEmi")||tag(xml,"dEmi")||row.issue_date||null,totalText=tag(xml,"vNF"),total=totalText?Number(totalText):sdoc?.total_value??null,serie=tag(xml,"serie")||"1",nn=tag(xml,"nNF")||String(row.note_number),cStat=tag(xml,"cStat"),xMotivo=tag(xml,"xMotivo"),statusText=row.status==="cancelled"?(xMotivo||"Cancelada"):(xMotivo||sdoc?.status||row.xmotivo||"Autorizada");
      if(sdoc?.id){await admin.from("fiscal_sales_documents").update({document_number:nn,series:serie,issue_date:issue,status:statusText,total_value:total,updated_at:now}).eq("id",sdoc.id)}else{await admin.from("fiscal_sales_documents").insert({company_id:company.id,uf:"AL",model:"65",access_key:key,document_number:nn,series:serie,issue_date:issue,status:statusText,total_value:total,xml,source:"xml_detail_local",source_reference:{enumerated_number:row.note_number,detail_from_xml:true},updated_at:now})}
      await admin.from("fiscal_dfe_documents").update({company_id:company.id,direction:"saida",access_key:key,issue_date:issue,value:total,note_number:nn,series:serie,status_code:row.status==="cancelled"?"101":(cStat||"100"),status_text:statusText,updated_at:now}).eq("company_id",company.id).eq("access_key",key);
      await admin.from("fiscal_sales_reconciliation").update({issue_date:issue,detail_status:"saved",detail_attempts:Number(row.detail_attempts||0)+1,detail_last_error:null,detail_last_checked_at:now,updated_at:now}).eq("company_id",company.id).eq("model","65").eq("series","1").eq("note_number",row.note_number);
      saved++;
    }catch(e){failed++;await admin.from("fiscal_sales_reconciliation").update({detail_status:"retrying",detail_attempts:Number(row.detail_attempts||0)+1,detail_last_error:e instanceof Error?e.message:String(e),detail_last_checked_at:now,updated_at:now}).eq("company_id",company.id).eq("model","65").eq("series","1").eq("note_number",row.note_number)}}
    const expected=await count(admin,company.id,latest,["pending","retrying","saved"]),detailSaved=await count(admin,company.id,latest,["saved"]),detailPending=await count(admin,company.id,latest,["pending","retrying"]),complete=expected>0&&detailSaved===expected&&detailPending===0;
    await admin.from("fiscal_sales_sync_state").update({detail_expected:expected,detail_saved:detailSaved,detail_pending:detailPending,detail_complete:complete,updated_at:new Date().toISOString()}).eq("company_id",company.id);
    output.push({company_id:company.id,processed:(rows||[]).length,saved,waiting_xml:waitingXml,failed,detail_expected:expected,detail_saved:detailSaved,detail_pending:detailPending,detail_complete:complete,transport:"local_xml"});
  }
  return json({ok:true,companies:output,transport:"local_xml"});
}catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}});