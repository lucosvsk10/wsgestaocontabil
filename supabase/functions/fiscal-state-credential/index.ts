import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";

const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json","cache-control":"no-store"}});
const E=new TextEncoder(),D=new TextDecoder();
const B=(v:string)=>Uint8Array.from(atob(v),c=>c.charCodeAt(0));
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));
const clean=(v:unknown)=>String(v??"").trim();
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");

async function vaultKey(){
  const secret=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!secret)throw new Error("vault_secret_missing");
  const digest=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt","decrypt"]);
}
async function encrypt(value:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},await vaultKey(),E.encode(value));
  return{ciphertext:b64(new Uint8Array(cipher)),iv:b64(iv)};
}
async function decrypt(ciphertext:string,iv:string){
  const plain=await crypto.subtle.decrypt({name:"AES-GCM",iv:B(iv)},await vaultKey(),B(ciphertext));
  return D.decode(plain);
}
async function authContext(req:Request){
  const auth=req.headers.get("authorization")||req.headers.get("Authorization")||"";
  if(!auth)throw Object.assign(new Error("Não autenticado."),{status:401});
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));
  if(!user)throw Object.assign(new Error("Não autenticado."),{status:401});
  const {data:roles,error:roleError}=await admin.from("user_roles").select("role").eq("user_id",user.id);
  if(roleError)throw roleError;
  return{admin,user,isAdmin:(roles||[]).some((r:any)=>r.role==="admin")};
}
async function resolveCompany(ctx:any,body:any){
  let officeCompanyId=clean(body.office_company_id);
  if(!ctx.isAdmin){
    const {data:links,error}=await ctx.admin.from("company_user_links").select("company_id,is_primary").eq("user_id",ctx.user.id).order("is_primary",{ascending:false});
    if(error)throw error;
    const allowed=(links||[]).map((r:any)=>String(r.company_id));
    if(!officeCompanyId)officeCompanyId=allowed[0]||"";
    if(!officeCompanyId||!allowed.includes(officeCompanyId))throw Object.assign(new Error("Empresa não vinculada a este acesso."),{status:403});
  }
  let fiscal:any=null;
  const fiscalId=clean(body.fiscal_company_id);
  if(ctx.isAdmin&&fiscalId){
    const {data,error}=await ctx.admin.from("fiscal_companies").select("id,company_id,cnpj,razao_social,uf,status").eq("id",fiscalId).maybeSingle();
    if(error)throw error;fiscal=data;
  }else if(officeCompanyId){
    const {data,error}=await ctx.admin.from("fiscal_companies").select("id,company_id,cnpj,razao_social,uf,status").eq("company_id",officeCompanyId).maybeSingle();
    if(error)throw error;fiscal=data;
  }
  if(!fiscal)throw Object.assign(new Error("Este cliente ainda não possui perfil fiscal vinculado."),{status:404});
  if(fiscal.status!=="ativa")throw Object.assign(new Error("A empresa fiscal está inativa."),{status:422});
  return{fiscal,officeCompanyId:String(fiscal.company_id||officeCompanyId||"")};
}
function publicStatus(cred:any,fiscal:any){
  const code=clean(cred?.last_verification_status)||"not_configured";
  const labels:Record<string,string>={
    valid:"Validado",
    valid_without_report_permission:"Sem permissão para relatório",
    invalid_credentials:"Usuário ou senha inválidos",
    portal_unavailable:"SEFAZ indisponível",
    pending_verification:"Aguardando validação",
    not_configured:"Não configurado",
  };
  return{
    configured:Boolean(cred?.id),
    supported:String(fiscal.uf||"").toUpperCase()==="AL",
    uf:String(fiscal.uf||"").toUpperCase()||null,
    portal_name:cred?.portal_name||"SCA SEFAZ/AL",
    verification_status:code,
    verification_label:labels[code]||code,
    last_verified_at:cred?.last_verified_at||null,
    can_reconcile:code==="valid",
  };
}
async function gatewayToken(admin:any){
  const {data,error}=await admin.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle();
  if(error)throw error;
  const token=String(data?.token||"");
  if(!token)throw new Error("gateway_token_missing");
  return token;
}
async function verifyAl(admin:any,username:string,password:string,cnpj:string){
  const token=await gatewayToken(admin);
  const today=new Date();
  const day=new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Maceio",year:"numeric",month:"2-digit",day:"2-digit"}).format(today);
  try{
    const response=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/sefaz-al-entry-report",{
      method:"POST",
      headers:{"content-type":"application/json","authorization":`Bearer ${token}`},
      body:JSON.stringify({username,password,cnpj,start:day,end:day,verify_only:true}),
      signal:AbortSignal.timeout(65000),
    });
    const payload=await response.json().catch(()=>({})) as any;
    if(response.status===422&&payload?.error==="invalid_credentials")return{code:"invalid_credentials",http:response.status,details:{login_valid:false}};
    if(response.ok&&payload?.login_valid===true&&payload?.report_access===true)return{code:"valid",http:response.status,details:{login_valid:true,report_access:true}};
    if(response.ok&&payload?.login_valid===true&&payload?.report_access===false)return{code:"valid_without_report_permission",http:response.status,details:{login_valid:true,report_access:false,reason:payload?.error||null}};
    if(payload?.login_valid===true)return{code:"valid_without_report_permission",http:response.status,details:{login_valid:true,report_access:false,reason:payload?.error||null}};
    return{code:"portal_unavailable",http:response.status,details:{reason:payload?.error||"verification_failed"}};
  }catch(error){
    return{code:"portal_unavailable",http:null,details:{reason:error instanceof Error?error.message:String(error)}};
  }
}
async function queueRecovery(admin:any,fiscalId:string){
  const now=new Date().toISOString();
  const {data:linked}=await admin.from("extractor_companies").select("id").eq("fiscal_company_id",fiscalId).eq("status","active").limit(1);
  if(!linked?.length)return;
  await admin.from("fiscal_sales_sync_state").upsert({
    company_id:fiscalId,status:"queued",paused:false,next_scheduled_at:now,last_error:null,updated_at:now
  },{onConflict:"company_id"});
  await admin.from("fiscal_source_reconciliation").update({
    status:"pending",reason:"Credencial estadual validada; aguardando nova reconciliação.",checked_at:now,updated_at:now
  }).eq("company_id",fiscalId).in("document_type",["sale_nfe55","sale_nfce65"]).eq("status","blocked");
}
async function audit(admin:any,userId:string,fiscalId:string,action:string,status:string){
  try{
    await admin.from("saas_audit_logs").insert({
      organization_id:null,actor_user_id:userId,action,resource_type:"fiscal_state_credential",resource_id:fiscalId,is_sensitive:true,
      metadata:{uf:"AL",verification_status:status}
    });
  }catch{}
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  if(req.method!=="POST")return J({error:"Método não permitido."},405);
  try{
    const length=Number(req.headers.get("content-length")||0);
    if(length>32_000)return J({error:"Payload muito grande."},413);
    const ctx=await authContext(req);
    const body=await req.json().catch(()=>({})) as any;
    const action=clean(body.action)||"status";
    const {fiscal}=await resolveCompany(ctx,body);
    const uf=String(fiscal.uf||"").toUpperCase();
    const {data:cred,error:credError}=await ctx.admin.from("fiscal_state_credentials")
      .select("id,company_id,uf,portal_name,username_ciphertext,username_iv,password_ciphertext,password_iv,is_active,last_verified_at,last_verification_status,updated_at")
      .eq("company_id",fiscal.id).eq("uf",uf||"AL").maybeSingle();
    if(credError)throw credError;

    if(action==="status")return J({ok:true,status:publicStatus(cred,fiscal)});
    if(uf!=="AL")return J({error:`Automação estadual ainda não disponível para ${uf||"esta UF"}.`,status:publicStatus(cred,fiscal)},422);

    if(action==="save_verify"){
      const username=clean(body.username),password=String(body.password||"");
      if(username.length<2||username.length>180||password.length<1||password.length>240)return J({error:"Informe usuário e senha válidos da SEFAZ/AL."},422);
      const verification=await verifyAl(ctx.admin,username,password,digits(fiscal.cnpj));
      if(verification.code==="invalid_credentials"){
        await audit(ctx.admin,ctx.user.id,fiscal.id,"state_credential_rejected",verification.code);
        return J({error:"Usuário ou senha inválidos no portal da SEFAZ/AL.",verification_status:verification.code},422);
      }
      const userCrypt=await encrypt(username),passCrypt=await encrypt(password),now=new Date().toISOString();
      const payload={
        company_id:fiscal.id,uf:"AL",portal_name:"SCA SEFAZ/AL",
        username_ciphertext:userCrypt.ciphertext,username_iv:userCrypt.iv,
        password_ciphertext:passCrypt.ciphertext,password_iv:passCrypt.iv,
        is_active:true,last_verified_at:now,last_verification_status:verification.code,updated_at:now,created_by:ctx.user.id,
      };
      const {data:saved,error}=await ctx.admin.from("fiscal_state_credentials").upsert(payload,{onConflict:"company_id,uf"}).select("id,portal_name,last_verified_at,last_verification_status").single();
      if(error)throw error;
      if(verification.code==="valid")await queueRecovery(ctx.admin,fiscal.id);
      await audit(ctx.admin,ctx.user.id,fiscal.id,"state_credential_saved",verification.code);
      return J({ok:true,status:publicStatus(saved,fiscal),verification:verification.details},verification.code==="portal_unavailable"?202:200);
    }

    if(action==="verify"){
      if(!cred?.id)return J({error:"Credencial estadual não configurada."},404);
      const username=await decrypt(cred.username_ciphertext,cred.username_iv);
      const password=await decrypt(cred.password_ciphertext,cred.password_iv);
      const verification=await verifyAl(ctx.admin,username,password,digits(fiscal.cnpj));
      const now=new Date().toISOString();
      const {data:updated,error}=await ctx.admin.from("fiscal_state_credentials").update({
        last_verified_at:now,last_verification_status:verification.code,updated_at:now
      }).eq("id",cred.id).select("id,portal_name,last_verified_at,last_verification_status").single();
      if(error)throw error;
      if(verification.code==="valid")await queueRecovery(ctx.admin,fiscal.id);
      await audit(ctx.admin,ctx.user.id,fiscal.id,"state_credential_verified",verification.code);
      return J({ok:true,status:publicStatus(updated,fiscal),verification:verification.details});
    }

    if(action==="delete"){
      if(!ctx.isAdmin)return J({error:"Somente o escritório pode remover a credencial estadual."},403);
      const {error}=await ctx.admin.from("fiscal_state_credentials").delete().eq("company_id",fiscal.id).eq("uf","AL");
      if(error)throw error;
      await ctx.admin.from("fiscal_sales_sync_state").update({
        status:"waiting_state_credentials",last_error:"Credencial estadual SEFAZ/AL não configurada.",next_scheduled_at:null,updated_at:new Date().toISOString()
      }).eq("company_id",fiscal.id);
      await audit(ctx.admin,ctx.user.id,fiscal.id,"state_credential_deleted","not_configured");
      return J({ok:true,status:publicStatus(null,fiscal)});
    }
    return J({error:"Ação inválida."},400);
  }catch(error:any){
    console.error("fiscal-state-credential",{code:error?.code||"request_failed"});
    const status=Number(error?.status)||500;
    return J({error:status<500?error.message:"Não foi possível validar a credencial estadual agora."},status);
  }
});
