import type { DanfseData } from "./types.ts";
export const NFSE_LOGO="data:image/png;base64,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";
const borderLayout={hLineWidth:()=>0.55,vLineWidth:()=>0.55,hLineColor:()=>"#222",vLineColor:()=>"#222",paddingLeft:()=>3,paddingRight:()=>3,paddingTop:()=>2.4,paddingBottom:()=>2.4};
const section=(title:string)=>({table:{widths:["*"],body:[[{text:title,bold:true,fontSize:7,fillColor:"#f4f4f4",margin:[1,1,1,1]}]]},layout:borderLayout});
const field=(label:string,value:string,opts:any={})=>({stack:[{text:label,bold:true,fontSize:opts.labelSize??5.5,margin:[0,0,0,1]},{text:value||"-",fontSize:opts.valueSize??6.15,bold:!!opts.bold,noWrap:!!opts.noWrap,lineHeight:1.03}],margin:[0,0,0,0]});
const tbl=(widths:any[],body:any[],margin:any=[0,0,0,0])=>({table:{widths,body,dontBreakRows:true},layout:borderLayout,margin});
export function buildDanfseDefinition(d:DanfseData){
  return {
    pageSize:"A4", pageMargins:[6,6,6,6],
    defaultStyle:{font:"Roboto",fontSize:6.05,color:"#111",lineHeight:1.02},
    content:[
      tbl([135,170,"*"],[[
        {image:NFSE_LOGO,width:120,alignment:"left",margin:[4,2,0,2]},
        {stack:[{text:"DANFSe v2.0",bold:true,fontSize:12,alignment:"center",margin:[0,3,0,1]},{text:"Documento Auxiliar da NFS-e",bold:true,fontSize:9,alignment:"center"}]},
        {stack:[{text:"Município: "+d.issueCity+" - "+d.issueUf,fontSize:5.4},{text:"Ambiente Gerador: "+d.generatorEnvironment,fontSize:5.1},{text:"Tipo de Ambiente: "+d.environmentType,fontSize:5.1}],margin:[2,2,2,2]}
      ]]),
      tbl([430,"*"],[[
        {stack:[
          tbl(["*"],[[field("CHAVE DE ACESSO DA NFS-e",d.accessKey,{valueSize:5.55,noWrap:true})]]),
          tbl([145,145,"*"],[[
            field("NÚMERO DA NFS-e",d.number),field("COMPETÊNCIA DA NFS-e",d.competency),field("DATA E HORA DA EMISSÃO DA NFS-e",d.issueDate,{valueSize:5.45})
          ],[
            field("NÚMERO DA DPS",d.dpsNumber),field("SÉRIE DA DPS",d.dpsSeries),field("DATA E HORA DA EMISSÃO DA DPS",d.dpsIssueDate,{valueSize:5.45})
          ],[
            field("EMITENTE DA NFS-e",d.emitterType),field("SITUAÇÃO DA NFS-e",d.status),field("FINALIDADE",d.purpose)
          ]])
        ]},
        {stack:[{qr:d.qrValue,fit:62,alignment:"center",margin:[0,3,0,3]},{text:"A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e",fontSize:4.7,alignment:"center",margin:[2,0,2,2]}]}
      ]]),
      section("PRESTADOR / FORNECEDOR"),
      tbl([275,145,"*"],[[
        field("Nome / Nome Empresarial",d.prestador.name),field("CNPJ / CPF / NIF",d.prestador.doc),field("Indicador Municipal (Inscrição)",d.prestador.municipalRegistration)
      ],[
        field("Endereço",d.prestador.address,{valueSize:5.6}),field("Município / Sigla UF",d.prestador.cityUf),field("E-mail / Telefone / Código IBGE / CEP",d.prestador.emailPhoneIbgeCep,{labelSize:4.6,valueSize:4.8})
      ],[
        field("Simples Nacional na Data de Competência",d.prestador.simpleNational,{valueSize:5.25}),{colSpan:2,...field("Regime de Apuração Tributária pelo SN",d.prestador.taxRegime,{valueSize:5.25})},{}
      ]]),
      section("TOMADOR / ADQUIRENTE"),
      tbl([275,145,"*"],[[
        field("Nome / Nome Empresarial",d.tomador.name),field("CNPJ / CPF / NIF",d.tomador.doc),field("Indicador Municipal (Inscrição)",d.tomador.municipalRegistration)
      ],[
        field("Endereço",d.tomador.address,{valueSize:5.6}),field("Município / Sigla UF",d.tomador.cityUf),field("E-mail / Telefone / Código IBGE / CEP",d.tomador.emailPhoneIbgeCep,{labelSize:4.6,valueSize:4.8})
      ]]),
      tbl(["*"],[[{text:"DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e · INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e",bold:true,fontSize:5.55,alignment:"center",margin:[3,3,3,3]}]]),
      section("SERVIÇO PRESTADO"),
      tbl([200,155,"*"],[[field("Código de Tributação Nacional/Municipal",d.service.nationalMunicipalCode),field("Código da NBS",d.service.nbs),field("Local da Prestação / Sigla UF / País",d.service.location,{valueSize:5.3})]]),
      tbl(["*"],[[field("Classificação do Serviço",d.service.classification,{valueSize:5.6})]]),
      tbl(["*"],[[{...field("Descrição do Serviço",d.service.description,{valueSize:5.9}),margin:[0,1,0,4]}]]),
      section("TRIBUTAÇÃO MUNICIPAL (ISSQN)"),
      tbl([145,220,72,72,"*"],[[field("Tipo de Tributação do ISSQN",d.municipalTax.type,{valueSize:5.1}),field("Município / Sigla UF / País de Incidência",d.municipalTax.incidence,{valueSize:4.9}),field("BC ISSQN",d.municipalTax.base),field("Alíquota",d.municipalTax.rate),field("ISSQN Apurado",d.municipalTax.amount)]]),
      tbl([145,"*"],[[field("Retenção do ISSQN",d.municipalTax.retention),field("Observação",d.municipalTax.observation)]]),
      section("TRIBUTAÇÃO FEDERAL (EXCETO CBS)"),
      tbl(["*","*","*","*","*"],[[field("IRRF",d.federalTax.irrf),field("Contrib. Previdenciária - Retida",d.federalTax.previdencia,{labelSize:4.35}),field("Contribuições Sociais - Retidas",d.federalTax.sociais,{labelSize:4.35}),field("PIS - Débito Apuração Própria",d.federalTax.pis,{labelSize:4.25}),field("COFINS - Débito Apuração Própria",d.federalTax.cofins,{labelSize:4.15})]]),
      tbl(["*"],[[field("Descrição Contrib. Sociais - Retidas",d.federalTax.retainedDescription)]]),
      section("TRIBUTAÇÃO IBS/CBS"),
      ...d.ibsCbsRows.map(row=>tbl(["*","*","*","*"],[[field(row[0],row[1],{labelSize:4.15,valueSize:4.8}),field(row[2],row[3],{labelSize:4.05,valueSize:4.8}),field(row[4],row[5],{labelSize:4.05,valueSize:4.8}),field(row[6],row[7],{labelSize:4.05,valueSize:4.8})]])),
      section("VALOR TOTAL DA NFS-e"),
      tbl(["*","*","*","*"],[[field("VALOR DA OPERAÇÃO / SERVIÇO",d.totals.operation,{bold:true,labelSize:4.5}),field("Desconto Incondicionado",d.totals.unconditionalDiscount),field("Desconto Condicionado",d.totals.conditionalDiscount),field("Total das Retenções",d.totals.retentions)],[field("VALOR LÍQUIDO DA NFS-e",d.totals.net,{bold:true,labelSize:4.5}),field("Total do IBS/CBS",d.totals.ibsCbs),{colSpan:2,...field("VALOR LÍQUIDO DA NFS-e + IBS/CBS",d.totals.netPlusIbsCbs,{labelSize:4.5})},{}]]),
      section("INFORMAÇÕES COMPLEMENTARES"),
      tbl(["*"],[[field("Inf. Cont.",d.additionalInfo,{valueSize:5.0})]]),
      tbl([145,145,"*"],[[field("DATA CIENTIFICAÇÃO:","",{labelSize:4.5}),field("IDENTIFICAÇÃO E ASSINATURA","",{labelSize:4.5}),field("N° NFS-e / CHAVE NFS-e",d.number+" / "+d.accessKey,{labelSize:4.5,valueSize:4.8})]])
    ]
  };
}