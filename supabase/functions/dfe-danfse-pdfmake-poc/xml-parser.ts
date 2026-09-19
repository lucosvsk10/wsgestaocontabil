import type { DanfseData } from "./types.ts";

const clean=(v:unknown)=>String(v??"").replace(/[\r\n\t]+/g," ").replace(/\s+/g," ").trim();
const tag=(xml:string,name:string)=>{
  const m=xml.match(new RegExp("<(?:[A-Za-z0-9_]+:)?"+name+"\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?"+name+">","i"));
  return clean(m?.[1]??"");
};
const section=(xml:string,name:string)=>{
  const m=xml.match(new RegExp("<(?:[A-Za-z0-9_]+:)?"+name+"\\b[^>]*>([\\s\\S]*?)<\\/(?:[A-Za-z0-9_]+:)?"+name+">","i"));
  return m?.[1]??"";
};
const dg=(v:unknown)=>String(v??"").replace(/\D/g,"");
const money=(v:unknown)=>{
  const n=Number(String(v??"0").replace(",","."));
  return Number.isFinite(n)?new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"}).format(n):"-";
};
const moneyOrDash=(v:unknown)=>{
  const s=clean(v); if(!s) return "-";
  const n=Number(s.replace(",",".")); if(!Number.isFinite(n)||n===0) return "-";
  return money(n);
};
const cnpjCpf=(v:unknown)=>{
  const d=dg(v);
  if(d.length===14) return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,"$1.$2.$3/$4-$5");
  if(d.length===11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,"$1.$2.$3-$4");
  return d||"-";
};
const cep=(v:unknown)=>{const d=dg(v);return d.length===8?d.replace(/^(\d{5})(\d{3})$/,"$1-$2"):d||"-";};
const phone=(v:unknown)=>{const d=dg(v);if(d.length===11)return d.replace(/^(\d{2})(\d{5})(\d{4})$/,"($1) $2-$3");if(d.length===10)return d.replace(/^(\d{2})(\d{4})(\d{4})$/,"($1) $2-$3");return d||"-";};
const fmtDate=(v:unknown)=>{const s=clean(v);if(!s)return "-";const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleDateString("pt-BR");};
const fmtDateTime=(v:unknown)=>{const s=clean(v);if(!s)return "-";const d=new Date(s);return Number.isNaN(d.getTime())?s:d.toLocaleString("pt-BR",{hour12:false});};
const cleanParts=(...xs:unknown[])=>xs.map(clean).filter(Boolean).filter(v=>!/^(null|undefined)$/i.test(v)).join(", ");
const ufFromIbge=(v:unknown)=>{
  const code=dg(v).slice(0,2);
  const map:Record<string,string>={11:"RO",12:"AC",13:"AM",14:"RR",15:"PA",16:"AP",17:"TO",21:"MA",22:"PI",23:"CE",24:"RN",25:"PB",26:"PE",27:"AL",28:"SE",29:"BA",31:"MG",32:"ES",33:"RJ",35:"SP",41:"PR",42:"SC",43:"RS",50:"MS",51:"MT",52:"GO",53:"DF"};
  return map[code]||"-";
};
const fmtIbge=(v:unknown)=>{const d=dg(v);return d.length===7?d.replace(/^(\d{2})(\d{5})$/,"$1.$2"):d||"-";};
const fmtTrib=(v:unknown)=>{const d=dg(v);return d.length===6?d.replace(/^(\d{2})(\d{2})(\d{2})$/,"$1.$2.$3"):d||"-";};
const fmtNbs=(v:unknown)=>{const d=dg(v);return d.length===9?d.slice(0,1)+"."+d.slice(1,5)+"."+d.slice(5,7)+"."+d.slice(7):d||"-";};

export function parseDanfse(xml:string, doc:any):DanfseData{
  const inf=section(xml,"infNFSe")||xml;
  const emit=section(inf,"emit"), endE=section(emit,"enderNac");
  const dps=section(inf,"DPS"), infDps=section(dps,"infDPS")||dps;
  const prest=section(infDps,"prest"), regTrib=section(prest,"regTrib");
  const toma=section(infDps,"toma"), endT=section(toma,"end"), endTN=section(endT,"endNac");
  const serv=section(infDps,"serv"), locPrest=section(serv,"locPrest"), cServ=section(serv,"cServ");
  const dpsVals=section(infDps,"valores"), vServPrest=section(dpsVals,"vServPrest"), trib=section(dpsVals,"trib");
  const tribMun=section(trib,"tribMun"), tribFed=section(trib,"tribFed"), pisCofins=section(tribFed,"piscofins");
  const vals=section(inf,"valores");
  const key=dg(doc?.accessKey||tag(inf,"Id").replace(/^NFS/i,""));
  const issue=tag(infDps,"dhEmi")||doc?.issueDate;
  const comp=tag(infDps,"dCompet")||issue;
  const issueCityCode=tag(endE,"cMun")||tag(infDps,"cLocEmi");
  const tomaCityCode=tag(endTN,"cMun");
  const prestCityCode=tag(locPrest,"cLocPrestacao");
  const incidenceCode=tag(inf,"cLocIncid");
  const issueUf=tag(endE,"UF")||ufFromIbge(issueCityCode);
  const tomaUf=tag(endT,"UF")||ufFromIbge(tomaCityCode);
  const prestUf=ufFromIbge(prestCityCode);
  const incidenceUf=ufFromIbge(incidenceCode);
  const serviceValue=tag(vServPrest,"vServ")||doc?.value||tag(vals,"vLiq");
  const liquidValue=tag(vals,"vLiq")||serviceValue;
  const emitTypeCode=tag(inf,"tpEmit")||tag(infDps,"tpEmit")||"1";
  return {
    accessKey:key,
    number:tag(inf,"nNFSe")||String(doc?.number||"-"),
    competency:fmtDate(comp),
    issueDate:fmtDateTime(issue),
    dpsNumber:tag(infDps,"nDPS")||"-",
    dpsSeries:tag(infDps,"serie")||String(doc?.series||"-"),
    dpsIssueDate:fmtDateTime(issue),
    emitterType:emitTypeCode==="2"?"Tomador":emitTypeCode==="3"?"Intermediário":"Prestador",
    status:tag(inf,"cStat")==="100"?"NFS-e Gerada":tag(inf,"cStat")||"-",
    purpose:tag(infDps,"finNFSe")||"-",
    issueCity:tag(inf,"xLocEmi")||"-",
    issueUf,
    generatorEnvironment:tag(inf,"ambGer")||"-",
    environmentType:tag(infDps,"tpAmb")||"-",
    prestador:{
      name:tag(emit,"xNome")||doc?.issuerName||"-",
      doc:cnpjCpf(tag(emit,"CNPJ")||tag(emit,"CPF")||doc?.issuerCnpj),
      municipalRegistration:tag(emit,"IM")||tag(prest,"IM")||"-",
      address:cleanParts(tag(endE,"xLgr"),tag(endE,"nro"),tag(endE,"xCpl"),tag(endE,"xBairro")),
      cityUf:(tag(inf,"xLocEmi")||"-")+" / "+issueUf,
      emailPhoneIbgeCep:(tag(emit,"email")||tag(prest,"email")||"-")+" / "+phone(tag(emit,"fone")||tag(prest,"fone"))+" / "+fmtIbge(issueCityCode)+" / "+cep(tag(endE,"CEP")),
      simpleNational:tag(regTrib,"opSimpNac")==="1"?"Optante - Microempresa ou Empresa de Pequeno Porte":tag(regTrib,"opSimpNac")||"-",
      taxRegime:tag(regTrib,"regApTribSN")||"Regime de apuração dos tributos federais e municipal pelo Simples Nacional",
    },
    tomador:{
      name:tag(toma,"xNome")||doc?.recipientName||"-",
      doc:cnpjCpf(tag(toma,"CNPJ")||tag(toma,"CPF")||doc?.recipientCnpj),
      municipalRegistration:tag(toma,"IM")||"-",
      address:cleanParts(tag(endT,"xLgr"),tag(endT,"nro"),tag(endT,"xCpl"),tag(endT,"xBairro")),
      cityUf:(tag(toma,"xMun")||"-")+" / "+tomaUf,
      emailPhoneIbgeCep:(tag(toma,"email")||"-")+" / "+phone(tag(toma,"fone"))+" / "+fmtIbge(tomaCityCode)+" / "+cep(tag(endTN,"CEP")),
    },
    service:{
      nationalMunicipalCode:fmtTrib(tag(cServ,"cTribNac"))+" / "+(tag(cServ,"cTribMun")||"-"),
      nbs:fmtNbs(tag(cServ,"cNBS")),
      location:(tag(locPrest,"xLocPrestacao")||"-")+" / "+prestUf+" / "+(tag(locPrest,"cPaisPrestacao")||"-"),
      classification:tag(inf,"xTribNac")||"-",
      description:tag(cServ,"xDescServ")||"-",
    },
    municipalTax:{
      type:tag(tribMun,"tribISSQN")==="1"?"Operação Tributável":tag(tribMun,"tribISSQN")||"-",
      incidence:(tag(inf,"xLocIncid")||"-")+" / "+incidenceUf+" / -",
      base:moneyOrDash(tag(tribMun,"vBC")), rate:tag(tribMun,"pAliq")||"-", amount:moneyOrDash(tag(tribMun,"vISSQN")),
      retention:tag(tribMun,"tpRetISSQN")==="1"?"Retido":tag(tribMun,"tpRetISSQN")==="2"?"Não Retido":tag(tribMun,"tpRetISSQN")||"-",
      observation:tag(tribMun,"xOutro")||"-",
    },
    federalTax:{
      irrf:moneyOrDash(tag(tribFed,"vRetIRRF")), previdencia:moneyOrDash(tag(tribFed,"vRetCP")), sociais:moneyOrDash(tag(tribFed,"vRetCSLL")),
      pis:moneyOrDash(tag(pisCofins,"vPis")), cofins:moneyOrDash(tag(pisCofins,"vCofins")), retainedDescription:tag(tribFed,"xRet")||"-",
    },
    ibsCbsRows:[
      ["CST / cClassTrib",(tag(inf,"CST")||"-")+" / "+(tag(inf,"cClassTrib")||"-"),"Indicador de Operação / Código IBGE Incidência",(tag(inf,"indOp")||"-")+" / "+fmtIbge(incidenceCode),"Red. Alíquota IBS / CBS","- / -","Alíquota - IBS UF / Mun","- / -"],
      ["Exclusões e Reduções da Base de Cálculo","R$ 0,00","Base de Cálculo Após Exclusões e Reduções","-","Alíq. Efetiva Estadual - IBS","-","Valor Apurado Estadual - IBS","-"],
      ["Alíq. Efetiva Municipal - IBS","-","Valor Apurado Municipal - IBS","-","Alíquota - CBS","-","Alíquota Efetiva - CBS","-"],
      ["Valor Total Apurado - IBS","-","Valor Total Apurado - CBS","-","Município Incidência / UF",(tag(inf,"xLocIncid")||"-")+" / "+incidenceUf,"Total IBS/CBS","R$ 0,00"],
    ],
    totals:{
      operation:money(serviceValue), unconditionalDiscount:moneyOrDash(tag(vals,"vDescIncond")), conditionalDiscount:moneyOrDash(tag(vals,"vDescCond")),
      retentions:moneyOrDash(tag(vals,"vTotRet")||tag(vals,"vTotalRet")), net:money(liquidValue), ibsCbs:"R$ 0,00", netPlusIbsCbs:"R$ 0,00",
    },
    additionalInfo:cleanParts(tag(infDps,"infCpl"),tag(inf,"infCpl"),tag(serv,"infCpl"))||"-",
    qrValue:"https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave="+key,
  };
}