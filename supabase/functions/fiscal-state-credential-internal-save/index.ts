import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{"content-type":"application/json","cache-control":"no-store"}});
const E=new TextEncoder(),D=new TextDecoder();
const B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");

async function vaultKey(){
  const secret=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!secret)throw new Error("vault_secret_missing");
  const digest=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt"]);
}
async function encrypt(value:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},await vaultKey(),E.encode(value));
  return{ciphertext:b64(new Uint8Array(cipher)),iv:b64(iv)};
}

Deno.serve(async req=>{
  if(req.method!=="POST")return J({error:"method_not_allowed"},405);
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  try{
    const {data:t,error:te}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
    if(te)throw te;
    const supplied=req.headers.get("x-debug-token")||"";
    if(!supplied||supplied!==String(t?.token||""))return J({error:"unauthorized"},403);

    const b=await req.json().catch(()=>({})) as any;
    const companyId=String(b.company_id||"");
    const username=String(b.username||"").trim();
    const password=String(b.password||"");
    const requestId=Number(b.request_id||0)||null;
    if(!companyId||!username||!password)return J({error:"company_username_password_required"},400);

    const {data:c,error:ce}=await admin.from("fiscal_companies")
      .select("id,inscricao_estadual,uf,status").eq("id",companyId).maybeSingle();
    if(ce)throw ce;
    if(!c||c.status!=="ativa"||String(c.uf||"").toUpperCase()!=="AL")return J({error:"company_not_active_al"},422);

    const ie=digits(c.inscricao_estadual);
    const expected=ie.length===9?ie.slice(0,-1):(ie.length===8?ie:"");
    if(!expected||digits(username)!==expected)return J({error:"username_not_derived_from_ie"},422);

    const {data:attempt,error:ae}=await admin.from("fiscal_state_credential_attempts")
      .select("company_id,outcome,request_id").eq("company_id",companyId).eq("uf","AL").eq("strategy","ie_minus_last_shared_password").maybeSingle();
    if(ae)throw ae;
    if(!attempt||attempt.outcome!=="valid")return J({error:"successful_one_shot_verification_required"},409);
    if(requestId&&attempt.request_id&&Number(attempt.request_id)!==requestId)return J({error:"verification_request_mismatch"},409);

    const [u,p]=await Promise.all([encrypt(username),encrypt(password)]);
    const now=new Date().toISOString();
    const {error:saveError}=await admin.from("fiscal_state_credentials").upsert({
      company_id:companyId,uf:"AL",portal_name:"SCA SEFAZ/AL",
      username_ciphertext:u.ciphertext,username_iv:u.iv,
      password_ciphertext:p.ciphertext,password_iv:p.iv,
      is_active:true,last_verified_at:now,last_verification_status:"valid",updated_at:now
    },{onConflict:"company_id,uf"});
    if(saveError)throw saveError;

    await admin.from("fiscal_sales_sync_state").upsert({
      company_id:companyId,status:"queued",paused:false,next_scheduled_at:now,last_error:null,updated_at:now
    },{onConflict:"company_id"});
    await admin.from("fiscal_source_reconciliation").update({
      status:"pending",reason:"Credencial estadual validada; aguardando nova reconciliação.",checked_at:now,updated_at:now
    }).eq("company_id",companyId).in("document_type",["sale_nfe55","sale_nfce65"]).eq("status","blocked");

    return J({ok:true,company_id:companyId,status:"valid"});
  }catch(error){
    return J({error:error instanceof Error?error.message:String(error)},500);
  }
});