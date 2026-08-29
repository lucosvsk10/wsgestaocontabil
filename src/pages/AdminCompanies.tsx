import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, ChevronRight, Plus, Search, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminEmptyState, AdminLoadingState, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/ui/AdminPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';

type Company = { id: string; cnpj: string; company_name: string; trade_name: string | null; address: string | null; company_size: string | null; logo_url?: string | null };
type PortalUser = { id: string; name: string | null; email: string | null };
type CompanyLink = { company_id: string; user_id: string };
type Row = { key: string; company?: Company; portalUser?: PortalUser; fiscal: boolean; documentsCount: number };
type CompanyForm = { company_name: string; trade_name: string; cnpj: string; address: string; company_size: string };

const blankForm = (): CompanyForm => ({ company_name: '', trade_name: '', cnpj: '', address: '', company_size: '' });
const onlyDigits = (value: string) => value.replace(/\D/g, '');
const formatCnpj = (value?: string) => {
  const digits = onlyDigits(value || '');
  return digits.length === 14 ? digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : 'CNPJ pendente';
};

export default function AdminCompanies() {
  const navigate = useNavigate();
  const { selectCompany, refreshCompanies } = useCompanySelection();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form, setForm] = useState<CompanyForm>(blankForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const [companiesResult, usersResult, linksResult, fiscalResult, documentsResult] = await Promise.all([
        supabase.from('companies').select('id,cnpj,company_name,trade_name,address,company_size,logo_url').order('company_name'),
        supabase.from('users').select('id,name,email').eq('role', 'client').order('name'),
        supabase.from('company_user_links' as never).select('company_id,user_id'),
        supabase.from('fiscal_companies').select('company_id'),
        supabase.from('documents').select('company_id,user_id'),
      ]);
      const firstError = companiesResult.error || usersResult.error || linksResult.error || fiscalResult.error || documentsResult.error;
      if (firstError) throw firstError;

      const companies = (companiesResult.data || []) as unknown as Company[];
      const users = (usersResult.data || []) as PortalUser[];
      const links = (linksResult.data || []) as unknown as CompanyLink[];
      const companyById = new Map(companies.map(company => [company.id, company]));
      const userById = new Map(users.map(user => [user.id, user]));
      const fiscalIds = new Set(((fiscalResult.data || []) as Array<{ company_id: string | null }>).map(item => item.company_id).filter(Boolean));
      const docsByCompany = new Map<string, number>();
      const docsByUser = new Map<string, number>();
      for (const doc of (documentsResult.data || []) as Array<{ company_id: string | null; user_id: string }>) {
        if (doc.company_id) docsByCompany.set(doc.company_id, (docsByCompany.get(doc.company_id) || 0) + 1);
        docsByUser.set(doc.user_id, (docsByUser.get(doc.user_id) || 0) + 1);
      }

      const linkedCompanyIds = new Set<string>();
      const linkedUserIds = new Set<string>();
      const next: Row[] = links.map(link => {
        linkedCompanyIds.add(link.company_id);
        linkedUserIds.add(link.user_id);
        const company = companyById.get(link.company_id);
        const portalUser = userById.get(link.user_id);
        return { key: company?.id || link.user_id, company, portalUser, fiscal: Boolean(company && fiscalIds.has(company.id)), documentsCount: company ? (docsByCompany.get(company.id) || docsByUser.get(link.user_id) || 0) : (docsByUser.get(link.user_id) || 0) };
      });
      for (const company of companies.filter(item => !linkedCompanyIds.has(item.id))) next.push({ key: company.id, company, fiscal: fiscalIds.has(company.id), documentsCount: docsByCompany.get(company.id) || 0 });
      for (const user of users.filter(item => !linkedUserIds.has(item.id))) next.push({ key: `portal-${user.id}`, portalUser: user, fiscal: false, documentsCount: docsByUser.get(user.id) || 0 });
      next.sort((a, b) => (a.company?.trade_name || a.company?.company_name || a.portalUser?.name || '').localeCompare(b.company?.trade_name || b.company?.company_name || b.portalUser?.name || '', 'pt-BR'));
      setRows(next);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Não foi possível carregar os clientes.');
    } finally { setLoading(false); }
  };

  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter(row => [row.company?.company_name, row.company?.trade_name, row.company?.cnpj, row.portalUser?.name, row.portalUser?.email].some(value => String(value || '').toLowerCase().includes(term)));
  }, [rows, query]);

  const openRow = (row: Row) => {
    if (row.company) {
      selectCompany(row.company.id);
      navigate(`/admin/clientes/${row.company.id}`);
      return;
    }
    if (row.portalUser) navigate(`/admin/user-documents/${row.portalUser.id}`);
  };

  const saveNew = async () => {
    const cnpj = onlyDigits(form.cnpj);
    if (!form.company_name.trim() || cnpj.length !== 14) { setError('Informe a razão social e um CNPJ válido com 14 dígitos.'); return; }
    setSaving(true);
    setError('');
    try {
      const { data, error: insertError } = await supabase.from('companies').insert({ company_name: form.company_name.trim(), trade_name: form.trade_name.trim() || null, cnpj, address: form.address.trim() || null, company_size: form.company_size.trim() || null } as never).select('id').single();
      if (insertError) throw insertError;
      setDrawerOpen(false);
      setForm(blankForm());
      await Promise.all([load(), refreshCompanies()]);
      const id = (data as unknown as { id: string }).id;
      selectCompany(id);
      navigate(`/admin/clientes/${id}`);
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : String(saveError);
      setError(message.includes('companies_cnpj_key') ? 'Já existe um cliente cadastrado com este CNPJ.' : message);
    } finally { setSaving(false); }
  };

  return (
    <AdminLayout>
      <AdminPage>
        <AdminPageHeader eyebrow="Clientes do escritório" title="Clientes" description="Um cadastro por empresa. Clique em uma empresa para abrir a ficha completa, logo, documentos e configuração fiscal." actions={<Button onClick={() => { setForm(blankForm()); setDrawerOpen(true); }}><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>} />
        {error && !drawerOpen && <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        <div className="relative mt-6 max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input className="h-10 pl-9" value={query} onChange={event => setQuery(event.target.value)} placeholder="Buscar cliente, CNPJ ou e-mail..." /></div>

        <AdminSection className="mt-4">
          {loading ? <AdminLoadingState label="Carregando clientes..." /> : filtered.length === 0 ? <AdminEmptyState icon={<Building2 className="h-8 w-8" />} title="Nenhum cliente encontrado" /> : (
            <div>
              {filtered.map((row, index) => {
                const title = row.company?.trade_name || row.company?.company_name || row.portalUser?.name || 'Cliente sem nome';
                return <button key={row.key} type="button" onClick={() => openRow(row)} className={`grid w-full gap-3 border-b border-border/45 px-5 py-4 text-left transition last:border-b-0 hover:bg-muted/25 sm:grid-cols-[minmax(260px,1fr)_auto_auto] sm:items-center ${index % 2 ? 'bg-muted/[.08]' : 'bg-card'}`}>
                  <div className="flex min-w-0 items-center gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-muted/35">{row.company?.logo_url ? <img src={row.company.logo_url} alt="" className="h-full w-full object-contain" /> : <Building2 className="h-4 w-4" />}</div>
                    <div className="min-w-0"><p className="truncate text-sm font-semibold">{title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{row.company ? formatCnpj(row.company.cnpj) : row.portalUser?.email || 'Cadastro empresarial pendente'}</p></div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground"><span>{row.documentsCount} docs</span><span className={row.fiscal ? 'text-emerald-600 dark:text-emerald-400' : ''}>{row.fiscal ? 'A1/Fiscal ativo' : 'Fiscal pendente'}</span></div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>;
              })}
            </div>
          )}
        </AdminSection>
      </AdminPage>

      {drawerOpen && <div className="fixed inset-0 z-[120] flex justify-end bg-black/45" onMouseDown={event => { if (event.target === event.currentTarget) setDrawerOpen(false); }}><aside className="h-full w-full max-w-xl overflow-y-auto bg-card shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b border-border/60 bg-card/95 px-6 py-5 backdrop-blur"><div><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Cliente do escritório</p><h2 className="mt-1 text-xl font-semibold">Novo cliente</h2></div><Button variant="ghost" size="icon" onClick={() => setDrawerOpen(false)}><X className="h-4 w-4" /></Button></div><div className="space-y-5 p-6"><Field label="Razão social"><Input value={form.company_name} onChange={event => setForm(current => ({ ...current, company_name: event.target.value }))} /></Field><Field label="Nome fantasia"><Input value={form.trade_name} onChange={event => setForm(current => ({ ...current, trade_name: event.target.value }))} /></Field><Field label="CNPJ"><Input value={form.cnpj} onChange={event => setForm(current => ({ ...current, cnpj: event.target.value }))} /></Field><Field label="Endereço"><Input value={form.address} onChange={event => setForm(current => ({ ...current, address: event.target.value }))} /></Field><Field label="Porte"><Input value={form.company_size} onChange={event => setForm(current => ({ ...current, company_size: event.target.value }))} /></Field>{error && <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}<div className="flex justify-end gap-2 pt-2"><Button variant="ghost" onClick={() => setDrawerOpen(false)}>Cancelar</Button><Button onClick={() => void saveNew()} disabled={saving}>{saving ? 'Salvando...' : 'Criar cliente'}</Button></div></div></aside></div>}
    </AdminLayout>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}
