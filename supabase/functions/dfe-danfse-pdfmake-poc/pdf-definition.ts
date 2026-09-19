import type { DanfseData } from "./types.ts";
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
        {stack:[{text:"NFS-e",bold:true,fontSize:17,color:"#278b5b"},{text:"Padrão Nacional",fontSize:6.5,color:"#5f6873"}],alignment:"left",margin:[6,6,0,3]},
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