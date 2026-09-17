import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  FileCheck2,
  Lock,
  LogOut,
  MonitorCog,
  RefreshCw,
  Search,
  ShieldCheck,
  TriangleAlert,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui/AdminPage";
import { FiscalDocumentRecoveryPanel } from "@/components/admin/settings/FiscalDocumentRecoveryPanel";
import {
  FISCAL_HEALTH_STATES,
  type FiscalHealthCompany,
  type FiscalHealthResponse,
  type FiscalHealthState,
  fiscalHealthTone,
  formatFiscalDate,
  formatFiscalMoney,
} from "@/utils/adminFiscalHealth";

export const SettingsView = () => {
  const { toast } = useToast();
  const { signOut, user } = useAuth();
  const [tab, setTab] = useState<"general" | "health">("general");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (newPassword.length < 8) {
      setError("Use uma senha com pelo menos 8 caracteres.");
      return;
    }
    if (newPassword !== confirm) {
      setError("As senhas não conferem.");
      return;
    }
    setLoading(true);
    const { error: authError } = await supabase.auth.updateUser({ password: newPassword });
    if (authError) setError(authError.message);
    else {
      setNewPassword("");
      setConfirm("");
      toast({ title: "Senha alterada", description: "Sua senha foi atualizada com sucesso." });
    }
    setLoading(false);
  };

  return (
    <div>
      <AdminPageHeader eyebrow="Administração" title="Configurações" description="Preferências do Admin e segurança da sua conta." />
      <div className="mt-5 flex gap-2 border-b border-border/60">
        <button onClick={() => setTab("general")} className={`px-3 py-2 text-sm font-medium ${tab === "general" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
          Geral
        </button>
        <button onClick={() => setTab("health")} className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium ${tab === "health" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>
          <Activity className="h-4 w-4" />Saúde do sistema
        </button>
      </div>

      {tab === "health" ? (
        <FiscalHealth />
      ) : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <AdminSection className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/45"><Lock className="h-5 w-5" /></span>
              <div><h2 className="font-semibold">Segurança da conta</h2><p className="text-xs text-muted-foreground">{user?.email}</p></div>
            </div>
            <form onSubmit={changePassword} className="mt-6 space-y-4">
              <Field label="Nova senha"><Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field>
              <Field label="Confirmar nova senha"><Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={loading}>{loading ? "Salvando..." : "Alterar senha"}</Button>
            </form>
            <Button variant="outline" className="mt-3 w-full text-destructive hover:text-destructive" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sair da conta</Button>
          </AdminSection>
          <AdminSection className="p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/45"><MonitorCog className="h-5 w-5" /></span>
              <div><h2 className="font-semibold">Aparência</h2><p className="text-xs text-muted-foreground">Escolha o tema do painel administrativo.</p></div>
            </div>
            <div className="mt-6 rounded-xl border border-border/60 bg-muted/10 p-4"><p className="mb-3 text-xs font-medium text-muted-foreground">Tema</p><ThemeToggle /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Ambiente" value="Produção" /><Info label="Interface" value="Admin v2" /></div>
          </AdminSection>
        </div>
      )}
    </div>
  );
};

function FiscalHealth() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<FiscalHealthResponse | null>(null);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | FiscalHealthState>("all");
  const [periodDays, setPeriodDays] = useState(30);
  const [selected, setSelected] = useState<FiscalHealthCompany | null>(null);

  const load = async (silent = false) => {
    if (!silent) setLoading(true);
    setError("");
    const { data: result, error: fnError } = await supabase.functions.invoke("admin-fiscal-health", { body: { period_days: periodDays } });
    if (fnError || result?.error) setError(result?.error || fnError?.message || "Falha ao carregar a saúde fiscal");
    else {
      const next = result as FiscalHealthResponse;
      setData(next);
      setSelected((current) => current ? next.companies.find((company) => company.office_company_id === current.office_company_id) || null : null);
    }
    if (!silent) setLoading(false);
  };

  useEffect(() => {
    void load();
    const timer = window.setInterval(() => void load(true), 60000);
    return () => window.clearInterval(timer);
  }, [periodDays]);

  const filtered = useMemo(() => {
    if (!data) return [];
    const normalized = query.trim().toLowerCase();
    return data.companies.filter((company) => {
      const matchesState = stateFilter === "all" || company.state === stateFilter;
      const matchesQuery = !normalized || [company.company_name, company.trade_name, company.cnpj, company.state_label]
        .some((value) => String(value || "").toLowerCase().includes(normalized));
      return matchesState && matchesQuery;
    });
  }, [data, query, stateFilter]);

  if (loading && !data) return <div className="mt-6 flex items-center gap-2 py-10 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Carregando saúde do sistema…</div>;

  return (
    <div className="mt-6 space-y-5">
      {error && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300">
          <span>{error}</span><Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button>
        </div>
      )}

      {data && (
        <>
          <AdminSection className="p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Saúde fiscal das empresas</h2></div>
                <p className="mt-1 text-sm text-muted-foreground">Empresas sem A1 ficam neutras. Alertas aparecem somente quando existe algo fiscal para acompanhar ou corrigir.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-muted-foreground">Atualizado {formatFiscalDate(data.generated_at)}</span>
                <Button variant="outline" size="sm" disabled={loading} onClick={() => void load()}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Atualizar</Button>
              </div>
            </div>
          </AdminSection>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <SummaryCard label="Monitoradas" value={data.summary.monitored} detail={`${data.summary.total} clientes no cadastro`} state="ready" />
            <SummaryCard label="Saudáveis" value={data.summary.healthy} detail="captura dentro da cadência" state="healthy" />
            <SummaryCard label="Prontas" value={data.summary.ready} detail="A1 válido, falta iniciar" state="ready" />
            <SummaryCard label="Atenção / falha" value={data.summary.attention + data.summary.error} detail={`${data.summary.error} com falha real`} state={data.summary.error ? "error" : "attention"} />
            <SummaryCard label="Sem captura" value={data.summary.neutral} detail="neutras, sem A1/configuração" state="neutral" />
          </div>

          <AdminSection className="p-0">
            <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="relative w-full max-w-lg">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa, CNPJ ou status..." className="pl-9" />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as "all" | FiscalHealthState)} className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring">
                  {FISCAL_HEALTH_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                </select>
                <div className="flex rounded-md border border-border/70 p-0.5">
                  {[7, 30, 90].map((days) => (
                    <button key={days} onClick={() => setPeriodDays(days)} className={`rounded px-2.5 py-1.5 text-xs font-medium transition ${periodDays === days ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{days} dias</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <div className="min-w-[980px]">
                <div className="grid grid-cols-[32px_minmax(220px,1.5fr)_140px_150px_150px_150px_110px_28px] gap-3 border-b border-border/50 bg-muted/[.12] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                  <span></span><span>Empresa</span><span>A1</span><span>Compras</span><span>Vendas</span><span>Última verificação</span><span>Docs.</span><span></span>
                </div>
                {filtered.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada com esses filtros.</div>
                ) : filtered.map((company) => <HealthRow key={company.office_company_id} company={company} onOpen={() => setSelected(company)} />)}
              </div>
            </div>
            <div className="border-t border-border/50 px-5 py-3 text-xs text-muted-foreground">Período analítico: últimos {periodDays} dias. A janela técnica de busca é exibida separadamente no detalhe da empresa.</div>
          </AdminSection>

          <FiscalDocumentRecoveryPanel onChanged={() => void load(true)} />
        </>
      )}

      {selected && <CompanyHealthDrawer company={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function HealthRow({ company, onOpen }: { company: FiscalHealthCompany; onOpen: () => void }) {
  const tone = fiscalHealthTone(company.state);
  const docs = company.metrics.purchases.count + company.metrics.sales.count;
  return (
    <button onClick={onOpen} className="grid w-full grid-cols-[32px_minmax(220px,1.5fr)_140px_150px_150px_150px_110px_28px] items-center gap-3 border-b border-border/45 px-5 py-3.5 text-left transition last:border-b-0 hover:bg-muted/20">
      <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{company.trade_name || company.company_name}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{company.cnpj || "CNPJ não informado"} · {company.state_label}</span></span>
      <span className="text-xs text-muted-foreground">{company.certificate_status === "valid" ? `Válido${company.certificate_valid_until ? ` até ${new Date(`${company.certificate_valid_until}T12:00:00`).toLocaleDateString("pt-BR")}` : ""}` : company.certificate_status === "expired" ? "Vencido" : "Não configurado"}</span>
      <SyncCell snapshot={company.purchase} neutral={company.state === "neutral"} />
      <SyncCell snapshot={company.sales} neutral={company.state === "neutral"} />
      <span className="text-xs text-muted-foreground">{formatFiscalDate(company.last_checked_at)}</span>
      <span className="text-xs font-medium">{docs}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function SyncCell({ snapshot, neutral }: { snapshot: FiscalHealthCompany["purchase"]; neutral?: boolean }) {
  if (neutral) return <span className="text-xs text-muted-foreground">Não monitora</span>;
  if (!snapshot) return <span className="text-xs text-sky-600 dark:text-sky-400">Não iniciada</span>;
  const className = snapshot.last_error ? "text-amber-600 dark:text-amber-400" : snapshot.fresh ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400";
  return <span><span className={`block text-xs font-medium ${className}`}>{snapshot.label}</span><span className="mt-0.5 block text-[10px] text-muted-foreground">{formatFiscalDate(snapshot.last_completed_at)}</span></span>;
}

function CompanyHealthDrawer({ company, onClose }: { company: FiscalHealthCompany; onClose: () => void }) {
  const tone = fiscalHealthTone(company.state);
  const period = company.metrics.period_days;
  return (
    <div className="fixed inset-0 z-[160] flex justify-end bg-black/45" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-3xl overflow-y-auto border-l border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background/95 px-6 py-5 backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} /><p className={`text-xs font-semibold ${tone.text}`}>{company.state_label}</p></div>
            <h2 className="mt-1 truncate text-xl font-semibold">{company.trade_name || company.company_name}</h2>
            <p className="mt-1 text-xs text-muted-foreground">{company.cnpj || "CNPJ não informado"} · última verificação {formatFiscalDate(company.last_checked_at)}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-5 p-6">
          <div className={`rounded-xl border p-4 ${tone.soft}`}><p className="text-sm font-semibold">{company.state_detail}</p><p className="mt-1 text-xs opacity-80">Código: {company.reason_code}</p></div>

          <div className="grid gap-3 sm:grid-cols-3">
            <DetailTile label="Certificado A1" value={company.certificate_status === "valid" ? "Válido" : company.certificate_status === "expired" ? "Vencido" : "Não configurado"} detail={company.certificate_valid_until ? `Validade ${new Date(`${company.certificate_valid_until}T12:00:00`).toLocaleDateString("pt-BR")}` : "Sem validade registrada"} />
            <DetailTile label="Captura automática" value={company.capture_enabled ? "Apta" : company.state === "neutral" ? "Neutra" : "Bloqueada"} detail={company.can_start ? "Pronta para primeira extração" : company.state_label} />
            <DetailTile label="Período analisado" value={`${period} dias`} detail={`${new Date(company.metrics.period_start).toLocaleDateString("pt-BR")} a ${new Date(company.metrics.period_end).toLocaleDateString("pt-BR")}`} />
          </div>

          <AdminSection className="p-0">
            <div className="border-b border-border/60 px-5 py-4"><p className="text-xs font-semibold uppercase tracking-[.12em] text-muted-foreground">Movimentação fiscal</p><h3 className="mt-1 font-semibold">Compras x vendas</h3></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="text-left text-[10px] uppercase tracking-[.12em] text-muted-foreground"><tr><th className="px-5 py-3 font-semibold"></th><th className="px-4 py-3 font-semibold">Compras</th><th className="px-4 py-3 font-semibold">Vendas</th></tr></thead>
                <tbody className="divide-y divide-border/45">
                  <MetricLine label="Documentos" purchase={String(company.metrics.purchases.count)} sales={String(company.metrics.sales.count)} />
                  <MetricLine label="Valor total" purchase={formatFiscalMoney(company.metrics.purchases.value)} sales={formatFiscalMoney(company.metrics.sales.value)} />
                  <MetricLine label="XML integral" purchase={`${company.metrics.purchases.full_xml}/${company.metrics.purchases.count}`} sales={`${company.metrics.sales.full_xml}/${company.metrics.sales.count}`} />
                  <MetricLine label="XML pendente" purchase={String(company.metrics.purchases.pending_xml)} sales={String(company.metrics.sales.pending_xml)} />
                  <MetricLine label={`Variação vs. ${period} dias anteriores`} purchase={formatDelta(company.metrics.purchases.count_delta_percent)} sales={formatDelta(company.metrics.sales.count_delta_percent)} />
                </tbody>
              </table>
            </div>
          </AdminSection>

          <div className="grid gap-4 lg:grid-cols-2">
            <SyncPanel title="Compras" snapshot={company.purchase} technicalWindow={company.technical_window.purchases} />
            <SyncPanel title="Vendas" snapshot={company.sales} technicalWindow={company.technical_window.sales} />
          </div>

          <AdminSection className="p-5">
            <div className="flex items-center gap-2"><Activity className="h-4 w-4 text-muted-foreground" /><h3 className="font-semibold">Últimas verificações</h3></div>
            <div className="mt-4 space-y-0">
              {company.timeline.length === 0 ? <p className="text-sm text-muted-foreground">Ainda não há eventos de sincronização para esta empresa.</p> : company.timeline.map((item, index) => (
                <div key={`${item.at}-${index}`} className="relative flex gap-3 pb-4 last:pb-0">
                  {index < company.timeline.length - 1 && <span className="absolute left-[5px] top-4 h-[calc(100%-10px)] w-px bg-border" />}
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${item.status === "ok" ? "bg-emerald-500" : item.status === "error" ? "bg-red-500" : item.status === "attention" ? "bg-amber-500" : "bg-slate-400"}`} />
                  <div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2"><p className="text-sm font-medium">{item.title}</p><span className="text-[10px] text-muted-foreground">{formatFiscalDate(item.at)}</span></div><p className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">{item.detail}</p></div>
                </div>
              ))}
            </div>
          </AdminSection>
        </div>
      </aside>
    </div>
  );
}

function SyncPanel({ title, snapshot, technicalWindow }: { title: string; snapshot: FiscalHealthCompany["purchase"] | FiscalHealthCompany["sales"]; technicalWindow: string }) {
  return (
    <AdminSection className="p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3>{snapshot && <span className={`text-xs font-semibold ${snapshot.fresh && !snapshot.last_error ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{snapshot.label}</span>}</div>
      {!snapshot ? <p className="mt-4 text-sm text-muted-foreground">Rotina ainda não iniciada.</p> : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Info label="Última conclusão" value={formatFiscalDate(snapshot.last_completed_at)} />
          <Info label="Próxima execução" value={formatFiscalDate(snapshot.next_scheduled_at)} />
          <Info label="Falhas recentes" value={String(snapshot.failure_count)} />
          <Info label="Status técnico" value={snapshot.status || "—"} />
          {snapshot.last_error && <div className="sm:col-span-2 rounded-lg border border-amber-500/20 bg-amber-500/[.06] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-amber-700 dark:text-amber-300">{snapshot.error_scope === "external" ? "Serviço fiscal externo" : "Falha interna / integração"}</p><p className="mt-1 break-words text-xs text-muted-foreground">{snapshot.last_error}</p></div>}
        </div>
      )}
      <div className="mt-4 rounded-lg border border-border/60 bg-muted/[.12] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">Janela técnica</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{technicalWindow}</p></div>
      {snapshot && "reconciliation_total" in snapshot && snapshot.reconciliation_total != null && (
        <div className="mt-3 grid grid-cols-3 gap-2 text-center"><Info label="Reconciliação" value={`${snapshot.reconciliation_resolved || 0}/${snapshot.reconciliation_total || 0}`} /><Info label="XML pendente" value={String(snapshot.xml_pending || 0)} /><Info label="Detalhes pendentes" value={String(snapshot.detail_pending || 0)} /></div>
      )}
    </AdminSection>
  );
}

function SummaryCard({ label, value, detail, state }: { label: string; value: number; detail: string; state: FiscalHealthState }) {
  const tone = fiscalHealthTone(state);
  return <AdminSection className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><span className={`h-2 w-2 rounded-full ${tone.dot}`} /></div><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></AdminSection>;
}

function DetailTile({ label, value, detail }: { label: string; value: string; detail: string }) {
  return <div className="rounded-xl border border-border/60 bg-muted/[.08] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>;
}

function MetricLine({ label, purchase, sales }: { label: string; purchase: string; sales: string }) {
  return <tr><td className="px-5 py-3 text-xs text-muted-foreground">{label}</td><td className="px-4 py-3 font-medium">{purchase}</td><td className="px-4 py-3 font-medium">{sales}</td></tr>;
}

function formatDelta(value: number | null) {
  if (value == null) return "Sem base anterior";
  if (value === 0) return "0%";
  return `${value > 0 ? "+" : ""}${value}%`;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-border/60 bg-muted/[.08] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.11em] text-muted-foreground">{label}</p><p className="mt-1 break-words text-xs font-medium text-foreground">{value}</p></div>;
}
