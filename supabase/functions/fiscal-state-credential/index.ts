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
  const requestedFiscalId=clean(body.fiscal_company_id);
  if(!ctx.isAdmin){
    const {data:links,error}=await ctx.admin.from("company_user_links").select("company_id,is_primary").eq("user_id",ctx.user.id).order("is_primary",{ascending:false});
    if(error)throw error;
    const allowed=(links||[]).map((r:any)=>String(r.company_id));
    if(officeCompanyId&&allowed.includes(officeCompanyId)){
      // Acesso do cliente contábil já confirmado pelo vínculo da empresa.
    }else if(requestedFiscalId){
      const {data:members,error:memberError}=await ctx.admin.from("organization_members")
        .select("organization_id,role,status").eq("user_id",ctx.user.id).eq("status","active");
      if(memberError)throw memberError;
      const organizationIds=(members||[])
        .filter((member:any)=>["owner","admin"].includes(String(member.role||"")))
        .map((member:any)=>String(member.organization_id));
      if(!organizationIds.length)throw Object.assign(new Error("Empresa não vinculada a este acesso."),{status:403});
      const {data:accounts,error:accountError}=await ctx.admin.from("extractor_accounts")
        .select("id,lifetime_access,access_expires_at").in("organization_id",organizationIds).eq("status","active");
      if(accountError)throw accountError;
      const now=Date.now();
      const accountIds=(accounts||[])
        .filter((account:any)=>account.lifetime_access===true||(account.access_expires_at&&new Date(account.access_expires_at).getTime()>now))
        .map((account:any)=>String(account.id));
      const {data:link,error:linkError}=accountIds.length
        ? await ctx.admin.from("extractor_companies").select("id").in("account_id",accountIds)
          .eq("fiscal_company_id",requestedFiscalId).eq("status","active").limit(1).maybeSingle()
        : {data:null,error:null};
      if(linkError)throw linkError;
      if(!link)throw Object.assign(new Error("Empresa não vinculada a este acesso do Extrator."),{status:403});
    }else{
      if(!officeCompanyId)officeCompanyId=allowed[0]||"";
      if(!officeCompanyId||!allowed.includes(officeCompanyId))throw Object.assign(new Error("Empresa não vinculada a este acesso."),{status:403});
    }
  }
  let fiscal:any=null;
  if((ctx.isAdmin||requestedFiscalId)&&requestedFiscalId){
    const {data,error}=await ctx.admin.from("fiscal_companies").select("id,company_id,cnpj,razao_social,inscricao_estadual,uf,status").eq("id",requestedFiscalId).maybeSingle();
    if(error)throw error;fiscal=data;
  }else if(officeCompanyId){
    const {data,error}=await ctx.admin.from("fiscal_companies").select("id,company_id,cnpj,razao_social,inscricao_estadual,uf,status").eq("company_id",officeCompanyId).maybeSingle();
    if(error)throw error;fiscal=data;
  }
  if(!fiscal)throw Object.assign(new Error("Este cliente ainda não possui perfil fiscal vinculado."),{status:404});
  if(fiscal.status!=="ativa")throw Object.assign(new Error("A empresa fiscal está inativa."),{status:422});
  return{fiscal,officeCompanyId:String(fiscal.company_id||officeCompanyId||"")};
}
function alPortalUsername(fiscal:any){
  const registration=digits(fiscal?.inscricao_estadual);
  if(registration.length===9)return registration.slice(0,-1);
  if(registration.length===8)return registration;
  return "";
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
    username_automatic:Boolean(alPortalUsername(fiscal)),
    username_source:alPortalUsername(fiscal)?"inscricao_estadual":null,
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
  try{
    await admin.from("fiscal_source_reconciliation").update({
      status:"pending",reason:"Credencial estadual validada; aguardando nova reconciliação.",checked_at:now,updated_at:now
    }).eq("company_id",fiscalId).in("document_type",["sale_nfe55","sale_nfce65"]).eq("status","blocked");
  }catch{}
  try{ await admin.rpc("trigger_fiscal_sales_cron"); }catch{}
}
async function applyVerificationState(admin:any,fiscalId:string,code:string){
  const now=new Date().toISOString();
  if(code==="valid"){
    await queueRecovery(admin,fiscalId);
    return;
  }
  if(code==="invalid_credentials"||code==="valid_without_report_permission"){
    await admin.from("fiscal_sales_sync_state").upsert({
      company_id:fiscalId,
      status:"waiting_state_credentials",
      paused:false,
      next_scheduled_at:null,
      last_error:code==="invalid_credentials"
        ?"Usuário ou senha inválidos no portal estadual."
        :"Login estadual válido, mas sem permissão suficiente para o relatório fiscal.",
      updated_at:now
    },{onConflict:"company_id"});
  }
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
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,{auth:{persistSession:false,autoRefreshToken:false}});
    const body=await req.json().catch(()=>({})) as any;
    const action=clean(body.action)||"status";

    if(action==="sales_probe_internal"){
      const supplied=req.headers.get("x-debug-token")||"";
      const [{data:internal},{data:g}]=await Promise.all([
        admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle(),
        admin.from("_fiscal_vercel_gateway_token").select("token").eq("id",true).maybeSingle(),
      ]);
      if(!supplied||supplied!==String(internal?.token||""))return J({error:"unauthorized"},403);
      const companyId=clean(body.company_id);
      if(!companyId)return J({error:"company_id_required"},400);
      const {data:fiscal,error:fe}=await admin.from("fiscal_companies")
        .select("id,cnpj,inscricao_estadual,uf,status").eq("id",companyId).maybeSingle();
      if(fe)throw fe;
      if(!fiscal||fiscal.status!=="ativa"||String(fiscal.uf||"").toUpperCase()!=="AL")return J({error:"company_not_active_al"},422);
      const {data:stored,error:se}=await admin.from("fiscal_state_credentials")
        .select("username_ciphertext,username_iv,password_ciphertext,password_iv,last_verification_status,is_active")
        .eq("company_id",companyId).eq("uf","AL").eq("is_active",true).maybeSingle();
      if(se)throw se;
      if(!stored||stored.last_verification_status!=="valid")return J({error:"state_credential_not_valid"},409);
      const userValue=await decrypt(stored.username_ciphertext,stored.username_iv);
      const secretValue=await decrypt(stored.password_ciphertext,stored.password_iv);
      const end=clean(body.end)||new Intl.DateTimeFormat("sv-SE",{timeZone:"America/Maceio",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
      const start=clean(body.start)||end.slice(0,8)+"01";
      const response=await fetch("https://ws-nfse-sefin-probe.vercel.app/api/sefaz-al-sales-report",{
        method:"POST",
        headers:{"content-type":"application/json","authorization":`Bearer ${String(g?.token||"")}`},
        body:JSON.stringify({username:userValue,password:secretValue,cnpj:digits(fiscal.cnpj),ie:digits(fiscal.inscricao_estadual),start,end,format:"csv"}),
        signal:AbortSignal.timeout(90000),
      });
      const payload=await response.json().catch(()=>({})) as any;
      if(!response.ok||!payload?.ok||!payload?.data_base64)return J({ok:false,gateway_http:response.status,gateway:payload},502);
      const bytes=Uint8Array.from(atob(String(payload.data_base64)),x=>x.charCodeAt(0));
      let text=new TextDecoder("utf-8").decode(bytes).replace(/^\uFEFF/,"");
      if((text.match(/�/g)||[]).length>4){try{text=new TextDecoder("windows-1252").decode(bytes)}catch{}}
      const lines=text.split(/\r?\n/).filter((x:string)=>x.trim());
      return J({ok:true,company_id:companyId,period:{start,end},gateway:{http:payload.http,content_type:payload.content_type,bytes:payload.bytes},line_count:lines.length,preview:lines.slice(0,8)});
    }

    if(action==="verify_due_internal"){
      const supplied=req.headers.get("x-debug-token")||"";
      const {data:internal}=await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle();
      if(!supplied||supplied!==String(internal?.token||""))return J({error:"unauthorized"},403);
      const {data:rows,error}=await admin.from("fiscal_state_credentials")
        .select("id,company_id,uf,username_ciphertext,username_iv,password_ciphertext,password_iv,last_verified_at")
        .eq("uf","AL").eq("is_active",true)
        .or("last_verification_status.is.null,last_verification_status.neq.invalid_credentials")
        .order("last_verified_at",{ascending:true,nullsFirst:true})
        .limit(6);
      if(error)throw error;
      const results=await Promise.all((rows||[]).map(async(cred:any)=>{
        try{
          const {data:fiscal,error:fiscalError}=await admin.from("fiscal_companies").select("id,cnpj,status").eq("id",cred.company_id).maybeSingle();
          if(fiscalError||!fiscal||fiscal.status!=="ativa")return{company_id:cred.company_id,skipped:true};
          const username=await decrypt(cred.username_ciphertext,cred.username_iv);
          const password=await decrypt(cred.password_ciphertext,cred.password_iv);
          const verification=await verifyAl(admin,username,password,digits(fiscal.cnpj));
          const now=new Date().toISOString();
          await admin.from("fiscal_state_credentials").update({
            last_verified_at:now,last_verification_status:verification.code,updated_at:now
          }).eq("id",cred.id);
          await applyVerificationState(admin,fiscal.id,verification.code);
          return{company_id:fiscal.id,status:verification.code};
        }catch(error){
          return{company_id:cred.company_id,status:"portal_unavailable",error:error instanceof Error?error.message:String(error)};
        }
      }));
      return J({ok:true,checked:results.length,results});
    }

    const ctx=await authContext(req);
    const {fiscal}=await resolveCompany(ctx,body);
    const uf=String(fiscal.uf||"").toUpperCase();
    const {data:cred,error:credError}=await ctx.admin.from("fiscal_state_credentials")
      .select("id,company_id,uf,portal_name,username_ciphertext,username_iv,password_ciphertext,password_iv,is_active,last_verified_at,last_verification_status,updated_at")
      .eq("company_id",fiscal.id).eq("uf",uf||"AL").maybeSingle();
    if(credError)throw credError;

    if(action==="status"){
      const [{data:salesState},{count:salesCount},{data:sourceRows}]=await Promise.all([
        ctx.admin.from("fiscal_sales_sync_state")
          .select("status,last_error,last_started_at,last_completed_at,next_scheduled_at,reconciliation_total,reconciliation_resolved,reconciliation_found,reconciliation_pending,reconciliation_complete")
          .eq("company_id",fiscal.id).maybeSingle(),
        ctx.admin.from("fiscal_sales_documents")
          .select("id",{count:"exact",head:true})
          .eq("company_id",fiscal.id),
        ctx.admin.from("fiscal_source_reconciliation")
          .select("document_type,status,source_confirmed,source_count,site_count,missing_count,checked_at")
          .eq("company_id",fiscal.id)
          .in("document_type",["sale_nfe55","sale_nfce65"])
          .order("checked_at",{ascending:false})
          .limit(8),
      ]);
      const latestByType=new Map<string,any>();
      for(const row of sourceRows||[])if(!latestByType.has(String(row.document_type)))latestByType.set(String(row.document_type),row);
      const latestSources=[...latestByType.values()];
      const applicableSources=latestSources.filter((row:any)=>row);
      const salesSourceConfirmed=applicableSources.length>0&&applicableSources.every((row:any)=>row.source_confirmed===true);
      const salesSourceMissing=applicableSources.reduce((sum:number,row:any)=>sum+Number(row.missing_count||0),0);
      const salesSourceCount=applicableSources.reduce((sum:number,row:any)=>sum+Number(row.source_count||0),0);
      const salesSiteCount=applicableSources.reduce((sum:number,row:any)=>sum+Number(row.site_count||0),0);
      return J({
        ok:true,
        status:{
          ...publicStatus(cred,fiscal),
          sales_status:salesState?.status||null,
          sales_error:salesState?.last_error||null,
          sales_started_at:salesState?.last_started_at||null,
          sales_completed_at:salesState?.last_completed_at||null,
          sales_found:Number(salesCount||0),
          sales_documents:Number(salesCount||0),
          reconciliation_total:Number(salesState?.reconciliation_total||0),
          reconciliation_resolved:Number(salesState?.reconciliation_resolved||0),
          reconciliation_pending:Number(salesState?.reconciliation_pending||0),
          reconciliation_complete:Boolean(salesState?.reconciliation_complete),
          sales_source_confirmed:salesSourceConfirmed,
          sales_source_count:salesSourceCount,
          sales_site_count:salesSiteCount,
          sales_source_missing:salesSourceMissing,
        }
      });
    }
    if(uf!=="AL")return J({error:`Automação estadual ainda não disponível para ${uf||"esta UF"}.`,status:publicStatus(cred,fiscal)},422);

    if(action==="save_deferred"){
      const username=clean(body.username)||alPortalUsername(fiscal),password=String(body.password||"");
      if(username.length<2||username.length>180)return J({error:"Não foi possível identificar automaticamente o usuário da SEFAZ/AL. Atualize a inscrição estadual da empresa."},422);
      if(password.length<1||password.length>240)return J({error:"Informe a senha do portal da SEFAZ/AL."},422);
      const userCrypt=await encrypt(username),passCrypt=await encrypt(password),now=new Date().toISOString();
      const payload={
        company_id:fiscal.id,uf:"AL",portal_name:"SCA SEFAZ/AL",
        username_ciphertext:userCrypt.ciphertext,username_iv:userCrypt.iv,
        password_ciphertext:passCrypt.ciphertext,password_iv:passCrypt.iv,
        is_active:true,last_verified_at:null,last_verification_status:"pending_verification",updated_at:now,created_by:ctx.user.id,
      };
      const {data:saved,error}=await ctx.admin.from("fiscal_state_credentials").upsert(payload,{onConflict:"company_id,uf"}).select("id,portal_name,last_verified_at,last_verification_status").single();
      if(error)throw error;
      await ctx.admin.from("fiscal_sales_sync_state").upsert({
        company_id:fiscal.id,status:"waiting_state_credentials",paused:false,next_scheduled_at:null,
        last_error:"Credencial estadual salva; aguardando validação automática.",updated_at:now
      },{onConflict:"company_id"});
      await audit(ctx.admin,ctx.user.id,fiscal.id,"state_credential_saved_pending","pending_verification");
      const verifyTask=(async()=>{
        try{
          const verification=await verifyAl(ctx.admin,username,password,digits(fiscal.cnpj));
          const verifiedAt=new Date().toISOString();
          await ctx.admin.from("fiscal_state_credentials").update({
            last_verified_at:verifiedAt,last_verification_status:verification.code,updated_at:verifiedAt
          }).eq("company_id",fiscal.id).eq("uf","AL");
          await applyVerificationState(ctx.admin,fiscal.id,verification.code);
          await audit(ctx.admin,ctx.user.id,fiscal.id,"state_credential_background_verified",verification.code);
        }catch(error){
          console.error("state credential background verification",{company_id:fiscal.id,error:error instanceof Error?error.message:String(error)});
        }
      })();
      try{ (globalThis as any).EdgeRuntime?.waitUntil?.(verifyTask); }catch{}
      return J({ok:true,status:publicStatus(saved,fiscal),queued_for_verification:true},202);
    }

    if(action==="save_verify"){
      const username=clean(body.username)||alPortalUsername(fiscal),password=String(body.password||"");
      if(username.length<2||username.length>180)return J({error:"Não foi possível identificar automaticamente o usuário da SEFAZ/AL. Atualize a inscrição estadual da empresa."},422);
      if(password.length<1||password.length>240)return J({error:"Informe a senha do portal da SEFAZ/AL."},422);
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
      await applyVerificationState(ctx.admin,fiscal.id,verification.code);
      await audit(ctx.admin,ctx.user.id,fiscal.id,"state_credential_saved",verification.code);
      return J({ok:true,status:publicStatus(saved,fiscal),verification:verification.details},verification.code==="portal_unavailable"?202:200);
    }

    if(action==="request_verify"){
      if(!cred?.id)return J({error:"Credencial estadual não configurada."},404);
      if(cred.last_verification_status==="invalid_credentials"){
        return J({error:"Esta credencial já foi rejeitada. Salve uma nova senha antes de tentar novamente."},409);
      }
      const now=new Date().toISOString();
      const {data:updated,error}=await ctx.admin.from("fiscal_state_credentials").update({
        last_verified_at:null,last_verification_status:"pending_verification",updated_at:now
      }).eq("id",cred.id).select("id,portal_name,last_verified_at,last_verification_status").single();
      if(error)throw error;
      await ctx.admin.from("fiscal_sales_sync_state").upsert({
        company_id:fiscal.id,status:"waiting_state_credentials",paused:false,next_scheduled_at:null,
        last_error:"Credencial estadual aguardando validação automática.",updated_at:now
      },{onConflict:"company_id"});
      await audit(ctx.admin,ctx.user.id,fiscal.id,"state_credential_verification_queued","pending_verification");
      return J({ok:true,status:publicStatus(updated,fiscal),queued_for_verification:true},202);
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
      await applyVerificationState(ctx.admin,fiscal.id,verification.code);
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
