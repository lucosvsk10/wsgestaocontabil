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
  const W = 595;
  const H = 842;
  const page = pdf.addPage([W, H]);
  const black = rgb(0.03, 0.03, 0.03);
  const lineGray = rgb(0.38, 0.38, 0.38);
  const fillGray = rgb(0.965, 0.965, 0.965);
  const M = 5.5;
  const R = W - M;
  const C = R - M;
  const y = (top: number) => H - top;

  const raw = (value: unknown) => clean(String(value ?? '').replace(/\r/g, ''));
  const val = (value: unknown) => clean(value) || '-';
  const fmtPhone = (value: unknown) => {
    const d = dg(value);
    if (d.length === 11) return d.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
    if (d.length === 10) return d.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
    return d || '-';
  };
  const fmtIbge = (value: unknown) => {
    const d = dg(value);
    return d.length === 7 ? d.replace(/^(\d{2})(\d{5})$/, '$1.$2') : d || '-';
  };
  const ufFromIbge = (value: unknown) => {
    const code = dg(value).slice(0, 2);
    return ({
      '11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO',
      '21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL',
      '28':'SE','29':'BA','31':'MG','32':'ES','33':'RJ','35':'SP','41':'PR',
      '42':'SC','43':'RS','50':'MS','51':'MT','52':'GO','53':'DF'
    } as Record<string,string>)[code] || '-';
  };
  const fmtTrib = (value: unknown) => {
    const d = dg(value);
    return d.length === 6 ? d.replace(/^(\d{2})(\d{2})(\d{2})$/, '$1.$2.$3') : d || '-';
  };
  const fmtNbs = (value: unknown) => {
    const d = dg(value);
    return d.length === 9 ? `${d.slice(0,1)}.${d.slice(1,5)}.${d.slice(5,7)}.${d.slice(7)}` : d || '-';
  };
  const moneyOrDash = (value: unknown, zero = false) => {
    const s = String(value ?? '').trim();
    if (!s) return zero ? 'R$ 0,00' : '-';
    const n = Number(s.replace(',', '.'));
    if (!Number.isFinite(n)) return '-';
    if (!zero && n === 0) return '-';
    return money(n);
  };
  const drawText = (
    textValue: unknown,
    x: number,
    top: number,
    size = 6.3,
    isBold = false,
    maxWidth = 999,
    align: 'left'|'center'|'right' = 'left'
  ) => {
    const font = isBold ? bold : reg;
    let textValueClean = val(textValue);
    while (font.widthOfTextAtSize(textValueClean, size) > maxWidth && textValueClean.length > 2) {
      textValueClean = textValueClean.slice(0, -4) + '...';
    }
    const width = font.widthOfTextAtSize(textValueClean, size);
    const dx = align === 'center' ? x + Math.max(0, (maxWidth - width) / 2)
      : align === 'right' ? x + Math.max(0, maxWidth - width)
      : x;
    page.drawText(textValueClean, { x: dx, y: y(top) - size, size, font, color: black });
  };
  const wrapLines = (textValue: unknown, width: number, size: number, isBold = false) => {
    const font = isBold ? bold : reg;
    const source = raw(textValue).replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n');
    const result: string[] = [];
    for (const paragraph of source.split(/\n/)) {
      if (!paragraph.trim()) {
        result.push('');
        continue;
      }
      let current = '';
      for (const word of paragraph.trim().split(/\s+/)) {
        const next = current ? `${current} ${word}` : word;
        if (font.widthOfTextAtSize(next, size) <= width || !current) current = next;
        else {
          result.push(current);
          current = word;
        }
      }
      if (current) result.push(current);
    }
    return result;
  };
  const drawWrapped = (
    textValue: unknown,
    x: number,
    top: number,
    width: number,
    size = 6.1,
    lineHeight = 7.1,
    maxLines = 99,
    isBold = false
  ) => {
    const lines = wrapLines(textValue, width, size, isBold).slice(0, maxLines);
    lines.forEach((line, index) => {
      if (line) page.drawText(line, {
        x,
        y: y(top + index * lineHeight) - size,
        size,
        font: isBold ? bold : reg,
        color: black,
      });
    });
    return lines.length * lineHeight;
  };
  const hLine = (top: number, x1 = M, x2 = R, thickness = 0.5, color = black) =>
    page.drawLine({ start:{x:x1,y:y(top)}, end:{x:x2,y:y(top)}, thickness, color });
  const vLine = (xv: number, top1: number, top2: number, thickness = 0.5, color = lineGray) =>
    page.drawLine({ start:{x:xv,y:y(top1)}, end:{x:xv,y:y(top2)}, thickness, color });
  const band = (top: number, label: string, height = 11) => {
    page.drawRectangle({ x:M, y:y(top + height), width:C, height, color:fillGray });
    hLine(top, M, R, 0.5);
    drawText(label, M + 4, top + 2.5, 6.25, true, C - 8);
  };
  const labelValue = (
    label: string,
    value: unknown,
    x: number,
    top: number,
    width: number,
    options: {labelSize?:number;valueSize?:number;boldValue?:boolean;wrap?:boolean;maxLines?:number} = {}
  ) => {
    drawText(label, x, top, options.labelSize ?? 5.45, true, width);
    if (options.wrap) drawWrapped(value, x, top + 9, width, options.valueSize ?? 6.25, 6.9, options.maxLines ?? 2, options.boldValue ?? false);
    else drawText(value, x, top + 9, options.valueSize ?? 6.25, options.boldValue ?? false, width);
  };

  const inf = tag(xml, 'infNFSe') || xml;
  const emit = tag(inf, 'emit');
  const endE = tag(emit, 'enderNac');
  const dps = tag(inf, 'DPS');
  const infDps = tag(dps, 'infDPS') || dps;
  const prest = tag(infDps, 'prest');
  const regTrib = tag(prest, 'regTrib');
  const toma = tag(infDps, 'toma');
  const endT = tag(toma, 'end');
  const endTN = tag(endT, 'endNac');
  const serv = tag(infDps, 'serv');
  const locPrest = tag(serv, 'locPrest');
  const cServ = tag(serv, 'cServ');
  const infoCompl = tag(serv, 'infoCompl');
  const dpsVals = tag(infDps, 'valores');
  const vServPrest = tag(dpsVals, 'vServPrest');
  const trib = tag(dpsVals, 'trib');
  const tribMun = tag(trib, 'tribMun');
  const tribFed = tag(trib, 'tribFed');
  const pisCofins = tag(tribFed, 'piscofins');
  const totTrib = tag(trib, 'totTrib');
  const vals = tag(inf, 'valores');
  const key = dg(doc.accessKey || String(tag(inf, 'Id') || '').replace(/^NFS/i, ''));
  const dpsIssue = tag(infDps, 'dhEmi') || doc.issueDate;
  const nfseIssue = tag(infDps, 'dhEmi') || tag(inf, 'dhProc') || doc.issueDate;
  const comp = tag(infDps, 'dCompet') || dpsIssue;
  const issueCityCode = tag(endE, 'cMun') || tag(infDps, 'cLocEmi');
  const tomaCityCode = tag(endTN, 'cMun');
  const prestCityCode = tag(locPrest, 'cLocPrestacao');
  const incidenceCode = tag(inf, 'cLocIncid');
  const issueUf = tag(endE, 'UF') || ufFromIbge(issueCityCode);
  const tomaUf = tag(endT, 'UF') || ufFromIbge(tomaCityCode);
  const prestUf = ufFromIbge(prestCityCode);
  const incidenceUf = ufFromIbge(incidenceCode);
  const serviceValue = tag(vServPrest, 'vServ') || doc.value || tag(vals, 'vLiq');
  const liquidValue = tag(vals, 'vLiq') || serviceValue;
  const qrv = `https://www.nfse.gov.br/ConsultaPublica/?tpc=1&chave=${key}`;
  const municipalityName = async (code: string, fallback = '') => {
    if (clean(fallback)) return clean(fallback);
    const numeric = dg(code);
    if (numeric.length !== 7) return '-';
    try {
      const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/municipios/${numeric}`, {
        headers: { accept: 'application/json' },
        signal: AbortSignal.timeout(2500),
      });
      if (!response.ok) return '-';
      const payload = await response.json().catch(() => ({})) as any;
      return clean(payload?.nome) || '-';
    } catch {
      return '-';
    }
  };
  const tomaCityName = await municipalityName(tomaCityCode, tag(toma,'xMun'));
  const emitTypeCode = tag(inf,'tpEmit') || tag(infDps,'tpEmit') || '1';
  const emitType = emitTypeCode === '2' ? 'Tomador' : emitTypeCode === '3' ? 'Intermediário' : 'Prestador';
  const homolog = tag(infDps,'tpAmb') === '2';

  page.drawRectangle({ x:M, y:y(837), width:C, height:832, borderWidth:1, borderColor:black });

  const logo = await pdf.embedPng(Uint8Array.from(atob('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'), ch => ch.charCodeAt(0)));
  page.drawImage(logo, { x:13.5, y:y(31.4), width:121.5, height:24.1 });
  drawText('DANFSe v2.0', 220, 9.7, 11.2, true, 155, 'center');
  drawText('Documento Auxiliar da NFS-e', 210, 21.3, 9.2, true, 175, 'center');
  drawText(`Município: ${tag(inf,'xLocEmi') || '-'} - ${issueUf}`, 448, 10.3, 5.9, false, 136);
  drawText(`Ambiente Gerador: ${tag(inf,'ambGer') || '-'}`, 448, 18.7, 5.2, false, 136);
  drawText(`Tipo de Ambiente: ${tag(infDps,'tpAmb') || '-'}`, 448, 26.0, 5.2, false, 136);
  if (homolog) drawText('NFS-e SEM VALIDADE JURÍDICA', 210, 31, 7, true, 175, 'center');
  hLine(39.5);

  labelValue('CHAVE DE ACESSO DA NFS-e', key, 11, 44, 335, {valueSize:6.3});
  labelValue('NÚMERO DA NFS-e', tag(inf,'nNFSe') || doc.number || '-', 11, 64, 125);
  labelValue('COMPETÊNCIA DA NFS-e', dateOnly(comp), 156, 64, 125);
  labelValue('DATA E HORA DA EMISSÃO DA NFS-e', `${dateOnly(nfseIssue)} ${timeOnly(nfseIssue)}`, 301, 64, 140);
  labelValue('NÚMERO DA DPS', tag(infDps,'nDPS') || '-', 11, 84, 125);
  labelValue('SÉRIE DA DPS', tag(infDps,'serie') || doc.series || '-', 156, 84, 125);
  labelValue('DATA E HORA DA EMISSÃO DA DPS', `${dateOnly(dpsIssue)} ${timeOnly(dpsIssue)}`, 301, 84, 140);
  labelValue('EMITENTE DA NFS-e', emitType, 11, 104, 125);
  labelValue('SITUAÇÃO DA NFS-e', tag(inf,'cStat') === '100' ? 'NFS-e Gerada' : tag(inf,'cStat') || '-', 156, 104, 125);
  labelValue('FINALIDADE', tag(infDps,'finNFSe') || '-', 301, 104, 140);

  if (key) {
    const qi = await qr(pdf, qrv, 4);
    const qrSize=mm(16.2), qrPad=mm(1.4), qrX=497, qrY=y(84);
    page.drawRectangle({x:qrX-qrPad,y:qrY-qrPad,width:qrSize+qrPad*2,height:qrSize+qrPad*2,color:rgb(1,1,1)});
    page.drawImage(qi, { x:qrX, y:qrY, width:qrSize, height:qrSize });
  }
  drawWrapped(
    'A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e',
    447, 93.0, 137, 5.25, 6.0, 4
  );

  band(126, 'PRESTADOR / FORNECEDOR', 11);
  vLine(152,126,203); vLine(296,126,203); vLine(441,126,203);
  labelValue('CNPJ / CPF / NIF', cpfCnpj(tag(emit,'CNPJ') || tag(emit,'CPF') || doc.issuerCnpj), 156, 129, 132, {boldValue:false});
  labelValue('Indicador Municipal (Inscrição)', tag(emit,'IM') || tag(prest,'IM') || '-', 301, 129, 132);
  labelValue('Telefone', fmtPhone(tag(emit,'fone') || tag(prest,'fone')), 445, 129, 135);
  labelValue('Nome / Nome Empresarial', tag(emit,'xNome') || doc.issuerName || '-', 11, 151, 272, {wrap:true,maxLines:2,valueSize:6.0});
  labelValue('Município / Sigla UF', `${tag(inf,'xLocEmi') || '-'} / ${issueUf}`, 301, 151, 132);
  labelValue('Código IBGE / CEP', `${fmtIbge(issueCityCode)} / ${cep(tag(endE,'CEP'))}`, 445, 151, 135);
  labelValue('Endereço', cleanParts(tag(endE,'xLgr'),tag(endE,'nro'),tag(endE,'xCpl'),tag(endE,'xBairro')) || '-', 11, 173, 275, {wrap:true,maxLines:2,valueSize:5.9});
  labelValue('E-mail', tag(emit,'email') || tag(prest,'email') || '-', 301, 173, 279, {wrap:true,maxLines:2,valueSize:5.75});
  labelValue('Simples Nacional na Data de Competência',
    tag(regTrib,'opSimpNac') === '3' ? 'Optante - Microempresa ou Empresa de Pequeno Porte'
      : tag(regTrib,'opSimpNac') === '2' ? 'Optante - Microempreendedor Individual (MEI)'
      : tag(regTrib,'opSimpNac') === '1' ? 'Não Optante' : '-',
    11, 192, 136, {valueSize:5.1,wrap:true,maxLines:2});
  labelValue('Regime de Apuração Tributária pelo SN',
    tag(regTrib,'regApTribSN') === '1'
      ? 'Regime de apuração dos tributos federais e municipal pelo Simples Nacional'
      : tag(regTrib,'regApTribSN') || '-',
    156, 192, 285, {valueSize:5.1,wrap:true,maxLines:2});
  hLine(203);

  band(203, 'TOMADOR / ADQUIRENTE', 11);
  vLine(152,203,267); vLine(296,203,267); vLine(441,203,267);
  labelValue('CNPJ / CPF / NIF', cpfCnpj(tag(toma,'CNPJ') || tag(toma,'CPF') || doc.recipientCnpj), 156, 206, 132);
  labelValue('Indicador Municipal (Inscrição)', tag(toma,'IM') || '-', 301, 206, 132);
  labelValue('Telefone', fmtPhone(tag(toma,'fone')), 445, 206, 135);
  labelValue('Nome / Nome Empresarial', tag(toma,'xNome') || doc.recipientName || '-', 11, 228, 275, {wrap:true,maxLines:2,valueSize:6.6});
  labelValue('Município / Sigla UF', `${tomaCityName} / ${tomaUf}`, 301, 228, 132);
  labelValue('Código IBGE / CEP', `${fmtIbge(tomaCityCode)} / ${cep(tag(endTN,'CEP'))}`, 445, 228, 135);
  labelValue('Endereço', cleanParts(tag(endT,'xLgr'),tag(endT,'nro'),tag(endT,'xCpl'),tag(endT,'xBairro')) || '-', 11, 250, 275, {wrap:true,maxLines:2,valueSize:6.4});
  labelValue('E-mail', tag(toma,'email') || '-', 301, 250, 279, {wrap:true,maxLines:2,valueSize:6.2});
  hLine(267);

  hLine(268.5); drawText('DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e', M, 269, 5.8, true, C, 'center');
  hLine(277.5); drawText('INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e', M, 278, 5.8, true, C, 'center');
  hLine(286.5);

  band(286.5, 'SERVIÇO PRESTADO', 11);
  vLine(152,286.5,438); vLine(296,286.5,317); vLine(441,286.5,317);
  labelValue('Código de Tributação Nacional/Municipal', `${fmtTrib(tag(cServ,'cTribNac'))} / ${fmtTrib(tag(cServ,'cTribMun'))}`, 156, 289.5, 132);
  labelValue('Código da NBS', fmtNbs(tag(cServ,'cNBS')), 301, 289.5, 132);
  labelValue('Local da Prestação / Sigla UF / País', `${tag(inf,'xLocPrestacao') || '-'} / ${prestUf} / -`, 445, 289.5, 135);
  drawWrapped(tag(inf,'xTribNac') || '-', 11, 309.5, 275, 5.6, 6.6, 3);
  drawText('Descrição do Serviço', 11, 333, 5.4, true, 180);
  drawWrapped(tag(cServ,'xDescServ') || '-', 11, 343, 569, 5.7, 6.8, 13);
  hLine(438);

  band(438, 'TRIBUTAÇÃO MUNICIPAL (ISSQN)', 11);
  vLine(152,438,478); vLine(296,438,478); vLine(441,438,478);
  labelValue('Tipo de Tributação do ISSQN', tag(tribMun,'tribISSQN') === '1' ? 'Operação Tributável' : tag(tribMun,'tribISSQN') || '-', 156, 441, 132);
  labelValue('Município / Sigla UF / País de Incidência do ISSQN', `${tag(inf,'xLocIncid') || '-'} / ${incidenceUf} / -`, 301, 441, 279, {labelSize:5.0,valueSize:5.9});
  labelValue('BC ISSQN', moneyOrDash(tag(tribMun,'vBC')), 11, 461, 132);
  labelValue('Alíquota Aplicada', tag(tribMun,'pAliq') ? `${tag(tribMun,'pAliq')}%` : '-', 156, 461, 132);
  labelValue('Retenção do ISSQN',
    tag(tribMun,'tpRetISSQN') === '1' ? 'Não Retido' : tag(tribMun,'tpRetISSQN') === '2' ? 'Retido pelo Tomador' : tag(tribMun,'tpRetISSQN') || '-',
    301, 461, 132);
  labelValue('ISSQN Apurado', moneyOrDash(tag(tribMun,'vISSQN')), 445, 461, 135);
  hLine(478);

  band(478, 'TRIBUTAÇÃO FEDERAL (EXCETO CBS)', 11);
  vLine(152,478,518); vLine(296,478,518); vLine(441,478,498);
  labelValue('IRRF', moneyOrDash(tag(tribFed,'vIRRF') || tag(tribFed,'vRetIRRF')), 156, 481, 132);
  labelValue('Contribuição Previdenciária - Retida', moneyOrDash(tag(tribFed,'vCP')), 301, 481, 132);
  labelValue('Contribuições Sociais - Retidas', moneyOrDash(tag(tribFed,'vCSLL') || tag(tribFed,'vRetCSLL')), 445, 481, 135);
  labelValue('PIS - Débito Apuração Própria', moneyOrDash(tag(pisCofins,'vPIS') || tag(pisCofins,'vPis')), 11, 501, 132);
  labelValue('COFINS - Débito Apuração Própria', moneyOrDash(tag(pisCofins,'vCOFINS') || tag(pisCofins,'vCofins')), 156, 501, 132);
  labelValue('Descrição Contrib. Sociais - Retidas', tag(tribFed,'xDescRet') || '-', 301, 501, 279);
  hLine(518);

  band(518, 'TRIBUTAÇÃO IBS/CBS', 11);
  vLine(152,518,602); vLine(296,518,602); vLine(441,518,602);
  labelValue('CST / cClassTrib', `${tag(trib,'CST') || '-'} / ${tag(trib,'cClassTrib') || '-'}`, 156, 521, 132);
  labelValue('Indicador de Operação / Código IBGE Incidência / Município Incidência / Sigla UF',
    `- / ${fmtIbge(incidenceCode)} / ${tag(inf,'xLocIncid') || '-'} / ${incidenceUf}`, 301, 521, 279, {labelSize:4.75,valueSize:5.4,wrap:true,maxLines:2});
  labelValue('Exclusões e Reduções da Base de Cálculo', 'R$ 0,00', 11, 543, 132);
  labelValue('Base de Cálculo Após Exclusões e Reduções', moneyOrDash(tag(trib,'vBCIBSCBS')), 156, 543, 132);
  labelValue('Red. Alíquota IBS / Red. Alíquota CBS', '- / - / -', 301, 543, 132);
  labelValue('Alíquota - IBS UF / IBS Mun', '- / -', 445, 543, 135);
  labelValue('Alíq. Efetiva Municipal - IBS', '-', 11, 566, 132);
  labelValue('Valor Apurado Municipal - IBS', '-', 156, 566, 132);
  labelValue('Alíq. Efetiva Estadual - IBS', '-', 301, 566, 132);
  labelValue('Valor Apurado Estadual - IBS', '-', 445, 566, 135);
  labelValue('Valor Total Apurado - IBS', '-', 11, 589, 132);
  labelValue('Alíquota - CBS', '-', 156, 589, 132);
  labelValue('Alíquota Efetiva - CBS', '-', 301, 589, 132);
  labelValue('Valor Total Apurado - CBS', '-', 445, 589, 135);
  hLine(602);

  band(602, 'VALOR TOTAL DA NFS-e', 11);
  vLine(152,602,642); vLine(296,602,642); vLine(441,602,642);
  labelValue('VALOR DA OPERAÇÃO / SERVIÇO', money(serviceValue), 156, 605, 132, {labelSize:5.05,valueSize:6.15});
  labelValue('Desconto Incondicionado', moneyOrDash(tag(dpsVals,'vDescIncond')), 301, 605, 132);
  labelValue('Desconto Condicionado', moneyOrDash(tag(dpsVals,'vDescCond')), 445, 605, 135);
  labelValue('Total das Retenções (ISSQN / Federais)', moneyOrDash(tag(vals,'vTotRet') || tag(vals,'vTotalRet')), 11, 625, 132, {labelSize:4.85,valueSize:6.0});
  labelValue('VALOR LÍQUIDO DA NFS-e', money(liquidValue), 156, 625, 132);
  labelValue('Total do IBS/CBS', 'R$ 0,00', 301, 625, 132);
  page.drawRectangle({x:441,y:y(642),width:R-441,height:20,color:fillGray});
  labelValue('VALOR LÍQUIDO DA NFS-e + IBS/CBS', 'R$ 0,00', 445, 625, 135, {labelSize:4.75,valueSize:6.0});
  hLine(642);

  band(642, 'INFORMAÇÕES COMPLEMENTARES', 11);
  const info = tag(infoCompl,'xInfComp');
  drawWrapped(`Inf. Cont.: ${info || '-'}`, 11, 656, 568, 6.1, 7.2, 3);
  const approxFederal = tag(totTrib,'vTotTribFed');
  const approxState = tag(totTrib,'vTotTribEst');
  const approxMunicipal = tag(totTrib,'vTotTribMun');
  drawWrapped(
    `Totais aproximados dos Tributos cfe. Lei n° 12.741/2012: Federais: ${approxFederal ? money(approxFederal) : '-'}; Estaduais: ${approxState ? money(approxState) : '-'}; Municipais: ${approxMunicipal ? money(approxMunicipal) : '-'};`,
    11, 678, 568, 6.1, 7.2, 2
  );

  hLine(811);
  vLine(151,811,833); vLine(296,811,833);
  drawText('DATA CIENTIFICAÇÃO:', 11, 815, 5.0, true, 132);
  drawText('IDENTIFICAÇÃO E ASSINATURA', 156, 815, 5.0, true, 132);
  labelValue('N° NFS-e / CHAVE NFS-e', `${tag(inf,'nNFSe') || doc.number || '-'} / ${key}`, 301, 815, 279, {labelSize:5.0,valueSize:4.9});
  hLine(833);

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
