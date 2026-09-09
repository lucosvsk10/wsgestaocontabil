import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type","Access-Control-Allow-Methods":"POST, OPTIONS"};
const J=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,"content-type":"application/json"}});
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const clean=(v:unknown)=>String(v??"").trim();
const E=new TextEncoder();
const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes));

async function aesKey(){
  const secret=Deno.env.get("ACCOUNTING_ENGINE_SESSION_SECRET")||Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if(!secret)throw new Error("Chave de criptografia do cofre fiscal não configurada.");
  const digest=await crypto.subtle.digest("SHA-256",E.encode(`ws-fiscal-vault:${secret}`));
  return crypto.subtle.importKey("raw",digest,{name:"AES-GCM"},false,["encrypt"]);
}
async function encrypt(value:string){
  const iv=crypto.getRandomValues(new Uint8Array(12));
  const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},await aesKey(),E.encode(value));
  return {ciphertext:b64(new Uint8Array(cipher)),iv:b64(iv)};
}

async function extractorContext(req:Request){
  const auth=req.headers.get("Authorization")||req.headers.get("authorization");
  if(!auth)throw Object.assign(new Error("Não autenticado"),{status:401});
  const url=Deno.env.get("SUPABASE_URL")!;
  const service=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin=createClient(url,service,{auth:{persistSession:false,autoRefreshToken:false}});
  const {data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));
  if(!user)throw Object.assign(new Error("Não autenticado"),{status:401});
  const {data:roles}=await admin.from("user_roles").select("role").eq("user_id",user.id);
  const platformAdmin=roles?.some((r:any)=>r.role==="admin")||false;
  const {data:members,error:memberError}=await admin.from("organization_members").select("organization_id,role,status").eq("user_id",user.id).eq("status","active");
  if(memberError)throw memberError;
  const orgs=(members||[]).filter((m:any)=>platformAdmin||["owner","admin"].includes(String(m.role))).map((m:any)=>String(m.organization_id));
  if(!orgs.length)throw Object.assign(new Error("Sua conta não possui permissão para gerenciar empresas do Extrator."),{status:403});
  const {data:accounts,error:accountError}=await admin.from("extractor_accounts").select("id,organization_id,status,lifetime_access,access_expires_at,name").in("organization_id",orgs).eq("status","active").order("created_at");
  if(accountError)throw accountError;
  const now=Date.now();
  const account=(accounts||[]).find((a:any)=>a.lifetime_access===true||(a.access_expires_at&&new Date(a.access_expires_at).getTime()>now));
  if(!account)throw Object.assign(new Error("O pacote Extrator não está ativo para esta conta."),{status:403});
  return {admin,user,account,auth,url};
}

async function registryLookup(ctx:any,cnpj:string){
  const anon=Deno.env.get("SUPABASE_ANON_KEY")||"";
  try{
    const response=await fetch(`${ctx.url}/functions/v1/saas-registry-lookup`,{
      method:"POST",
      headers:{authorization:ctx.auth,apikey:anon,"content-type":"application/json"},
      body:JSON.stringify({organization_id:ctx.account.organization_id,cnpj}),
      signal:AbortSignal.timeout(30000),
    });
    const data=await response.json().catch(()=>({})) as any;
    if(response.ok&&data?.ok)return data;
    console.warn("extractor registry lookup",response.status,data?.error||data);
  }catch(error){console.warn("extractor registry lookup failed",error)}
  return null;
}

const regime=(value:unknown)=>{
  const v=clean(value).toLowerCase();
  if(v==="mei"||v==="simples")return "simples_nacional";
  if(v==="presumido")return "lucro_presumido";
  if(v==="real")return "lucro_real";
  return v||null;
};

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  if(req.method!=="POST")return J({error:"Método não permitido"},405);
  try{
    const ctx=await extractorContext(req);
    const body=await req.json().catch(()=>({})) as any;
    const action=String(body.action||"add_from_certificate");

    if(action==="list"){
      const {data,error}=await ctx.admin.from("extractor_companies")
        .select("id,status,automatic_sync,fiscal_company_id,fiscal_companies(id,cnpj,razao_social,nome_fantasia,inscricao_estadual,uf,municipio,codigo_municipio,last_sync_at,fiscal_certificates(id,certificate_name,holder_cnpj,holder_name,valid_from,valid_until,is_active))")
        .eq("account_id",ctx.account.id).neq("status","removed").order("created_at");
      if(error)throw error;
      return J({ok:true,companies:data||[]});
    }

    if(action==="remove"){
      const companyId=String(body.company_id||"");
      if(!companyId)return J({error:"Empresa inválida."},422);
      const {error}=await ctx.admin.from("extractor_companies").update({status:"removed",updated_at:new Date().toISOString()}).eq("account_id",ctx.account.id).eq("fiscal_company_id",companyId);
      if(error)throw error;
      return J({ok:true});
    }

    if(action!=="add_from_certificate")return J({error:"Ação inválida."},400);
    const pfx=String(body.certificate_base64||"");
    const password=String(body.certificate_password||"");
    if(!pfx||!password)return J({error:"Selecione o certificado A1 e informe a senha."},422);

    let cert:any;
    try{cert=lerCertificado(Buffer.from(pfx,"base64"),password)}
    catch{return J({error:"Não foi possível abrir o certificado. Confira o arquivo e a senha."},422)}
    const cnpj=digits(cert.titular.cnpj);
    if(cnpj.length!==14)return J({error:"O certificado A1 não possui um CNPJ empresarial válido."},422);
    const validUntil=cert.validadeFim as Date;
    if(validUntil.getTime()<Date.now())return J({error:`O certificado A1 venceu em ${validUntil.toLocaleDateString("pt-BR")}.`},422);

    const registry=await registryLookup(ctx,cnpj);
    const d=registry?.data||{};
    const now=new Date().toISOString();
    const companyPayload:any={
      cnpj,
      razao_social:clean(d.legal_name)||clean(cert.titular.nome)||`CNPJ ${cnpj}`,
      nome_fantasia:clean(d.trade_name)||null,
      inscricao_estadual:digits(d.state_registration)||null,
      endereco:{
        logradouro:clean(d.street),numero:clean(d.street_number),bairro:clean(d.district),cep:digits(d.postal_code),complemento:clean(d.complement)
      },
      uf:clean(d.state).toUpperCase()||null,
      codigo_municipio:digits(d.city_ibge_code)||null,
      municipio:clean(d.city)||null,
      regime_tributario:regime(d.tax_regime),
      ambiente_padrao:"producao",
      status:"ativa",
      updated_at:now,
      fiscal_settings:{origin_scope:"extractor",extractor_account_id:ctx.account.id,registry_sources:registry?.sources||{},registry_checked_at:now}
    };

    let companyId="";
    const {data:existing,error:existingError}=await ctx.admin.from("fiscal_companies").select("id,fiscal_settings").eq("cnpj",cnpj).maybeSingle();
    if(existingError)throw existingError;
    if(existing?.id){
      companyId=String(existing.id);
      const mergedSettings={...(existing.fiscal_settings||{}),...(companyPayload.fiscal_settings||{})};
      const {error}=await ctx.admin.from("fiscal_companies").update({...companyPayload,fiscal_settings:mergedSettings}).eq("id",companyId);
      if(error)throw error;
    }else{
      const {data:created,error}=await ctx.admin.from("fiscal_companies").insert({...companyPayload,created_by:ctx.user.id}).select("id").single();
      if(error)throw error;
      companyId=String(created.id);
    }

    const pfxCrypt=await encrypt(pfx),passCrypt=await encrypt(password);
    await ctx.admin.from("fiscal_certificates").update({is_active:false,updated_at:now}).eq("company_id",companyId).eq("is_active",true);
    const {error:certError}=await ctx.admin.from("fiscal_certificates").insert({
      company_id:companyId,certificate_name:String(body.certificate_name||"certificado-a1.pfx"),
      certificate_data:null,password_hash:null,certificate_ciphertext:pfxCrypt.ciphertext,certificate_iv:pfxCrypt.iv,
      password_ciphertext:passCrypt.ciphertext,password_iv:passCrypt.iv,holder_cnpj:cnpj,holder_name:cert.titular.nome||null,
      valid_from:cert.validadeInicio.toISOString().slice(0,10),valid_until:cert.validadeFim.toISOString().slice(0,10),
      serial_number:String(cert.serialNumber||"")||null,fingerprint:null,is_active:true,inspected_at:now,updated_at:now,created_by:ctx.user.id
    });
    if(certError)throw certError;

    const {error:linkError}=await ctx.admin.from("extractor_companies").upsert({account_id:ctx.account.id,fiscal_company_id:companyId,status:"active",automatic_sync:true,updated_at:now},{onConflict:"account_id,fiscal_company_id"});
    if(linkError)throw linkError;

    await ctx.admin.from("fiscal_purchase_sync_state").upsert({company_id:companyId,paused:false,status:"queued",consecutive_failures:0,last_error:null,next_scheduled_at:now,updated_at:now},{onConflict:"company_id"});
    await ctx.admin.from("fiscal_sales_sync_state").upsert({company_id:companyId,paused:false,status:"queued",backfill_days:30,initial_backfill_done:false,reconciliation_complete:false,history_start_month:new Date(Date.now()-30*86400000).toISOString().slice(2,7).replace("-",""),last_error:null,next_scheduled_at:now,updated_at:now},{onConflict:"company_id"});
    await Promise.allSettled([ctx.admin.rpc("trigger_fiscal_purchases_cron"),ctx.admin.rpc("trigger_fiscal_sales_cron")]);

    return J({ok:true,company:{id:companyId,cnpj,legal_name:companyPayload.razao_social,trade_name:companyPayload.nome_fantasia,state_registration:companyPayload.inscricao_estadual,state:companyPayload.uf,city:companyPayload.municipio,city_ibge_code:companyPayload.codigo_municipio,certificate_valid_until:cert.validadeFim.toISOString().slice(0,10)},registry_found:Boolean(registry?.ok),state_registry_found:Boolean(digits(d.state_registration))});
  }catch(error:any){
    console.error("extractor-company-config",error);
    return J({error:error instanceof Error?error.message:String(error)},Number(error?.status)||500);
  }
});
