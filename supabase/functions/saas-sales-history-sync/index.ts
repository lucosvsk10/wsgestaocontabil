import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const out=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const num=(v:unknown)=>{const n=Number(String(v??"").replace(/\D/g,""));return Number.isFinite(n)?n:0};
const cancelled=(s:unknown)=>/cancel|101/i.test(String(s??""));
Deno.serve(async req=>{if(req.method==="OPTIONS")return new Response(null,{headers:cors});try{
 const auth=req.headers.get("Authorization");if(!auth)return out({error:"Não autenticado"},401);
 const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
 const {data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return out({error:"Não autenticado"},401);
 const b=await req.json().catch(()=>({})) as any,orgId=String(b.organization_id||"");if(!orgId)return out({error:"Organização obrigatória"},422);
 const {data:m}=await admin.from("organization_members").select("role,status").eq("organization_id",orgId).eq("user_id",user.id).eq("status","active").maybeSingle();if(!m||!["owner","admin","member"].includes(m.role))return out({error:"Sem acesso à organização"},403);
 const {data:p,error:pe}=await admin.from("saas_company_fiscal_profiles").select("*").eq("organization_id",orgId).order("created_at").limit(1).maybeSingle();if(pe)throw pe;if(!p)return out({ok:true,imported_count:0,history_available:false,history_message:"Configure os dados fiscais antes de sincronizar o histórico."});
 const cnpj=digits(p.tax_id);if(cnpj.length!==14)return out({ok:true,imported_count:0,history_available:false,history_message:"CNPJ fiscal ainda não configurado."});
 const since=new Date(Date.now()-35*86400000).toISOString();
 const {data:legacyCompany}=await admin.from("fiscal_companies").select("id,cnpj,razao_social,uf,status").eq("cnpj",cnpj).eq("status","ativa").maybeSingle();
 const docs=new Map<string,any>();
 if(legacyCompany?.id){
   const [{data:sales},{data:dfe}]=await Promise.all([
     admin.from("fiscal_sales_documents").select("access_key,model,document_number,series,issue_date,status,total_value,recipient_document,recipient_name,xml,source").eq("company_id",legacyCompany.id).gte("issue_date",since).order("issue_date",{ascending:false}).limit(1000),
     admin.from("fiscal_dfe_documents").select("access_key,model,note_number,series,issue_date,status_code,status_text,value,recipient_cnpj,xml,source").eq("company_id",legacyCompany.id).eq("direction","saida").gte("issue_date",since).order("issue_date",{ascending:false}).limit(1000)
   ]);
   for(const d of sales||[]){if(d.access_key)docs.set(String(d.access_key),{key:d.access_key,model:String(d.model||String(d.access_key).slice(20,22)),number:d.document_number,series:d.series,date:d.issue_date,status:d.status,total:d.total_value,recipient_document:d.recipient_document,recipient_name:d.recipient_name,xml:d.xml,origin:d.source||"legacy_sales"})}
   for(const d of dfe||[]){if(d.access_key&&!docs.has(String(d.access_key)))docs.set(String(d.access_key),{key:d.access_key,model:String(d.model||String(d.access_key).slice(20,22)),number:d.note_number,series:d.series,date:d.issue_date,status:d.status_text||d.status_code,total:d.value,recipient_document:d.recipient_cnpj,recipient_name:null,xml:d.xml,origin:d.source||"legacy_dfe"})}
 }
 let imported=0;
 for(const d of docs.values()){
   const model=String(d.model)==="65"?"nfce":"nfe",ext=`legacy-sales:${d.key}`;
   const row={organization_id:orgId,user_id:user.id,document_type:model,status:cancelled(d.status)?"cancelled":"authorized",environment:"production",number:String(d.number||""),series:String(d.series||"1"),access_key:String(d.key),protocol:null,recipient_name:d.recipient_name||null,recipient_tax_id:digits(d.recipient_document)||null,total:Number(d.total||0),payload:{imported:true,source:"sefaz",original_source:d.origin},response:{imported:true,source:d.origin},xml:d.xml||null,authorized_at:d.date||null,source:"imported",external_source_id:ext,imported_at:new Date().toISOString()};
   const {error}=await admin.from("saas_fiscal_emissions").upsert(row,{onConflict:"organization_id,external_source_id",ignoreDuplicates:false});if(!error)imported++;
 }
 async function reconcile(type:"nfe"|"nfce",series:any,current:any,col:string){const {data}=await admin.from("saas_fiscal_emissions").select("number").eq("organization_id",orgId).eq("document_type",type).eq("series",String(series||1)).in("status",["authorized","cancelled"]);const max=Math.max(0,...(data||[]).map((x:any)=>num(x.number)));const next=Math.max(Number(current||1),max+1);if(next!==Number(current||1))await admin.from("saas_company_fiscal_profiles").update({[col]:next,updated_at:new Date().toISOString()}).eq("id",p.id);return{max,next}}
 const nfe=await reconcile("nfe",p.series_nfe,p.next_number_nfe,"next_number_nfe"),nfce=await reconcile("nfce",p.series_nfce,p.next_number_nfce,"next_number_nfce");
 let portalCredential=false;if(legacyCompany?.id&&String(legacyCompany.uf||"").toUpperCase()==="AL"){const {data:c}=await admin.from("fiscal_state_credentials").select("id").eq("company_id",legacyCompany.id).eq("uf","AL").eq("is_active",true).limit(1);portalCredential=Boolean(c?.length)}
 return out({ok:true,imported_count:imported,found_count:docs.size,next_number_nfe:nfe.next,next_number_nfce:nfce.next,last_known_nfe:nfe.max,last_known_nfce:nfce.max,linked_source:Boolean(legacyCompany),portal_credential:portalCredential,history_available:Boolean(legacyCompany),history_message:legacyCompany?`Histórico recente reconciliado com ${docs.size} documento(s) encontrado(s).`:"Nenhum histórico fiscal anterior deste CNPJ está vinculado ao extrator ainda. O A1 continua válido para emissão; para enumerar vendas anteriores em AL, conecte também o acesso do portal da SEFAZ/AL."});
}catch(e){console.error(e);return out({error:e instanceof Error?e.message:String(e)},500)}});