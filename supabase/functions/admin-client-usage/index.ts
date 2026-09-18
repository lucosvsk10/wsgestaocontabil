import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const cors={
  'Access-Control-Allow-Origin':'*',
  'Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':'POST, OPTIONS',
};
const json=(body:unknown,status=200)=>new Response(JSON.stringify(body),{status,headers:{...cors,'content-type':'application/json','cache-control':'no-store'}});

Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response(null,{headers:cors});
  if(req.method!=='POST')return json({error:'Método não permitido.'},405);
  try{
    const auth=req.headers.get('authorization');
    if(!auth)return json({error:'Não autenticado.'},401);
    const admin=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}});
    const {data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,''));
    if(!user)return json({error:'Não autenticado.'},401);
    const {data:roles}=await admin.from('user_roles').select('role').eq('user_id',user.id);
    if(!roles?.some((row:any)=>row.role==='admin'))return json({error:'Acesso exclusivo para administradores.'},403);

    const body=await req.json().catch(()=>({})) as Record<string,any>;
    const companyId=String(body.company_id||'');
    if(!companyId)return json({error:'Empresa não informada.'},422);

    const {data:company,error:companyError}=await admin.from('companies').select('id,company_name,trade_name').eq('id',companyId).maybeSingle();
    if(companyError)throw companyError;
    if(!company)return json({error:'Empresa não encontrada.'},404);

    const {data:fiscal,error:fiscalError}=await admin.from('fiscal_companies').select('id,cnpj').eq('company_id',companyId).maybeSingle();
    if(fiscalError)throw fiscalError;

    let purchases=0,salesDfe=0,salesPortal=0,totalDfe=0,fullXml=0,extractorLinks=0;
    let lastFiscalDocumentAt:string|null=null;
    if(fiscal?.id){
      const [purchaseResult,salesResult,portalSalesResult,totalResult,xmlResult,lastResult,extractorResult]=await Promise.all([
        admin.from('fiscal_dfe_documents').select('id',{count:'exact',head:true}).eq('company_id',fiscal.id).eq('direction','entrada'),
        admin.from('fiscal_dfe_documents').select('id',{count:'exact',head:true}).eq('company_id',fiscal.id).eq('direction','saida'),
        admin.from('fiscal_sales_documents').select('id',{count:'exact',head:true}).eq('company_id',fiscal.id),
        admin.from('fiscal_dfe_documents').select('id',{count:'exact',head:true}).eq('company_id',fiscal.id),
        admin.from('fiscal_dfe_documents').select('id',{count:'exact',head:true}).eq('company_id',fiscal.id).eq('full_xml',true),
        admin.from('fiscal_dfe_documents').select('issue_date').eq('company_id',fiscal.id).order('issue_date',{ascending:false}).limit(1).maybeSingle(),
        admin.from('extractor_companies').select('id',{count:'exact',head:true}).eq('fiscal_company_id',fiscal.id).eq('status','active'),
      ]);
      purchases=purchaseResult.count||0;
      salesDfe=salesResult.count||0;
      salesPortal=portalSalesResult.count||0;
      totalDfe=totalResult.count||0;
      fullXml=xmlResult.count||0;
      lastFiscalDocumentAt=(lastResult.data as any)?.issue_date||null;
      extractorLinks=extractorResult.count||0;
    }

    const {data:issuerProfiles,error:issuerProfileError}=await admin
      .from('saas_company_fiscal_profiles')
      .select('id,organization_id,enabled_documents')
      .eq('company_id',companyId);
    if(issuerProfileError)throw issuerProfileError;
    const issuerOrgIds=[...new Set((issuerProfiles||[]).map((row:any)=>row.organization_id).filter(Boolean))];

    let issuerEmissions=0;
    let lastIssuerEmissionAt:string|null=null;
    let issuerSubscriptionActive=false;
    if(issuerOrgIds.length){
      const [emissionResult,lastEmissionResult,subscriptionResult]=await Promise.all([
        admin.from('saas_fiscal_emissions').select('id',{count:'exact',head:true}).in('organization_id',issuerOrgIds),
        admin.from('saas_fiscal_emissions').select('created_at').in('organization_id',issuerOrgIds).order('created_at',{ascending:false}).limit(1).maybeSingle(),
        admin.from('saas_subscriptions').select('id',{count:'exact',head:true}).in('organization_id',issuerOrgIds).eq('product_code','issuer').in('status',['active','trialing','past_due']),
      ]);
      issuerEmissions=emissionResult.count||0;
      lastIssuerEmissionAt=(lastEmissionResult.data as any)?.created_at||null;
      issuerSubscriptionActive=(subscriptionResult.count||0)>0;
    }

    return json({
      ok:true,
      company_id:companyId,
      fiscal_company_id:fiscal?.id||null,
      documents:{
        purchases,
        sales_dfe:salesDfe,
        sales_portal:salesPortal,
        total_dfe:totalDfe,
        full_xml:fullXml,
        last_document_at:lastFiscalDocumentAt,
      },
      extractor:{
        linked:extractorLinks>0,
        active_links:extractorLinks,
      },
      issuer:{
        linked:issuerOrgIds.length>0,
        active_subscription:issuerSubscriptionActive,
        emissions:issuerEmissions,
        last_emission_at:lastIssuerEmissionAt,
      },
    });
  }catch(error:any){
    console.error('admin-client-usage',error);
    return json({error:error?.message||'Falha ao carregar uso do cliente.'},500);
  }
});