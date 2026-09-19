import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1?target=deno";
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
const readU16=(b:Uint8Array,o:number)=>(b[o]<<8)|b[o+1];
const readU32=(b:Uint8Array,o:number)=>((b[o]*0x1000000)+(b[o+1]<<16)+(b[o+2]<<8)+b[o+3])>>>0;
const writeU16=(b:Uint8Array,o:number,v:number)=>{b[o]=(v>>>8)&255;b[o+1]=v&255;};
const writeU32=(b:Uint8Array,o:number,v:number)=>{b[o]=(v>>>24)&255;b[o+1]=(v>>>16)&255;b[o+2]=(v>>>8)&255;b[o+3]=v&255;};
const align4=(n:number)=>(n+3)&~3;
const inflateDeflate=async(bytes:Uint8Array)=>{
  const ds=new DecompressionStream("deflate");
  const stream=new Blob([bytes]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
};
const woffToTtf=async(base64:string)=>{
  const woff=b64bytes(base64);
  if(String.fromCharCode(...woff.subarray(0,4))!=="wOFF") throw new Error("Fonte WOFF oficial inválida");
  const flavor=readU32(woff,4);
  const numTables=readU16(woff,12);
  const records:{tag:Uint8Array,offset:number,compLength:number,origLength:number,checksum:number,data?:Uint8Array}[]=[];
  for(let i=0;i<numTables;i++){
    const o=44+i*20;
    records.push({
      tag:woff.slice(o,o+4),
      offset:readU32(woff,o+4),
      compLength:readU32(woff,o+8),
      origLength:readU32(woff,o+12),
      checksum:readU32(woff,o+16)
    });
  }
  for(const r of records){
    const raw=woff.slice(r.offset,r.offset+r.compLength);
    r.data=r.compLength<r.origLength?await inflateDeflate(raw):raw;
    if(r.data.length!==r.origLength) throw new Error("Falha ao expandir tabela da fonte oficial");
  }
  const maxPow=2**Math.floor(Math.log2(Math.max(1,numTables)));
  const searchRange=maxPow*16;
  const entrySelector=Math.floor(Math.log2(maxPow));
  const rangeShift=numTables*16-searchRange;
  let dataOffset=12+numTables*16;
  const tableOffsets:number[]=[];
  for(const r of records){dataOffset=align4(dataOffset);tableOffsets.push(dataOffset);dataOffset+=align4(r.origLength);}
  const out=new Uint8Array(dataOffset);
  writeU32(out,0,flavor);writeU16(out,4,numTables);writeU16(out,6,searchRange);writeU16(out,8,entrySelector);writeU16(out,10,rangeShift);
  records.forEach((r,i)=>{
    const o=12+i*16;
    out.set(r.tag,o);writeU32(out,o+4,r.checksum);writeU32(out,o+8,tableOffsets[i]);writeU32(out,o+12,r.origLength);
    out.set(r.data!,tableOffsets[i]);
  });
  return out;
};
const logoBase64=()=>{
  const m=DANFSE_OFFICIAL_TEMPLATE.match(/<img class="im" src="data:image\/png;base64,([^"]+)" style="z-index:127;[^"]+"/);
  if(!m) throw new Error("Logo oficial não encontrada no template");
  return m[1];
};

type Primitive =
  | {kind:"line",x1:number,y1:number,x2:number,y2:number,stroke:string,width:number}
  | {kind:"rect",x:number,y:number,w:number,h:number,fill?:string,stroke?:string,width:number};

const parsePathPrimitives=(d:string,fill?:string,stroke?:string,width=0):Primitive[]=>{
  const toks=d.match(/[MHVZ]|-?\d+(?:\.\d+)?/g)||[];
  let i=0,cx=0,cy=0,sx=0,sy=0;
  const out:Primitive[]=[];
  let points:{x:number,y:number}[]=[];
  const flushClosed=()=>{
    if(!points.length) return;
    const xs=points.map(p=>p.x), ys=points.map(p=>p.y);
    const minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);
    if(fill && fill!=="none"){
      out.push({kind:"rect",x:minX*S,y:H-maxY*S,w:(maxX-minX)*S,h:(maxY-minY)*S,fill,stroke:stroke&&stroke!=="none"?stroke:undefined,width:width*S});
    } else if(stroke && stroke!=="none"){
      for(let n=1;n<points.length;n++){
        const a=points[n-1],b=points[n];
        out.push({kind:"line",x1:a.x*S,y1:H-a.y*S,x2:b.x*S,y2:H-b.y*S,stroke,width:width*S});
      }
      if(points.length>2){
        const a=points[points.length-1],b=points[0];
        if(a.x!==b.x||a.y!==b.y) out.push({kind:"line",x1:a.x*S,y1:H-a.y*S,x2:b.x*S,y2:H-b.y*S,stroke,width:width*S});
      }
    }
    points=[];
  };
  while(i<toks.length){
    const t=toks[i++];
    if(t==="M"){
      if(points.length) flushClosed();
      cx=Number(toks[i++]); cy=Number(toks[i++]); sx=cx; sy=cy; points=[{x:cx,y:cy}];
    } else if(t==="H"){
      const nx=Number(toks[i++]);
      if(stroke&&stroke!=="none"&&!fill) out.push({kind:"line",x1:cx*S,y1:H-cy*S,x2:nx*S,y2:H-cy*S,stroke,width:width*S});
      cx=nx; points.push({x:cx,y:cy});
    } else if(t==="V"){
      const ny=Number(toks[i++]);
      if(stroke&&stroke!=="none"&&!fill) out.push({kind:"line",x1:cx*S,y1:H-cy*S,x2:cx*S,y2:H-ny*S,stroke,width:width*S});
      cy=ny; points.push({x:cx,y:cy});
    } else if(t==="Z"){
      if(fill&&fill!=="none") flushClosed();
      else {
        if(stroke&&stroke!=="none"&&(cx!==sx||cy!==sy)) out.push({kind:"line",x1:cx*S,y1:H-cy*S,x2:sx*S,y2:H-sy*S,stroke,width:width*S});
        points=[];
      }
      cx=sx;cy=sy;
    }
  }
  if(points.length && fill&&fill!=="none") flushClosed();
  return out;
};
const staticPrimitives=()=>{
  const out:Primitive[]=[];
  for(const m of DANFSE_OFFICIAL_TEMPLATE.matchAll(/<path d="([^"]+)"([^>]*)\/>/g)){
    const attrs=m[2];
    const fill=attrs.match(/fill="([^"]+)"/)?.[1];
    const stroke=attrs.match(/stroke="([^"]+)"/)?.[1];
    const width=Number(attrs.match(/stroke-width="([^"]+)"/)?.[1]||0);
    out.push(...parsePathPrimitives(m[1],fill,stroke,width));
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
    const x=Number(tr[1]),y=Number(tr[2]);
    if(Math.abs(y-411.53)<0.05 && (text==="Descrição"||text==="do"||text==="Serviço")) continue;
    out.push({cls:m[1],x,y,text});
  }
  return out;
};
const PRIMITIVES=staticPrimitives(), STATIC_TEXTS=staticTexts();

function drawTextTop(page:any,font:any,text:string,xPx:number,yPx:number,size:number,opts:any={}){
  const x=xPx*S;
  const ascent=opts.fontKind==="f0"?.905:.922;
  const baseline=H-yPx*S-size*ascent;
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
function fitEllipsis(font:any,text:string,size:number,maxWidth:number){
  const raw=String(text||"-").replace(/\s+/g," ").trim();
  if(font.widthOfTextAtSize(raw,size)<=maxWidth) return raw;
  const ellipsis="...";
  let out=raw;
  while(out && font.widthOfTextAtSize(out+ellipsis,size)>maxWidth) out=out.slice(0,-1).trimEnd();
  return (out||"")+ellipsis;
}
function drawField(page:any,font:any,text:string,x:number,y:number,width:number,opts:any={}){
  const size=opts.size||7;
  const maxWidth=width*S;
  if(opts.wrap){
    const lines=wrap(font,String(text||"-"),size,maxWidth);
    const gap=opts.lineGap??.92;
    lines.forEach((ln:string,i:number)=>drawTextTop(page,font,ln,x,y+i*(size/S*gap),size));
    return lines.length;
  }else{
    const value=opts.ellipsis?fitEllipsis(font,String(text||"-"),size,maxWidth):String(text||"-");
    drawTextTop(page,font,value,x,y,size,{maxWidth});
    return 1;
  }
}
function drawQr(page:any,value:string){
  const qr=qrcode(0,"M");qr.addData(value);qr.make();
  const n=qr.getModuleCount(),quiet=4,size=45,cell=size/(n+quiet*2),x=655.98*S,top=59.69*S;
  const y0=H-top-size;
  page.drawRectangle({x,y:y0,width:size,height:size,color:rgb(1,1,1)});
  for(let r=0;r<n;r++){
    let c=0;
    while(c<n){
      if(!qr.isDark(r,c)){c++;continue;}
      const start=c;
      while(c<n&&qr.isDark(r,c)) c++;
      const run=c-start;
      page.drawRectangle({
        x:x+(start+quiet)*cell,
        y:y0+size-(r+quiet+1)*cell,
        width:run*cell,
        height:cell,
        color:rgb(0,0,0)
      });
    }
  }
}
export async function buildDanfseFromOfficialTemplate(d:DanfseData){
  const pdf=await PDFDocument.create(); pdf.registerFontkit(fontkit as any);
  const page=pdf.addPage([595,842]);
  const f0=await pdf.embedFont(await woffToTtf(fontBase64("f0")),{subset:false});
  const f1=await pdf.embedFont(await woffToTtf(fontBase64("f1")),{subset:false});
  const dyn=await pdf.embedFont(StandardFonts.Helvetica);

  for(const p of PRIMITIVES){
    if(p.kind==="line"){
      page.drawLine({start:{x:p.x1,y:p.y1},end:{x:p.x2,y:p.y2},thickness:p.width||.5,color:hex(p.stroke)});
    }else{
      page.drawRectangle({x:p.x,y:p.y,width:p.w,height:p.h,color:p.fill?hex(p.fill):undefined,borderColor:p.stroke?hex(p.stroke):undefined,borderWidth:p.width||0});
    }
  }
  // Linhas horizontais explícitas do template oficial: evita perdas na conversão dos vetores.
  const drawTemplateH=(yPx:number,x1Px=11.3,x2Px=782.4,widthPx=.67)=>page.drawLine({
    start:{x:x1Px*S,y:H-yPx*S},
    end:{x:x2Px*S,y:H-yPx*S},
    thickness:widthPx*S,
    color:rgb(0,0,0)
  });
  [53.2,167.4,269.8,346.8,358,369.3,574.4,625.9,677.4,779.8,831.3].forEach(y=>drawTemplateH(y));
  drawTemplateH(1061.1,11.3,783.7,1.33);
  drawTemplateH(1087.8,11.3,783.7,1.33);
  const drawTemplateV=(xPx:number,y1Px:number,y2Px:number,widthPx=1.33)=>page.drawLine({
    start:{x:xPx*S,y:H-y1Px*S},
    end:{x:xPx*S,y:H-y2Px*S},
    thickness:widthPx*S,
    color:rgb(0,0,0)
  });
  [11.3,204.1,396.9,783.7].forEach(x=>drawTemplateV(x,1061.1,1087.8,1.33));
  // Moldura externa completa da página, garantindo topo/direita/base em todos os leitores.
  page.drawRectangle({
    x:6.7*S,
    y:H-1116*S,
    width:(786.7-6.7)*S,
    height:(1116-6.7)*S,
    borderWidth:1.33*S,
    borderColor:rgb(0,0,0)
  });

  const logo=await pdf.embedPng(b64bytes(logoBase64()));
  page.drawImage(logo,{x:15.87*S,y:H-(13.76+30.56)*S,width:154.2*S,height:30.56*S});

  for(const t of STATIC_TEXTS){
    const info=CLASS_INFO[t.cls];if(!info)continue;
    drawTextTop(page,info.font==="f0"?f0:f1,t.text,t.x,t.y,info.size,{fontKind:info.font});
  }

  drawTextTop(page,dyn,d.issueCity+" - "+d.issueUf,645.18,15.15,8);
  drawTextTop(page,dyn,d.generatorEnvironment,663.81,27.22,6);
  drawTextTop(page,dyn,d.environmentType,661.09,36.27,6);
  drawQr(page,d.qrValue);

  const F=(text:any,x:number,y:number,w:number,opts:any={})=>drawField(page,dyn,String(text??"-"),x,y,w,opts);
  F(d.accessKey,15.87,69.98,560);
  F(d.number,15.87,96.95,170); F(d.competency,208.63,96.95,170); F(d.issueDate,401.39,96.95,175);
  F(d.dpsNumber,15.87,123.91,170); F(d.dpsSeries,208.63,123.91,170); F(d.dpsIssueDate,401.39,123.91,175);
  F(d.emitterType,15.87,150.88,170); F(d.status,208.63,150.88,170); F(d.purpose,401.39,150.88,175);

  F(d.prestador.doc,208.63,176.98,175); F(d.prestador.municipalRegistration,401.39,176.98,175); F(d.prestador.phone,594.14,176.98,180);
  F(d.prestador.name,15.87,202.41,365); F(d.prestador.cityUf,401.39,202.41,175); F(d.prestador.ibgeCep,594.14,202.41,180);
  F(d.prestador.address,15.87,227.84,365); F(d.prestador.email,401.39,227.84,365);
  const simpleNational=String(d.prestador.simpleNational||"-").replace(/Pequeno Porte/i,"").trim().replace(/\s+$/,"");
  F(simpleNational.endsWith("de")?simpleNational+" ...":simpleNational,15.87,253.27,185,{ellipsis:true});
  F(d.prestador.taxRegime,208.63,253.27,370,{ellipsis:true});

  F(d.tomador.doc,208.63,279.37,175); F(d.tomador.municipalRegistration,401.39,279.37,175); F(d.tomador.phone,594.14,279.37,180);
  F(d.tomador.name,15.87,304.81,365); F(d.tomador.cityUf,401.39,304.81,175); F(d.tomador.ibgeCep,594.14,304.81,180);
  F(d.tomador.address,15.87,330.24,365); F(d.tomador.email,401.39,330.24,365);

  F(d.service.nationalMunicipalCode,208.63,378.80,180); F(d.service.nbs,401.39,378.80,180); F(d.service.location,594.14,378.80,180);
  const classLines=drawField(page,dyn,String(d.service.classification||"-"),15.87,395.03,190,{wrap:true,lineGap:1.13});
  const classStep=(7/S)*1.13;
  const descriptionLabelY=411.53+Math.max(0,classLines-1)*classStep;
  drawTextTop(page,f0,"Descrição",15.87,descriptionLabelY,6,{fontKind:"f0"});
  drawTextTop(page,f0,"do",56.34,descriptionLabelY,6,{fontKind:"f0"});
  drawTextTop(page,f0,"Serviço",68.34,descriptionLabelY,6,{fontKind:"f0"});
  const descriptionY=descriptionLabelY+8.93;
  drawField(page,dyn,String(d.service.description||"-"),15.87,descriptionY,752,{wrap:true,lineGap:1.13});

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
