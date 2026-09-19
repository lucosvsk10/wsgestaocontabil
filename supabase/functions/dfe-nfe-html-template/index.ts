import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import bwipjs from "npm:bwip-js@4.5.1";
import { consume, limited } from "../_shared/rate-limit.ts";
import { readJsonLimited, RequestError } from "../_shared/request-guards.ts";
import { NFE_TEMPLATE_GZIP_BASE64 } from "./template-data.ts";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const J=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"content-type":"application/json"}});
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const clean=(v:unknown)=>String(v??"").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,"$1").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();
const tag=(x:string,n:string)=>clean(x.match(new RegExp("<(?:\\w+:)?"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?"+n+">","i"))?.[1]||"");
const sections=(x:string,n:string)=>[...x.matchAll(new RegExp("<(?:\\w+:)?"+n+"(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?"+n+">","gi"))].map(m=>m[1]);
const esc=(v:unknown)=>String(v??"-").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
const money=(v:unknown)=>Number(String(v??"0").replace(",",".")||0).toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2});
const cnpjCpf=(v:unknown)=>{const d=dg(v);if(d.length===14)return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5");if(d.length===11)return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4");return d||"-";};
const cep=(v:unknown)=>{const d=dg(v);return d.length===8?d.replace(/^(\d{5})(\d{3})$/,"$1-$2"):d||"-";};
const dateOnly=(v:unknown)=>{const d=new Date(String(v||""));return Number.isNaN(d.getTime())?clean(v)||"-":d.toLocaleDateString("pt-BR",{timeZone:"America/Maceio"});};
const timeOnly=(v:unknown)=>{const d=new Date(String(v||""));return Number.isNaN(d.getTime())?"-":d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit",second:"2-digit",timeZone:"America/Maceio"});};
const dateTime=(v:unknown)=>{const d=new Date(String(v||""));return Number.isNaN(d.getTime())?clean(v)||"-":d.toLocaleString("pt-BR",{timeZone:"America/Maceio"});};
const fmtKey=(v:unknown)=>dg(v).replace(/(\d{4})(?=\d)/g,"$1 ").trim();
const unwrapStoredFiscalXml=(raw:unknown)=>{
  const value=String(raw||"").trim();
  if(!value)return "";
  if(/^<\?xml\b/i.test(value)||/^<(?:\w+:)?(?:nfeProc|NFe|procNFe)\b/i.test(value))return value;
  const objectMatch=value.match(/var\s+stringJson\s*=\s*(\{[\s\S]*?\})\s*;/i);
  if(objectMatch?.[1]){
    try{const parsed=JSON.parse(objectMatch[1]);if(typeof parsed?.xml==="string"&&parsed.xml.trim().startsWith("<"))return parsed.xml.trim();}catch{}
  }
  const xmlStringMatch=value.match(/["']xml["']\s*:\s*("(?:\\.|[^"\\])*")/i);
  if(xmlStringMatch?.[1]){
    try{const parsed=JSON.parse(xmlStringMatch[1]);if(typeof parsed==="string"&&parsed.trim().startsWith("<"))return parsed.trim();}catch{}
  }
  return value;
};

let templateCache="";
async function loadTemplate(){
  if(templateCache)return templateCache;
  const bytes=Uint8Array.from(atob(NFE_TEMPLATE_GZIP_BASE64),c=>c.charCodeAt(0));
  const stream=new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  templateCache=await new Response(stream).text();
  return templateCache.replace(/^\uFEFF/,"");
}

async function canAccessCompany(admin:any,userId:string,companyId:string){
  const {data:roles}=await admin.from("user_roles").select("role").eq("user_id",userId);
  if(roles?.some((r:any)=>r.role==="admin")) return true;
  const {data:links}=await admin.from("extractor_companies").select("account_id").eq("fiscal_company_id",companyId).eq("status","active");
  const ids=[...new Set((links||[]).map((x:any)=>String(x.account_id)).filter(Boolean))];
  if(!ids.length)return false;
  const {data:accounts}=await admin.from("extractor_accounts").select("id,organization_id,status,lifetime_access,access_expires_at").in("id",ids).eq("status","active");
  const now=Date.now();
  const entitled=(accounts||[]).filter((a:any)=>a.lifetime_access===true||(a.access_expires_at&&new Date(a.access_expires_at).getTime()>now));
  if(!entitled.length)return false;
  const {data:members}=await admin.from("organization_members").select("id").eq("user_id",userId).eq("status","active").in("organization_id",entitled.map((a:any)=>a.organization_id)).limit(1);
  return Boolean(members?.length);
}

function duplicatesHtml(xml:string){
  const dups=sections(tag(xml,"cobr"),"dup");
  if(!dups.length)return "";
  return '<table cellpadding="0" cellspacing="0" border="1"><tbody><tr>'+dups.map(d=>'<td><span class="nf-label">Nº '+esc(tag(d,"nDup")||"-")+'</span><span class="info">'+esc(dateOnly(tag(d,"dVenc")))+' · R$ '+esc(money(tag(d,"vDup")))+'</span></td>').join("")+'</tr></tbody></table>';
}
function itemsHtml(xml:string){
  return sections(xml,"det").map(det=>{
    const p=tag(det,"prod"),imp=tag(det,"imposto"),icms=tag(imp,"ICMS"),ipi=tag(imp,"IPI");
    const vals=[tag(p,"cProd"),tag(p,"xProd"),tag(p,"NCM"),tag(icms,"CST")||tag(icms,"CSOSN"),tag(p,"CFOP"),tag(p,"uCom"),money(tag(p,"qCom")),money(tag(p,"vUnCom")),money(tag(p,"vProd")),money(tag(icms,"vBC")),money(tag(icms,"vICMS")),money(tag(ipi,"vIPI")),tag(icms,"pICMS")||"0",tag(ipi,"pIPI")||"0"];
    return "<tr>"+vals.map((v,i)=>'<td'+(i===1?' style="white-space:normal"':'')+'>'+esc(v||"-")+"</td>").join("")+"</tr>";
  }).join("");
}
async function barcodeSvg(value:string){
  try{return bwipjs.toSVG({bcid:"code128",text:dg(value),scale:2,height:10,includetext:false,padding:0});}
  catch{return '<span style="font-size:8pt">'+esc(fmtKey(value))+"</span>";}
}

async function renderNfeHtml(doc:any,xml:string){
  let html=await loadTemplate();
  const ide=tag(xml,"ide"),emit=tag(xml,"emit"),dest=tag(xml,"dest"),tot=tag(xml,"ICMSTot"),prot=tag(xml,"infProt"),transp=tag(xml,"transp"),transporta=tag(transp,"transporta"),vol=tag(transp,"vol"),infAdic=tag(xml,"infAdic"),issqn=tag(xml,"ISSQNtot");
  const e=tag(emit,"enderEmit"),d=tag(dest,"enderDest"),veic=tag(transp,"veicTransp");
  const access=dg(doc.accessKey||tag(prot,"chNFe"));
  const issue=doc.issueDate||tag(ide,"dhEmi")||tag(ide,"dEmi"),out=tag(ide,"dhSaiEnt")||issue;
  const r:Record<string,string>={
    "[ds_company_issuer_name]":tag(emit,"xNome")||doc.issuerName||"-",
    "[ds_company_address]":[tag(e,"xLgr"),tag(e,"nro")].filter(Boolean).join(", "),
    "[ds_company_neighborhood]":tag(e,"xBairro")||"-","[nu_company_cep]":cep(tag(e,"CEP")),
    "[ds_company_city_name]":tag(e,"xMun")||"-","[ds_company_uf]":tag(e,"UF")||"-","[nl_company_phone_number]":tag(e,"fone")||"-",
    "[ds_code_operation_type]":tag(ide,"tpNF")||"-","[nl_invoice]":doc.number||tag(ide,"nNF")||"-","[ds_invoice_serie]":doc.series||tag(ide,"serie")||"-",
    "[actual_page]":"1","[total_pages]":"1","[ds_danfe]":fmtKey(access),"[_ds_transaction_nature]":tag(ide,"natOp")||"-",
    "[protocol_label]":"PROTOCOLO DE AUTORIZAÇÃO DE USO","[ds_protocol]":[tag(prot,"nProt"),dateTime(tag(prot,"dhRecbto"))].filter(Boolean).join(" - ")||"-",
    "[nl_company_ie]":tag(emit,"IE")||"-","[nl_company_ie_st]":tag(emit,"IEST")||"-","[nl_company_cnpj_cpf]":cnpjCpf(tag(emit,"CNPJ")||tag(emit,"CPF")||doc.issuerCnpj),"[ds_company_im]":tag(emit,"IM")||"-",
    "[ds_client_receiver_name]":tag(dest,"xNome")||doc.recipientName||"-","[nl_client_cnpj_cpf]":cnpjCpf(tag(dest,"CNPJ")||tag(dest,"CPF")||doc.recipientCnpj),"[dt_invoice_issue]":dateOnly(issue),
    "[ds_client_address]":[tag(d,"xLgr"),tag(d,"nro"),tag(d,"xCpl")].filter(Boolean).join(", "),"[ds_client_neighborhood]":tag(d,"xBairro")||"-","[nu_client_cep]":cep(tag(d,"CEP")),"[dt_input_output]":dateOnly(out),
    "[ds_client_city_name]":tag(d,"xMun")||"-","[nl_client_phone_number]":tag(d,"fone")||"-","[ds_client_uf]":tag(d,"UF")||"-","[ds_client_ie]":tag(dest,"IE")||"-","[hr_input_output]":timeOnly(out),
    "[tot_bc_icms]":money(tag(tot,"vBC")),"[tot_icms]":money(tag(tot,"vICMS")),"[tot_bc_icms_st]":money(tag(tot,"vBCST")),"[tot_icms_st]":money(tag(tot,"vST")),"[tot_icms_fcp]":money(tag(tot,"vFCP")),"[vl_total_prod]":money(tag(tot,"vProd")),
    "[vl_shipping]":money(tag(tot,"vFrete")),"[vl_insurance]":money(tag(tot,"vSeg")),"[vl_discount]":money(tag(tot,"vDesc")),"[vl_other_expense]":money(tag(tot,"vOutro")),"[tot_total_ipi_tax]":money(tag(tot,"vIPI")),"[vl_total]":money(tag(tot,"vNF")||doc.value),
    "[ds_transport_carrier_name]":tag(transporta,"xNome")||"-","[ds_transport_code_shipping_type]":tag(transp,"modFrete")||"-","[ds_transport_rntc]":tag(transporta,"RNTC")||"-","[ds_transport_vehicle_plate]":tag(veic,"placa")||"-","[ds_transport_vehicle_uf]":tag(veic,"UF")||"-",
    "[nl_transport_cnpj_cpf]":cnpjCpf(tag(transporta,"CNPJ")||tag(transporta,"CPF")),"[ds_transport_address]":tag(transporta,"xEnder")||"-","[ds_transport_city]":tag(transporta,"xMun")||"-","[ds_transport_uf]":tag(transporta,"UF")||"-","[ds_transport_ie]":tag(transporta,"IE")||"-",
    "[nu_transport_amount_transported_volumes]":tag(vol,"qVol")||"-","[ds_transport_type_volumes_transported]":tag(vol,"esp")||"-","[ds_transport_mark_volumes_transported]":tag(vol,"marca")||"-","[ds_transport_number_volumes_transported]":tag(vol,"nVol")||"-","[vl_transport_gross_weight]":tag(vol,"pesoB")||"-","[vl_transport_net_weight]":tag(vol,"pesoL")||"-",
    "[vl_total_serv]":money(tag(tot,"vServ")),"[tot_bc_issqn]":money(tag(issqn,"vBC")),"[tot_issqn]":money(tag(issqn,"vISS")),"[ds_additional_information]":tag(infAdic,"infCpl")||"-",
    "[page-break]":"","[url_logo]":"data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=","{ApproximateTax}":money(tag(tot,"vTotTrib")),
    "[duplicates]":duplicatesHtml(xml),"[items]":itemsHtml(xml),"{BarCode}":await barcodeSvg(access)
  };
  for(const [k,v] of Object.entries(r)){const raw=k==="[duplicates]"||k==="[items]"||k==="{BarCode}"||k==="[url_logo]"?v:esc(v);html=html.split(k).join(raw);}
  html=html.replace(/<footer>[\s\S]*?<\/footer>/i,"").replace(/<img class="client_logo"[^>]*>/i,"");
  html=html.replace("</style>",'.nfeArea.page{margin:0 auto!important;background:#fff!important}body{margin:0;padding:12px;background:#fff}.boxProdutoServico tbody td{vertical-align:top;line-height:1.12em}@media screen{body{display:flex;justify-content:center;align-items:flex-start}}</style>');
  return html;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  if(req.method!=="POST")return J({error:"Método não permitido"},405);
  try{
    const auth=req.headers.get("authorization")||"";if(!auth)return J({error:"Não autenticado"},401);
    const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const {data:{user}}=await admin.auth.getUser(auth.replace(/^Bearer\s+/i,""));if(!user)return J({error:"Não autenticado"},401);
    const denied=limited(await consume(admin,"dfe-nfe-html-template",user.id,360,600));if(denied)return denied;
    const body=await readJsonLimited(req,2900000),doc=body.document||{},companyId=String(body.company_id||""),xml=unwrapStoredFiscalXml(doc.xml||"");
    if(!(await canAccessCompany(admin,user.id,companyId)))return J({error:"Empresa não autorizada para esta conta"},403);
    if(!xml)return J({error:"XML completo não disponível",code:"XML_REQUIRED"},422);
    const model=String(doc.model||tag(tag(xml,"ide"),"mod")||"");if(model!=="55")return J({error:"Este template é exclusivo para NF-e modelo 55"},422);
    const html=await renderNfeHtml(doc,xml);
    return J({ok:true,engine:"nfe-official-html-template",html_preview:html,access_key:dg(doc.accessKey||tag(tag(xml,"infProt"),"chNFe")),number:doc.number||tag(tag(xml,"ide"),"nNF")||"-"});
  }catch(e){return J({error:e instanceof RequestError?e.message:"Não foi possível gerar o DANFE HTML agora."},e instanceof RequestError?e.status:500);}
});