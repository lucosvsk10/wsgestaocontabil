import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";
import { assinarXml, assinaturaValida } from "npm:nfse-node@0.3.2/assinatura";
import { montarXmlDps } from "npm:nfse-node@0.3.2/dps";

const cors={"Access-Control-Allow-Origin":"*","Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type"};
const out=(b:unknown,s=200)=>new Response(JSON.stringify(b),{status:s,headers:{...cors,"Content-Type":"application/json"}});
const digits=(v:unknown)=>String(v??"").replace(/\D/g,"");
const BRIDGE_URL="https://ws-nfse-sefin-probe.vercel.app/api/nfse";

async function sha256Hex(value:string){const bytes=new TextEncoder().encode(value);const hash=await crypto.subtle.digest("SHA-256",bytes);return [...new Uint8Array(hash)].map(x=>x.toString(16).padStart(2,"0")).join("")}
async function gunzipB64(v:string){const raw=Uint8Array.from(atob(v),c=>c.charCodeAt(0));const ds=new DecompressionStream("gzip");return await new Response(new Blob([raw]).stream().pipeThrough(ds)).text()}

async function loadCertificate(admin:any,p:any,orgId:string){
  const {data:bundle}=await admin.rpc("get_saas_certificate_bundle",{_org_id:orgId});
  if(bundle?.pfx_base64&&bundle?.password){const password=String(bundle.password);return{cert:lerCertificado(Buffer.from(String(bundle.pfx_base64),"base64"),password),password}}
  if(!p.certificate_storage_path)throw new Error("Configure o certificado A1");
  const {data:file,error}=await admin.storage.from("saas-private").download(p.certificate_storage_path);
  if(error||!file)throw new Error("Certificado A1 indisponível");
  const {data:pass}=await admin.rpc("get_saas_certificate_password",{_org_id:orgId});
  if(!pass)throw new Error("Senha do A1 indisponível");
  const password=String(pass);return{cert:lerCertificado(Buffer.from(await file.arrayBuffer()),password),password}
}

async function ctx(req:Request,orgId:string){
  const admin=createClient(Deno.env.get("SUPABASE_URL")!,Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const auth=req.headers.get("Authorization");if(!auth)throw new Error("Não autenticado");
  const {data:{user}}=await admin.auth.getUser(auth.replace("Bearer ",""));if(!user)throw new Error("Não autenticado");
  const {data:m}=await admin.from("organization_members").select("role").eq("organization_id",orgId).eq("user_id",user.id).eq("status","active").maybeSingle();
  if(!m||!["owner","admin","member"].includes(m.role))throw new Error("Sem permissão para emitir");
  const {data:p}=await admin.from("saas_company_fiscal_profiles").select("*").eq("organization_id",orgId).order("created_at").limit(1).maybeSingle();
  if(!p)throw new Error("Configure a empresa");
  const {cert,password}=await loadCertificate(admin,p,orgId);return{admin,user,p,cert,password}
}

async function bridge(password:string,payload:any){
  const token=await sha256Hex("ws-nfse-bridge:"+password);
  const r=await fetch(BRIDGE_URL,{method:"POST",headers:{"Authorization":`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(payload)});
  let body:any=null;try{body=await r.json()}catch{body={error:`Bridge HTTP ${r.status}`}}
  if(!r.ok)throw Object.assign(new Error(body?.error||`Bridge HTTP ${r.status}`),{bridgeBody:body});
  return body;
}

Deno.serve(async req=>{
  if(req.method==="OPTIONS")return new Response(null,{headers:cors});
  try{
    const b=await req.json(),orgId=String(b.organization_id||"");
    const {admin,user,p,cert,password}=await ctx(req,orgId),environment=p.fiscal_environment==="production"?"production":"homologation",expected=String(b.expected_environment||"");
    if(expected&&expected!==environment)return out({error:`Ambiente fiscal mudou para ${environment==="production"?"produção":"homologação"}. Recarregue a emissão antes de transmitir.`},409);
    const raw={...(b.data||{}),environment},cnpj=digits(p.tax_id),mun=digits(raw.municipioEmissor||p.city_ibge_code),munPrest=digits(raw.municipioPrestacao||mun),code=digits(raw.codigoTributacao||p.default_nfse_service_code),tomaDoc=digits(raw.tomadorDocumento);
    const errors:string[]=[];
    if(cnpj.length!==14)errors.push("CNPJ do prestador inválido");if(mun.length!==7)errors.push("Município emissor inválido");if(munPrest.length!==7)errors.push("Município da prestação inválido");if(code.length!==6)errors.push("Código de tributação nacional deve ter 6 dígitos");if(!String(raw.descricao||"").trim())errors.push("Descrição obrigatória");if(!(Number(raw.valor)>0))errors.push("Valor deve ser maior que zero");if(!String(raw.numero||"").trim())errors.push("Número da DPS obrigatório");if(!String(raw.serie||"").trim())errors.push("Série da DPS obrigatória");if(errors.length)return out({error:"Dados incompletos",errors},422);
    if(cert.titular.cnpj&&digits(cert.titular.cnpj)!==cnpj)return out({error:"Certificado não pertence ao prestador"},422);
    const isSimples=String(p.tax_regime||"").toLowerCase().includes("simples");const reg:any={opSimpNac:isSimples?"3":String(raw.simples||"2"),regEspTrib:"0"};if(reg.opSimpNac==="3")reg.regApTribSN="1";
    const tpAmb=environment==="production"?"1":"2",im=digits(p.municipal_registration),dados:any={tpAmb,dhEmi:new Date(),verAplic:"WS-SAAS-2.1",serie:String(raw.serie),nDPS:String(raw.numero),dCompet:new Date(),tpEmit:"1",cLocEmi:mun,prest:{CNPJ:cnpj,...(im?{IM:im}:{}),regTrib:reg},serv:{locPrest:{cLocPrestacao:munPrest},cServ:{cTribNac:code,xDescServ:String(raw.descricao).trim()}},valores:{vServPrest:{vServ:Number(raw.valor)},trib:{tribMun:{tribISSQN:String(raw.tributacaoIss||"1"),tpRetISSQN:raw.issRetido?"2":"1"},totTrib:{pTotTribFed:0,pTotTribEst:0,pTotTribMun:0}}}};
    if(tomaDoc)dados.toma={...(tomaDoc.length===14?{CNPJ:tomaDoc}:{CPF:tomaDoc}),xNome:String(raw.tomadorNome||"Tomador")};
    const mounted=montarXmlDps(dados);const oldTotTrib="<pTotTrib><pTotTribFed>0.00</pTotTribFed><pTotTribEst>0.00</pTotTribEst><pTotTribMun>0.00</pTotTribMun></pTotTrib>";const xmlBeforeSign=mounted.xml.replace(oldTotTrib,"<indTotTrib>0</indTotTrib>");if(xmlBeforeSign===mounted.xml)throw new Error("Falha ao normalizar o grupo totTrib antes da assinatura");
    const signed=assinarXml(xmlBeforeSign,mounted.id,{chavePrivadaPem:cert.chavePrivadaPem,certificadoPem:cert.certificadoPem});const signatureOk=assinaturaValida(signed);if(!signatureOk)throw new Error("Falha na assinatura digital da DPS");
    if(String(b.action||"preview")==="preview")return out({ok:true,environment,idDps:mounted.id,xml:signed,total:Number(raw.valor),assinaturaValida:signatureOk,transport:"vercel-node"});
    if(environment!=="production")return out({error:"Emissão NFS-e via bridge habilitada somente em produção para este fluxo"},409);
    let br:any;try{br=await bridge(password,{action:"issue",xml:signed})}catch(e:any){const response=e?.bridgeBody||{error:e?.message};await admin.from("saas_fiscal_emissions").insert({organization_id:orgId,user_id:user.id,document_type:"nfse",status:"rejected",environment,number:String(raw.numero),series:String(raw.serie),recipient_name:String(raw.tomadorNome||"")||null,recipient_tax_id:tomaDoc||null,total:Number(raw.valor),payload:raw,response,xml:signed});return out({error:e?.message||"Falha no bridge SEFIN",environment,response},422)}
    const body=br?.response||{};if(br?.sefinStatus!==201||!body?.chaveAcesso){await admin.from("saas_fiscal_emissions").insert({organization_id:orgId,user_id:user.id,document_type:"nfse",status:"rejected",environment,number:String(raw.numero),series:String(raw.serie),recipient_name:String(raw.tomadorNome||"")||null,recipient_tax_id:tomaDoc||null,total:Number(raw.valor),payload:raw,response:body,xml:signed});return out({error:"SEFIN rejeitou a DPS",environment,sefinStatus:br?.sefinStatus,response:body},422)}
    const key=String(body.chaveAcesso),nfseXml=body.nfseXmlGZipB64?await gunzipB64(String(body.nfseXmlGZipB64)):signed;
    const {data:em,error:emErr}=await admin.from("saas_fiscal_emissions").insert({organization_id:orgId,user_id:user.id,document_type:"nfse",status:"authorized",environment,number:String(raw.numero),series:String(raw.serie),access_key:key,protocol:null,recipient_name:String(raw.tomadorNome||"")||null,recipient_tax_id:tomaDoc||null,total:Number(raw.valor),payload:raw,response:body,xml:nfseXml,authorized_at:new Date().toISOString()}).select().single();if(emErr)throw emErr;
    await admin.from("saas_company_fiscal_profiles").update({next_number_nfse:Number(raw.numero)+1,updated_at:new Date().toISOString()}).eq("id",p.id);
    return out({ok:true,authorized:true,environment,chaveAcesso:key,response:body,emission:em,xml:nfseXml,transport:"vercel-node"});
  }catch(e){console.error(e);return out({error:e instanceof Error?e.message:String(e)},500)}
});