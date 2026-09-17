export type FiscalDocumentLike = {
  companyId?: string;
  nsu?: string;
  schema?: string;
  source?: string;
  documentKind?: 'nfe' | 'nfse' | 'resumo' | 'evento' | 'documento';
  fullXml?: boolean;
  direction?: 'entrada' | 'saida' | 'relacionada';
  accessKey?: string;
  model?: string;
  issueDate?: string;
  value?: number;
  issuerCnpj?: string;
  issuerName?: string;
  recipientCnpj?: string;
  recipientName?: string;
  number?: string;
  series?: string;
  statusCode?: string;
  statusText?: string;
  xml?: string;
  parseError?: string;
};

export type FiscalPreviewItem = {
  code: string;
  description: string;
  ncm: string;
  cfop: string;
  quantity: number | null;
  unit: string;
  unitValue: number | null;
  total: number | null;
};

export type FiscalPreviewData = {
  type: 'NF-e' | 'NFC-e' | 'NFS-e' | 'Documento';
  issuerName: string;
  issuerCnpj: string;
  recipientName: string;
  recipientCnpj: string;
  number: string;
  series: string;
  issueDate: string;
  operation: string;
  status: string;
  accessKey: string;
  protocol: string;
  value: number;
  items: FiscalPreviewItem[];
  serviceDescription: string;
  city: string;
};

export const onlyDigits = (value?: string | null) => String(value || '').replace(/\D/g, '');

export const docModel = (document: FiscalDocumentLike) =>
  String(
    document.model ||
      (document.accessKey && /^\d{44}$/.test(document.accessKey)
        ? document.accessKey.slice(20, 22)
        : '')
  );

export const docType = (document: FiscalDocumentLike): FiscalPreviewData['type'] => {
  const hint = `${document.documentKind || ''} ${document.schema || ''} ${document.source || ''}`.toLowerCase();
  if (hint.includes('nfse') || hint.includes('nfs-e')) return 'NFS-e';
  const model = docModel(document);
  if (model === '65') return 'NFC-e';
  if (model === '55') return 'NF-e';
  return 'Documento';
};

export const isCancelledDocument = (document: FiscalDocumentLike) =>
  ['101', '151', '155'].includes(String(document.statusCode || '')) ||
  /cancel/i.test(String(document.statusText || ''));

export const fiscalStatusLabel = (document: FiscalDocumentLike) => {
  if (document.documentKind === 'evento') return 'Evento';
  if (isCancelledDocument(document)) return 'Cancelada';
  if (
    /deneg/i.test(String(document.statusText || '')) ||
    ['110', '301', '302'].includes(String(document.statusCode || ''))
  )
    return 'Denegada';
  if (
    ['1', '100', '150'].includes(String(document.statusCode || '')) ||
    /autoriz|ativa/i.test(String(document.statusText || ''))
  )
    return 'Autorizada';
  return document.statusText || 'Fiscal';
};

export const formatCnpj = (value?: string | null) => {
  const digits = onlyDigits(value);
  return digits.length === 14
    ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
    : String(value || '—');
};

export const formatAccessKey = (value?: string | null) => {
  const digits = onlyDigits(value);
  if (digits.length !== 44) return String(value || '—');
  return digits.match(/.{1,4}/g)?.join(' ') || digits;
};

export const formatMoney = (value?: number | null) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString('pt-BR');
};

export const formatTime = (value?: string | null) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? '—'
    : parsed.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};

const elementByLocalName = (root: ParentNode | null | undefined, name: string) => {
  if (!root) return null;
  return Array.from(root.querySelectorAll('*')).find(node => node.localName === name) || null;
};

const elementsByLocalName = (root: ParentNode | null | undefined, name: string) => {
  if (!root) return [] as Element[];
  return Array.from(root.querySelectorAll('*')).filter(node => node.localName === name);
};

const text = (root: ParentNode | null | undefined, ...names: string[]) => {
  for (const name of names) {
    const value = elementByLocalName(root, name)?.textContent?.trim();
    if (value) return value;
  }
  return '';
};

const number = (value: string) => {
  const parsed = Number(String(value || '').replace(',', '.'));
  return Number.isFinite(parsed) ? parsed : null;
};

const parseXml = (xml?: string) => {
  if (!xml || typeof DOMParser === 'undefined') return null;
  try {
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    if (parsed.querySelector('parsererror')) return null;
    return parsed;
  } catch {
    return null;
  }
};

const parseItems = (xml: Document | null): FiscalPreviewItem[] => {
  if (!xml) return [];
  return elementsByLocalName(xml, 'det').slice(0, 80).map(det => {
    const product = elementByLocalName(det, 'prod') || det;
    return {
      code: text(product, 'cProd'),
      description: text(product, 'xProd') || 'Item fiscal',
      ncm: text(product, 'NCM'),
      cfop: text(product, 'CFOP'),
      quantity: number(text(product, 'qCom')),
      unit: text(product, 'uCom'),
      unitValue: number(text(product, 'vUnCom')),
      total: number(text(product, 'vProd')),
    };
  });
};

export const parseFiscalPreview = (
  document: FiscalDocumentLike,
  fallbackCompanyName = '',
  fallbackCompanyCnpj = ''
): FiscalPreviewData => {
  const xml = parseXml(document.xml);
  const emit = xml ? elementByLocalName(xml, 'emit') : null;
  const dest = xml ? elementByLocalName(xml, 'dest') : null;
  const ide = xml ? elementByLocalName(xml, 'ide') : null;
  const infNfe = xml ? elementByLocalName(xml, 'infNFe') : null;
  const infNfse = xml ? elementByLocalName(xml, 'infNFSe') : null;
  const service = xml ? elementByLocalName(xml, 'serv') || elementByLocalName(xml, 'Servico') : null;
  const totalRoot = xml ? elementByLocalName(xml, 'ICMSTot') || elementByLocalName(xml, 'valores') : null;
  const type = docType(document);
  const direction = document.direction;
  const inferredIssuer = text(emit, 'xNome', 'xFant') || text(infNfse, 'xNome') || document.issuerName || '';
  const inferredIssuerCnpj = text(emit, 'CNPJ', 'CPF') || text(infNfse, 'CNPJ', 'CPF') || document.issuerCnpj || '';
  const recipientName = text(dest, 'xNome') || document.recipientName || (direction === 'saida' ? '' : fallbackCompanyName);
  const recipientCnpj = text(dest, 'CNPJ', 'CPF') || document.recipientCnpj || (direction === 'saida' ? '' : fallbackCompanyCnpj);
  const xmlValue = number(
    text(totalRoot, 'vNF', 'vLiq', 'vServ', 'vServPrest') ||
      text(infNfse, 'vLiq', 'vServ', 'vServPrest')
  );
  const accessKey =
    onlyDigits(document.accessKey) ||
    onlyDigits(infNfe?.getAttribute('Id')?.replace(/^NFe/, '') || '') ||
    onlyDigits(text(xml, 'chNFe'));
  const issueDate =
    text(ide, 'dhEmi', 'dEmi') ||
    text(infNfse, 'dhEmi', 'dEmi', 'Competencia') ||
    document.issueDate ||
    '';
  const operation =
    text(ide, 'natOp') ||
    text(service, 'xDescServ', 'Discriminacao', 'xTribNac') ||
    (direction === 'saida' ? 'Venda de mercadoria' : 'Entrada fiscal');
  const serviceDescription =
    text(service, 'xDescServ', 'Discriminacao', 'xTribNac', 'cTribNac') ||
    text(infNfse, 'xDescServ', 'Discriminacao') ||
    operation;
  const city =
    text(elementByLocalName(emit, 'enderEmit'), 'xMun', 'UF') ||
    text(elementByLocalName(infNfse, 'end'), 'xMun', 'UF') ||
    '';

  return {
    type,
    issuerName: inferredIssuer || (direction === 'saida' ? fallbackCompanyName : 'Emitente não identificado'),
    issuerCnpj: inferredIssuerCnpj || (direction === 'saida' ? fallbackCompanyCnpj : ''),
    recipientName: recipientName || (direction === 'entrada' ? fallbackCompanyName : 'Destinatário não identificado'),
    recipientCnpj: recipientCnpj || (direction === 'entrada' ? fallbackCompanyCnpj : ''),
    number: text(ide, 'nNF') || text(infNfse, 'nNFSe') || document.number || '—',
    series: text(ide, 'serie') || document.series || '—',
    issueDate,
    operation,
    status: fiscalStatusLabel(document),
    accessKey,
    protocol: text(xml, 'nProt', 'protocolo') || '',
    value: xmlValue ?? Number(document.value || 0),
    items: parseItems(xml),
    serviceDescription,
    city,
  };
};
