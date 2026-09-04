import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Archive, ArrowLeft, Box, Package2, PackagePlus, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import SaasRegisterAppearance, { readableText } from '@/components/saas/SaasRegisterAppearance';

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
  metadata: { card_color: '#ffffff' },
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
const money = (value: any) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const qty = (value: any) => Number(value || 0).toLocaleString('pt-BR', { maximumFractionDigits: 3 });

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
  onChange: (value: string) => void;
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
        onChange={event => onChange(event.target.value)}
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
  onChange: (value: string) => void;
  options: Array<[string, string]>;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="text-[11px] font-medium text-[#344054]">{label}</span>
      <select
        value={value ?? ''}
        onChange={event => onChange(event.target.value)}
        className="mt-1.5 h-10 w-full rounded-[7px] border border-[#d7dde5] bg-white px-3 text-sm text-[#101828]"
      >
        {options.map(([key, text]) => (
          <option key={key} value={key}>{text}</option>
        ))}
      </select>
    </label>
  );
}

function StockPill({ item, dark = false }: { item: any; dark?: boolean }) {
  if (!item.stock_managed)
    return (
      <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${dark ? 'text-white/80' : 'text-[#667085]'}`}>
        <Archive className="h-3 w-3" />Sem controle
      </span>
    );
  const current = Number(item.stock_quantity || 0);
  const minimum = Number(item.stock_minimum || 0);
  const low = current <= minimum;
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold ${dark ? 'text-white' : low ? 'text-[#b54708]' : 'text-[#167a5b]'}`}>
      {low ? <AlertTriangle className="h-3 w-3" /> : <Box className="h-3 w-3" />}
      {qty(current)} {item.unit || 'UN'}
    </span>
  );
}

export default function SaasProductsPremium({ organizationId }: { organizationId: string | null }) {
  const [items, setItems] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ ...blank });
  const [search, setSearch] = useState('');
  const [editorTab, setEditorTab] = useState<'basic' | 'stock' | 'fiscal'>('basic');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [pendingImage, setPendingImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageRemoved, setImageRemoved] = useState(false);

  const hydrateImages = async (data: any[]) => {
    const paths = Array.from(new Set(data.map(item => item?.metadata?.image_path).filter(Boolean))) as string[];
    if (!paths.length) return data;
    const { data: signed } = await supabase.storage.from('saas-private').createSignedUrls(paths, 3600);
    const urls = new Map<string, string>();
    (signed || []).forEach((item: any) => {
      if (item?.path && item?.signedUrl) urls.set(item.path, item.signedUrl);
    });
    return data.map(item => ({ ...item, __imageUrl: urls.get(item?.metadata?.image_path) || null }));
  };

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
    setItems(await hydrateImages(data || []));
  };

  useEffect(() => {
    void load();
  }, [organizationId]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return items;
    return items.filter(item =>
      [item.name, item.code, item.description, item.gtin, item.ncm, item.cest].some(value =>
        String(value || '').toLowerCase().includes(query)
      )
    );
  }, [items, search]);

  const managed = items.filter(item => item.stock_managed);
  const low = managed.filter(item => Number(item.stock_quantity || 0) <= Number(item.stock_minimum || 0));
  const active = items.filter(item => item.status !== 'inactive');
  const stockValue = managed.reduce(
    (sum, item) => sum + Number(item.stock_quantity || 0) * Number(item.cost_price || 0),
    0
  );

  const clearImageState = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setPendingImage(null);
    setImagePreview(null);
    setImageRemoved(false);
  };

  const open = (item: any) => {
    clearImageState();
    setSelected(item);
    setForm({ ...blank, ...item, metadata: { ...(item.metadata || {}), card_color: item?.metadata?.card_color || '#ffffff' } });
    setImagePreview(item.__imageUrl || null);
    setMsg('');
    setEditorTab('basic');
  };

  const create = () => {
    clearImageState();
    setSelected({ id: null });
    setForm({ ...blank, metadata: { card_color: '#ffffff' } });
    setMsg('');
    setEditorTab('basic');
  };

  const close = () => {
    clearImageState();
    setSelected(null);
    setForm({ ...blank, metadata: { card_color: '#ffffff' } });
    setMsg('');
    setEditorTab('basic');
  };

  const set = (key: string, value: any) => {
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
      ].includes(key)
    )
      value = String(value).replace(/\D/g, '');
    if (key === 'ncm') value = value.slice(0, 8);
    if (['cfop_in_state', 'cfop_out_state'].includes(key)) value = value.slice(0, 4);
    setMsg('');
    setForm((previous: any) => ({ ...previous, [key]: value }));
  };

  const setMeta = (key: string, value: any) => {
    setMsg('');
    setForm((previous: any) => ({ ...previous, metadata: { ...(previous.metadata || {}), [key]: value } }));
  };

  const chooseImage = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      setMsg('A imagem deve ter no máximo 5 MB.');
      return;
    }
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setPendingImage(file);
    setImagePreview(URL.createObjectURL(file));
    setImageRemoved(false);
    setMsg('');
  };

  const removeImage = () => {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    setPendingImage(null);
    setImagePreview(null);
    setImageRemoved(true);
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
    let uploadedPath: string | null = null;
    const previousPath = form?.metadata?.image_path || null;
    try {
      let nextImagePath = imageRemoved ? null : previousPath;
      if (pendingImage) {
        const extension = (pendingImage.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
        uploadedPath = `${organizationId}/cadastros/products/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from('saas-private')
          .upload(uploadedPath, pendingImage, { contentType: pendingImage.type || undefined, upsert: false });
        if (uploadError) throw uploadError;
        nextImagePath = uploadedPath;
      }

      const payload: any = {
        ...form,
        organization_id: organizationId,
        item_type: 'product',
        name: String(form.name).trim(),
        metadata: {
          ...(form.metadata || {}),
          card_color: form?.metadata?.card_color || '#ffffff',
          image_path: nextImagePath,
        },
      };
      delete payload.id;
      delete payload.created_at;
      delete payload.updated_at;
      delete payload.__imageUrl;
      for (const key of numeric)
        payload[key] = payload[key] === '' || payload[key] == null ? null : Number(payload[key]);

      const query = selected?.id
        ? (supabase as any).from('saas_fiscal_catalog_items').update(payload).eq('id', selected.id)
        : (supabase as any).from('saas_fiscal_catalog_items').insert(payload);
      const { error } = await query;
      if (error) throw error;

      if (previousPath && previousPath !== nextImagePath)
        await supabase.storage.from('saas-private').remove([previousPath]).catch(() => null);
      await load();
      close();
    } catch (error: any) {
      if (uploadedPath)
        await supabase.storage.from('saas-private').remove([uploadedPath]).catch(() => null);
      setMsg(error.message || 'Não foi possível salvar o produto.');
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
    return <div className="py-20 text-center text-sm text-muted-foreground">Nenhuma organização fiscal disponível.</div>;

  if (selected) {
    return (
      <div className="saas-products-premium mx-auto w-full max-w-[1280px] space-y-5 pb-28">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[#dbe1e8] pb-5">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              onClick={close}
              className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-[#d7dde5] bg-white text-[#536077] transition hover:bg-[#f7f9fb]"
              aria-label="Voltar para produtos"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#718096]">Cadastros / Produtos</p>
              <h1 className="mt-1 truncate text-[27px] font-semibold text-[#17233b]">{form.name || 'Novo produto'}</h1>
              <p className="mt-1 text-sm text-[#667085]">
                {selected.id ? 'Edite identificação, estoque, preço e tributação em uma página dedicada.' : 'Cadastre o produto completo sem dividir a tela com a listagem.'}
              </p>
            </div>
          </div>
          <span className={`rounded-full px-3 py-1.5 text-[10px] font-semibold ${form.status === 'inactive' ? 'bg-[#eef0f3] text-[#667085]' : 'bg-[#e7f6ef] text-[#167a5b]'}`}>
            {form.status === 'inactive' ? 'Inativo' : 'Ativo'}
          </span>
        </header>

        {msg && (
          <div className="rounded-[8px] border border-[#ead8d5] bg-[#fff8f7] px-4 py-3 text-xs text-[#9f2d24]">{msg}</div>
        )}

        <SaasRegisterAppearance
          allowImage
          imageUrl={imagePreview || form.__imageUrl || null}
          cardColor={form?.metadata?.card_color || '#ffffff'}
          onImageChange={chooseImage}
          onRemoveImage={removeImage}
          onColorChange={color => setMeta('card_color', color)}
          imageLabel="Foto do produto"
        />

        <section className="rounded-xl border border-[#dce2e9] bg-white p-4 sm:p-5">
          <div className="product-editor-steps mb-5" aria-label="Etapas do cadastro do produto">
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
                <span>{number}</span>{label}
              </button>
            ))}
          </div>

          {editorTab === 'basic' && (
            <div className="product-editor-panel">
              <div className="product-editor-intro">
                <b>Identificação e preço</b>
                <span>Informações usadas na busca, venda e visualização do catálogo.</span>
              </div>
              <div className="product-form-grid">
                <Field label="Nome do produto" value={form.name} onChange={value => set('name', value)} className="span-2" required />
                <Field label="Código / SKU" value={form.code} onChange={value => set('code', value)} required hint="Código interno único para localizar o item." />
                <SelectField
                  label="Unidade"
                  value={form.unit}
                  onChange={value => set('unit', value)}
                  options={[
                    ['UN', 'Unidade'],
                    ['KG', 'Quilograma'],
                    ['CX', 'Caixa'],
                    ['LT', 'Litro'],
                    ['MT', 'Metro'],
                    ['PC', 'Peça'],
                  ]}
                />
                <Field label="Preço de venda" value={form.sale_price} onChange={value => set('sale_price', value)} type="number" required />
                <Field label="Preço de custo" value={form.cost_price} onChange={value => set('cost_price', value)} type="number" hint="Usado para calcular o valor do estoque." />
                <Field label="GTIN / EAN" value={form.gtin} onChange={value => set('gtin', value)} className="span-2" hint="Deixe vazio quando o produto não possuir código de barras." />
                <label className="span-2 block">
                  <span className="text-[11px] font-medium text-[#344054]">Descrição</span>
                  <textarea
                    rows={4}
                    value={form.description || ''}
                    onChange={event => set('description', event.target.value)}
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
                <span>Defina saldo, mínimo de reposição e peso do item.</span>
              </div>
              <label className="mb-4 flex items-center justify-between rounded-[7px] border border-[#dce2e9] bg-[#f8fafb] px-3 py-3 text-xs font-medium text-[#344054]">
                <span>
                  <b className="block font-medium">Controlar estoque deste item</b>
                  <small className="mt-1 block font-normal text-[#7a8698]">O saldo será acompanhado nas emissões.</small>
                </span>
                <input type="checkbox" checked={!!form.stock_managed} onChange={event => set('stock_managed', event.target.checked)} className="h-4 w-4" />
              </label>
              <div className="product-form-grid">
                <Field label="Quantidade atual" value={form.stock_quantity} onChange={value => set('stock_quantity', value)} type="number" />
                <Field label="Estoque mínimo" value={form.stock_minimum} onChange={value => set('stock_minimum', value)} type="number" />
                <Field label="Peso líquido (kg)" value={form.weight_net} onChange={value => set('weight_net', value)} type="number" />
                <Field label="Peso bruto (kg)" value={form.weight_gross} onChange={value => set('weight_gross', value)} type="number" />
              </div>
              <div className="product-stock-preview">
                <span>Valor estimado em estoque</span>
                <b>{money(Number(form.stock_quantity || 0) * Number(form.cost_price || 0))}</b>
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
                <Field label="NCM" value={form.ncm} onChange={value => set('ncm', value)} required hint="Informe os 8 dígitos." />
                <Field label="CEST" value={form.cest} onChange={value => set('cest', value)} />
                <Field label="CFOP dentro do estado" value={form.cfop_in_state} onChange={value => set('cfop_in_state', value)} required />
                <Field label="CFOP fora do estado" value={form.cfop_out_state} onChange={value => set('cfop_out_state', value)} />
                <Field label="CSOSN" value={form.csosn} onChange={value => set('csosn', value)} />
                <Field label="CST ICMS" value={form.icms_cst} onChange={value => set('icms_cst', value)} />
                <Field label="ICMS (%)" value={form.icms_rate} onChange={value => set('icms_rate', value)} type="number" />
                <Field label="Carga tributária aprox. (%)" value={form.approximate_tax_rate} onChange={value => set('approximate_tax_rate', value)} type="number" />
              </div>
              <p className="product-section-title">Tributos federais</p>
              <div className="product-form-grid">
                <Field label="CST PIS" value={form.pis_cst} onChange={value => set('pis_cst', value)} />
                <Field label="PIS (%)" value={form.pis_rate} onChange={value => set('pis_rate', value)} type="number" />
                <Field label="CST COFINS" value={form.cofins_cst} onChange={value => set('cofins_cst', value)} />
                <Field label="COFINS (%)" value={form.cofins_rate} onChange={value => set('cofins_rate', value)} type="number" />
                <Field label="CST IPI" value={form.ipi_cst} onChange={value => set('ipi_cst', value)} />
                <Field label="IPI (%)" value={form.ipi_rate} onChange={value => set('ipi_rate', value)} type="number" />
                <SelectField
                  label="Situação"
                  value={form.status}
                  onChange={value => set('status', value)}
                  options={[
                    ['active', 'Ativo'],
                    ['inactive', 'Inativo'],
                  ]}
                  className="span-2"
                />
              </div>
            </div>
          )}
        </section>

        <div className="fixed bottom-0 right-0 z-30 border-t border-[#d9e0e7] bg-white/95 p-3 shadow-[0_-8px_30px_rgba(15,23,42,.06)] backdrop-blur md:left-72">
          <div className="mx-auto flex w-full max-w-[1280px] flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={close} className="saas-action-secondary">Cancelar</Button>
            {selected.id && (
              <Button variant="outline" onClick={() => void deactivate()} disabled={busy} className="saas-action-secondary">
                {form.status === 'inactive' ? 'Reativar' : 'Inativar'}
              </Button>
            )}
            {editorTab !== 'basic' && (
              <Button variant="outline" onClick={() => setEditorTab(editorTab === 'fiscal' ? 'stock' : 'basic')} className="saas-action-secondary">Voltar</Button>
            )}
            {editorTab !== 'fiscal' ? (
              <Button onClick={continueEditor} className="saas-action-primary">Continuar</Button>
            ) : (
              <Button onClick={() => void save()} disabled={busy} className="saas-action-primary">
                {busy ? 'Salvando...' : 'Salvar produto'}
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="saas-products-premium mx-auto w-full max-w-[1540px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4 border-b border-[#dbe1e8] pb-5">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#718096]">Cadastros</p>
          <h1 className="mt-1 text-[28px] font-semibold text-[#17233b]">Produtos e estoque</h1>
          <p className="mt-1 max-w-3xl text-sm text-[#667085]">Catálogo fiscal rico em detalhes. Clique no card para abrir a página completa do produto.</p>
        </div>
        <Button onClick={create} className="saas-action-primary">
          <PackagePlus className="mr-2 h-4 w-4" />Novo produto
        </Button>
      </header>

      {msg && (
        <div className="rounded-[8px] border border-[#ead8d5] bg-[#fff8f7] px-4 py-3 text-xs text-[#9f2d24]">{msg}</div>
      )}

      <div className="product-summary">
        <Summary label="Produtos ativos" value={String(active.length)} hint={`${items.length} cadastrados no catálogo`} />
        <Summary label="Com controle de estoque" value={String(managed.length)} hint="Movimentação acompanhada pelo sistema" />
        <Summary label="Estoque baixo" value={String(low.length)} hint={low.length ? 'Itens no mínimo ou abaixo dele' : 'Nenhum alerta de reposição'} />
        <Summary label="Valor em estoque" value={money(stockValue)} hint="Quantidade atual × custo cadastrado" />
      </div>

      <section className="rounded-xl border border-[#dce2e9] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-[#17233b]">Catálogo</h2>
            <p className="mt-1 text-[11px] text-[#7a8698]">Cards com preço, estoque e classificação fiscal. Clique para editar em tela cheia.</p>
          </div>
          <div className="relative w-full max-w-[420px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]" />
            <Input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar por nome, SKU, GTIN, NCM ou descrição" className="h-10 border-[#d8dfe7] bg-[#fbfcfd] pl-9 text-sm" />
          </div>
        </div>

        {!filtered.length ? (
          <div className="py-16 text-center text-sm text-[#7a8698]">Nenhum produto encontrado.</div>
        ) : (
          <div className="mt-5 grid gap-3 xl:grid-cols-2 2xl:grid-cols-3">
            {filtered.map(item => <ProductCard key={item.id} item={item} onClick={() => open(item)} />)}
          </div>
        )}
      </section>
    </div>
  );
}

function ProductCard({ item, onClick }: { item: any; onClick: () => void }) {
  const background = item?.metadata?.card_color || '#ffffff';
  const foreground = readableText(background);
  const dark = foreground === '#ffffff';
  const subtle = dark ? 'rgba(255,255,255,.76)' : 'rgba(23,35,59,.67)';
  const border = dark ? 'rgba(255,255,255,.24)' : 'rgba(15,23,42,.12)';
  const panel = dark ? 'rgba(255,255,255,.11)' : 'rgba(255,255,255,.52)';
  const initials = String(item.name || 'P').split(/\s+/).filter(Boolean).slice(0, 2).map((part: string) => part[0]).join('').toUpperCase();
  return (
    <button
      type="button"
      onClick={onClick}
      className="group min-h-[238px] overflow-hidden rounded-xl border p-4 text-left shadow-[0_1px_2px_rgba(15,23,42,.04)] transition duration-150 hover:-translate-y-0.5 hover:shadow-[0_10px_24px_rgba(15,23,42,.09)]"
      style={{ backgroundColor: background, color: foreground, borderColor: border }}
    >
      <div className="flex items-start gap-3">
        <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl border text-sm font-semibold" style={{ borderColor: border, backgroundColor: panel }}>
          {item.__imageUrl ? <img src={item.__imageUrl} alt="" className="h-full w-full object-cover" /> : initials || <Package2 className="h-5 w-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{item.name}</h3>
              <p className="mt-1 truncate text-[11px]" style={{ color: subtle }}>{item.description || item.gtin || 'Sem descrição complementar'}</p>
            </div>
            <span className="shrink-0 rounded-full px-2 py-1 text-[9px] font-semibold" style={{ backgroundColor: panel }}>
              {item.status === 'inactive' ? 'Inativo' : 'Ativo'}
            </span>
          </div>
          <div className="mt-2"><StockPill item={item} dark={dark} /></div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {[
          ['SKU / NCM', [item.code, item.ncm ? `NCM ${item.ncm}` : null].filter(Boolean).join(' · ')],
          ['Preço de venda', money(item.sale_price)],
          ['Preço de custo', money(item.cost_price)],
          ['Estoque', item.stock_managed ? `${qty(item.stock_quantity)} ${item.unit || 'UN'}` : 'Sem controle'],
        ].map(([label, value]) => (
          <div key={label} className="min-w-0 rounded-lg border px-3 py-2.5" style={{ borderColor: border, backgroundColor: panel }}>
            <span className="block text-[8px] font-semibold uppercase tracking-[.08em]" style={{ color: subtle }}>{label}</span>
            <b className="mt-1 block truncate text-[11px] font-semibold">{value || '—'}</b>
          </div>
        ))}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px]" style={{ color: subtle }}>
        <span>{item.gtin ? `GTIN ${item.gtin}` : item.updated_at ? `Atualizado em ${new Date(item.updated_at).toLocaleDateString('pt-BR')}` : 'Produto fiscal'}</span>
        <span className="font-semibold transition group-hover:translate-x-0.5">Abrir produto →</span>
      </div>
    </button>
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
