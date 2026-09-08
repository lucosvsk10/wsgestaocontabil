import { DragEvent, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, FileSpreadsheet, Upload, X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';

type Destination = 'Clientes' | 'Fornecedores' | 'Produtos' | 'Serviços' | 'Transportadoras';
type Column = { index: number; label: string; normalized: string };
type ParsedSheet = {
  fileName: string;
  sheetName: string;
  headerRow: number;
  columns: Column[];
  rows: string[][];
};
type FieldDef = { key: string; label: string; aliases: string[]; required?: boolean };
type ImportSummary = { inserted: number; duplicates: number; invalid: number };

type Props = {
  organizationId: string | null;
  defaultDestination: Destination;
  onImported?: () => void;
};

const DESTINATIONS: Destination[] = ['Clientes', 'Fornecedores', 'Produtos', 'Serviços', 'Transportadoras'];
const PARTY_TYPE: Record<Exclude<Destination, 'Produtos' | 'Serviços'>, string> = {
  Clientes: 'customer',
  Fornecedores: 'supplier',
  Transportadoras: 'carrier',
};

const normalize = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
const digits = (value: unknown) => String(value ?? '').replace(/\D/g, '');
const clean = (value: unknown) => String(value ?? '').trim();
const normalizedKey = (value: unknown) => normalize(value).replace(/\s+/g, ' ');
const parseNumber = (value: unknown) => {
  const text = clean(value).replace(/\s/g, '');
  if (!text) return null;
  const normalized = text.includes(',')
    ? text.replace(/\./g, '').replace(',', '.')
    : text.replace(/[^0-9.-]/g, '');
  const number = Number(normalized);
  return Number.isFinite(number) ? number : null;
};

const partyFields: FieldDef[] = [
  { key: 'person_type', label: 'Pessoa física/jurídica', aliases: ['Pessoa (Física/Jurídica)', 'Pessoa Física/Jurídica', 'Tipo de pessoa', 'Pessoa'] },
  { key: 'legal_name', label: 'Razão social / Nome', aliases: ['Razão Social', 'Nome/Razão Social', 'Nome completo', 'Nome'], required: true },
  { key: 'trade_name', label: 'Nome fantasia', aliases: ['Nome Fantasia', 'Fantasia'] },
  { key: 'tax_id', label: 'CNPJ / CPF', aliases: ['CNPJ/CPF', 'CPF/CNPJ', 'CNPJ', 'CPF'] },
  { key: 'state_registration', label: 'Inscrição estadual / RG', aliases: ['Inscrição Estadual/RG', 'IE/RG', 'Inscrição Estadual', 'IE', 'RG'] },
  { key: 'municipal_registration', label: 'Inscrição municipal', aliases: ['Inscrição Municipal', 'IM'] },
  { key: 'postal_code', label: 'CEP', aliases: ['CEP'] },
  { key: 'street', label: 'Endereço', aliases: ['Endereço', 'Logradouro', 'Rua'] },
  { key: 'street_number', label: 'Número', aliases: ['Número', 'Numero', 'Nº'] },
  { key: 'complement', label: 'Complemento', aliases: ['Complemento'] },
  { key: 'district', label: 'Bairro', aliases: ['Bairro'] },
  { key: 'city', label: 'Cidade', aliases: ['Cidade', 'Município', 'Municipio'] },
  { key: 'city_ibge_code', label: 'Código IBGE', aliases: ['Código IBGE', 'IBGE Município', 'IBGE'] },
  { key: 'state', label: 'Estado / UF', aliases: ['Estado', 'UF'] },
  { key: 'phone', label: 'Telefone principal', aliases: ['Telefone Principal', 'Telefone', 'Fone'] },
  { key: 'mobile', label: 'Celular', aliases: ['Celular', 'Telefone Celular'] },
  { key: 'email', label: 'E-mail', aliases: ['E-mail', 'Email'] },
  { key: 'contact_name', label: 'Contato responsável', aliases: ['Contato Responsável', 'Nome do Contato', 'Responsável'] },
  { key: 'website', label: 'Site', aliases: ['Site', 'Website'] },
  { key: 'rntrc', label: 'RNTRC', aliases: ['RNTRC', 'ANTT'] },
  { key: 'vehicle_plate', label: 'Placa do veículo', aliases: ['Placa', 'Placa do Veículo', 'Placa Veículo'] },
  { key: 'vehicle_state', label: 'UF do veículo', aliases: ['UF Veículo', 'Estado Veículo'] },
  { key: 'notes', label: 'Observações', aliases: ['Observações', 'Observacao', 'Notas'] },
];

const productFields: FieldDef[] = [
  { key: 'code', label: 'Código interno', aliases: ['Código', 'Codigo', 'Código Interno', 'SKU'] },
  { key: 'name', label: 'Nome do produto', aliases: ['Produto', 'Nome do Produto', 'Descrição', 'Descricao', 'Nome'], required: true },
  { key: 'description', label: 'Descrição', aliases: ['Descrição Completa', 'Descricao Completa', 'Detalhes'] },
  { key: 'unit', label: 'Unidade', aliases: ['Unidade', 'UN', 'Un'] },
  { key: 'sale_price', label: 'Preço de venda', aliases: ['Preço de Venda', 'Preco de Venda', 'Valor de Venda', 'Valor', 'Preço'] },
  { key: 'cost_price', label: 'Preço de custo', aliases: ['Preço de Custo', 'Preco de Custo', 'Custo'] },
  { key: 'gtin', label: 'GTIN / EAN', aliases: ['GTIN', 'EAN', 'Código de Barras', 'Codigo de Barras'] },
  { key: 'ncm', label: 'NCM', aliases: ['NCM'] },
  { key: 'cest', label: 'CEST', aliases: ['CEST'] },
  { key: 'product_origin', label: 'Origem', aliases: ['Origem', 'Origem da Mercadoria'] },
  { key: 'cfop_in_state', label: 'CFOP dentro do estado', aliases: ['CFOP Interno', 'CFOP Dentro do Estado', 'CFOP'] },
  { key: 'cfop_out_state', label: 'CFOP fora do estado', aliases: ['CFOP Externo', 'CFOP Fora do Estado'] },
  { key: 'icms_cst', label: 'CST ICMS', aliases: ['CST ICMS', 'ICMS CST', 'CST'] },
  { key: 'csosn', label: 'CSOSN', aliases: ['CSOSN'] },
  { key: 'stock_quantity', label: 'Estoque', aliases: ['Estoque', 'Quantidade em Estoque', 'Saldo'] },
  { key: 'stock_minimum', label: 'Estoque mínimo', aliases: ['Estoque Mínimo', 'Estoque Minimo'] },
  { key: 'weight_net', label: 'Peso líquido', aliases: ['Peso Líquido', 'Peso Liquido'] },
  { key: 'weight_gross', label: 'Peso bruto', aliases: ['Peso Bruto'] },
];

const serviceFields: FieldDef[] = [
  { key: 'code', label: 'Código interno', aliases: ['Código', 'Codigo', 'Código Interno'] },
  { key: 'name', label: 'Nome do serviço', aliases: ['Serviço', 'Servico', 'Nome do Serviço', 'Nome'], required: true },
  { key: 'description', label: 'Descrição', aliases: ['Descrição', 'Descricao', 'Descrição do Serviço'] },
  { key: 'sale_price', label: 'Valor padrão', aliases: ['Valor', 'Preço', 'Preco', 'Valor do Serviço', 'Valor Padrão'] },
  { key: 'service_code_national', label: 'Código de Tributação Nacional', aliases: ['Código de Tributação Nacional', 'Codigo Tributacao Nacional', 'cTribNac', 'Código Nacional'] },
  { key: 'service_code_municipal', label: 'Código municipal', aliases: ['Código Municipal', 'Codigo Municipal', 'Código do Serviço Municipal'] },
  { key: 'cnae', label: 'CNAE', aliases: ['CNAE'] },
  { key: 'iss_rate', label: 'Alíquota ISS', aliases: ['Alíquota ISS', 'Aliquota ISS', 'ISS %'] },
  { key: 'fiscal_notes', label: 'Observações fiscais', aliases: ['Observações Fiscais', 'Observacoes Fiscais', 'Observações'] },
];

const numericCatalogFields = new Set([
  'sale_price',
  'cost_price',
  'stock_quantity',
  'stock_minimum',
  'weight_net',
  'weight_gross',
  'iss_rate',
]);
const digitFields = new Set([
  'tax_id',
  'postal_code',
  'city_ibge_code',
  'rntrc',
  'ncm',
  'cest',
  'service_code_national',
  'service_code_municipal',
  'cnae',
]);

const definitionsFor = (destination: Destination) =>
  destination === 'Produtos' ? productFields : destination === 'Serviços' ? serviceFields : partyFields;

const personType = (source: unknown, taxId: string) => {
  const value = normalize(source);
  if (value.includes('fisica') || value === 'pf' || taxId.length === 11) return 'individual';
  if (value.includes('estrange') || value === 'foreign') return 'foreign';
  if (value.includes('juridica') || value === 'pj' || taxId.length === 14) return 'legal';
  return '';
};

const uniqueColumns = (headers: unknown[]) => {
  const seen = new Map<string, number>();
  return headers
    .map((value, index) => {
      const raw = clean(value);
      if (!raw) return null;
      const count = (seen.get(raw) || 0) + 1;
      seen.set(raw, count);
      return {
        index,
        label: count > 1 ? `${raw} (${count})` : raw,
        normalized: normalize(raw),
      } as Column;
    })
    .filter(Boolean) as Column[];
};

const headerScore = (row: unknown[], definitions: FieldDef[]) => {
  const values = row.map(normalize).filter(Boolean);
  const aliases = definitions.flatMap(field => field.aliases.map(normalize));
  return values.reduce((score, value) => score + (aliases.some(alias => alias === value) ? 1 : 0), 0);
};

async function parseSpreadsheet(file: File, destination: Destination): Promise<ParsedSheet> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: false });
  const definitions = definitionsFor(destination);
  let best: { score: number; sheetName: string; headerRow: number; matrix: unknown[][] } | null = null;

  workbook.SheetNames.forEach(sheetName => {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
      header: 1,
      defval: '',
      raw: false,
      blankrows: false,
    }) as unknown[][];
    matrix.slice(0, 35).forEach((row, index) => {
      const score = headerScore(row, definitions);
      if (!best || score > best.score) best = { score, sheetName, headerRow: index, matrix };
    });
  });

  if (!best || best.score < 1) throw new Error('Não foi possível identificar uma linha de cabeçalho nesta planilha.');
  const header = best.matrix[best.headerRow] || [];
  const columns = uniqueColumns(header);
  const rows = best.matrix
    .slice(best.headerRow + 1)
    .map(row => row.map(value => clean(value)))
    .filter(row => row.some(Boolean));
  if (!columns.length || !rows.length) throw new Error('A planilha não possui registros para importar.');

  return {
    fileName: file.name,
    sheetName: best.sheetName,
    headerRow: best.headerRow,
    columns,
    rows,
  };
}

const autoMapping = (parsed: ParsedSheet, destination: Destination) => {
  const mapping: Record<string, string> = {};
  definitionsFor(destination).forEach(field => {
    const aliases = field.aliases.map(normalize);
    const exact = parsed.columns.find(column => aliases.includes(column.normalized));
    const loose = exact || parsed.columns.find(column =>
      column.normalized.length > 2 && aliases.some(alias => alias.length > 2 && (column.normalized.includes(alias) || alias.includes(column.normalized)))
    );
    mapping[field.key] = loose ? String(loose.index) : '';
  });
  return mapping;
};

const valueAt = (row: string[], mapping: Record<string, string>, key: string) => {
  const index = mapping[key];
  return index === '' || index == null ? '' : clean(row[Number(index)]);
};

function buildPayload(
  row: string[],
  destination: Destination,
  mapping: Record<string, string>,
  organizationId: string,
  fileName: string,
  sheetName: string,
  rowNumber: number
) {
  const definitions = definitionsFor(destination);
  const values: Record<string, any> = {};
  definitions.forEach(field => {
    const raw = valueAt(row, mapping, field.key);
    if (!raw) return;
    if (numericCatalogFields.has(field.key)) values[field.key] = parseNumber(raw);
    else if (digitFields.has(field.key)) values[field.key] = digits(raw);
    else values[field.key] = raw;
  });

  const metadata: Record<string, any> = {
    import_source: 'spreadsheet',
    import_file: fileName,
    import_sheet: sheetName,
    import_row: rowNumber,
    imported_at: new Date().toISOString(),
  };

  if (destination === 'Produtos' || destination === 'Serviços') {
    if (!clean(values.name)) return null;
    if (values.unit) values.unit = clean(values.unit).toUpperCase();
    if (values.product_origin) values.product_origin = digits(values.product_origin).slice(0, 1);
    return {
      ...values,
      organization_id: organizationId,
      item_type: destination === 'Produtos' ? 'product' : 'service',
      status: 'active',
      metadata,
    };
  }

  if (!clean(values.legal_name)) return null;
  const taxId = digits(values.tax_id);
  if (taxId) values.tax_id = taxId;
  const resolvedPersonType = personType(values.person_type, taxId);
  if (resolvedPersonType) values.person_type = resolvedPersonType;
  else delete values.person_type;
  if (values.state) values.state = clean(values.state).toUpperCase().slice(0, 2);
  if (values.vehicle_state) values.vehicle_state = clean(values.vehicle_state).toUpperCase().slice(0, 2);
  if (values.vehicle_plate) values.vehicle_plate = clean(values.vehicle_plate).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);

  if (resolvedPersonType === 'individual' && values.state_registration) {
    metadata.rg = values.state_registration;
    delete values.state_registration;
  }

  return {
    ...values,
    organization_id: organizationId,
    party_type: PARTY_TYPE[destination as keyof typeof PARTY_TYPE],
    status: 'active',
    final_consumer: destination === 'Clientes',
    metadata,
  };
}

export default function SaasRegistryImport({ organizationId, defaultDestination, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [destination, setDestination] = useState<Destination>(defaultDestination);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedSheet | null>(null);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [summary, setSummary] = useState<ImportSummary | null>(null);

  const definitions = useMemo(() => definitionsFor(destination), [destination]);
  const mappedRequired = definitions.filter(field => field.required).every(field => mapping[field.key] !== '' && mapping[field.key] != null);

  const preview = useMemo(() => {
    if (!parsed || !organizationId) return [];
    return parsed.rows.slice(0, 5).map((row, index) =>
      buildPayload(row, destination, mapping, organizationId, parsed.fileName, parsed.sheetName, parsed.headerRow + index + 2)
    );
  }, [parsed, destination, mapping, organizationId]);

  const resetFile = () => {
    setFile(null);
    setParsed(null);
    setMapping({});
    setError('');
    setSummary(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  const close = () => {
    setOpen(false);
    resetFile();
    setDestination(defaultDestination);
  };

  useEffect(() => {
    if (!open) return;
    setDestination(defaultDestination);
  }, [defaultDestination, open]);

  useEffect(() => {
    if (!file) return;
    let cancelled = false;
    setBusy(true);
    setError('');
    setSummary(null);
    parseSpreadsheet(file, destination)
      .then(result => {
        if (cancelled) return;
        setParsed(result);
        setMapping(autoMapping(result, destination));
      })
      .catch((err: any) => {
        if (!cancelled) {
          setParsed(null);
          setMapping({});
          setError(err?.message || 'Não foi possível ler esta planilha.');
        }
      })
      .finally(() => !cancelled && setBusy(false));
    return () => {
      cancelled = true;
    };
  }, [file, destination]);

  const selectFile = (next: File | null) => {
    if (!next) return;
    const extension = next.name.split('.').pop()?.toLowerCase();
    if (!['xls', 'xlsx', 'csv'].includes(extension || '')) {
      setError('Use uma planilha .xls, .xlsx ou .csv.');
      return;
    }
    setFile(next);
  };

  const drop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    selectFile(event.dataTransfer.files?.[0] || null);
  };

  const doImport = async () => {
    if (!organizationId || !parsed || !mappedRequired) return;
    setBusy(true);
    setError('');
    setSummary(null);
    try {
      const built = parsed.rows.map((row, index) =>
        buildPayload(row, destination, mapping, organizationId, parsed.fileName, parsed.sheetName, parsed.headerRow + index + 2)
      );
      const valid = built.filter(Boolean) as any[];
      const invalid = built.length - valid.length;
      const isCatalog = destination === 'Produtos' || destination === 'Serviços';
      const table = isCatalog ? 'saas_fiscal_catalog_items' : 'saas_fiscal_parties';
      let existingQuery = (supabase as any).from(table).select(isCatalog ? 'code,name,gtin' : 'tax_id,legal_name').eq('organization_id', organizationId);
      existingQuery = isCatalog
        ? existingQuery.eq('item_type', destination === 'Produtos' ? 'product' : 'service')
        : existingQuery.eq('party_type', PARTY_TYPE[destination as keyof typeof PARTY_TYPE]);
      const { data: existing, error: existingError } = await existingQuery;
      if (existingError) throw existingError;

      const existingKeys = new Set<string>();
      (existing || []).forEach((row: any) => {
        if (isCatalog) {
          if (clean(row.code)) existingKeys.add(`code:${normalize(row.code)}`);
          if (clean(row.gtin)) existingKeys.add(`gtin:${digits(row.gtin)}`);
          if (clean(row.name)) existingKeys.add(`name:${normalize(row.name)}`);
        } else {
          if (digits(row.tax_id)) existingKeys.add(`tax:${digits(row.tax_id)}`);
          else if (clean(row.legal_name)) existingKeys.add(`name:${normalize(row.legal_name)}`);
        }
      });

      let duplicates = 0;
      const unique: any[] = [];
      valid.forEach(row => {
        const keys = isCatalog
          ? [
              clean(row.code) ? `code:${normalize(row.code)}` : '',
              clean(row.gtin) ? `gtin:${digits(row.gtin)}` : '',
              clean(row.name) ? `name:${normalize(row.name)}` : '',
            ].filter(Boolean)
          : [
              digits(row.tax_id) ? `tax:${digits(row.tax_id)}` : '',
              !digits(row.tax_id) && clean(row.legal_name) ? `name:${normalize(row.legal_name)}` : '',
            ].filter(Boolean);
        if (keys.some(key => existingKeys.has(key))) {
          duplicates += 1;
          return;
        }
        keys.forEach(key => existingKeys.add(key));
        unique.push(row);
      });

      for (let index = 0; index < unique.length; index += 100) {
        const chunk = unique.slice(index, index + 100);
        const { error: insertError } = await (supabase as any).from(table).insert(chunk);
        if (insertError) throw insertError;
      }

      setSummary({ inserted: unique.length, duplicates, invalid });
      onImported?.();
    } catch (err: any) {
      setError(err?.message || 'Não foi possível concluir a importação.');
    } finally {
      setBusy(false);
    }
  };

  const previewKeys = destination === 'Produtos'
    ? ['name', 'code', 'ncm', 'sale_price']
    : destination === 'Serviços'
      ? ['name', 'code', 'service_code_national', 'sale_price']
      : ['legal_name', 'tax_id', 'city', 'state'];
  const previewLabels: Record<string, string> = {
    legal_name: 'Nome / Razão social', tax_id: 'CPF/CNPJ', city: 'Cidade', state: 'UF',
    name: 'Nome', code: 'Código', ncm: 'NCM', service_code_national: 'Cód. nacional', sale_price: 'Valor',
  };

  return (
    <>
      <Button type="button" variant="outline" className="saas-action-secondary" onClick={() => setOpen(true)}>
        <Upload className="mr-2 h-4 w-4" />
        Importar
      </Button>

      {open && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-[#07111f]/35 p-3 backdrop-blur-[1px]" onMouseDown={event => event.target === event.currentTarget && close()}>
          <div className="max-h-[94vh] w-full max-w-[1040px] overflow-hidden rounded-[10px] border border-[#cfd6df] bg-[#f5f7f9] shadow-[0_24px_70px_rgba(15,23,42,.24)]">
            <header className="flex items-start justify-between gap-4 border-b border-[#d7dde5] bg-white px-5 py-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#748094]">Cadastros</p>
                <h2 className="mt-1 text-[18px] font-semibold text-[#17233b]">Importar planilha</h2>
                <p className="mt-1 text-xs text-[#667085]">Escolha primeiro onde os registros serão salvos. O sistema não decide o destino sozinho.</p>
              </div>
              <button type="button" onClick={close} className="grid h-8 w-8 place-items-center rounded-md text-[#667085] hover:bg-[#eef1f4]" aria-label="Fechar">
                <X className="h-4 w-4" />
              </button>
            </header>

            <div className="max-h-[calc(94vh-72px)] overflow-y-auto p-4 sm:p-5">
              <div className="grid gap-4 md:grid-cols-[280px_1fr]">
                <section className="rounded-[8px] border border-[#d7dde5] bg-white p-4">
                  <label className="block">
                    <span className="text-[11px] font-semibold text-[#344054]">Destino da importação</span>
                    <select
                      value={destination}
                      onChange={event => {
                        setDestination(event.target.value as Destination);
                        setSummary(null);
                      }}
                      className="mt-1.5 h-10 w-full rounded-[6px] border border-[#cfd6df] bg-white px-3 text-[13px] text-[#17233b]"
                    >
                      {DESTINATIONS.map(item => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                  <p className="mt-2 text-[11px] leading-5 text-[#7a8698]">
                    Empresas e contatos da planilha devem ser classificados como Cliente, Fornecedor ou Transportadora conforme o uso no SaaS.
                  </p>
                  <div className="my-4 border-t border-[#edf0f3]" />
                  <div className="text-[11px] leading-5 text-[#667085]">
                    <b className="block text-[#344054]">Formatos aceitos</b>
                    Excel 97–2003 (.xls), Excel (.xlsx) e CSV.
                  </div>
                </section>

                <section className="rounded-[8px] border border-[#d7dde5] bg-white p-4">
                  <input
                    ref={inputRef}
                    type="file"
                    accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                    className="hidden"
                    onChange={event => selectFile(event.target.files?.[0] || null)}
                  />
                  <div
                    onDragOver={event => event.preventDefault()}
                    onDrop={drop}
                    onClick={() => !busy && inputRef.current?.click()}
                    className="cursor-pointer rounded-[7px] border border-dashed border-[#b9c3cf] bg-[#f8fafb] px-5 py-8 text-center hover:bg-[#f3f6f8]"
                  >
                    <FileSpreadsheet className="mx-auto h-7 w-7 text-[#667085]" />
                    <p className="mt-3 text-sm font-semibold text-[#344054]">{file?.name || 'Selecionar uma planilha'}</p>
                    <p className="mt-1 text-[11px] text-[#7a8698]">Arraste o arquivo aqui ou clique para procurar</p>
                  </div>
                  {parsed && (
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-[11px] text-[#667085]">
                      <span><b className="text-[#344054]">Aba:</b> {parsed.sheetName}</span>
                      <span><b className="text-[#344054]">Registros encontrados:</b> {parsed.rows.length}</span>
                    </div>
                  )}
                </section>
              </div>

              {error && (
                <div className="mt-4 flex gap-3 rounded-[7px] border border-[#efc9c4] bg-[#fff7f6] px-4 py-3 text-xs text-[#9b2c24]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {parsed && (
                <>
                  <section className="mt-4 rounded-[8px] border border-[#d7dde5] bg-white p-4">
                    <div className="mb-4">
                      <h3 className="text-sm font-semibold text-[#17233b]">Mapeamento das colunas</h3>
                      <p className="mt-1 text-[11px] text-[#7a8698]">As colunas conhecidas são identificadas automaticamente. Revise antes de importar.</p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {definitions.map(field => (
                        <label key={field.key} className="block">
                          <span className="text-[10px] font-semibold text-[#536077]">{field.label}{field.required ? ' *' : ''}</span>
                          <select
                            value={mapping[field.key] ?? ''}
                            onChange={event => setMapping(previous => ({ ...previous, [field.key]: event.target.value }))}
                            className="mt-1 h-9 w-full rounded-[5px] border border-[#d1d8e1] bg-white px-2 text-[11px] text-[#344054]"
                          >
                            <option value="">Não importar</option>
                            {parsed.columns.map(column => <option key={column.index} value={column.index}>{column.label}</option>)}
                          </select>
                        </label>
                      ))}
                    </div>
                  </section>

                  <section className="mt-4 overflow-hidden rounded-[8px] border border-[#d7dde5] bg-white">
                    <div className="border-b border-[#e2e7ed] px-4 py-3">
                      <h3 className="text-sm font-semibold text-[#17233b]">Prévia</h3>
                      <p className="mt-1 text-[11px] text-[#7a8698]">Até 5 registros, já com o mapeamento escolhido.</p>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[660px] text-left text-[11px]">
                        <thead className="bg-[#f7f8fa] text-[#667085]">
                          <tr>{previewKeys.map(key => <th key={key} className="px-4 py-2.5 font-semibold">{previewLabels[key]}</th>)}</tr>
                        </thead>
                        <tbody className="divide-y divide-[#edf0f3]">
                          {preview.map((row: any, index) => (
                            <tr key={index}>
                              {previewKeys.map(key => <td key={key} className="max-w-[260px] truncate px-4 py-2.5 text-[#344054]">{row?.[key] ?? '—'}</td>)}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  <div className="mt-4 rounded-[7px] border border-[#d7dde5] bg-[#f8fafb] px-4 py-3 text-[11px] leading-5 text-[#667085]">
                    Registros já existentes são ignorados para evitar duplicidade. Para cadastros vindos de planilhas sem todos os dados fiscais, o registro é importado e poderá ser complementado antes da emissão.
                  </div>
                </>
              )}

              {summary && (
                <div className="mt-4 flex gap-3 rounded-[7px] border border-[#bfe1d3] bg-[#f3fbf7] px-4 py-3 text-xs text-[#216e52]">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span><b>{summary.inserted}</b> importado(s) · <b>{summary.duplicates}</b> duplicado(s) ignorado(s) · <b>{summary.invalid}</b> linha(s) sem o campo principal ignorada(s).</span>
                </div>
              )}

              <footer className="mt-5 flex flex-wrap justify-end gap-2 border-t border-[#d7dde5] pt-4">
                <Button type="button" variant="outline" className="saas-action-secondary" onClick={close}>Fechar</Button>
                {file && <Button type="button" variant="outline" className="saas-action-secondary" onClick={resetFile} disabled={busy}>Trocar arquivo</Button>}
                <Button type="button" className="saas-action-primary" onClick={() => void doImport()} disabled={busy || !parsed || !mappedRequired || !organizationId}>
                  {busy ? 'Processando...' : `Importar para ${destination}`}
                </Button>
              </footer>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
