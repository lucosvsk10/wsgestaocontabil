import { useCallback, useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import {
  ChevronRight,
  FileText,
  Package2,
  ReceiptText,
  Repeat2,
  Search,
  Truck,
  UsersRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import {
  clearEmissionDraft,
  emissionDraftKey,
  readEmissionDraft,
  writeEmissionDraft,
} from '@/lib/saas/emissionDraft';
import { isValidAccessKey, isValidCpf, isValidCnpj, isValidTaxId, isPositiveAmount, isDocumentNumber, brazilStates, parseAccessKeys, validateMdfeKeys } from '@/lib/saas/emissionValidation';
import { fiscalErrorMessage, readFiscalError } from '@/lib/saas/emissionErrors';
import SaasDanfePreview, { printDanfe } from './SaasDanfePreview';
import MunicipalityField from './MunicipalityField';
import FiscalRecordPicker from './FiscalRecordPicker';
import FiscalCodeField from './FiscalCodeField';
import '@/styles/fiscal-studio.css';

const docs = ['NF-e', 'NFC-e', 'NFS-e', 'CT-e', 'MDF-e'];
const stepsByDocument: Record<string, string[]> = {
 'NF-e': ['Cliente', 'Produtos', 'Pagamento', 'Fiscal', 'Revisão'],
 'NFC-e': ['Cliente', 'Produtos', 'Pagamento', 'Fiscal', 'Revisão'],
 'NFS-e': ['Pessoas', 'Serviço', 'Revisão'],
 'CT-e': ['Participantes', 'Carga', 'Rota', 'Fiscal', 'Revisão'],
 'MDF-e': ['Veículo', 'Condutor', 'Rota e carga', 'Documentos', 'Revisão'],
};
const money = (v: any) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const digits = (v: any) => String(v ?? '').replace(/\D/g, '');
const formatTaxId = (value: any) => {
  const raw = digits(value);
  if (raw.length === 14) return raw.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  if (raw.length === 11) return raw.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  return value || '—';
};
const reusablePartsDefault = {
  people: true,
  items: true,
  payment: true,
  fiscal: true,
  transport: true,
};
const initialEmissionForm = {
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
  municipioPrestacaoNome: '',
  municipioPrestacaoUf: '',
  remetenteId: '',
  destinatarioId: '',
  toma: '0',
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
  tpEmit: '2',
  seguradoraNome: '',
  seguradoraCnpj: '',
  apolice: '',
  averbacao: '',
  contratanteId: '',
  ncmPredominante: '',
  xProd: '',
  cepDescarga: '',
  vContrato: '',
  pixPagamento: '',
};
type ReusableParts = typeof reusablePartsDefault;
const emissionType = (emission: any) =>
  (
    ({ nfe: 'NF-e', nfce: 'NFC-e', nfse: 'NFS-e', cte: 'CT-e', mdfe: 'MDF-e' }) as Record<
      string,
      string
    >
  )[String(emission?.document_type || '').toLowerCase()] || '';
const emissionDate = (emission: any) =>
  new Date(emission?.authorized_at || emission?.created_at || 0).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
const fieldClass =
  'fe-input';
function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  wide = false,
  required = false,
  hint,
  suggestions,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  wide?: boolean;
  required?: boolean;
  hint?: string;
  suggestions?: string[];
}) {
  const listId = suggestions?.length ? `field-suggestions-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined;
  return (
    <label className={wide ? 'md:col-span-2' : ''}>
      <span className="fe-label">
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <Input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        list={listId}
        className={fieldClass}
      />
      {listId && <datalist id={listId}>{suggestions.map(value => <option key={value} value={value} />)}</datalist>}
      {hint && <small className="fe-field-hint">{hint}</small>}
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
      <span className="fe-label">
        {label}
        {required && <b aria-hidden="true"> *</b>}
      </span>
      <select value={value ?? ''} onChange={e => onChange(e.target.value)} className="fe-select">
        {children}
      </select>
      {hint && <small className="fe-field-hint">{hint}</small>}
    </label>
  );
}
function CatalogPicker({ label, value, onChange, items, kind, required = false, onEmptyAction }: {
  label: string; value: string; onChange: (value: string) => void; items: any[];
  kind: 'product' | 'service'; required?: boolean; emptyActionLabel?: string; onEmptyAction?: () => void;
}) {
  return <FiscalRecordPicker label={label} value={value} onChange={onChange} kind={kind} required={required}
    onCreate={onEmptyAction} items={items.map(item => ({
      id: item.id, name: item.name, code: item.code,
      classification: kind === 'product' ? item.ncm && `NCM ${item.ncm}` : item.service_code_national && `Tributação ${item.service_code_national}`,
      amount: item.sale_price == null ? undefined : Number(item.sale_price), unit: item.unit, detail: item.description,
    }))} />;
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
    <section className={`fe-form-section fe-tone-${tone}`} data-section={title}>
      <div className="fe-section-head">
        <div>
          <h2 tabIndex={-1}>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <div className="fe-section-body">{children}</div>
    </section>
  );
}
function IssuerSummary({ profile, documentType }: { profile: any; documentType: string }) {
  const service = documentType === 'NFS-e';
  const registration = service
    ? profile?.municipal_registration
      ? `IM ${profile.municipal_registration}`
      : 'IM não informada'
    : profile?.state_registration
      ? `IE ${profile.state_registration}`
      : 'IE não informada';
  const address = [profile?.street, profile?.street_number, profile?.district].filter(Boolean).join(', ');
  const city = [profile?.city, profile?.state].filter(Boolean).join('/');
  return (
    <details className="fe-issuer">
      <summary><span className="fe-issuer-monogram" aria-hidden="true">{(profile?.legal_name || 'WS').slice(0, 2).toUpperCase()}</span>
        <span><small>{service ? 'Prestador do serviço' : 'Empresa emitente'}</small><strong>{profile?.legal_name || 'Configure sua empresa'}</strong></span>
        <span className="fe-issuer-tax">{formatTaxId(profile?.tax_id)}<small>{city || 'Município não informado'}</small></span>
        <span className="fe-issuer-expand">Conferir dados <ChevronRight size={15} /></span>
      </summary>
      <div className="fe-issuer-details"><span>{registration}</span><span>{address || 'Endereço não informado'}</span><small>Dados de Minha Empresa. A assinatura utiliza o certificado desta empresa.</small></div>
    </details>
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
    <div className="fe-tabs-wrap">
      <div className="fe-progress-copy">
        <span>
          Etapa {current + 1} de {tabs.length}
        </span>
        <b>Preenchimento</b>
      </div>
      <div className="fe-progress-track" aria-hidden="true">
        <i style={{ width: `${((current + 1) / tabs.length) * 100}%` }} />
      </div>
      <ol className="fe-tabs" aria-label="Etapas da emissão">
        {tabs.map((t, i) => (
          <li key={t}><button
            type="button"
            key={t}
            onClick={() => onChange(t)}
            className={`${active === t ? 'is-active' : ''} ${i < current ? 'is-complete' : ''}`}
            aria-current={active === t ? 'step' : undefined}
          >
            <span>{i < current ? '✓' : i + 1}</span>
            {t}
          </button></li>
        ))}
      </ol>
    </div>
  );
}

export default function SaasEmission(props: Parameters<typeof EmissionForm>[0]) {
  return <EmissionForm key={`${props.organizationId}:${props.documentType}`} {...props} />;
}

function EmissionForm({
  organizationId,
  documentType,
  onChoose,
  emissions = [],
  reusableEmission,
  onReuseConsumed,
  onOpenCadastro,
}: {
  organizationId: string | null;
  documentType: string | null;
  onChoose: (d: string | null) => void;
  emissions?: any[];
  reusableEmission?: any | null;
  onReuseConsumed?: () => void;
  onOpenCadastro?: (section: 'Clientes' | 'Produtos' | 'Serviços' | 'Transportadoras') => void;
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
    [tab, setTab] = useState(''),
    [dataReady, setDataReady] = useState(false),
    [reuseOpen, setReuseOpen] = useState(false),
    [reuseSearch, setReuseSearch] = useState(''),
    [reuseParts, setReuseParts] = useState<ReusableParts>(reusablePartsDefault),
    [draftStatus, setDraftStatus] = useState<'restored' | 'saving' | 'saved' | 'cleared' | 'error' | null>(null),
    [draftSavedAt, setDraftSavedAt] = useState<string | null>(null);
  const reusedEmissionRef = useRef('');
  const draftReadyRef = useRef(false);
  const mountedRef = useRef(true);
  const invocationRef = useRef(false);
  const completedRef = useRef(false);
  const editorRef = useRef<HTMLDivElement>(null);
  const [emissionAuthorized, setEmissionAuthorized] = useState(false);
  const draftKey = organizationId && documentType ? emissionDraftKey(organizationId, documentType) : null;
  const deferredReuseSearch = useDeferredValue(reuseSearch);
  const reusableRows = useMemo(() => {
    const query = deferredReuseSearch.trim().toLowerCase();
    return emissions
      .filter(
        emission =>
          emissionType(emission) === documentType &&
          !emission?.payload?.imported &&
          emission?.payload &&
          Object.keys(emission.payload).length > 0
      )
      .filter(emission => {
        if (!query) return true;
        const payload = emission.payload || {};
        return String(
          `${emission.number || ''} ${emission.recipient_name || ''} ${
            emission.recipient_tax_id || ''
          } ${payload.produto || ''} ${payload.descricao || ''} ${payload.natOp || ''}`
        )
          .toLowerCase()
          .includes(query);
      })
      .slice(0, 24);
  }, [deferredReuseSearch, documentType, emissions]);
  const [form, setForm] = useState<any>(initialEmissionForm);
  useEffect(() => {
    if (editorRef.current) editorRef.current.querySelector<HTMLElement>('h2')?.focus({ preventScroll: true });
  }, [tab]);
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
    setForm((p: any) => {
      const next = { ...p, [k]: v };
      if (k === 'productId') {
        const selected = products.find(item => item.id === v);
        if (selected) {
          next.unitPrice = String(selected.sale_price ?? '');
          const destination = customers.find(item => item.id === p.customerId);
          const interstate = destination?.state && profile?.state && destination.state !== profile.state;
          next.cfop = (interstate ? selected.cfop_out_state || profile?.default_cfop_out_state : selected.cfop_in_state || profile?.default_cfop_in_state) || p.cfop;
        }
      }
      if (k === 'serviceId') {
        const selected = services.find(item => item.id === v);
        if (selected) {
          next.value = String(selected.sale_price ?? '');
          next.description = selected.description || selected.name;
          next.serviceCode = selected.service_code_national || profile?.default_nfse_service_code || '';
        }
      }
      return next;
    });
  };
  const load = async () => {
    if (!organizationId) return;
    const [p, c, pr, s, ca] = await Promise.all([
      (supabase as any)
        .from('saas_company_fiscal_profiles')
        .select('id,organization_id,company_id,business_mode,tax_regime,crt,state_registration,municipal_registration,cnae_primary,fiscal_environment,enabled_documents,default_cfop_in_state,default_cfop_out_state,default_nfse_service_code,default_iss_rate,certificate_expires_at,certificate_subject,nfce_csc_id,series_nfe,next_number_nfe,series_nfce,next_number_nfce,series_nfse,next_number_nfse,series_cte,next_number_cte,series_mdfe,next_number_mdfe,notes,logo_path,legal_name,trade_name,tax_id,phone,email,postal_code,street,street_number,complement,district,city,state,city_ibge_code,created_at,updated_at,fiscal_environment_changed_at,fiscal_environment_changed_by')
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
    if (!mountedRef.current) return;
    const failed = [p, c, pr, s, ca].find(response => response.error);
    if (failed) throw new Error('Não foi possível carregar os cadastros. Recarregue para tentar novamente; seu rascunho foi mantido.');
    let loadedProfile = p.data;
    if (loadedProfile?.logo_path) {
      const { data: signed } = await supabase.storage
        .from('saas-private')
        .createSignedUrl(loadedProfile.logo_path, 3600);
      loadedProfile = { ...loadedProfile, logo_url: signed?.signedUrl || null };
    }
    if (!mountedRef.current) return;
    setProfile(loadedProfile);
    setCustomers(c.data || []);
    setProducts(pr.data || []);
    setServices(s.data || []);
    setCarriers(ca.data || []);
    const pp = p.data;
    const savedDraft = draftKey ? readEmissionDraft(draftKey) : null;
    if (pp)
      setForm((f: any) => ({
        ...f,
        series:
          savedDraft
            ? f.series
            : documentType === 'NF-e'
            ? pp.series_nfe || '1'
            : documentType === 'NFC-e'
            ? pp.series_nfce || '1'
            : documentType === 'NFS-e'
            ? pp.series_nfse || '1'
            : documentType === 'CT-e'
            ? pp.series_cte || '1'
            : pp.series_mdfe || '1',
        number: String(
          savedDraft
            ? f.number
            : documentType === 'NF-e'
            ? pp.next_number_nfe || 1
            : documentType === 'NFC-e'
            ? pp.next_number_nfce || 1
            : documentType === 'NFS-e'
            ? pp.next_number_nfse || 1
            : documentType === 'CT-e'
            ? pp.next_number_cte || 1
            : pp.next_number_mdfe || 1
        ),
        cfop: savedDraft ? f.cfop : pp.default_cfop_in_state || '5102',
        serviceCode: savedDraft ? f.serviceCode : pp.default_nfse_service_code || '',
        municipioPrestacao: savedDraft ? f.municipioPrestacao : pp.city_ibge_code || '',
        municipioPrestacaoNome: savedDraft ? f.municipioPrestacaoNome : pp.city || '',
        municipioPrestacaoUf: savedDraft ? f.municipioPrestacaoUf : pp.state || '',
        munIniCodigo: savedDraft ? f.munIniCodigo : f.munIniCodigo || pp.city_ibge_code || '',
        munIniNome: savedDraft ? f.munIniNome : f.munIniNome || pp.city || '',
        ufIni: savedDraft ? f.ufIni : pp.state || 'AL',
        ufFim: savedDraft ? f.ufFim : pp.state || 'AL',
        tpEmit: savedDraft ? f.tpEmit : pp.business_mode === 'transport' ? '1' : '2',
      }));
    setDataReady(true);
  };
  useEffect(() => {
    setDataReady(false);
    draftReadyRef.current = false;
    mountedRef.current = true;
    reusedEmissionRef.current = '';
    const savedDraft = draftKey ? readEmissionDraft(draftKey) : null;
    setForm({ ...initialEmissionForm, ...(savedDraft?.form || {}) });
    setDraftSavedAt(savedDraft?.savedAt || null);
    setDraftStatus(savedDraft ? 'restored' : null);
    void load().catch(error => {
      if (mountedRef.current) setMsg(error.message);
    });
    setResult(null);
    setMsg('');
    setStepAlert('');
    const savedStep = documentType === 'NFS-e' && ['Valores', 'Impostos'].includes(savedDraft?.tab || '') ? 'Serviço' : savedDraft?.tab;
    const availableSteps = stepsByDocument[documentType || ''] || stepsByDocument['NF-e'];
    setTab(savedStep && availableSteps.includes(savedStep) ? savedStep : availableSteps[0]);
    draftReadyRef.current = true;
    return () => { mountedRef.current = false; };
  }, [organizationId, documentType, draftKey]);

  useLayoutEffect(() => {
    if (!draftKey || !draftReadyRef.current || !dataReady || completedRef.current) return;
    try {
      const draft = writeEmissionDraft(draftKey, form, tab, {
        recipient: documentType === 'MDF-e' ? form.driverName : customers.find(item => item.id === (documentType === 'CT-e' ? form.destinatarioId : form.customerId))?.legal_name || (form.destinatarioId === '__issuer__' ? profile?.legal_name : '') || '',
        subject: documentType === 'NF-e' || documentType === 'NFC-e' ? products.find(item => item.id === form.productId)?.name || '' : documentType === 'NFS-e' ? form.description : [form.munIniNome, form.munFimNome || form.unloadName].filter(Boolean).join(' → '),
        total: documentType === 'NF-e' || documentType === 'NFC-e' ? Number(form.quantity) * Number(form.unitPrice) : Number(documentType === 'NFS-e' ? form.value : documentType === 'CT-e' ? form.vTPrest : form.cargoValue),
        environment: profile?.fiscal_environment === 'production' ? 'production' : 'homologation',
      });
      setDraftSavedAt(draft.savedAt);
      setDraftStatus('saved');
    } catch {
      setDraftStatus('error');
    }
  }, [draftKey, form, tab, dataReady, customers, products, profile?.fiscal_environment, documentType]);
  const transportParties = profile?.tax_id
    ? [{ ...profile, id: '__issuer__', trade_name: 'Sua empresa · emitente' }, ...customers]
    : customers;
  const customer = customers.find(x => x.id === form.customerId),
    product = products.find(x => x.id === form.productId),
    service = services.find(x => x.id === form.serviceId),
    rem = transportParties.find(x => x.id === form.remetenteId),
    dest = transportParties.find(x => x.id === form.destinatarioId),
    issuerCarrier = carriers.find(x => digits(x.tax_id) === digits(profile?.tax_id));
  const transportCarrier = issuerCarrier;
  const mapParty = (item: any) => ({
    id: item.id, name: item.legal_name || item.trade_name || 'Sem nome', identifier: formatTaxId(item.tax_id),
    location: [item.street, item.street_number, item.city, item.state].filter(Boolean).join(' · '),
    contact: [item.email, item.phone].filter(Boolean).join(' · '), detail: item.trade_name, classification: item.id === '__issuer__' ? 'Sua empresa · emitente' : undefined,
  });
  const partyRecords = customers.map(mapParty);
  const transportRecords = transportParties.map(mapParty);
  const chooseOrCreate = (
    key: string,
    value: string,
    section: 'Clientes' | 'Produtos' | 'Serviços' | 'Transportadoras'
  ) => {
    if (value === '__new__') {
      onOpenCadastro?.(section);
      return;
    }
    set(key, value);
  };
  useEffect(() => {
    if (!transportCarrier) return;
    setForm((current: any) => ({
      ...current,
      rntrc: current.rntrc || transportCarrier.rntrc || '',
      plate: current.plate || transportCarrier.vehicle_plate || '',
    }));
  }, [transportCarrier?.id, documentType]);

  const applyReusableEmission = useCallback(
    (emission: any, parts: ReusableParts = reusablePartsDefault) => {
      const payload = emission?.payload || {};
      const byTaxId = (value: any) =>
        transportParties.find(item => digits(item.tax_id) === digits(value))?.id || '';
      const productId =
        products.find(
          item =>
            String(item.code || '') === String(payload.codigoProduto || '') ||
            String(item.name || '').toLowerCase() === String(payload.produto || '').toLowerCase() ||
            (digits(item.ncm) && digits(item.ncm) === digits(payload.ncm))
        )?.id || '';
      const serviceId =
        services.find(
          item =>
            String(item.service_code_national || '') === String(payload.codigoTributacao || '') ||
            String(item.name || '').toLowerCase() === String(payload.descricao || '').toLowerCase()
        )?.id || '';
      const values: Record<string, any> = {};

      if (documentType === 'NF-e' || documentType === 'NFC-e') {
        if (parts.people) values.customerId = byTaxId(payload.destDocumento);
        if (parts.items) {
          values.productId = productId;
          values.quantity = String(payload.quantidade || 1);
          values.unitPrice = String(payload.valorUnitario || '');
        }
        if (parts.payment) values.payment = String(payload.formaPagamento || '01');
        if (parts.fiscal) values.cfop = String(payload.cfop || '');
      } else if (documentType === 'NFS-e') {
        if (parts.people) {
          values.customerId = byTaxId(payload.tomadorDocumento);
          values.municipioPrestacao = String(payload.municipioPrestacao || '');
        }
        if (parts.items) {
          values.serviceId = serviceId;
          values.description = String(payload.descricao || '');
          values.value = String(payload.valor || '');
        }
        if (parts.fiscal) values.serviceCode = String(payload.codigoTributacao || '');
      } else if (documentType === 'CT-e') {
        if (parts.people) {
          values.remetenteId = byTaxId(payload.rem?.CNPJ || payload.rem?.CPF);
          values.destinatarioId = byTaxId(payload.dest?.CNPJ || payload.dest?.CPF);
        }
        if (parts.items) {
          values.vCarga = String(payload.carga?.vCarga || '');
          values.qCarga = String(payload.carga?.qCarga || 1);
          values.chNFe = String(payload.chNFe || '');
        }
        if (parts.payment) values.vTPrest = String(payload.vTPrest || '');
        if (parts.fiscal) values.cfopCte = String(payload.cfop || '5353');
        if (parts.transport) {
          values.rntrc = String(payload.rodo?.RNTRC || '');
          values.munIniCodigo = String(payload.cMunIni || '');
          values.munIniNome = String(payload.xMunIni || '');
          values.ufIni = String(payload.UFIni || 'AL');
          values.munFimCodigo = String(payload.cMunFim || '');
          values.munFimNome = String(payload.xMunFim || '');
          values.ufFim = String(payload.UFFim || 'AL');
        }
      } else if (documentType === 'MDF-e') {
        if (parts.people) {
          values.driverName = String(payload.condutorNome || '');
          values.driverCpf = String(payload.condutorCpf || '');
        }
        if (parts.items) {
          values.cargoValue = String(payload.valorCarga || '');
          values.cargoWeight = String(payload.pesoCarga || '');
          values.keys = Array.isArray(payload.chaves)
            ? payload.chaves.join('\n')
            : String(payload.chaves || '');
        }
        if (parts.transport) {
          values.rntrc = String(payload.rntrc || '');
          values.plate = String(payload.placa || '');
          values.tara = String(payload.tara || '');
          values.capacity = String(payload.capacidadeKg || '');
          values.munIniCodigo = String(payload.munCarregaCodigo || '');
          values.munIniNome = String(payload.munCarregaNome || '');
          values.unloadCode = String(payload.munDescargaCodigo || '');
          values.unloadName = String(payload.munDescargaNome || '');
          values.ufIni = String(payload.ufIni || 'AL');
          values.ufFim = String(payload.ufFim || 'AL');
        }
      }

      setForm((current: any) => ({
        ...current,
        ...values,
        series: current.series,
        number: current.number,
      }));
      setResult(null);
      setStepAlert('');
      setMsg(
        `Dados reaproveitados da ${documentType} nº ${
          emission?.number || 'sem número'
        }. Numeração e tributos serão validados novamente.`
      );
      setTab(
        documentType === 'NFS-e'
          ? 'Pessoas'
          : documentType === 'CT-e'
          ? 'Participantes'
          : documentType === 'MDF-e'
          ? 'Veículo'
          : 'Cliente'
      );
      setReuseOpen(false);
      setReuseSearch('');
    },
    [customers, documentType, products, services]
  );

  useEffect(() => {
    if (!dataReady || !reusableEmission || !documentType) return;
    const reuseKey = String(
      reusableEmission.id || reusableEmission.access_key || reusableEmission.number
    );
    if (reusedEmissionRef.current === reuseKey) return;
    reusedEmissionRef.current = reuseKey;
    applyReusableEmission(reusableEmission);
    onReuseConsumed?.();
  }, [applyReusableEmission, dataReady, reusableEmission, documentType, onReuseConsumed]);
  const environment = profile?.fiscal_environment === 'production' ? 'production' : 'homologation';
  const invoke = async (name: string, body: any) => {
    if (invocationRef.current || completedRef.current || !dataReady) return;
    invocationRef.current = true;
    setBusy(true);
    setMsg('');
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke(name, {
        body: { ...body, organization_id: organizationId, expected_environment: environment },
      });
      if (!mountedRef.current) return;
      if (error) throw error;
      if (data?.error) {
        setMsg(fiscalErrorMessage(data));
        setResult(data);
        return;
      }
      setResult(data);
      setMsg(
        body.action === 'preview'
          ? 'Prévia gerada e assinada para conferência.'
          : data?.authorized === false
          ? fiscalErrorMessage(data.response, 'Documento rejeitado pelo autorizador.')
          : data?.authorized === true
          ? 'Documento autorizado. Você já pode consultar o resultado.'
          : 'Envio recebido. Confira a situação no histórico antes de transmitir novamente.'
      );
      if (body.action === 'issue') {
        if (data?.authorized === true && draftKey) {
          completedRef.current = true;
          setEmissionAuthorized(true);
          try { clearEmissionDraft(draftKey); } catch { /* Keep the authorized result visible. */ }
          setDraftSavedAt(null);
          setDraftStatus('cleared');
          await load();
        }
      }
    } catch (e: any) {
      if (mountedRef.current) setMsg(await readFiscalError(e, body.action === 'issue'));
    } finally {
      invocationRef.current = false;
      if (mountedRef.current) setBusy(false);
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
    ...(digits(x?.tax_id).length === 11 ? { CPF: digits(x?.tax_id) } : { CNPJ: digits(x?.tax_id) }),
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
    cUF: digits(profile?.city_ibge_code).slice(0, 2),
    toma: form.toma,
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
    rodo: { RNTRC: form.rntrc || transportCarrier?.rntrc },
  });
  const mdfePayload = () => ({
    environment,
    serie: form.series,
    numero: form.number,
    rntrc: form.rntrc || transportCarrier?.rntrc,
    placa: form.plate || transportCarrier?.vehicle_plate,
    veiculoUf: transportCarrier?.vehicle_state || profile?.state || 'AL',
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
    chaves: parseAccessKeys(form.keys),
    tpEmit: form.tpEmit,
    ...(form.tpEmit === '1' ? {
      seguradoraNome: form.seguradoraNome,
      seguradoraCnpj: digits(form.seguradoraCnpj),
      apolice: form.apolice,
      averbacao: form.averbacao,
      contratanteCnpj: transportParties.find(x => x.id === form.contratanteId)?.tax_id,
      pagadorCnpj: transportParties.find(x => x.id === form.contratanteId)?.tax_id,
      ncmPredominante: digits(form.ncmPredominante),
      xProd: form.xProd,
      cepCarrega: profile?.postal_code,
      cepDescarga: digits(form.cepDescarga),
      vContrato: Number(form.vContrato),
      pixPagamento: form.pixPagamento,
    } : {}),
  });
  if (!documentType)
    return (
      <div className="fe-doc-home">
        <div className="fe-page-title">
          <p>Emissão fiscal</p>
          <h1>Nova nota fiscal</h1>
          <span>Escolha o tipo de documento para iniciar.</span>
        </div>
        <div className="fe-doc-grid">
          {docs.map((d, i) => (
            <button key={d} onClick={() => onChoose(d)} className={`fe-doc-choice tone-${i + 1}`}>
              <span className="fe-doc-icon">
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
  const tabs = stepsByDocument[documentType] || stepsByDocument['NF-e'];
  const step = tabs.indexOf(tab),
    last = step === tabs.length - 1;
  const go = (delta: number) => setTab(tabs[Math.max(0, Math.min(tabs.length - 1, step + delta))]);
  const issuesForStep = (index: number) => {
    const issues: string[] = [];
    const need = (ok: any, label: string) => {
      if (!ok) issues.push(label);
    };
    if (documentType === 'NF-e' || documentType === 'NFC-e') {
      if (index === 0) {
        if (documentType === 'NF-e') need(customer, 'cliente');
        if (customer) need(isValidTaxId(customer.tax_id), 'CPF/CNPJ válido no cadastro do cliente');
        if (documentType === 'NF-e' && customer) {
          need(digits(customer.city_ibge_code).length === 7, 'município IBGE no cadastro do cliente');
          need(brazilStates.includes(customer.state), 'UF no cadastro do cliente');
          need(customer.street && customer.street_number && customer.district, 'endereço completo no cadastro do cliente');
        }
      }
      if (index === 1) {
        need(product, 'produto');
        need(isPositiveAmount(form.quantity), 'quantidade');
        need(isPositiveAmount(form.unitPrice), 'valor unitário');
        need(digits(product?.ncm).length === 8, 'NCM do produto');
      }
      if (index === 2) need(form.payment, 'forma de pagamento');
      if (index === 3) {
        need(digits(form.cfop).length === 4, 'CFOP com 4 dígitos');
        need(isDocumentNumber(form.series, 3, true), 'série numérica de até 3 dígitos');
        need(isDocumentNumber(form.number, 9), 'número da nota');
      }
    }
    if (documentType === 'NFS-e') {
      if (index === 0) {
        need(customer, 'cliente / tomador');
        need(isValidTaxId(customer?.tax_id), 'CPF/CNPJ válido no cadastro do tomador');
        need(digits(form.municipioPrestacao).length === 7, 'município da prestação (IBGE)');
      }
      if (index === 1) {
        need(service, 'serviço');
        need(/^\d{6}$/.test(digits(form.serviceCode)), 'código de tributação nacional com 6 dígitos');
        need(String(form.description).trim(), 'descrição do serviço');
        need(isPositiveAmount(form.value), 'valor do serviço');
        need(isDocumentNumber(form.series, 5, true), 'série DPS numérica');
        need(isDocumentNumber(form.number, 15), 'número DPS');
      }
    }
    if (documentType === 'CT-e') {
      if (index === 0) {
        need(rem, 'remetente');
        need(dest, 'destinatário');
        need(isValidTaxId(rem?.tax_id), 'CPF/CNPJ do remetente');
        need(isValidTaxId(dest?.tax_id), 'CPF/CNPJ do destinatário');
        for (const party of [rem, dest]) {
          need(party?.street && party?.street_number && party?.district && digits(party?.city_ibge_code).length === 7 && brazilStates.includes(party?.state), 'endereço completo dos participantes no cadastro');
        }
        need(digits(form.rntrc || transportCarrier?.rntrc).length === 8, 'RNTRC do emitente com 8 dígitos');
      }
      if (index === 1) {
        need(isPositiveAmount(form.vTPrest), 'valor da prestação');
        need(isPositiveAmount(form.vCarga), 'valor da carga');
        need(isPositiveAmount(form.qCarga), 'peso / quantidade');
        if (String(form.chNFe || '').trim()) need(isValidAccessKey(form.chNFe, ['55']), 'chave NF-e válida (modelo 55)');
      }
      if (index === 2) {
        need(digits(form.munIniCodigo).length === 7, 'código IBGE da origem');
        need(String(form.munIniNome).trim(), 'município de origem');
        need(brazilStates.includes(form.ufIni), 'UF de origem');
        need(digits(form.munFimCodigo).length === 7, 'código IBGE do destino');
        need(String(form.munFimNome).trim(), 'município de destino');
        need(brazilStates.includes(form.ufFim), 'UF de destino');
      }
      if (index === 3) {
        need(digits(form.cfopCte).length === 4, 'CFOP com 4 dígitos');
        need(isDocumentNumber(form.series, 3, true), 'série numérica de até 3 dígitos');
        need(isDocumentNumber(form.number, 9), 'número do CT-e');
      }
    }
    if (documentType === 'MDF-e') {
      if (index === 0) {
        if (form.tpEmit === '1' || form.ufIni !== form.ufFim) need(digits(form.rntrc || transportCarrier?.rntrc).length === 8, 'RNTRC do emitente com 8 dígitos');
        need(
            String(form.plate || transportCarrier?.vehicle_plate || '').replace(/[^A-Z0-9]/gi, '').length ===
            7,
          'placa do veículo'
        );
        need(isPositiveAmount(form.tara), 'tara');
        need(isPositiveAmount(form.capacity), 'capacidade');
      }
      if (index === 1) {
        need(String(form.driverName).trim(), 'nome do condutor');
        need(isValidCpf(form.driverCpf), 'CPF válido do condutor');
      }
      if (index === 2) {
        need(digits(form.munIniCodigo).length === 7, 'código IBGE do carregamento');
        need(String(form.munIniNome).trim(), 'município de carregamento');
        need(digits(form.unloadCode).length === 7, 'código IBGE do descarregamento');
        need(String(form.unloadName).trim(), 'município de descarregamento');
        need(brazilStates.includes(form.ufIni), 'UF inicial');
        need(brazilStates.includes(form.ufFim), 'UF final');
        need(isPositiveAmount(form.cargoValue), 'valor da carga');
        need(isPositiveAmount(form.cargoWeight), 'peso da carga');
      }
      if (index === 3) {
        const keyError = validateMdfeKeys(form.keys, form.tpEmit);
        if (keyError) issues.push(keyError);
        if (form.tpEmit === '1') {
          need(String(form.seguradoraNome).trim(), 'nome da seguradora');
          need(isValidCnpj(form.seguradoraCnpj), 'CNPJ válido da seguradora');
          need(String(form.apolice).trim(), 'apólice do seguro');
          need(String(form.averbacao).trim(), 'averbação do seguro');
          need(isValidTaxId(transportParties.find(x => x.id === form.contratanteId)?.tax_id), 'contratante cadastrado com CPF/CNPJ válido');
          need(digits(form.ncmPredominante).length === 8, 'NCM do produto predominante');
          need(String(form.xProd).trim(), 'descrição da carga');
          need(isPositiveAmount(form.vContrato), 'valor do frete');
          if (parseAccessKeys(form.keys).length === 1) need(digits(form.cepDescarga).length === 8, 'CEP de descarga');
        }
        need(isDocumentNumber(form.series, 3, true), 'série numérica de até 3 dígitos');
        need(isDocumentNumber(form.number, 9), 'número do MDF-e');
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
  const nfsePreviewOnly = documentType === 'NFS-e' && environment !== 'production';
  const actions = (name: string, payload: any, extra: any = {}) => emissionAuthorized ? (
    <div className="fe-final-actions">
      <Button className="fe-btn-primary" onClick={() => onChoose(null)}>Nova emissão</Button>
    </div>
  ) : (
    <div className="fe-final-actions">
      <Button
        variant="outline"
        className="fe-btn-secondary"
        disabled={busy || !dataReady || allIssues.length > 0}
        onClick={() => invoke(name, { action: 'preview', data: payload, ...extra })}
      >
        Gerar prévia
      </Button>
      {!nfsePreviewOnly && <Button
        disabled={busy || !dataReady || allIssues.length > 0}
        onClick={() => invoke(name, { action: 'issue', data: payload, ...extra })}
        className="fe-btn-primary"
      >
        {busy
          ? 'Processando...'
          : environment === 'production'
          ? 'Emitir documento'
          : 'Transmitir para homologação'}
      </Button>}
      {nfsePreviewOnly && <p className="fe-field-hint">Neste ambiente, a NFS-e permite conferir a prévia assinada. A transmissão de teste ainda não está disponível.</p>}
    </div>
  );
  const productTotal = Number(form.quantity || 0) * Number(form.unitPrice || 0);
  const draftCopy = draftStatus === 'saving'
    ? 'Salvando rascunho…'
    : draftStatus === 'saved'
    ? `Rascunho salvo${draftSavedAt ? ` às ${new Date(draftSavedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : ''}`
    : draftStatus === 'restored'
    ? 'Rascunho recuperado'
    : draftStatus === 'cleared'
    ? 'Rascunho concluído'
    : draftStatus === 'error'
    ? 'Não foi possível salvar neste navegador'
    : 'Carregando rascunho…';
  let content: ReactNode = null;
  if (documentType === 'NF-e' || documentType === 'NFC-e')
    content =
      step === 0 ? (
        <Section title="Cliente" subtitle={documentType === 'NFC-e' ? 'Identifique o consumidor quando necessário. Sem seleção, a nota segue como consumidor não identificado.' : 'Selecione o destinatário desta operação.'}>
          <div className="fe-form-grid">
<FiscalRecordPicker label="Cliente" value={form.customerId} items={partyRecords}
              onChange={value => set('customerId', value)} onCreate={() => onOpenCadastro?.('Clientes')}
              required={documentType === 'NF-e'} />
            <div className="fe-info-box">
              <UsersRound />
              <span>
                <b>{customer?.legal_name || (documentType === 'NFC-e' ? 'Consumidor não identificado' : 'Dados vindos do seu cadastro')}</b>
                <small>{customer ? [formatTaxId(customer.tax_id), customer.city, customer.state].filter(Boolean).join(' · ') : documentType === 'NFC-e' ? 'Confira as exigências de identificação aplicáveis à operação antes de transmitir.' : 'Documento, endereço e informações fiscais são preenchidos ao selecionar o cliente.'}</small>
              </span>
            </div>
          </div>
        </Section>
      ) : step === 1 ? (
        <Section title="Produtos" subtitle="Escolha o item e informe a quantidade.">
          <div className="fe-form-grid">
            <CatalogPicker
              label="Produto"
              value={form.productId}
              onChange={v => set('productId', v)}
              items={products}
              kind="product"
              required
              emptyActionLabel="Adicionar produto"
              onEmptyAction={() => onOpenCadastro?.('Produtos')}
            />
            <div className="fe-item-row">
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
                <span className="fe-label">Total</span>
                <div className="fe-total-box">{money(productTotal)}</div>
              </div>
            </div>
          </div>
        </Section>
      ) : step === 2 ? (
        <Section title="Pagamento" subtitle="Defina como a operação será recebida.">
          <div className="fe-form-grid">
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
            <div className="fe-info-box">
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
          <div className="fe-form-grid">
            <Field
              label="CFOP"
              value={form.cfop}
              onChange={v => set('cfop', v)}
              required
              suggestions={Array.from(new Set([profile?.default_cfop_in_state, profile?.default_cfop_out_state, '5102', '6102'].filter(Boolean).map(String)))}
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
    content = step === 0 ? (
      <Section title="Cliente e local" subtitle="Selecione o cadastro e confirme onde o serviço foi prestado.">
        <div className="fe-form-grid">
<FiscalRecordPicker label="Cliente / tomador" value={form.customerId} items={partyRecords}
              onChange={value => set('customerId', value)} onCreate={() => onOpenCadastro?.('Clientes')}
              required={true} />
          <MunicipalityField label="Local da prestação" value={form.municipioPrestacao}
            name={form.municipioPrestacaoNome} state={form.municipioPrestacaoUf}
            onChange={city => setForm((current: any) => ({ ...current, municipioPrestacao: city.code, municipioPrestacaoNome: city.name, municipioPrestacaoUf: city.state }))} />
        </div>
      </Section>
    ) : step === 1 ? (
      <Section title="Serviço e valor" subtitle="O cadastro preenche a descrição e o código. Ajuste apenas o que mudou.">
        <div className="fe-form-grid">
          <CatalogPicker label="Serviço" value={form.serviceId} onChange={v => set('serviceId', v)}
            items={services} kind="service" required emptyActionLabel="Adicionar serviço" onEmptyAction={() => onOpenCadastro?.('Serviços')} />
          <Field label="Valor do serviço" value={form.value} onChange={v => set('value', v)} type="number" required />
          <Field label="Descrição do serviço" value={form.description} onChange={v => set('description', v)} wide required />
          <FiscalCodeField kind="service" label="Código de Tributação Nacional" value={form.serviceCode} onChange={v => set('serviceCode', v)} required />
          <div className="fe-info-box"><ReceiptText /><span><b>ISSQN</b><small>{service?.iss_withheld ? 'Retido pelo tomador, conforme cadastro' : 'Não retido, conforme cadastro'}</small></span></div>
        </div>
        <details className="fe-emission-details">
          <summary>Numeração da DPS · série {form.series} · nº {form.number}</summary>
          <div className="fe-form-grid">
            <Field label="Série DPS" value={form.series} onChange={v => set('series', v)} required />
            <Field label="Número DPS" value={form.number} onChange={v => set('number', v)} type="number" required />
          </div>
        </details>
      </Section>
    ) : null;
  if (documentType === 'CT-e')
    content =
      step === 0 ? (
        <Section title="Participantes" subtitle="O emitente é a empresa desta conta. Selecione remetente e destinatário.">
          <div className="fe-info-box fe-issuer-card mb-4">
            <FileText />
            <span>
              <b>Emitente do CT-e: {profile?.legal_name || 'Empresa da conta'}</b>
              <small>CNPJ {profile?.tax_id || '—'} · A assinatura e a transmissão usam o certificado A1 desta empresa.</small>
            </span>
          </div>
          <div className="fe-form-grid">
            <Select label="Quem contrata o frete?" value={form.toma} onChange={v => set('toma', v)}>
              <option value="0">Remetente</option>
              <option value="3">Destinatário</option>
            </Select>
<FiscalRecordPicker label="Remetente" value={form.remetenteId} items={transportRecords}
              onChange={value => set('remetenteId', value)} onCreate={() => onOpenCadastro?.('Clientes')}
              required={true} />
<FiscalRecordPicker label="Destinatário" value={form.destinatarioId} items={transportRecords}
              onChange={value => set('destinatarioId', value)} onCreate={() => onOpenCadastro?.('Clientes')}
              required={true} />
            <Field
              label="RNTRC"
              value={form.rntrc}
              onChange={v => set('rntrc', v)}
              required
              hint="RNTRC do emitente. Quando houver cadastro correspondente à própria empresa, ele é preenchido automaticamente."
            />
          </div>
        </Section>
      ) : step === 1 ? (
        <Section title="Carga" subtitle="Valores, peso e documento vinculado.">
          <div className="fe-form-grid">
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
              hint="Opcional nesta etapa. Se informar, use os 44 dígitos da chave, sem espaços."
            />
          </div>
        </Section>
      ) : step === 2 ? (
        <Section title="Rota" subtitle="Origem e destino da prestação.">
          <div className="fe-route">
            <MunicipalityField label="Origem" value={form.munIniCodigo} name={form.munIniNome} state={form.ufIni}
              onChange={city => setForm((current: any) => ({ ...current, munIniCodigo: city.code, munIniNome: city.name, ufIni: city.state }))} />
            <ChevronRight />
            <MunicipalityField label="Destino" value={form.munFimCodigo} name={form.munFimNome} state={form.ufFim}
              onChange={city => setForm((current: any) => ({ ...current, munFimCodigo: city.code, munFimNome: city.name, ufFim: city.state }))} />
          </div>
        </Section>
      ) : step === 3 ? (
        <Section title="Fiscal" subtitle="Numeração e CFOP do conhecimento.">
          <div className="fe-form-grid">
            <Field
              label="CFOP"
              value={form.cfopCte}
              onChange={v => set('cfopCte', v)}
              required
              suggestions={['5351', '5352', '5353', '5354', '5355', '6351', '6352', '6353', '6354', '6355']}
              hint="Use o CFOP correspondente ao tipo e ao percurso da prestação."
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
  if (documentType === 'MDF-e')
    content =
      step === 0 ? (
        <Section
          title="Veículo do emitente"
          subtitle="O emitente é a empresa desta conta. Informe apenas os dados do conjunto rodoviário."
        >
          <div className="fe-form-grid mb-4">
            <Select label="O que será transportado?" value={form.tpEmit} onChange={v => set('tpEmit', v)}>
              <option value="2">Carga própria da empresa</option>
              <option value="1">Carga de um cliente (prestação de transporte)</option>
            </Select>
            <p className="fe-field-hint">{form.tpEmit === '2' ? 'Vincule as NF-e da carga. Dados de seguro e contratação não serão solicitados neste fluxo.' : 'Vincule os CT-e e informe os dados do frete e do seguro na etapa Documentos.'}</p>
          </div>
          <div className="fe-info-box fe-issuer-card mb-4">
            <Truck />
            <span>
              <b>Emitente do MDF-e: {profile?.legal_name || 'Empresa da conta'}</b>
              <small>CNPJ {profile?.tax_id || '—'} · O certificado A1 desta empresa será usado para assinar o manifesto.</small>
            </span>
          </div>
          <div className="fe-form-grid">
            {(form.tpEmit === '1' || form.ufIni !== form.ufFim) && <Field label="RNTRC do emitente" value={form.rntrc} onChange={v => set('rntrc', v)} required />}
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
          <div className="fe-form-grid">
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
          <div className="fe-form-grid">
            <MunicipalityField label="Carregamento" value={form.munIniCodigo} name={form.munIniNome} state={form.ufIni}
              onChange={city => setForm((current: any) => ({ ...current, munIniCodigo: city.code, munIniNome: city.name, ufIni: city.state }))} />
            <MunicipalityField label="Descarga" value={form.unloadCode} name={form.unloadName} state={form.ufFim}
              onChange={city => setForm((current: any) => ({ ...current, unloadCode: city.code, unloadName: city.name, ufFim: city.state }))} />
            {form.tpEmit === '2' && form.ufIni !== form.ufFim && <Field label="RNTRC do emitente" value={form.rntrc} onChange={v => set('rntrc', v)} required />}
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
        <Section title="Documentos fiscais" subtitle={form.tpEmit === '2' ? 'Vincule as NF-e da carga própria, uma chave por linha.' : 'Vincule os CT-e desta viagem, uma chave por linha.'}>
          <label className="fe-label" htmlFor="mdfe-keys">
            Chaves de acesso <b aria-hidden="true">*</b>
          </label>
          <textarea
            id="mdfe-keys"
            value={form.keys}
            onChange={e => set('keys', e.target.value)}
            rows={7}
            className="fe-textarea"
            placeholder="Uma chave de 44 dígitos por linha"
          />
          {form.tpEmit === '1' && <div className="fe-form-grid mt-4">
<FiscalRecordPicker label="Cliente contratante do frete" value={form.contratanteId} items={transportRecords}
              onChange={value => set('contratanteId', value)} onCreate={() => onOpenCadastro?.('Clientes')}
              required={true} />
            <Field label="Valor do frete" value={form.vContrato} onChange={v => set('vContrato', v)} type="number" required />
            <Field label="Descrição da carga" value={form.xProd} onChange={v => set('xProd', v)} required />
            <FiscalCodeField kind="ncm" label="NCM predominante" value={form.ncmPredominante} onChange={v => set('ncmPredominante', v)} required />
            {parseAccessKeys(form.keys).length === 1 && <Field label="CEP de descarga" value={form.cepDescarga} onChange={v => set('cepDescarga', v)} required />}
            <Field label="Seguradora" value={form.seguradoraNome} onChange={v => set('seguradoraNome', v)} required />
            <Field label="CNPJ da seguradora" value={form.seguradoraCnpj} onChange={v => set('seguradoraCnpj', v)} required />
            <Field label="Apólice" value={form.apolice} onChange={v => set('apolice', v)} required />
            <Field label="Averbação" value={form.averbacao} onChange={v => set('averbacao', v)} required />
            <Field label="Chave Pix do frete" value={form.pixPagamento} onChange={v => set('pixPagamento', v)} hint="Opcional neste fluxo; não altera o valor da carga." />
          </div>}
          <div className="fe-form-grid mt-4">
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
          ['Emitente', profile?.trade_name || profile?.legal_name || '—'],
          ['Prestação', money(form.vTPrest)],
          ['Carga', `${money(form.vCarga)} · ${form.qCarga || 0} kg`],
          [
            'Rota',
            `${form.munIniNome || '—'}/${form.ufIni} → ${form.munFimNome || '—'}/${form.ufFim}`,
          ],
        ]
      : [
          ['Emitente', profile?.trade_name || profile?.legal_name || '—'],
          ['Veículo', form.plate || transportCarrier?.vehicle_plate || '—'],
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
    <>
      <div className="fe-emission-page ws-emission-workspace" data-release="fiscal-studio-20260912">
        <header className="fe-emission-title">
          <button onClick={() => onChoose(null)}>← Voltar</button>
          <div>
            <p>DOCUMENTOS / NOVA EMISSÃO</p>
            <h1>Nova <em>{documentType}</em></h1>
            <span>Prepare sua nota. Os dados do cadastro já vêm com você.</span>
          </div>
          <div className="fe-emission-title-tools">
            <button
              type="button"
              className="fe-reuse-trigger"
              onClick={() => {
                setReuseParts(reusablePartsDefault);
                setReuseOpen(true);
              }}
            >
              <Repeat2 />
              Usar nota anterior
            </button>
            <div className={`fe-environment ${environment}`}>
              {environment === 'production' ? 'Produção' : 'Homologação'}
            </div>
            <span className={`fe-draft-status ${draftStatus || ''}`} role="status">
              <i aria-hidden="true" />
              {draftCopy}
            </span>
          </div>
        </header>
        <IssuerSummary profile={profile} documentType={documentType} />
        <nav className="fe-workflow" aria-label="Progresso da nota">
        <TabBar
          tabs={tabs}
          active={tab}
          onChange={value => {
            if (busy || emissionAuthorized) return;
            const target = tabs.indexOf(value);
            if (target > step) {
              const issues = tabs.slice(0, target).flatMap((_, index) => issuesForStep(index));
              if (issues.length) { setStepAlert(`Confira: ${[...new Set(issues)].join(', ')}.`); return; }
            }
            setStepAlert('');
            setTab(value);
          }}
        />
        </nav>
        <div className={`ws-emission-grid ${last ? 'is-review' : ''}`}>
        <div className="ws-emission-editor" ref={editorRef}>
        {msg && <div className="fe-message" role="status">{msg}</div>}
        {stepAlert && (
          <div className="fe-step-alert" role="alert">
            <b>Antes de continuar</b>
            <span>{stepAlert}</span>
          </div>
        )}
        {last ? (
          <div className="fe-review-layout">
            <div>
              <div className="fe-review-summary">
                <p>Revisão final</p>
                <h2>Confira o documento antes de transmitir</h2>
                <span>Nenhuma informação será enviada até você usar o botão de transmissão.</span>
              </div>
              <div className="fe-review-facts">
                {reviewFacts.map(([label, value]) => (
                  <div key={label}>
                    <span>{label}</span>
                    <b>{value}</b>
                  </div>
                ))}
              </div>
              {allIssues.length > 0 && (
                <div className="fe-step-alert" role="alert">
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
          <main className="fe-step-page">
            {content}
            <div className="fe-step-actions">
              <Button variant="outline" disabled={step === 0} onClick={() => go(-1)}>
                Voltar
              </Button>
              <Button className="fe-btn-primary" disabled={!dataReady || busy} onClick={advance}>
                Continuar para {tabs[step + 1]}
              </Button>
            </div>
          </main>
        )}
        </div>
        {!last && <aside className="fe-summary-sheet" aria-label="Resumo da nota">
          <div className="fe-sheet-top"><FileText size={25} strokeWidth={1.3}/><span>{documentType}<small>EM PREPARAÇÃO</small></span></div>
          <dl><div><dt>Emitente</dt><dd>{profile?.trade_name || profile?.legal_name || 'Sua empresa'}</dd></div>
          <div><dt>{documentType === 'MDF-e' ? 'Condutor' : 'Destinatário'}</dt><dd>{customer?.legal_name || dest?.legal_name || (documentType === 'MDF-e' ? form.driverName : '') || 'A definir'}</dd></div>
          <div><dt>{documentType === 'NFS-e' ? 'Serviço' : documentType === 'CT-e' || documentType === 'MDF-e' ? 'Trajeto' : 'Produto'}</dt><dd>{(documentType === 'NFS-e' ? service?.name : documentType === 'CT-e' || documentType === 'MDF-e' ? (form.munFimNome || form.unloadName ? `${form.munIniNome} → ${form.munFimNome || form.unloadName}` : '') : product?.name) || 'A definir'}</dd></div></dl>
          <div className="fe-sheet-total"><span>{documentType === 'MDF-e' ? 'Valor da carga' : 'Total da nota'}</span><strong>{money(documentType === 'NF-e' || documentType === 'NFC-e' ? productTotal : documentType === 'NFS-e' ? form.value : documentType === 'CT-e' ? form.vTPrest : form.cargoValue)}</strong><small>Série {form.series} / Nº {form.number}</small></div>
          <p className="fe-sheet-note">Salvamento automático neste navegador. Continue depois em <b>Minhas notas</b>.</p>
        </aside>}
        </div>
      </div>
      {reuseOpen && (
        <div
          className="fe-reuse-backdrop"
          onMouseDown={event => {
            if (event.target === event.currentTarget) setReuseOpen(false);
          }}
        >
          <section
            className="fe-reuse-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="reuse-emission-title"
          >
            <header>
              <div>
                <p>Atalho de emissão</p>
                <h2 id="reuse-emission-title">Reutilizar uma {documentType} anterior</h2>
                <span>
                  Escolha o documento e quais informações deseja trazer para o novo rascunho.
                </span>
              </div>
              <button
                type="button"
                onClick={() => setReuseOpen(false)}
                aria-label="Fechar seleção de emissão"
              >
                <X />
              </button>
            </header>
            <div className="fe-reuse-options">
              {(
                [
                  ['people', 'Clientes e participantes'],
                  ['items', 'Itens, serviços ou carga'],
                  ['payment', 'Pagamento e valores'],
                  ['fiscal', 'Dados fiscais'],
                  ['transport', 'Transporte e rota'],
                ] as Array<[keyof ReusableParts, string]>
              ).map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={reuseParts[key]}
                    onChange={event =>
                      setReuseParts(current => ({ ...current, [key]: event.target.checked }))
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
            <div className="fe-reuse-search">
              <Search />
              <input
                autoFocus
                value={reuseSearch}
                onChange={event => setReuseSearch(event.target.value)}
                placeholder="Buscar por cliente, produto, serviço ou número..."
              />
            </div>
            <div className="fe-reuse-list">
              {reusableRows.length ? (
                reusableRows.map(emission => {
                  const payload = emission.payload || {};
                  const operation =
                    payload.produto ||
                    payload.descricao ||
                    payload.carga?.proPred ||
                    payload.proPred ||
                    payload.natOp ||
                    payload.munDescargaNome ||
                    'Documento fiscal';
                  return (
                    <article key={emission.id || emission.access_key}>
                      <div>
                        <p>
                          {documentType} nº {emission.number || '—'}
                          <span>{emissionDate(emission)}</span>
                        </p>
                        <h3>{emission.recipient_name || 'Sem destinatário informado'}</h3>
                        <small>{operation}</small>
                      </div>
                      <div>
                        <b>{money(emission.total)}</b>
                        <button
                          type="button"
                          onClick={() => applyReusableEmission(emission, reuseParts)}
                          disabled={!Object.values(reuseParts).some(Boolean)}
                        >
                          Usar como base
                        </button>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="fe-reuse-empty">
                  <Repeat2 />
                  <b>Nenhuma emissão reutilizável encontrada</b>
                  <span>
                    Somente documentos emitidos neste sistema, com os dados originais disponíveis,
                    podem ser usados como base.
                  </span>
                </div>
              )}
            </div>
            <footer>
              <span>
                Série, número, data, chave, protocolo e XML nunca são copiados para a nova emissão.
              </span>
              <Button variant="outline" onClick={() => setReuseOpen(false)}>
                Cancelar
              </Button>
            </footer>
          </section>
        </div>
      )}
    </>
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
          descricao: form.description || service?.name,
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
    <aside className="fe-preview">
      <div className="fe-preview-head">
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
      <div className="fe-preview-paper">
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
