import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, Box, PackagePlus, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

const blank: any = {
  status: 'active',
  code: '',
  name: '',
  description: '',
  unit: 'UN',
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
  approximate_tax_rate: '',
  stock_managed: true,
  stock_quantity: '0',
  stock_minimum: '0',
  weight_net: '',
  weight_gross: '',
  fiscal_notes: '',
};
const numeric = [
  'sale_price',
  'cost_price',
  'icms_rate',
  'icms_reduction_rate',
  'ipi_rate',
  'pis_rate',
  'cofins_rate',
  'approximate_tax_rate',
  'stock_quantity',
  'stock_minimum',
  'weight_net',
  'weight_gross',
];
const money = (v: any) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const qty = (v: any) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

function Field({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
  required = false,
  hint,
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
  required?: boolean;
  hint?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-medium text-[#344054]">
        {label}
        {required && <b className="text-[#b42318]"> *</b>}
      </span>
      <Input
        type={type}
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1.5 h-10 border-[#d7dde5] bg-white text-sm text-[#101828]"
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
  className = '',
}: {
  label: string;
  value: any;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-medium text-[#344054]">{label}</span>
      <select
        value={value ?? ''}
        onChange={e => onChange(e.target.value)}
        className="mt-1.5 h-10 w-full rounded-[7px] border border-[#d7dde5] bg-white px-3 text-sm text-[#101828]"
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
function StockPill({ item }: { item: any }) {
  if (!item.stock_managed)
    return (
      <span className="stock-pill stock-off">
        <Archive className="h-3 w-3" />
        Sem controle
      </span>
    );
  const current = Number(item.stock_quantity || 0),
    minimum = Number(item.stock_minimum || 0),
    low = current <= minimum;
  return (
    <span className={`stock-pill ${low ? 'stock-low' : 'stock-ok'}`}>
      {low ? <AlertTriangle className="h-3 w-3" /> : <Box className="h-3 w-3" />}
      {qty(current)} {item.unit || 'UN'}
    </span>
  );
}

export default function SaasProductsPremium({ organizationId }: { organizationId: string | null }) {
  const [items, setItems] = useState<any[]>([]),
    [selected, setSelected] = useState<any | null>(null),
    [form, setForm] = useState<any>({ ...blank }),
    [search, setSearch] = useState(''),
    [editorTab, setEditorTab] = useState<'basic' | 'stock' | 'fiscal'>('basic'),
    [busy, setBusy] = useState(false),
    [msg, setMsg] = useState('');
  const load = async () => {
    if (!organizationId) return;
    const { data, error } = await (supabase as any)
      .from('saas_fiscal_catalog_items')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('item_type', 'product')
      .order('name');
    if (error) {
      setMsg(error.message);
      return;
    }
    setItems(data || []);
  };
  useEffect(() => {
    void load();
  }, [organizationId]);
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(x =>
      [x.name, x.code, x.gtin, x.ncm].some(v =>
        String(v || '')
          .toLowerCase()
          .includes(q)
      )
    );
  }, [items, search]);
  const managed = items.filter(x => x.stock_managed),
    low = managed.filter(x => Number(x.stock_quantity || 0) <= Number(x.stock_minimum || 0)),
    active = items.filter(x => x.status !== 'inactive'),
    stockValue = managed.reduce(
      (sum, x) => sum + Number(x.stock_quantity || 0) * Number(x.cost_price || 0),
      0
    );
  const open = (item: any) => {
    setSelected(item);
    setForm({ ...blank, ...item });
    setMsg('');
    setEditorTab('basic');
  };
  const create = () => {
    setSelected({ id: null });
    setForm({ ...blank });
    setMsg('');
    setEditorTab('basic');
  };
  const close = () => {
    setSelected(null);
    setForm({ ...blank });
    setMsg('');
    setEditorTab('basic');
  };
  const set = (k: string, v: any) => {
    if (
      [
        'gtin',
        'ncm',
        'cest',
        'cfop_in_state',
        'cfop_out_state',
        'csosn',
        'icms_cst',
        'pis_cst',
        'cofins_cst',
        'ipi_cst',
      ].includes(k)
    )
      v = String(v).replace(/\D/g, '');
    if (k === 'ncm') v = v.slice(0, 8);
    if (['cfop_in_state', 'cfop_out_state'].includes(k)) v = v.slice(0, 4);
    setMsg('');
    setForm((p: any) => ({ ...p, [k]: v }));
  };
  const basicIssues = [
    !String(form.name || '').trim() && 'nome',
    !String(form.code || '').trim() && 'código / SKU',
    !(Number(form.sale_price) > 0) && 'preço de venda',
  ].filter(Boolean) as string[];
  const fiscalIssues = [
    String(form.ncm || '').length !== 8 && 'NCM com 8 dígitos',
    String(form.cfop_in_state || '').length !== 4 && 'CFOP dentro do estado',
  ].filter(Boolean) as string[];
  const continueEditor = () => {
    if (editorTab === 'basic' && basicIssues.length)
      return setMsg(`Complete ${basicIssues.join(', ')} para continuar.`);
    setMsg('');
    setEditorTab(editorTab === 'basic' ? 'stock' : 'fiscal');
  };
  const save = async () => {
    const issues = [...basicIssues, ...fiscalIssues];
    if (!organizationId || issues.length) {
      setEditorTab(basicIssues.length ? 'basic' : 'fiscal');
      return setMsg(`Complete ${issues.join(', ')} antes de salvar.`);
    }
    setBusy(true);
    setMsg('');
    try {
      const payload: any = {
        ...form,
        organization_id: organizationId,
        item_type: 'product',
        name: String(form.name).trim(),
      };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      for (const k of numeric)
        payload[k] = payload[k] === '' || payload[k] == null ? null : Number(payload[k]);
      const q = selected?.id
        ? (supabase as any).from('saas_fiscal_catalog_items').update(payload).eq('id', selected.id)
        : (supabase as any).from('saas_fiscal_catalog_items').insert(payload);
      const { error } = await q;
      if (error) throw error;
      await load();
      close();
    } catch (e: any) {
      setMsg(e.message || 'Não foi possível salvar o produto.');
    } finally {
      setBusy(false);
    }
  };
  const deactivate = async () => {
    if (!selected?.id) return;
    setBusy(true);
    const { error } = await (supabase as any)
      .from('saas_fiscal_catalog_items')
      .update({ status: form.status === 'inactive' ? 'active' : 'inactive' })
      .eq('id', selected.id);
    setBusy(false);
    if (error) return setMsg(error.message);
    await load();
    close();
  };
  if (!organizationId)
    return (
      <div className="py-20 text-center text-sm text-muted-foreground">
        Nenhuma organização fiscal disponível.
      </div>
    );
  return (
    <div className="saas-products-premium mx-auto w-full max-w-[1540px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dbe1e8] pb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#718096]">
            Cadastros
          </p>
          <h1 className="mt-1 text-[28px] font-semibold">Produtos e estoque</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#667085]">
            Catálogo fiscal, preços, tributação e posição de estoque em uma única área.
          </p>
        </div>
        <Button onClick={create} className="saas-action-primary">
          <PackagePlus className="mr-2 h-4 w-4" />
          Novo produto
        </Button>
      </header>
      <div className="product-summary">
        <Summary
          label="Produtos ativos"
          value={String(active.length)}
          hint={`${items.length} cadastrados no catálogo`}
        />
        <Summary
          label="Com controle de estoque"
          value={String(managed.length)}
          hint="Movimentação acompanhada pelo sistema"
        />
        <Summary
          label="Estoque baixo"
          value={String(low.length)}
          hint={low.length ? 'Itens no mínimo ou abaixo dele' : 'Nenhum alerta de reposição'}
        />
        <Summary
          label="Valor em estoque"
          value={money(stockValue)}
          hint="Quantidade atual × custo cadastrado"
        />
      </div>
      <div className="product-workspace">
        <section className="product-table">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#dce2e9] px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-[#17233b]">Catálogo</h2>
              <p className="mt-0.5 text-[11px] text-[#7a8698]">
                Clique em um item para consultar ou editar.
              </p>
            </div>
            <div className="relative w-full max-w-[360px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar por nome, SKU, GTIN ou NCM"
                className="h-10 border-[#d8dfe7] bg-[#fbfcfd] pl-9 text-sm"
              />
            </div>
          </div>
          <div className="product-table-head">
            <span>Produto</span>
            <span>SKU / NCM</span>
            <span>Venda</span>
            <span>Custo</span>
            <span>Estoque</span>
            <span>Situação</span>
          </div>
          <div>
            {filtered.map(item => (
              <button
                type="button"
                key={item.id}
                onClick={() => open(item)}
                className={`product-row ${selected?.id === item.id ? 'is-active' : ''}`}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-[#15213a]">{item.name}</p>
                  <p className="mt-1 truncate text-[11px] text-[#7a8698]">
                    {item.description || item.gtin || 'Sem descrição complementar'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-[#344054]">{item.code || '—'}</p>
                  <p className="mt-1 text-[10px] text-[#7a8698]">NCM {item.ncm || '—'}</p>
                </div>
                <span className="text-xs font-semibold text-[#17233b]">
                  {money(item.sale_price)}
                </span>
                <span className="text-xs text-[#667085]">{money(item.cost_price)}</span>
                <StockPill item={item} />
                <span
                  className={`text-[10px] font-semibold uppercase tracking-[.08em] ${
                    item.status === 'inactive' ? 'text-[#98a2b3]' : 'text-[#167a5b]'
                  }`}
                >
                  {item.status === 'inactive' ? 'Inativo' : 'Ativo'}
                </span>
              </button>
            ))}
            {!filtered.length && (
              <div className="px-6 py-16 text-center text-sm text-[#7a8698]">
                Nenhum produto encontrado.
              </div>
            )}
          </div>
        </section>
        <aside className="product-side">
          {!selected ? (
            <div className="grid min-h-[430px] place-items-center px-7 text-center">
              <div>
                <Box className="mx-auto h-8 w-8 text-[#98a2b3]" />
                <h3 className="mt-4 text-base font-semibold text-[#17233b]">Detalhes do produto</h3>
                <p className="mt-2 text-xs leading-5 text-[#7a8698]">
                  Selecione um item do catálogo ou crie um novo produto para editar estoque, preço e
                  dados fiscais.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="product-side-head">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-[9px] font-semibold uppercase tracking-[.14em] text-[#7a8698]">
                      {selected.id ? 'Editar produto' : 'Novo produto'}
                    </p>
                    <h3 className="mt-1 text-base font-semibold text-[#17233b]">
                      {form.name || 'Produto sem nome'}
                    </h3>
                  </div>
                  <button
                    type="button"
                    aria-label="Fechar edição do produto"
                    onClick={close}
                    className="grid h-8 w-8 place-items-center border border-[#dce2e9] bg-white text-[#667085]"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="product-side-body">
                <div className="product-editor-steps" aria-label="Etapas do cadastro do produto">
                  {[
                    ['basic', '1', 'Dados básicos'],
                    ['stock', '2', 'Estoque'],
                    ['fiscal', '3', 'Fiscal'],
                  ].map(([key, number, label]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setEditorTab(key as typeof editorTab)}
                      className={editorTab === key ? 'is-active' : ''}
                    >
                      <span>{number}</span>
                      {label}
                    </button>
                  ))}
                </div>
                {editorTab === 'basic' && (
                  <div className="product-editor-panel">
                    <div className="product-editor-intro">
                      <b>Identificação e preço</b>
                      <span>Comece com as informações usadas na busca e na venda.</span>
                    </div>
                    <div className="product-form-grid">
                      <Field
                        label="Nome do produto"
                        value={form.name}
                        onChange={v => set('name', v)}
                        className="span-2"
                        required
                      />
                      <Field
                        label="Código / SKU"
                        value={form.code}
                        onChange={v => set('code', v)}
                        required
                        hint="Código interno único para localizar o item."
                      />
                      <SelectField
                        label="Unidade"
                        value={form.unit}
                        onChange={v => set('unit', v)}
                        options={[
                          ['UN', 'Unidade'],
                          ['KG', 'Quilograma'],
                          ['CX', 'Caixa'],
                          ['LT', 'Litro'],
                          ['MT', 'Metro'],
                          ['PC', 'Peça'],
                        ]}
                      />
                      <Field
                        label="Preço de venda"
                        value={form.sale_price}
                        onChange={v => set('sale_price', v)}
                        type="number"
                        required
                      />
                      <Field
                        label="Preço de custo"
                        value={form.cost_price}
                        onChange={v => set('cost_price', v)}
                        type="number"
                        hint="Usado para calcular o valor do estoque."
                      />
                      <Field
                        label="GTIN / EAN"
                        value={form.gtin}
                        onChange={v => set('gtin', v)}
                        className="span-2"
                        hint="Deixe vazio quando o produto não possuir código de barras."
                      />
                      <label className="span-2 block">
                        <span className="text-[11px] font-medium text-[#344054]">Descrição</span>
                        <textarea
                          rows={4}
                          value={form.description || ''}
                          onChange={e => set('description', e.target.value)}
                          className="mt-1.5 w-full rounded-[7px] border border-[#d7dde5] bg-white p-3 text-sm"
                          placeholder="Descrição que ajudará a identificar o produto"
                        />
                      </label>
                    </div>
                  </div>
                )}
                {editorTab === 'stock' && (
                  <div className="product-editor-panel">
                    <div className="product-editor-intro">
                      <b>Controle de estoque</b>
                      <span>
                        Defina o saldo inicial e quando o sistema deve alertar a reposição.
                      </span>
                    </div>
                    <label className="mb-4 flex items-center justify-between rounded-[7px] border border-[#dce2e9] bg-[#f8fafb] px-3 py-3 text-xs font-medium text-[#344054]">
                      <span>
                        <b className="block font-medium">Controlar estoque deste item</b>
                        <small className="mt-1 block font-normal text-[#7a8698]">
                          O saldo será acompanhado nas emissões.
                        </small>
                      </span>
                      <input
                        type="checkbox"
                        checked={!!form.stock_managed}
                        onChange={e => set('stock_managed', e.target.checked)}
                        className="h-4 w-4"
                      />
                    </label>
                    <div className="product-form-grid">
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
                      <Field
                        label="Peso líquido (kg)"
                        value={form.weight_net}
                        onChange={v => set('weight_net', v)}
                        type="number"
                      />
                      <Field
                        label="Peso bruto (kg)"
                        value={form.weight_gross}
                        onChange={v => set('weight_gross', v)}
                        type="number"
                      />
                    </div>
                    <div className="product-stock-preview">
                      <span>Valor estimado em estoque</span>
                      <b>
                        {money(Number(form.stock_quantity || 0) * Number(form.cost_price || 0))}
                      </b>
                    </div>
                  </div>
                )}
                {editorTab === 'fiscal' && (
                  <div className="product-editor-panel">
                    <div className="product-editor-intro">
                      <b>Classificação fiscal</b>
                      <span>Dados reutilizados automaticamente na NF-e e NFC-e.</span>
                    </div>
                    <div className="product-form-grid">
                      <Field
                        label="NCM"
                        value={form.ncm}
                        onChange={v => set('ncm', v)}
                        required
                        hint="Informe os 8 dígitos."
                      />
                      <Field label="CEST" value={form.cest} onChange={v => set('cest', v)} />
                      <Field
                        label="CFOP dentro do estado"
                        value={form.cfop_in_state}
                        onChange={v => set('cfop_in_state', v)}
                        required
                      />
                      <Field
                        label="CFOP fora do estado"
                        value={form.cfop_out_state}
                        onChange={v => set('cfop_out_state', v)}
                      />
                      <Field label="CSOSN" value={form.csosn} onChange={v => set('csosn', v)} />
                      <Field
                        label="CST ICMS"
                        value={form.icms_cst}
                        onChange={v => set('icms_cst', v)}
                      />
                      <Field
                        label="ICMS (%)"
                        value={form.icms_rate}
                        onChange={v => set('icms_rate', v)}
                        type="number"
                      />
                      <Field
                        label="Carga tributária aprox. (%)"
                        value={form.approximate_tax_rate}
                        onChange={v => set('approximate_tax_rate', v)}
                        type="number"
                      />
                    </div>
                    <p className="product-section-title">Tributos federais</p>
                    <div className="product-form-grid">
                      <Field
                        label="CST PIS"
                        value={form.pis_cst}
                        onChange={v => set('pis_cst', v)}
                      />
                      <Field
                        label="PIS (%)"
                        value={form.pis_rate}
                        onChange={v => set('pis_rate', v)}
                        type="number"
                      />
                      <Field
                        label="CST COFINS"
                        value={form.cofins_cst}
                        onChange={v => set('cofins_cst', v)}
                      />
                      <Field
                        label="COFINS (%)"
                        value={form.cofins_rate}
                        onChange={v => set('cofins_rate', v)}
                        type="number"
                      />
                      <Field
                        label="CST IPI"
                        value={form.ipi_cst}
                        onChange={v => set('ipi_cst', v)}
                      />
                      <Field
                        label="IPI (%)"
                        value={form.ipi_rate}
                        onChange={v => set('ipi_rate', v)}
                        type="number"
                      />
                      <SelectField
                        label="Situação"
                        value={form.status}
                        onChange={v => set('status', v)}
                        options={[
                          ['active', 'Ativo'],
                          ['inactive', 'Inativo'],
                        ]}
                        className="span-2"
                      />
                    </div>
                  </div>
                )}
                {msg && (
                  <div className="mt-4 rounded-[7px] border border-[#ead8d5] bg-[#fff8f7] px-3 py-2 text-xs text-[#9f2d24]">
                    {msg}
                  </div>
                )}
                <div className="saas-emission-actions">
                  <Button variant="outline" onClick={close} className="saas-action-secondary">
                    Cancelar
                  </Button>
                  {selected.id && (
                    <Button
                      variant="outline"
                      onClick={deactivate}
                      disabled={busy}
                      className="saas-action-secondary"
                    >
                      {form.status === 'inactive' ? 'Reativar' : 'Inativar'}
                    </Button>
                  )}
                  {editorTab !== 'basic' && (
                    <Button
                      variant="outline"
                      onClick={() => setEditorTab(editorTab === 'fiscal' ? 'stock' : 'basic')}
                      className="saas-action-secondary"
                    >
                      Voltar
                    </Button>
                  )}
                  {editorTab !== 'fiscal' ? (
                    <Button onClick={continueEditor} className="saas-action-primary">
                      Continuar
                    </Button>
                  ) : (
                    <Button onClick={save} disabled={busy} className="saas-action-primary">
                      {busy ? 'Salvando...' : 'Salvar produto'}
                    </Button>
                  )}
                </div>
              </div>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}
function Summary({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="product-summary-card">
      <p className="product-summary-label">{label}</p>
      <p className="product-summary-value">{value}</p>
      <p className="product-summary-hint">{hint}</p>
    </div>
  );
}
