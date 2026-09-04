import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { ChevronRight, FileText, Package2, ReceiptText, Truck, UsersRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import SaasDanfePreview, { printDanfe } from './SaasDanfePreview';

const docs = ['NF-e', 'NFC-e', 'NFS-e', 'CT-e', 'MDF-e'];
const money = (v: any) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const digits = (v: any) => String(v ?? '').replace(/\D/g, '');
const fieldClass =
  'h-10 !rounded-[4px] !border-[#b9c2ce] !bg-white !px-3 !text-[13px] !text-[#344054] focus:!border-[#1496d4] focus:!ring-2 focus:!ring-[#1496d4]/10';
function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  wide = false,
  required = false,
  hint,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  wide?: boolean;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className={wide ? 'md:col-span-2' : ''}>
      <span className="ca-label">
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <Input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={fieldClass}
      />
      {hint && <small className="ca-field-hint">{hint}</small>}
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  children,
  required = false,
  hint,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  children: any;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label>
      <span className="ca-label">
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} className="ca-select">
        {children}
      </select>
      {hint && <small className="ca-field-hint">{hint}</small>}
    </label>
  );
}
function CatalogPicker({
  label,
  value,
  onChange,
  items,
  kind,
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  items: any[];
  kind: 'product' | 'service';
  required?: boolean;
}) {
  const [open, setOpen] = useState(false),
    [q, setQ] = useState('');
  const chosen = items.find(x => x.id === value);
  const filtered = items
    .filter(x =>
      String(`${x.name || ''} ${x.code || ''} ${x.ncm || ''} ${x.service_code_national || ''}`)
        .toLowerCase()
        .includes(q.toLowerCase())
    )
    .slice(0, 15);
  return (
    <div className="relative">
      <span className="ca-label">
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <button type="button" className="ca-picker" onClick={() => setOpen(v => !v)}>
        <span>
          <strong>
            {chosen?.name || `Selecionar ${kind === 'product' ? 'produto' : 'serviço'}`}
          </strong>
          <small>
            {chosen
              ? [
                  chosen.code,
                  kind === 'product' && chosen.ncm ? `NCM ${chosen.ncm}` : null,
                  kind === 'service' && chosen.service_code_national
                    ? `Cód. ${chosen.service_code_national}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' · ')
              : 'Pesquise no seu cadastro'}
          </small>
        </span>
        <b>{chosen?.sale_price != null ? money(chosen.sale_price) : ''}</b>
      </button>
      {open && (
        <div className="ca-picker-pop">
          <div className="p-3">
            <Input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Buscar..."
              className={fieldClass}
            />
          </div>
          <div className="max-h-72 overflow-auto">
            {filtered.length ? (
              filtered.map(x => (
                <button
                  key={x.id}
                  type="button"
                  className="ca-picker-row"
                  onClick={() => {
                    onChange(x.id);
                    setOpen(false);
                    setQ('');
                  }}
                >
                  <span>
                    <strong>{x.name}</strong>
                    <small>
                      {[
                        x.code,
                        kind === 'product' && x.ncm ? `NCM ${x.ncm}` : null,
                        kind === 'service' && x.service_code_national
                          ? `Cód. ${x.service_code_national}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </small>
                  </span>
                  <b>{x.sale_price != null ? money(x.sale_price) : '—'}</b>
                </button>
              ))
            ) : (
              <p className="p-5 text-center text-xs text-slate-500">Nenhum cadastro encontrado.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
function Section({
  title,
  subtitle,
  children,
  tone = 'blue',
}: {
  title: string;
  subtitle?: string;
  children: any;
  tone?: 'blue' | 'green' | 'purple' | 'orange';
}) {
  return (
    <section className={`ca-form-section ca-tone-${tone}`}>
      <div className="ca-section-head">
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="ca-section-body">{children}</div>
    </section>
  );
}
function TabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: string[];
  active: string;
  onChange: (v: string) => void;
}) {
  const current = tabs.indexOf(active);
  return (
    <div className="ca-tabs-wrap">
      <div className="ca-progress-copy">
        <span>
          Etapa {current + 1} de {tabs.length}
        </span>
        <b>{Math.round(((current + 1) / tabs.length) * 100)}% concluído</b>
      </div>
      <div className="ca-progress-track" aria-hidden="true">
        <i style={{ width: `${((current + 1) / tabs.length) * 100}%` }} />
      </div>
      <div className="ca-tabs" aria-label="Etapas da emissão">
        {tabs.map((t, i) => (
          <button
            type="button"
            key={t}
            onClick={() => i <= current && onChange(t)}
            disabled={i > current}
            className={`${active === t ? 'is-active' : ''} ${i < current ? 'is-complete' : ''}`}
            aria-current={active === t ? 'step' : undefined}
          >
            <span>{i < current ? '✓' : i + 1}</span>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SaasEmission({
  organizationId,
  documentType,
  onChoose,
}: {
  organizationId: string | null;
  documentType: string | null;
  onChoose: (d: string | null) => void;
}) {
  const [profile, setProfile] = useState<any>(null),
    [customers, setCustomers] = useState<any[]>([]),
    [products, setProducts] = useState<any[]>([]),
    [services, setServices] = useState<any[]>([]),
    [carriers, setCarriers] = useState<any[]>([]),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState(''),
    [stepAlert, setStepAlert] = useState(''),
    [result, setResult] = useState<any>(null),
    [tab, setTab] = useState('');
  const [form, setForm] = useState<any>({
    customerId: '',
    productId: '',
    serviceId: '',
    quantity: '1',
    unitPrice: '',
    series: '1',
    number: '1',
    payment: '01',
    cfop: '',
    description: '',
    value: '',
    serviceCode: '',
    municipioPrestacao: '',
    remetenteId: '',
    destinatarioId: '',
    carrierId: '',
    rntrc: '',
    chNFe: '',
    cfopCte: '5353',
    vTPrest: '',
    vCarga: '',
    qCarga: '1',
    munIniCodigo: '',
    munIniNome: '',
    ufIni: 'AL',
    munFimCodigo: '',
    munFimNome: '',
    ufFim: 'AL',
    plate: '',
    driverName: '',
    driverCpf: '',
    tara: '1000',
    capacity: '5000',
    unloadCode: '',
    unloadName: '',
    cargoValue: '',
    cargoWeight: '',
    keys: '',
  });
  const set = (k: string, v: any) => {
    const digitLimits: Record<string, number> = {
      driverCpf: 11,
      chNFe: 44,
      municipioPrestacao: 7,
      munIniCodigo: 7,
      munFimCodigo: 7,
      unloadCode: 7,
    };
    if (digitLimits[k]) v = digits(v).slice(0, digitLimits[k]);
    if (['ufIni', 'ufFim'].includes(k))
      v = String(v)
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 2);
    if (k === 'plate')
      v = String(v)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 7);
    setStepAlert('');
    setResult(null);
    setForm((p: any) => ({ ...p, [k]: v }));
  };
  const load = async () => {
    if (!organizationId) return;
    const [p, c, pr, s, ca] = await Promise.all([
      (supabase as any)
        .from('saas_company_fiscal_profiles')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at')
        .limit(1)
        .maybeSingle(),
      (supabase as any)
        .from('saas_fiscal_parties')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('party_type', 'customer')
        .eq('status', 'active')
        .order('legal_name'),
      (supabase as any)
        .from('saas_fiscal_catalog_items')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('item_type', 'product')
        .eq('status', 'active')
        .order('name'),
      (supabase as any)
        .from('saas_fiscal_catalog_items')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('item_type', 'service')
        .eq('status', 'active')
        .order('name'),
      (supabase as any)
        .from('saas_fiscal_parties')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('party_type', 'carrier')
        .eq('status', 'active')
        .order('legal_name'),
    ]);
    let loadedProfile = p.data;
    if (loadedProfile?.logo_path) {
      const { data: signed } = await supabase.storage
        .from('saas-private')
        .createSignedUrl(loadedProfile.logo_path, 3600);
      loadedProfile = { ...loadedProfile, logo_url: signed?.signedUrl || null };
    }
    setProfile(loadedProfile);
    setCustomers(c.data || []);
    setProducts(pr.data || []);
    setServices(s.data || []);
    setCarriers(ca.data || []);
    const pp = p.data;
    if (pp)
      setForm((f: any) => ({
        ...f,
        series:
          documentType === 'NF-e'
            ? pp.series_nfe || '1'
            : documentType === 'NFC-e'
            ? pp.series_nfce || '1'
            : documentType === 'NFS-e'
            ? pp.series_nfse || '1'
            : documentType === 'CT-e'
            ? pp.series_cte || '1'
            : pp.series_mdfe || '1',
        number: String(
          documentType === 'NF-e'
            ? pp.next_number_nfe || 1
            : documentType === 'NFC-e'
            ? pp.next_number_nfce || 1
            : documentType === 'NFS-e'
            ? pp.next_number_nfse || 1
            : documentType === 'CT-e'
            ? pp.next_number_cte || 1
            : pp.next_number_mdfe || 1
        ),
        cfop: pp.default_cfop_in_state || '5102',
        serviceCode: pp.default_nfse_service_code || '',
        municipioPrestacao: pp.city_ibge_code || '',
        munIniCodigo: f.munIniCodigo || pp.city_ibge_code || '',
        munIniNome: f.munIniNome || pp.city || '',
        ufIni: f.ufIni || pp.state || 'AL',
      }));
  };
  useEffect(() => {
    void load();
    setResult(null);
    setMsg('');
    setStepAlert('');
    setTab(
      documentType === 'NFS-e'
        ? 'Pessoas'
        : documentType === 'CT-e'
        ? 'Participantes'
        : documentType === 'MDF-e'
        ? 'Veículo'
        : 'Cliente'
    );
  }, [organizationId, documentType]);
  const customer = customers.find(x => x.id === form.customerId),
    product = products.find(x => x.id === form.productId),
    service = services.find(x => x.id === form.serviceId),
    rem = customers.find(x => x.id === form.remetenteId),
    dest = customers.find(x => x.id === form.destinatarioId),
    carrier = carriers.find(x => x.id === form.carrierId);
  useEffect(() => {
    if (product)
      setForm((f: any) => ({
        ...f,
        unitPrice: String(product.sale_price ?? ''),
        cfop: product.cfop_in_state || profile?.default_cfop_in_state || f.cfop,
      }));
  }, [form.productId]);
  useEffect(() => {
    if (service)
      setForm((f: any) => ({
        ...f,
        value: String(service.sale_price ?? ''),
        description: service.description || service.name,
        serviceCode:
          service.service_code_national || profile?.default_nfse_service_code || f.serviceCode,
      }));
  }, [form.serviceId]);
  useEffect(() => {
    if (carrier)
      setForm((current: any) => ({
        ...current,
        rntrc: carrier.rntrc || current.rntrc,
        plate: carrier.vehicle_plate || current.plate,
      }));
  }, [form.carrierId]);
  const environment = profile?.fiscal_environment === 'production' ? 'production' : 'homologation';
  const readEdgeError = async (e: any) => {
    try {
      const r = e?.context;
      if (r && typeof r.json === 'function') {
        const b = await r.clone().json();
        return [b?.error, ...(b?.errors || [])].filter(Boolean).join(' · ') || e?.message;
      }
    } catch {}
    return e?.message || 'Falha no processamento fiscal';
  };
  const invoke = async (name: string, body: any) => {
    setBusy(true);
    setMsg('');
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(name, {
        body: { ...body, organization_id: organizationId, expected_environment: environment },
      });
      if (error) throw error;
      if (data?.error) {
        setMsg([data.error, ...(data.errors || [])].join(' · '));
        setResult(data);
        return;
      }
      setResult(data);
      setMsg(
        body.action === 'preview'
          ? 'Prévia gerada e assinada para conferência.'
          : data?.authorized === false
          ? 'Documento rejeitado pelo autorizador.'
          : 'Processamento concluído.'
      );
      if (body.action === 'issue') await load();
    } catch (e: any) {
      setMsg(await readEdgeError(e));
    } finally {
      setBusy(false);
    }
  };
  const productPayload = () => ({
    environment,
    cnpjEmitente: profile?.tax_id,
    razaoSocial: profile?.legal_name,
    nomeFantasia: profile?.trade_name,
    ie: profile?.state_registration,
    crt: profile?.crt || '1',
    codigoMunicipio: profile?.city_ibge_code,
    nomeMunicipio: profile?.city,
    logradouro: profile?.street,
    numeroEndereco: profile?.street_number,
    complemento: profile?.complement,
    bairro: profile?.district,
    cep: profile?.postal_code,
    telefone: profile?.phone,
    serie: form.series,
    numeroNota: form.number,
    destDocumento: customer?.tax_id || '',
    destNome: customer?.legal_name || 'CONSUMIDOR',
    destLogradouro: customer?.street,
    destNumero: customer?.street_number,
    destBairro: customer?.district,
    destCodigoMunicipio: customer?.city_ibge_code,
    destMunicipio: customer?.city,
    destUF: customer?.state,
    destCep: customer?.postal_code,
    codigoProduto: product?.code || '1',
    produto: product?.name || 'PRODUTO',
    ncm: product?.ncm,
    cfop: form.cfop || product?.cfop_in_state,
    unidade: product?.unit || 'UN',
    quantidade: Number(form.quantity),
    valorUnitario: Number(form.unitPrice),
    origem: product?.product_origin || '0',
    csosn: product?.csosn || '400',
    cst: product?.icms_cst || '00',
    formaPagamento: form.payment,
  });
  const nfsePayload = () => ({
    environment,
    serie: form.series,
    numero: form.number,
    municipioEmissor: profile?.city_ibge_code,
    municipioPrestacao: form.municipioPrestacao,
    codigoTributacao: form.serviceCode,
    descricao: form.description,
    valor: Number(form.value),
    tomadorDocumento: customer?.tax_id,
    tomadorNome: customer?.legal_name,
    simples: profile?.tax_regime === 'simples' ? '1' : '2',
    issRetido: Boolean(service?.iss_withheld),
  });
  const partyCte = (x: any) => ({
    CNPJ: digits(x?.tax_id),
    IE: x?.state_registration || '',
    xNome: x?.legal_name || '',
    xLgr: x?.street || '',
    nro: x?.street_number || '',
    xBairro: x?.district || '',
    cMun: x?.city_ibge_code || '',
    xMun: x?.city || '',
    CEP: x?.postal_code || '',
    UF: x?.state || 'AL',
  });
  const ctePayload = () => ({
    environment,
    serie: form.series,
    numero: form.number,
    cfop: form.cfopCte,
    natOp: 'PRESTACAO DE SERVICO DE TRANSPORTE',
    cUF: '27',
    cMunIni: form.munIniCodigo,
    xMunIni: form.munIniNome,
    UFIni: form.ufIni,
    cMunFim: form.munFimCodigo,
    xMunFim: form.munFimNome,
    UFFim: form.ufFim,
    vTPrest: Number(form.vTPrest),
    vRec: Number(form.vTPrest),
    emit: {
      IE: profile?.state_registration,
      xNome: profile?.legal_name,
      xLgr: profile?.street,
      nro: profile?.street_number,
      xBairro: profile?.district,
      cMun: profile?.city_ibge_code,
      xMun: profile?.city,
      CEP: profile?.postal_code,
      UF: profile?.state || 'AL',
      CRT: profile?.crt || '1',
    },
    rem: partyCte(rem),
    dest: partyCte(dest),
    carga: { vCarga: Number(form.vCarga), proPred: 'CARGA GERAL', qCarga: Number(form.qCarga) },
    chNFe: form.chNFe,
    rodo: { RNTRC: form.rntrc || carrier?.rntrc },
  });
  const mdfePayload = () => ({
    environment,
    serie: form.series,
    numero: form.number,
    rntrc: form.rntrc || carrier?.rntrc,
    placa: form.plate || carrier?.vehicle_plate,
    veiculoUf: carrier?.vehicle_state || profile?.state || 'AL',
    condutorNome: form.driverName,
    condutorCpf: form.driverCpf,
    tara: Number(form.tara),
    capacidadeKg: Number(form.capacity),
    ufIni: form.ufIni,
    ufFim: form.ufFim,
    munCarregaCodigo: form.munIniCodigo,
    munCarregaNome: form.munIniNome,
    munDescargaCodigo: form.unloadCode,
    munDescargaNome: form.unloadName,
    valorCarga: Number(form.cargoValue),
    pesoCarga: Number(form.cargoWeight),
    chaves: String(form.keys || '')
      .split(/[\n,; ]+/)
      .filter(Boolean),
  });
  if (!documentType)
    return (
      <div className="ca-doc-home">
        <div className="ca-page-title">
          <p>Emissão fiscal</p>
          <h1>Nova nota fiscal</h1>
          <span>Escolha o tipo de documento para iniciar.</span>
        </div>
        <div className="ca-doc-grid">
          {docs.map((d, i) => (
            <button key={d} onClick={() => onChoose(d)} className={`ca-doc-choice tone-${i + 1}`}>
              <span className="ca-doc-icon">
                {d === 'NFS-e' ? (
                  <ReceiptText />
                ) : d === 'CT-e' || d === 'MDF-e' ? (
                  <Truck />
                ) : (
                  <FileText />
                )}
              </span>
              <strong>{d}</strong>
              <small>
                {d === 'NFS-e'
                  ? 'Nota fiscal de serviço'
                  : d === 'NFC-e'
                  ? 'Nota fiscal de consumidor'
                  : d === 'CT-e'
                  ? 'Conhecimento de transporte'
                  : d === 'MDF-e'
                  ? 'Manifesto eletrônico'
                  : 'Nota fiscal de produto'}
              </small>
              <ChevronRight />
            </button>
          ))}
        </div>
      </div>
    );
  const tabs =
    documentType === 'NFS-e'
      ? ['Pessoas', 'Serviço', 'Valores', 'Impostos', 'Revisão']
      : documentType === 'CT-e'
      ? ['Participantes', 'Carga', 'Rota', 'Fiscal', 'Revisão']
      : documentType === 'MDF-e'
      ? ['Veículo', 'Condutor', 'Rota e carga', 'Documentos', 'Revisão']
      : ['Cliente', 'Produtos', 'Pagamento', 'Fiscal', 'Revisão'];
  const step = tabs.indexOf(tab),
    last = step === tabs.length - 1;
  const go = (delta: number) => setTab(tabs[Math.max(0, Math.min(tabs.length - 1, step + delta))]);
  const issuesForStep = (index: number) => {
    const issues: string[] = [];
    const need = (ok: any, label: string) => {
      if (!ok) issues.push(label);
    };
    if (documentType === 'NF-e' || documentType === 'NFC-e') {
      if (index === 0 && documentType === 'NF-e') need(customer, 'cliente');
      if (index === 1) {
        need(product, 'produto');
        need(Number(form.quantity) > 0, 'quantidade');
        need(Number(form.unitPrice) > 0, 'valor unitário');
        need(digits(product?.ncm).length === 8, 'NCM do produto');
      }
      if (index === 2) need(form.payment, 'forma de pagamento');
      if (index === 3) {
        need(digits(form.cfop).length === 4, 'CFOP com 4 dígitos');
        need(String(form.series).trim(), 'série');
        need(Number(form.number) > 0, 'número da nota');
      }
    }
    if (documentType === 'NFS-e') {
      if (index === 0) {
        need(customer, 'cliente / tomador');
        need(digits(form.municipioPrestacao).length === 7, 'município da prestação (IBGE)');
      }
      if (index === 1) {
        need(service, 'serviço');
        need(String(form.serviceCode).trim(), 'código de tributação');
        need(String(form.description).trim(), 'descrição do serviço');
      }
      if (index === 2) need(Number(form.value) > 0, 'valor do serviço');
      if (index === 3) {
        need(String(form.series).trim(), 'série DPS');
        need(Number(form.number) > 0, 'número DPS');
      }
    }
    if (documentType === 'CT-e') {
      if (index === 0) {
        need(rem, 'remetente');
        need(dest, 'destinatário');
        need(String(form.rntrc || carrier?.rntrc).trim(), 'RNTRC');
      }
      if (index === 1) {
        need(Number(form.vTPrest) > 0, 'valor da prestação');
        need(Number(form.vCarga) > 0, 'valor da carga');
        need(Number(form.qCarga) > 0, 'peso / quantidade');
        need(digits(form.chNFe).length === 44, 'chave NF-e com 44 dígitos');
      }
      if (index === 2) {
        need(digits(form.munIniCodigo).length === 7, 'código IBGE da origem');
        need(String(form.munIniNome).trim(), 'município de origem');
        need(String(form.ufIni).trim().length === 2, 'UF de origem');
        need(digits(form.munFimCodigo).length === 7, 'código IBGE do destino');
        need(String(form.munFimNome).trim(), 'município de destino');
        need(String(form.ufFim).trim().length === 2, 'UF de destino');
      }
      if (index === 3) {
        need(digits(form.cfopCte).length === 4, 'CFOP com 4 dígitos');
        need(String(form.series).trim(), 'série');
        need(Number(form.number) > 0, 'número do CT-e');
      }
    }
    if (documentType === 'MDF-e') {
      if (index === 0) {
        need(String(form.rntrc || carrier?.rntrc).trim(), 'RNTRC');
        need(
          String(form.plate || carrier?.vehicle_plate || '').replace(/[^A-Z0-9]/gi, '').length ===
            7,
          'placa do veículo'
        );
        need(Number(form.tara) > 0, 'tara');
        need(Number(form.capacity) > 0, 'capacidade');
      }
      if (index === 1) {
        need(String(form.driverName).trim(), 'nome do condutor');
        need(digits(form.driverCpf).length === 11, 'CPF do condutor');
      }
      if (index === 2) {
        need(digits(form.munIniCodigo).length === 7, 'código IBGE do carregamento');
        need(String(form.munIniNome).trim(), 'município de carregamento');
        need(digits(form.unloadCode).length === 7, 'código IBGE do descarregamento');
        need(String(form.unloadName).trim(), 'município de descarregamento');
        need(String(form.ufFim).trim().length === 2, 'UF final');
        need(Number(form.cargoValue) > 0, 'valor da carga');
        need(Number(form.cargoWeight) > 0, 'peso da carga');
      }
      if (index === 3) {
        const keys = String(form.keys || '')
          .split(/[\n,; ]+/)
          .filter(Boolean);
        need(
          keys.length > 0 && keys.every((key: string) => digits(key).length === 44),
          'chaves fiscais com 44 dígitos'
        );
        need(String(form.series).trim(), 'série');
        need(Number(form.number) > 0, 'número do MDF-e');
      }
    }
    return issues;
  };
  const advance = () => {
    const issues = issuesForStep(step);
    if (issues.length) {
      setStepAlert(`Complete ${issues.join(', ')} para continuar.`);
      return;
    }
    setStepAlert('');
    go(1);
  };
  const allIssues = tabs.slice(0, -1).flatMap((_, index) => issuesForStep(index));
  const actions = (name: string, payload: any, extra: any = {}) => (
    <div className="ca-final-actions">
      <Button
        variant="outline"
        className="ca-btn-secondary"
        disabled={busy || allIssues.length > 0}
        onClick={() => invoke(name, { action: 'preview', data: payload, ...extra })}
      >
        Gerar prévia
      </Button>
      <Button
        disabled={busy || allIssues.length > 0}
        onClick={() => invoke(name, { action: 'issue', data: payload, ...extra })}
        className="ca-btn-primary"
      >
        {busy
          ? 'Processando...'
          : environment === 'production'
          ? 'Emitir documento'
          : 'Transmitir para homologação'}
      </Button>
    </div>
  );
  const productTotal = Number(form.quantity || 0) * Number(form.unitPrice || 0);
  let content: ReactNode = null;
  if (documentType === 'NF-e' || documentType === 'NFC-e')
    content =
      step === 0 ? (
        <Section title="Cliente" subtitle="Selecione o destinatário desta operação.">
          <div className="ca-form-grid">
            <Select
              label="Cliente"
              value={form.customerId}
              onChange={v => set('customerId', v)}
              required={documentType === 'NF-e'}
              hint={
                documentType === 'NFC-e'
                  ? 'Opcional quando o consumidor não for identificado.'
                  : 'Os dados fiscais serão carregados do cadastro.'
              }
            >
              <option value="">
                {documentType === 'NFC-e' ? 'Consumidor não identificado' : 'Selecione um cliente'}
              </option>
              {customers.map(x => (
                <option key={x.id} value={x.id}>
                  {x.legal_name}
                </option>
              ))}
            </Select>
            <div className="ca-info-box">
              <UsersRound />
              <span>
                <b>{customer?.legal_name || 'Nenhum cliente selecionado'}</b>
                <small>{customer?.tax_id || 'CPF/CNPJ será preenchido pelo cadastro'}</small>
              </span>
            </div>
          </div>
        </Section>
      ) : step === 1 ? (
        <Section title="Produtos" subtitle="Escolha o item e informe a quantidade.">
          <div className="ca-form-grid">
            <CatalogPicker
              label="Produto"
              value={form.productId}
              onChange={v => set('productId', v)}
              items={products}
              kind="product"
              required
            />
            <div className="ca-item-row">
              <Field
                label="Quantidade"
                value={form.quantity}
                onChange={v => set('quantity', v)}
                type="number"
                required
              />
              <Field
                label="Valor unitário"
                value={form.unitPrice}
                onChange={v => set('unitPrice', v)}
                type="number"
                required
              />
              <div>
                <span className="ca-label">Total</span>
                <div className="ca-total-box">{money(productTotal)}</div>
              </div>
            </div>
          </div>
        </Section>
      ) : step === 2 ? (
        <Section title="Pagamento" subtitle="Defina como a operação será recebida.">
          <div className="ca-form-grid">
            <Select
              label="Forma de pagamento"
              value={form.payment}
              onChange={v => set('payment', v)}
              required
            >
              <option value="01">Dinheiro</option>
              <option value="03">Cartão de crédito</option>
              <option value="04">Cartão de débito</option>
              <option value="17">PIX</option>
              <option value="99">Outros</option>
            </Select>
            <div className="ca-info-box">
              <Package2 />
              <span>
                <b>Total da nota</b>
                <small>{money(productTotal)}</small>
              </span>
            </div>
          </div>
        </Section>
      ) : step === 3 ? (
        <Section
          title="Informações fiscais"
          subtitle="Revise a numeração e a natureza fiscal da operação."
        >
          <div className="ca-form-grid">
            <Field
              label="CFOP"
              value={form.cfop}
              onChange={v => set('cfop', v)}
              required
              hint="Código fiscal da operação com 4 dígitos."
            />
            <Field label="Série" value={form.series} onChange={v => set('series', v)} required />
            <Field
              label="Número"
              value={form.number}
              onChange={v => set('number', v)}
              type="number"
              required
            />
          </div>
        </Section>
      ) : null;
  if (documentType === 'NFS-e')
    content =
      step === 0 ? (
        <Section title="Pessoas" subtitle="Informe o tomador e o local da prestação.">
          <div className="ca-form-grid">
            <Select
              label="Cliente / tomador"
              value={form.customerId}
              onChange={v => set('customerId', v)}
              required
            >
              <option value="">Selecione um cliente</option>
              {customers.map(x => (
                <option key={x.id} value={x.id}>
                  {x.legal_name}
                </option>
              ))}
            </Select>
            <div className="ca-info-box">
              <UsersRound />
              <span>
                <b>{customer?.legal_name || 'Tomador não selecionado'}</b>
                <small>{customer?.tax_id || 'Os dados virão do cadastro'}</small>
              </span>
            </div>
            <Field
              label="Município da prestação (IBGE)"
              value={form.municipioPrestacao}
              onChange={v => set('municipioPrestacao', v)}
              required
              hint="Código IBGE de 7 dígitos."
            />
          </div>
        </Section>
      ) : step === 1 ? (
        <Section title="Serviço" subtitle="Selecione o serviço e confira sua classificação.">
          <div className="ca-form-grid">
            <CatalogPicker
              label="Serviço"
              value={form.serviceId}
              onChange={v => set('serviceId', v)}
              items={services}
              kind="service"
              required
            />
            <Field
              label="Código de Tributação Nacional"
              value={form.serviceCode}
              onChange={v => set('serviceCode', v)}
              required
            />
            <Field
              label="Descrição do serviço"
              value={form.description}
              onChange={v => set('description', v)}
              wide
              required
            />
          </div>
        </Section>
      ) : step === 2 ? (
        <Section title="Valores" subtitle="Informe o valor da prestação.">
          <div className="ca-form-grid">
            <Field
              label="Valor do serviço"
              value={form.value}
              onChange={v => set('value', v)}
              type="number"
              required
            />
            <div className="ca-info-box">
              <ReceiptText />
              <span>
                <b>Valor líquido estimado</b>
                <small>{money(form.value)}</small>
              </span>
            </div>
          </div>
        </Section>
      ) : step === 3 ? (
        <Section title="Impostos e DPS" subtitle="Confira retenções, série e número da declaração.">
          <div className="ca-form-grid">
            <div className="ca-info-box">
              <ReceiptText />
              <span>
                <b>ISSQN</b>
                <small>{service?.iss_withheld ? 'Retido pelo tomador' : 'Não retido'}</small>
              </span>
            </div>
            <Field
              label="Série DPS"
              value={form.series}
              onChange={v => set('series', v)}
              required
            />
            <Field
              label="Número DPS"
              value={form.number}
              onChange={v => set('number', v)}
              type="number"
              required
            />
          </div>
        </Section>
      ) : null;
  if (documentType === 'CT-e')
    content =
      step === 0 ? (
        <Section title="Participantes" subtitle="Remetente, destinatário e transportadora.">
          <div className="ca-form-grid">
            <Select
              label="Remetente"
              value={form.remetenteId}
              onChange={v => set('remetenteId', v)}
              required
            >
              <option value="">Selecione</option>
              {customers.map(x => (
                <option key={x.id} value={x.id}>
                  {x.legal_name}
                </option>
              ))}
            </Select>
            <Select
              label="Destinatário"
              value={form.destinatarioId}
              onChange={v => set('destinatarioId', v)}
              required
            >
              <option value="">Selecione</option>
              {customers.map(x => (
                <option key={x.id} value={x.id}>
                  {x.legal_name}
                </option>
              ))}
            </Select>
            <Select
              label="Transportadora"
              value={form.carrierId}
              onChange={v => set('carrierId', v)}
            >
              <option value="">Própria / manual</option>
              {carriers.map(x => (
                <option key={x.id} value={x.id}>
                  {x.legal_name}
                </option>
              ))}
            </Select>
            <Field
              label="RNTRC"
              value={form.rntrc}
              onChange={v => set('rntrc', v)}
              required
              hint="Preenchido automaticamente ao selecionar uma transportadora cadastrada."
            />
          </div>
        </Section>
      ) : step === 1 ? (
        <Section title="Carga" subtitle="Valores, peso e documento vinculado.">
          <div className="ca-form-grid">
            <Field
              label="Valor da prestação"
              value={form.vTPrest}
              onChange={v => set('vTPrest', v)}
              type="number"
              required
            />
            <Field
              label="Valor da carga"
              value={form.vCarga}
              onChange={v => set('vCarga', v)}
              type="number"
              required
            />
            <Field
              label="Peso / quantidade"
              value={form.qCarga}
              onChange={v => set('qCarga', v)}
              type="number"
              required
            />
            <Field
              label="Chave NF-e vinculada"
              value={form.chNFe}
              onChange={v => set('chNFe', v)}
              required
              hint="Informe os 44 dígitos da chave, sem espaços."
            />
          </div>
        </Section>
      ) : step === 2 ? (
        <Section title="Rota" subtitle="Origem e destino da prestação.">
          <div className="ca-route">
            <div>
              <Field
                label="Município início (IBGE)"
                value={form.munIniCodigo}
                onChange={v => set('munIniCodigo', v)}
                required
              />
              <Field
                label="Município início"
                value={form.munIniNome}
                onChange={v => set('munIniNome', v)}
                required
              />
              <Field
                label="UF início"
                value={form.ufIni}
                onChange={v => set('ufIni', v)}
                required
              />
            </div>
            <ChevronRight />
            <div>
              <Field
                label="Município fim (IBGE)"
                value={form.munFimCodigo}
                onChange={v => set('munFimCodigo', v)}
                required
              />
              <Field
                label="Município fim"
                value={form.munFimNome}
                onChange={v => set('munFimNome', v)}
                required
              />
              <Field label="UF fim" value={form.ufFim} onChange={v => set('ufFim', v)} required />
            </div>
          </div>
        </Section>
      ) : step === 3 ? (
        <Section title="Fiscal" subtitle="Numeração e CFOP do conhecimento.">
          <div className="ca-form-grid">
            <Field label="CFOP" value={form.cfopCte} onChange={v => set('cfopCte', v)} required />
            <Field label="Série" value={form.series} onChange={v => set('series', v)} required />
            <Field
              label="Número"
              value={form.number}
              onChange={v => set('number', v)}
              type="number"
              required
            />
          </div>
        </Section>
      ) : null;
  if (documentType === 'MDF-e')
    content =
      step === 0 ? (
        <Section
          title="Veículo e transportadora"
          subtitle="Identifique o conjunto rodoviário principal."
        >
          <div className="ca-form-grid">
            <Select
              label="Transportadora"
              value={form.carrierId}
              onChange={v => set('carrierId', v)}
            >
              <option value="">Própria / manual</option>
              {carriers.map(x => (
                <option key={x.id} value={x.id}>
                  {x.legal_name}
                </option>
              ))}
            </Select>
            <Field label="RNTRC" value={form.rntrc} onChange={v => set('rntrc', v)} required />
            <Field
              label="Placa"
              value={form.plate}
              onChange={v => set('plate', v)}
              required
              hint="Aceita placa Mercosul ou padrão anterior."
            />
            <Field
              label="Tara (kg)"
              value={form.tara}
              onChange={v => set('tara', v)}
              type="number"
              required
            />
            <Field
              label="Capacidade (kg)"
              value={form.capacity}
              onChange={v => set('capacity', v)}
              type="number"
              required
            />
          </div>
        </Section>
      ) : step === 1 ? (
        <Section title="Condutor" subtitle="Informe o responsável pela condução.">
          <div className="ca-form-grid">
            <Field
              label="Nome do condutor"
              value={form.driverName}
              onChange={v => set('driverName', v)}
              required
            />
            <Field
              label="CPF do condutor"
              value={form.driverCpf}
              onChange={v => set('driverCpf', v)}
              required
            />
          </div>
        </Section>
      ) : step === 2 ? (
        <Section title="Rota e carga" subtitle="Defina carregamento, descarregamento e totais.">
          <div className="ca-form-grid">
            <Field
              label="Município carga (IBGE)"
              value={form.munIniCodigo}
              onChange={v => set('munIniCodigo', v)}
              required
            />
            <Field
              label="Município carga"
              value={form.munIniNome}
              onChange={v => set('munIniNome', v)}
              required
            />
            <Field
              label="Município descarga (IBGE)"
              value={form.unloadCode}
              onChange={v => set('unloadCode', v)}
              required
            />
            <Field
              label="Município descarga"
              value={form.unloadName}
              onChange={v => set('unloadName', v)}
              required
            />
            <Field label="UF final" value={form.ufFim} onChange={v => set('ufFim', v)} required />
            <Field
              label="Valor da carga"
              value={form.cargoValue}
              onChange={v => set('cargoValue', v)}
              type="number"
              required
            />
            <Field
              label="Peso da carga"
              value={form.cargoWeight}
              onChange={v => set('cargoWeight', v)}
              type="number"
              required
            />
          </div>
        </Section>
      ) : step === 3 ? (
        <Section title="Documentos fiscais" subtitle="Informe uma chave NF-e ou CT-e por linha.">
          <label className="ca-label" htmlFor="mdfe-keys">
            Chaves de acesso <b aria-hidden="true">*</b>
          </label>
          <textarea
            id="mdfe-keys"
            value={form.keys}
            onChange={e => set('keys', e.target.value)}
            rows={7}
            className="ca-textarea"
            placeholder="Uma chave de 44 dígitos por linha"
          />
          <div className="ca-form-grid mt-4">
            <Field label="Série" value={form.series} onChange={v => set('series', v)} required />
            <Field
              label="Número"
              value={form.number}
              onChange={v => set('number', v)}
              type="number"
              required
            />
          </div>
        </Section>
      ) : null;
  const finalActions =
    documentType === 'NFS-e'
      ? actions('saas-nfse-issue', nfsePayload())
      : documentType === 'CT-e'
      ? actions('saas-cte-issue', ctePayload())
      : documentType === 'MDF-e'
      ? actions('saas-mdfe-issue', mdfePayload())
      : actions('saas-dfe-issue', productPayload(), {
          model: documentType === 'NF-e' ? '55' : '65',
        });
  const reviewFacts: Array<[string, string]> =
    documentType === 'NF-e' || documentType === 'NFC-e'
      ? [
          [
            'Destinatário',
            customer?.legal_name ||
              (documentType === 'NFC-e' ? 'Consumidor não identificado' : '—'),
          ],
          ['Produto', product?.name || '—'],
          ['Quantidade', `${form.quantity || 0} ${product?.unit || 'UN'}`],
          ['Total', money(productTotal)],
          [
            'Pagamento',
            {
              '01': 'Dinheiro',
              '03': 'Cartão de crédito',
              '04': 'Cartão de débito',
              '17': 'PIX',
              '99': 'Outros',
            }[form.payment as string] || '—',
          ],
          ['Documento', `Série ${form.series} · nº ${form.number}`],
        ]
      : documentType === 'NFS-e'
      ? [
          ['Tomador', customer?.legal_name || '—'],
          ['Serviço', service?.name || '—'],
          ['Valor', money(form.value)],
          ['ISSQN', service?.iss_withheld ? 'Retido pelo tomador' : 'Não retido'],
          ['Município', form.municipioPrestacao || '—'],
          ['DPS', `Série ${form.series} · nº ${form.number}`],
        ]
      : documentType === 'CT-e'
      ? [
          ['Remetente', rem?.legal_name || '—'],
          ['Destinatário', dest?.legal_name || '—'],
          ['Transportadora', carrier?.legal_name || 'Transporte próprio'],
          ['Prestação', money(form.vTPrest)],
          ['Carga', `${money(form.vCarga)} · ${form.qCarga || 0} kg`],
          [
            'Rota',
            `${form.munIniNome || '—'}/${form.ufIni} → ${form.munFimNome || '—'}/${form.ufFim}`,
          ],
        ]
      : [
          ['Transportadora', carrier?.legal_name || 'Transporte próprio'],
          ['Veículo', form.plate || carrier?.vehicle_plate || '—'],
          ['Condutor', form.driverName || '—'],
          ['Carga', `${money(form.cargoValue)} · ${form.cargoWeight || 0} kg`],
          [
            'Rota',
            `${form.munIniNome || '—'}/${form.ufIni} → ${form.unloadName || '—'}/${form.ufFim}`,
          ],
          [
            'Documentos',
            `${
              String(form.keys || '')
                .split(/[\n,; ]+/)
                .filter(Boolean).length
            } chave(s)`,
          ],
        ];
  return (
    <div className="ca-emission-page">
      <header className="ca-emission-title">
        <button onClick={() => onChoose(null)}>← Voltar</button>
        <div>
          <p>Emissão fiscal</p>
          <h1>Emitir {documentType}</h1>
          <span>Uma etapa por vez. Os dados ficam preservados até a revisão.</span>
        </div>
        <div className={`ca-environment ${environment}`}>
          {environment === 'production' ? 'Produção' : 'Homologação'}
        </div>
      </header>
      <TabBar
        tabs={tabs}
        active={tab}
        onChange={value => {
          setStepAlert('');
          setTab(value);
        }}
      />
      {msg && <div className="ca-message">{msg}</div>}
      {stepAlert && (
        <div className="ca-step-alert" role="alert">
          <b>Antes de continuar</b>
          <span>{stepAlert}</span>
        </div>
      )}
      {last ? (
        <div className="ca-review-layout">
          <div>
            <div className="ca-review-summary">
              <p>Revisão final</p>
              <h2>Confira o documento antes de transmitir</h2>
              <span>Nenhuma informação será enviada até você usar o botão de transmissão.</span>
            </div>
            <div className="ca-review-facts">
              {reviewFacts.map(([label, value]) => (
                <div key={label}>
                  <span>{label}</span>
                  <b>{value}</b>
                </div>
              ))}
            </div>
            {allIssues.length > 0 && (
              <div className="ca-step-alert" role="alert">
                <b>Dados pendentes</b>
                <span>{allIssues.join(', ')}.</span>
              </div>
            )}
            {finalActions}
          </div>
          <FiscalPreview
            documentType={documentType}
            environment={environment}
            profile={profile}
            form={form}
            customer={customer}
            product={product}
            service={service}
            dest={dest}
            result={result}
          />
        </div>
      ) : (
        <main className="ca-step-page">
          {content}
          <div className="ca-step-actions">
            <Button variant="outline" disabled={step === 0} onClick={() => go(-1)}>
              Voltar
            </Button>
            <Button className="ca-btn-primary" onClick={advance}>
              Continuar para {tabs[step + 1]}
            </Button>
          </div>
        </main>
      )}
    </div>
  );
}

function FiscalPreview({
  documentType,
  environment,
  profile,
  form,
  customer,
  product,
  service,
  dest,
  result,
}: {
  documentType: string;
  environment: string;
  profile: any;
  form: any;
  customer: any;
  product: any;
  service: any;
  dest: any;
  result: any;
}) {
  const payload =
    documentType === 'NFS-e'
      ? {
          ...profile,
          serie: form.series,
          numero: form.number,
          descricao: service?.name || form.description,
          valor: Number(form.value || 0),
          tomadorNome: customer?.legal_name,
          tomadorDocumento: customer?.tax_id,
          codigoTributacao: form.serviceCode,
        }
      : documentType === 'CT-e'
      ? {
          ...profile,
          serie: form.series,
          numero: form.number,
          natOp: 'PRESTACAO DE SERVICO DE TRANSPORTE',
          vTPrest: Number(form.vTPrest || 0),
          dest: {
            xNome: dest?.legal_name,
            CNPJ: digits(dest?.tax_id),
            xLgr: dest?.street,
            nro: dest?.street_number,
            xBairro: dest?.district,
            xMun: dest?.city,
            UF: dest?.state,
          },
          cfopCte: form.cfopCte,
        }
      : documentType === 'MDF-e'
      ? {
          ...profile,
          serie: form.series,
          numero: form.number,
          natOp: 'MANIFESTO DE DOCUMENTOS FISCAIS',
          valorCarga: Number(form.cargoValue || 0),
          munDescargaNome: form.unloadName,
        }
      : {
          cnpjEmitente: profile?.tax_id,
          razaoSocial: profile?.legal_name,
          nomeFantasia: profile?.trade_name,
          ie: profile?.state_registration,
          logradouro: profile?.street,
          numeroEndereco: profile?.street_number,
          bairro: profile?.district,
          nomeMunicipio: profile?.city,
          serie: form.series,
          numeroNota: form.number,
          destDocumento: customer?.tax_id,
          destNome: customer?.legal_name,
          destLogradouro: customer?.street,
          destNumero: customer?.street_number,
          destBairro: customer?.district,
          destMunicipio: customer?.city,
          destUF: customer?.state,
          codigoProduto: product?.code,
          produto: product?.name,
          ncm: product?.ncm,
          cfop: form.cfop,
          unidade: product?.unit || 'UN',
          quantidade: Number(form.quantity || 0),
          valorUnitario: Number(form.unitPrice || 0),
        };
  const xml = result?.xml || result?.xmlAssinado;
  return (
    <aside className="ca-preview">
      <div className="ca-preview-head">
        <div>
          <p>Pré-visualização</p>
          <strong>{documentType}</strong>
        </div>
        <div>
          <button onClick={() => printDanfe('live-danfe', `${documentType}-${form.number}`)}>
            Imprimir / PDF
          </button>
          {xml && (
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(new Blob([xml], { type: 'application/xml' }));
                a.download = `${documentType}-${form.number}.xml`;
                a.click();
                URL.revokeObjectURL(a.href);
              }}
            >
              XML
            </button>
          )}
        </div>
      </div>
      <div className="ca-preview-paper">
        <SaasDanfePreview
          id="live-danfe"
          documentType={documentType}
          environment={environment}
          profile={profile}
          data={payload}
          result={result}
        />
      </div>
    </aside>
  );
}
