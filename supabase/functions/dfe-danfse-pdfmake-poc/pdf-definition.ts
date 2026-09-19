import type { DanfseData } from "./types.ts";

const BLACK="#080808",GRAY="#f2f2f2";
const oneLine=(v:unknown,max=120)=>{const s=String(v??"-").replace(/\s+/g," ").trim()||"-";return s.length<=max?s:s.slice(0,Math.max(1,max-3)).trimEnd()+"...";};
const txt=(text:string,x:number,y:number,fontSize:number,bold=false,extra:any={})=>({text,fontSize,bold,color:BLACK,absolutePosition:{x,y},margin:[0,0,0,0],lineHeight:1,...extra});
const boxed=(text:string,x:number,y:number,width:number,fontSize:number,bold=false,extra:any={})=>({table:{widths:[width],body:[[{text,fontSize,bold,color:BLACK,margin:[0,0,0,0],lineHeight:extra.lineHeight??1.05,alignment:extra.alignment??"left",noWrap:extra.noWrap??false}]]},layout:{hLineWidth:()=>0,vLineWidth:()=>0,paddingLeft:()=>0,paddingRight:()=>0,paddingTop:()=>0,paddingBottom:()=>0},absolutePosition:{x,y}});
const field=(x:number,y:number,width:number,label:string,value:string,opts:any={})=>[boxed(label,x,y,width,opts.labelSize??6,true),boxed(value||"-",x,y+(opts.valueOffset??8.9),width,opts.valueSize??7,false,{noWrap:opts.noWrap??false,lineHeight:opts.lineHeight??1.02})];
const add=(a:any[],v:any)=>Array.isArray(v)?a.push(...v):a.push(v);

export function buildDanfseDefinition(d:DanfseData){
  const content:any[]=[];
  const canvas:any[]=[
    {type:"rect",x:5.5,y:5,w:584,h:832,lineWidth:1,lineColor:BLACK},{type:"rect",x:5.5,y:5,w:584,h:34.5,lineWidth:0,color:GRAY},{type:"line",x1:5.5,y1:39.5,x2:589.5,y2:39.5,lineWidth:.5,lineColor:BLACK},
    {type:"rect",x:5.5,y:126,w:584,h:11,lineWidth:0,color:GRAY},{type:"line",x1:5.5,y1:126,x2:589.5,y2:126,lineWidth:.5,lineColor:BLACK},{type:"line",x1:152,y1:126,x2:152,y2:203,lineWidth:.5,lineColor:BLACK},{type:"line",x1:296,y1:126,x2:296,y2:203,lineWidth:.5,lineColor:BLACK},{type:"line",x1:441,y1:126,x2:441,y2:203,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:203,x2:589.5,y2:203,lineWidth:.5,lineColor:BLACK},
    {type:"rect",x:5.5,y:203,w:584,h:11,lineWidth:0,color:GRAY},{type:"line",x1:152,y1:203,x2:152,y2:267,lineWidth:.5,lineColor:BLACK},{type:"line",x1:296,y1:203,x2:296,y2:267,lineWidth:.5,lineColor:BLACK},{type:"line",x1:441,y1:203,x2:441,y2:267,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:267,x2:589.5,y2:267,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:268.5,x2:589.5,y2:268.5,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:277.5,x2:589.5,y2:277.5,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:286.5,x2:589.5,y2:286.5,lineWidth:.5,lineColor:BLACK},
    {type:"rect",x:5.5,y:286.5,w:584,h:11,lineWidth:0,color:GRAY},{type:"line",x1:152,y1:286.5,x2:152,y2:438,lineWidth:.5,lineColor:BLACK},{type:"line",x1:296,y1:286.5,x2:296,y2:317,lineWidth:.5,lineColor:BLACK},{type:"line",x1:441,y1:286.5,x2:441,y2:317,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:438,x2:589.5,y2:438,lineWidth:.5,lineColor:BLACK},
    {type:"rect",x:5.5,y:438,w:584,h:11,lineWidth:0,color:GRAY},{type:"line",x1:152,y1:438,x2:152,y2:478,lineWidth:.5,lineColor:BLACK},{type:"line",x1:296,y1:438,x2:296,y2:478,lineWidth:.5,lineColor:BLACK},{type:"line",x1:441,y1:438,x2:441,y2:478,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:478,x2:589.5,y2:478,lineWidth:.5,lineColor:BLACK},
    {type:"rect",x:5.5,y:478,w:584,h:11,lineWidth:0,color:GRAY},{type:"line",x1:152,y1:478,x2:152,y2:518,lineWidth:.5,lineColor:BLACK},{type:"line",x1:296,y1:478,x2:296,y2:518,lineWidth:.5,lineColor:BLACK},{type:"line",x1:441,y1:478,x2:441,y2:498,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:518,x2:589.5,y2:518,lineWidth:.5,lineColor:BLACK},
    {type:"rect",x:5.5,y:518,w:584,h:11,lineWidth:0,color:GRAY},{type:"line",x1:152,y1:518,x2:152,y2:602,lineWidth:.5,lineColor:BLACK},{type:"line",x1:296,y1:518,x2:296,y2:602,lineWidth:.5,lineColor:BLACK},{type:"line",x1:441,y1:518,x2:441,y2:602,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:602,x2:589.5,y2:602,lineWidth:.5,lineColor:BLACK},
    {type:"rect",x:5.5,y:602,w:584,h:11,lineWidth:0,color:GRAY},{type:"line",x1:152,y1:602,x2:152,y2:642,lineWidth:.5,lineColor:BLACK},{type:"line",x1:296,y1:602,x2:296,y2:642,lineWidth:.5,lineColor:BLACK},{type:"line",x1:441,y1:602,x2:441,y2:642,lineWidth:.5,lineColor:BLACK},{type:"rect",x:441,y:622,w:148.5,h:20,lineWidth:0,color:GRAY},{type:"line",x1:5.5,y1:642,x2:589.5,y2:642,lineWidth:.5,lineColor:BLACK},
    {type:"rect",x:5.5,y:642,w:584,h:11,lineWidth:0,color:GRAY},{type:"line",x1:5.5,y1:811,x2:589.5,y2:811,lineWidth:.5,lineColor:BLACK},{type:"line",x1:151,y1:811,x2:151,y2:833,lineWidth:.5,lineColor:BLACK},{type:"line",x1:296,y1:811,x2:296,y2:833,lineWidth:.5,lineColor:BLACK},{type:"line",x1:5.5,y1:833,x2:589.5,y2:833,lineWidth:.5,lineColor:BLACK}
  ];
  content.push({canvas,absolutePosition:{x:0,y:0}});
  content.push(txt("NFS-e",14,9.5,16,true,{color:"#278b5b"}),txt("Padrão Nacional",14,25.5,6.2,false,{color:"#5f6873"}));
  content.push(txt("DANFSe v2.0",261.9,9.6,11.5,true),txt("Documento Auxiliar da NFS-e",230.2,21.4,9.6,true));
  content.push(txt("Município: "+d.issueCity+" - "+d.issueUf,445,10,7.1),txt("Ambiente Gerador: "+d.generatorEnvironment,445,20.1,5.5),txt("Tipo de Ambiente: "+d.environmentType,445,26.8,5.5));
  content.push({qr:d.qrValue,fit:43.1,absolutePosition:{x:493,y:40.9},margin:[0,0,0,0]});
  add(content,field(11,43.6,420,"CHAVE DE ACESSO DA NFS-e",d.accessKey,{valueSize:6.3,valueOffset:8.9,noWrap:true}));
  add(content,field(11,63.6,130,"NÚMERO DA NFS-e",d.number));add(content,field(156,63.6,130,"COMPETÊNCIA DA NFS-e",d.competency));add(content,field(301,63.6,135,"DATA E HORA DA EMISSÃO DA NFS-e",d.issueDate));
  add(content,field(11,83.6,130,"NÚMERO DA DPS",d.dpsNumber));add(content,field(156,83.6,130,"SÉRIE DA DPS",d.dpsSeries));add(content,field(301,83.6,135,"DATA E HORA DA EMISSÃO DA DPS",d.dpsIssueDate));
  add(content,field(11,103.6,130,"EMITENTE DA NFS-e",d.emitterType));add(content,field(156,103.6,130,"SITUAÇÃO DA NFS-e",d.status));add(content,field(301,103.6,135,"FINALIDADE",d.purpose));
  content.push(boxed("A autenticidade desta NFS-e pode ser verificada\npela leitura deste código QR ou pela consulta da\nchave de acesso no portal nacional da NFS-e",445,92.1,139,6,false,{lineHeight:1.08}));

  content.push(txt("PRESTADOR / FORNECEDOR",9.5,127.7,7,true));add(content,field(156,128.6,130,"CNPJ / CPF / NIF",d.prestador.doc));add(content,field(301,128.6,130,"Indicador Municipal (Inscrição)",d.prestador.municipalRegistration));add(content,field(445,128.6,135,"Telefone",d.prestador.phone));
  add(content,field(11,150.6,136,"Nome / Nome Empresarial",d.prestador.name,{valueSize:6.6}));add(content,field(301,150.6,130,"Município / Sigla UF",d.prestador.cityUf));add(content,field(445,150.6,135,"Código IBGE / CEP",d.prestador.ibgeCep));
  add(content,field(11,172.6,136,"Endereço",oneLine(d.prestador.address,48),{valueSize:6.4}));add(content,field(301,172.6,130,"E-mail",oneLine(d.prestador.email,40),{valueSize:6.2}));
  add(content,field(11,191.6,136,"Simples Nacional na Data de Competência",oneLine(d.prestador.simpleNational,48),{valueSize:5.8}));add(content,field(156,191.6,280,"Regime de Apuração Tributária pelo SN",oneLine(d.prestador.taxRegime,76),{valueSize:5.8}));

  content.push(txt("TOMADOR / ADQUIRENTE",9.5,204.7,7,true));add(content,field(156,205.6,130,"CNPJ / CPF / NIF",d.tomador.doc));add(content,field(301,205.6,130,"Indicador Municipal (Inscrição)",d.tomador.municipalRegistration));add(content,field(445,205.6,135,"Telefone",d.tomador.phone));
  add(content,field(11,227.6,136,"Nome / Nome Empresarial",d.tomador.name,{valueSize:6.6}));add(content,field(301,227.6,130,"Município / Sigla UF",d.tomador.cityUf));add(content,field(445,227.6,135,"Código IBGE / CEP",d.tomador.ibgeCep));
  add(content,field(11,249.6,136,"Endereço",oneLine(d.tomador.address,48),{valueSize:6.4}));add(content,field(301,249.6,135,"E-mail",oneLine(d.tomador.email,44),{valueSize:6.2}));
  content.push(boxed("DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e",160,268.6,275,5.8,true,{alignment:"center"}),boxed("INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e",160,277.6,275,5.8,true,{alignment:"center"}));

  content.push(txt("SERVIÇO PRESTADO",9.5,288.2,7,true));add(content,field(156,289.1,135,"Código de Tributação Nacional/Municipal",d.service.nationalMunicipalCode));add(content,field(301,289.1,135,"Código da NBS",d.service.nbs));add(content,field(445,289.1,138,"Local da Prestação / Sigla UF / País",d.service.location));
  content.push(boxed(oneLine(d.service.classification,115),11,309.5,136,6,false,{lineHeight:1.08}),txt("Descrição do Serviço",11,325.6,5.8,true),boxed(oneLine(d.service.description,220),11,336.5,136,6,false,{lineHeight:1.08}));

  content.push(txt("TRIBUTAÇÃO MUNICIPAL (ISSQN)",9.5,439.7,7,true));add(content,field(156,440.6,135,"Tipo de Tributação do ISSQN",d.municipalTax.type));add(content,field(301,440.6,135,"Município / Sigla UF / País de Incidência do ISSQN",d.municipalTax.incidence,{labelSize:5.8}));
  add(content,field(11,459.6,136,"BC ISSQN",d.municipalTax.base));add(content,field(156,459.6,135,"Alíquota Aplicada",d.municipalTax.rate));add(content,field(301,459.6,135,"Retenção do ISSQN",d.municipalTax.retention));add(content,field(445,459.6,135,"ISSQN Apurado",d.municipalTax.amount));

  content.push(txt("TRIBUTAÇÃO FEDERAL (EXCETO CBS)",9.5,479.7,7,true));add(content,field(156,480.6,135,"IRRF",d.federalTax.irrf));add(content,field(301,480.6,135,"Contribuição Previdenciária - Retida",d.federalTax.previdencia,{labelSize:5.5}));add(content,field(445,480.6,135,"Contribuições Sociais - Retidas",d.federalTax.sociais,{labelSize:5.5}));
  add(content,field(11,499.6,136,"PIS - Débito Apuração Própria",d.federalTax.pis,{labelSize:5.6}));add(content,field(156,499.6,135,"COFINS - Débito Apuração Própria",d.federalTax.cofins,{labelSize:5.6}));add(content,field(301,499.6,280,"Descrição Contrib. Sociais - Retidas",d.federalTax.retainedDescription,{labelSize:5.6}));

  content.push(txt("TRIBUTAÇÃO IBS/CBS",9.5,519.7,7,true));add(content,field(156,520.6,135,"CST / cClassTrib",d.ibsCbs.cstClass,{labelSize:5.5}));add(content,field(301,520.6,280,"Indicador de Operação / Código IBGE Incidência / Município Incidência / Sigla UF",d.ibsCbs.operationIncidence,{labelSize:5.2,valueSize:6}));
  add(content,field(11,539.6,136,"Exclusões e Reduções da Base de Cálculo",d.ibsCbs.exclusions,{labelSize:5.4}));add(content,field(156,539.6,135,"Base de Cálculo Após Exclusões e Reduções",d.ibsCbs.base,{labelSize:5.2}));add(content,field(301,539.6,135,"Red. Alíquota IBS / Red. Alíquota CBS",d.ibsCbs.reduction,{labelSize:5.3}));add(content,field(445,539.6,135,"Alíquota - IBS UF / IBS Mun",d.ibsCbs.rateUfMun,{labelSize:5.4}));
  add(content,field(11,559.6,136,"Alíq. Efetiva Municipal - IBS",d.ibsCbs.effectiveMunicipal,{labelSize:5.4}));add(content,field(156,559.6,135,"Valor Apurado Municipal - IBS",d.ibsCbs.amountMunicipal,{labelSize:5.4}));add(content,field(301,559.6,135,"Alíq. Efetiva Estadual - IBS",d.ibsCbs.effectiveState,{labelSize:5.4}));add(content,field(445,559.6,135,"Valor Apurado Estadual - IBS",d.ibsCbs.amountState,{labelSize:5.4}));
  add(content,field(11,579.6,136,"Valor Total Apurado - IBS",d.ibsCbs.totalIbs,{labelSize:5.4}));add(content,field(156,579.6,135,"Alíquota - CBS",d.ibsCbs.cbsRate,{labelSize:5.4}));add(content,field(301,579.6,135,"Alíquota Efetiva - CBS",d.ibsCbs.cbsEffective,{labelSize:5.4}));add(content,field(445,579.6,135,"Valor Total Apurado - CBS",d.ibsCbs.cbsTotal,{labelSize:5.4}));

  content.push(txt("VALOR TOTAL DA NFS-e",9.5,603.7,7,true));add(content,field(156,604.6,135,"VALOR DA OPERAÇÃO / SERVIÇO",d.totals.operation,{labelSize:5.6}));add(content,field(301,604.6,135,"Desconto Incondicionado",d.totals.unconditionalDiscount,{labelSize:5.6}));add(content,field(445,604.6,135,"Desconto Condicionado",d.totals.conditionalDiscount,{labelSize:5.6}));
  add(content,field(11,624.6,136,"Total das Retenções (ISSQN / Federais)",d.totals.retentions,{labelSize:5.4}));add(content,field(156,624.6,135,"VALOR LÍQUIDO DA NFS-e",d.totals.net,{labelSize:5.6}));add(content,field(301,624.6,135,"Total do IBS/CBS",d.totals.ibsCbs,{labelSize:5.6}));add(content,field(445,624.6,135,"VALOR LÍQUIDO DA NFS-e + IBS/CBS",d.totals.netPlusIbsCbs,{labelSize:5.4}));

  content.push(txt("INFORMAÇÕES COMPLEMENTARES",9.5,643.7,7,true),boxed("Inf. Cont.: "+d.additionalInfo,11,655,565,6,false,{lineHeight:1.08}),boxed(d.approximateTaxes,11,677,565,6,false,{lineHeight:1.08}));
  content.push(txt("DATA CIENTIFICAÇÃO:",11,813.2,5.4,true),txt("IDENTIFICAÇÃO E ASSINATURA",156,813.2,5.4,true),txt("N° NFS-e / CHAVE NFS-e",301,813.2,5.4,true),txt(d.number+" / "+d.accessKey,301,821.2,5.5));

  return {pageSize:"A4",pageMargins:[0,0,0,0],defaultStyle:{font:"Roboto",fontSize:6,color:BLACK,lineHeight:1},content};
}