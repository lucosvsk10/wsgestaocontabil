export type CertificadoMtls={chavePrivadaPem:string;certificadoPem:string;cadeiaPem:string[]};
const GATEWAY="https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap";
async function callGateway(cert:CertificadoMtls,gatewayToken:string,body:Record<string,unknown>){
 if(!gatewayToken)throw new Error("gateway_token_missing");
 const response=await fetch(GATEWAY,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${gatewayToken}`},body:JSON.stringify({...body,certificate_pem:cert.certificadoPem,private_key_pem:cert.chavePrivadaPem,chain_pem:cert.cadeiaPem||[]}),signal:AbortSignal.timeout(70000)});
 const raw=await response.text();let data:any={};try{data=JSON.parse(raw)}catch{data={error:raw.slice(0,800)}}
 if(!response.ok||!data?.ok)throw new Error(`fiscal_gateway_${response.status}:${String(data?.error||data?.response_excerpt||"transport_failed").slice(0,900)}`);
 return data;
}
export async function probeNfeNative(cert:CertificadoMtls,model:"55"|"65",environment:"homologation"|"production"="homologation",gatewayToken=""){
 const data=await callGateway(cert,gatewayToken,{action:"nfe-probe",model,environment});
 return{ok:Boolean(data.ok),endpoint:String(data.endpoint||""),http:Number(data.http||0),wsdlDetected:Boolean(data.wsdl_detected)};
}
export async function authorizeNfeNative(cert:CertificadoMtls,model:"55"|"65",signedXml:string,environment:"homologation"|"production"="homologation",gatewayToken=""){
 const data=await callGateway(cert,gatewayToken,{action:"nfe-authorize",model,environment,signed_xml:signedXml});
 return{text:String(data.text||""),endpoint:String(data.endpoint||""),idLote:String(data.idLote||"")};
}
export function parseAuthorization(xml:string){const all=(tag:string)=>[...xml.matchAll(new RegExp(`<${tag}>([^<]*)</${tag}>`,`g`))].map(m=>m[1]),cStats=all("cStat"),motivos=all("xMotivo"),chaves=all("chNFe"),protocolos=all("nProt"),lotStatus=cStats[0]||null,protocolStatus=cStats.length>1?cStats[cStats.length-1]:null,authorized=protocolStatus==="100"||lotStatus==="100";return{authorized,lot:{cStat:lotStatus,xMotivo:motivos[0]||null},protocol:{cStat:protocolStatus,xMotivo:motivos.length>1?motivos[motivos.length-1]:null,chNFe:chaves[chaves.length-1]||null,nProt:protocolos[protocolos.length-1]||null},raw:xml}}
