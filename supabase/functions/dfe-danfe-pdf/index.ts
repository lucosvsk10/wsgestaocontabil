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
const clean = (v: unknown) =>
  String(v ?? '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
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
  const baseH = mm(151);
  const H = Math.max(baseH, baseH + Math.max(0, items.length - 2) * 18 + Math.min(60, extraInfo.length / 8));
  const page = pdf.addPage([W, H]);
  const black = rgb(0, 0, 0);
  let y = H - mm(4);

  const widthOf = (s: string, size: number, b = false) => (b ? bold : reg).widthOfTextAtSize(s, size);
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
  const dash = () => {
    y -= 1.5;
    const dashW = 3.2, gap = 2.3;
    for (let x=M; x < W-M; x += dashW + gap) {
      page.drawLine({start:{x,y},end:{x:Math.min(W-M,x+dashW),y},thickness:.55,color:black});
    }
    y -= 6;
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
    [tag(endEmit,'xLgr'), tag(endEmit,'nro'), tag(endEmit,'xBairro'), tag(endEmit,'xMun'), tag(endEmit,'UF')]
      .filter(Boolean).join(', '),
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
    const code = clean(tag(p,'cProd')) || '-';
    const desc = clean(tag(p,'xProd')) || '-';
    const qty = clean(tag(p,'qCom')) || '-';
    const unit = clean(tag(p,'uCom')) || '-';
    const unitValue = num(tag(p,'vUnCom'));
    const totalValue = num(tag(p,'vProd'));

    page.drawText(code,{x:M,y,size:5.8,font:reg,color:black});
    const descMax=88;
    let short=desc;
    while(widthOf(short,5.8)>descMax && short.length>4) short=short.slice(0,-4)+'...';
    page.drawText(short,{x:M+25,y,size:5.8,font:reg,color:black});
    const qtyText=num(qty);
    page.drawText(qtyText,{x:W-M-112,y,size:5.8,font:reg,color:black});
    page.drawText(unit,{x:W-M-78,y,size:5.8,font:reg,color:black});
    const uv=unitValue, tv=totalValue;
    page.drawText(uv,{x:W-M-48-widthOf(uv,5.8),y,size:5.8,font:reg,color:black});
    page.drawText(tv,{x:W-M-widthOf(tv,5.8),y,size:5.8,font:reg,color:black});
    y -= 10;
  }

  dash();
  leftRight('QTD. TOTAL DE ITENS', String(items.length), false, 6.8);
  leftRight('VALOR DOS PRODUTOS', num(tag(tot,'vProd')), false, 6.8);
  leftRight('VALOR TOTAL R$', num(tag(tot,'vNF') || doc.value), true, 8.7);
  dash();

  draw('FORMAS DE PAGAMENTO',6.4,false,'left');
  draw('Valor Pago',6.4,false,'right',M,usable);
  for (const p of sections(pag,'detPag')) {
    const code=tag(p,'tPag');
    leftRight(paymentName(code), num(tag(p,'vPag')), false,6.5);
  }
  dash();

  draw('Consulta pela chave de acesso em',6.3,false,'center');
  const urlChave = xmlDecode(tag(xml,'urlChave')) || 'https://www.nfe.fazenda.gov.br/portal/consulta.aspx';
  wrapped(urlChave,5.5,false,'center');
  draw('CHAVE DE ACESSO',6.0,true,'center');
  wrapped(fmtKey(access),5.9,false,'center');
  dash();

  const consumerDoc = cpfCnpj(tag(dest,'CNPJ') || tag(dest,'CPF'));
  const consumerName = clean(tag(dest,'xNome'));
  if (consumerName || (consumerDoc && consumerDoc !== '-')) {
    wrapped(consumerName || consumerDoc,6.5,true,'center');
    if (consumerName && consumerDoc !== '-') draw(consumerDoc,6.2,false,'center');
    const consumerAddress=[tag(endDest,'xLgr'),tag(endDest,'nro'),tag(endDest,'xMun'),tag(endDest,'UF')].filter(Boolean).join(', ');
    if (consumerAddress) wrapped(consumerAddress,5.8,false,'center');
  } else {
    draw('CONSUMIDOR NÃO IDENTIFICADO',7.0,false,'center');
  }
  dash();

  draw(`Nº ${doc.number || tag(ide,'nNF') || '-'} Série ${doc.series || tag(ide,'serie') || '-'}`,11,true,'center');
  draw(`${dateOnly(doc.issueDate || tag(ide,'dhEmi'))} ${timeOnly(doc.issueDate || tag(ide,'dhEmi'))} - Via Consumidor`,6.3,false,'center');
  draw(`PROTOCOLO DE AUTORIZAÇÃO ${tag(prot,'nProt') || '-'} ${dateOnly(tag(prot,'dhRecbto'))} ${timeOnly(tag(prot,'dhRecbto'))}`,5.6,false,'center');
  dash();

  draw('Consulta via leitor de QR Code',6.3,false,'center');
  if (qrv) {
    const qi=await qr(pdf,qrv,4);
    const qrSize=mm(39);
    page.drawImage(qi,{x:(W-qrSize)/2,y:y-qrSize-3,width:qrSize,height:qrSize});
    y-=qrSize+9;
  } else {
    draw('QR Code indisponível no XML autorizado',5.8,false,'center');
  }

  if (homolog) {
    draw('EMITIDA EM AMBIENTE DE HOMOLOGAÇÃO - SEM',7.1,false,'center');
    draw('VALOR FISCAL',7.1,false,'center');
  }
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
  const lineGray = rgb(0.45, 0.45, 0.45);
  const fillGray = rgb(0.94, 0.94, 0.94);
  const M = 5.5;
  const R = W - M;
  const C = R - M;
  const y = (top: number) => H - top;

  const raw = (value: unknown) => String(value ?? '').replace(/\r/g, '').trim();
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
  const hLine = (top: number, x1 = M, x2 = R, thickness = 0.55, color = black) =>
    page.drawLine({ start:{x:x1,y:y(top)}, end:{x:x2,y:y(top)}, thickness, color });
  const vLine = (xv: number, top1: number, top2: number, thickness = 0.4, color = lineGray) =>
    page.drawLine({ start:{x:xv,y:y(top1)}, end:{x:xv,y:y(top2)}, thickness, color });
  const band = (top: number, label: string, height = 11) => {
    page.drawRectangle({ x:M, y:y(top + height), width:C, height, color:fillGray });
    hLine(top, M, R, 0.55);
    drawText(label, M + 4, top + 2.2, 6.3, true, C - 8);
  };
  const labelValue = (
    label: string,
    value: unknown,
    x: number,
    top: number,
    width: number,
    options: {labelSize?:number;valueSize?:number;boldValue?:boolean;wrap?:boolean;maxLines?:number} = {}
  ) => {
    drawText(label, x, top, options.labelSize ?? 5.7, true, width);
    if (options.wrap) drawWrapped(value, x, top + 9, width, options.valueSize ?? 6.2, 7.2, options.maxLines ?? 2, options.boldValue ?? false);
    else drawText(value, x, top + 9, options.valueSize ?? 6.3, options.boldValue ?? false, width);
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
  const issue = tag(infDps, 'dhEmi') || tag(inf, 'dhProc') || doc.issueDate;
  const comp = tag(infDps, 'dCompet') || issue;
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
  const qrv = `https://www.nfse.gov.br/ConsultaPublica?tpc=1&chave=${key}`;
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

  page.drawRectangle({ x:M, y:y(837), width:C, height:832, borderWidth:0.7, borderColor:black });

  const logo = await pdf.embedPng(Uint8Array.from(atob('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'), ch => ch.charCodeAt(0)));
  page.drawImage(logo, { x:11, y:y(33.5), width:119, height:23.6 });
  drawText('DANFSe v2.0', 225, 11.5, 10.5, true, 145, 'center');
  drawText('Documento Auxiliar da NFS-e', 215, 22, 9.3, true, 165, 'center');
  drawText(`Município: ${tag(inf,'xLocEmi') || '-'} - ${issueUf}`, 445, 10.5, 7.1, false, 140);
  drawText(`Ambiente Gerador: ${tag(inf,'ambGer') || '-'}`, 445, 20.5, 5.5, false, 140);
  drawText(`Tipo de Ambiente: ${tag(infDps,'tpAmb') || '-'}`, 445, 27.2, 5.5, false, 140);
  hLine(39.5);

  labelValue('CHAVE DE ACESSO DA NFS-e', key, 11, 44, 335, {valueSize:6.3});
  labelValue('NÚMERO DA NFS-e', tag(inf,'nNFSe') || doc.number || '-', 11, 64, 125);
  labelValue('COMPETÊNCIA DA NFS-e', dateOnly(comp), 156, 64, 125);
  labelValue('DATA E HORA DA EMISSÃO DA NFS-e', `${dateOnly(issue)} ${timeOnly(issue)}`, 301, 64, 140);
  labelValue('NÚMERO DA DPS', tag(infDps,'nDPS') || '-', 11, 84, 125);
  labelValue('SÉRIE DA DPS', tag(infDps,'serie') || doc.series || '-', 156, 84, 125);
  labelValue('DATA E HORA DA EMISSÃO DA DPS', `${dateOnly(issue)} ${timeOnly(issue)}`, 301, 84, 140);
  labelValue('EMITENTE DA NFS-e', 'Prestador', 11, 104, 125);
  labelValue('SITUAÇÃO DA NFS-e', tag(inf,'cStat') === '100' ? 'NFS-e Gerada' : tag(inf,'cStat') || '-', 156, 104, 125);
  labelValue('FINALIDADE', tag(infDps,'finNFSe') || '-', 301, 104, 140);

  if (key) {
    const qi = await qr(pdf, qrv);
    page.drawImage(qi, { x:493, y:y(88), width:54, height:54 });
  }
  drawWrapped(
    'A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e',
    445, 92, 135, 5.35, 6.1, 5
  );

  band(126, 'PRESTADOR / FORNECEDOR', 11);
  vLine(152,126,203); vLine(296,126,203); vLine(441,126,203);
  labelValue('CNPJ / CPF / NIF', cpfCnpj(tag(emit,'CNPJ') || tag(emit,'CPF') || doc.issuerCnpj), 156, 129, 132, {boldValue:false});
  labelValue('Indicador Municipal (Inscrição)', tag(emit,'IM') || tag(prest,'IM') || '-', 301, 129, 132);
  labelValue('Telefone', fmtPhone(tag(emit,'fone') || tag(prest,'fone')), 445, 129, 135);
  labelValue('Nome / Nome Empresarial', tag(emit,'xNome') || doc.issuerName || '-', 11, 151, 272);
  labelValue('Município / Sigla UF', `${tag(inf,'xLocEmi') || '-'} / ${issueUf}`, 301, 151, 132);
  labelValue('Código IBGE / CEP', `${fmtIbge(issueCityCode)} / ${cep(tag(endE,'CEP'))}`, 445, 151, 135);
  labelValue('Endereço', [tag(endE,'xLgr'),tag(endE,'nro'),tag(endE,'xCpl'),tag(endE,'xBairro')].filter(Boolean).join(', ') || '-', 11, 173, 275);
  labelValue('E-mail', tag(emit,'email') || tag(prest,'email') || '-', 301, 173, 279);
  labelValue('Simples Nacional na Data de Competência',
    tag(regTrib,'opSimpNac') === '3' ? 'Optante - Microempresa ou Empresa de Pequeno Porte'
      : tag(regTrib,'opSimpNac') === '2' ? 'Optante - Microempreendedor Individual (MEI)'
      : tag(regTrib,'opSimpNac') === '1' ? 'Não Optante' : '-',
    11, 192, 136, {valueSize:5.8});
  labelValue('Regime de Apuração Tributária pelo SN',
    tag(regTrib,'regApTribSN') === '1'
      ? 'Regime de apuração dos tributos federais e municipal pelo Simples Nacional'
      : tag(regTrib,'regApTribSN') || '-',
    156, 192, 285, {valueSize:5.8});
  hLine(203);

  band(203, 'TOMADOR / ADQUIRENTE', 11);
  vLine(152,203,267); vLine(296,203,267); vLine(441,203,267);
  labelValue('CNPJ / CPF / NIF', cpfCnpj(tag(toma,'CNPJ') || tag(toma,'CPF') || doc.recipientCnpj), 156, 206, 132);
  labelValue('Indicador Municipal (Inscrição)', tag(toma,'IM') || '-', 301, 206, 132);
  labelValue('Telefone', fmtPhone(tag(toma,'fone')), 445, 206, 135);
  labelValue('Nome / Nome Empresarial', tag(toma,'xNome') || doc.recipientName || '-', 11, 228, 275);
  labelValue('Município / Sigla UF', `${tomaCityName} / ${tomaUf}`, 301, 228, 132);
  labelValue('Código IBGE / CEP', `${fmtIbge(tomaCityCode)} / ${cep(tag(endTN,'CEP'))}`, 445, 228, 135);
  labelValue('Endereço', [tag(endT,'xLgr'),tag(endT,'nro'),tag(endT,'xCpl'),tag(endT,'xBairro')].filter(Boolean).join(', ') || '-', 11, 250, 275);
  labelValue('E-mail', tag(toma,'email') || '-', 301, 250, 279);
  hLine(267);

  hLine(268.5); drawText('DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e', M, 269, 5.8, true, C, 'center');
  hLine(277.5); drawText('INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e', M, 278, 5.8, true, C, 'center');
  hLine(286.5);

  band(286.5, 'SERVIÇO PRESTADO', 11);
  vLine(152,286.5,438); vLine(296,286.5,317); vLine(441,286.5,317);
  labelValue('Código de Tributação Nacional/Municipal', `${fmtTrib(tag(cServ,'cTribNac'))} / ${fmtTrib(tag(cServ,'cTribMun'))}`, 156, 289.5, 132);
  labelValue('Código da NBS', fmtNbs(tag(cServ,'cNBS')), 301, 289.5, 132);
  labelValue('Local da Prestação / Sigla UF / País', `${tag(inf,'xLocPrestacao') || '-'} / ${prestUf} / -`, 445, 289.5, 135);
  drawText(tag(inf,'xTribNac') || '-', 11, 310, 6.1, false, 275);
  drawText('Descrição do Serviço', 11, 326, 5.8, true, 180);
  drawWrapped(tag(cServ,'xDescServ') || '-', 11, 337, 569, 6.0, 7.15, 13);
  hLine(438);

  band(438, 'TRIBUTAÇÃO MUNICIPAL (ISSQN)', 11);
  vLine(152,438,478); vLine(296,438,478); vLine(441,438,478);
  labelValue('Tipo de Tributação do ISSQN', tag(tribMun,'tribISSQN') === '1' ? 'Operação Tributável' : tag(tribMun,'tribISSQN') || '-', 156, 441, 132);
  labelValue('Município / Sigla UF / País de Incidência do ISSQN', `${tag(inf,'xLocIncid') || '-'} / ${incidenceUf} / -`, 301, 441, 279);
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
    `- / ${fmtIbge(incidenceCode)} / ${tag(inf,'xLocIncid') || '-'} / ${incidenceUf}`, 301, 521, 279, {valueSize:5.7});
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
  labelValue('VALOR DA OPERAÇÃO / SERVIÇO', money(serviceValue), 156, 605, 132);
  labelValue('Desconto Incondicionado', moneyOrDash(tag(dpsVals,'vDescIncond')), 301, 605, 132);
  labelValue('Desconto Condicionado', moneyOrDash(tag(dpsVals,'vDescCond')), 445, 605, 135);
  labelValue('Total das Retenções (ISSQN / Federais)', moneyOrDash(tag(vals,'vTotRet') || tag(vals,'vTotalRet')), 11, 625, 132);
  labelValue('VALOR LÍQUIDO DA NFS-e', money(liquidValue), 156, 625, 132);
  labelValue('Total do IBS/CBS', 'R$ 0,00', 301, 625, 132);
  page.drawRectangle({x:441,y:y(642),width:R-441,height:20,color:fillGray});
  labelValue('VALOR LÍQUIDO DA NFS-e + IBS/CBS', 'R$ 0,00', 445, 625, 135);
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
  drawText('DATA CIENTIFICAÇÃO:', 11, 814, 5.7, true, 132);
  drawText('IDENTIFICAÇÃO E ASSINATURA', 156, 814, 5.7, true, 132);
  labelValue('N° NFS-e / CHAVE NFS-e', `${tag(inf,'nNFSe') || doc.number || '-'} / ${key}`, 301, 814, 279, {valueSize:5.8});
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
    while (f.widthOfTextAtSize(v, size) > max && v.length > 2) v = v.slice(0, -2) + '…';
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
    access = doc.accessKey || tag(prot, 'chNFe');
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
  text('NFe', W - 75, y - 14, 14, true);
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
  bar('DADOS DOS PRODUTOS / SERVIÇOS');
  const cols = [55, 145, 43, 28, 28, 27, 35, 38, 38, 34, 34, 30, 30, 30],
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

  const transp = tag(xml, 'transp');
  const transporta = tag(transp, 'transporta');
  const vol = tag(transp, 'vol');
  if (y < 92) addContinuationPage();
  bar('TRANSPORTADOR / VOLUMES TRANSPORTADOS');
  field(M, y, C * 0.42, 25, 'RAZÃO SOCIAL', tag(transporta, 'xNome') || '-');
  field(M + C * 0.42, y, C * 0.12, 25, 'FRETE POR CONTA', tag(transp, 'modFrete') || '-');
  field(M + C * 0.54, y, C * 0.24, 25, 'CNPJ/CPF', cpfCnpj(tag(transporta, 'CNPJ') || tag(transporta, 'CPF')));
  field(M + C * 0.78, y, C * 0.22, 25, 'QUANTIDADE / ESPÉCIE', [tag(vol, 'qVol'), tag(vol, 'esp')].filter(Boolean).join(' / ') || '-');
  y -= 27;

  if (y > 60) {
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
