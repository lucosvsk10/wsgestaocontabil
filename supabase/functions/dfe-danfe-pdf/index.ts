import { consume, limited } from '../_shared/rate-limit.ts';
import { readJsonLimited, RequestError } from '../_shared/request-guards.ts';
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.0';
import { PDFDocument, StandardFonts, degrees, rgb } from 'npm:pdf-lib@1.17.1';
import QRCode from 'npm:qrcode@1.5.4';
import bwipjs from 'npm:bwip-js@4.5.1';
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const J = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), {
    status: s,
    headers: { ...cors, 'content-type': 'application/json' },
  });
const clean = (v: unknown) => {
  const text = String(v ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text || /^(null|undefined|n\/a|nan)$/i.test(text)) return '';
  return text
    .replace(/(^|[\s,;/|-])(?:null|undefined)(?=($|[\s,;/|-]))/gi, '$1')
    .replace(/\s+,/g, ',')
    .replace(/,\s*,+/g, ',')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/^[,;\s-]+|[,;\s-]+$/g, '');
};
const cleanParts = (...values: unknown[]) =>
  values.map(clean).filter(Boolean).join(', ');
async function canAccessCompany(admin: any, userId: string, companyId: string) {
  const { data: roles } = await admin.from('user_roles').select('role').eq('user_id', userId);
  if (roles?.some((r: any) => r.role === 'admin')) return true;
  const { data: links } = await admin
    .from('extractor_companies')
    .select('account_id')
    .eq('fiscal_company_id', companyId)
    .eq('status', 'active');
  const ids = [...new Set((links || []).map((x: any) => String(x.account_id)).filter(Boolean))];
  if (!ids.length) return false;
  const { data: accounts } = await admin
    .from('extractor_accounts')
    .select('id,organization_id,status,lifetime_access,access_expires_at')
    .in('id', ids)
    .eq('status', 'active');
  const now = Date.now(),
    entitled = (accounts || []).filter(
      (a: any) =>
        a.lifetime_access === true ||
        (a.access_expires_at && new Date(a.access_expires_at).getTime() > now)
    );
  if (!entitled.length) return false;
  const orgs = entitled.map((a: any) => a.organization_id);
  const { data: members } = await admin
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('status', 'active')
    .in('organization_id', orgs)
    .limit(1);
  return Boolean(members?.length);
}
const dg = (v: unknown) => String(v ?? '').replace(/\D/g, '');
const tag = (x: string, n: string) =>
  x
    .match(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`, `i`))?.[1]
    ?.trim() || '';
const sections = (x: string, n: string) =>
  [
    ...x.matchAll(new RegExp(`<(?:\\w+:)?${n}(?:\\s[^>]*)?>([\\s\\S]*?)<\\/(?:\\w+:)?${n}>`, `gi`)),
  ].map(m => m[1]);
const money = (v: unknown) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (v: unknown) =>
  Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const cnpj = (v: unknown) => {
  const d = dg(v);
  return d.length === 14
    ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : d || '-';
};
const cpfCnpj = (v: unknown) => {
  const d = dg(v);
  if (d.length === 14) return cnpj(d);
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return d || '-';
};
const cep = (v: unknown) => {
  const d = dg(v);
  return d.length === 8 ? d.replace(/^(\d{5})(\d{3})$/, '$1-$2') : d || '-';
};
const dt = (v: unknown) => {
  const d = new Date(String(v || ''));
  return Number.isNaN(d.getTime())
    ? clean(v) || '-'
    : d.toLocaleString('pt-BR', { timeZone: 'America/Maceio' });
};
const dateOnly = (v: unknown) => {
  const d = new Date(String(v || ''));
  return Number.isNaN(d.getTime())
    ? clean(v) || '-'
    : d.toLocaleDateString('pt-BR', { timeZone: 'America/Maceio' });
};
const timeOnly = (v: unknown) => {
  const d = new Date(String(v || ''));
  return Number.isNaN(d.getTime())
    ? '-'
    : d.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZone: 'America/Maceio',
      });
};
const fmtKey = (v: unknown) =>
  dg(v)
    .replace(/(\d{4})(?=\d)/g, '$1 ')
    .trim();
const bytesFromDataUrl = (u: string) =>
  Uint8Array.from(atob(u.split(',')[1] || ''), c => c.charCodeAt(0));
const xmlDecode = (value: unknown) =>
  String(value ?? '')
    .trim()
    .replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/i, '$1')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>');
const mm = (value: number) => (value * 72) / 25.4;
async function qr(pdf: PDFDocument, value: string, margin = 4) {
  const data = await QRCode.toDataURL(xmlDecode(value), {
    margin,
    width: 640,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000', light: '#FFFFFF' },
  });
  return pdf.embedPng(bytesFromDataUrl(data));
}
async function barcode(pdf: PDFDocument, value: string) {
  try {
    return pdf.embedPng(
      new Uint8Array(
        await bwipjs.toBuffer({
          bcid: 'code128',
          text: value,
          scale: 2,
          height: 12,
          includetext: false,
          padding: 0,
        })
      )
    );
  } catch {
    return null;
  }
}
function pdfBase64(bytes: Uint8Array) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000)
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function buildNfce(doc: any, xml: string) {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const emit = tag(xml, 'emit');
  const endEmit = tag(emit, 'enderEmit');
  const dest = tag(xml, 'dest');
  const endDest = tag(dest, 'enderDest');
  const ide = tag(xml, 'ide');
  const tot = tag(xml, 'ICMSTot');
  const prot = tag(xml, 'infProt');
  const infAdic = tag(xml, 'infAdic');
  const items = sections(xml, 'det');
  const pag = tag(xml, 'pag');
  const tpAmb = tag(ide, 'tpAmb');
  const access = dg(doc.accessKey || tag(prot, 'chNFe'));
  const qrv = xmlDecode(tag(xml, 'qrCode'));
  const homolog = tpAmb === '2';

  const W = mm(80);
  const M = mm(3.2);
  const usable = W - M * 2;
  const extraInfo = clean(tag(infAdic, 'infCpl'));
  const baseH = mm(170);
  const H = Math.max(baseH, baseH + Math.max(0, items.length - 2) * 18 + Math.min(60, extraInfo.length / 8));
  const page = pdf.addPage([W, H]);
  const black = rgb(0, 0, 0);
  let y = H - mm(4);

  const widthOf = (s: string, size: number, b = false) => (b ? bold : reg).widthOfTextAtSize(s, size);
  const fit = (value: unknown, width: number, size: number, b = false) => {
    const font = b ? bold : reg;
    let out = clean(value) || '-';
    while (font.widthOfTextAtSize(out, size) > width && out.length > 4) out = out.slice(0, -4) + '...';
    return out;
  };
  const wrapFixed = (value: unknown, width: number, size: number, maxLines = 2, b = false) => {
    const font = b ? bold : reg;
    const words = (clean(value) || '-').split(/\s+/);
    const lines: string[] = [];
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (!line || font.widthOfTextAtSize(next, size) <= width) line = next;
      else {
        lines.push(line);
        line = word;
        if (lines.length === maxLines - 1) break;
      }
    }
    if (line && lines.length < maxLines) lines.push(line);
    if (lines.length === maxLines) {
      const consumed = lines.join(' ').split(/\s+/).length;
      if (consumed < words.length) {
        let last = lines[maxLines - 1];
        while (font.widthOfTextAtSize(last + '...', size) > width && last.length > 4) last = last.slice(0, -1);
        lines[maxLines - 1] = last.replace(/[.,;:]?$/, '') + '...';
      }
    }
    return lines;
  };
  const draw = (s: unknown, size = 7, b = false, align: 'left'|'center'|'right' = 'left', x = M, width = usable) => {
    const value = clean(s) || '-';
    const font = b ? bold : reg;
    let out = value;
    while (font.widthOfTextAtSize(out, size) > width && out.length > 4) out = out.slice(0, -4) + '...';
    const tw = font.widthOfTextAtSize(out, size);
    const dx = align === 'center' ? x + Math.max(0, (width - tw) / 2)
      : align === 'right' ? x + Math.max(0, width - tw)
      : x;
    page.drawText(out, { x: dx, y, size, font, color: black });
    y -= size + 2.3;
  };
  const wrapped = (s: unknown, size = 7, b = false, align: 'left'|'center' = 'left', width = usable) => {
    const value = clean(s);
    if (!value) { draw('-', size, b, align, M, width); return; }
    const font = b ? bold : reg;
    const words = value.split(/\s+/);
    let line = '';
    for (const word of words) {
      const next = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(next, size) <= width || !line) line = next;
      else {
        draw(line, size, b, align, M, width);
        line = word;
      }
    }
    if (line) draw(line, size, b, align, M, width);
  };
  const dash = (before = 5, after = 8) => {
    y -= before;
    const dashW = 3.2, gap = 2.3;
    for (let x=M; x < W-M; x += dashW + gap) {
      page.drawLine({
        start:{x,y},
        end:{x:Math.min(W-M,x+dashW),y},
        thickness:.55,
        color:black
      });
    }
    y -= after;
  };
  const leftRight = (label: string, value: unknown, boldValue = false, size = 7) => {
    const v = clean(value) || '-';
    page.drawText(label,{x:M,y,size,font:reg,color:black});
    const f = boldValue ? bold : reg;
    const tw = f.widthOfTextAtSize(v,size);
    page.drawText(v,{x:Math.max(M,W-M-tw),y,size,font:f,color:black});
    y -= size + 2.5;
  };
  const paymentName = (code: string) => ({
    '01':'Dinheiro','02':'Cheque','03':'Cartão de Crédito','04':'Cartão de Débito','05':'Crédito Loja',
    '10':'Vale Alimentação','11':'Vale Refeição','12':'Vale Presente','13':'Vale Combustível',
    '15':'Boleto Bancário','16':'Depósito Bancário','17':'Pagamento Instantâneo (PIX)',
    '18':'Transferência bancária','19':'Programa fidelidade','90':'Sem pagamento','99':'Outros'
  } as Record<string,string>)[code] || `Forma ${code || '-'}`;

  if (homolog) {
    draw('NF-E EMITIDA EM AMBIENTE DE', 8.7, false, 'center');
    draw('HOMOLOGAÇÃO - SEM VALOR FISCAL', 8.7, false, 'center');
  } else {
    wrapped(tag(emit,'xNome') || doc.issuerName || 'EMITENTE', 9, true, 'center');
  }
  draw(`CNPJ:${cnpj(tag(emit,'CNPJ') || doc.issuerCnpj)} IE:${tag(emit,'IE') || '-'}`, 6.8, false, 'center');
  wrapped(
    cleanParts(tag(endEmit,'xLgr'), tag(endEmit,'nro'), tag(endEmit,'xBairro'), tag(endEmit,'xMun'), tag(endEmit,'UF')),
    6.4,false,'center'
  );
  dash();

  draw('Documento Auxiliar da Nota Fiscal Eletrônica para', 7.2, false, 'center');
  draw('Consumidor Final', 7.2, false, 'center');
  dash();
  draw('DETALHE DA VENDA', 7.2, false, 'center');
  dash();

  const c1=M, c2=M+26, c3=W-M-94, c4=W-M-66, c5=W-M-35;
  page.drawText('CÓDIGO',{x:c1,y,size:5.5,font:bold,color:black});
  page.drawText('DESCRIÇÃO',{x:c2,y,size:5.5,font:bold,color:black});
  page.drawText('QTD',{x:c3,y,size:5.5,font:bold,color:black});
  page.drawText('UN',{x:c4,y,size:5.5,font:bold,color:black});
  page.drawText('VL.UN',{x:c5-20,y,size:5.5,font:bold,color:black});
  page.drawText('VL.TOT',{x:W-M-22,y,size:5.5,font:bold,color:black});
  y -= 9;

  for (const det of items) {
    const p = tag(det,'prod');
    const code = fit(tag(p,'cProd'), 24, 5.6);
    const desc = clean(tag(p,'xProd')) || '-';
    const qtyText = num(tag(p,'qCom'));
    const unit = fit(tag(p,'uCom'), 16, 5.6);
    const unitValue = num(tag(p,'vUnCom'));
    const totalValue = num(tag(p,'vProd'));

    const codeX=M;
    const descX=M+25;
    const qtyX=W-M-113;
    const unitX=W-M-82;
    const unitValueRight=W-M-34;
    const totalRight=W-M;
    const descWidth=Math.max(42, qtyX-descX-5);
    const descLines=wrapFixed(desc,descWidth,5.6,2);
    const rowHeight=descLines.length > 1 ? 17 : 10;

    page.drawText(code,{x:codeX,y,size:5.6,font:reg,color:black});
    descLines.forEach((line,index)=>page.drawText(line,{x:descX,y:y-index*7,size:5.6,font:reg,color:black}));
    page.drawText(qtyText,{x:Math.max(qtyX,unitX-4-widthOf(qtyText,5.6)),y,size:5.6,font:reg,color:black});
    page.drawText(unit,{x:unitX,y,size:5.6,font:reg,color:black});
    page.drawText(unitValue,{x:Math.max(unitX+15,unitValueRight-widthOf(unitValue,5.6)),y,size:5.6,font:reg,color:black});
    page.drawText(totalValue,{x:Math.max(unitValueRight+3,totalRight-widthOf(totalValue,5.6)),y,size:5.6,font:reg,color:black});
    y -= rowHeight;
  }

  dash();
  leftRight('QTD. TOTAL DE ITENS', String(items.length), false, 6.8);
  leftRight('VALOR DOS PRODUTOS', num(tag(tot,'vProd')), false, 6.8);
  leftRight('VALOR TOTAL R$', num(tag(tot,'vNF') || doc.value), true, 8.7);
  dash(6, 9);

  {
    const size=6.4;
    const label='Valor Pago';
    page.drawText('FORMAS DE PAGAMENTO',{x:M,y,size,font:reg,color:black});
    const tw=reg.widthOfTextAtSize(label,size);
    page.drawText(label,{x:W-M-tw,y,size,font:reg,color:black});
    y -= size + 6;
  }
  for (const p of sections(pag,'detPag')) {
    const code=tag(p,'tPag');
    leftRight(paymentName(code), num(tag(p,'vPag')), false,6.5);
  }
  dash();

  draw('Consulta pela chave de acesso em',6.3,false,'center');
  const urlChave = xmlDecode(tag(xml,'urlChave')) || 'Consulte a chave no portal fiscal indicado pela UF emissora';
  wrapped(urlChave,5.5,false,'center');
  y -= 2;
  draw('CHAVE DE ACESSO',6.0,true,'center');
  wrapped(fmtKey(access),5.9,false,'center');
  dash(6, 9);

  const consumerDoc = cpfCnpj(tag(dest,'CNPJ') || tag(dest,'CPF'));
  const consumerName = clean(tag(dest,'xNome'));
  if (consumerName || (consumerDoc && consumerDoc !== '-')) {
    wrapped(consumerName || consumerDoc,6.5,true,'center');
    if (consumerName && consumerDoc !== '-') draw(consumerDoc,6.2,false,'center');
    const consumerAddress=cleanParts(tag(endDest,'xLgr'),tag(endDest,'nro'),tag(endDest,'xMun'),tag(endDest,'UF'));
    if (consumerAddress) wrapped(consumerAddress,5.8,false,'center');
  } else {
    draw('CONSUMIDOR NÃO IDENTIFICADO',7.0,false,'center');
  }
  dash();

  y -= 5;
  draw(`Nº ${doc.number || tag(ide,'nNF') || '-'} Série ${doc.series || tag(ide,'serie') || '-'}`,10.2,true,'center');
  y -= 3;
  draw(`${dateOnly(doc.issueDate || tag(ide,'dhEmi'))} ${timeOnly(doc.issueDate || tag(ide,'dhEmi'))} - Via Consumidor`,6.1,false,'center');
  y -= 2;
  wrapped(`PROTOCOLO DE AUTORIZAÇÃO ${tag(prot,'nProt') || '-'} ${dateOnly(tag(prot,'dhRecbto'))} ${timeOnly(tag(prot,'dhRecbto'))}`,5.4,false,'center');
  y -= 3;
  dash(6, 9);

  draw('Consulta via leitor de QR Code',6.3,false,'center');
  y -= 3;
  if (qrv) {
    const qi=await qr(pdf,qrv,4);
    const qrSize=mm(36);
    const qrPad=mm(2);
    const qrX=(W-qrSize)/2;
    page.drawRectangle({x:qrX-qrPad,y:y-qrSize-qrPad-3,width:qrSize+qrPad*2,height:qrSize+qrPad*2,color:rgb(1,1,1)});
    page.drawImage(qi,{x:qrX,y:y-qrSize-3,width:qrSize,height:qrSize});
    y-=qrSize+18;
  } else {
    draw('QR Code indisponível no XML autorizado',5.8,false,'center');
  }

  if (homolog) {
    draw('EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM',7.1,false,'center');
    draw('VALOR FISCAL',7.1,false,'center');
  }
  y -= 4;
  const taxTotal=Number(tag(tot,'vTotTrib')||0);
  draw('ÁREA DE MENSAGEM DE INTERESSE DO CONTRIBUINTE',5.4,false,'center');
  leftRight('Tributos Totais Incidentes (Lei Federal 12.741/2012)', taxTotal ? num(taxTotal) : '0,00', false,5.5);
  if (extraInfo) wrapped(extraInfo,5.6,false,'left');

  return pdf.save();
}

async function buildNfse(doc: any, xml: string) {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28, H = 841.89, M = 6, C = W - M * 2;
  const page = pdf.addPage([W, H]);
  const black = rgb(0,0,0);
  const gray = rgb(.955,.955,.955);
  const line = rgb(.18,.18,.18);
  const py = (top:number) => H - top;

  const val = (v:unknown) => clean(v) || '-';
  const fmtPhone = (v:unknown) => {
    const d=dg(v);
    if(d.length===11) return d.replace(/^(\\d{2})(\\d{5})(\\d{4})$/,'($1) $2-$3');
    if(d.length===10) return d.replace(/^(\\d{2})(\\d{4})(\\d{4})$/,'($1) $2-$3');
    return d || '-';
  };
  const fmtIbge = (v:unknown) => {
    const d=dg(v);
    return d.length===7 ? d.replace(/^(\\d{2})(\\d{5})$/,'$1.$2') : d || '-';
  };
  const ufFromIbge = (v:unknown) => {
    const code=dg(v).slice(0,2);
    return ({'11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO','21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR','42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'} as Record<string,string>)[code] || '-';
  };
  const fmtTrib=(v:unknown)=>{const d=dg(v);return d.length===6?d.replace(/^(\\d{2})(\\d{2})(\\d{2})$/,'$1.$2.$3'):d||'-';};
  const fmtNbs=(v:unknown)=>{const d=dg(v);return d.length===9?`${d.slice(0,1)}.${d.slice(1,5)}.${d.slice(5,7)}.${d.slice(7)}`:d||'-';};
  const moneyOrDash=(v:unknown,zero=false)=>{
    const s=String(v??'').trim();
    if(!s) return zero?'R$ 0,00':'-';
    const n=Number(s.replace(',','.'));
    if(!Number.isFinite(n)) return '-';
    if(!zero&&n===0) return '-';
    return money(n);
  };

  const fit = (text:unknown,width:number,size:number,isBold=false) => {
    const font=isBold?bold:reg;
    let out=val(text);
    while(font.widthOfTextAtSize(out,size)>width && out.length>4) out=out.slice(0,-4)+'...';
    return out;
  };
  const wrap=(text:unknown,width:number,size:number,isBold=false,maxLines=99)=>{
    const font=isBold?bold:reg;
    const src=clean(text);
    if(!src) return ['-'];
    const words=src.split(/\\s+/);
    const lines:string[]=[];
    let cur='';
    for(const word of words){
      const next=cur?`${cur} ${word}`:word;
      if(!cur || font.widthOfTextAtSize(next,size)<=width) cur=next;
      else{
        lines.push(cur);
        cur=word;
        if(lines.length>=maxLines-1) break;
      }
    }
    if(cur && lines.length<maxLines) lines.push(cur);
    if(lines.length===maxLines){
      const used=lines.join(' ').split(/\\s+/).length;
      if(used<words.length){
        let last=lines[maxLines-1];
        while(font.widthOfTextAtSize(last+'...',size)>width && last.length>4) last=last.slice(0,-1);
        lines[maxLines-1]=last.replace(/[.,;:]?$/,'')+'...';
      }
    }
    return lines;
  };
  const txt=(text:unknown,x:number,top:number,width:number,size=5.8,isBold=false,align:'left'|'center'|'right'='left')=>{
    const font=isBold?bold:reg;
    const out=fit(text,width,size,isBold);
    const tw=font.widthOfTextAtSize(out,size);
    const dx=align==='center'?x+(width-tw)/2:align==='right'?x+width-tw:x;
    page.drawText(out,{x:Math.max(x,dx),y:py(top)-size,size,font,color:black});
  };
  const linesText=(text:unknown,x:number,top:number,width:number,height:number,size=5.6,lineHeight=6.6,isBold=false,align:'left'|'center'='left')=>{
    const maxLines=Math.max(1,Math.floor((height-4)/lineHeight));
    const lines=wrap(text,width,size,isBold,maxLines);
    lines.forEach((ln,i)=>{
      const font=isBold?bold:reg;
      const tw=font.widthOfTextAtSize(ln,size);
      const dx=align==='center'?x+Math.max(0,(width-tw)/2):x;
      page.drawText(ln,{x:dx,y:py(top+3+i*lineHeight)-size,size,font,color:black});
    });
  };
  const rect=(x:number,top:number,w:number,h:number,fill?:any,th=.45)=>{
    page.drawRectangle({x,y:py(top+h),width:w,height:h,borderWidth:th,borderColor:line,...(fill?{color:fill}:{})});
  };
  const cell=(x:number,top:number,w:number,h:number,label:string,value:unknown,opt:{labelSize?:number;valueSize?:number;boldValue?:boolean;wrap?:boolean;align?:'left'|'center'|'right'}={})=>{
    rect(x,top,w,h);
    const pad=3;
    txt(label,x+pad,top+2,w-pad*2,opt.labelSize??4.8,true);
    const valueTop=top+9;
    if(opt.wrap!==false) linesText(value,x+pad,valueTop,w-pad*2,h-10,opt.valueSize??5.55,6.25,opt.boldValue??false,opt.align==='center'?'center':'left');
    else txt(value,x+pad,valueTop,w-pad*2,opt.valueSize??5.55,opt.boldValue??false,opt.align??'left');
  };
  const band=(top:number,label:string,h=11)=>{
    rect(M,top,C,h,gray);
    txt(label,M+4,top+2,C-8,5.7,true);
  };
  const centerNote=(top:number,h:number,textValue:string)=>{
    rect(M,top,C,h);
    linesText(textValue,M+8,top+2,C-16,h-4,5.8,6.5,true,'center');
  };

  const inf=tag(xml,'infNFSe')||xml;
  const emit=tag(inf,'emit');
  const endE=tag(emit,'enderNac');
  const dps=tag(inf,'DPS');
  const infDps=tag(dps,'infDPS')||dps;
  const prest=tag(infDps,'prest');
  const regTrib=tag(prest,'regTrib');
  const toma=tag(infDps,'toma');
  const endT=tag(toma,'end');
  const endTN=tag(endT,'endNac');
  const serv=tag(infDps,'serv');
  const locPrest=tag(serv,'locPrest');
  const cServ=tag(serv,'cServ');
  const dpsVals=tag(infDps,'valores');
  const vServPrest=tag(dpsVals,'vServPrest');
  const trib=tag(dpsVals,'trib');
  const tribMun=tag(trib,'tribMun');
  const tribFed=tag(trib,'tribFed');
  const pisCofins=tag(tribFed,'piscofins');
  const vals=tag(inf,'valores');
  const key=dg(doc.accessKey||String(tag(inf,'Id')||'').replace(/^NFS/i,''));
  const issue=tag(infDps,'dhEmi')||doc.issueDate;
  const comp=tag(infDps,'dCompet')||issue;
  const issueCityCode=tag(endE,'cMun')||tag(infDps,'cLocEmi');
  const tomaCityCode=tag(endTN,'cMun');
  const prestCityCode=tag(locPrest,'cLocPrestacao');
  const incidenceCode=tag(inf,'cLocIncid');
  const issueUf=tag(endE,'UF')||ufFromIbge(issueCityCode);
  const tomaUf=tag(endT,'UF')||ufFromIbge(tomaCityCode);
  const prestUf=ufFromIbge(prestCityCode);
  const incidenceUf=ufFromIbge(incidenceCode);
  const serviceValue=tag(vServPrest,'vServ')||doc.value||tag(vals,'vLiq');
  const liquidValue=tag(vals,'vLiq')||serviceValue;
  const qrv=`https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${key}`;
  const municipalityName=async(code:string,fallback='')=>{
    if(clean(fallback)) return clean(fallback);
    const numeric=dg(code);
    if(numeric.length!==7) return '-';
    try{
      const response=await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${numeric}`,{headers:{accept:'application/json'},signal:AbortSignal.timeout(2500)});
      if(!response.ok) return '-';
      const payload=await response.json().catch(()=>({})) as any;
      return clean(payload?.nome)||'-';
    }catch{return '-';}
  };
  const tomaCityName=await municipalityName(tomaCityCode,tag(toma,'xMun'));
  const emitTypeCode=tag(inf,'tpEmit')||tag(infDps,'tpEmit')||'1';
  const emitType=emitTypeCode==='2'?'Tomador':emitTypeCode==='3'?'Intermediário':'Prestador';

  page.drawRectangle({x:M,y:py(837),width:C,height:831,borderWidth:.8,borderColor:black});

  // Header
  const headerTop=7, headerH=36;
  rect(M,headerTop,C,headerH);
  const logo=await pdf.embedPng(Uint8Array.from(atob('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'),ch=>ch.charCodeAt(0)));
  page.drawImage(logo,{x:M+6,y:py(headerTop+30),width:126,height:25});
  txt('DANFSe v2.0',185,headerTop+7,220,10.5,true,'center');
  txt('Documento Auxiliar da NFS-e',175,headerTop+21,240,8.8,true,'center');
  linesText(`Município: ${tag(inf,'xLocEmi')||'-'} - ${issueUf}\nAmbiente Gerador: ${tag(inf,'ambGer')||'-'}\nTipo de Ambiente: ${tag(infDps,'tpAmb')||'-'}`,434,headerTop+5,145,31,5.2,6.0,false);

  // Identification + QR
  const idTop=43, idH=86, leftW=432, rightW=C-leftW;
  rect(M,idTop,leftW,idH);
  rect(M+leftW,idTop,rightW,idH);
  const c1=145,c2=145,c3=leftW-c1-c2;
  cell(M,idTop,leftW,24,'CHAVE DE ACESSO DA NFS-e',key,{valueSize:5.3,wrap:false});
  cell(M,idTop+24,c1,20,'NÚMERO DA NFS-e',tag(inf,'nNFSe')||doc.number||'-',{wrap:false});
  cell(M+c1,idTop+24,c2,20,'COMPETÊNCIA DA NFS-e',dateOnly(comp),{wrap:false});
  cell(M+c1+c2,idTop+24,c3,20,'DATA E HORA DA EMISSÃO DA NFS-e',`${dateOnly(issue)} ${timeOnly(issue)}`,{valueSize:5.15,wrap:false});
  cell(M,idTop+44,c1,20,'NÚMERO DA DPS',tag(infDps,'nDPS')||'-',{wrap:false});
  cell(M+c1,idTop+44,c2,20,'SÉRIE DA DPS',tag(infDps,'serie')||doc.series||'-',{wrap:false});
  cell(M+c1+c2,idTop+44,c3,20,'DATA E HORA DA EMISSÃO DA DPS',`${dateOnly(issue)} ${timeOnly(issue)}`,{valueSize:5.15,wrap:false});
  cell(M,idTop+64,c1,22,'EMITENTE DA NFS-e',emitType,{wrap:false});
  cell(M+c1,idTop+64,c2,22,'SITUAÇÃO DA NFS-e',tag(inf,'cStat')==='100'?'NFS-e Gerada':tag(inf,'cStat')||'-',{wrap:false});
  cell(M+c1+c2,idTop+64,c3,22,'FINALIDADE',tag(infDps,'finNFSe')||'-',{wrap:false});
  if(key){
    const qi=await qr(pdf,qrv,4);
    const qs=53;
    page.drawRectangle({x:M+leftW+49,y:py(idTop+57),width:qs+8,height:qs+8,color:rgb(1,1,1)});
    page.drawImage(qi,{x:M+leftW+53,y:py(idTop+53),width:qs,height:qs});
  }
  linesText('A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e',M+leftW+6,idTop+60,rightW-12,24,4.85,5.5,false);

  let top=129;

  // Prestador
  band(top,'PRESTADOR / FORNECEDOR'); top+=11;
  cell(M,top,276,28,'Nome / Nome Empresarial',tag(emit,'xNome')||doc.issuerName||'-',{valueSize:5.7});
  cell(M+276,top,145,28,'CNPJ / CPF / NIF',cpfCnpj(tag(emit,'CNPJ')||tag(emit,'CPF')||doc.issuerCnpj),{wrap:false});
  cell(M+421,top,C-421,28,'Indicador Municipal (Inscrição)',tag(emit,'IM')||tag(prest,'IM')||'-',{valueSize:5.2});
  top+=28;
  cell(M,top,276,28,'Endereço',cleanParts(tag(endE,'xLgr'),tag(endE,'nro'),tag(endE,'xCpl'),tag(endE,'xBairro')),{valueSize:5.3});
  cell(M+276,top,145,28,'Município / Sigla UF',`${tag(inf,'xLocEmi')||'-'} / ${issueUf}`,{valueSize:5.25});
  cell(M+421,top,C-421,28,'E-mail / Telefone / Código IBGE / CEP',`${tag(emit,'email')||tag(prest,'email')||'-'} / ${fmtPhone(tag(emit,'fone')||tag(prest,'fone'))} / ${fmtIbge(issueCityCode)} / ${cep(tag(endE,'CEP'))}`,{labelSize:4.05,valueSize:4.25});
  top+=28;
  cell(M,top,276,28,'Simples Nacional na Data de Competência',tag(regTrib,'opSimpNac')==='1'?'Optante - Microempresa ou Empresa de Pequeno Porte':tag(regTrib,'opSimpNac')||'-',{valueSize:5.15});
  cell(M+276,top,C-276,28,'Regime de Apuração Tributária pelo SN',tag(regTrib,'regApTribSN')||'Regime de apuração dos tributos federais e municipal pelo Simples Nacional',{valueSize:5.15});
  top+=28;

  // Tomador
  band(top,'TOMADOR / ADQUIRENTE'); top+=11;
  cell(M,top,276,26,'Nome / Nome Empresarial',tag(toma,'xNome')||doc.recipientName||'-',{valueSize:5.6});
  cell(M+276,top,145,26,'CNPJ / CPF / NIF',cpfCnpj(tag(toma,'CNPJ')||tag(toma,'CPF')||doc.recipientCnpj),{wrap:false});
  cell(M+421,top,C-421,26,'Indicador Municipal (Inscrição)',tag(toma,'IM')||'-',{valueSize:5.1});
  top+=26;
  cell(M,top,276,26,'Endereço',cleanParts(tag(endT,'xLgr'),tag(endT,'nro'),tag(endT,'xCpl'),tag(endT,'xBairro')),{valueSize:5.25});
  cell(M+276,top,145,26,'Município / Sigla UF',`${tomaCityName} / ${tomaUf}`,{valueSize:5.2});
  cell(M+421,top,C-421,26,'E-mail / Telefone / Código IBGE / CEP',`${tag(toma,'email')||'-'} / ${fmtPhone(tag(toma,'fone'))} / ${fmtIbge(tomaCityCode)} / ${cep(tag(endTN,'CEP'))}`,{valueSize:4.6});
  top+=26;

  centerNote(top,18,'DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e · INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e'); top+=18;

  // Serviço
  band(top,'SERVIÇO PRESTADO'); top+=11;
  cell(M,top,200,38,'Código de Tributação Nacional/Municipal',`${fmtTrib(tag(cServ,'cTribNac'))} / ${tag(cServ,'cTribMun')||'-'}`,{valueSize:5.3});
  cell(M+200,top,155,38,'Código da NBS',fmtNbs(tag(cServ,'cNBS')),{valueSize:5.3});
  cell(M+355,top,C-355,38,'Local da Prestação / Sigla UF / País',`${tag(locPrest,'xLocPrestacao')||'-'} / ${prestUf} / ${tag(locPrest,'cPaisPrestacao')||'-'}`,{valueSize:5.1});
  top+=38;
  cell(M,top,C,21,'Classificação do Serviço',tag(inf,'xTribNac')||'-',{valueSize:5.35});
  top+=21;
  cell(M,top,C,120,'Descrição do Serviço',tag(cServ,'xDescServ')||'-',{valueSize:5.05});
  top+=120;

  // ISSQN
  band(top,'TRIBUTAÇÃO MUNICIPAL (ISSQN)'); top+=11;
  cell(M,top,145,24,'Tipo de Tributação do ISSQN',tag(tribMun,'tribISSQN')==='1'?'Operação Tributável':tag(tribMun,'tribISSQN')||'-',{valueSize:5.0});
  cell(M+145,top,220,24,'Município / Sigla UF / País de Incidência do ISSQN',`${tag(inf,'xLocIncid')||'-'} / ${incidenceUf} / -`,{valueSize:4.9});
  cell(M+365,top,72,24,'BC ISSQN',moneyOrDash(tag(tribMun,'vBC')),{valueSize:5.0});
  cell(M+437,top,72,24,'Alíquota',tag(tribMun,'pAliq')||'-',{valueSize:5.0});
  cell(M+509,top,C-509,24,'ISSQN Apurado',moneyOrDash(tag(tribMun,'vISSQN')),{valueSize:4.9});
  top+=24;
  cell(M,top,145,24,'Retenção do ISSQN',tag(tribMun,'tpRetISSQN')==='1'?'Retido':tag(tribMun,'tpRetISSQN')==='2'?'Não Retido':tag(tribMun,'tpRetISSQN')||'-',{valueSize:5.0});
  cell(M+145,top,C-145,24,'Observação',tag(tribMun,'xOutro')||'-',{valueSize:5.0});
  top+=24;

  // Federal
  band(top,'TRIBUTAÇÃO FEDERAL (EXCETO CBS)'); top+=11;
  const fedW=C/5;
  cell(M,top,fedW,23,'IRRF',moneyOrDash(tag(tribFed,'vRetIRRF')),{valueSize:5.0});
  cell(M+fedW,top,fedW,23,'Contrib. Previdenciária - Retida',moneyOrDash(tag(tribFed,'vRetCP')),{labelSize:4.25,valueSize:5.0});
  cell(M+fedW*2,top,fedW,23,'Contribuições Sociais - Retidas',moneyOrDash(tag(tribFed,'vRetCSLL')),{labelSize:4.25,valueSize:5.0});
  cell(M+fedW*3,top,fedW,23,'PIS - Débito Apuração Própria',moneyOrDash(tag(pisCofins,'vPis')),{labelSize:4.15,valueSize:5.0});
  cell(M+fedW*4,top,C-fedW*4,23,'COFINS - Débito Apuração Própria',moneyOrDash(tag(pisCofins,'vCofins')),{labelSize:4.05,valueSize:5.0});
  top+=23;
  cell(M,top,C,23,'Descrição Contrib. Sociais - Retidas',tag(tribFed,'xRet')||'-',{valueSize:5.0});
  top+=23;

  // IBS/CBS
  band(top,'TRIBUTAÇÃO IBS/CBS'); top+=11;
  const q=C/4;
  const ibsRows=[
    ['CST / cClassTrib',`${tag(inf,'CST')||'-'} / ${tag(inf,'cClassTrib')||'-'}`,'Indicador de Operação / Código IBGE Incidência',`${tag(inf,'indOp')||'-'} / ${fmtIbge(incidenceCode)}`,'Red. Alíquota IBS / Red. Alíquota CBS','- / -','Alíquota - IBS UF / IBS Mun','- / -'],
    ['Exclusões e Reduções da Base de Cálculo','R$ 0,00','Base de Cálculo Após Exclusões e Reduções','-','Alíq. Efetiva Estadual - IBS','-','Valor Apurado Estadual - IBS','-'],
    ['Alíq. Efetiva Municipal - IBS','-','Valor Apurado Municipal - IBS','-','Alíquota - CBS','-','Alíquota Efetiva - CBS','-'],
    ['Valor Total Apurado - IBS','-','Valor Total Apurado - CBS','-','Município Incidência / Sigla UF',`${tag(inf,'xLocIncid')||'-'} / ${incidenceUf}`,'Total IBS/CBS','R$ 0,00']
  ];
  for(const row of ibsRows){
    for(let i=0;i<4;i++) cell(M+q*i,top,q,20,row[i*2] as string,row[i*2+1],{labelSize:4.0,valueSize:4.85});
    top+=20;
  }

  // Totais
  band(top,'VALOR TOTAL DA NFS-e'); top+=11;
  cell(M,top,q,24,'VALOR DA OPERAÇÃO / SERVIÇO',money(serviceValue),{labelSize:4.5,valueSize:5.8,boldValue:true});
  cell(M+q,top,q,24,'Desconto Incondicionado',moneyOrDash(tag(vals,'vDescIncond')),{valueSize:5.0});
  cell(M+q*2,top,q,24,'Desconto Condicionado',moneyOrDash(tag(vals,'vDescCond')),{valueSize:5.0});
  cell(M+q*3,top,C-q*3,24,'Total das Retenções',moneyOrDash(tag(vals,'vTotRet')||tag(vals,'vTotalRet')),{valueSize:5.0});
  top+=24;
  cell(M,top,q,24,'VALOR LÍQUIDO DA NFS-e',money(liquidValue),{labelSize:4.55,valueSize:5.8,boldValue:true});
  cell(M+q,top,q,24,'Total do IBS/CBS','R$ 0,00',{valueSize:5.0});
  cell(M+q*2,top,C-q*2,24,'VALOR LÍQUIDO DA NFS-e + IBS/CBS','R$ 0,00',{labelSize:4.4,valueSize:5.3});
  top+=24;

  // Complementares
  band(top,'INFORMAÇÕES COMPLEMENTARES'); top+=11;
  const compText=cleanParts(tag(infDps,'infCpl'),tag(inf,'infCpl'),tag(serv,'infCpl')) || '-';
  cell(M,top,C,28,'Inf. Cont.',compText,{valueSize:4.75});
  top+=28;

  // Footer
  const footerH=Math.max(18,837-top);
  cell(M,top,145,footerH,'DATA CIENTIFICAÇÃO:','',{labelSize:4.5,valueSize:4.5});
  cell(M+145,top,145,footerH,'IDENTIFICAÇÃO E ASSINATURA','',{labelSize:4.5,valueSize:4.5});
  cell(M+290,top,C-290,footerH,'N° NFS-e / CHAVE NFS-e',`${tag(inf,'nNFSe')||doc.number||'-'} / ${key}`,{labelSize:4.5,valueSize:4.6});

  return pdf.save();
}
async function buildNfe(doc: any, xml: string) {
  const pdf = await PDFDocument.create();
  const reg = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const W = 595.28;
  const H = 841.89;
  const M = 5;
  const C = W - M * 2;
  let page = pdf.addPage([W, H]);
  let y = H - 5;
  const black = rgb(0.02, 0.02, 0.02),
    gray = rgb(0.96, 0.96, 0.96);
  const text = (s: string, x: number, yy: number, size = 5.5, b = false, max = 999) => {
    let v = clean(s) || '-',
      f = b ? bold : reg;
    while (f.widthOfTextAtSize(v, size) > max && v.length > 4) v = v.slice(0, -4) + '...';
    page.drawText(v, { x, y: yy, size, font: f, color: black });
  };
  const rect = (x: number, yy: number, w: number, h: number, fill?: any, th = 0.65) =>
    page.drawRectangle({
      x,
      y: yy,
      width: w,
      height: h,
      borderWidth: th,
      borderColor: black,
      color: fill,
    });
  const field = (x: number, top: number, w: number, h: number, l: string, v: string, b = false) => {
    rect(x, top - h, w, h);
    text(l, x + 2, top - 6, 4.1, true, w - 4);
    text(v, x + 2, top - h + 5, 5.3, b, w - 4);
  };
  const bar = (s: string) => {
    rect(M, y - 11, C, 11, gray);
    text(s, M + 2, y - 7, 4.8, true, C - 4);
    y -= 12;
  };
  const emit = tag(xml, 'emit'),
    dest = tag(xml, 'dest'),
    ide = tag(xml, 'ide'),
    tot = tag(xml, 'ICMSTot'),
    prot = tag(xml, 'infProt'),
    endE = tag(emit, 'enderEmit'),
    endD = tag(dest, 'enderDest'),
    items = sections(xml, 'det'),
    access = doc.accessKey || tag(prot, 'chNFe'),
    homolog = tag(ide, 'tpAmb') === '2';
  rect(M, y - 42, C, 42);
  text(
    `RECEBEMOS DE ${tag(emit, 'xNome') || doc.issuerName || '-'} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA ABAIXO. EMISSÃO: ${dateOnly(doc.issueDate || tag(ide, 'dhEmi'))} VALOR TOTAL: ${money(tag(tot, 'vNF') || doc.value)}`,
    M + 3,
    y - 9,
    4.8,
    true,
    C - 120
  );
  text('DATA DE RECEBIMENTO', M + 3, y - 27, 4.2, true);
  text('ASSINATURA DO RECEBEDOR', M + 120, y - 27, 4.2, true);
  text('NF-e', W - 75, y - 14, 14, true);
  text(
    `Nº. ${String(doc.number || tag(ide, 'nNF') || '-').padStart(9, '0')}`,
    W - 92,
    y - 27,
    7,
    true
  );
  text(
    `Série ${String(doc.series || tag(ide, 'serie') || '-').padStart(3, '0')}`,
    W - 80,
    y - 37,
    6,
    true
  );
  y -= 47;
  rect(M, y - 92, C, 92);
  rect(M, y - 92, 235, 92);
  text('IDENTIFICAÇÃO DO EMITENTE', M + 70, y - 7, 4.6, true);
  if (homolog) text('NF-E EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM VALOR FISCAL', M + 12, y - 18, 5.0, true, 210);
  text(tag(emit, 'xNome') || doc.issuerName || '-', M + 10, y - 34, 10, true, 215);
  text(`${tag(endE, 'xLgr') || '-'}, Nº${tag(endE, 'nro') || '-'}`, M + 45, y - 46, 5.5, true, 170);
  text(`${tag(endE, 'xBairro') || '-'} - ${tag(endE, 'CEP') || '-'}`, M + 65, y - 57, 5.5, true);
  text(
    `${tag(endE, 'xMun') || '-'} - ${tag(endE, 'UF') || '-'} Fone: ${tag(endE, 'fone') || tag(emit, 'fone') || '-'}`,
    M + 45,
    y - 68,
    5.5,
    true,
    180
  );
  rect(M + 235, y - 92, 110, 92);
  text('DANFE', M + 251, y - 26, 16, true);
  text('Documento Auxiliar da Nota', M + 242, y - 39, 5.3, true);
  text('Fiscal Eletrônica', M + 260, y - 48, 5.3, true);
  text('0 - ENTRADA', M + 242, y - 60, 5.5, true);
  text('1 - SAÍDA', M + 242, y - 69, 5.5, true);
  text(String(tag(ide, 'tpNF') || '1'), M + 321, y - 66, 12, true);
  text(
    `Nº. ${String(doc.number || tag(ide, 'nNF') || '-').padStart(9, '0')}`,
    M + 245,
    y - 80,
    7,
    true
  );
  text(
    `Série ${String(doc.series || tag(ide, 'serie') || '-').padStart(3, '0')}`,
    M + 263,
    y - 89,
    6,
    true
  );
  rect(M + 345, y - 92, C - 345, 92);
  const bc = await barcode(pdf, dg(access));
  if (bc) page.drawImage(bc, { x: M + 355, y: y - 38, width: C - 365, height: 29 });
  text('CHAVE DE ACESSO', M + 350, y - 47, 4.5, true);
  text(fmtKey(access), M + 350, y - 58, 6, true, C - 360);
  text(
    'Consulta de autenticidade no portal nacional da NF-e',
    M + 350,
    y - 70,
    4.5,
    false,
    C - 360
  );
  text(
    'www.nfe.fazenda.gov.br/portal ou no site da Sefaz Autorizadora',
    M + 350,
    y - 79,
    4.2,
    false,
    C - 360
  );
  text('PROTOCOLO DE AUTORIZAÇÃO DE USO', M + 350, y - 88, 4.2, true);
  y -= 94;
  field(M, y, C * 0.6, 24, 'NATUREZA DA OPERAÇÃO', tag(ide, 'natOp') || '-', true);
  field(
    M + C * 0.6,
    y,
    C * 0.4,
    24,
    'PROTOCOLO DE AUTORIZAÇÃO DE USO',
    `${tag(prot, 'nProt') || '-'} ${dt(tag(prot, 'dhRecbto'))}`
  );
  y -= 25;
  field(M, y, C * 0.25, 20, 'INSCRIÇÃO ESTADUAL', tag(emit, 'IE') || '-', true);
  field(M + C * 0.25, y, C * 0.25, 20, 'INSCRIÇÃO MUNICIPAL', tag(emit, 'IM') || '-');
  field(
    M + C * 0.5,
    y,
    C * 0.25,
    20,
    'INSCRIÇÃO ESTADUAL DO SUBST. TRIBUT.',
    tag(emit, 'IEST') || '-'
  );
  field(M + C * 0.75, y, C * 0.25, 20, 'CNPJ/CPF', cnpj(tag(emit, 'CNPJ') || doc.issuerCnpj), true);
  y -= 22;
  bar('DESTINATÁRIO / REMETENTE');
  field(M, y, C * 0.6, 21, 'NOME / RAZÃO SOCIAL', tag(dest, 'xNome') || '-', true);
  field(
    M + C * 0.6,
    y,
    C * 0.2,
    21,
    'CNPJ/CPF',
    cpfCnpj(tag(dest, 'CNPJ') || tag(dest, 'CPF') || doc.recipientCnpj),
    true
  );
  field(
    M + C * 0.8,
    y,
    C * 0.2,
    21,
    'DATA DA EMISSÃO',
    dateOnly(doc.issueDate || tag(ide, 'dhEmi')),
    true
  );
  y -= 22;
  field(
    M,
    y,
    C * 0.48,
    21,
    'ENDEREÇO',
    `${tag(endD, 'xLgr') || '-'}, Nº ${tag(endD, 'nro') || '-'}`,
    true
  );
  field(M + C * 0.48, y, C * 0.2, 21, 'BAIRRO/DISTRITO', tag(endD, 'xBairro') || '-');
  field(M + C * 0.68, y, C * 0.12, 21, 'CEP', cep(tag(endD, 'CEP')));
  field(
    M + C * 0.8,
    y,
    C * 0.2,
    21,
    'DATA DA SAÍDA/ENTRADA',
    dateOnly(tag(ide, 'dhSaiEnt') || doc.issueDate)
  );
  y -= 22;
  field(M, y, C * 0.42, 21, 'MUNICÍPIO', tag(endD, 'xMun') || '-');
  field(M + C * 0.42, y, C * 0.08, 21, 'UF', tag(endD, 'UF') || '-');
  field(M + C * 0.5, y, C * 0.18, 21, 'FONE/FAX', tag(endD, 'fone') || '-');
  field(M + C * 0.68, y, C * 0.12, 21, 'INSCRIÇÃO ESTADUAL', tag(dest, 'IE') || '-');
  field(
    M + C * 0.8,
    y,
    C * 0.2,
    21,
    'HORA DA SAÍDA/ENTRADA',
    timeOnly(tag(ide, 'dhSaiEnt') || doc.issueDate)
  );
  y -= 22;
  bar('CÁLCULO DO IMPOSTO');
  const vals: [[string, any]] | any = [
      ['Base Calc. ICMS', tag(tot, 'vBC')],
      ['Valor ICMS', tag(tot, 'vICMS')],
      ['ICMS Desonerado', tag(tot, 'vICMSDeson')],
      ['Base Calc. ICMS ST', tag(tot, 'vBCST')],
      ['ICMS Subst. Trib.', tag(tot, 'vST')],
      ['Valor FCP ST', tag(tot, 'vFCPST')],
      ['FCP Retido ST', tag(tot, 'vFCPSTRet')],
      ['Valor Produtos', tag(tot, 'vProd')],
      ['Valor Frete', tag(tot, 'vFrete')],
      ['Valor Seguro', tag(tot, 'vSeg')],
      ['Valor Desconto', tag(tot, 'vDesc')],
      ['Valor IPI', tag(tot, 'vIPI')],
      ['Valor PIS', tag(tot, 'vPIS')],
      ['Valor COFINS', tag(tot, 'vCOFINS')],
      ['Valor Total NF-e', tag(tot, 'vNF') || doc.value],
    ],
    cw = C / 8;
  for (let i = 0; i < 8; i++)
    field(M + cw * i, y, cw, 24, vals[i][0], num(vals[i][1]), i === 0 || i === 1 || i === 7);
  y -= 25;
  for (let i = 0; i < 7; i++)
    field(M + cw * i, y, cw, 24, vals[i + 8][0], num(vals[i + 8][1]), i === 6);
  field(M + cw * 7, y, cw, 24, 'VALOR TOTAL NF-e', num(tag(tot, 'vNF') || doc.value), true);
  y -= 26;
  bar('TRANSPORTADOR / VOLUMES TRANSPORTADOS');
  const transp = tag(xml, 'transp');
  const transporta = tag(transp, 'transporta');
  const vol = tag(transp, 'vol');
  field(M, y, C * 0.40, 23, 'RAZÃO SOCIAL', tag(transporta, 'xNome') || '-');
  field(M + C * 0.40, y, C * 0.12, 23, 'FRETE POR CONTA', tag(transp, 'modFrete') || '-');
  field(M + C * 0.52, y, C * 0.14, 23, 'CÓDIGO ANTT', tag(transporta, 'RNTC') || '-');
  field(M + C * 0.66, y, C * 0.16, 23, 'PLACA DO VEÍCULO', tag(tag(transp, 'veicTransp'), 'placa') || '-');
  field(M + C * 0.82, y, C * 0.18, 23, 'CNPJ/CPF', cpfCnpj(tag(transporta, 'CNPJ') || tag(transporta, 'CPF')));
  y -= 24;
  field(M, y, C * 0.40, 22, 'ENDEREÇO', tag(transporta, 'xEnder') || '-');
  field(M + C * 0.40, y, C * 0.28, 22, 'MUNICÍPIO', tag(transporta, 'xMun') || '-');
  field(M + C * 0.68, y, C * 0.08, 22, 'UF', tag(transporta, 'UF') || '-');
  field(M + C * 0.76, y, C * 0.24, 22, 'INSCRIÇÃO ESTADUAL', tag(transporta, 'IE') || '-');
  y -= 23;
  field(M, y, C * 0.24, 22, 'QUANTIDADE', tag(vol, 'qVol') || '-');
  field(M + C * 0.24, y, C * 0.20, 22, 'ESPÉCIE', tag(vol, 'esp') || '-');
  field(M + C * 0.44, y, C * 0.20, 22, 'MARCA', tag(vol, 'marca') || '-');
  field(M + C * 0.64, y, C * 0.18, 22, 'NUMERAÇÃO', tag(vol, 'nVol') || '-');
  field(M + C * 0.82, y, C * 0.09, 22, 'PESO BRUTO', num(tag(vol, 'pesoB')));
  field(M + C * 0.91, y, C * 0.09, 22, 'PESO LÍQUIDO', num(tag(vol, 'pesoL')));
  y -= 24;
  bar('DADOS DOS PRODUTOS / SERVIÇOS');
  const rawCols = [50, 145, 42, 26, 27, 25, 34, 39, 39, 33, 33, 30, 30, 32],
    rawTotal = rawCols.reduce((sum, value) => sum + value, 0),
    cols = rawCols.map(value => value * C / rawTotal),
    heads = [
      'CÓDIGO PRODUTO',
      'DESCRIÇÃO DO PRODUTO / SERVIÇO',
      'NCM/SH',
      'O/CST',
      'CFOP',
      'UN',
      'QUANT.',
      'VALOR UNIT',
      'VALOR TOTAL',
      'VALOR DESC',
      'B.CÁLC ICMS',
      'VALOR ICMS',
      'ALÍQ ICMS',
      'ALÍQ IPI',
    ];
  const drawProductHeader = () => {
    let hx = M;
    for (let i = 0; i < cols.length; i++) {
      rect(hx, y - 18, cols[i], 18, gray);
      text(heads[i], hx + 1, y - 7, 3.9, true, cols[i] - 2);
      hx += cols[i];
    }
    y -= 18;
  };
  const addContinuationPage = () => {
    page = pdf.addPage([W, H]);
    y = H - 18;
    text('DANFE - CONTINUAÇÃO', M, y, 8, true, 160);
    text(
      `NF-e Nº ${String(doc.number || tag(ide, 'nNF') || '-').padStart(9, '0')} · Série ${String(doc.series || tag(ide, 'serie') || '-').padStart(3, '0')}`,
      M + 170,
      y,
      6.2,
      true,
      C - 170
    );
    y -= 14;
    bar('DADOS DOS PRODUTOS / SERVIÇOS');
    drawProductHeader();
  };

  drawProductHeader();
  for (const det of items) {
    if (y < 95) addContinuationPage();
    const p = tag(det, 'prod'),
      imp = tag(det, 'imposto'),
      icms = tag(imp, 'ICMS'),
      row = [
        tag(p, 'cProd'),
        tag(p, 'xProd'),
        tag(p, 'NCM'),
        tag(icms, 'CST') || tag(icms, 'CSOSN'),
        tag(p, 'CFOP'),
        tag(p, 'uCom'),
        num(tag(p, 'qCom')),
        num(tag(p, 'vUnCom')),
        num(tag(p, 'vProd')),
        num(tag(p, 'vDesc')),
        num(tag(icms, 'vBC')),
        num(tag(icms, 'vICMS')),
        tag(icms, 'pICMS') || '0',
        tag(imp, 'pIPI') || '0',
      ];
    let x = M;
    for (let i = 0; i < cols.length; i++) {
      rect(x, y - 21, cols[i], 21, undefined, 0.35);
      text(String(row[i] || '-'), x + 1, y - 8, 3.8, i === 1, cols[i] - 2);
      x += cols[i];
    }
    y -= 21;
  }

  if (y < 82) addContinuationPage();
  if (y > 62) {
    const blankHeight = y - 62;
    let gx = M;
    for (let i = 0; i < cols.length; i++) {
      rect(gx, 62, cols[i], blankHeight, undefined, 0.35);
      gx += cols[i];
    }
    y = 60;
  }

  if (y >= 55) {
    bar('DADOS ADICIONAIS');
    field(
      M,
      y,
      C * 0.66,
      42,
      'INFORMAÇÕES COMPLEMENTARES',
      tag(tag(xml, 'infAdic'), 'infCpl') || '-'
    );
    field(
      M + C * 0.66,
      y,
      C * 0.34,
      42,
      'RESERVADO AO FISCO',
      tag(tag(xml, 'infAdic'), 'infAdFisco') || '-'
    );
  }
  if (homolog) {
    for (const watermarkPage of pdf.getPages()) {
      watermarkPage.drawText('SEM VALOR FISCAL', {
        x: 55, y: 265, size: 44, font: bold, color: rgb(0.32,0.32,0.32), opacity: 0.88,
      });
      watermarkPage.drawText('AMBIENTE DE HOMOLOGAÇÃO', {
        x: 55, y: 232, size: 27, font: bold, color: rgb(0.32,0.32,0.32), opacity: 0.88,
      });
    }
  }
  const status = doc.statusText || tag(prot, 'xMotivo') || '';
  if (/cancel/i.test(status) || ['101', '151', '155'].includes(String(doc.statusCode || ''))) {
    for (const watermarkPage of pdf.getPages()) {
      watermarkPage.drawText('CANCELADA', {
        x: 130,
        y: 430,
        size: 50,
        font: bold,
        color: rgb(0.8, 0.1, 0.1),
        opacity: 0.16,
        rotate: degrees(20),
      });
    }
  }
  return pdf.save();
}
Deno.serve(async req => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (req.method !== 'POST') return J({ error: 'Método não permitido' }, 405);
  try {
    const auth = req.headers.get('authorization') || '';
    if (!auth) return J({ error: 'Não autenticado' }, 401);
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const {
      data: { user },
    } = await admin.auth.getUser(auth.replace(/^Bearer\s+/i, ''));
    if (!user) return J({ error: 'Não autenticado' }, 401);
    const denied = limited(await consume(admin, 'dfe-danfe-pdf', user.id, 360, 600));
    if (denied) return denied;
    const body = await readJsonLimited(req, 2900000),
      doc = body.document || {},
      companyId = String(body.company_id || ''),
      xml = String(doc.xml || '');
    if (!(await canAccessCompany(admin, user.id, companyId)))
      return J({ error: 'Empresa não autorizada para esta conta' }, 403);
    if (!xml)
      return J(
        {
          error: 'XML completo não disponível para gerar o documento fiscal.',
          code: 'XML_REQUIRED',
        },
        422
      );
    if (doc.documentKind === 'evento' || doc.direction === 'relacionada')
      return J({ error: 'PDF não disponível para evento fiscal' }, 422);
    const isNFSe =
        doc.documentKind === 'nfse' ||
        /<(?:\w+:)?NFSe\b/i.test(xml) ||
        /<(?:\w+:)?infNFSe\b/i.test(xml),
      model = String(doc.model || tag(tag(xml, 'ide'), 'mod') || '');
    let bytes: Uint8Array, kind: string;
    if (isNFSe) {
      bytes = await buildNfse(doc, xml);
      kind = 'danfse-v2';
    } else if (model === '65') {
      bytes = await buildNfce(doc, xml);
      kind = 'nfce';
    } else {
      bytes = await buildNfe(doc, xml);
      kind = 'danfe';
    }
    return J({
      ok: true,
      pdf_base64: pdfBase64(bytes),
      filename: `${kind}-${doc.accessKey || doc.nsu || doc.number || 'documento'}.pdf`,
      document_model: isNFSe ? 'NFS-e' : model === '65' ? 'NFC-e' : 'NF-e',
      pdf_standard: isNFSe ? 'DANFSe v2.0 / NT 008-2026' : model === '65' ? 'DANFC-e' : 'DANFE',
      pdf_source: 'xml_authorized',
    });
  } catch (e) {
    return J(
      {
        error:
          e instanceof RequestError ? e.message : 'Não foi possível concluir a solicitação agora.',
      },
      e instanceof RequestError ? e.status : 500
    );
  }
});
