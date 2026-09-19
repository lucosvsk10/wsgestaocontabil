import { PDFDocument, rgb } from "https://esm.sh/pdf-lib@1.17.1?target=deno";
import fontkit from "https://esm.sh/@pdf-lib/fontkit@1.1.1?target=deno";
import qrcode from "https://esm.sh/qrcode-generator@1.4.4?target=deno";
import type { DanfseData } from "./types.ts";
import { DANFSE_OFFICIAL_TEMPLATE } from "./danfse-official-template.ts";

const S=.75, H=842;
const CLASS_INFO:Record<string,{font:"f0"|"f1",size:number}>={
  c0:{font:"f0",size:6}, c1:{font:"f1",size:7}, c2:{font:"f0",size:9},
  c3:{font:"f1",size:8}, c4:{font:"f1",size:6}, c5:{font:"f0",size:7}
};
const b64bytes=(s:string)=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
const decode=(s:string)=>s.replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/&quot;/g,'"').replace(/&#39;|&apos;/g,"'");
const hex=(v:string)=>{const h=v.replace("#","");return rgb(parseInt(h.slice(0,2),16)/255,parseInt(h.slice(2,4),16)/255,parseInt(h.slice(4,6),16)/255);};
const fontBase64=(family:string)=>{
  const marker='@font-face{font-family:"'+family+'";src:url(data:font/woff;base64,';
  const start=DANFSE_OFFICIAL_TEMPLATE.indexOf(marker);
  if(start<0) throw new Error("Fonte oficial "+family+" não encontrada no template");
  const from=start+marker.length;
  const end=DANFSE_OFFICIAL_TEMPLATE.indexOf(")",from);
  if(end<0) throw new Error("Fonte oficial "+family+" incompleta no template");
  return DANFSE_OFFICIAL_TEMPLATE.slice(from,end);
};
const logoBase64=()=>{
  const m=DANFSE_OFFICIAL_TEMPLATE.match(/<img class="im" src="data:image\/png;base64,([^"]+)" style="z-index:127;[^"]+"/);
  if(!m) throw new Error("Logo oficial não encontrada no template");
  return m[1];
};
const transformPath=(d:string)=>{
  const t=d.match(/[MHVZ]|-?\d+(?:\.\d+)?/g)||[]; let i=0,out:string[]=[];
  while(i<t.length){
    const c=t[i++];
    if(c==="M"){const x=Number(t[i++])*S,y=H-Number(t[i++])*S;out.push("M "+x+" "+y);}
    else if(c==="H"){out.push("H "+Number(t[i++])*S);}
    else if(c==="V"){out.push("V "+(H-Number(t[i++])*S));}
    else if(c==="Z")out.push("Z");
  }
  return out.join(" ");
};
const staticVectors=()=>{
  const out:{d:string,fill?:string,stroke?:string,width?:number}[]=[];
  for(const m of DANFSE_OFFICIAL_TEMPLATE.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)){
    const attrs=m[2];
    const fill=attrs.match(/fill="([^"]+)"/)?.[1];
    const stroke=attrs.match(/stroke="([^"]+)"/)?.[1];
    const width=Number(attrs.match(/stroke-width="([^"]+)"/)?.[1]||0)*S;
    out.push({d:transformPath(m[1]),fill:fill&&fill!=="none"?fill:undefined,stroke:stroke&&stroke!=="none"?stroke:undefined,width});
  }
  return out;
};
const staticTexts=()=>{
  const out:{cls:string,x:number,y:number,text:string}[]=[];
  const re=/<div class="t (c[0-5])(?: [^"]*)?"([^>]*)>([\s\S]*?)<\/div>/g;
  for(const m of DANFSE_OFFICIAL_TEMPLATE.matchAll(re)){
    const attrs=m[2];
    if(/data-bind=/.test(attrs)) continue;
    const tr=attrs.match(/transform:matrix\(1,0,0,1,([-\d.]+),([-\d.]+)\)/);
    if(!tr) continue;
    const text=decode(m[3].replace(/<[^>]+>/g,""));
    if(!text) continue;
    out.push({cls:m[1],x:Number(tr[1]),y:Number(tr[2]),text});
  }
  return out;
};
const VECTORS=staticVectors(), STATIC_TEXTS=staticTexts();

function drawTextTop(page:any,font:any,text:string,xPx:number,yPx:number,size:number,opts:any={}){
  const x=xPx*S;
  const baseline=H-yPx*S-size*1.07;
  page.drawText(text,{x,y:baseline,size,font,color:rgb(0,0,0),maxWidth:opts.maxWidth});
}
function wrap(font:any,text:string,size:number,maxWidth:number){
  const parts=String(text||"-").replace(/\r/g,"").split("\n");
  const lines:string[]=[];
  for(const para of parts){
    if(!para){lines.push("");continue;}
    const words=para.split(/\s+/); let line="";
    for(const word of words){
      const next=line?line+" "+word:word;
      if(!line||font.widthOfTextAtSize(next,size)<=maxWidth) line=next;
      else {lines.push(line);line=word;}
    }
    if(line) lines.push(line);
  }
  return lines.length?lines:["-"];
}
function drawField(page:any,font:any,text:string,x:number,y:number,width:number,opts:any={}){
  const size=opts.size||7;
  const maxWidth=width*S;
  if(opts.wrap){
    const lines=wrap(font,String(text||"-"),size,maxWidth);
    const gap=opts.lineGap??.92;
    lines.forEach((ln:string,i:number)=>drawTextTop(page,font,ln,x,y+i*(size/S*gap),size));
  }else{
    drawTextTop(page,font,String(text||"-"),x,y,size,{maxWidth});
  }
}
function drawQr(page:any,value:string){
  const qr=qrcode(6,"M");qr.addData(value);qr.make();
  const n=qr.getModuleCount(),quiet=2,size=45,cell=size/(n+quiet*2),x=655.98*S,top=59.69*S;
  const y0=H-top-size;
  page.drawRectangle({x,y:y0,width:size,height:size,color:rgb(1,1,1)});
  for(let r=0;r<n;r++)for(let c=0;c<n;c++)if(qr.isDark(r,c)){
    page.drawRectangle({x:x+(c+quiet)*cell,y:y0+size-(r+quiet+1)*cell,width:cell+.01,height:cell+.01,color:rgb(0,0,0)});
  }
}
export async function buildDanfseFromOfficialTemplate(d:DanfseData){
  const pdf=await PDFDocument.create(); pdf.registerFontkit(fontkit as any);
  const page=pdf.addPage([595,842]);
  const f0=await pdf.embedFont(b64bytes(fontBase64("f0")),{subset:false});
  const f1=await pdf.embedFont(b64bytes(fontBase64("f1")),{subset:false});

  for(const v of VECTORS){
    page.drawSvgPath(v.d,{
      color:v.fill?hex(v.fill):undefined,
      borderColor:v.stroke?hex(v.stroke):undefined,
      borderWidth:v.width||0
    });
  }
  const logo=await pdf.embedPng(b64bytes(logoBase64()));
  page.drawImage(logo,{x:15.87*S,y:H-(13.76+30.56)*S,width:154.2*S,height:30.56*S});

  for(const t of STATIC_TEXTS){
    const info=CLASS_INFO[t.cls];if(!info)continue;
    drawTextTop(page,info.font==="f0"?f0:f1,t.text,t.x,t.y,info.size);
  }

  drawTextTop(page,f1,d.issueCity+" - "+d.issueUf,645.18,15.15,8);
  drawTextTop(page,f1,d.generatorEnvironment,663.81,27.22,6);
  drawTextTop(page,f1,d.environmentType,661.09,36.27,6);
  drawQr(page,d.qrValue);

  const F=(text:any,x:number,y:number,w:number,opts:any={})=>drawField(page,f1,String(text??"-"),x,y,w,opts);
  F(d.accessKey,15.87,69.98,560);
  F(d.number,15.87,96.95,170); F(d.competency,208.63,96.95,170); F(d.issueDate,401.39,96.95,175);
  F(d.dpsNumber,15.87,123.91,170); F(d.dpsSeries,208.63,123.91,170); F(d.dpsIssueDate,401.39,123.91,175);
  F(d.emitterType,15.87,150.88,170); F(d.status,208.63,150.88,170); F(d.purpose,401.39,150.88,175);

  F(d.prestador.doc,208.63,176.98,175); F(d.prestador.municipalRegistration,401.39,176.98,175); F(d.prestador.phone,594.14,176.98,180);
  F(d.prestador.name,15.87,202.41,365); F(d.prestador.cityUf,401.39,202.41,175); F(d.prestador.ibgeCep,594.14,202.41,180);
  F(d.prestador.address,15.87,227.84,365); F(d.prestador.email,401.39,227.84,365);
  F(String(d.prestador.simpleNational||"-").replace("Porte","..."),15.87,253.27,185); F(d.prestador.taxRegime,208.63,253.27,370);

  F(d.tomador.doc,208.63,279.37,175); F(d.tomador.municipalRegistration,401.39,279.37,175); F(d.tomador.phone,594.14,279.37,180);
  F(d.tomador.name,15.87,304.81,365); F(d.tomador.cityUf,401.39,304.81,175); F(d.tomador.ibgeCep,594.14,304.81,180);
  F(d.tomador.address,15.87,330.24,365); F(d.tomador.email,401.39,330.24,365);

  F(d.service.nationalMunicipalCode,208.63,378.80,180); F(d.service.nbs,401.39,378.80,180); F(d.service.location,594.14,378.80,180);
  F(d.service.classification,15.87,395.03,190,{wrap:true,lineGap:1});
  F(d.service.description,15.87,420.46,752,{wrap:true,lineGap:1.13});

  F(d.municipalTax.type,208.63,583.89,180); F(d.municipalTax.incidence,401.39,583.89,365);
  F(d.municipalTax.base,15.87,609.32,180); F(d.municipalTax.rate,208.63,609.32,180); F(d.municipalTax.retention,401.39,609.32,180); F(d.municipalTax.amount,594.14,609.32,180);

  F(d.federalTax.irrf,208.63,635.42,180); F(d.federalTax.previdencia,401.39,635.42,180); F(d.federalTax.sociais,594.14,635.42,180);
  F(d.federalTax.pis,15.87,660.86,180); F(d.federalTax.cofins,208.63,660.86,180); F(d.federalTax.retainedDescription,401.39,660.86,365);

  F(d.ibsCbs.cstClass,208.63,686.95,180); F(d.ibsCbs.operationIncidence,401.39,686.95,365);
  F(d.ibsCbs.exclusions,15.87,712.39,180); F(d.ibsCbs.base,208.63,712.39,180); F(d.ibsCbs.reduction,401.39,712.39,180); F(d.ibsCbs.rateUfMun,594.14,712.39,180);
  F(d.ibsCbs.effectiveMunicipal,15.87,737.82,180); F(d.ibsCbs.amountMunicipal,208.63,737.82,180); F(d.ibsCbs.effectiveState,401.39,737.82,180); F(d.ibsCbs.amountState,594.14,737.82,180);
  F(d.ibsCbs.totalIbs,15.87,763.25,180); F(d.ibsCbs.cbsRate,208.63,763.25,180); F(d.ibsCbs.cbsEffective,401.39,763.25,180); F(d.ibsCbs.cbsTotal,594.14,763.25,180);

  F(d.totals.operation,208.63,789.35,180); F(d.totals.unconditionalDiscount,401.39,789.35,180); F(d.totals.conditionalDiscount,594.14,789.35,180);
  F(d.totals.retentions,15.87,814.78,180); F(d.totals.net,208.63,814.78,180); F(d.totals.ibsCbs,401.39,814.78,180); F(d.totals.netPlusIbsCbs,594.14,814.78,180);

  F("Inf. Cont.: "+(d.additionalInfo||"-"),15.87,848.08,752,{wrap:true,lineGap:1});
  F(d.approximateTaxes,15.87,858.65,752,{wrap:true,lineGap:1});
  F(d.number+" / "+d.accessKey,402.72,1070.94,375);

  return await pdf.save({useObjectStreams:false});
}
