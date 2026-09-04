import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import SaasCustomerEditor from '@/components/saas/SaasCustomerEditor';

export type CadastroSection =
  | 'Clientes'
  | 'Fornecedores'
  | 'Produtos'
  | 'Serviços'
  | 'Transportadoras';
type Props = { organizationId: string | null; section: CadastroSection };
const partyTypeBySection: any = {
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
  rntrc: '',
  antt_category: '',
  vehicle_plate: '',
  vehicle_state: '',
  freight_default_mode: '',
  notes: '',
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
});
const money = (v: any) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
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
        onChange={e => onChange(e.target.value)}
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
        onChange={e => onChange(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-[8px] border border-[#d7dde5] bg-white px-3 text-sm text-[#10203e]"
      >
        {options.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between rounded-[8px] border border-[#dce2e9] bg-[#f8fafb] px-3 py-2.5 text-xs font-medium text-[#344054]">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        className="h-4 w-4"
      />
    </label>
  );
}
function Section({
  title,
  children,
  description,
}: {
  title: string;
  children: any;
  description?: string;
}) {
  return (
    <section className="saas-register-section">
      <div className="saas-register-section-heading">
        <p className="saas-register-section-title">{title}</p>
        {description && <span>{description}</span>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">{children}</div>
    </section>
  );
}

export default function SaasCadastros({ organizationId, section }: Props) {
  const isCatalog = section === 'Produtos' || section === 'Serviços';
  const [rows, setRows] = useState<any[]>([]),
    [form, setForm] = useState<any>(null),
    [search, setSearch] = useState(''),
    [loading, setLoading] = useState(false),
    [saving, setSaving] = useState(false),
    [message, setMessage] = useState('');
  const load = async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const table = isCatalog ? 'saas_fiscal_catalog_items' : 'saas_fiscal_parties';
      let q = (supabase as any).from(table).select('*').eq('organization_id', organizationId);
      q = isCatalog
        ? q.eq('item_type', section === 'Produtos' ? 'product' : 'service')
        : q.eq('party_type', partyTypeBySection[section]);
      const { data, error } = await q.order(isCatalog ? 'name' : 'legal_name');
      if (error) throw error;
      setRows(data || []);
    } catch (e: any) {
      setMessage(e.message || 'Não foi possível carregar os cadastros.');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    setForm(null);
    setSearch('');
    setMessage('');
    void load();
  }, [organizationId, section]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(
      r =>
        !q ||
        String(
          isCatalog
            ? `${r.name} ${r.code} ${r.ncm} ${r.service_code_national}`
            : `${r.legal_name} ${r.trade_name} ${r.tax_id} ${r.email}`
        )
          .toLowerCase()
          .includes(q)
    );
  }, [rows, search, isCatalog]);
  const set = (k: string, v: any) => {
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
      ].includes(k)
    )
      v = String(v).replace(/\D/g, '');
    if (k === 'tax_id') v = v.slice(0, 14);
    if (k === 'postal_code') v = v.slice(0, 8);
    if (k === 'city_ibge_code') v = v.slice(0, 7);
    if (['state', 'vehicle_state'].includes(k))
      v = String(v)
        .toUpperCase()
        .replace(/[^A-Z]/g, '')
        .slice(0, 2);
    if (k === 'vehicle_plate')
      v = String(v)
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 7);
    setMessage('');
    setForm((p: any) => ({ ...p, [k]: v }));
  };
  const create = () => setForm(isCatalog ? blankCatalog(section) : blankParty(section));
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
    try {
      const table = isCatalog ? 'saas_fiscal_catalog_items' : 'saas_fiscal_parties';
      const payload: any = {
        ...form,
        organization_id: organizationId,
        updated_at: new Date().toISOString(),
      };
      if (isCatalog) {
        payload.item_type = section === 'Produtos' ? 'product' : 'service';
        numeric.forEach(
          k => (payload[k] = payload[k] === '' || payload[k] == null ? null : Number(payload[k]))
        );
      } else {
        payload.party_type = partyTypeBySection[section];
        payload.credit_limit =
          payload.credit_limit === '' || payload.credit_limit == null
            ? null
            : Number(payload.credit_limit);
      }
      delete payload.created_at;
      const id = payload.id;
      delete payload.id;
      const { error } = id
        ? await (supabase as any).from(table).update(payload).eq('id', id)
        : await (supabase as any).from(table).insert(payload);
      if (error) throw error;
      await load();
      setForm(null);
      setMessage('Cadastro salvo.');
    } catch (e: any) {
      setMessage(e.message || 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  };
  const remove = async (row: any) => {
    if (!window.confirm(`Excluir ${isCatalog ? row.name : row.legal_name}?`)) return;
    const { error } = await (supabase as any)
      .from(isCatalog ? 'saas_fiscal_catalog_items' : 'saas_fiscal_parties')
      .delete()
      .eq('id', row.id);
    if (error) return setMessage(error.message);
    if (form?.id === row.id) setForm(null);
    await load();
  };
  const subtitle =
    section === 'Serviços'
      ? 'Serviços com preço, classificação, ISS e retenções prontos para reutilizar na NFS-e.'
      : section === 'Produtos'
      ? 'Catálogo fiscal com preços, classificação e estoque.'
      : `Dados cadastrais e fiscais de ${section.toLowerCase()} disponíveis em todas as emissões.`;
  const completionFields = form
    ? isCatalog
      ? [
          form.name,
          form.code,
          form.sale_price,
          form.description,
          form.service_code_national,
          form.service_code_municipal,
          form.cnae,
          form.iss_rate,
        ]
      : [
          form.legal_name,
          form.tax_id,
          form.email || form.phone,
          form.postal_code,
          form.street,
          form.city,
          form.state,
          form.city_ibge_code,
          ...(section === 'Transportadoras' ? [form.rntrc, form.vehicle_plate] : []),
        ]
    : [];
  const completion = completionFields.length
    ? Math.round((completionFields.filter(Boolean).length / completionFields.length) * 100)
    : 0;
  return (
    <div className="mx-auto w-full max-w-[1540px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dbe1e8] pb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#718096]">
            Cadastros
          </p>
          <h1 className="mt-1 text-[28px] font-semibold">{section}</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#667085]">{subtitle}</p>
        </div>
        <Button onClick={create} className="saas-action-primary">
          <Plus className="mr-2 h-4 w-4" />
          Novo{' '}
          {section === 'Clientes'
            ? 'cliente'
            : section === 'Fornecedores'
            ? 'fornecedor'
            : section === 'Transportadoras'
            ? 'transportadora'
            : section === 'Serviços'
            ? 'serviço'
            : 'produto'}
        </Button>
      </header>
      {message && (
        <div
          role="status"
          className="rounded-[9px] border border-[#dce2e9] bg-white px-4 py-3 text-xs text-[#536077]"
        >
          {message}
        </div>
      )}
      <div className={`saas-register-layout ${section === 'Clientes' && form ? 'is-customer-editing' : ''}`}>
        <section className="saas-register-list">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#e4e8ed] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[#17233b]">{section}</h2>
              <p className="mt-0.5 text-[11px] text-[#7a8698]">
                {filtered.length} registro{filtered.length === 1 ? '' : 's'}
              </p>
            </div>
            <div className="relative w-full max-w-[360px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={`Buscar ${section.toLowerCase()}...`}
                className="h-10 bg-[#fbfcfd] pl-9 text-sm"
              />
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)_190px_110px] gap-4 border-b border-[#dce2e9] bg-[#eef2f5] px-4 py-2.5 text-[9px] font-bold uppercase tracking-[.11em] text-[#657186]">
            <span>Cadastro</span>
            <span>Informação principal</span>
            <span className="text-right">Situação</span>
          </div>
          {loading ? (
            <div className="px-5 py-16 text-center text-sm text-[#7a8698]">Carregando...</div>
          ) : !filtered.length ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm font-semibold text-[#344054]">Nenhum cadastro encontrado.</p>
              <p className="mt-1 text-xs text-[#8a95a5]">
                Crie o primeiro registro para reaproveitar os dados na emissão.
              </p>
              <Button onClick={create} variant="outline" className="mt-5 saas-action-secondary">
                Criar cadastro
              </Button>
            </div>
          ) : (
            filtered.map(row => (
              <button
                type="button"
                key={row.id}
                onClick={() => setForm({ ...row })}
                className={`grid w-full cursor-pointer grid-cols-[minmax(0,1fr)_190px_110px] items-center gap-4 rounded-none border-0 border-b border-[#edf0f3] px-4 py-4 text-left transition hover:bg-[#f6f8fa] ${
                  form?.id === row.id ? 'bg-[#f2f5f8]' : ''
                }`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#15213a]">
                    {isCatalog ? row.name : row.legal_name}
                  </p>
                  <p className="mt-1 truncate text-[11px] text-[#7a8698]">
                    {isCatalog
                      ? [row.code, row.description].filter(Boolean).join(' · ') || 'Sem código'
                      : [row.trade_name, row.tax_id].filter(Boolean).join(' · ') || 'Sem documento'}
                  </p>
                </div>
                <div className="text-xs text-[#536077]">
                  {section === 'Serviços'
                    ? [
                        row.service_code_national,
                        row.iss_rate != null ? `ISS ${row.iss_rate}%` : null,
                      ]
                        .filter(Boolean)
                        .join(' · ') || '—'
                    : section === 'Produtos'
                    ? [row.ncm, money(row.sale_price)].filter(Boolean).join(' · ')
                    : row.email || row.phone || row.city || '—'}
                </div>
                <div className="text-right">
                  <span
                    className={`saas-status-pill ${
                      row.status === 'inactive' ? 'saas-status-cancelled' : 'saas-status-authorized'
                    }`}
                  >
                    {row.status === 'inactive' ? 'Inativo' : 'Ativo'}
                  </span>
                </div>
              </button>
            ))
          )}
        </section>
        <aside className="saas-register-drawer">
          {!form ? (
            <div className="grid min-h-[460px] place-items-center px-8 text-center">
              <div>
                <p className="text-base font-semibold text-[#17233b]">Selecione um cadastro</p>
                <p className="mt-2 text-xs leading-5 text-[#7a8698]">
                  Os detalhes aparecem aqui sem tirar você da lista. Você também pode criar um novo
                  registro.
                </p>
                <Button onClick={create} className="mt-5 saas-action-primary">
                  Novo cadastro
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="saas-register-drawer-head">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#7a8698]">
                      {form.id ? 'Editar cadastro' : 'Novo cadastro'}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-[#17233b]">
                      {(isCatalog ? form.name : form.legal_name) || 'Sem nome'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    aria-label="Fechar cadastro"
                    onClick={() => setForm(null)}
                    className="grid h-8 w-8 place-items-center border border-[#dce2e9] bg-white text-[#667085]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
                <div className="saas-register-completion">
                  <span>Cadastro preenchido</span>
                  <b>{completion}%</b>
                  <i>
                    <em style={{ width: `${completion}%` }} />
                  </i>
                </div>
              </div>
              <div className="saas-register-drawer-body">
                {isCatalog ? (
                  <CatalogEditor section={section} form={form} set={set} />
                ) : section === 'Clientes' ? (
                <SaasCustomerEditor form={form} set={set} />
              ) : (
                <PartyEditor section={section} form={form} set={set} />
              )}
                <div className="saas-emission-actions">
                  <Button
                    variant="outline"
                    onClick={() => setForm(null)}
                    className="saas-action-secondary"
                  >
                    Cancelar
                  </Button>
                  {form.id && (
                    <Button
                      variant="outline"
                      onClick={() => void remove(form)}
                      className="saas-action-secondary"
                    >
                      Excluir
                    </Button>
                  )}
                  <Button onClick={save} disabled={saving} className="saas-action-primary">
                    {saving ? 'Salvando...' : 'Salvar'}
                  </Button>
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function PartyEditor({
  section,
  form,
  set,
}: {
  section: CadastroSection;
  form: any;
  set: (k: string, v: any) => void;
}) {
  return (
    <>
      <Section
        title="Identificação"
        description="Dados usados para localizar e identificar o cadastro."
      >
        <SelectField
          label="Tipo"
          value={form.person_type}
          onChange={v => set('person_type', v)}
          options={[
            ['legal', 'Pessoa jurídica'],
            ['individual', 'Pessoa física'],
            ['foreign', 'Exterior'],
          ]}
        />
        <Field
          label="Razão social / nome"
          value={form.legal_name}
          onChange={v => set('legal_name', v)}
          required
        />
        <Field label="Nome fantasia" value={form.trade_name} onChange={v => set('trade_name', v)} />
        <Field
          label="CNPJ / CPF"
          value={form.tax_id}
          onChange={v => set('tax_id', v)}
          required
          hint="Digite somente números."
        />
        <Field label="Contato" value={form.contact_name} onChange={v => set('contact_name', v)} />
        <SelectField
          label="Situação"
          value={form.status}
          onChange={v => set('status', v)}
          options={[
            ['active', 'Ativo'],
            ['inactive', 'Inativo'],
          ]}
        />
      </Section>
      <Section title="Fiscal" description="Tributação reaproveitada automaticamente nas emissões.">
        <Field
          label="Inscrição estadual"
          value={form.state_registration}
          onChange={v => set('state_registration', v)}
        />
        <Field
          label="Inscrição municipal"
          value={form.municipal_registration}
          onChange={v => set('municipal_registration', v)}
        />
        <SelectField
          label="Regime tributário"
          value={form.tax_regime}
          onChange={v => set('tax_regime', v)}
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
          onChange={v => set('ie_indicator', v)}
          options={[
            ['', 'Não informado'],
            ['1', 'Contribuinte'],
            ['2', 'Isento'],
            ['9', 'Não contribuinte'],
          ]}
        />
        <Toggle
          label="Consumidor final"
          checked={!!form.final_consumer}
          onChange={v => set('final_consumer', v)}
        />
        <Toggle
          label="Contribuinte ICMS"
          checked={!!form.icms_taxpayer}
          onChange={v => set('icms_taxpayer', v)}
        />
      </Section>
      <Section title="Contato" description="Informe pelo menos um canal de contato.">
        <Field label="E-mail" value={form.email} onChange={v => set('email', v)} />
        <Field
          label="E-mail fiscal"
          value={form.billing_email}
          onChange={v => set('billing_email', v)}
        />
        <Field label="Telefone" value={form.phone} onChange={v => set('phone', v)} />
        <Field label="WhatsApp" value={form.mobile} onChange={v => set('mobile', v)} />
      </Section>
      <Section
        title="Endereço"
        description="Necessário para documentos fiscais com destinatário identificado."
      >
        <Field
          label="CEP"
          value={form.postal_code}
          onChange={v => set('postal_code', v)}
          hint="Somente números."
        />
        <Field label="Logradouro" value={form.street} onChange={v => set('street', v)} />
        <Field label="Número" value={form.street_number} onChange={v => set('street_number', v)} />
        <Field label="Bairro" value={form.district} onChange={v => set('district', v)} />
        <Field label="Cidade" value={form.city} onChange={v => set('city', v)} required />
        <Field label="UF" value={form.state} onChange={v => set('state', v)} required />
        <Field
          label="Código IBGE"
          value={form.city_ibge_code}
          onChange={v => set('city_ibge_code', v)}
          required
          hint="Código IBGE de 7 dígitos."
        />
        <Field label="Complemento" value={form.complement} onChange={v => set('complement', v)} />
      </Section>
      {section === 'Transportadoras' && (
        <Section
          title="Transporte"
          description="Dados preenchidos automaticamente no CT-e e MDF-e."
        >
          <Field label="RNTRC" value={form.rntrc} onChange={v => set('rntrc', v)} required />
          <SelectField
            label="Categoria ANTT"
            value={form.antt_category}
            onChange={v => set('antt_category', v)}
            options={[
              ['', 'Selecione'],
              ['TAC', 'Transportador autônomo'],
              ['ETC', 'Empresa de transporte'],
              ['CTC', 'Cooperativa de transporte'],
            ]}
          />
          <Field
            label="Placa padrão"
            value={form.vehicle_plate}
            onChange={v => set('vehicle_plate', v)}
            required
          />
          <Field
            label="UF veículo"
            value={form.vehicle_state}
            onChange={v => set('vehicle_state', v)}
          />
          <SelectField
            label="Modal padrão"
            value={form.freight_default_mode}
            onChange={v => set('freight_default_mode', v)}
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
      <Section
        title="Observações"
        description="Informações internas; não serão transmitidas no documento fiscal."
      >
        <div className="md:col-span-2">
          <textarea
            rows={4}
            value={form.notes || ''}
            onChange={e => set('notes', e.target.value)}
            className="w-full rounded-[8px] border border-[#d7dde5] bg-white p-3 text-sm"
          />
        </div>
      </Section>
    </>
  );
}
function CatalogEditor({
  section,
  form,
  set,
}: {
  section: CadastroSection;
  form: any;
  set: (k: string, v: any) => void;
}) {
  const service = section === 'Serviços';
  return (
    <>
      <Section
        title="Identificação"
        description="Nome, código e valor que aparecerão durante a emissão."
      >
        <Field
          label={service ? 'Nome do serviço' : 'Nome do produto'}
          value={form.name}
          onChange={v => set('name', v)}
          required
        />
        <Field label="Código interno" value={form.code} onChange={v => set('code', v)} required />
        <Field
          label="Valor padrão"
          value={form.sale_price}
          onChange={v => set('sale_price', v)}
          type="number"
          required
        />
        <SelectField
          label="Situação"
          value={form.status}
          onChange={v => set('status', v)}
          options={[
            ['active', 'Ativo'],
            ['inactive', 'Inativo'],
          ]}
        />
        <div className="md:col-span-2">
          <Field
            label={service ? 'Descrição padrão para NFS-e' : 'Descrição'}
            value={form.description}
            onChange={v => set('description', v)}
            required={service}
          />
        </div>
      </Section>
      {service ? (
        <>
          <Section
            title="Classificação fiscal"
            description="Dados aplicados automaticamente na DPS e na NFS-e."
          >
            <Field
              label="Código nacional"
              value={form.service_code_national}
              onChange={v => set('service_code_national', v)}
              required
              hint="Código de tributação nacional do serviço."
            />
            <Field
              label="Código municipal"
              value={form.service_code_municipal}
              onChange={v => set('service_code_municipal', v)}
            />
            <Field label="CNAE" value={form.cnae} onChange={v => set('cnae', v)} />
            <Field
              label="ISS (%)"
              value={form.iss_rate}
              onChange={v => set('iss_rate', v)}
              type="number"
            />
          </Section>
          <Section title="Retenções" description="Ative apenas os tributos retidos pelo tomador.">
            <Toggle
              label="Reter ISS"
              checked={!!form.iss_withheld}
              onChange={v => set('iss_withheld', v)}
            />
            <Toggle
              label="Reter INSS"
              checked={!!form.inss_withheld}
              onChange={v => set('inss_withheld', v)}
            />
            <Toggle
              label="Reter IR"
              checked={!!form.ir_withheld}
              onChange={v => set('ir_withheld', v)}
            />
            <Toggle
              label="Reter CSLL"
              checked={!!form.csll_withheld}
              onChange={v => set('csll_withheld', v)}
            />
            <Toggle
              label="Reter PIS"
              checked={!!form.pis_withheld}
              onChange={v => set('pis_withheld', v)}
            />
            <Toggle
              label="Reter COFINS"
              checked={!!form.cofins_withheld}
              onChange={v => set('cofins_withheld', v)}
            />
          </Section>
        </>
      ) : (
        <>
          <Section title="Classificação">
            <Field label="NCM" value={form.ncm} onChange={v => set('ncm', v)} />
            <Field label="CEST" value={form.cest} onChange={v => set('cest', v)} />
            <Field
              label="CFOP interno"
              value={form.cfop_in_state}
              onChange={v => set('cfop_in_state', v)}
            />
            <Field
              label="CFOP interestadual"
              value={form.cfop_out_state}
              onChange={v => set('cfop_out_state', v)}
            />
            <Field label="CSOSN" value={form.csosn} onChange={v => set('csosn', v)} />
            <Field label="CST ICMS" value={form.icms_cst} onChange={v => set('icms_cst', v)} />
          </Section>
          <Section title="Estoque">
            <Toggle
              label="Controlar estoque"
              checked={!!form.stock_managed}
              onChange={v => set('stock_managed', v)}
            />
            <Field
              label="Quantidade atual"
              value={form.stock_quantity}
              onChange={v => set('stock_quantity', v)}
              type="number"
            />
            <Field
              label="Estoque mínimo"
              value={form.stock_minimum}
              onChange={v => set('stock_minimum', v)}
              type="number"
            />
            <Field label="Unidade" value={form.unit} onChange={v => set('unit', v)} />
          </Section>
        </>
      )}
    </>
  );
}
