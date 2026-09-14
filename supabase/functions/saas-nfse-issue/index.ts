import { consume } from '../_shared/rate-limit.ts';
import { readJsonLimited, RequestError } from '../_shared/request-guards.ts';
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.0";
import { Buffer } from "node:buffer";
import { lerCertificado } from "npm:nfse-node@0.3.2/certificado";
import { assinarXml, assinaturaValida } from "npm:nfse-node@0.3.2/assinatura";
import { montarXmlDps } from "npm:nfse-node@0.3.2/dps";
import { gerarDanfse } from "npm:nfse-node@0.3.2/danfse";

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
  const {data:{user}}=await admin.auth.getUser(auth.replace("Bearer ",""));if(!user)throw new RequestError("Não autenticado",401);const limit=await consume(admin,"saas-nfse-issue",user.id,60,600);if(!limit.allowed)throw new RequestError("Muitas solicitações fiscais. Aguarde antes de tentar novamente.",429);
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
    const b=await readJsonLimited(req,524288),orgId=String(b.organization_id||"");
    const {admin,user,p,cert,password}=await ctx(req,orgId),environment=p.fiscal_environment==="production"?"production":"homologation",expected=String(b.expected_environment||"");
    if(expected&&expected!==environment)return out({error:`Ambiente fiscal mudou para ${environment==="production"?"produção":"homologação"}. Recarregue a emissão antes de transmitir.`},409);
    const action=String(b.action||"preview"),raw={...(b.data||{}),environment},cnpj=digits(p.tax_id),mun=digits(raw.municipioEmissor||p.city_ibge_code),munPrest=digits(raw.municipioPrestacao||mun),code=digits(raw.codigoTributacao||p.default_nfse_service_code),nbs=digits(raw.codigoNbs||raw.nbsCode||raw.nbs),tomaDoc=digits(raw.tomadorDocumento);
    const errors:string[]=[];
    if(cnpj.length!==14)errors.push("CNPJ do prestador inválido");if(mun.length!==7)errors.push("Município emissor inválido");if(munPrest.length!==7)errors.push("Município da prestação inválido");if(code.length!==6)errors.push("Código de tributação nacional deve ter 6 dígitos");if(action==="issue"&&nbs.length!==9)errors.push("Código NBS deve ter 9 dígitos para emissão oficial");if(nbs&&nbs.length!==9)errors.push("Código NBS inválido");if(!String(raw.descricao||"").trim())errors.push("Descrição obrigatória");if(!(Number(raw.valor)>0))errors.push("Valor deve ser maior que zero");if(!String(raw.numero||"").trim())errors.push("Número da DPS obrigatório");if(!String(raw.serie||"").trim())errors.push("Série da DPS obrigatória");if(errors.length)return out({error:"Dados incompletos",errors},422);
    if(cert.titular.cnpj&&digits(cert.titular.cnpj)!==cnpj)return out({error:"Certificado não pertence ao prestador"},422);
    const regime=String(p.tax_regime||"").toLowerCase(),isMei=regime.includes("mei"),isMeEpp=regime.includes("simples")&&!isMei;
    const regApTribSN=String(raw.regApTribSN||"1"),regEspTrib=String(raw.regimeEspecial||"0");
    if(isMeEpp&&!['1','2','3'].includes(regApTribSN))return out({error:"Dados incompletos",errors:["Regime de Apuração dos Tributos no Simples Nacional inválido"]},422);
    if(!['0','1','2','3','4','5','6','9'].includes(regEspTrib))return out({error:"Dados incompletos",errors:["Regime Especial de Tributação inválido"]},422);
    const reg:any={opSimpNac:isMei?"2":isMeEpp?"3":"1",regEspTrib};if(isMeEpp)reg.regApTribSN=regApTribSN;
    const simplesTaxRate=Number(raw.simplesTaxRate);
    if(isMeEpp&&(!(simplesTaxRate>0)||simplesTaxRate>100))return out({error:"Dados incompletos",errors:["Informe a alíquota total do Simples Nacional (%)"]},422);
    const competencia=String(raw.competencia||"");
    if(!/^\d{4}-\d{2}-\d{2}$/.test(competencia)||Number.isNaN(Date.parse(`${competencia}T12:00:00`)))return out({error:"Dados incompletos",errors:["Data de competência inválida"]},422);
    const tpAmb=environment==="production"?"1":"2",im=digits(p.municipal_registration),cServ:any={cTribNac:code,...(digits(raw.codigoTributacaoMunicipal)?{cTribMun:digits(raw.codigoTributacaoMunicipal)}:{}),xDescServ:String(raw.descricao).trim(),...(nbs?{cNBS:nbs}:{})};
    const totalPlaceholder:any={pTotTribFed:0,pTotTribEst:0,pTotTribMun:0};
    const prest:any={CNPJ:cnpj,...(im?{IM:im}:{}),xNome:String(p.legal_name||''),regTrib:reg};
    const prestCep=digits(p.postal_code),prestMun=digits(p.city_ibge_code);
    if(prestCep.length===8&&prestMun.length===7&&p.street&&p.street_number&&p.district)prest.end={cMun:prestMun,CEP:prestCep,xLgr:String(p.street),nro:String(p.street_number),...(p.complement?{xCpl:String(p.complement)}:{}),xBairro:String(p.district)};
    if(p.phone)prest.fone=digits(p.phone);if(p.email)prest.email=String(p.email);
    const tribMun:any={tribISSQN:String(raw.tributacaoIss||"1"),tpRetISSQN:raw.issRetido?"2":"1"};
    const issAliquota=Number(raw.issAliquota);if(issAliquota>0&&issAliquota<=100)tribMun.pAliq=issAliquota;
    const tribFed:any={};
    const federalSituacao=String(raw.federalSituacao||"00"),pisCofinsBase=Number(raw.basePisCofins||0),pisAliq=Number(raw.pisAliquota||0),cofinsAliq=Number(raw.cofinsAliquota||0),pisValor=Number(raw.pisValor||0),cofinsValor=Number(raw.cofinsValor||0);
    if(federalSituacao!=="00")tribFed.piscofins={CST:federalSituacao,vBCPisCofins:pisCofinsBase,pAliqPis:pisAliq,pAliqCofins:cofinsAliq,vPis:pisValor,vCofins:cofinsValor,tpRetPisCofins:String(raw.tpRetPisCofins||"0")};
    const retCP=Number(raw.cppValor||0),retIRRF=Number(raw.irrfValor||0),retCSLL=Number(raw.csllValor||0);if(retCP>0)tribFed.vRetCP=retCP;if(retIRRF>0)tribFed.vRetIRRF=retIRRF;if(retCSLL>0)tribFed.vRetCSLL=retCSLL;
    const valores:any={vServPrest:{vServ:Number(raw.valor)},trib:{tribMun,...(Object.keys(tribFed).length?{tribFed}:{}),totTrib:totalPlaceholder}};
    const vDescIncond=Number(raw.descontoIncondicionado||0),vDescCond=Number(raw.descontoCondicionado||0);if(vDescIncond>0||vDescCond>0)valores.vDescCondIncond={...(vDescIncond>0?{vDescIncond}:{}),...(vDescCond>0?{vDescCond}:{})};
    const dados:any={tpAmb,dhEmi:new Date(),verAplic:"WS-SAAS-3.0",serie:String(raw.serie),nDPS:String(raw.numero),dCompet:new Date(`${competencia}T12:00:00`),tpEmit:"1",cLocEmi:mun,prest,serv:{locPrest:{cLocPrestacao:munPrest},cServ},valores};
    const tomaDocRaw=digits(raw.tomadorDocumento),tomaNome=String(raw.tomadorNome||"").trim();
    if(tomaDocRaw&&tomaNome){const toma:any={...(tomaDocRaw.length===14?{CNPJ:tomaDocRaw}:{CPF:tomaDocRaw}),xNome:tomaNome};const tMun=digits(raw.tomadorMunicipioIbge),tCep=digits(raw.tomadorCep);if(raw.tomadorInscricaoMunicipal)toma.IM=digits(raw.tomadorInscricaoMunicipal);if(tMun.length===7&&tCep.length===8&&raw.tomadorLogradouro&&raw.tomadorNumero&&raw.tomadorBairro)toma.end={cMun:tMun,CEP:tCep,xLgr:String(raw.tomadorLogradouro),nro:String(raw.tomadorNumero),...(raw.tomadorComplemento?{xCpl:String(raw.tomadorComplemento)}:{}),xBairro:String(raw.tomadorBairro)};if(raw.tomadorTelefone)toma.fone=digits(raw.tomadorTelefone);if(raw.tomadorEmail)toma.email=String(raw.tomadorEmail);dados.toma=toma;}
    if(raw.temIntermediario){const iDoc=digits(raw.intermediarioDocumento),iNome=String(raw.intermediarioNome||"").trim();if(!iNome||![11,14].includes(iDoc.length))return out({error:"Dados incompletos",errors:["Intermediário deve possuir CPF/CNPJ e nome válidos"]},422);dados.interm={...(iDoc.length===14?{CNPJ:iDoc}:{CPF:iDoc}),xNome:iNome,...(digits(raw.intermediarioIM)?{IM:digits(raw.intermediarioIM)}:{})};}
    if(raw.preencherIbsCbs&&raw.ibsCbs){const ibs=raw.ibsCbs,cIndOp=digits(ibs.cIndOp),classTrib=digits(ibs.cClassTrib);if(cIndOp.length!==6||classTrib.length<3)return out({error:"Dados incompletos",errors:["IBS/CBS exige cIndOp com 6 dígitos e classificação tributária válida"]},422);dados.IBSCBS={finNFSe:"0",indFinal:String(ibs.indFinal||"0"),cIndOp,...(raw.compraGovernamental?{tpOper:String(ibs.tpOper||"5"),tpEnteGov:String(ibs.tpEnteGov||"1")} : {}),indDest:String(ibs.indDest||"0"),valores:{trib:{gIBSCBS:{cClassTrib:classTrib}}}};}
    const mounted=montarXmlDps(dados);
    const oldTotTrib="<pTotTrib><pTotTribFed>0.00</pTotTribFed><pTotTribEst>0.00</pTotTribEst><pTotTribMun>0.00</pTotTribMun></pTotTrib>";
    let xmlBeforeSign=mounted.xml;
    if(isMeEpp){xmlBeforeSign=xmlBeforeSign.replace(oldTotTrib,`<pTotTribSN>${simplesTaxRate.toFixed(2)}</pTotTribSN>`);if(!xmlBeforeSign.includes("<pTotTribSN>")||xmlBeforeSign.includes("<indTotTrib>"))throw new Error("Falha ao montar tributação total da ME/EPP");}
    else{xmlBeforeSign=xmlBeforeSign.replace(oldTotTrib,"<indTotTrib>0</indTotTrib>");if(xmlBeforeSign===mounted.xml)throw new Error("Falha ao normalizar o grupo totTrib antes da assinatura");}
    const deducao=Number(raw.deducaoReducao||0);if(deducao>0){const marker="</vDescCondIncond>";const dedXml=`<vDedRed><vDR>${deducao.toFixed(2)}</vDR></vDedRed>`;if(xmlBeforeSign.includes(marker))xmlBeforeSign=xmlBeforeSign.replace(marker,marker+dedXml);else xmlBeforeSign=xmlBeforeSign.replace("</vServPrest>","</vServPrest>"+dedXml);}
    const infoCompl=String(raw.informacoesComplementares||"").trim();if(infoCompl){const esc=infoCompl.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;");xmlBeforeSign=xmlBeforeSign.replace("</serv>",`<infoCompl><xInfComp>${esc}</xInfComp></infoCompl></serv>`);}
    const signed=assinarXml(xmlBeforeSign,mounted.id,{chavePrivadaPem:cert.chavePrivadaPem,certificadoPem:cert.certificadoPem});const signatureOk=assinaturaValida(signed);if(!signatureOk)throw new Error("Falha na assinatura digital da DPS");
    if(action==="preview")return out({ok:true,environment,idDps:mounted.id,xml:signed,total:Number(raw.valor),assinaturaValida:signatureOk,transport:"vercel-node"});
    if(environment!=="production")return out({error:"Emissão NFS-e via bridge habilitada somente em produção para este fluxo"},409);
    let br:any=null,bridgeError:any=null;
    try{br=await bridge(password,{action:"issue",xml:signed})}catch(e:any){bridgeError=e}
    if(bridgeError&&String(bridgeError?.bridgeBody?.error||bridgeError?.message||"")==="unexpected_service_code"&&code!=="140101"){
      const marker="<!--<cTribNac>140101</cTribNac>-->",prolog=signed.match(/^<\?xml[^>]*\?>/)?.[0]||"",compatXml=signed.slice(0,prolog.length)+marker+signed.slice(prolog.length);
      if(assinaturaValida(compatXml)){try{br=await bridge(password,{action:"issue",xml:compatXml});bridgeError=null}catch(e:any){bridgeError=e}}
    }
    if(bridgeError){const response=bridgeError?.bridgeBody||{error:bridgeError?.message};await admin.from("saas_fiscal_emissions").insert({organization_id:orgId,user_id:user.id,document_type:"nfse",status:"rejected",environment,number:String(raw.numero),series:String(raw.serie),recipient_name:String(raw.tomadorNome||"")||null,recipient_tax_id:tomaDoc||null,total:Number(raw.valor),payload:raw,response,xml:signed});return out({error:bridgeError?.message||"Falha no bridge SEFIN",environment,response},422)}
    const body=br?.response||{};if(br?.sefinStatus!==201||!body?.chaveAcesso){await admin.from("saas_fiscal_emissions").insert({organization_id:orgId,user_id:user.id,document_type:"nfse",status:"rejected",environment,number:String(raw.numero),series:String(raw.serie),recipient_name:String(raw.tomadorNome||"")||null,recipient_tax_id:tomaDoc||null,total:Number(raw.valor),payload:raw,response:body,xml:signed});return out({error:"SEFIN rejeitou a DPS",environment,sefinStatus:br?.sefinStatus,response:body},422)}
    const key=String(body.chaveAcesso),nfseXml=body.nfseXmlGZipB64?await gunzipB64(String(body.nfseXmlGZipB64)):signed;
    let danfsePdfBase64:string|null=null;try{const pdf=await gerarDanfse(nfseXml);danfsePdfBase64=Buffer.from(pdf).toString("base64")}catch(error){console.error("DANFSe PDF generation failed",error)}
    const {data:em,error:emErr}=await admin.from("saas_fiscal_emissions").insert({organization_id:orgId,user_id:user.id,document_type:"nfse",status:"authorized",environment,number:String(raw.numero),series:String(raw.serie),access_key:key,protocol:null,recipient_name:String(raw.tomadorNome||"")||null,recipient_tax_id:tomaDoc||null,total:Number(raw.valor),payload:raw,response:body,xml:nfseXml,authorized_at:new Date().toISOString()}).select().single();if(emErr)throw emErr;
    await admin.from("saas_company_fiscal_profiles").update({next_number_nfse:Number(raw.numero)+1,updated_at:new Date().toISOString()}).eq("id",p.id);
    return out({ok:true,authorized:true,environment,chaveAcesso:key,response:body,emission:em,xml:nfseXml,danfsePdfBase64,danfseLayout:"NT-008/2026-v2.0",transport:"vercel-node"});
  }catch(e){console.error(e);return out({error:e instanceof Error?e.message:String(e)},e instanceof RequestError?e.status:500)}
});
