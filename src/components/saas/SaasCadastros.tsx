import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Mail,
  MapPin,
  Package2,
  Phone,
  Plus,
  Search,
  Truck,
  UsersRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import SaasCustomerEditor from '@/components/saas/SaasCustomerEditor';
import SaasRegisterAppearance, { readableText } from '@/components/saas/SaasRegisterAppearance';
import SaasCnpjLookup from '@/components/saas/SaasCnpjLookup';

export type CadastroSection =
  | 'Clientes'
  | 'Fornecedores'
  | 'Produtos'
  | 'Serviços'
  | 'Transportadoras';

type Props = { organizationId: string | null; section: CadastroSection };

const partyTypeBySection: Record<string, string> = {
  Clientes: 'customer',
  Fornecedores: 'supplier',
  Transportadoras: 'carrier',
};
const numeric = [
  'sale_price',
  'cost_price',
  'icms_rate',
  'icms_reduction_rate',
  'ipi_rate',
  'pis_rate',
  'cofins_rate',
  'iss_rate',
  'approximate_tax_rate',
  'stock_quantity',
  'stock_minimum',
  'weight_net',
  'weight_gross',
];
const inputClass = 'mt-1.5 h-10 border-[#d7dde5] bg-white text-sm text-[#10203e]';

const blankParty = (section: CadastroSection) => ({
  status: 'active',
  person_type: 'legal',
  legal_name: '',
  trade_name: '',
  tax_id: '',
  state_registration: '',
  municipal_registration: '',
  ie_indicator: '',
  tax_regime: '',
  email: '',
  phone: '',
  mobile: '',
  contact_name: '',
  website: '',
  postal_code: '',
  street: '',
  street_number: '',
  complement: '',
  district: '',
  city: '',
  state: '',
  country: 'Brasil',
  city_ibge_code: '',
  country_code: '1058',
  final_consumer: section === 'Clientes',
  icms_taxpayer: false,
  billing_email: '',
  payment_terms: '',
  credit_limit: '',
  bank_name: '',
  bank_branch: '',
  bank_account: '',
  pix_key: '',
  rntrc: '',
  antt_category: '',
  vehicle_plate: '',
  vehicle_state: '',
  freight_default_mode: '',
  notes: '',
  metadata: { card_color: '#ffffff' },
});

const blankCatalog = (section: CadastroSection) => ({
  status: 'active',
  code: '',
  name: '',
  description: '',
  unit: section === 'Produtos' ? 'UN' : '',
  sale_price: '',
  cost_price: '',
  gtin: '',
  ncm: '',
  cest: '',
  product_origin: '0',
  cfop_in_state: '',
  cfop_out_state: '',
  icms_cst: '',
  csosn: '',
  icms_rate: '',
  icms_reduction_rate: '',
  ipi_cst: '',
  ipi_rate: '',
  pis_cst: '',
  pis_rate: '',
  cofins_cst: '',
  cofins_rate: '',
  service_code_national: '',
  service_code_municipal: '',
  cnae: '',
  iss_rate: '',
  iss_withheld: false,
  inss_withheld: false,
  ir_withheld: false,
  csll_withheld: false,
  pis_withheld: false,
  cofins_withheld: false,
  approximate_tax_rate: '',
  stock_managed: false,
  stock_quantity: '',
  stock_minimum: '',
  weight_net: '',
  weight_gross: '',
  fiscal_notes: '',
  metadata: { card_color: '#ffffff' },
});

const money = (value: any) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const onlyDigits = (value: any) => String(value || '').replace(/\D/g, '');
const formatTaxId = (value: any) => {
  const d = onlyDigits(value);
  if (d.length === 11) return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  if (d.length === 14)
    return d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
  return value || '—';
};
const singular = (section: CadastroSection) =>
  ({
    Clientes: 'cliente',
    Fornecedores: 'fornecedor',
    Produtos: 'produto',
    Serviços: 'serviço',
    Transportadoras: 'transportadora',
  } as Record<CadastroSection, string>)[section];
const supportsImage = (section: CadastroSection) =>
  section === 'Clientes' || section === 'Fornecedores' || section === 'Produtos';
const imageLabel = (section: CadastroSection) =>
  section === 'Produtos' ? 'Foto do produto' : section === 'Clientes' ? 'Foto ou logomarca do cliente' : 'Foto ou logomarca do fornecedor';

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required = false,
  hint,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-[#344054]">
        {label}
        {required && <b className="text-[#b42318]"> *</b>}
      </span>
      <Input
        type={type}
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        placeholder={placeholder}
        className={inputClass}
      />
      {hint && <small className="ca-field-hint">{hint}</small>}
    </label>
  );
}

function SelectField({
  label,
  value,
  onChange,
  options,
  required = false,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
  required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-[11px] font-medium text-[#344054]">
        {label}
        {required && <b className="text-[#b42318]"> *</b>}
      </span>
      <select
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-[8px] border border-[#d7dde5] bg-white px-3 text-sm text-[#10203e]"
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center justify-between rounded-[8px] border border-[#dce2e9] bg-[#f8fafb] px-3 py-2.5 text-xs font-medium text-[#344054]">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={event => onChange(event.target.checked)} className="h-4 w-4" />
    </label>
  );
}

function Section({ title, children, description }: { title: string; children: any; description?: string }) {
  return (
    <section className="rounded-xl border border-[#dce2e9] bg-white p-4 sm:p-5">
      <div className="mb-4 border-b border-[#edf0f3] pb-3">
        <p className="text-sm font-semibold text-[#17233b]">{title}</p>
        {description && <span className="mt-1 block text-[11px] leading-5 text-[#7a8698]">{description}</span>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function SaasCadastros({ organizationId, section }: Props) {
  const isCatalog = section === 'Produtos' || section === 'Serviços';
  const [rows, setRows] = useState<any[]>([]);
  const [form, setForm] = useState<any>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const hydrateImages = async (data: any[]) => {
    const paths = Array.from(
      new Set(data.map(row => row?.metadata?.image_path).filter((value: any) => Boolean(value)))
    ) as string[];
    if (!paths.length) return data;
    const { data: signed } = await supabase.storage.from('saas-private').createSignedUrls(paths, 3600);
    const urls = new Map<string, string>();
    (signed || []).forEach((item: any) => {
      if (item?.path && item?.signedUrl) urls.set(item.path, item.signedUrl);
    });
    return data.map(row => ({ ...row, __imageUrl: urls.get(row?.metadata?.image_path) || null }));
  };

  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const table = isCatalog ? 'saas_fiscal_catalog_items' : 'saas_fiscal_parties';
      let query = (supabase as any).from(table).select('*').eq('organization_id', organizationId);
      query = isCatalog
        ? query.eq('item_type', section === 'Produtos' ? 'product' : 'service')
        : query.eq('party_type', partyTypeBySection[section]);
      const { data, error } = await query.order(isCatalog ? 'name' : 'legal_name');
      if (error) throw error;
      setRows(await hydrateImages(data || []));
    } catch (error: any) {
      setMessage(error.message || 'Não foi possível carregar os cadastros.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setForm(null);
    setSearch('');
    setMessage('');
    setPendingImage(null);
    setImagePreview(null);
    setImageRemoved(false);
    void load();
  }, [organizationId, section]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter(row => {
      const text = isCatalog
        ? [row.name, row.code, row.description, row.ncm, row.cnae, row.service_code_national]
        : [
            row.legal_name,
            row.trade_name,
            row.tax_id,
            row.email,
            row.phone,
            row.city,
            row.state,
            row.state_registration,
            row.rntrc,
            row.vehicle_plate,
          ];
      return text.some(value => String(value || '').toLowerCase().includes(query));
    });
  }, [rows, search, isCatalog]);

  const activeCount = rows.filter(row => row.status !== 'inactive').length;
  const inactiveCount = rows.length - activeCount;

  const set = (key: string, value: any) => {
    if (
      [
        'tax_id',
        'postal_code',
        'city_ibge_code',
        'rntrc',
        'service_code_national',
        'service_code_municipal',
        'cnae',
        'ncm',
        'cest',
      ].includes(key)
    )
      value = String(value).replace(/\D/g, '');
    if (key === 'tax_id') value = value.slice(0, 14);
    if (key === 'postal_code') value = value.slice(0, 8);
    if (key === 'city_ibge_code') value = value.slice(0, 7);
    if (['state', 'vehicle_state'].includes(key))
      value = String(value).toUpperCase().replace(/[^A-Z]/g, '').slice(0, 2);
    if (key === 'vehicle_plate')
      value = String(value).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7);
    setMessage('');
    setForm((previous: any) => ({ ...previous, [key]: value }));
  };

  const setMeta = (key: string, value: any) => {
    setMessage('');
    setForm((previous: any) => ({
      ...previous,
      metadata: { ...(previous?.metadata || {}), [key]: value },
    }));
  };

  const applyCnpjLookup = (lookup: any, meta: any = {}) => {
    const keys = [
      'legal_name',
      'trade_name',
      'tax_id',
      'state_registration',
      'ie_indicator',
      'icms_taxpayer',
      'tax_regime',
      'email',
      'phone',
      'postal_code',
      'street',
      'street_number',
      'complement',
      'district',
      'city',
      'state',
      'city_ibge_code',
    ];
    setForm((previous: any) => {
      const next = { ...previous, person_type: 'legal' };
      for (const key of keys) {
        const value = lookup?.[key];
        if (value !== undefined && value !== null && String(value).trim() !== '') next[key] = value;
      }
      if (lookup?.state_registration) {
        next.ie_indicator = lookup.ie_indicator || '1';
        next.icms_taxpayer = lookup.icms_taxpayer !== false;
      }
      const registry = meta?.registry || lookup?.registry || {};
      next.metadata = {
        ...(previous?.metadata || {}),
        registry_lookup: registry,
        registry_sources: meta?.sources || {},
        registry_cnae_primary: lookup?.cnae_primary || registry?.primary_cnae_code || '',
        registry_updated_at: new Date().toISOString(),
      };
      return next;
    });
    const sourceCount = Array.isArray(meta?.sources?.federal) ? meta.sources.federal.length : 0;
    const filledCount = Array.isArray(meta?.filled_fields) ? meta.filled_fields.length : 0;
    setMessage(lookup?.state_registration
      ? `Consulta concluída: ${filledCount || 'vários'} campos preenchidos por ${sourceCount || 1} fonte(s), incluindo IE ${lookup.state_registration}.`
      : `Consulta concluída: ${filledCount || 'vários'} campos preenchidos. A IE não foi localizada nas fontes disponíveis.`);
  };

  const resetImageState = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setPendingImage(null);
    setImagePreview(null);
    setImageRemoved(false);
  };

  const open = (row: any) => {
    resetImageState();
    setForm({ ...row, metadata: { ...(row.metadata || {}), card_color: row?.metadata?.card_color || '#ffffff' } });
    setImagePreview(row.__imageUrl || null);
    setMessage('');
  };

  const create = () => {
    resetImageState();
    setForm(isCatalog ? blankCatalog(section) : blankParty(section));
    setMessage('');
  };

  const close = () => {
    resetImageState();
    setForm(null);
    setMessage('');
  };

  const chooseImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setMessage('A imagem deve ter no máximo 5 MB.');
      return;
    }
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setPendingImage(file);
    setImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
    setMessage('');
  };

  const removeImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setPendingImage(null);
    setImagePreview(null);
    setImageRemoved(true);
  };

  const save = async () => {
    if (!organizationId || !form) return;
    const required: Array<[any, string]> = isCatalog
      ? [
          [form.name, 'nome'],
          [form.code, 'código interno'],
          [Number(form.sale_price) > 0, 'valor padrão'],
          ...(section === 'Serviços'
            ? ([
                [form.service_code_national, 'código nacional do serviço'],
                [form.description, 'descrição para a NFS-e'],
              ] as Array<[any, string]>)
            : []),
        ]
      : [
          [form.legal_name, 'razão social / nome'],
          [form.person_type === 'foreign' || String(form.tax_id || '').length >= 11, 'CNPJ / CPF'],
          [form.city, 'cidade'],
          [String(form.state || '').length === 2, 'UF'],
          [String(form.city_ibge_code || '').length === 7, 'código IBGE'],
          ...(section === 'Transportadoras'
            ? ([
                [form.rntrc, 'RNTRC'],
                [String(form.vehicle_plate || '').length === 7, 'placa padrão'],
              ] as Array<[any, string]>)
            : []),
        ];
    const missing = required.filter(([value]) => !value).map(([, label]) => label);
    if (missing.length) return setMessage(`Complete ${missing.join(', ')} antes de salvar.`);

    setSaving(true);
    setMessage('');
    let uploadedPath: string | null = null;
    const previousPath = form?.metadata?.image_path || null;
    try {
      let nextImagePath = imageRemoved ? null : previousPath;
      if (pendingImage && supportsImage(section)) {
        const extension = (pendingImage.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        const folder = isCatalog ? 'products' : partyTypeBySection[section] || 'parties';
        uploadedPath = `${organizationId}/cadastros/${folder}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('saas-private')
          .upload(uploadedPath, pendingImage, { contentType: pendingImage.type || undefined, upsert: false });
        if (uploadError) throw uploadError;
        nextImagePath = uploadedPath;
      }

      const table = isCatalog ? 'saas_fiscal_catalog_items' : 'saas_fiscal_parties';
      const payload: any = {
        ...form,
        metadata: {
          ...(form.metadata || {}),
          card_color: form?.metadata?.card_color || '#ffffff',
          image_path: nextImagePath,
        },
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      };
      delete payload.__imageUrl;
      if (isCatalog) {
        payload.item_type = section === 'Produtos' ? 'product' : 'service';
        numeric.forEach(
          key => (payload[key] = payload[key] === '' || payload[key] == null ? null : Number(payload[key]))
        );
      } else {
        payload.party_type = partyTypeBySection[section];
        payload.credit_limit =
          payload.credit_limit === '' || payload.credit_limit == null ? null : Number(payload.credit_limit);
      }
      delete payload.created_at;
      const id = payload.id;
      delete payload.id;
      const { error } = id
        ? await (supabase as any).from(table).update(payload).eq('id', id)
        : await (supabase as any).from(table).insert(payload);
      if (error) throw error;

      if (previousPath && previousPath !== nextImagePath) {
        await supabase.storage.from('saas-private').remove([previousPath]).catch(() => null);
      }
      await load();
      close();
      setMessage('Cadastro salvo.');
    } catch (error: any) {
      if (uploadedPath) await supabase.storage.from('saas-private').remove([uploadedPath]).catch(() => null);
      setMessage(error.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    if (!form?.id) return;
    const name = isCatalog ? form.name : form.legal_name;
    if (!window.confirm(`Excluir ${name}?`)) return;
    const { error } = await (supabase as any)
      .from(isCatalog ? 'saas_fiscal_catalog_items' : 'saas_fiscal_parties')
      .delete()
      .eq('id', form.id);
    if (error) return setMessage(error.message);
    if (form?.metadata?.image_path)
      await supabase.storage.from('saas-private').remove([form.metadata.image_path]).catch(() => null);
    await load();
    close();
    setMessage('Cadastro excluído.');
  };

  const subtitle =
    section === 'Serviços'
      ? 'Serviços com preço, classificação, ISS e retenções prontos para reutilizar na NFS-e.'
      : section === 'Produtos'
      ? 'Catálogo fiscal com preços, classificação e estoque.'
      : `Dados cadastrais, fiscais e comerciais de ${section.toLowerCase()} disponíveis em todas as emissões.`;

  if (!organizationId)
    return <div className="py-20 text-center text-sm text-muted-foreground">Nenhuma organização fiscal disponível.</div>;

  if (form) {
    const title = (isCatalog ? form.name : form.legal_name) || `Novo ${singular(section)}`;
    return (
      <div className="mx-auto w-full max-w-[1280px] space-y-5 pb-28">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#dbe1e8] pb-5">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={close}
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d7dde5] bg-white text-[#536077] transition hover:bg-[#f7f9fb]"
              aria-label={`Voltar para ${section}`}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#718096]">
                Cadastros / {section}
              </p>
              <h1 className="mt-1 truncate text-[27px] font-semibold text-[#17233b]">{title}</h1>
              <p className="mt-1 text-sm text-[#667085]">
                {form.id ? `Edite todos os dados deste ${singular(section)} em uma página dedicada.` : `Cadastre um novo ${singular(section)} sem dividir a tela com a listagem.`}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${form.status === 'inactive' ? 'bg-[#eef0f3] text-[#667085]' : 'bg-[#e7f6ef] text-[#167a5b]'}`}>
            {form.status === 'inactive' ? 'Inativo' : 'Ativo'}
          </span>
        </header>

        {message && (
          <div role="status" className="rounded-[9px] border border-[#dce2e9] bg-white px-4 py-3 text-xs text-[#536077]">
            {message}
          </div>
        )}

        <SaasRegisterAppearance
          allowImage={supportsImage(section)}
          imageUrl={imagePreview || form.__imageUrl || null}
          cardColor={form?.metadata?.card_color || '#ffffff'}
          onImageChange={chooseImage}
          onRemoveImage={removeImage}
          onColorChange={color => setMeta('card_color', color)}
          imageLabel={imageLabel(section)}
        />

        {!isCatalog && form.person_type === 'legal' && (
          <SaasCnpjLookup
            organizationId={organizationId}
            value={form.tax_id || ''}
            onChange={value => set('tax_id', value)}
            onResolved={(data, meta) => applyCnpjLookup(data, meta)}
            mode="party"
          />
        )}

        {!isCatalog && form.person_type === 'legal' && <OfficialRegistrySummary form={form} />}

        {section === 'Clientes' ? (
          <div className="rounded-xl border border-[#dce2e9] bg-white px-4 sm:px-6">
            <SaasCustomerEditor form={form} set={set} hideTaxIdForLegal />
          </div>
        ) : isCatalog ? (
          <CatalogEditor section={section} form={form} set={set} />
        ) : (
          <PartyEditor section={section} form={form} set={set} hideTaxIdForLegal />
        )}

        <div className="fixed bottom-0 right-0 z-30 border-t border-[#d9e0e7] bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,.06)] backdrop-blur md:left-72">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={close} className="saas-action-secondary">Cancelar</Button>
            {form.id && (
              <Button variant="outline" onClick={() => void remove()} className="saas-action-secondary">Excluir</Button>
            )}
            <Button onClick={() => void save()} disabled={saving} className="saas-action-primary">
              {saving ? 'Salvando...' : `Salvar ${singular(section)}`}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dbe1e8] pb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#718096]">Cadastros</p>
          <h1 className="mt-1 text-[28px] font-semibold text-[#17233b]">{section}</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#667085]">{subtitle}</p>
        </div>
        <Button onClick={create} className="saas-action-primary">
          <Plus className="mr-2 h-4 w-4" />
          Novo {singular(section)}
        </Button>
      </header>

      {message && (
        <div role="status" className="rounded-[9px] border border-[#dce2e9] bg-white px-4 py-3 text-xs text-[#536077]">{message}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-3">
        <Metric label="Total cadastrados" value={String(rows.length)} />
        <Metric label="Ativos" value={String(activeCount)} />
        <Metric label="Inativos" value={String(inactiveCount)} />
      </div>

      <section className="rounded-xl border border-[#dce2e9] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#17233b]">Todos os {section.toLowerCase()}</h2>
            <p className="mt-1 text-[11px] text-[#7a8698]">Clique em qualquer card para abrir a página completa de edição.</p>
          </div>
          <div className="relative w-full max-w-[420px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
            <Input
              value={search}
              onChange={event => setSearch(event.target.value)}
              placeholder={`Buscar ${section.toLowerCase()} por nome, documento ou informação fiscal...`}
              className="h-10 border-[#d8dfe7] bg-[#fbfcfd] pl-9 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="py-16 text-center text-sm text-[#7a8698]">Carregando...</div>
        ) : !filtered.length ? (
          <div className="py-16 text-center">
            <p className="text-sm font-semibold text-[#344054]">Nenhum cadastro encontrado.</p>
            <p className="mt-1 text-xs text-[#8a95a5]">Crie o primeiro registro para reaproveitar os dados nas emissões.</p>
            <Button onClick={create} variant="outline" className="mt-5 saas-action-secondary">Criar cadastro</Button>
          </div>
        ) : (
          <div className="mt-5 grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {filtered.map(row => (
              <RegisterCard key={row.id} section={section} row={row} onClick={() => open(row)} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#dce2e9] bg-white px-4 py-3">
      <p className="text-[9px] font-semibold uppercase tracking-[.11em] text-[#7a8698]">{label}</p>
      <p className="mt-1.5 text-xl font-semibold text-[#17233b]">{value}</p>
    </div>
  );
}

function RegisterCard({ section, row, onClick }: { section: CadastroSection; row: any; onClick: () => void }) {
  const background = row?.metadata?.card_color || '#ffffff';
  const foreground = readableText(background);
  const dark = foreground === '#ffffff';
  const title = section === 'Serviços' || section === 'Produtos' ? row.name : row.legal_name;
  const subtitle = section === 'Serviços' || section === 'Produtos' ? row.description : row.trade_name;
  const initials = String(title || singular(section))
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase();
  const Icon = section === 'Clientes' ? UsersRound : section === 'Fornecedores' ? Building2 : section === 'Transportadoras' ? Truck : Package2;
  const lines = cardDetails(section, row);
  const subtle = dark ? 'rgba(255,255,255,.76)' : 'rgba(23,35,59,.67)';
  const border = dark ? 'rgba(255,255,255,.24)' : 'rgba(15,23,42,.12)';
  const panel = dark ? 'rgba(255,255,255,.11)' : 'rgba(255,255,255,.52)';

  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-[224px] overflow-hidden rounded-xl border p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,.04)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,.09)]"
      style={{ backgroundColor: background, color: foreground, borderColor: border }}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-xl border text-sm font-semibold" style={{ borderColor: border, backgroundColor: panel }}>
          {row.__imageUrl ? <img src={row.__imageUrl} alt="" className="h-full w-full object-cover" /> : initials ? initials : <Icon className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{title || 'Sem nome'}</h3>
              <p className="mt-1 truncate text-[11px]" style={{ color: subtle }}>{subtitle || primaryLine(section, row)}</p>
            </div>
            <span className="shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold" style={{ backgroundColor: panel }}>
              {row.status === 'inactive' ? 'Inativo' : 'Ativo'}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {lines.map((item, index) => (
          <div key={`${item.label}-${index}`} className="min-w-0 rounded-lg border px-3 py-2.5" style={{ borderColor: border, backgroundColor: panel }}>
            <span className="block text-[8px] font-semibold uppercase tracking-[.08em]" style={{ color: subtle }}>{item.label}</span>
            <b className="mt-1 block truncate text-[11px] font-semibold">{item.value || '—'}</b>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px]" style={{ color: subtle }}>
        <span>{row.updated_at ? `Atualizado em ${new Date(row.updated_at).toLocaleDateString('pt-BR')}` : 'Cadastro fiscal'}</span>
        <span className="font-semibold transition group-hover:translate-x-0.5">Abrir cadastro →</span>
      </div>
    </button>
  );
}

function primaryLine(section: CadastroSection, row: any) {
  if (section === 'Serviços') return [row.code, row.service_code_national].filter(Boolean).join(' · ') || 'Serviço fiscal';
  if (section === 'Produtos') return [row.code, row.ncm].filter(Boolean).join(' · ') || 'Produto fiscal';
  return [formatTaxId(row.tax_id), row.city, row.state].filter(Boolean).join(' · ');
}

function cardDetails(section: CadastroSection, row: any) {
  if (section === 'Clientes')
    return [
      { label: 'Documento', value: formatTaxId(row.tax_id) },
      { label: 'Localização', value: [row.city, row.state].filter(Boolean).join(' / ') },
      { label: 'Contato', value: row.email || row.phone || row.mobile },
      { label: 'Inscrição estadual', value: row.state_registration || ({ '1': 'Contribuinte', '2': 'Isento', '9': 'Não contribuinte' } as any)[row.ie_indicator] },
    ];
  if (section === 'Fornecedores')
    return [
      { label: 'Documento', value: formatTaxId(row.tax_id) },
      { label: 'Localização', value: [row.city, row.state].filter(Boolean).join(' / ') },
      { label: 'Contato', value: row.email || row.phone || row.mobile },
      { label: 'Condição', value: row.payment_terms || row.pix_key || '—' },
    ];
  if (section === 'Transportadoras')
    return [
      { label: 'Documento', value: formatTaxId(row.tax_id) },
      { label: 'RNTRC', value: row.rntrc },
      { label: 'Veículo padrão', value: [row.vehicle_plate, row.vehicle_state].filter(Boolean).join(' / ') },
      { label: 'Contato', value: row.email || row.phone || row.city },
    ];
  if (section === 'Serviços')
    return [
      { label: 'Código', value: row.code },
      { label: 'Valor padrão', value: money(row.sale_price) },
      { label: 'Código nacional', value: row.service_code_national },
      { label: 'Tributação', value: row.iss_rate != null ? `ISS ${row.iss_rate}%` : row.cnae || '—' },
    ];
  return [
    { label: 'SKU', value: row.code },
    { label: 'Venda', value: money(row.sale_price) },
    { label: 'NCM', value: row.ncm },
    { label: 'Estoque', value: row.stock_managed ? `${row.stock_quantity || 0} ${row.unit || 'UN'}` : 'Sem controle' },
  ];
}

function OfficialRegistrySummary({ form }: { form: any }) {
  const registry = form?.metadata?.registry_lookup;
  if (!registry || typeof registry !== 'object' || !Object.keys(registry).length) return null;
  const sources = form?.metadata?.registry_sources || {};
  const federalSources = Array.isArray(sources?.federal) ? sources.federal : [];
  const regimeNames: Record<string, string> = { simples: 'Simples Nacional', mei: 'MEI', presumido: 'Lucro Presumido', real: 'Lucro Real' };
  const formatDate = (value: any) => {
    if (!value) return '';
    const raw = String(value).slice(0, 10);
    const parts = raw.split('-');
    return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : String(value);
  };
  const facts = [
    { label: 'Situação na Receita', value: registry.registration_status },
    { label: 'Início da atividade', value: formatDate(registry.opening_date) },
    { label: 'Estabelecimento', value: registry.establishment_type },
    { label: 'Natureza jurídica', value: [registry.legal_nature_code, registry.legal_nature].filter(Boolean).join(' · ') },
    { label: 'Porte', value: registry.company_size },
    { label: 'Capital social', value: registry.share_capital ? money(registry.share_capital) : '' },
    { label: 'CNAE principal', value: [registry.primary_cnae_code, registry.primary_cnae_description].filter(Boolean).join(' · ') },
    { label: 'Regime tributário', value: form.tax_regime ? `${regimeNames[form.tax_regime] || form.tax_regime}${registry.tax_regime_year ? ` · ${registry.tax_regime_year}` : ''}` : registry.tax_regime_label },
    { label: 'Simples / MEI', value: registry.mei ? 'MEI' : registry.simples ? 'Optante pelo Simples' : registry.simples === false ? 'Não optante' : '' },
    { label: 'Situação da IE', value: registry.state_registry_status },
  ].filter(item => item.value !== undefined && item.value !== null && String(item.value).trim() !== '');
  const qsa = Array.isArray(registry.qsa) ? registry.qsa.slice(0, 6) : [];
  const secondaryCnaes = Array.isArray(registry.secondary_cnaes) ? registry.secondary_cnaes : [];

  return (
    <section className="overflow-hidden rounded-xl border border-[#c8d0d8] bg-[#e9edf0]">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#cbd3da] bg-[#dce2e7] px-4 py-3.5 sm:px-5">
        <div>
          <p className="text-[9px] font-semibold uppercase tracking-[.12em] text-[#667085]">Consulta cadastral</p>
          <h3 className="mt-1 text-sm font-semibold text-[#17233b]">Dados oficiais encontrados</h3>
          <p className="mt-1 text-[11px] text-[#667085]">Informações complementares preservadas junto ao cadastro para conferência.</p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {federalSources.map((source: string) => <span key={source} className="rounded-full border border-[#b9c3cc] bg-[#f0f2f4] px-2 py-1 text-[9px] font-semibold text-[#536077]">{source}</span>)}
          {sources?.state && <span className="rounded-full border border-[#b9c3cc] bg-[#f0f2f4] px-2 py-1 text-[9px] font-semibold text-[#536077]">{sources.state}</span>}
        </div>
      </div>
      <div className="p-4 sm:p-5">
        {facts.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {facts.map(item => (
              <div key={item.label} className="min-w-0 rounded-lg border border-[#ccd4db] bg-[#f3f5f6] px-3 py-2.5">
                <span className="block text-[8px] font-semibold uppercase tracking-[.08em] text-[#7a8698]">{item.label}</span>
                <b className="mt-1 block break-words text-[11px] font-semibold leading-4 text-[#344054]">{item.value}</b>
              </div>
            ))}
          </div>
        )}
        {(qsa.length > 0 || secondaryCnaes.length > 0) && (
          <div className="mt-3 grid gap-3 lg:grid-cols-2">
            {qsa.length > 0 && (
              <div className="rounded-lg border border-[#ccd4db] bg-[#eef1f3] p-3">
                <p className="text-[9px] font-semibold uppercase tracking-[.08em] text-[#667085]">Quadro societário</p>
                <div className="mt-2 space-y-1.5">
                  {qsa.map((item: any, index: number) => (
                    <div key={`${item.name}-${index}`} className="flex items-start justify-between gap-3 text-[10px]">
                      <span className="font-medium text-[#344054]">{item.name}</span>
                      <span className="text-right text-[#7a8698]">{item.qualification || 'Sócio / administrador'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {secondaryCnaes.length > 0 && (
              <div className="rounded-lg border border-[#ccd4db] bg-[#eef1f3] p-3">
                <p className="text-[9px] font-semibold uppercase tracking-[.08em] text-[#667085]">Atividades secundárias</p>
                <p className="mt-2 text-[11px] font-semibold text-[#344054]">{secondaryCnaes.length} CNAE(s) encontrado(s)</p>
                <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-[#7a8698]">{secondaryCnaes.slice(0, 3).map((item: any) => [item.code, item.description].filter(Boolean).join(' · ')).join('  •  ')}</p>
              </div>
            )}
          </div>
        )}
        <p className="mt-3 text-[10px] leading-4 text-[#7a8698]">Dados internos como contato responsável, WhatsApp, banco, PIX, limite de crédito e condição de pagamento continuam manuais quando não existe fonte pública confiável.</p>
      </div>
    </section>
  );
}

function PartyEditor({ section, form, set, hideTaxIdForLegal = false }: { section: CadastroSection; form: any; set: (key: string, value: any) => void; hideTaxIdForLegal?: boolean }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Identificação" description="Dados usados para localizar e identificar o cadastro.">
        <SelectField
          label="Tipo"
          value={form.person_type}
          onChange={value => set('person_type', value)}
          options={[
            ['legal', 'Pessoa jurídica'],
            ['individual', 'Pessoa física'],
            ['foreign', 'Exterior'],
          ]}
        />
        <Field label="Razão social / nome" value={form.legal_name} onChange={value => set('legal_name', value)} required />
        <Field label="Nome fantasia" value={form.trade_name} onChange={value => set('trade_name', value)} />
        {(!hideTaxIdForLegal || form.person_type !== 'legal') && (
          <Field label={form.person_type === 'individual' ? 'CPF' : 'CNPJ / CPF'} value={form.tax_id} onChange={value => set('tax_id', value)} required hint="Digite somente números." />
        )}
        <Field label="Contato" value={form.contact_name} onChange={value => set('contact_name', value)} hint="Contato interno/comercial; não é inferido automaticamente pelo quadro societário." />
        <SelectField
          label="Situação"
          value={form.status}
          onChange={value => set('status', value)}
          options={[
            ['active', 'Ativo'],
            ['inactive', 'Inativo'],
          ]}
        />
      </Section>

      <Section title="Fiscal" description="Tributação reaproveitada automaticamente nas emissões.">
        <Field label="Inscrição estadual" value={form.state_registration} onChange={value => set('state_registration', value)} />
        <Field label="Inscrição municipal" value={form.municipal_registration} onChange={value => set('municipal_registration', value)} hint="Não existe uma consulta nacional única; informe quando necessário." />
        <SelectField
          label="Regime tributário"
          value={form.tax_regime}
          onChange={value => set('tax_regime', value)}
          options={[
            ['', 'Não informado'],
            ['simples', 'Simples Nacional'],
            ['presumido', 'Lucro Presumido'],
            ['real', 'Lucro Real'],
            ['mei', 'MEI'],
          ]}
        />
        <SelectField
          label="Indicador IE"
          value={form.ie_indicator}
          onChange={value => set('ie_indicator', value)}
          options={[
            ['', 'Não informado'],
            ['1', 'Contribuinte'],
            ['2', 'Isento'],
            ['9', 'Não contribuinte'],
          ]}
        />
        <Toggle label="Consumidor final" checked={!!form.final_consumer} onChange={value => set('final_consumer', value)} />
        <Toggle label="Contribuinte ICMS" checked={!!form.icms_taxpayer} onChange={value => set('icms_taxpayer', value)} />
      </Section>

      <Section title="Contato" description="Canais usados pela equipe e no faturamento.">
        <Field label="E-mail" value={form.email} onChange={value => set('email', value)} />
        <Field label="E-mail fiscal" value={form.billing_email} onChange={value => set('billing_email', value)} />
        <Field label="Telefone" value={form.phone} onChange={value => set('phone', value)} />
        <Field label="WhatsApp" value={form.mobile} onChange={value => set('mobile', value)} />
        <div className="md:col-span-2">
          <Field label="Site" value={form.website} onChange={value => set('website', value)} />
        </div>
      </Section>

      <Section title="Endereço" description="Endereço fiscal do cadastro.">
        <Field label="CEP" value={form.postal_code} onChange={value => set('postal_code', value)} hint="Somente números." />
        <Field label="Logradouro" value={form.street} onChange={value => set('street', value)} />
        <Field label="Número" value={form.street_number} onChange={value => set('street_number', value)} />
        <Field label="Bairro" value={form.district} onChange={value => set('district', value)} />
        <Field label="Cidade" value={form.city} onChange={value => set('city', value)} required />
        <Field label="UF" value={form.state} onChange={value => set('state', value)} required />
        <Field label="Código IBGE" value={form.city_ibge_code} onChange={value => set('city_ibge_code', value)} required hint="Código IBGE de 7 dígitos." />
        <Field label="Complemento" value={form.complement} onChange={value => set('complement', value)} />
      </Section>

      {section === 'Fornecedores' && (
        <Section title="Comercial e pagamento" description="Informações úteis para compras e relacionamento com o fornecedor.">
          <Field label="Condição de pagamento" value={form.payment_terms} onChange={value => set('payment_terms', value)} />
          <Field label="Limite de crédito" value={form.credit_limit} onChange={value => set('credit_limit', value)} type="number" />
          <Field label="Banco" value={form.bank_name} onChange={value => set('bank_name', value)} />
          <Field label="Agência" value={form.bank_branch} onChange={value => set('bank_branch', value)} />
          <Field label="Conta" value={form.bank_account} onChange={value => set('bank_account', value)} />
          <Field label="Chave PIX" value={form.pix_key} onChange={value => set('pix_key', value)} />
        </Section>
      )}

      {section === 'Transportadoras' && (
        <Section title="Transporte" description="Dados preenchidos automaticamente no CT-e e MDF-e.">
          <Field label="RNTRC" value={form.rntrc} onChange={value => set('rntrc', value)} required />
          <SelectField
            label="Categoria ANTT"
            value={form.antt_category}
            onChange={value => set('antt_category', value)}
            options={[
              ['', 'Selecione'],
              ['TAC', 'Transportador autônomo'],
              ['ETC', 'Empresa de transporte'],
              ['CTC', 'Cooperativa de transporte'],
            ]}
          />
          <Field label="Placa padrão" value={form.vehicle_plate} onChange={value => set('vehicle_plate', value)} required />
          <Field label="UF veículo" value={form.vehicle_state} onChange={value => set('vehicle_state', value)} />
          <SelectField
            label="Modal padrão"
            value={form.freight_default_mode}
            onChange={value => set('freight_default_mode', value)}
            options={[
              ['', 'Selecione'],
              ['01', 'Rodoviário'],
              ['02', 'Aéreo'],
              ['03', 'Aquaviário'],
              ['04', 'Ferroviário'],
            ]}
          />
        </Section>
      )}

      <Section title="Observações" description="Informações internas; não serão transmitidas no documento fiscal.">
        <div className="md:col-span-2">
          <textarea
            rows={5}
            value={form.notes || ''}
            onChange={event => set('notes', event.target.value)}
            className="w-full rounded-[8px] border border-[#d7dde5] bg-white p-3 text-sm"
          />
        </div>
      </Section>
    </div>
  );
}

function CatalogEditor({ section, form, set }: { section: CadastroSection; form: any; set: (key: string, value: any) => void }) {
  const service = section === 'Serviços';
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Section title="Identificação" description="Nome, código e valor que aparecerão durante a emissão.">
        <Field label={service ? 'Nome do serviço' : 'Nome do produto'} value={form.name} onChange={value => set('name', value)} required />
        <Field label="Código interno" value={form.code} onChange={value => set('code', value)} required />
        <Field label="Valor padrão" value={form.sale_price} onChange={value => set('sale_price', value)} type="number" required />
        <SelectField
          label="Situação"
          value={form.status}
          onChange={value => set('status', value)}
          options={[
            ['active', 'Ativo'],
            ['inactive', 'Inativo'],
          ]}
        />
        <div className="md:col-span-2">
          <Field label={service ? 'Descrição padrão para NFS-e' : 'Descrição'} value={form.description} onChange={value => set('description', value)} required={service} />
        </div>
      </Section>

      {service ? (
        <>
          <Section title="Classificação fiscal" description="Dados aplicados automaticamente na DPS e na NFS-e.">
            <Field label="Código nacional" value={form.service_code_national} onChange={value => set('service_code_national', value)} required hint="Código de tributação nacional do serviço." />
            <Field label="Código municipal" value={form.service_code_municipal} onChange={value => set('service_code_municipal', value)} />
            <Field label="CNAE" value={form.cnae} onChange={value => set('cnae', value)} />
            <Field label="ISS (%)" value={form.iss_rate} onChange={value => set('iss_rate', value)} type="number" />
          </Section>
          <Section title="Retenções" description="Ative apenas os tributos retidos pelo tomador.">
            <Toggle label="Reter ISS" checked={!!form.iss_withheld} onChange={value => set('iss_withheld', value)} />
            <Toggle label="Reter INSS" checked={!!form.inss_withheld} onChange={value => set('inss_withheld', value)} />
            <Toggle label="Reter IR" checked={!!form.ir_withheld} onChange={value => set('ir_withheld', value)} />
            <Toggle label="Reter CSLL" checked={!!form.csll_withheld} onChange={value => set('csll_withheld', value)} />
            <Toggle label="Reter PIS" checked={!!form.pis_withheld} onChange={value => set('pis_withheld', value)} />
            <Toggle label="Reter COFINS" checked={!!form.cofins_withheld} onChange={value => set('cofins_withheld', value)} />
          </Section>
        </>
      ) : (
        <>
          <Section title="Classificação">
            <Field label="NCM" value={form.ncm} onChange={value => set('ncm', value)} />
            <Field label="CEST" value={form.cest} onChange={value => set('cest', value)} />
            <Field label="CFOP interno" value={form.cfop_in_state} onChange={value => set('cfop_in_state', value)} />
            <Field label="CFOP interestadual" value={form.cfop_out_state} onChange={value => set('cfop_out_state', value)} />
            <Field label="CSOSN" value={form.csosn} onChange={value => set('csosn', value)} />
            <Field label="CST ICMS" value={form.icms_cst} onChange={value => set('icms_cst', value)} />
          </Section>
          <Section title="Estoque">
            <Toggle label="Controlar estoque" checked={!!form.stock_managed} onChange={value => set('stock_managed', value)} />
            <Field label="Quantidade atual" value={form.stock_quantity} onChange={value => set('stock_quantity', value)} type="number" />
            <Field label="Estoque mínimo" value={form.stock_minimum} onChange={value => set('stock_minimum', value)} type="number" />
            <Field label="Unidade" value={form.unit} onChange={value => set('unit', value)} />
          </Section>
        </>
      )}
    </div>
  );
}
