import type { DanfseData } from "./types.ts";

const clean=(v:unknown)=>String(v??"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();
const tag=(xml:string,name:string)=>{
  const m=xml.match(new RegExp("<(?:[A-Za-z0-9_]+:)?"+name+"\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?"+name+">","i"));
  return clean(m?.[1]??"");
};
const tagAny=(xml:string,names:string[])=>{for(const n of names){const v=tag(xml,n);if(v)return v;}return "";};
const section=(xml:string,name:string)=>{
  const m=xml.match(new RegExp("<(?:[A-Za-z0-9_]+:)?"+name+"\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?"+name+">","i"));
  return m?.[1]??"";
};
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const money=(v:unknown)=>{const n=Number(String(v??"0").replace(",","."));return Number.isFinite(n)?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n):"-";};
const moneyOrDash=(v:unknown)=>{const s=clean(v);if(!s)return "-";const n=Number(s.replace(",","."));return !Number.isFinite(n)||n===0?"-":money(n);};
const cnpjCpf=(v:unknown)=>{const d=dg(v);if(d.length===14)return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5");if(d.length===11)return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4");return d||"-";};
const cep=(v:unknown)=>{const d=dg(v);return d.length===8?d.replace(/^(\d{5})(\d{3})$/,"$1-$2"):d||"-";};
const phone=(v:unknown)=>{const d=dg(v);if(d.length===11)return d.replace(/^(\d{2})(\d{5})(\d{4})$/,"($1) $2-$3");if(d.length===10)return d.replace(/^(\d{2})(\d{4})(\d{4})$/,"($1) $2-$3");return d||"-";};
const fmtDate=(v:unknown)=>{const s=clean(v);if(!s)return "-";const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleDateString("pt-BR",{timeZone:"America/Maceio"});};
const fmtDateTime=(v:unknown)=>{const s=clean(v);if(!s)return "-";const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleString("pt-BR",{timeZone:"America/Maceio",hour12:false}).replace(",","");};
const cleanParts=(...xs:unknown[])=>xs.map(clean).filter(Boolean).filter(v=>!/^(null|undefined)$/i.test(v)).join(", ");\nconst uniqueParts=(...xs:unknown[])=>[...new Set(xs.map(clean).filter(Boolean).filter(v=>!/^(null|undefined)$/i.test(v)))].join(", ");
const ufFromIbge=(v:unknown)=>{const code=dg(v).slice(0,2);const map:Record<string,string>={11:"RO",12:"AC",13:"AM",14:"RR",15:"PA",16:"AP",17:"TO",21:"MA",22:"PI",23:"CE",24:"RN",25:"PB",26:"PE",27:"AL",28:"SE",29:"BA",31:"MG",32:"ES",33:"RJ",35:"SP",41:"PR",42:"SC",43:"RS",50:"MS",51:"MT",52:"GO",53:"DF"};return map[code]||"-";};
const fmtIbge=(v:unknown)=>{const d=dg(v);return d.length===7?d.replace(/^(\d{2})(\d{5})$/,"$1.$2"):d||"-";};
const fmtTrib=(v:unknown)=>{const d=dg(v);return d.length===6?d.replace(/^(\d{2})(\d{2})(\d{2})$/,"$1.$2.$3"):d||"-";};
const fmtNbs=(v:unknown)=>{const d=dg(v);return d.length===9?d.slice(0,1)+"."+d.slice(1,5)+"."+d.slice(5,7)+"."+d.slice(7):d||"-";};

const cityCache=new Map<string,string>();
async function cityName(code:unknown,explicit?:unknown){
  const e=clean(explicit);if(e&&e!=="-")return e;
  const id=dg(code);if(!id)return "-";
  const cached=cityCache.get(id);if(cached)return cached;
  try{
    const r=await fetch("https://servicodados.ibge.gov.br/api/v1/localidades/municipios/"+id,{signal:AbortSignal.timeout(1800)});
    if(r.ok){const j=await r.json();const n=clean(j?.nome);if(n){cityCache.set(id,n);return n;}}
  }catch{}
  const fallback:Record<string,string>={"2700300":"Arapiraca","2704401":"Major Isidoro"};
  return fallback[id]||"-";
}
const simpleLabel=(c:string)=>({"1":"Não Optante pelo Simples Nacional","2":"Optante - Microempreendedor Individual (MEI)","3":"Optante - Microempresa ou Empresa de Pequeno Porte"}[c]||c||"-");
const regimeLabel=(c:string)=>({"1":"Regime de apuração dos tributos federais e municipal pelo Simples Nacional","2":"Regime de apuração dos tributos federais pelo Simples Nacional e ISSQN por fora do Simples Nacional","3":"Regime de apuração dos tributos federais e municipal fora do Simples Nacional"}[c]||c||"-");
const retentionLabel=(c:string)=>c==="1"?"Não Retido":(c==="2"||c==="3")?"Retido":c||"-";

export async function parseDanfse(xml:string,doc:any):Promise<DanfseData>{
  const inf=section(xml,"infNFSe")||xml;
  const emit=section(inf,"emit"),endE=section(emit,"enderNac");
  const dps=section(inf,"DPS")||section(xml,"DPS"),infDps=section(dps,"infDPS")||dps||inf;
  const prest=section(infDps,"prest"),regTrib=section(prest,"regTrib");
  const toma=section(infDps,"toma"),endT=section(toma,"end"),endTN=section(endT,"endNac")||endT;
  const serv=section(infDps,"serv"),locPrest=section(serv,"locPrest"),cServ=section(serv,"cServ");
  const dpsVals=section(infDps,"valores"),vServPrest=section(dpsVals,"vServPrest"),trib=section(dpsVals,"trib");
  const tribMun=section(trib,"tribMun"),tribFed=section(trib,"tribFed"),pisCofins=section(tribFed,"piscofins");
  const vals=section(inf,"valores");
  const key=dg(doc?.accessKey||tag(inf,"Id").replace(/^NFS/i,""));
  const issue=tagAny(infDps,["dhEmi","dhEmissao"])||doc?.issueDate;
  const comp=tagAny(inf,["dCompet"])||tagAny(infDps,["dCompet"])||doc?.competency||issue;
  const issueCode=tag(endE,"cMun")||tagAny(infDps,["cLocEmi","cMunEmi"]);
  const tomaCode=tag(endTN,"cMun")||tagAny(toma,["cMun","cLoc"]);
  const prestCode=tagAny(locPrest,["cLocPrestacao","cMun"])||issueCode;
  const incidCode=tagAny(inf,["cLocIncid"])||tagAny(tribMun,["cLocIncid"])||prestCode;
  const issueUf=tag(endE,"UF")||ufFromIbge(issueCode),tomaUf=tag(endT,"UF")||ufFromIbge(tomaCode),prestUf=ufFromIbge(prestCode),incidUf=ufFromIbge(incidCode);
  const issueCity=await cityName(issueCode,tagAny(inf,["xLocEmi"])||doc?.issuerCity);
  const tomaCity=await cityName(tomaCode,tagAny(toma,["xMun","xLoc"])||doc?.recipientCity);
  const prestCity=await cityName(prestCode,tagAny(locPrest,["xLocPrestacao","xMun"]));
  const incidCity=await cityName(incidCode,tagAny(inf,["xLocIncid"]));
  const serviceValue=tag(vServPrest,"vServ")||doc?.value||tag(vals,"vLiq"),liquidValue=tag(vals,"vLiq")||serviceValue;
  const emitCode=tag(inf,"tpEmit")||tag(infDps,"tpEmit")||"1";
  const infoCompl=section(serv,"infoCompl")||section(serv,"infCompl")||serv;\n  const additional=uniqueParts(tagAny(infoCompl,["xInfComp","infCpl","xInfCpl"]),tagAny(infDps,["infCpl","xInfComp","xInfCpl"]),tagAny(inf,["infCpl","xInfComp","xInfCpl"]));
  return {
    accessKey:key,number:tag(inf,"nNFSe")||String(doc?.number||"-"),competency:fmtDate(comp),issueDate:fmtDateTime(issue),
    dpsNumber:tag(infDps,"nDPS")||"-",dpsSeries:tag(infDps,"serie")||String(doc?.series||"-"),dpsIssueDate:fmtDateTime(issue),
    emitterType:emitCode==="2"?"Tomador":emitCode==="3"?"Intermediário":"Prestador",
    status:tag(inf,"cStat")==="100"?"NFS-e Gerada":tag(inf,"cStat")||doc?.statusText||"-",purpose:tagAny(infDps,["finNFSe","finNfse"])||"-",
    issueCity,issueUf,generatorEnvironment:tag(inf,"ambGer")||"-",environmentType:tag(infDps,"tpAmb")||tag(inf,"tpAmb")||"-",
    prestador:{name:tag(emit,"xNome")||doc?.issuerName||"-",doc:cnpjCpf(tag(emit,"CNPJ")||tag(emit,"CPF")||doc?.issuerCnpj),municipalRegistration:tag(emit,"IM")||tag(prest,"IM")||"-",phone:phone(tag(emit,"fone")||tag(prest,"fone")),address:cleanParts(tag(endE,"xLgr"),tag(endE,"nro"),tag(endE,"xCpl"),tag(endE,"xBairro")),cityUf:issueCity+" / "+issueUf,ibgeCep:fmtIbge(issueCode)+" / "+cep(tag(endE,"CEP")),email:tag(emit,"email")||tag(prest,"email")||"-",simpleNational:simpleLabel(tag(regTrib,"opSimpNac")),taxRegime:regimeLabel(tag(regTrib,"regApTribSN"))},
    tomador:{name:tag(toma,"xNome")||doc?.recipientName||"-",doc:cnpjCpf(tag(toma,"CNPJ")||tag(toma,"CPF")||doc?.recipientCnpj),municipalRegistration:tag(toma,"IM")||"-",phone:phone(tag(toma,"fone")),address:cleanParts(tag(endT,"xLgr"),tag(endT,"nro"),tag(endT,"xCpl"),tag(endT,"xBairro")),cityUf:tomaCity+" / "+tomaUf,ibgeCep:fmtIbge(tomaCode)+" / "+cep(tag(endTN,"CEP")),email:tag(toma,"email")||"-"},
    service:{nationalMunicipalCode:fmtTrib(tag(cServ,"cTribNac"))+" / "+(tag(cServ,"cTribMun")||""),nbs:fmtNbs(tag(cServ,"cNBS")),location:prestCity+" / "+prestUf+" / "+(tag(locPrest,"cPaisPrestacao")||""),classification:tagAny(inf,["xTribNac"])||tagAny(cServ,["xTribNac"])||"-",description:tag(cServ,"xDescServ")||"-"},
    municipalTax:{type:tag(tribMun,"tribISSQN")==="1"?"Operação Tributável":tag(tribMun,"tribISSQN")||"-",incidence:incidCity+" / "+incidUf+" / ",base:moneyOrDash(tag(tribMun,"vBC")),rate:tag(tribMun,"pAliq")||"-",amount:moneyOrDash(tag(tribMun,"vISSQN")),retention:retentionLabel(tag(tribMun,"tpRetISSQN"))},
    federalTax:{irrf:moneyOrDash(tag(tribFed,"vRetIRRF")),previdencia:moneyOrDash(tag(tribFed,"vRetCP")),sociais:moneyOrDash(tag(tribFed,"vRetCSLL")),pis:moneyOrDash(tag(pisCofins,"vPis")),cofins:moneyOrDash(tag(pisCofins,"vCofins")),retainedDescription:tag(tribFed,"xRet")||"-"},
    ibsCbs:{cstClass:(tag(inf,"CST")||"")+" / "+(tag(inf,"cClassTrib")||""),operationIncidence:(tag(inf,"indOp")||"")+" / "+fmtIbge(incidCode)+" / "+incidCity+" / "+incidUf,exclusions:"R$ 0,00",base:"-",reduction:" / - / ",rateUfMun:" / ",effectiveMunicipal:"-",amountMunicipal:"-",effectiveState:"-",amountState:"-",totalIbs:"-",cbsRate:"-",cbsEffective:"-",cbsTotal:"-"},
    totals:{operation:money(serviceValue),unconditionalDiscount:moneyOrDash(tag(vals,"vDescIncond")),conditionalDiscount:moneyOrDash(tag(vals,"vDescCond")),retentions:moneyOrDash(tag(vals,"vTotRet")||tag(vals,"vTotalRet")),net:money(liquidValue),ibsCbs:"R$ 0,00",netPlusIbsCbs:"R$ 0,00"},
    additionalInfo:additional||"-",approximateTaxes:"Totais aproximados dos Tributos cfe. Lei n° 12.741/2012: Federais: -; Estaduais: -; Municipais: -;",
    qrValue:"https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave="+key
  };
}