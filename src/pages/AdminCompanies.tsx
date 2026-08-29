import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronDown, FileKey2, FileText, Images, Mail, Pencil, Plus, ReceiptText, Search, UserRound, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminEmptyState, AdminLoadingState, AdminPage, AdminPageHeader, AdminSection, AdminToolbar } from '@/components/admin/ui/AdminPage';
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

type PortalUser = { id: string; name: string | null; email: string | null };
type CompanyLink = { company_id: string; user_id: string };
type ClientRow = {
  key: string;
  company?: Company;
  portalUser: PortalUser;
  fiscalCompanyId?: string;
  carouselItemId?: string;
  documentsCount: number;
};

type CompanyForm = { company_name: string; trade_name: string; cnpj: string; address: string; company_size: string };
const blankForm = (): CompanyForm => ({ company_name: '', trade_name: '', cnpj: '', address: '', company_size: '' });
const onlyDigits = (value: string) => value.replace(/\D/g, '');
const formatCnpj = (value?: string) => {
  const digits = onlyDigits(value || '');
  return digits.length === 14 ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : value || 'CNPJ não informado';
};

const StatusDot = ({ active, label }: { active: boolean; label: string }) => (
  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><span className={`h-1.5 w-1.5 rounded-full ${active ? 'bg-emerald-500' : 'bg-muted-foreground/30'}`} />{label}</span>
);

export default function AdminCompanies() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing, setEditing] = useState<Company | null>(null);
  const [form, setForm] = useState<CompanyForm>(blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [companiesResult, usersResult, linksResult, fiscalResult, carouselResult, documentsResult] = await Promise.all([
        supabase.from('companies').select('id,cnpj,company_name,trade_name,address,company_size,is_fiscal_automation_client,created_at,updated_at').order('company_name'),
        supabase.from('users').select('id,name,email').eq('role', 'client').order('name'),
        supabase.from('company_user_links' as never).select('company_id,user_id'),
        supabase.from('fiscal_companies').select('id,company_id'),
        supabase.from('carousel_items').select('id,company_id'),
        supabase.from('documents').select('company_id,user_id')
      ]);
      const firstError = companiesResult.error || usersResult.error || linksResult.error || fiscalResult.error || carouselResult.error || documentsResult.error;
      if (firstError) throw firstError;

      const companies = (companiesResult.data || []) as Company[];
      const users = (usersResult.data || []) as PortalUser[];
      const links = (linksResult.data || []) as unknown as CompanyLink[];
      const companyById = new Map(companies.map(company => [company.id, company]));
      const companyIdByUserId = new Map(links.map(link => [link.user_id, link.company_id]));
      const fiscalByCompany = new Map(((fiscalResult.data || []) as Array<{ id: string; company_id: string | null }>).filter(item => item.company_id).map(item => [item.company_id as string, item.id]));
      const carouselByCompany = new Map(((carouselResult.data || []) as Array<{ id: string; company_id: string | null }>).filter(item => item.company_id).map(item => [item.company_id as string, item.id]));
      const documentsByCompany = new Map<string, number>();
      const documentsByUser = new Map<string, number>();
      for (const document of (documentsResult.data || []) as Array<{ company_id: string | null; user_id: string }>) {
        if (document.company_id) documentsByCompany.set(document.company_id, (documentsByCompany.get(document.company_id) || 0) + 1);
        documentsByUser.set(document.user_id, (documentsByUser.get(document.user_id) || 0) + 1);
      }

      const nextRows: ClientRow[] = users.map(portalUser => {
        const companyId = companyIdByUserId.get(portalUser.id);
        const company = companyId ? companyById.get(companyId) : undefined;
        return {
          key: portalUser.id,
          portalUser,
          company,
          fiscalCompanyId: company ? fiscalByCompany.get(company.id) : undefined,
          carouselItemId: company ? carouselByCompany.get(company.id) : undefined,
          documentsCount: company ? (documentsByCompany.get(company.id) || documentsByUser.get(portalUser.id) || 0) : (documentsByUser.get(portalUser.id) || 0)
        };
      });

      const linkedCompanyIds = new Set(links.map(link => link.company_id));
      for (const company of companies.filter(item => !linkedCompanyIds.has(item.id))) {
        nextRows.push({ key: `company-${company.id}`, portalUser: { id: '', name: null, email: null }, company, fiscalCompanyId: fiscalByCompany.get(company.id), carouselItemId: carouselByCompany.get(company.id), documentsCount: documentsByCompany.get(company.id) || 0 });
      }

      nextRows.sort((a, b) => (a.company?.trade_name || a.company?.company_name || a.portalUser.name || '').localeCompare(b.company?.trade_name || b.company?.company_name || b.portalUser.name || '', 'pt-BR'));
      setRows(nextRows);
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os clientes.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row => [row.company?.company_name, row.company?.trade_name, row.company?.cnpj, row.portalUser.name, row.portalUser.email].some(value => String(value || '').toLowerCase().includes(term)));
  }, [rows, query]);

  const openNew = () => { setEditing(null); setForm(blankForm()); setError(''); setDrawerOpen(true); };
  const openEdit = (company: Company) => {
    setEditing(company);
    setForm({ company_name: company.company_name, trade_name: company.trade_name || '', cnpj: company.cnpj, address: company.address || '', company_size: company.company_size || '' });
    setError(''); setDrawerOpen(true);
  };
  const closeDrawer = () => { setDrawerOpen(false); setEditing(null); setForm(blankForm()); setError(''); };

  const save = async () => {
    const cnpj = onlyDigits(form.cnpj);
    if (!form.company_name.trim() || cnpj.length !== 14) { setError('Informe a razão social e um CNPJ válido com 14 dígitos.'); return; }
    setSaving(true); setError('');
    try {
      const payload = { company_name: form.company_name.trim(), trade_name: form.trade_name.trim() || null, cnpj, address: form.address.trim() || null, company_size: form.company_size.trim() || null, updated_at: new Date().toISOString() };
      if (editing) {
        const { error: updateError } = await supabase.from('companies').update(payload).eq('id', editing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('companies').insert(payload);
        if (insertError) throw insertError;
      }
      closeDrawer(); await load();
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message.includes('companies_cnpj_key') ? 'Já existe um cliente cadastrado com este CNPJ.' : message);
    } finally { setSaving(false); }
  };

  const openExtractor = (row: ClientRow) => {
    if (!row.company || !row.fiscalCompanyId) return;
    localStorage.setItem('ws_fiscal_company_id', row.fiscalCompanyId);
    localStorage.setItem('ws_fiscal_company_name', row.company.trade_name || row.company.company_name);
    localStorage.setItem('ws_office_client_company_id', row.company.id);
    navigate('/admin/feature');
  };

  return (
    <AdminLayout>
      <AdminPage>
        <AdminPageHeader eyebrow="Clientes do escritório" title="Clientes" description="A lista agora acompanha os acessos reais do portal. Quando o cadastro empresarial existe, ele aparece ligado ao mesmo cliente; quando falta, fica sinalizado sem criar dados fictícios." actions={<Button onClick={openNew}><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>} />
        {error && !drawerOpen && <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        <AdminSection className="mt-6">
          <AdminToolbar>
            <div className="relative w-full max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="border-0 bg-background/55 pl-9 shadow-none" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar por cliente, empresa, e-mail ou CNPJ..." /></div>
            <span className="text-xs text-muted-foreground">{filtered.length} cliente(s)</span>
          </AdminToolbar>

          {loading ? <AdminLoadingState label="Carregando clientes..." /> : filtered.length === 0 ? <AdminEmptyState icon={<Building2 className="h-8 w-8" />} title="Nenhum cliente encontrado" description="Os clientes com acesso ao portal aparecem aqui automaticamente." /> : (
            <div>
              {filtered.map((row, index) => {
                const expanded = expandedKey === row.key;
                const title = row.company?.trade_name || row.company?.company_name || row.portalUser.name || 'Cliente sem nome';
                return (
                  <article key={row.key} className={`border-b border-border/45 last:border-b-0 ${index % 2 === 0 ? 'bg-card' : 'bg-muted/[.08]'}`}>
                    <button type="button" onClick={() => setExpandedKey(expanded ? null : row.key)} className="grid w-full gap-4 px-5 py-4 text-left transition hover:bg-muted/15 md:grid-cols-[minmax(260px,1.4fr)_minmax(220px,1fr)_auto] md:items-center">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted/35"><Building2 className="h-4.5 w-4.5" /></div>
                        <div className="min-w-0"><p className="truncate text-sm font-semibold">{title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{row.company ? formatCnpj(row.company.cnpj) : row.portalUser.email || 'Cadastro empresarial pendente'}</p></div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1.5"><StatusDot active={Boolean(row.portalUser.id)} label="Portal" /><StatusDot active={Boolean(row.company)} label="Cadastro" /><StatusDot active={Boolean(row.fiscalCompanyId)} label="A1 / Fiscal" /><StatusDot active={row.documentsCount > 0} label={`${row.documentsCount} docs`} /></div>
                      <ChevronDown className={`h-4 w-4 justify-self-end text-muted-foreground transition-transform ${expanded ? 'rotate-180' : ''}`} />
                    </button>

                    {expanded && (
                      <div className="border-t border-border/35 bg-muted/[.06] px-5 py-4">
                        <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
                          <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                            <div className="flex items-center gap-2"><UserRound className="h-3.5 w-3.5" /><span>{row.portalUser.name || 'Sem acesso ao portal vinculado'}</span></div>
                            <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" /><span>{row.portalUser.email || 'Sem e-mail de acesso'}</span></div>
                            {row.company && <><div>Razão social: <span className="text-foreground">{row.company.company_name}</span></div><div>CNPJ: <span className="text-foreground">{formatCnpj(row.company.cnpj)}</span></div></>}
                            {!row.company && <div className="sm:col-span-2 text-amber-600 dark:text-amber-300">Este acesso do portal ainda não possui cadastro empresarial completo. Nada foi inventado ou alterado nos documentos existentes.</div>}
                          </div>
                          <div className="flex flex-wrap justify-end gap-2">
                            {row.company && <Button variant="ghost" size="sm" onClick={() => openEdit(row.company!)}><Pencil className="mr-1.5 h-4 w-4" />Editar</Button>}
                            {row.company && <Button variant="outline" size="sm" onClick={() => navigate(`/admin/clientes/${row.company!.id}/fiscal`)}><FileKey2 className="mr-1.5 h-4 w-4" />A1</Button>}
                            {row.fiscalCompanyId && <Button variant="outline" size="sm" onClick={() => openExtractor(row)}><ReceiptText className="mr-1.5 h-4 w-4" />Extrato</Button>}
                            {row.company && <Button variant="outline" size="sm" onClick={() => navigate(`/admin/carousel?company=${row.company!.id}`)}><Images className="mr-1.5 h-4 w-4" />Carrossel</Button>}
                            {row.portalUser.id && <Button variant="outline" size="sm" onClick={() => navigate(`/admin/user-documents/${row.portalUser.id}`)}><FileText className="mr-1.5 h-4 w-4" />Docs</Button>}
                          </div>
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </AdminSection>
      </AdminPage>

      {drawerOpen && <div className="fixed inset-0 z-[120] flex justify-end bg-black/45" onMouseDown={event => { if (event.target === event.currentTarget) closeDrawer(); }}><aside className="h-full w-full max-w-xl overflow-y-auto bg-card text-card-foreground shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-card/95 px-6 py-5 backdrop-blur"><div><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Cliente do escritório</p><h2 className="mt-1 text-xl font-semibold">{editing ? 'Editar cliente' : 'Novo cliente'}</h2></div><Button variant="ghost" size="icon" onClick={closeDrawer}><X className="h-4 w-4" /></Button></div><div className="space-y-5 p-6"><Field label="Razão social"><Input value={form.company_name} onChange={event => setForm(current => ({ ...current, company_name: event.target.value }))} /></Field><Field label="Nome fantasia"><Input value={form.trade_name} onChange={event => setForm(current => ({ ...current, trade_name: event.target.value }))} /></Field><Field label="CNPJ"><Input value={form.cnpj} onChange={event => setForm(current => ({ ...current, cnpj: event.target.value }))} /></Field><Field label="Endereço"><Input value={form.address} onChange={event => setForm(current => ({ ...current, address: event.target.value }))} /></Field><Field label="Porte"><Input value={form.company_size} onChange={event => setForm(current => ({ ...current, company_size: event.target.value }))} placeholder="Opcional" /></Field>{error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}<div className="flex justify-end gap-2 pt-3"><Button variant="ghost" onClick={closeDrawer}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving ? 'Salvando...' : 'Salvar cliente'}</Button></div></div></aside></div>}
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
