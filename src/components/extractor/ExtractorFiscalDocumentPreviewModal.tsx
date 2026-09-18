import { useEffect, useMemo, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import {
  CheckCircle2,
  Clipboard,
  Download,
  FileCode2,
  Info,
  Loader2,
  RefreshCw,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  FiscalDocumentLike,
  docModel,
  docType,
  fiscalStatusLabel,
  formatAccessKey,
  formatCnpj,
  formatDate,
  formatMoney,
  formatTime,
  parseFiscalPreview,
} from '@/components/admin/fiscal/fiscalDocumentPreviewUtils';

type Props = {
  document: FiscalDocumentLike | null;
  companyName: string;
  companyCnpj: string;
  downloadingPdf?: boolean;
  downloadingXml?: boolean;
  onClose: () => void;
  onDownloadPdf: (document: FiscalDocumentLike) => Promise<void> | void;
  onDownloadXml: (document: FiscalDocumentLike) => Promise<void> | void;
  onManifestation?: (document: FiscalDocumentLike) => void;
  onRetry?: (document: FiscalDocumentLike) => Promise<void> | void;
};

const xmlDoc = (xml?: string) => {
  if (!xml || typeof DOMParser === 'undefined') return null;
  try {
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    return parsed.querySelector('parsererror') ? null : parsed;
  } catch {
    return null;
  }
};
const one = (root: ParentNode | null | undefined, name: string) =>
  root ? Array.from(root.querySelectorAll('*')).find(node => node.localName === name) || null : null;
const many = (root: ParentNode | null | undefined, name: string) =>
  root ? Array.from(root.querySelectorAll('*')).filter(node => node.localName === name) : [];
const txt = (root: ParentNode | null | undefined, ...names: string[]) => {
  for (const name of names) {
    const value = one(root, name)?.textContent?.trim();
    if (value) return value;
  }
  return '';
};
const num = (value: string | number | null | undefined) => {
  const parsed = Number(String(value ?? '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : 0;
};
const brl = (value: string | number | null | undefined) => formatMoney(num(value));
const q = (value: string | number | null | undefined) =>
  num(value).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 4 });
const fmtCpfCnpj = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length === 14) return formatCnpj(digits);
  if (digits.length === 11) return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return value || '—';
};
const fmtCep = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 8 ? digits.replace(/^(\d{5})(\d{3})$/, '$1-$2') : value || '—';
};
const address = (root: ParentNode | null | undefined) => {
  if (!root) return '—';
  const street = txt(root, 'xLgr', 'logradouro', 'endereco');
  const number = txt(root, 'nro', 'numero');
  const district = txt(root, 'xBairro', 'bairro');
  const city = txt(root, 'xMun', 'municipio');
  const state = txt(root, 'UF', 'uf');
  const cep = txt(root, 'CEP', 'cep');
  return [street && `${street}${number ? `, ${number}` : ''}`, district, [city, state].filter(Boolean).join(' - '), cep && `CEP ${fmtCep(cep)}`]
    .filter(Boolean)
    .join(' · ') || '—';
};
const statusTone = (status: string) =>
  /autoriz|ativa/i.test(status)
    ? 'ok'
    : /cancel|deneg|rejeit/i.test(status)
      ? 'error'
      : 'neutral';

function Barcode({ value }: { value: string }) {
  const ref = useRef<SVGSVGElement | null>(null);
  useEffect(() => {
    if (!ref.current || !/^\d{44}$/.test(value)) return;
    try {
      JsBarcode(ref.current, value, {
        format: 'CODE128',
        displayValue: false,
        margin: 0,
        height: 42,
        width: 1.25,
      });
    } catch {
      // A chave continua disponível em texto mesmo se o SVG não puder ser desenhado.
    }
  }, [value]);
  if (!/^\d{44}$/.test(value)) return null;
  return <svg ref={ref} className="extractor-fiscal-barcode" aria-label="Código de barras da chave de acesso" />;
}

function Qr({ value }: { value: string }) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let alive = true;
    setSrc('');
    if (!value) return () => { alive = false; };
    void QRCode.toDataURL(value, { width: 230, margin: 0, errorCorrectionLevel: 'M' })
      .then(result => alive && setSrc(result))
      .catch(() => {});
    return () => { alive = false; };
  }, [value]);
  return src ? <img src={src} alt="QR Code fiscal" className="extractor-fiscal-qr" /> : null;
}

function DanfeView({ document }: { document: FiscalDocumentLike }) {
  const xml = xmlDoc(document.xml);
  if (!xml) return <DocumentUnavailable />;
  const emit = one(xml, 'emit');
  const dest = one(xml, 'dest');
  const ide = one(xml, 'ide');
  const emitAddress = one(emit, 'enderEmit');
  const destAddress = one(dest, 'enderDest');
  const total = one(xml, 'ICMSTot');
  const prot = one(xml, 'infProt');
  const transport = one(xml, 'transp');
  const additional = one(xml, 'infAdic');
  const items = many(xml, 'det');
  const accessKey = String(document.accessKey || txt(prot, 'chNFe') || '').replace(/\D/g, '');
  const issue = document.issueDate || txt(ide, 'dhEmi', 'dEmi');
  const itemRows = items.map(det => {
    const prod = one(det, 'prod') || det;
    const imposto = one(det, 'imposto');
    const icms = one(imposto, 'ICMS');
    return {
      code: txt(prod, 'cProd'),
      description: txt(prod, 'xProd'),
      ncm: txt(prod, 'NCM'),
      cst: txt(icms, 'CST', 'CSOSN'),
      cfop: txt(prod, 'CFOP'),
      unit: txt(prod, 'uCom'),
      quantity: txt(prod, 'qCom'),
      unitValue: txt(prod, 'vUnCom'),
      total: txt(prod, 'vProd'),
      discount: txt(prod, 'vDesc'),
      baseIcms: txt(icms, 'vBC'),
      icms: txt(icms, 'vICMS'),
      ipi: txt(one(imposto, 'IPI'), 'vIPI'),
      icmsRate: txt(icms, 'pICMS'),
    };
  });
  const totals = [
    ['Base ICMS', txt(total, 'vBC')],
    ['Valor ICMS', txt(total, 'vICMS')],
    ['Base ICMS ST', txt(total, 'vBCST')],
    ['ICMS ST', txt(total, 'vST')],
    ['Produtos', txt(total, 'vProd')],
    ['Frete', txt(total, 'vFrete')],
    ['Seguro', txt(total, 'vSeg')],
    ['Desconto', txt(total, 'vDesc')],
    ['IPI', txt(total, 'vIPI')],
    ['PIS', txt(total, 'vPIS')],
    ['COFINS', txt(total, 'vCOFINS')],
    ['Total da NF-e', txt(total, 'vNF') || document.value],
  ];
  return (
    <div className="extractor-danfe-sheet">
      <section className="extractor-danfe-receipt">
        <div>
          RECEBEMOS DE <b>{txt(emit, 'xNome') || document.issuerName || '—'}</b> OS PRODUTOS E/OU SERVIÇOS
          CONSTANTES DA NOTA FISCAL ELETRÔNICA INDICADA AO LADO.
        </div>
        <div><small>DATA DE RECEBIMENTO</small></div>
        <div><small>IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</small></div>
        <div className="extractor-danfe-number"><b>NF-e</b><span>Nº {document.number || txt(ide, 'nNF') || '—'}</span><span>Série {document.series || txt(ide, 'serie') || '—'}</span></div>
      </section>

      <section className="extractor-danfe-head">
        <div className="extractor-danfe-issuer">
          <small>IDENTIFICAÇÃO DO EMITENTE</small>
          <h2>{txt(emit, 'xNome') || document.issuerName || 'EMITENTE'}</h2>
          <p>{address(emitAddress)}</p>
          <p>CNPJ/CPF {fmtCpfCnpj(txt(emit, 'CNPJ', 'CPF') || document.issuerCnpj)} · IE {txt(emit, 'IE') || '—'}</p>
        </div>
        <div className="extractor-danfe-title">
          <b>DANFE</b>
          <span>Documento Auxiliar da Nota Fiscal Eletrônica</span>
          <strong>{txt(ide, 'tpNF') === '0' ? '0 - ENTRADA' : '1 - SAÍDA'}</strong>
          <p>Nº {document.number || txt(ide, 'nNF') || '—'}</p>
          <p>Série {document.series || txt(ide, 'serie') || '—'}</p>
        </div>
        <div className="extractor-danfe-key">
          <Barcode value={accessKey} />
          <small>CHAVE DE ACESSO</small>
          <strong>{formatAccessKey(accessKey)}</strong>
          <span>Consulta de autenticidade no portal nacional da NF-e ou no site da Sefaz Autorizadora</span>
        </div>
      </section>

      <section className="extractor-danfe-grid extractor-danfe-grid-2">
        <Field label="NATUREZA DA OPERAÇÃO" value={txt(ide, 'natOp') || '—'} />
        <Field label="PROTOCOLO DE AUTORIZAÇÃO DE USO" value={[txt(prot, 'nProt'), txt(prot, 'dhRecbto')].filter(Boolean).join(' · ') || '—'} />
      </section>
      <section className="extractor-danfe-grid extractor-danfe-grid-4">
        <Field label="INSCRIÇÃO ESTADUAL" value={txt(emit, 'IE') || '—'} />
        <Field label="INSCRIÇÃO MUNICIPAL" value={txt(emit, 'IM') || '—'} />
        <Field label="IE DO SUBST. TRIBUTÁRIO" value={txt(emit, 'IEST') || '—'} />
        <Field label="CNPJ/CPF" value={fmtCpfCnpj(txt(emit, 'CNPJ', 'CPF') || document.issuerCnpj)} />
      </section>

      <SectionTitle>DESTINATÁRIO / REMETENTE</SectionTitle>
      <section className="extractor-danfe-grid extractor-danfe-grid-3">
        <Field label="NOME / RAZÃO SOCIAL" value={txt(dest, 'xNome') || document.recipientName || '—'} />
        <Field label="CNPJ/CPF" value={fmtCpfCnpj(txt(dest, 'CNPJ', 'CPF') || document.recipientCnpj)} />
        <Field label="DATA DA EMISSÃO" value={formatDate(issue)} />
      </section>
      <section className="extractor-danfe-grid extractor-danfe-grid-4">
        <Field label="ENDEREÇO" value={address(destAddress)} />
        <Field label="BAIRRO / DISTRITO" value={txt(destAddress, 'xBairro') || '—'} />
        <Field label="CEP" value={fmtCep(txt(destAddress, 'CEP'))} />
        <Field label="HORA DA SAÍDA / ENTRADA" value={formatTime(txt(ide, 'dhSaiEnt') || issue)} />
      </section>

      <SectionTitle>CÁLCULO DO IMPOSTO</SectionTitle>
      <section className="extractor-danfe-totals">
        {totals.map(([label, value]) => <Field key={label} label={label} value={brl(value)} />)}
      </section>

      <SectionTitle>DADOS DOS PRODUTOS / SERVIÇOS</SectionTitle>
      <div className="extractor-danfe-products">
        <table>
          <thead>
            <tr>
              <th>CÓDIGO</th><th>DESCRIÇÃO DO PRODUTO / SERVIÇO</th><th>NCM</th><th>CST</th><th>CFOP</th>
              <th>UN</th><th>QTDE</th><th>V.UNIT</th><th>V.TOTAL</th><th>DESC.</th><th>BC ICMS</th><th>ICMS</th><th>IPI</th><th>% ICMS</th>
            </tr>
          </thead>
          <tbody>
            {itemRows.length ? itemRows.map((item, index) => (
              <tr key={index}>
                <td>{item.code || '—'}</td><td className="desc">{item.description || '—'}</td><td>{item.ncm || '—'}</td>
                <td>{item.cst || '—'}</td><td>{item.cfop || '—'}</td><td>{item.unit || '—'}</td>
                <td>{q(item.quantity)}</td><td>{brl(item.unitValue)}</td><td>{brl(item.total)}</td><td>{brl(item.discount)}</td>
                <td>{brl(item.baseIcms)}</td><td>{brl(item.icms)}</td><td>{brl(item.ipi)}</td><td>{item.icmsRate ? `${q(item.icmsRate)}%` : '—'}</td>
              </tr>
            )) : <tr><td colSpan={14}>Nenhum item detalhado disponível no XML.</td></tr>}
          </tbody>
        </table>
      </div>

      <SectionTitle>TRANSPORTADOR / VOLUMES TRANSPORTADOS</SectionTitle>
      <section className="extractor-danfe-grid extractor-danfe-grid-4">
        <Field label="RAZÃO SOCIAL" value={txt(transport, 'xNome') || '—'} />
        <Field label="FRETE POR CONTA" value={txt(transport, 'modFrete') || '—'} />
        <Field label="CNPJ/CPF" value={fmtCpfCnpj(txt(transport, 'CNPJ', 'CPF'))} />
        <Field label="QUANTIDADE / ESPÉCIE" value={[txt(transport, 'qVol'), txt(transport, 'esp')].filter(Boolean).join(' · ') || '—'} />
      </section>

      <SectionTitle>DADOS ADICIONAIS</SectionTitle>
      <section className="extractor-danfe-additional">
        <Field label="INFORMAÇÕES COMPLEMENTARES" value={txt(additional, 'infCpl') || '—'} />
        <Field label="INFORMAÇÕES DO FISCO" value={txt(additional, 'infAdFisco') || '—'} />
      </section>
    </div>
  );
}

function NfceView({ document }: { document: FiscalDocumentLike }) {
  const xml = xmlDoc(document.xml);
  if (!xml) return <DocumentUnavailable />;
  const emit = one(xml, 'emit');
  const end = one(emit, 'enderEmit');
  const ide = one(xml, 'ide');
  const total = one(xml, 'ICMSTot');
  const prot = one(xml, 'infProt');
  const items = many(xml, 'det');
  const payments = many(xml, 'detPag');
  const key = String(document.accessKey || txt(prot, 'chNFe') || '').replace(/\D/g, '');
  const qrValue = txt(xml, 'qrCode') || key;
  const paymentName = (code: string) => ({
    '01': 'Dinheiro', '02': 'Cheque', '03': 'Cartão de crédito', '04': 'Cartão de débito',
    '05': 'Crédito loja', '10': 'Vale alimentação', '11': 'Vale refeição', '16': 'Depósito bancário',
    '17': 'PIX', '18': 'Transferência bancária', '90': 'Sem pagamento', '99': 'Outros',
  } as Record<string, string>)[code] || `Forma ${code || '—'}`;
  return (
    <div className="extractor-nfce-sheet">
      <h2>{txt(emit, 'xNome') || document.issuerName || 'EMITENTE'}</h2>
      <p>CNPJ {formatCnpj(txt(emit, 'CNPJ') || document.issuerCnpj)} · IE {txt(emit, 'IE') || '—'}</p>
      <p>{address(end)}</p>
      <div className="extractor-nfce-separator" />
      <strong>DOCUMENTO AUXILIAR DA NOTA FISCAL DE CONSUMIDOR ELETRÔNICA</strong>
      <div className="extractor-nfce-separator" />
      <table>
        <thead><tr><th>CÓDIGO / DESCRIÇÃO</th><th>QTDE</th><th>UN</th><th>VL.UNIT</th><th>TOTAL</th></tr></thead>
        <tbody>
          {items.map((det, index) => {
            const prod = one(det, 'prod') || det;
            return <tr key={index}>
              <td><b>{txt(prod, 'cProd') || '—'}</b><br />{txt(prod, 'xProd') || 'Item fiscal'}</td>
              <td>{q(txt(prod, 'qCom'))}</td><td>{txt(prod, 'uCom') || '—'}</td>
              <td>{brl(txt(prod, 'vUnCom'))}</td><td>{brl(txt(prod, 'vProd'))}</td>
            </tr>;
          })}
        </tbody>
      </table>
      <div className="extractor-nfce-totals">
        <span>Qtde. total de itens <b>{items.length}</b></span>
        <span>Valor produtos <b>{brl(txt(total, 'vProd'))}</b></span>
        <span>Descontos <b>{brl(txt(total, 'vDesc'))}</b></span>
        <strong>VALOR A PAGAR <b>{brl(txt(total, 'vNF') || document.value)}</b></strong>
      </div>
      <div className="extractor-nfce-separator" />
      <b>FORMAS DE PAGAMENTO</b>
      {payments.length ? payments.map((payment, index) => (
        <p key={index} className="extractor-nfce-payment">
          <span>{paymentName(txt(payment, 'tPag'))}</span><b>{brl(txt(payment, 'vPag'))}</b>
        </p>
      )) : <p>Forma de pagamento não informada.</p>}
      <div className="extractor-nfce-separator" />
      <p className="center">Consulte pela chave de acesso no portal da SEFAZ</p>
      <p className="center key">{formatAccessKey(key)}</p>
      <p className="center"><b>NFC-e nº {document.number || txt(ide, 'nNF') || '—'} · Série {document.series || txt(ide, 'serie') || '—'}</b></p>
      <p className="center">{formatDate(document.issueDate || txt(ide, 'dhEmi'))} às {formatTime(document.issueDate || txt(ide, 'dhEmi'))}</p>
      <p className="center">Protocolo {txt(prot, 'nProt') || '—'}</p>
      <div className="extractor-nfce-qr-wrap"><Qr value={qrValue} /></div>
    </div>
  );
}

const formatTribCode = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 6 ? `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}` : value || '—';
};
const formatNbs = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 9
    ? `${digits.slice(0, 1)}.${digits.slice(1, 5)}.${digits.slice(5, 7)}.${digits.slice(7)}`
    : value || '—';
};
const formatIbge = (value?: string | null) => {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.length === 7 ? `${digits.slice(0, 2)}.${digits.slice(2)}` : value || '—';
};
const ufFromIbge = (value?: string | null) => {
  const code = String(value || '').replace(/\D/g, '').slice(0, 2);
  return ({
    '11': 'RO', '12': 'AC', '13': 'AM', '14': 'RR', '15': 'PA', '16': 'AP', '17': 'TO',
    '21': 'MA', '22': 'PI', '23': 'CE', '24': 'RN', '25': 'PB', '26': 'PE', '27': 'AL',
    '28': 'SE', '29': 'BA', '31': 'MG', '32': 'ES', '33': 'RJ', '35': 'SP', '41': 'PR',
    '42': 'SC', '43': 'RS', '50': 'MS', '51': 'MT', '52': 'GO', '53': 'DF',
  } as Record<string, string>)[code] || '—';
};
const nfseAddress = (root: ParentNode | null | undefined) => {
  if (!root) return '—';
  const values = [
    txt(root, 'xLgr'),
    txt(root, 'nro'),
    txt(root, 'xCpl'),
    txt(root, 'xBairro'),
  ].filter(Boolean);
  return values.length ? values.join(', ') : '—';
};
const nfseStatus = (code: string) =>
  code === '100' ? 'NFS-e Gerada' : code ? `cStat ${code}` : '—';
const simpleStatus = (code: string) => {
  if (code === '1') return 'Não Optante';
  if (code === '2') return 'Optante - Microempreendedor Individual (MEI)';
  if (code === '3') return 'Optante - Microempresa ou Empresa de Pequeno Porte';
  return '—';
};
const simpleAssessment = (code: string) =>
  code === '1'
    ? 'Regime de apuração dos tributos federais e municipal pelo Simples Nacional'
    : code || '—';
const issRetention = (code: string) =>
  code === '1' ? 'Não Retido' : code === '2' ? 'Retido pelo Tomador' : code === '3' ? 'Retido pelo Intermediário' : '—';

function NfseCell({
  label,
  value,
  className = '',
}: {
  label: string;
  value?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`extractor-nfse-cell ${className}`}>
      <b>{label}</b>
      <span>{value === '' || value == null ? '—' : value}</span>
    </div>
  );
}
function NfseBand({ children }: { children: React.ReactNode }) {
  return <div className="extractor-nfse-band">{children}</div>;
}

function NfseView({ document }: { document: FiscalDocumentLike }) {
  const xml = xmlDoc(document.xml);
  if (!xml) return <DocumentUnavailable />;

  const preview = parseFiscalPreview(document);
  const inf = one(xml, 'infNFSe') || one(xml, 'NFSe') || xml;
  const dps = one(inf, 'DPS');
  const infDps = one(dps, 'infDPS') || dps || inf;
  const emit = one(inf, 'emit');
  const emitAddress = one(emit, 'enderNac');
  const prest = one(infDps, 'prest');
  const prestReg = one(prest, 'regTrib');
  const toma = one(infDps, 'toma');
  const tomaAddress = one(toma, 'end');
  const tomaEndNac = one(tomaAddress, 'endNac');
  const serv = one(infDps, 'serv');
  const locPrest = one(serv, 'locPrest');
  const serviceCode = one(serv, 'cServ');
  const serviceInfo = one(serv, 'infoCompl');
  const dpsValues = one(infDps, 'valores');
  const serviceValues = one(dpsValues, 'vServPrest');
  const trib = one(dpsValues, 'trib');
  const tribMun = one(trib, 'tribMun');
  const tribFed = one(trib, 'tribFed');
  const pisCofins = one(tribFed, 'piscofins');
  const totalTax = one(trib, 'totTrib');
  const nfseValues = one(inf, 'valores');

  const key = String(document.accessKey || txt(inf, 'chNFSe', 'chaveAcesso') || '')
    .replace(/\D/g, '');
  const issue = txt(infDps, 'dhEmi') || txt(inf, 'dhProc') || preview.issueDate;
  const competence = txt(infDps, 'dCompet') || issue;
  const emitCityCode = txt(emitAddress, 'cMun') || txt(infDps, 'cLocEmi');
  const tomaCityCode = txt(tomaEndNac, 'cMun');
  const serviceCityCode = txt(locPrest, 'cLocPrestacao');
  const incidenceCode = txt(inf, 'cLocIncid');
  const emitUf = txt(emitAddress, 'UF') || ufFromIbge(emitCityCode);
  const tomaUf = txt(tomaAddress, 'UF') || ufFromIbge(tomaCityCode);
  const serviceUf = ufFromIbge(serviceCityCode);
  const incidenceUf = ufFromIbge(incidenceCode);
  const serviceValue = txt(serviceValues, 'vServ') || document.value;
  const liquidValue = txt(nfseValues, 'vLiq') || serviceValue;
  const pTotTrib = txt(totalTax, 'pTotTribSN');
  const qrValue = key;

  return (
    <div className="extractor-nfse-sheet extractor-nfse-official">
      <div className="extractor-nfse-top">
        <div className="extractor-nfse-brand" aria-label="NFS-e">
          <strong><i>N</i><span>F</span><em>S</em><u>e</u></strong>
          <small>Nota Fiscal de<br />Serviço eletrônica</small>
        </div>
        <div className="extractor-nfse-title">
          <b>DANFSe v2.0</b>
          <strong>Documento Auxiliar da NFS-e</strong>
        </div>
        <div className="extractor-nfse-environment">
          <b>Município: {txt(inf, 'xLocEmi') || '—'} - {emitUf}</b>
          <span>Ambiente Gerador: {txt(inf, 'ambGer') || '—'}</span>
          <span>Tipo de Ambiente: {txt(infDps, 'tpAmb') || '—'}</span>
        </div>
      </div>

      <div className="extractor-nfse-identification">
        <div className="extractor-nfse-identification-main">
          <NfseCell label="CHAVE DE ACESSO DA NFS-e" value={key || '—'} className="wide" />
          <div className="extractor-nfse-grid cols-3">
            <NfseCell label="NÚMERO DA NFS-e" value={txt(inf, 'nNFSe') || preview.number} />
            <NfseCell label="COMPETÊNCIA DA NFS-e" value={formatDate(competence)} />
            <NfseCell label="DATA E HORA DA EMISSÃO DA NFS-e" value={`${formatDate(issue)} ${formatTime(issue)}`} />
            <NfseCell label="NÚMERO DA DPS" value={txt(infDps, 'nDPS') || '—'} />
            <NfseCell label="SÉRIE DA DPS" value={txt(infDps, 'serie') || preview.series} />
            <NfseCell label="DATA E HORA DA EMISSÃO DA DPS" value={`${formatDate(issue)} ${formatTime(issue)}`} />
            <NfseCell label="EMITENTE DA NFS-e" value="Prestador" />
            <NfseCell label="SITUAÇÃO DA NFS-e" value={nfseStatus(txt(inf, 'cStat'))} />
            <NfseCell label="FINALIDADE" value={txt(infDps, 'finNFSe', 'finalidade') || '—'} />
          </div>
        </div>
        <div className="extractor-nfse-auth">
          <div className="extractor-nfse-qr-box">{qrValue && <Qr value={qrValue} />}</div>
          <p>A autenticidade desta NFS-e pode ser verificada pela leitura deste código QR ou pela consulta da chave de acesso no portal nacional da NFS-e</p>
        </div>
      </div>

      <NfseBand>PRESTADOR / FORNECEDOR</NfseBand>
      <div className="extractor-nfse-grid cols-4">
        <NfseCell label="Nome / Nome Empresarial" value={txt(emit, 'xNome') || preview.issuerName} className="span-2" />
        <NfseCell label="CNPJ / CPF / NIF" value={fmtCpfCnpj(txt(emit, 'CNPJ', 'CPF') || preview.issuerCnpj)} />
        <NfseCell label="Indicador Municipal (Inscrição)" value={txt(emit, 'IM') || txt(prest, 'IM') || '—'} />
        <NfseCell label="Endereço" value={nfseAddress(emitAddress)} className="span-2" />
        <NfseCell label="Município / Sigla UF" value={`${txt(inf, 'xLocEmi') || '—'} / ${emitUf}`} />
        <NfseCell label="Código IBGE / CEP" value={`${formatIbge(emitCityCode)} / ${fmtCep(txt(emitAddress, 'CEP'))}`} />
        <NfseCell label="Simples Nacional na Data de Competência" value={simpleStatus(txt(prestReg, 'opSimpNac'))} className="span-2" />
        <NfseCell label="Regime de Apuração Tributária pelo SN" value={simpleAssessment(txt(prestReg, 'regApTribSN'))} />
        <NfseCell label="Telefone" value={txt(emit, 'fone') || txt(prest, 'fone') || '—'} />
        <NfseCell label="E-mail" value={txt(emit, 'email') || txt(prest, 'email') || '—'} className="span-2" />
      </div>

      <NfseBand>TOMADOR / ADQUIRENTE</NfseBand>
      <div className="extractor-nfse-grid cols-4">
        <NfseCell label="Nome / Nome Empresarial" value={txt(toma, 'xNome') || preview.recipientName} className="span-2" />
        <NfseCell label="CNPJ / CPF / NIF" value={fmtCpfCnpj(txt(toma, 'CNPJ', 'CPF') || preview.recipientCnpj)} />
        <NfseCell label="Indicador Municipal (Inscrição)" value={txt(toma, 'IM') || '—'} />
        <NfseCell label="Endereço" value={nfseAddress(tomaAddress)} className="span-2" />
        <NfseCell label="Município / Sigla UF" value={`${txt(toma, 'xMun') || '—'} / ${tomaUf}`} />
        <NfseCell label="Código IBGE / CEP" value={`${formatIbge(tomaCityCode)} / ${fmtCep(txt(tomaEndNac, 'CEP'))}`} />
        <NfseCell label="E-mail" value={txt(toma, 'email') || '—'} className="span-2" />
        <NfseCell label="Telefone" value={txt(toma, 'fone') || '—'} />
      </div>

      <div className="extractor-nfse-centered-line">DESTINATÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e</div>
      <div className="extractor-nfse-centered-line">INTERMEDIÁRIO DA OPERAÇÃO NÃO IDENTIFICADO NA NFS-e</div>

      <NfseBand>SERVIÇO PRESTADO</NfseBand>
      <div className="extractor-nfse-grid service-head">
        <NfseCell label="Código de Tributação Nacional/Municipal" value={`${formatTribCode(txt(serviceCode, 'cTribNac'))} / ${formatTribCode(txt(serviceCode, 'cTribMun'))}`} />
        <NfseCell label="Código da NBS" value={formatNbs(txt(serviceCode, 'cNBS'))} />
        <NfseCell
          label="Local da Prestação / Sigla UF / País"
          value={`${txt(inf, 'xLocPrestacao') || '—'} / ${serviceUf} / —`}
        />
      </div>
      <div className="extractor-nfse-service-name">{txt(inf, 'xTribNac') || '—'}</div>
      <NfseCell
        label="Descrição do Serviço"
        value={<span className="extractor-nfse-multiline">{txt(serviceCode, 'xDescServ') || preview.serviceDescription || '—'}</span>}
        className="full service-description"
      />

      <NfseBand>TRIBUTAÇÃO MUNICIPAL (ISSQN)</NfseBand>
      <div className="extractor-nfse-grid cols-4">
        <NfseCell label="Tipo de Tributação do ISSQN" value={txt(tribMun, 'tribISSQN') === '1' ? 'Operação Tributável' : txt(tribMun, 'tribISSQN') || '—'} />
        <NfseCell label="Município / Sigla UF / País de Incidência do ISSQN" value={`${txt(inf, 'xLocIncid') || '—'} / ${incidenceUf} / —`} className="span-2" />
        <NfseCell label="BC ISSQN" value={txt(tribMun, 'vBC') ? brl(txt(tribMun, 'vBC')) : '—'} />
        <NfseCell label="Alíquota Aplicada" value={txt(tribMun, 'pAliq') || '—'} />
        <NfseCell label="Retenção do ISSQN" value={issRetention(txt(tribMun, 'tpRetISSQN'))} />
        <NfseCell label="ISSQN Apurado" value={txt(tribMun, 'vISSQN') ? brl(txt(tribMun, 'vISSQN')) : '—'} />
      </div>

      <NfseBand>TRIBUTAÇÃO FEDERAL (EXCETO CBS)</NfseBand>
      <div className="extractor-nfse-grid cols-4">
        <NfseCell label="IRRF" value={txt(tribFed, 'vIRRF') ? brl(txt(tribFed, 'vIRRF')) : '—'} />
        <NfseCell label="Contribuição Previdenciária - Retida" value={txt(tribFed, 'vCP') ? brl(txt(tribFed, 'vCP')) : '—'} />
        <NfseCell label="Contribuições Sociais - Retidas" value={txt(tribFed, 'vCSLL') ? brl(txt(tribFed, 'vCSLL')) : '—'} />
        <NfseCell label="PIS - Débito Apuração Própria" value={txt(pisCofins, 'vPIS') ? brl(txt(pisCofins, 'vPIS')) : '—'} />
        <NfseCell label="COFINS - Débito Apuração Própria" value={txt(pisCofins, 'vCOFINS') ? brl(txt(pisCofins, 'vCOFINS')) : '—'} />
        <NfseCell label="Descrição Contrib. Sociais - Retidas" value={txt(tribFed, 'xDescRet') || '—'} className="span-2" />
      </div>

      <NfseBand>TRIBUTAÇÃO IBS/CBS</NfseBand>
      <div className="extractor-nfse-grid cols-4 extractor-nfse-ibscbs">
        <NfseCell label="CST / cClassTrib" value={`${txt(trib, 'CST') || '—'} / ${txt(trib, 'cClassTrib') || '—'}`} />
        <NfseCell label="Indicador de Operação / Código IBGE Incidência / Município Incidência / Sigla UF" value={`— / ${formatIbge(incidenceCode)} / ${txt(inf, 'xLocIncid') || '—'} / ${incidenceUf}`} className="span-3" />
        <NfseCell label="Exclusões e Reduções da Base de Cálculo" value="R$ 0,00" />
        <NfseCell label="Base de Cálculo Após Exclusões e Reduções" value="—" />
        <NfseCell label="Red. Alíquota IBS / Red. Alíquota CBS" value="— / — / —" />
        <NfseCell label="Alíquota - IBS UF / IBS Mun" value="— / —" />
        <NfseCell label="Alíq. Efetiva Municipal - IBS" value="—" />
        <NfseCell label="Valor Apurado Municipal - IBS" value="—" />
        <NfseCell label="Alíq. Efetiva Estadual - IBS" value="—" />
        <NfseCell label="Valor Apurado Estadual - IBS" value="—" />
        <NfseCell label="Valor Total Apurado - IBS" value="—" />
        <NfseCell label="Alíquota - CBS" value="—" />
        <NfseCell label="Alíquota Efetiva - CBS" value="—" />
        <NfseCell label="Valor Total Apurado - CBS" value="—" />
      </div>

      <NfseBand>VALOR TOTAL DA NFS-e</NfseBand>
      <div className="extractor-nfse-grid cols-4 extractor-nfse-values">
        <NfseCell label="VALOR DA OPERAÇÃO / SERVIÇO" value={brl(serviceValue)} />
        <NfseCell label="Desconto Incondicionado" value={txt(dpsValues, 'vDescIncond') ? brl(txt(dpsValues, 'vDescIncond')) : '—'} />
        <NfseCell label="Desconto Condicionado" value={txt(dpsValues, 'vDescCond') ? brl(txt(dpsValues, 'vDescCond')) : '—'} />
        <NfseCell label="Total das Retenções (ISSQN / Federais)" value={txt(dpsValues, 'vTotRet') ? brl(txt(dpsValues, 'vTotRet')) : '—'} />
        <NfseCell label="VALOR LÍQUIDO DA NFS-e" value={brl(liquidValue)} />
        <NfseCell label="Total do IBS/CBS" value="R$ 0,00" />
        <NfseCell label="VALOR LÍQUIDO DA NFS-e + IBS/CBS" value="R$ 0,00" />
      </div>

      <NfseBand>INFORMAÇÕES COMPLEMENTARES</NfseBand>
      <div className="extractor-nfse-complement">
        <div>Inf. Cont.: {txt(serviceInfo, 'xInfComp') || '—'}</div>
        <div>
          Totais aproximados dos Tributos cfe. Lei n° 12.741/2012:
          {pTotTrib ? ` percentual informado pelo Simples Nacional: ${q(pTotTrib)}%` : ' Federais: -; Estaduais: -; Municipais: -;'}
        </div>
      </div>

      <div className="extractor-nfse-spacer" />

      <div className="extractor-nfse-footer">
        <NfseCell label="DATA CIENTIFICAÇÃO:" value="" />
        <NfseCell label="IDENTIFICAÇÃO E ASSINATURA" value="" />
        <NfseCell label="N° NFS-e / CHAVE NFS-e" value={`${txt(inf, 'nNFSe') || preview.number} / ${key || '—'}`} />
      </div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return <div className="extractor-fiscal-field"><small>{label}</small><strong>{value || '—'}</strong></div>;
}
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="extractor-fiscal-section-title">{children}</div>;
}
function DocumentUnavailable() {
  return <div className="extractor-fiscal-unavailable"><Info /><b>XML integral ainda indisponível</b><span>O sistema continua tentando recuperar o documento fiscal completo.</span></div>;
}

export default function ExtractorFiscalDocumentPreviewModal({
  document,
  companyName,
  companyCnpj,
  downloadingPdf,
  downloadingXml,
  onClose,
  onDownloadPdf,
  onDownloadXml,
  onManifestation,
  onRetry,
}: Props) {
  const [copied, setCopied] = useState(false);
  const data = useMemo(
    () => (document ? parseFiscalPreview(document, companyName, companyCnpj) : null),
    [document, companyName, companyCnpj]
  );
  useEffect(() => {
    if (!document) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [document, onClose]);
  useEffect(() => setCopied(false), [document?.accessKey]);

  if (!document || !data) return null;
  const needsManifestation = document.parseError === 'xml_requires_manifestation';
  const manifestationSent = document.parseError === 'xml_retry:manifestation_sent';
  const type = docType(document);
  const complete = Boolean(document.fullXml && document.xml);
  const status = fiscalStatusLabel(document);

  const copyKey = async () => {
    if (!data.accessKey) return;
    await navigator.clipboard.writeText(data.accessKey);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1400);
  };

  return (
    <div className="extractor-fiscal-preview-overlay" onMouseDown={event => event.target === event.currentTarget && onClose()}>
      <div className="extractor-fiscal-preview-modal">
        <section className="extractor-fiscal-preview-document">
          <div className="extractor-fiscal-preview-toolbar">
            <div>
              <small>Documento fiscal</small>
              <strong>{type} {data.number !== '—' ? `· ${data.number}` : ''}</strong>
            </div>
            <span>Pré-visualização interna · não substitui o documento fiscal oficial</span>
          </div>
          <div className="extractor-fiscal-paper-stage">
            {complete ? (
              type === 'NFC-e' ? <NfceView document={document} /> :
              type === 'NFS-e' ? <NfseView document={document} /> :
              type === 'NF-e' ? <DanfeView document={document} /> :
              <DocumentUnavailable />
            ) : (
              <div className="extractor-fiscal-recovery-card">
                <Info />
                <h3>Documento integral ainda não disponível</h3>
                <p>
                  {needsManifestation
                    ? 'A SEFAZ exige manifestação do destinatário antes de liberar o XML.'
                    : manifestationSent
                      ? 'A manifestação foi registrada e a recuperação automática continuará tentando.'
                      : 'A prévia completa depende do XML integral. A recuperação automática permanece ativa.'}
                </p>
                {onRetry && !needsManifestation && (
                  <button onClick={() => void onRetry(document)}><RefreshCw /> Tentar recuperar agora</button>
                )}
              </div>
            )}
          </div>
        </section>

        <aside className="extractor-fiscal-preview-summary">
          <div className="extractor-fiscal-preview-summary-head">
            <div><small>Resumo</small><h2>{type} · {data.number}</h2><span className={statusTone(status)}>{status}</span></div>
            <button onClick={onClose} aria-label="Fechar"><X /></button>
          </div>
          <div className="extractor-fiscal-summary-list">
            <SummaryLine label="Empresa" value={`${companyName}${companyCnpj ? ` · ${formatCnpj(companyCnpj)}` : ''}`} />
            <SummaryLine label="Operação" value={data.operation} />
            <SummaryLine label="Emissão" value={`${formatDate(data.issueDate)} às ${formatTime(data.issueDate)}`} />
            <SummaryLine label="Valor" value={formatMoney(data.value)} />
            <SummaryLine label="Nota / série" value={`${data.number} / ${data.series}`} />
            <SummaryLine label="Emitente" value={`${data.issuerName}${data.issuerCnpj ? ` · ${formatCnpj(data.issuerCnpj)}` : ''}`} />
            <SummaryLine label="Destinatário" value={`${data.recipientName}${data.recipientCnpj ? ` · ${formatCnpj(data.recipientCnpj)}` : ''}`} />
            <div className="extractor-fiscal-summary-line">
              <small>Chave de acesso</small>
              <strong className="mono">{data.accessKey ? formatAccessKey(data.accessKey) : '—'}</strong>
              {data.accessKey && <button className="copy" onClick={() => void copyKey()}>{copied ? <CheckCircle2 /> : <Clipboard />}{copied ? 'Copiada' : 'Copiar chave'}</button>}
            </div>
          </div>

          {(needsManifestation || manifestationSent) && (
            <div className="extractor-fiscal-manifest-box">
              <Info />
              <div>
                <b>{needsManifestation ? 'Manifestação necessária' : 'Manifestação registrada'}</b>
                <p>{needsManifestation ? 'A SEFAZ precisa da confirmação do destinatário para liberar o XML integral.' : 'O sistema aguarda a liberação do XML e continuará tentando automaticamente.'}</p>
                {needsManifestation && onManifestation && <button onClick={() => onManifestation(document)}>Resolver manifestação</button>}
              </div>
            </div>
          )}

          <div className="extractor-fiscal-preview-actions">
            <Button onClick={() => void onDownloadPdf(document)} disabled={Boolean(downloadingPdf) || !complete || document.documentKind === 'evento'}>
              {downloadingPdf ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {downloadingPdf ? 'Preparando...' : 'Baixar PDF oficial'}
            </Button>
            <Button variant="outline" onClick={() => void onDownloadXml(document)} disabled={Boolean(downloadingXml) || (needsManifestation && !complete)}>
              {downloadingXml ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileCode2 className="mr-2 h-4 w-4" />}
              {downloadingXml ? 'Preparando XML...' : complete ? 'Baixar XML' : 'Recuperar XML'}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SummaryLine({ label, value }: { label: string; value: string }) {
  return <div className="extractor-fiscal-summary-line"><small>{label}</small><strong>{value || '—'}</strong></div>;
}
