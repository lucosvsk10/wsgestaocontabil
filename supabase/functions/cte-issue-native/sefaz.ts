export type CertificadoMtls={chavePrivadaPem:string;certificadoPem:string;cadeiaPem:string[]};
const GATEWAY="https://ws-nfse-sefin-probe.vercel.app/api/fiscal-soap";
async function callGateway(cert:CertificadoMtls,gatewayToken:string,body:Record<string,unknown>){
 if(!gatewayToken)throw new Error("gateway_token_missing");
 const response=await fetch(GATEWAY,{method:"POST",headers:{"content-type":"application/json","authorization":`Bearer ${gatewayToken}`},body:JSON.stringify({...body,certificate_pem:cert.certificadoPem,private_key_pem:cert.chavePrivadaPem,chain_pem:cert.cadeiaPem||[]}),signal:AbortSignal.timeout(70000)});
 const raw=await response.text();let data:any={};try{data=JSON.parse(raw)}catch{data={error:raw.slice(0,800)}}
 if(!response.ok||!data?.ok)throw new Error(`fiscal_gateway_${response.status}:${String(data?.error||data?.response_excerpt||"transport_failed").slice(0,900)}`);
 return data;
}
export async function probeCte(cert:CertificadoMtls,environment:"homologation"|"production"="homologation",gatewayToken=""){const data=await callGateway(cert,gatewayToken,{action:"cte-probe",environment});return{ok:Boolean(data.ok),endpoint:String(data.endpoint||""),http:Number(data.http||0),wsdlDetected:Boolean(data.wsdl_detected)}}
export async function statusCte(cert:CertificadoMtls,cUF="27",environment:"homologation"|"production"="homologation",gatewayToken=""){const data=await callGateway(cert,gatewayToken,{action:"cte-status",environment,cuf:cUF});return{endpoint:String(data.endpoint||""),text:String(data.text||"")}}
export async function authorizeCte(cert:CertificadoMtls,signedXml:string,environment:"homologation"|"production"="homologation",gatewayToken=""){const data=await callGateway(cert,gatewayToken,{action:"cte-authorize",environment,signed_xml:signedXml});return{endpoint:String(data.endpoint||""),text:String(data.text||"")}}
const all=(xml:string,tag:string)=>[...xml.matchAll(new RegExp(`<(?:\\w+:)?${tag}(?:\\s[^>]*)?>([^<]*)<\\/(?:\\w+:)?${tag}>`,`g`))].map(m=>m[1]);
export function parseCteResponse(xml:string){const cStats=all(xml,"cStat"),motivos=all(xml,"xMotivo"),chaves=all(xml,"chCTe"),protocolos=all(xml,"nProt"),cStat=cStats[cStats.length-1]||cStats[0]||null;return{authorized:cStat==="100",cStat,xMotivo:motivos[motivos.length-1]||motivos[0]||null,chCTe:chaves[chaves.length-1]||null,nProt:protocolos[protocolos.length-1]||null,raw:xml}}
