import { useEffect, useMemo, useState } from "react";
import { Activity, ChevronRight, Lock, LogOut, MonitorCog, RefreshCw, Search, ShieldCheck, Wrench, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui/AdminPage";
import {
  FISCAL_HEALTH_STATES,
  type FiscalHealthCompany,
  type FiscalHealthResponse,
  type FiscalHealthState,
  fiscalHealthTone,
  formatFiscalDate,
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
    if (newPassword.length < 8) return setError("Use uma senha com pelo menos 8 caracteres.");
    if (newPassword !== confirm) return setError("As senhas não conferem.");
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
        <button onClick={() => setTab("general")} className={`px-3 py-2 text-sm font-medium ${tab === "general" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}>Geral</button>
        <button onClick={() => setTab("health")} className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium ${tab === "health" ? "border-b-2 border-primary text-foreground" : "text-muted-foreground"}`}><Activity className="h-4 w-4" />Saúde do sistema</button>
      </div>

      {tab === "health" ? <FiscalHealth /> : (
        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <AdminSection className="p-6">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/45"><Lock className="h-5 w-5" /></span><div><h2 className="font-semibold">Segurança da conta</h2><p className="text-xs text-muted-foreground">{user?.email}</p></div></div>
            <form onSubmit={changePassword} className="mt-6 space-y-4">
              <Field label="Nova senha"><Input type="password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} /></Field>
              <Field label="Confirmar nova senha"><Input type="password" value={confirm} onChange={(event) => setConfirm(event.target.value)} /></Field>
              {error && <p className="text-sm text-destructive">{error}</p>}
              <Button className="w-full" disabled={loading}>{loading ? "Salvando..." : "Alterar senha"}</Button>
            </form>
            <Button variant="outline" className="mt-3 w-full text-destructive hover:text-destructive" onClick={() => void signOut()}><LogOut className="mr-2 h-4 w-4" />Sair da conta</Button>
          </AdminSection>
          <AdminSection className="p-6">
            <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/45"><MonitorCog className="h-5 w-5" /></span><div><h2 className="font-semibold">Aparência</h2><p className="text-xs text-muted-foreground">Escolha o tema do painel administrativo.</p></div></div>
            <div className="mt-6 rounded-xl border border-border/60 bg-muted/10 p-4"><p className="mb-3 text-xs font-medium text-muted-foreground">Tema</p><ThemeToggle /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Ambiente" value="Produção" /><Info label="Interface" value="Admin v2" /></div>
          </AdminSection>
        </div>
      )}
    </div>
  );
};

function FiscalHealth() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<FiscalHealthResponse | null>(null);
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<"all" | FiscalHealthState>("all");
  const [selected, setSelected] = useState<FiscalHealthCompany | null>(null);
  const [repairing, setRepairing] = useState(false);

  const load = async (live = true) => {
    setLoading(true);
    setError("");
    const { data: result, error: functionError } = await supabase.functions.invoke("admin-fiscal-health-v2", {
      body: { action: live ? "verify" : "status", verify: live },
    });
    if (functionError || result?.error) setError(result?.error || functionError?.message || "Falha ao conferir a saúde fiscal");
    else {
      const next = result as FiscalHealthResponse;
      setData(next);
      setSelected((current) => current ? next.company_health.find((company) => company.office_company_id === current.office_company_id) || null : null);
    }
    setLoading(false);
  };

  useEffect(() => { void load(true); }, []);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return (data?.company_health || []).filter((company) => {
      const matchesState = stateFilter === "all" || company.state === stateFilter;
      const matchesQuery = !normalized || [company.company_name, company.trade_name, company.cnpj, company.state_label].some((value) => String(value || "").toLowerCase().includes(normalized));
      return matchesState && matchesQuery;
    });
  }, [data, query, stateFilter]);

  const repairManifestation = async (company: FiscalHealthCompany) => {
    if (!company.fiscal_company_id) return;
    setRepairing(true);
    const { data: result, error: invokeError } = await supabase.functions.invoke("admin-fiscal-health-v2", {
      body: { action: "repair_manifestation", company_id: company.fiscal_company_id },
    });
    if (invokeError || result?.error) {
      toast({ title: "Não foi possível concluir", description: result?.error || invokeError?.message, variant: "destructive" });
    } else {
      toast({ title: "Manifestação enviada", description: `${result?.attempted || 0} nota(s) processada(s). O sistema tentou recuperar os XML logo em seguida.` });
      await load(true);
    }
    setRepairing(false);
  };

  if (loading && !data) return <div className="mt-6 flex items-center gap-2 py-10 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Conferindo as empresas que fazem extração fiscal…</div>;

  return (
    <div className="mt-6 space-y-5">
      {error && <div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"><span>{error}</span><Button variant="outline" size="sm" onClick={() => void load(true)}><RefreshCw className="mr-2 h-4 w-4" />Tentar novamente</Button></div>}

      {data && <>
        <AdminSection className="p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-muted-foreground" /><h2 className="text-lg font-semibold">Conferência das extrações</h2></div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">Aqui aparecem somente as empresas que realmente fazem extração. Ao abrir esta aba, o sistema confere as quantidades, verifica os XML e tenta corrigir sozinho o que for recuperável.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-muted-foreground">Conferido {formatFiscalDate(data.generated_at)}</span>
              <Button variant="outline" size="sm" disabled={loading} onClick={() => void load(true)}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />Conferir agora</Button>
            </div>
          </div>
        </AdminSection>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard label="Em extração" value={data.summary.monitored} detail="empresas acompanhadas" state="ready" />
          <SummaryCard label="Tudo certo" value={data.summary.healthy} detail="quantidade e XML conferidos" state="healthy" />
          <SummaryCard label="Atenção / corrigindo" value={data.summary.attention} detail="sem falha persistente" state="attention" />
          <SummaryCard label="Falha persistente" value={data.summary.error} detail="precisa de intervenção" state="error" />
        </div>

        <AdminSection className="p-0">
          <div className="flex flex-col gap-3 border-b border-border/60 p-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full max-w-lg"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar empresa ou CNPJ..." className="pl-9" /></div>
            <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value as "all" | FiscalHealthState)} className="h-9 rounded-md border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-2 focus:ring-ring">{FISCAL_HEALTH_STATES.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
          </div>

          <div className="overflow-x-auto">
            <div className="min-w-[980px]">
              <div className="grid grid-cols-[28px_minmax(220px,1.5fr)_150px_150px_150px_150px_150px_28px] gap-3 border-b border-border/50 bg-muted/[.12] px-5 py-2.5 text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">
                <span></span><span>Empresa</span><span>Notas de compra</span><span>XML compras</span><span>Vendas</span><span>XML vendas</span><span>Situação</span><span></span>
              </div>
              {filtered.length === 0 ? <div className="px-5 py-12 text-center text-sm text-muted-foreground">Nenhuma empresa em extração encontrada com esses filtros.</div> : filtered.map((company) => <HealthRow key={company.office_company_id} company={company} onOpen={() => setSelected(company)} />)}
            </div>
          </div>
        </AdminSection>
      </>}

      {selected && <CompanyHealthDrawer company={selected} repairing={repairing} onRepair={() => void repairManifestation(selected)} onClose={() => setSelected(null)} />}
    </div>
  );
}

function HealthRow({ company, onOpen }: { company: FiscalHealthCompany; onOpen: () => void }) {
  const tone = fiscalHealthTone(company.state);
  const verification = company.verification;
  const purchases = verification?.purchases;
  const sales = verification?.sales;
  const purchaseCount = purchases?.expected_nfe != null ? `${purchases.stored_nfe}/${purchases.expected_nfe} NF-e` : `${purchases?.stored_nfe ?? company.metrics.purchases.count} NF-e`;
  const purchaseXml = `${purchases?.xml_ready ?? company.metrics.purchases.full_xml}/${purchases?.xml_total ?? company.metrics.purchases.count}`;
  const salesCount = sales?.enabled ? `${sales.stored}/${sales.expected ?? sales.stored}` : "Não configurada";
  const salesXml = sales?.enabled ? `${sales.xml_ready}/${sales.expected ?? sales.stored}` : "—";
  return (
    <button onClick={onOpen} className="grid w-full grid-cols-[28px_minmax(220px,1.5fr)_150px_150px_150px_150px_150px_28px] items-center gap-3 border-b border-border/45 px-5 py-3.5 text-left transition last:border-b-0 hover:bg-muted/20">
      <span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} />
      <span className="min-w-0"><span className="block truncate text-sm font-semibold">{company.trade_name || company.company_name}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{company.cnpj || "CNPJ não informado"}</span></span>
      <SimpleCheck value={purchaseCount} ok={!purchases?.missing_count} />
      <SimpleCheck value={purchaseXml} ok={(purchases?.pending_xml ?? company.metrics.purchases.pending_xml) === 0} />
      <SimpleCheck value={salesCount} ok={!sales?.enabled || sales.stored === sales.expected} neutral={!sales?.enabled} />
      <SimpleCheck value={salesXml} ok={!sales?.enabled || sales.pending_xml === 0} neutral={!sales?.enabled} />
      <span className={`text-xs font-semibold ${tone.text}`}>{company.state_label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </button>
  );
}

function CompanyHealthDrawer({ company, repairing, onRepair, onClose }: { company: FiscalHealthCompany; repairing: boolean; onRepair: () => void; onClose: () => void }) {
  const tone = fiscalHealthTone(company.state);
  const p = company.verification?.purchases;
  const s = company.verification?.sales;
  const manifestCount = Number(p?.requires_manifestation || 0);
  return (
    <div className="fixed inset-0 z-[160] flex justify-end bg-black/45" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto border-l border-border bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-background/95 px-6 py-5 backdrop-blur">
          <div className="min-w-0"><div className="flex items-center gap-2"><span className={`h-2.5 w-2.5 rounded-full ${tone.dot}`} /><p className={`text-xs font-semibold ${tone.text}`}>{company.state_label}</p></div><h2 className="mt-1 truncate text-xl font-semibold">{company.trade_name || company.company_name}</h2><p className="mt-1 text-xs text-muted-foreground">{company.cnpj} · conferido {formatFiscalDate(company.verification?.checked_at || company.last_checked_at)}</p></div>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4" /></Button>
        </div>

        <div className="space-y-5 p-6">
          <div className={`rounded-xl border p-4 ${tone.soft}`}><p className="text-sm font-semibold">{company.state_detail}</p></div>

          <AdminSection className="p-5">
            <h3 className="font-semibold">Compras deste mês</h3>
            <p className="mt-1 text-xs text-muted-foreground">O sistema compara o que a fonte fiscal informa com o que está salvo e depois confere os XML.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <DetailTile label="Quantidade" value={p?.expected_nfe != null ? `${p.stored_nfe} de ${p.expected_nfe} NF-e` : `${p?.stored_nfe || 0} NF-e no sistema`} detail={p?.source_checked ? "Conferido diretamente na fonte fiscal" : "Conferência baseada na rotina de captura"} />
              <DetailTile label="XML disponíveis" value={`${p?.xml_ready || 0} de ${p?.xml_total || 0}`} detail={(p?.pending_xml || 0) ? `${p?.pending_xml} pendente(s)` : "Todos disponíveis"} />
              {(p?.nfse_count || 0) > 0 && <DetailTile label="NFS-e recebidas" value={String(p?.nfse_count || 0)} detail="Incluídas na conferência dos XML" />}
              {(p?.auto_repaired || 0) > 0 && <DetailTile label="Corrigido agora" value={String(p?.auto_repaired || 0)} detail="recuperado automaticamente nesta conferência" />}
            </div>
            {manifestCount > 0 && <div className="mt-4 rounded-xl border border-amber-500/25 bg-amber-500/[.06] p-4"><p className="text-sm font-semibold text-amber-700 dark:text-amber-300">{manifestCount} nota(s) precisam de manifestação do destinatário</p><p className="mt-1 text-xs leading-5 text-muted-foreground">A SEFAZ identificou as notas, mas só libera o XML integral depois da manifestação. Esta ação registra a manifestação e tenta baixar o XML em seguida.</p><Button className="mt-3" size="sm" disabled={repairing} onClick={onRepair}><Wrench className={`mr-2 h-4 w-4 ${repairing ? "animate-spin" : ""}`} />{repairing ? "Processando..." : "Autorizar manifestação e recuperar XML"}</Button></div>}
          </AdminSection>

          <AdminSection className="p-5">
            <h3 className="font-semibold">Vendas deste mês</h3>
            {!s?.enabled ? <p className="mt-3 text-sm text-muted-foreground">A extração de vendas não está configurada para esta empresa. Isso não é tratado como erro.</p> : <>
              <p className="mt-1 text-xs text-muted-foreground">A sequência fiscal encontrada é comparada com as notas salvas e os XML disponíveis.</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-2"><DetailTile label="Quantidade" value={`${s.stored} de ${s.expected ?? s.stored}`} detail={s.stored === s.expected ? "Quantidade conferida" : "Existe diferença a corrigir"} /><DetailTile label="XML disponíveis" value={`${s.xml_ready} de ${s.expected ?? s.stored}`} detail={s.pending_xml ? `${s.pending_xml} pendente(s)` : "Todos disponíveis"} /><DetailTile label="Sequência fiscal" value={`${s.sequence_resolved}/${s.sequence_total}`} detail={s.sequence_complete ? "Sequência totalmente resolvida" : "Conferência em andamento"} /></div>
            </>}
          </AdminSection>

          <AdminSection className="p-5">
            <h3 className="font-semibold">Como interpretar</h3>
            <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground"><p><b className="text-emerald-600 dark:text-emerald-400">Tudo certo:</b> quantidade confere e não existe XML pendente.</p><p><b className="text-amber-600 dark:text-amber-400">Atenção / corrigindo:</b> foi encontrada alguma diferença ou documento que ainda está sendo recuperado.</p><p><b className="text-red-600 dark:text-red-400">Falha persistente:</b> o sistema tentou corrigir repetidamente e continua sem conseguir.</p></div>
          </AdminSection>
        </div>
      </aside>
    </div>
  );
}

function SimpleCheck({ value, ok, neutral }: { value: string; ok: boolean; neutral?: boolean }) {
  return <span className={`text-xs font-medium ${neutral ? "text-muted-foreground" : ok ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"}`}>{value}</span>;
}
function SummaryCard({ label, value, detail, state }: { label: string; value: number; detail: string; state: FiscalHealthState }) {
  const tone = fiscalHealthTone(state);
  return <AdminSection className="p-4"><div className="flex items-center justify-between"><p className="text-xs font-medium text-muted-foreground">{label}</p><span className={`h-2 w-2 rounded-full ${tone.dot}`} /></div><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></AdminSection>;
}
function DetailTile({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="rounded-xl border border-border/60 bg-muted/[.08] p-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold">{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></div>; }
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-border/60 bg-muted/[.08] p-3"><p className="text-[10px] font-semibold uppercase tracking-[.11em] text-muted-foreground">{label}</p><p className="mt-1 break-words text-xs font-medium text-foreground">{value}</p></div>; }
