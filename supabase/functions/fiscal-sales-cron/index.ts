import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
const json=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{"content-type":"application/json"}});

Deno.serve(async req=>{try{
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const tok=req.headers.get("x-debug-token")||"";const {data:t}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();if(!tok||tok!==String(t?.token||""))return json({error:"unauthorized"},403);
 const now=new Date(),next=new Date(now.getTime()+3*60*60*1000),base=Deno.env.get("SUPABASE_URL")!,h={"content-type":"application/json","x-debug-token":String(t.token)};
 const {data:companies,error}=await admin.from("fiscal_companies").select("id,status,uf,fiscal_settings").eq("status","ativa").eq("uf","AL");if(error)throw error;const out:any[]=[];
 for(const c of companies||[]){try{
   const {data:state}=await admin.from("fiscal_sales_sync_state").select("*").eq("company_id",c.id).maybeSingle();
   if(state?.paused===true||c?.fiscal_settings?.sales_sync_paused===true){out.push({company_id:c.id,status:"paused"});continue}
   const [{data:cert},{data:cred}]=await Promise.all([admin.from("fiscal_certificates").select("id").eq("company_id",c.id).eq("is_active",true).limit(1).maybeSingle(),admin.from("fiscal_state_credentials").select("id").eq("company_id",c.id).eq("uf","AL").eq("is_active",true).limit(1).maybeSingle()]);
   if(!cert||!cred){const waiting=!cert?"waiting_certificate":"waiting_state_credentials";await admin.from("fiscal_sales_sync_state").upsert({company_id:c.id,status:waiting,last_error:null,next_scheduled_at:next.toISOString(),updated_at:now.toISOString()});out.push({company_id:c.id,status:waiting});continue}
   await admin.from("fiscal_sales_sync_state").upsert({company_id:c.id,status:"running",last_started_at:now.toISOString(),last_error:null,next_scheduled_at:next.toISOString(),updated_at:now.toISOString()});

   const {data:maxRows}=await admin.from("fiscal_sales_documents").select("document_number").eq("company_id",c.id).order("document_number",{ascending:false}).limit(2000);const maxSaved=Math.max(0,...(maxRows||[]).map((x:any)=>Number(x.document_number)||0));
   const oldLatest=Number(state?.latest_number||0),baseLatest=Math.max(oldLatest,maxSaved);
   let discovered=baseLatest,discovery:any=null;
   if(baseLatest>0){
     try{
       const dr=await fetch(`${base}/functions/v1/fiscal-sales-discover-latest`,{method:"POST",headers:h,body:JSON.stringify({company_id:c.id,base_number:baseLatest,lookahead:12}),signal:AbortSignal.timeout(60000)});
       discovery=await dr.json().catch(()=>({}));
       if(dr.ok&&!discovery?.cooldown)discovered=Math.max(discovered,Number(discovery?.latest||0));
     }catch(e){discovery={error:e instanceof Error?e.message:String(e)}}
   }
   const latest=Math.max(baseLatest,discovered);if(!latest)throw new Error("Último número fiscal não identificado");
   await admin.from("fiscal_sales_sync_state").upsert({company_id:c.id,status:"reconciling",latest_number:latest,cursor_number:latest,reconciliation_total:latest,reconciliation_started_at:state?.reconciliation_started_at||now.toISOString(),next_scheduled_at:next.toISOString(),last_error:null,updated_at:new Date().toISOString()});
   const rr=await fetch(`${base}/functions/v1/fiscal-sales-reconcile`,{method:"POST",headers:h,body:JSON.stringify({company_id:c.id,batch:24}),signal:AbortSignal.timeout(115000)});const rd=await rr.json().catch(()=>({}));if(!rr.ok)throw new Error(rd?.error||"Falha na reconciliação");
   let classification:any=null;try{const cr=await fetch(`${base}/functions/v1/fiscal-sales-classify-gaps`,{method:"POST",headers:h,body:JSON.stringify({company_id:c.id}),signal:AbortSignal.timeout(60000)});classification=await cr.json().catch(()=>({}));if(!cr.ok)classification={error:classification?.error||"Falha ao classificar lacunas"}}catch(e){classification={error:e instanceof Error?e.message:String(e)}}
   await admin.from("fiscal_companies").update({last_sync_at:new Date().toISOString()}).eq("id",c.id);
   out.push({company_id:c.id,status:"ok",latest,previous_latest:oldLatest,discovery,reconciliation:rd,classification});
 }catch(e){const msg=e instanceof Error?e.message:String(e);await admin.from("fiscal_sales_sync_state").upsert({company_id:c.id,status:"error",last_error:msg,next_scheduled_at:next.toISOString(),updated_at:new Date().toISOString()});out.push({company_id:c.id,status:"error",error:msg})}}
 return json({ok:true,ran_at:now.toISOString(),companies:out});
}catch(e){return json({error:e instanceof Error?e.message:String(e)},500)}});
