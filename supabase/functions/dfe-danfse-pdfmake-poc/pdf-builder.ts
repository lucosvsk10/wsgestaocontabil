import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1?target=deno";
import qrcode from "https://esm.sh/qrcode-generator@1.4.4?target=deno";
import type { DanfseData } from "./types.ts";
import { NFS_LOGO_PNG_BASE64 } from "./logo-data.ts";

const W=595,H=842;
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
  rect(page,5.5,top,584,11,{fill:GRAY});
  drawTop(page,bold,title,9.5,top+1.71,7);
}
function field(page:any,normal:any,bold:any,x:number,top:number,label:string,value:string,opts:any={}){
  drawTop(page,bold,label,x,top,opts.labelSize??6,{maxWidth:opts.labelWidth});
  drawTop(page,normal,value||"-",x,top+(opts.valueOffset??8.9),opts.valueSize??7,{maxWidth:opts.valueWidth,lineGap:opts.lineGap});
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

  // Moldura e faixas exatamente nas coordenadas do DANFSe oficial de referência.
  rect(page,5.5,5,584,832,{borderWidth:1,borderColor:BLACK});
  rect(page,5.5,5,584,34.5,{fill:GRAY});
  line(page,5.5,39.5,589.5,39.5,.5,BLACK);

  section(page,bold,"PRESTADOR / FORNECEDOR",126);
  [152,296,441].forEach(x=>line(page,x,126,x,203,.5,MID));
  line(page,5.5,203,589.5,203,.5,BLACK);

  section(page,bold,"TOMADOR / ADQUIRENTE",203);
  [152,296,441].forEach(x=>line(page,x,203,x,267,.5,MID));
  line(page,5.5,267,589.5,267,.5,BLACK);
  line(page,5.5,268.5,589.5,268.5,.5,BLACK);
  line(page,5.5,277.5,589.5,277.5,.5,BLACK);
  line(page,5.5,286.5,589.5,286.5,.5,BLACK);

  section(page,bold,"SERVIÇO PRESTADO",286.5);
  line(page,152,286.5,152,438,.5,MID);
  line(page,296,286.5,296,317,.5,MID);
  line(page,441,286.5,441,317,.5,MID);
  line(page,5.5,438,589.5,438,.5,BLACK);

  section(page,bold,"TRIBUTAÇÃO MUNICIPAL (ISSQN)",438);
  [152,296,441].forEach(x=>line(page,x,438,x,478,.5,MID));
  line(page,5.5,478,589.5,478,.5,BLACK);

  section(page,bold,"TRIBUTAÇÃO FEDERAL (EXCETO CBS)",478);
  line(page,152,478,152,518,.5,MID);
  line(page,296,478,296,518,.5,MID);
  line(page,441,478,441,498,.5,MID);
  line(page,5.5,518,589.5,518,.5,BLACK);

  section(page,bold,"TRIBUTAÇÃO IBS/CBS",518);
  [152,296,441].forEach(x=>line(page,x,518,x,602,.5,MID));
  line(page,5.5,602,589.5,602,.5,BLACK);

  section(page,bold,"VALOR TOTAL DA NFS-e",602);
  [152,296,441].forEach(x=>line(page,x,602,x,642,.5,MID));
  rect(page,441,622,148.5,20,{fill:GRAY});
  line(page,5.5,642,589.5,642,.5,BLACK);

  section(page,bold,"INFORMAÇÕES COMPLEMENTARES",642);
  line(page,5.5,811,589.5,811,.5,BLACK);
  line(page,151,811,151,833,.5,MID);
  line(page,296,811,296,833,.5,MID);
  line(page,5.5,833,589.5,833,.5,BLACK);

  page.drawImage(logo,{x:13.9,y:H-9.5-22.7,width:113.4,height:22.7});
  drawTop(page,bold,"DANFSe v2.0",261.94,9.6,11.5);
  drawTop(page,bold,"Documento Auxiliar da NFS-e",230.17,21.43,9.6);
  drawTop(page,normal,"Município: "+d.issueCity+" - "+d.issueUf,445,9.97,7.1);
  drawTop(page,normal,"Ambiente Gerador: "+d.generatorEnvironment,445,20.09,5.5);
  drawTop(page,normal,"Tipo de Ambiente: "+d.environmentType,445,26.79,5.5);

  drawQr(page,d.qrValue,493,40.9134,43.0866);
  field(page,normal,bold,11,43.58,"CHAVE DE ACESSO DA NFS-e",d.accessKey,{valueSize:6.3,valueOffset:8.95});
  field(page,normal,bold,11,63.58,"NÚMERO DA NFS-e",d.number);
  field(page,normal,bold,156,63.58,"COMPETÊNCIA DA NFS-e",d.competency);
  field(page,normal,bold,301,63.58,"DATA E HORA DA EMISSÃO DA NFS-e",d.issueDate);
  field(page,normal,bold,11,83.58,"NÚMERO DA DPS",d.dpsNumber);
  field(page,normal,bold,156,83.58,"SÉRIE DA DPS",d.dpsSeries);
  field(page,normal,bold,301,83.58,"DATA E HORA DA EMISSÃO DA DPS",d.dpsIssueDate);
  field(page,normal,bold,11,103.58,"EMITENTE DA NFS-e",d.emitterType);
  field(page,normal,bold,156,103.58,"SITUAÇÃO DA NFS-e",d.status);
  field(page,normal,bold,301,103.58,"FINALIDADE",d.purpose);
  drawTop(page,normal,"A autenticidade desta NFS-e pode ser verificada",445,92.05,6);
  drawTop(page,normal,"pela leitura deste código QR ou pela consulta da",445,98.55,6);
  drawTop(page,normal,"chave de acesso no portal nacional da NFS-e",445,105.05,6);

  field(page,normal,bold,156,128.58,"CNPJ / CPF / NIF",d.prestador.doc);
  field(page,normal,bold,301,128.58,"Indicador Municipal (Inscrição)",d.prestador.municipalRegistration);
  field(page,normal,bold,445,128.58,"Telefone",d.prestador.phone);
  field(page,normal,bold,11,150.58,"Nome / Nome Empresarial",d.prestador.name,{valueSize:6.6,valueOffset:8.92,valueWidth:270});
  field(page,normal,bold,301,150.58,"Município / Sigla UF",d.prestador.cityUf);
  field(page,normal,bold,445,150.58,"Código IBGE / CEP",d.prestador.ibgeCep);
  field(page,normal,bold,11,172.58,"Endereço",d.prestador.address,{valueSize:6.4,valueOffset:8.94,valueWidth:280});
  field(page,normal,bold,301,172.58,"E-mail",d.prestador.email,{valueSize:6.2,valueOffset:8.96,valueWidth:280});
  drawTop(page,bold,"Simples Nacional na Data de Competência",11,191.58,6);
  const sn=String(d.prestador.simpleNational||"-").replace("Porte","...");
  drawTop(page,normal,sn,11,200.56,5.8,{maxWidth:140});
  drawTop(page,bold,"Regime de Apuração Tributária pelo SN",156,191.58,6);
  drawTop(page,normal,d.prestador.taxRegime||"-",156,200.56,5.8,{maxWidth:280});

  field(page,normal,bold,156,205.58,"CNPJ / CPF / NIF",d.tomador.doc);
  field(page,normal,bold,301,205.58,"Indicador Municipal (Inscrição)",d.tomador.municipalRegistration);
  field(page,normal,bold,445,205.58,"Telefone",d.tomador.phone);
  field(page,normal,bold,11,227.58,"Nome / Nome Empresarial",d.tomador.name,{valueSize:6.6,valueOffset:8.92,valueWidth:270});
  field(page,normal,bold,301,227.58,"Município / Sigla UF",d.tomador.cityUf);
  field(page,normal,bold,445,227.58,"Código IBGE / CEP",d.tomador.ibgeCep);
  field(page,normal,bold,11,249.58,"Endereço",d.tomador.address,{valueSize:6.4,valueOffset:8.94,valueWidth:280});
  field(page,normal,bold,301,249.58,"E-mail",d.tomador.email,{valueSize:6.2,valueOffset:8.96,valueWidth:280});

  const dst="DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e";
  const intm="INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e";
  drawTop(page,bold,dst,211.32,268.59,5.8);
  drawTop(page,bold,intm,209.35,277.59,5.8);

  field(page,normal,bold,156,289.08,"Código de Tributação Nacional/Municipal",d.service.nationalMunicipalCode);
  field(page,normal,bold,301,289.08,"Código da NBS",d.service.nbs);
  field(page,normal,bold,445,289.08,"Local da Prestação / Sigla UF / País",d.service.location);
  drawTop(page,normal,d.service.classification||"-",11,309.55,6,{maxWidth:276,lineGap:1});
  drawTop(page,bold,"Descrição do Serviço",11,325.59,5.8);
  drawTop(page,normal,d.service.description||"-",11,336.55,6,{maxWidth:420,lineGap:1});

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
  drawTop(page,bold,"DATA CIENTIFICAÇÃO:",11,813.6,5.7);
  drawTop(page,bold,"IDENTIFICAÇÃO E ASSINATURA",156,813.6,5.7);
  drawTop(page,bold,"N° NFS-e / CHAVE NFS-e",301,813.58,6);
  drawTop(page,normal,d.number+" / "+d.accessKey,301,822.57,5.8,{maxWidth:280});

  return await pdf.save({useObjectStreams:false});
}
