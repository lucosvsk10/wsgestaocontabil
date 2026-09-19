import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1?target=deno";
import qrcode from "https://esm.sh/qrcode-generator@1.4.4?target=deno";
import type { DanfseData } from "./types.ts";
import { NFS_LOGO_PNG_BASE64 } from "./logo-data.ts";

const W=595,H=842;\nconst X0=8.5,X1=153.07,X2=297.64,X3=442.20,X4=586.77;
const BLACK=rgb(.03,.03,.03), MID=rgb(.45,.45,.45), GRAY=rgb(.95,.95,.95), WHITE=rgb(1,1,1);

const b64bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const yTop=(top:number,size:number)=>H-top-(size*1.07);

function wrap(font:any,text:string,size:number,maxWidth:number){
  const words=String(text||"-").replace(/\s+/g," ").trim().split(" ");
  const lines:string[]=[]; let line="";
  for(const word of words){
    const next=line?line+" "+word:word;
    if(!line || font.widthOfTextAtSize(next,size)<=maxWidth) line=next;
    else { lines.push(line); line=word; }
  }
  if(line) lines.push(line);
  return lines.length?lines:["-"];
}

function drawTop(page:any,font:any,text:string,x:number,top:number,size:number,opts:any={}){
  const color=opts.color??BLACK;
  const maxWidth=opts.maxWidth;
  const lines=maxWidth?wrap(font,text,size,maxWidth):String(text??"").split("\n");
  const lineGap=opts.lineGap??0.5;
  lines.forEach((line:string,i:number)=>{
    page.drawText(line,{x,y:yTop(top+i*(size+lineGap),size),size,font,color});
  });
  return lines.length;
}

function line(page:any,x1:number,top1:number,x2:number,top2:number,thickness=.5,color=BLACK){
  page.drawLine({start:{x:x1,y:H-top1},end:{x:x2,y:H-top2},thickness,color});
}
function rect(page:any,x:number,top:number,w:number,h:number,opts:any={}){
  page.drawRectangle({x,y:H-top-h,width:w,height:h,borderWidth:opts.borderWidth??0,borderColor:opts.borderColor??BLACK,color:opts.fill});
}
function section(page:any,bold:any,title:string,top:number){
  line(page,X0,top,X4,top,.5,BLACK);
  rect(page,X0,top+.25,X1-X0,19.08,{fill:GRAY});
  drawTop(page,bold,title,11.91,top+.48,7);
}
function field(page:any,normal:any,bold:any,x:number,top:number,label:string,value:string,opts:any={}){
  drawTop(page,bold,label,x,top,opts.labelSize??6,{maxWidth:opts.labelWidth});
  drawTop(page,normal,value||"-",x,top+(opts.valueOffset??6.7),opts.valueSize??7,{maxWidth:opts.valueWidth,lineGap:opts.lineGap});
}
function drawQr(page:any,value:string,x:number,top:number,size:number){
  const qr=qrcode(6,"M");
  qr.addData(value);
  qr.make();
  const n=qr.getModuleCount();
  const quiet=4;
  const cell=size/(n+quiet*2);
  rect(page,x,top,size,size,{fill:WHITE});
  for(let r=0;r<n;r++){
    for(let c=0;c<n;c++){
      if(qr.isDark(r,c)){
        const rx=x+(c+quiet)*cell;
        const rt=top+(r+quiet)*cell;
        rect(page,rx,rt,cell+.02,cell+.02,{fill:rgb(0,0,0)});
      }
    }
  }
}

export async function buildDanfsePdf(d:DanfseData){
  const pdf=await PDFDocument.create();
  const page=pdf.addPage([W,H]);
  const normal=await pdf.embedFont(StandardFonts.Helvetica);
  const bold=await pdf.embedFont(StandardFonts.HelveticaBold);
  const logo=await pdf.embedPng(b64bytes(NFS_LOGO_PNG_BASE64));

  // Geometria copiada das coordenadas vetoriais do DANFSe oficial.
  rect(page,5,5,585,832,{borderWidth:1,borderColor:BLACK});
  rect(page,X0,5.67,X1-X0,34.01,{fill:GRAY});
  rect(page,X1,5.67,X3-X1,34.01,{fill:GRAY});
  rect(page,X3,5.67,X4-X3,34.01,{fill:GRAY});
  line(page,X0,39.93,X4,39.93,.5,BLACK);
  rect(page,X0,105.11,X1-X0,20.22,{fill:GRAY});

  section(page,bold,"PRESTADOR / FORNECEDOR",125.58);
  [X1,X2,X3].forEach(x=>line(page,x,125.58,x,202.38,.5,MID));

  section(page,bold,"TOMADOR / ADQUIRENTE",202.38);
  [X1,X2,X3].forEach(x=>line(page,x,202.38,x,260.10,.5,MID));
  line(page,X0,260.10,X4,260.10,.5,BLACK);
  line(page,X0,268.53,X4,268.53,.5,BLACK);
  line(page,X0,276.95,X4,276.95,.5,BLACK);

  section(page,bold,"SERVIÇO PRESTADO",276.95);
  line(page,X1,276.95,X1,430.77,.5,MID);
  line(page,X2,276.95,X2,296.27,.5,MID);
  line(page,X3,276.95,X3,296.27,.5,MID);

  section(page,bold,"TRIBUTAÇÃO MUNICIPAL (ISSQN)",430.77);
  [X1,X2,X3].forEach(x=>line(page,x,430.77,x,469.42,.5,MID));

  section(page,bold,"TRIBUTAÇÃO FEDERAL (EXCETO CBS)",469.42);
  [X1,X2,X3].forEach(x=>line(page,x,469.42,x,508.07,.5,MID));

  section(page,bold,"TRIBUTAÇÃO IBS/CBS",508.07);
  [X1,X2,X3].forEach(x=>line(page,x,508.07,x,584.86,.5,MID));

  section(page,bold,"VALOR TOTAL DA NFS-e",584.86);
  [X1,X2,X3].forEach(x=>line(page,x,584.86,x,623.51,.5,MID));
  rect(page,X3,604.19,X4-X3,19.07,{fill:GRAY});

  line(page,X0,623.51,X4,623.51,.5,BLACK);
  drawTop(page,bold,"INFORMAÇÕES COMPLEMENTARES",11.91,623.99,7);

  // Rodapé oficial: caixa menor e mais alta que a versão anterior.
  line(page,9.00,795.80,587.77,795.80,1,BLACK);
  line(page,9.00,816.38,587.77,816.38,1,BLACK);
  line(page,9.00,795.80,9.00,816.38,1,BLACK);
  line(page,153.57,795.80,153.57,816.38,1,BLACK);
  line(page,298.14,795.80,298.14,816.38,1,BLACK);
  line(page,587.77,795.80,587.77,816.38,1,BLACK);

  page.drawImage(logo,{x:11.91,y:H-10.32-22.92,width:115.65,height:22.92});
  drawTop(page,bold,"DANFSe v2.0",269.63,12.62,9);
  drawTop(page,bold,"Documento Auxiliar da NFS-e",234.38,22.97,9);
  drawTop(page,normal,"Município: "+d.issueCity+" - "+d.issueUf,445.61,11.36,8);
  drawTop(page,normal,"Ambiente Gerador: "+d.generatorEnvironment,445.61,20.41,6);
  drawTop(page,normal,"Tipo de Ambiente: "+d.environmentType,445.61,27.20,6);

  drawQr(page,d.qrValue,491.99,44.76,45);
  field(page,normal,bold,11.91,44.67,"CHAVE DE ACESSO DA NFS-e",d.accessKey,{labelSize:7,valueSize:7,valueOffset:7.82});
  field(page,normal,bold,11.91,64.89,"NÚMERO DA NFS-e",d.number,{labelSize:7,valueOffset:7.82});
  field(page,normal,bold,156.47,64.89,"COMPETÊNCIA DA NFS-e",d.competency,{labelSize:7,valueOffset:7.82});
  field(page,normal,bold,301.04,64.89,"DATA E HORA DA EMISSÃO DA NFS-e",d.issueDate,{labelSize:7,valueOffset:7.82});
  field(page,normal,bold,11.91,85.12,"NÚMERO DA DPS",d.dpsNumber,{labelSize:7,valueOffset:7.82});
  field(page,normal,bold,156.47,85.12,"SÉRIE DA DPS",d.dpsSeries,{labelSize:7,valueOffset:7.82});
  field(page,normal,bold,301.04,85.12,"DATA E HORA DA EMISSÃO DA DPS",d.dpsIssueDate,{labelSize:7,valueOffset:7.82});
  field(page,normal,bold,11.91,105.34,"EMITENTE DA NFS-e",d.emitterType,{labelSize:7,valueOffset:7.82});
  field(page,normal,bold,156.47,105.34,"SITUAÇÃO DA NFS-e",d.status,{labelSize:7,valueOffset:7.82});
  field(page,normal,bold,301.04,105.34,"FINALIDADE",d.purpose,{labelSize:7,valueOffset:7.82});
  drawTop(page,normal,"A autenticidade desta NFS-e pode ser verificada",445.61,91.88,6);
  drawTop(page,normal,"pela leitura deste código QR ou pela consulta da",445.61,98.67,6);
  drawTop(page,normal,"chave de acesso no portal nacional da NFS-e",445.61,105.46,6);

  field(page,normal,bold,156.47,126.03,"CNPJ / CPF / NIF",d.prestador.doc);
  field(page,normal,bold,301.04,126.03,"Indicador Municipal (Inscrição)",d.prestador.municipalRegistration);
  field(page,normal,bold,445.61,126.03,"Telefone",d.prestador.phone);
  field(page,normal,bold,11.91,145.11,"Nome / Nome Empresarial",d.prestador.name,{valueWidth:270});
  field(page,normal,bold,301.04,145.11,"Município / Sigla UF",d.prestador.cityUf);
  field(page,normal,bold,445.61,145.11,"Código IBGE / CEP",d.prestador.ibgeCep);
  field(page,normal,bold,11.91,164.18,"Endereço",d.prestador.address,{valueWidth:280});
  field(page,normal,bold,301.04,164.18,"E-mail",d.prestador.email,{valueWidth:280});
  drawTop(page,bold,"Simples Nacional na Data de Competência",11.91,183.25,6);
  const sn=String(d.prestador.simpleNational||"-").replace("Porte","...");
  drawTop(page,normal,sn,11.91,189.96,7,{maxWidth:140});
  drawTop(page,bold,"Regime de Apuração Tributária pelo SN",156.47,183.25,6);
  drawTop(page,normal,d.prestador.taxRegime||"-",156.47,189.96,7,{maxWidth:280});

  field(page,normal,bold,156.47,202.83,"CNPJ / CPF / NIF",d.tomador.doc);
  field(page,normal,bold,301.04,202.83,"Indicador Municipal (Inscrição)",d.tomador.municipalRegistration);
  field(page,normal,bold,445.61,202.83,"Telefone",d.tomador.phone);
  field(page,normal,bold,11.91,221.90,"Nome / Nome Empresarial",d.tomador.name,{valueWidth:270});
  field(page,normal,bold,301.04,221.90,"Município / Sigla UF",d.tomador.cityUf);
  field(page,normal,bold,445.61,221.90,"Código IBGE / CEP",d.tomador.ibgeCep);
  field(page,normal,bold,11.91,240.98,"Endereço",d.tomador.address,{valueWidth:280});
  field(page,normal,bold,301.04,240.98,"E-mail",d.tomador.email,{valueWidth:280});

  const dst="DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e";
  const intm="INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e";
  drawTop(page,normal,dst,194.24,260.35,7);
  drawTop(page,normal,intm,192.30,268.78,7);

  field(page,normal,bold,156.47,277.40,"Código de Tributação Nacional/Municipal",d.service.nationalMunicipalCode);
  field(page,normal,bold,301.04,277.40,"Código da NBS",d.service.nbs);
  field(page,normal,bold,445.61,277.40,"Local da Prestação / Sigla UF / País",d.service.location);
  drawTop(page,normal,d.service.classification||"-",11.91,296.27,7,{maxWidth:276,lineGap:1});
  drawTop(page,bold,"Descrição do Serviço",11.91,308.65,6);
  drawTop(page,normal,d.service.description||"-",11.91,315.35,7,{maxWidth:560,lineGap:1.0});

  field(page,normal,bold,156,440.58,"Tipo de Tributação do ISSQN",d.municipalTax.type);
  field(page,normal,bold,301,440.58,"Município / Sigla UF / País de Incidência do ISSQN",d.municipalTax.incidence,{labelWidth:145});
  field(page,normal,bold,11,460.58,"BC ISSQN",d.municipalTax.base);
  field(page,normal,bold,156,460.58,"Alíquota Aplicada",d.municipalTax.rate);
  field(page,normal,bold,301,460.58,"Retenção do ISSQN",d.municipalTax.retention);
  field(page,normal,bold,445,460.58,"ISSQN Apurado",d.municipalTax.amount);

  field(page,normal,bold,156,480.58,"IRRF",d.federalTax.irrf);
  field(page,normal,bold,301,480.58,"Contribuição Previdenciária - Retida",d.federalTax.previdencia,{labelSize:6});
  field(page,normal,bold,445,480.58,"Contribuições Sociais - Retidas",d.federalTax.sociais,{labelSize:6});
  field(page,normal,bold,11,500.58,"PIS - Débito Apuração Própria",d.federalTax.pis);
  field(page,normal,bold,156,500.58,"COFINS - Débito Apuração Própria",d.federalTax.cofins);
  field(page,normal,bold,301,500.58,"Descrição Contrib. Sociais - Retidas",d.federalTax.retainedDescription);

  field(page,normal,bold,156,520.58,"CST / cClassTrib",d.ibsCbs.cstClass);
  drawTop(page,bold,"Indicador de Operação / Código IBGE Incidência / Município Incidência / Sigla UF",301,520.58,6,{maxWidth:286});
  drawTop(page,normal,d.ibsCbs.operationIncidence||"-",301,529.57,5.7,{maxWidth:286});
  field(page,normal,bold,11,542.58,"Exclusões e Reduções da Base de Cálculo",d.ibsCbs.exclusions);
  field(page,normal,bold,156,542.58,"Base de Cálculo Após Exclusões e Reduções",d.ibsCbs.base);
  field(page,normal,bold,301,542.58,"Red. Alíquota IBS / Red. Alíquota CBS",d.ibsCbs.reduction);
  field(page,normal,bold,445,542.58,"Alíquota - IBS UF / IBS Mun",d.ibsCbs.rateUfMun);
  field(page,normal,bold,11,565.58,"Alíq. Efetiva Municipal - IBS",d.ibsCbs.effectiveMunicipal);
  field(page,normal,bold,156,565.58,"Valor Apurado Municipal - IBS",d.ibsCbs.amountMunicipal);
  field(page,normal,bold,301,565.58,"Alíq. Efetiva Estadual - IBS",d.ibsCbs.effectiveState);
  field(page,normal,bold,445,565.58,"Valor Apurado Estadual - IBS",d.ibsCbs.amountState);
  field(page,normal,bold,11,588.58,"Valor Total Apurado - IBS",d.ibsCbs.totalIbs);
  field(page,normal,bold,156,588.58,"Alíquota - CBS",d.ibsCbs.cbsRate);
  field(page,normal,bold,301,588.58,"Alíquota Efetiva - CBS",d.ibsCbs.cbsEffective);
  field(page,normal,bold,445,588.58,"Valor Total Apurado - CBS",d.ibsCbs.cbsTotal);

  field(page,normal,bold,156,604.58,"VALOR DA OPERAÇÃO / SERVIÇO",d.totals.operation);
  field(page,normal,bold,301,604.58,"Desconto Incondicionado",d.totals.unconditionalDiscount);
  field(page,normal,bold,445,604.58,"Desconto Condicionado",d.totals.conditionalDiscount);
  field(page,normal,bold,11,624.58,"Total das Retenções (ISSQN / Federais)",d.totals.retentions);
  field(page,normal,bold,156,624.58,"VALOR LÍQUIDO DA NFS-e",d.totals.net);
  field(page,normal,bold,301,624.58,"Total do IBS/CBS",d.totals.ibsCbs);
  field(page,normal,bold,445,624.58,"VALOR LÍQUIDO DA NFS-e + IBS/CBS",d.totals.netPlusIbsCbs);

  drawTop(page,normal,"Inf. Cont.: "+(d.additionalInfo||"-"),11,655.54,6.1,{maxWidth:565});
  drawTop(page,normal,d.approximateTaxes||"-",11,677.54,6.1,{maxWidth:565});
  drawTop(page,bold,"DATA CIENTIFICAÇÃO:",12.91,796.50,6);
  drawTop(page,bold,"IDENTIFICAÇÃO E ASSINATURA",157.48,796.50,6);
  drawTop(page,bold,"N° NFS-e / CHAVE NFS-e",302.04,796.50,6);
  drawTop(page,normal,d.number+" / "+d.accessKey,302.04,803.20,7,{maxWidth:280});

  return await pdf.save({useObjectStreams:false});
}
