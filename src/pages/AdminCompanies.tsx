import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, FileText, Images, Pencil, Plus, ReceiptText, Search, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';

type Company = {
  id: string;
  cnpj: string;
  company_name: string;
  trade_name: string | null;
  address: string | null;
  company_size: string | null;
  is_fiscal_automation_client: boolean | null;
  created_at: string;
  updated_at: string;
};

type CompanyState = Company & {
  fiscalCompanyId?: string;
  carouselItemId?: string;
  portalUserId?: string;
  portalUserName?: string;
  documentsCount: number;
};

type CompanyForm = {
  company_name: string;
  trade_name: string;
  cnpj: string;
  address: string;
  company_size: string;
};

const blankForm = (): CompanyForm => ({
  company_name: '',
  trade_name: '',
  cnpj: '',
  address: '',
  company_size: ''
});

const onlyDigits = (value: string) => value.replace(/\D/g, '');

const formatCnpj = (value: string) => {
  const digits = onlyDigits(value);
  if (digits.length !== 14) return value;
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
};

const StatusPill = ({ active, children }: { active: boolean; children: React.ReactNode }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${active ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-muted text-muted-foreground'}`}>
    {children}
  </span>
);

export default function AdminCompanies() {
  const navigate = useNavigate();
  const [companies, setCompanies] = useState<CompanyState[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [companiesResult, fiscalResult, carouselResult, linksResult, documentsResult] = await Promise.all([
        supabase.from('companies').select('id,cnpj,company_name,trade_name,address,company_size,is_fiscal_automation_client,created_at,updated_at').order('company_name'),
        supabase.from('fiscal_companies').select('id,company_id'),
        supabase.from('carousel_items').select('id,company_id'),
        supabase.from('company_user_links' as never).select('company_id,user_id'),
        supabase.from('documents').select('company_id')
      ]);

      const firstError = companiesResult.error || fiscalResult.error || carouselResult.error || linksResult.error || documentsResult.error;
      if (firstError) throw firstError;

      const userLinks = (linksResult.data || []) as unknown as Array<{ company_id: string; user_id: string }>;
      const userIds = [...new Set(userLinks.map(link => link.user_id))];
      let users: Array<{ id: string; name: string | null }> = [];
      if (userIds.length) {
        const usersResult = await supabase.from('users').select('id,name').in('id', userIds);
        if (usersResult.error) throw usersResult.error;
        users = (usersResult.data || []) as Array<{ id: string; name: string | null }>;
      }

      const fiscalByCompany = new Map(((fiscalResult.data || []) as Array<{ id: string; company_id: string | null }>).filter(item => item.company_id).map(item => [item.company_id as string, item.id]));
      const carouselByCompany = new Map(((carouselResult.data || []) as Array<{ id: string; company_id: string | null }>).filter(item => item.company_id).map(item => [item.company_id as string, item.id]));
      const userById = new Map(users.map(user => [user.id, user]));
      const linkByCompany = new Map(userLinks.map(link => [link.company_id, link.user_id]));
      const documentCounts = new Map<string, number>();
      for (const document of (documentsResult.data || []) as Array<{ company_id: string | null }>) {
        if (!document.company_id) continue;
        documentCounts.set(document.company_id, (documentCounts.get(document.company_id) || 0) + 1);
      }

      setCompanies(((companiesResult.data || []) as Company[]).map(company => {
        const portalUserId = linkByCompany.get(company.id);
        return {
          ...company,
          fiscalCompanyId: fiscalByCompany.get(company.id),
          carouselItemId: carouselByCompany.get(company.id),
          portalUserId,
          portalUserName: portalUserId ? userById.get(portalUserId)?.name || undefined : undefined,
          documentsCount: documentCounts.get(company.id) || 0
        };
      }));
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar as empresas.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return companies;
    return companies.filter(company => [company.company_name, company.trade_name, company.cnpj].some(value => String(value || '').toLowerCase().includes(term)));
  }, [companies, query]);

  const openNew = () => {
    setEditing(null);
    setForm(blankForm());
    setError('');
    setDrawerOpen(true);
  };

  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({
      company_name: company.company_name,
      trade_name: company.trade_name || '',
      cnpj: company.cnpj,
      address: company.address || '',
      company_size: company.company_size || ''
    });
    setError('');
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setEditing(null);
    setForm(blankForm());
    setError('');
  };

  const save = async () => {
    const cnpj = onlyDigits(form.cnpj);
    if (!form.company_name.trim() || cnpj.length !== 14) {
      setError('Informe a razão social e um CNPJ válido com 14 dígitos.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const payload = {
        company_name: form.company_name.trim(),
        trade_name: form.trade_name.trim() || null,
        cnpj,
        address: form.address.trim() || null,
        company_size: form.company_size.trim() || null,
        updated_at: new Date().toISOString()
      };

      if (editing) {
        const { error: updateError } = await supabase.from('companies').update(payload).eq('id', editing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('companies').insert(payload);
        if (insertError) throw insertError;
      }

      closeDrawer();
      await load();
    } catch (saveError) {
      console.error(saveError);
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message.includes('companies_cnpj_key') ? 'Já existe uma empresa cadastrada com este CNPJ.' : message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminLayout>
      <main className="mx-auto w-full max-w-[1480px] px-5 py-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Cadastro central</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">Empresas</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Uma empresa é cadastrada uma única vez e depois vinculada às funções do sistema.</p>
          </div>
          <Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Nova empresa</Button>
        </div>

        {error && !drawerOpen && <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        <section className="mt-6 overflow-hidden rounded-2xl bg-background shadow-sm ring-1 ring-black/[.04] dark:ring-white/[.06]">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/10 p-4">
            <div className="relative w-full max-w-xl">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input className="border-0 bg-muted/30 pl-9 shadow-none" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por razão social, nome fantasia ou CNPJ..." />
            </div>
            <span className="text-xs text-muted-foreground">{filtered.length} empresa(s)</span>
          </div>

          {loading ? (
            <div className="p-12 text-center text-sm text-muted-foreground">Carregando empresas...</div>
          ) : filtered.length === 0 ? (
            <div className="p-14 text-center"><Building2 className="mx-auto h-8 w-8 text-muted-foreground" /><p className="mt-3 font-medium">Nenhuma empresa encontrada</p><p className="mt-1 text-sm text-muted-foreground">Cadastre a empresa uma vez aqui. Os demais módulos passam a reutilizar este cadastro.</p></div>
          ) : (
            <div className="divide-y divide-border/60">
              {filtered.map(company => (
                <article key={company.id} className="grid gap-5 px-5 py-5 transition hover:bg-muted/10 xl:grid-cols-[minmax(280px,1.3fr)_1fr_auto] xl:items-center">
                  <div className="flex min-w-0 items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-muted/30"><Building2 className="h-5 w-5" /></div>
                    <div className="min-w-0">
                      <p className="truncate font-semibold">{company.trade_name || company.company_name}</p>
                      {company.trade_name && <p className="truncate text-xs text-muted-foreground">{company.company_name}</p>}
                      <p className="mt-1 text-xs text-muted-foreground">{formatCnpj(company.cnpj)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <StatusPill active={Boolean(company.portalUserId)}>Portal {company.portalUserName ? `· ${company.portalUserName}` : ''}</StatusPill>
                    <StatusPill active={Boolean(company.fiscalCompanyId)}>Fiscal</StatusPill>
                    <StatusPill active={Boolean(company.carouselItemId)}>Carrossel</StatusPill>
                    <StatusPill active={company.documentsCount > 0}>{company.documentsCount} documento(s)</StatusPill>
                  </div>

                  <div className="flex flex-wrap justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={() => openEdit(company)}><Pencil className="mr-1.5 h-4 w-4" />Editar</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/fiscal/empresas?company=${company.id}`)}><ReceiptText className="mr-1.5 h-4 w-4" />Fiscal</Button>
                    <Button variant="outline" size="sm" onClick={() => navigate(`/admin/carousel?company=${company.id}`)}><Images className="mr-1.5 h-4 w-4" />Carrossel</Button>
                    {company.portalUserId && <Button variant="outline" size="sm" onClick={() => navigate(`/admin/user-documents/${company.portalUserId}`)}><FileText className="mr-1.5 h-4 w-4" />Documentos</Button>}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      {drawerOpen && (
        <div className="fixed inset-0 z-[120] flex justify-end bg-black/45" onMouseDown={event => { if (event.target === event.currentTarget) closeDrawer(); }}>
          <aside className="h-full w-full max-w-xl overflow-y-auto bg-background shadow-2xl">
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-6 py-5 backdrop-blur">
              <div><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Cadastro central</p><h2 className="mt-1 text-xl font-semibold">{editing ? 'Editar empresa' : 'Nova empresa'}</h2></div>
              <Button variant="ghost" size="icon" onClick={closeDrawer}><X className="h-4 w-4" /></Button>
            </div>
            <div className="space-y-5 p-6">
              <Field label="Razão social"><Input value={form.company_name} onChange={event => setForm(current => ({ ...current, company_name: event.target.value }))} /></Field>
              <Field label="Nome fantasia"><Input value={form.trade_name} onChange={event => setForm(current => ({ ...current, trade_name: event.target.value }))} /></Field>
              <Field label="CNPJ"><Input value={form.cnpj} onChange={event => setForm(current => ({ ...current, cnpj: event.target.value }))} /></Field>
              <Field label="Endereço"><Input value={form.address} onChange={event => setForm(current => ({ ...current, address: event.target.value }))} /></Field>
              <Field label="Porte"><Input value={form.company_size} onChange={event => setForm(current => ({ ...current, company_size: event.target.value }))} placeholder="Opcional" /></Field>
              {error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
              <div className="flex justify-end gap-2 pt-3"><Button variant="ghost" onClick={closeDrawer}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar empresa'}</Button></div>
            </div>
          </aside>
        </div>
      )}
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
