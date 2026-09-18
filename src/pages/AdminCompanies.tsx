import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Loader2, Play, Plus, Search, X } from 'lucide-react';
import AdminClientOnboardingModal from '@/components/admin/clients/AdminClientOnboardingModal';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminEmptyState, AdminLoadingState, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/ui/AdminPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySelection, type OfficeCompanySelection } from '@/contexts/CompanySelectionContext';
import {
  type FiscalHealthCompany,
  type FiscalHealthResponse,
  fiscalHealthTone,
  fiscalHealthTooltipLines,
} from '@/utils/adminFiscalHealth';

const digits = (value: string | null | undefined) => String(value || '').replace(/\D/g, '');
const formatCnpj = (value: string | null | undefined) => {
  const d = digits(value);
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5') : 'Cadastro pendente';
};
const initial = (name: string) => name.trim().charAt(0).toUpperCase() || '?';
const formatCpf = (value: string | null | undefined) => {
  const d = digits(value);
  return d.length === 11 ? d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4') : String(value || 'Cadastro pendente');
};
const formatCompanyDocument = (company: OfficeCompanySelection) =>
  company.document_type === 'cpf'
    ? formatCpf(company.document_number)
    : company.document_type === 'other'
      ? company.document_number || 'Cadastro pendente'
      : formatCnpj(company.cnpj || company.document_number);

const formatDate = (value?: string | null) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(date);
};

const taxRegimeLabel = (value?: string | null) => {
  const labels: Record<string, string> = {
    simples: 'Simples Nacional',
    simples_nacional: 'Simples Nacional',
    mei: 'MEI',
    presumido: 'Lucro Presumido',
    lucro_presumido: 'Lucro Presumido',
    real: 'Lucro Real',
    lucro_real: 'Lucro Real',
  };
  return labels[String(value || '').toLowerCase()] || value || 'Não informado';
};
async function functionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : String(error || 'Erro inesperado');
  try {
    const context = (error as { context?: Response })?.context;
    if (!context) return fallback;
    const payload = await context.clone().json();
    return payload?.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminCompanies() {
  const navigate = useNavigate();
  const { companies, loading: companiesLoading, refreshCompanies, selectCompany } = useCompanySelection();
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [error, setError] = useState('');
  const [fiscalStatuses, setFiscalStatuses] = useState<Record<string, FiscalHealthCompany>>({});
  const [statusLoading, setStatusLoading] = useState(true);
  const [bootstrapCompany, setBootstrapCompany] = useState<OfficeCompanySelection | null>(null);
  const [starting, setStarting] = useState(false);

  const loadFiscalStatus = async (silent = false) => {
    if (!silent) setStatusLoading(true);
    try {
      const { data, error: functionError } = await supabase.functions.invoke('admin-fiscal-health-v2', { body: { period_days: 30 } });
      if (functionError) throw functionError;
      if (data?.error) throw new Error(data.error);
      const response = data as FiscalHealthResponse;
      setFiscalStatuses(Object.fromEntries((response.company_health || []).map((row) => [row.office_company_id, row])));
    } catch (loadError) {
      console.error('[AdminCompanies] Falha ao carregar saúde fiscal', loadError);
    } finally {
      if (!silent) setStatusLoading(false);
    }
  };

  useEffect(() => {
    void loadFiscalStatus();
    const timer = window.setInterval(() => void loadFiscalStatus(true), 30000);
    const onFocus = () => void loadFiscalStatus(true);
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return !normalized
      ? companies
      : companies.filter((company) => [company.company_name, company.trade_name, company.cnpj, company.document_number, company.portal_username, company.state_registration, company.city, company.state].some((value) => String(value || '').toLowerCase().includes(normalized)));
  }, [companies, query]);

  const openCompany = (company: OfficeCompanySelection) => {
    selectCompany(company.id);
    navigate(`/admin/clientes/${company.id}`);
  };

  const startBootstrap = async () => {
    if (!bootstrapCompany) return;
    setStarting(true);
    setError('');
    try {
      const { data, error: invokeError } = await supabase.functions.invoke('admin-fiscal-bootstrap', { body: { action: 'start', company_id: bootstrapCompany.id } });
      if (invokeError) throw invokeError;
      if (!data?.ok) throw new Error(data?.error || 'Não foi possível iniciar a extração.');
      setBootstrapCompany(null);
      await loadFiscalStatus();
    } catch (startError) {
      setError(await functionErrorMessage(startError));
    } finally {
      setStarting(false);
    }
  };

  return (
    <AdminLayout>
      <AdminPage className="ws-admin-polish">
        <AdminPageHeader
          eyebrow="Clientes"
          title="Clientes"
          description="Gerencie os clientes do escritório. A saúde fiscal aparece de forma compacta e só sinaliza erro quando existe uma captura configurada com problema."
          actions={<Button className="ws-stage4-primary-action" onClick={() => setOpen(true)}><Plus className="mr-2 h-4 w-4" />Novo cliente</Button>}
        />

        <div className="mt-5 flex gap-2 border-b border-border pb-3">
          <button className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background">Clientes do escritório</button>
          <button onClick={() => navigate('/admin/assinantes')} className="rounded-md px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">Assinantes dos SaaS</button>
        </div>

        {error && !open && <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}

        <div className="mt-6 flex items-center gap-3">
          <div className="relative w-full max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar cliente por nome, CNPJ ou CPF..." className="pl-9" /></div>
          <span className="whitespace-nowrap text-xs text-muted-foreground">{filtered.length} cliente(s)</span>
        </div>

        <AdminSection className="mt-4">
          {companiesLoading ? (
            <AdminLoadingState label="Carregando clientes..." />
          ) : filtered.length === 0 ? (
            <AdminEmptyState title="Nenhum cliente encontrado" />
          ) : (
            <TooltipProvider delayDuration={150}>
              <div>
                {filtered.map((company, index) => {
                  const name = company.trade_name || company.company_name;
                  const fiscal = fiscalStatuses[company.id];
                  return (
                    <div
                      key={company.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => openCompany(company)}
                      onKeyDown={(event) => { if (event.key === 'Enter') openCompany(company); }}
                      className={`w-full cursor-pointer border-b border-border/45 px-5 py-5 text-left transition last:border-b-0 hover:bg-muted/20 ${index % 2 ? 'bg-muted/[.04]' : 'bg-card'}`}
                    >
                      <div className="flex items-start gap-4">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-border/50 bg-muted/35 text-sm font-semibold text-muted-foreground">
                          {company.logo_url ? <img src={company.logo_url} alt="" className="h-full w-full object-contain" /> : initial(name)}
                        </span>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-sm font-semibold">{name}</span>
                            {company.portal_username ? (
                              <span className="rounded-full border border-border/70 bg-muted/35 px-2.5 py-1 font-mono text-[10px] font-semibold text-foreground">
                                @{company.portal_username}
                              </span>
                            ) : (
                              <span className="rounded-full border border-dashed border-border px-2.5 py-1 text-[10px] text-muted-foreground">
                                sem usuário vinculado
                              </span>
                            )}
                          </div>
                          <span className="mt-1 block truncate text-xs text-muted-foreground">
                            {company.trade_name ? company.company_name : formatCompanyDocument(company)}
                          </span>

                          <div className="mt-4 grid gap-x-6 gap-y-3 text-xs sm:grid-cols-2 xl:grid-cols-5">
                            <CompanyMeta label="Documento" value={formatCompanyDocument(company)} />
                            <CompanyMeta label="Inscrição estadual" value={company.state_registration || 'Não informada'} />
                            <CompanyMeta
                              label="Localização"
                              value={[company.city, company.state].filter(Boolean).join(' / ') || 'Não informada'}
                            />
                            <CompanyMeta label="Porte / regime" value={[company.company_size, taxRegimeLabel(company.tax_regime)].filter(Boolean).join(' · ')} />
                            <CompanyMeta
                              label="Cadastro sincronizado"
                              value={company.registry_updated_at ? formatDate(company.registry_updated_at) : 'Ainda não sincronizado'}
                            />
                          </div>
                        </div>

                        <div className="hidden min-w-[170px] shrink-0 text-right lg:block">
                          {company.portal_user_id ? (
                            <>
                              <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                                company.portal_must_change_password === false
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                              }`}>
                                {company.portal_must_change_password === false ? 'Senha alterada' : 'Senha padrão'}
                              </span>
                              <span className="mt-1.5 block text-[10px] text-muted-foreground">
                                {company.portal_must_change_password === false
                                  ? `alterada em ${formatDate(company.portal_password_changed_at)}`
                                  : 'aguardando primeiro acesso'}
                              </span>
                            </>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">Sem acesso do portal</span>
                          )}
                        </div>

                        <FiscalHealthIndicator
                          company={fiscal}
                          loading={statusLoading && !fiscal}
                          onReady={() => setBootstrapCompany(company)}
                        />

                        <span className="text-lg text-muted-foreground/50">›</span>
                      </div>

                      {company.portal_user_id && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 pl-[60px] lg:hidden">
                          <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                            company.portal_must_change_password === false
                              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                              : 'bg-amber-500/10 text-amber-700 dark:text-amber-300'
                          }`}>
                            {company.portal_must_change_password === false ? 'Senha alterada' : 'Senha padrão'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {company.portal_must_change_password === false
                              ? `desde ${formatDate(company.portal_password_changed_at)}`
                              : 'troca obrigatória no primeiro acesso'}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </TooltipProvider>
          )}
        </AdminSection>

        {bootstrapCompany && (
          <div className="fixed inset-0 z-[145] grid place-items-center bg-black/55 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !starting) setBootstrapCompany(null); }}>
            <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl">
              <div className="flex items-start justify-between gap-4">
                <div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Primeira extração fiscal</p><h2 className="mt-2 text-xl font-semibold">Buscar notas de {bootstrapCompany.trade_name || bootstrapCompany.company_name}</h2></div>
                <Button variant="ghost" size="icon" disabled={starting} onClick={() => setBootstrapCompany(null)}><X className="h-4 w-4" /></Button>
              </div>
              <div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-4">
                <p className="text-sm leading-6 text-foreground">É a primeira vez que esta empresa será sincronizada. O sistema vai iniciar a busca das notas fiscais de <strong>compra e venda dos últimos 30 dias</strong> e, depois disso, manter a rotina fiscal atualizada automaticamente.</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">A disponibilidade efetiva dos documentos de compra também depende do histórico entregue pela distribuição da SEFAZ.</p>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <Button variant="outline" disabled={starting} onClick={() => setBootstrapCompany(null)}>Cancelar</Button>
                <Button disabled={starting} onClick={() => void startBootstrap()}>{starting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-2 h-4 w-4" />}{starting ? 'Iniciando...' : 'Iniciar'}</Button>
              </div>
            </div>
          </div>
        )}

        <AdminClientOnboardingModal
          open={open}
          onClose={() => setOpen(false)}
          onCreated={async ({ company_id }) => {
            setOpen(false);
            await refreshCompanies();
            await loadFiscalStatus();
            selectCompany(company_id);
          }}
        />
      </AdminPage>
    </AdminLayout>
  );
}

function FiscalHealthIndicator({ company, loading, onReady }: { company?: FiscalHealthCompany; loading?: boolean; onReady: () => void }) {
  if (loading) return <span className="flex h-8 w-8 items-center justify-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /></span>;

  const fallback: FiscalHealthCompany = {
    office_company_id: '', fiscal_company_id: null, company_name: '', trade_name: null, cnpj: null, uf: null,
    state: 'neutral', state_label: 'Saúde fiscal indisponível', state_detail: 'Ainda não foi possível carregar o estado fiscal.', reason_code: 'UNKNOWN',
    capture_enabled: false, can_start: false, certificate_status: 'missing', certificate_valid_until: null, has_state_credentials: false, last_checked_at: null,
    purchase: null, sales: null,
    metrics: { period_days: 30, period_start: '', period_end: '', previous_start: '', purchases: { count: 0, value: 0, full_xml: 0, pending_xml: 0, previous_count: 0, previous_value: 0, count_delta_percent: 0, value_delta_percent: 0, last_document_at: null }, sales: { count: 0, value: 0, full_xml: 0, pending_xml: 0, previous_count: 0, previous_value: 0, count_delta_percent: 0, value_delta_percent: 0, last_document_at: null } },
    technical_window: { purchases: '', sales: '' }, timeline: [],
  };
  const status = company || fallback;
  const tone = fiscalHealthTone(status.state);
  const lines = fiscalHealthTooltipLines(status);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={`Saúde fiscal: ${status.state_label}`}
          onClick={(event) => {
            event.stopPropagation();
            if (status.can_start) onReady();
          }}
          className={`relative flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition hover:bg-muted ${tone.text}`}
        >
          <Activity className="h-[17px] w-[17px]" />
          <span className={`absolute right-1 top-1 h-2 w-2 rounded-full border-2 border-card ${tone.dot}`} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="max-w-xs px-3 py-2">
        <div className="space-y-1">
          <p className="font-semibold">{lines[0]}</p>
          {lines.slice(1).map((line) => <p key={line} className="opacity-85">{line}</p>)}
          {status.can_start && <p className="pt-1 font-semibold">Clique no indicador para iniciar a primeira extração.</p>}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function CompanyMeta({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0">
      <span className="block text-[9px] font-semibold uppercase tracking-[.08em] text-muted-foreground/75">{label}</span>
      <span className="mt-1 block truncate text-[11px] font-medium text-foreground/85">{value || 'Não informado'}</span>
    </span>
  );
}
