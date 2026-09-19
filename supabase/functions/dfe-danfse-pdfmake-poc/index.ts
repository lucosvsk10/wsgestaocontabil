import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.49.0";
import { parseDanfse } from "./xml-parser.ts";
import qrcode from "https://esm.sh/qrcode-generator@1.4.4?target=deno";


const cors={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type, x-debug-token",
};
const J=(body:any,status=200)=>new Response(JSON.stringify(body),{
  status,
  headers:{...cors,"content-type":"application/json","cache-control":"no-store"}
});

async function canAccessCompany(admin:any,userId:string,companyId:string){
  const {data:roles}=await admin.from("user_roles").select("role").eq("user_id",userId);
  if(roles?.some((r:any)=>r.role==="admin")) return true;

  const {data:links}=await admin
    .from("extractor_companies")
    .select("account_id")
    .eq("fiscal_company_id",companyId)
    .eq("status","active");
  const ids=[...new Set((links||[]).map((x:any)=>String(x.account_id)).filter(Boolean))];
  if(!ids.length) return false;

  const {data:accounts}=await admin
    .from("extractor_accounts")
    .select("id,organization_id,status,lifetime_access,access_expires_at")
    .in("id",ids)
    .eq("status","active");
  const now=Date.now();
  const entitled=(accounts||[]).filter((a:any)=>
    a.lifetime_access===true ||
    (a.access_expires_at && new Date(a.access_expires_at).getTime()>now)
  );
  if(!entitled.length) return false;

  const orgs=entitled.map((a:any)=>a.organization_id);
  const {data:members}=await admin
    .from("organization_members")
    .select("id")
    .eq("user_id",userId)
    .eq("status","active")
    .in("organization_id",orgs)
    .limit(1);
  return Boolean(members?.length);
}

const esc=(v:unknown)=>String(v??"-").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
const templateUrl=new URL("./danfse-official-template.html",import.meta.url);
let templateCache="";
const loadTemplate=async()=>templateCache||(templateCache=await Deno.readTextFile(templateUrl));
const qrDataUrl=(value:string)=>{
  const qr=qrcode(0,"M"); qr.addData(value); qr.make();
  return qr.createDataURL(4,0);
};
const renderHtml=async(data:any)=>{
  let html=await loadTemplate();
  const vals:Record<string,string>={
    issueCityUf:`${data.issueCity} - ${data.issueUf}`,
    generatorEnvironment:data.generatorEnvironment,
    environmentType:data.environmentType,
    qrDataUrl:qrDataUrl(data.qrValue),
    accessKey:data.accessKey, number:data.number, competency:data.competency, issueDate:data.issueDate,
    dpsNumber:data.dpsNumber, dpsSeries:data.dpsSeries, dpsIssueDate:data.dpsIssueDate,
    emitterType:data.emitterType, status:data.status, purpose:data.purpose,
    prestadorDoc:data.prestador.doc, prestadorMunicipalRegistration:data.prestador.municipalRegistration,
    prestadorPhone:data.prestador.phone, prestadorName:data.prestador.name, prestadorCityUf:data.prestador.cityUf,
    prestadorIbgeCep:data.prestador.ibgeCep, prestadorAddress:data.prestador.address, prestadorEmail:data.prestador.email,
    prestadorSimpleNational:String(data.prestador.simpleNational||"-").replace("Porte","..."),
    prestadorTaxRegime:data.prestador.taxRegime,
    tomadorDoc:data.tomador.doc, tomadorMunicipalRegistration:data.tomador.municipalRegistration,
    tomadorPhone:data.tomador.phone, tomadorName:data.tomador.name, tomadorCityUf:data.tomador.cityUf,
    tomadorIbgeCep:data.tomador.ibgeCep, tomadorAddress:data.tomador.address, tomadorEmail:data.tomador.email,
    serviceNationalMunicipalCode:data.service.nationalMunicipalCode, serviceNbs:data.service.nbs,
    serviceLocation:data.service.location, serviceClassification:data.service.classification,
    serviceDescription:data.service.description,
    municipalType:data.municipalTax.type, municipalIncidence:data.municipalTax.incidence,
    municipalBase:data.municipalTax.base, municipalRate:data.municipalTax.rate,
    municipalRetention:data.municipalTax.retention, municipalAmount:data.municipalTax.amount,
    federalIrrf:data.federalTax.irrf, federalPrevidencia:data.federalTax.previdencia,
    federalSociais:data.federalTax.sociais, federalPis:data.federalTax.pis,
    federalCofins:data.federalTax.cofins, federalRetainedDescription:data.federalTax.retainedDescription,
    ibsCstClass:data.ibsCbs.cstClass, ibsOperationIncidence:data.ibsCbs.operationIncidence,
    ibsExclusions:data.ibsCbs.exclusions, ibsBase:data.ibsCbs.base, ibsReduction:data.ibsCbs.reduction,
    ibsRateUfMun:data.ibsCbs.rateUfMun, ibsEffectiveMunicipal:data.ibsCbs.effectiveMunicipal,
    ibsAmountMunicipal:data.ibsCbs.amountMunicipal, ibsEffectiveState:data.ibsCbs.effectiveState,
    ibsAmountState:data.ibsCbs.amountState, ibsTotal:data.ibsCbs.totalIbs,
    cbsRate:data.ibsCbs.cbsRate, cbsEffective:data.ibsCbs.cbsEffective, cbsTotal:data.ibsCbs.cbsTotal,
    totalOperation:data.totals.operation, totalUnconditionalDiscount:data.totals.unconditionalDiscount,
    totalConditionalDiscount:data.totals.conditionalDiscount, totalRetentions:data.totals.retentions,
    totalNet:data.totals.net, totalIbsCbs:data.totals.ibsCbs, totalNetPlusIbsCbs:data.totals.netPlusIbsCbs,
    additionalInfoLine:"Inf. Cont.: "+(data.additionalInfo||"-"),
    approximateTaxes:data.approximateTaxes,
    footerNumberKey:`${data.number} / ${data.accessKey}`
  };
  for(const [k,v] of Object.entries(vals)){
    const safe=k==="qrDataUrl"?String(v):esc(v);
    html=html.replaceAll(`{{${k}}}`,safe);
  }
  return html;
};

Deno.serve(async(req)=>{
  if(req.method==="OPTIONS") return new Response("ok",{headers:cors});
  try{
    if(req.method!=="POST") return J({error:"Method not allowed"},405);

    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const debug=req.headers.get("x-debug-token")||"";
    const auth=req.headers.get("authorization")||"";
    const {data:tokenRow}=debug
      ? await admin.from("_fiscal_sales_debug_token").select("token").eq("id",true).maybeSingle()
      : {data:null as any};
    const debugAuthorized=Boolean(debug && tokenRow?.token && debug===String(tokenRow.token));

    let user:any=null;
    if(!debugAuthorized){
      if(!auth) return J({error:"Não autenticado"},401);
      const authResult=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));
      user=authResult.data.user;
      if(!user) return J({error:"Não autenticado"},401);
    }

    const body=await req.json();
    const doc=body?.document??{};
    const xml=String(doc?.xml??"");
    const companyId=String(body?.company_id||doc?.companyId||"");

    if(!xml) return J({error:"XML ausente"},400);
    if(!debugAuthorized){
      if(!companyId) return J({error:"Empresa não informada"},400);
      if(!(await canAccessCompany(admin,user.id,companyId))) return J({error:"Empresa não autorizada para esta conta"},403);
    }

    const data=await parseDanfse(xml,doc);
    const html=await renderHtml(data);
    const filename="danfse-html-oficial-teste-"+(doc.accessKey||doc.number||"documento")+".pdf";

    return J({
      ok:true,
      engine:"official-html-template",
      filename,
      html_template:html,
      page_width:793.33,
      page_height:1122.67,
      access_key:data.accessKey,
      number:data.number
    });
  }catch(e){
    return J({
      error:e instanceof Error?e.message:String(e),
      name:e instanceof Error?e.name:null
    },500);
  }
});