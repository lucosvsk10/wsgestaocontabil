import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";
import { supabase } from "@/integrations/supabase/client";

type AccountDrawerProps = {
  accessLabel?: string;
  planLabel?: string;
  usageRows?: Array<{ label: string; value: string }>;
  triggerClassName?: string;
  darkTrigger?: boolean;
  avatarUrl?: string | null;
  notifications?: Array<{ title: string; text: string }>;
};

type InvoiceRow = {
  id: string;
  invoice_number: number | null;
  description: string | null;
  period_start: string;
  period_end: string;
  due_date: string | null;
  subtotal_cents: number | null;
  discount_cents: number | null;
  total_cents: number | null;
  status: "draft" | "open" | "paid" | "overdue" | "canceled" | "void" | string;
  payment_method: string | null;
  paid_at: string | null;
  checkout_url: string | null;
  receipt_path: string | null;
  fiscal_note_path: string | null;
  metadata: Record<string, any> | null;
};

type InvoiceFilter = "all" | "pending" | "paid" | "canceled";

const sections = [
  "Configurações gerais",
  "Meu plano",
  "Relatório da conta",
  "Notificações",
  "Exclusão de dados",
] as const;

type Section = (typeof sections)[number];

const sectionMeta: Record<Section, { short: string; eyebrow: string; title: string; subtitle: string }> = {
  "Configurações gerais": {
    short: "Geral",
    eyebrow: "Perfil",
    title: "Configurações gerais",
    subtitle: "Informações vinculadas ao seu acesso no emissor fiscal.",
  },
  "Meu plano": {
    short: "Plano",
    eyebrow: "Assinatura",
    title: "Meu plano",
    subtitle: "Assinatura e faturas da empresa.",
  },
  "Relatório da conta": {
    short: "Relatório",
    eyebrow: "Atividade",
    title: "Relatório da conta",
    subtitle: "Resumo de acesso e informações importantes da conta.",
  },
  "Notificações": {
    short: "Avisos",
    eyebrow: "Central",
    title: "Notificações",
    subtitle: "Avisos úteis sobre configuração e uso do sistema.",
  },
  "Exclusão de dados": {
    short: "Dados",
    eyebrow: "Privacidade",
    title: "Exclusão de dados",
    subtitle: "Área sensível. A exclusão é permanente e exige confirmação.",
  },
};

export default function AccountDrawer({
  accessLabel = "Usuário",
  planLabel = "Plano não informado",
  usageRows = [],
  triggerClassName = "",
  darkTrigger = false,
  avatarUrl = null,
  notifications = [],
}: AccountDrawerProps) {
  const { user, userData } = useAuth();
  const { handleLogout } = useNavigation();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("Configurações gerais");
  const isSaasAccount = accessLabel === "Assinante do emissor fiscal";

  const email = user?.email || "usuario@email.com";
  const name = (userData as any)?.name || (userData as any)?.full_name || email.split("@")[0] || "Usuário";
  const initials = useMemo(
    () => String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U",
    [name],
  );

  const defaultNotifications = notifications.length
    ? notifications
    : [
        { title: "Conta ativa", text: "Seu acesso está funcionando normalmente." },
        { title: "Dados da conta", text: "Mantenha suas informações de acesso e organização sempre atualizadas." },
      ];

  const reportRows = usageRows.length
    ? usageRows
    : [
        { label: "Status da sessão", value: "Ativa" },
        { label: "Tipo de acesso", value: accessLabel },
        { label: "E-mail principal", value: email },
      ];

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  const Avatar = ({ large = false }: { large?: boolean }) =>
    avatarUrl ? (
      <span className={`ws-account-avatar ${large ? "is-large" : ""}`}>
        <img src={avatarUrl} alt="Avatar da conta" />
      </span>
    ) : (
      <span className={`ws-account-avatar ws-account-avatar-fallback ${large ? "is-large" : ""}`}>{initials}</span>
    );

  const drawer = open && typeof document !== "undefined"
    ? createPortal(
        <div className="ws-account-overlay" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <style>{drawerCss}</style>
          <aside className={`ws-account-drawer ${isSaasAccount ? "is-saas" : ""}`} aria-label="Perfil e configurações da conta">
            <header className="ws-account-header">
              <div className="ws-account-profile">
                <Avatar large />
                <div className="ws-account-profile-copy">
                  <span className="ws-account-kicker">Minha conta</span>
                  <h2>{name}</h2>
                  <p>{email}</p>
                  <small>{accessLabel}</small>
                </div>
              </div>
              <button type="button" className="ws-account-close" onClick={() => setOpen(false)} aria-label="Fechar perfil">×</button>
            </header>

            <div className="ws-account-body">
              <nav className="ws-account-nav" aria-label="Seções da conta">
                <span className="ws-account-nav-label">Conta</span>
                <div className="ws-account-nav-list">
                  {sections.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSection(item)}
                      className={`ws-account-nav-item ${section === item ? "is-active" : ""}`}
                    >
                      <span className="ws-account-nav-full">{item}</span>
                      <span className="ws-account-nav-short">{sectionMeta[item].short}</span>
                    </button>
                  ))}
                </div>
              </nav>

              <main className="ws-account-content">
                <SectionHeader
                  eyebrow={sectionMeta[section].eyebrow}
                  title={sectionMeta[section].title}
                  subtitle={sectionMeta[section].subtitle}
                />

                {section === "Configurações gerais" && (
                  <div className="ws-account-content-stack">
                    <div className="ws-account-summary">
                      <div>
                        <span>Perfil principal</span>
                        <strong>{name}</strong>
                        <p>Dados básicos associados ao seu login e ao emissor fiscal.</p>
                      </div>
                      <span className="ws-account-status">Ativo</span>
                    </div>
                    <div className="ws-account-grid">
                      <Info label="Nome" value={name} />
                      <Info label="E-mail" value={email} />
                      <Info label="Tipo de acesso" value={accessLabel} />
                      <Info label="Status" value="Ativo" />
                    </div>
                  </div>
                )}

                {section === "Meu plano" && (
                  isSaasAccount ? (
                    <SaasPlanPanel planLabel={planLabel} />
                  ) : (
                    <div className="ws-account-content-stack">
                      <div className="ws-account-plan">
                        <div><span>Plano atual</span><strong>{planLabel}</strong></div>
                        <span className="ws-account-status">Ativo</span>
                      </div>
                      <div className="ws-account-grid">
                        <TextCard title="Emissor fiscal">Acesso aos recursos de emissão e gestão fiscal da organização.</TextCard>
                        <TextCard title="Documentos">Centralização dos documentos e informações vinculadas à conta.</TextCard>
                      </div>
                    </div>
                  )
                )}

                {section === "Relatório da conta" && (
                  <div className="ws-account-grid">
                    {reportRows.map((row) => <Info key={row.label} label={row.label} value={row.value} />)}
                  </div>
                )}

                {section === "Notificações" && (
                  <div className="ws-account-content-stack">
                    {defaultNotifications.map((item, index) => (
                      <TextCard key={`${item.title}-${index}`} title={item.title}>{item.text}</TextCard>
                    ))}
                  </div>
                )}

                {section === "Exclusão de dados" && (
                  <div className="ws-account-content-stack">
                    <div className="ws-account-danger">
                      <span>Zona sensível</span>
                      <strong>Exclusão permanente</strong>
                      <p>Esta ação remove definitivamente os dados da conta e exige confirmação antes do processamento.</p>
                    </div>
                    <button type="button" className="ws-account-danger-button" disabled>Solicitar exclusão de dados</button>
                  </div>
                )}
              </main>
            </div>

            <footer className="ws-account-footer">
              <button type="button" onClick={handleLogout} className="ws-account-logout">Sair da conta</button>
            </footer>
          </aside>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        type="button"
        aria-label="Abrir perfil da conta"
        onClick={() => setOpen(true)}
        className={`grid h-10 w-10 place-items-center overflow-hidden rounded-full border text-xs font-semibold transition ${
          darkTrigger ? "border-white/20 bg-white/10 text-white hover:bg-white/15" : "border-border bg-card text-foreground hover:bg-muted"
        } ${triggerClassName}`}
      >
        {avatarUrl ? <img src={avatarUrl} alt="Avatar da conta" className="h-full w-full object-contain bg-white p-1" /> : initials}
      </button>
      {drawer}
    </>
  );
}

function SaasPlanPanel({ planLabel }: { planLabel: string }) {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<InvoiceFilter>("all");
  const [search, setSearch] = useState("");
  const organizationId = typeof window !== "undefined" ? window.localStorage.getItem("ws_saas_selected_organization") : null;

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (!organizationId) {
        if (!cancelled) setLoading(false);
        return;
      }
      setLoading(true);
      const [{ data: invoiceData }, { data: subscriptionData }] = await Promise.all([
        (supabase as any)
          .from("saas_invoices")
          .select("id,invoice_number,description,period_start,period_end,due_date,subtotal_cents,discount_cents,total_cents,status,payment_method,paid_at,checkout_url,receipt_path,fiscal_note_path,metadata")
          .eq("organization_id", organizationId)
          .order("period_start", { ascending: false }),
        (supabase as any)
          .from("saas_subscriptions")
          .select("id,status,current_period_start,current_period_end,cancel_at_period_end,metadata,saas_plans(name)")
          .eq("organization_id", organizationId)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (cancelled) return;
      setInvoices((invoiceData || []) as InvoiceRow[]);
      setSubscription(subscriptionData || null);
      setLoading(false);
    };
    void load();
    return () => { cancelled = true; };
  }, [organizationId]);

  const cycle = useMemo(() => {
    const now = new Date();
    const fallbackStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const fallbackEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const start = subscription?.current_period_start ? new Date(subscription.current_period_start) : fallbackStart;
    const end = subscription?.current_period_end ? new Date(subscription.current_period_end) : fallbackEnd;
    return {
      start: formatDate(start),
      end: formatDate(end),
    };
  }, [subscription?.current_period_start, subscription?.current_period_end]);

  const filteredInvoices = useMemo(() => {
    const term = search.trim().toLowerCase();
    return invoices.filter((invoice) => {
      const statusOk =
        filter === "all" ||
        (filter === "pending" && ["draft", "open", "overdue"].includes(invoice.status)) ||
        (filter === "paid" && invoice.status === "paid") ||
        (filter === "canceled" && ["canceled", "void"].includes(invoice.status));
      if (!statusOk) return false;
      if (!term) return true;
      const haystack = [
        invoice.invoice_number,
        invoice.description,
        invoice.payment_method,
        invoice.status,
      ].filter(Boolean).join(" ").toLowerCase();
      return haystack.includes(term);
    });
  }, [filter, invoices, search]);

  const planName = subscription?.saas_plans?.name || planLabel || "Plano fiscal";
  const planAmount = Number(subscription?.metadata?.amount_cents ?? NaN);
  const subscriptionBadge = subscriptionStatusLabel(subscription?.status);

  const clearFilters = () => {
    setFilter("all");
    setSearch("");
  };

  const openStoredFile = async (path: string) => {
    if (!path) return;
    if (/^https?:\/\//i.test(path)) {
      window.open(path, "_blank", "noopener,noreferrer");
      return;
    }
    const { data } = await supabase.storage.from("saas-private").createSignedUrl(path, 300);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="ws-plan-stack">
      <section className="ws-plan-summary-card">
        <div className="ws-plan-summary-main">
          <span>Plano atual</span>
          <div className="ws-plan-title-line">
            <h4>{planName}</h4>
            <span className={`ws-plan-badge ${subscriptionBadge.tone}`}>{subscriptionBadge.label}</span>
          </div>
        </div>
        <div className="ws-plan-summary-facts">
          <div><span>Ciclo</span><strong>Mensal</strong></div>
          <div><span>Valor</span><strong>{Number.isFinite(planAmount) ? formatMoney(planAmount) : "—"}</strong></div>
        </div>
      </section>

      <section className="ws-plan-cycle-strip">
        <div>
          <span>Ciclo atual</span>
          <strong>{cycle.start} a {cycle.end}</strong>
        </div>
        <div className="ws-plan-cycle-side">
          <span>Fechamento</span>
          <strong>{cycle.end}</strong>
        </div>
      </section>

      <section className="ws-plan-invoices-card">
        <div className="ws-plan-invoices-head">
          <div>
            <h4>Faturas</h4>
            <p>Consulte cada cobrança e seus dados salvos.</p>
          </div>
        </div>

        <div className="ws-plan-filter-label">Filtrar por</div>
        <div className="ws-plan-toolbar">
          <div className="ws-plan-filters" role="group" aria-label="Filtrar faturas">
            <FilterButton active={filter === "all"} onClick={() => setFilter("all")}>Todos</FilterButton>
            <FilterButton active={filter === "pending"} onClick={() => setFilter("pending")}>Com pendência financeira</FilterButton>
            <FilterButton active={filter === "paid"} onClick={() => setFilter("paid")}>Pagas</FilterButton>
            <FilterButton active={filter === "canceled"} onClick={() => setFilter("canceled")}>Canceladas</FilterButton>
          </div>
          <div className="ws-plan-search-area">
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Busque por fatura..."
              aria-label="Buscar fatura"
            />
            {(search || filter !== "all") && <button type="button" onClick={clearFilters}>Limpar filtros</button>}
          </div>
        </div>

        <div className="ws-plan-invoice-list">
          {loading ? (
            <div className="ws-plan-empty">Carregando faturas...</div>
          ) : filteredInvoices.length ? (
            filteredInvoices.map((invoice) => (
              <InvoiceItem key={invoice.id} invoice={invoice} onOpenStoredFile={openStoredFile} />
            ))
          ) : (
            <div className="ws-plan-empty">
              <strong>{invoices.length ? "Nenhuma fatura encontrada" : "Nenhuma fatura registrada"}</strong>
              <span>{invoices.length ? "Ajuste os filtros para ver outros resultados." : "Quando uma cobrança for gerada, ela aparecerá aqui com seus dados completos."}</span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" className={`ws-plan-filter ${active ? "is-active" : ""}`} onClick={onClick}>
      {active && <span>✓</span>}{children}
    </button>
  );
}

function InvoiceItem({ invoice, onOpenStoredFile }: { invoice: InvoiceRow; onOpenStoredFile: (path: string) => void }) {
  const status = invoiceStatusLabel(invoice.status);
  const invoiceId = invoice.invoice_number ? String(invoice.invoice_number) : invoice.id.slice(0, 8).toUpperCase();
  const hasAction = Boolean(invoice.checkout_url || invoice.receipt_path || invoice.fiscal_note_path);

  return (
    <article className="ws-plan-invoice-row">
      <div className="ws-plan-invoice-primary">
        <div className="ws-plan-invoice-id-line">
          <strong>#{invoiceId}</strong>
          <span className={`ws-plan-invoice-status ${status.tone}`}>{status.label}</span>
        </div>
        <p>{invoice.description || "Assinatura do emissor fiscal"}</p>
        <small>{formatDate(invoice.period_start)} a {formatDate(invoice.period_end)}</small>
      </div>

      <InvoiceField label="Data de vencimento" value={invoice.due_date ? formatDate(invoice.due_date) : "—"} />
      <InvoiceField label="Total da fatura" value={invoice.total_cents == null ? "—" : formatMoney(invoice.total_cents)} />
      <InvoiceField label="Forma de pagamento" value={invoice.payment_method || "—"} />

      <div className="ws-plan-invoice-actions">
        {invoice.checkout_url && ["open", "overdue"].includes(invoice.status) && (
          <a href={invoice.checkout_url} target="_blank" rel="noreferrer">Pagar fatura</a>
        )}
        {invoice.receipt_path && (
          <button type="button" onClick={() => void onOpenStoredFile(invoice.receipt_path!)}>Baixar comprovante</button>
        )}
        {invoice.fiscal_note_path && (
          <button type="button" onClick={() => void onOpenStoredFile(invoice.fiscal_note_path!)}>Ver nota fiscal</button>
        )}
        {!hasAction && <span>—</span>}
      </div>
    </article>
  );
}

function InvoiceField({ label, value }: { label: string; value: string }) {
  return <div className="ws-plan-invoice-field"><span>{label}</span><strong>{value}</strong></div>;
}

function formatDate(value: string | Date) {
  const date = value instanceof Date
    ? value
    : /^\d{4}-\d{2}-\d{2}$/.test(value)
      ? new Date(`${value}T12:00:00`)
      : new Date(value);
  return Number.isNaN(date.getTime()) ? "—" : new Intl.DateTimeFormat("pt-BR").format(date);
}

function formatMoney(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

function invoiceStatusLabel(status: string) {
  if (status === "paid") return { label: "Paga", tone: "is-paid" };
  if (status === "overdue") return { label: "Em atraso", tone: "is-overdue" };
  if (status === "canceled" || status === "void") return { label: "Cancelada", tone: "is-canceled" };
  if (status === "draft") return { label: "Em formação", tone: "is-open" };
  return { label: "Em aberto", tone: "is-open" };
}

function subscriptionStatusLabel(status?: string) {
  if (status === "active" || status === "trialing") return { label: "Assinatura ativa", tone: "is-active" };
  if (status === "past_due") return { label: "Pagamento pendente", tone: "is-warning" };
  if (status === "paused") return { label: "Pausada", tone: "is-neutral" };
  if (status === "canceled") return { label: "Cancelada", tone: "is-neutral" };
  return { label: "Plano atual", tone: "is-neutral" };
}

function SectionHeader({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <div className="ws-account-section-head">
      <span>{eyebrow}</span>
      <h3>{title}</h3>
      <p>{subtitle}</p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="ws-account-info"><span>{label}</span><strong>{value || "—"}</strong></div>;
}

function TextCard({ title, children }: { title: string; children: ReactNode }) {
  return <div className="ws-account-text-card"><strong>{title}</strong><p>{children}</p></div>;
}

const drawerCss = `
  .ws-account-overlay,
  .ws-account-overlay * {
    box-sizing: border-box;
    font-family: 'Proxima Nova', 'Inter', 'Helvetica Neue', Arial, sans-serif !important;
    letter-spacing: 0 !important;
    font-synthesis: none;
  }

  .ws-account-drawer.is-saas,
  .ws-account-drawer.is-saas * {
    font-family: 'Proxima Nova', 'Inter', 'Helvetica Neue', Arial, sans-serif !important;
    letter-spacing: 0 !important;
  }

  .ws-account-overlay {
    position: fixed;
    inset: 0;
    z-index: 9998;
    background: rgba(2, 8, 23, .42);
    backdrop-filter: blur(3px);
    -webkit-backdrop-filter: blur(3px);
  }

  .ws-account-drawer {
    position: absolute;
    inset: 0 0 0 auto;
    display: flex;
    width: min(620px, 100vw);
    height: 100dvh;
    flex-direction: column;
    overflow: hidden;
    background: #f3f4f6;
    color: #111827;
    box-shadow: -16px 0 46px rgba(2, 8, 23, .16);
    font-size: 14px;
    font-weight: 400;
    line-height: 1.35;
  }

  .ws-account-drawer.is-saas { width: min(980px, 100vw); }
  .ws-account-drawer.is-saas .ws-account-body { grid-template-columns: 184px minmax(0, 1fr); }
  .ws-account-drawer.is-saas .ws-account-content { padding: 22px 24px 28px; }

  .ws-account-header {
    display: flex;
    min-height: 116px;
    align-items: center;
    justify-content: space-between;
    gap: 18px;
    padding: 20px 22px;
    background: linear-gradient(180deg, #0a1422 0%, #07111d 100%);
    border-bottom: 1px solid rgba(148,163,184,.14);
  }

  .ws-account-profile { display:flex; min-width:0; align-items:center; gap:8px; }
  .ws-account-profile-copy { min-width:0; }
  .ws-account-kicker { display:block; margin-bottom:5px; color:#94a3b8 !important; font-size:12px !important; font-weight:600 !important; }
  .ws-account-profile-copy h2 { margin:0; max-width:520px; overflow:hidden; color:#f8fafc !important; font-size:20px !important; font-weight:600 !important; line-height:1.25 !important; text-overflow:ellipsis; white-space:nowrap; }
  .ws-account-profile-copy p { margin:3px 0 0; max-width:520px; overflow:hidden; color:#cbd5e1 !important; font-size:14px !important; font-weight:400 !important; text-overflow:ellipsis; white-space:nowrap; }
  .ws-account-profile-copy small { display:block; margin-top:5px; color:#94a3b8 !important; font-size:12px !important; font-weight:400 !important; text-transform:none; }

  .ws-account-avatar { display:grid; width:44px; height:44px; flex:0 0 auto; place-items:center; overflow:hidden; border:1px solid rgba(255,255,255,.15); border-radius:50%; background:rgba(255,255,255,.08); }
  .ws-account-avatar.is-large { width:58px; height:58px; }
  .ws-account-avatar img { width:100%; height:100%; object-fit:contain; padding:4px; background:#fff; }
  .ws-account-avatar-fallback { color:#f8fafc !important; font-size:14px !important; font-weight:600 !important; }

  .ws-account-close { display:grid; width:38px; height:38px; flex:0 0 auto; place-items:center; border:1px solid rgba(255,255,255,.12); border-radius:6px; background:rgba(255,255,255,.05); color:#cbd5e1 !important; font-size:22px !important; font-weight:400 !important; cursor:pointer; }
  .ws-account-close:hover { background:rgba(255,255,255,.10); color:#fff !important; }

  .ws-account-body { display:grid; min-height:0; flex:1; grid-template-columns:176px minmax(0,1fr); }
  .ws-account-nav { min-width:0; border-right:1px solid #d2d7dc; background:#eaedf0; padding:18px 10px; }
  .ws-account-nav-label { display:block; margin:0 8px 10px; color:#7b8492 !important; font-size:12px !important; font-weight:600 !important; }
  .ws-account-nav-list { display:flex; flex-direction:column; gap:3px; }
  .ws-account-nav-item { width:100%; min-height:40px; border:0; border-left:2px solid transparent; border-radius:0 4px 4px 0; background:transparent; padding:9px 10px; color:#475467 !important; font-size:14px !important; font-weight:400 !important; text-align:left; cursor:pointer; }
  .ws-account-nav-item:hover { background:#e1e5e9; color:#111827 !important; }
  .ws-account-nav-item.is-active { border-left-color:#67717f; background:#d9dee4; color:#111827 !important; font-weight:600 !important; }
  .ws-account-nav-full { color:inherit !important; font-size:inherit !important; font-weight:inherit !important; }
  .ws-account-nav-short { display:none; }

  .ws-account-content { min-width:0; overflow-y:auto; background:#f3f4f6; padding:24px; }
  .ws-account-section-head { margin-bottom:16px; }
  .ws-account-section-head > span { display:block; margin-bottom:4px; color:#667085 !important; font-size:12px !important; font-weight:600 !important; }
  .ws-account-section-head h3 { margin:0; color:#0f172a !important; font-size:18px !important; font-weight:600 !important; line-height:1.3 !important; }
  .ws-account-section-head p { margin:5px 0 0; color:#667085 !important; font-size:13px !important; font-weight:400 !important; line-height:1.5 !important; }

  .ws-account-content-stack { display:grid; gap:12px; }
  .ws-account-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px; }

  .ws-account-summary,
  .ws-account-plan,
  .ws-account-info,
  .ws-account-text-card,
  .ws-account-danger { border:1px solid #d2d7dc; border-radius:6px; background:#e9ecef; box-shadow:none; }

  .ws-account-summary,
  .ws-account-plan { display:flex; align-items:flex-start; justify-content:space-between; gap:8px; padding:16px; }
  .ws-account-summary > div > span,
  .ws-account-plan > div > span,
  .ws-account-info > span,
  .ws-account-danger > span { display:block; color:#667085 !important; font-size:12px !important; font-weight:600 !important; }
  .ws-account-summary > div > strong { display:block; margin-top:5px; color:#0f172a !important; font-size:16px !important; font-weight:600 !important; line-height:1.3 !important; }
  .ws-account-summary > div > p { margin:4px 0 0; color:#667085 !important; font-size:13px !important; font-weight:400 !important; line-height:1.45 !important; }
  .ws-account-plan > div > strong { display:block; margin-top:5px; color:#0f172a !important; font-size:20px !important; font-weight:600 !important; }
  .ws-account-status { display:inline-flex; min-height:26px; align-items:center; padding:0 9px; border:1px solid #c7cdd3; border-radius:5px; background:#f3f4f6; color:#475467 !important; font-size:12px !important; font-weight:600 !important; white-space:nowrap; }
  .ws-account-info { min-width:0; min-height:82px; padding:14px; }
  .ws-account-info > strong { display:block; margin-top:8px; overflow-wrap:anywhere; color:#344054 !important; font-size:14px !important; font-weight:400 !important; line-height:1.4 !important; }
  .ws-account-text-card { padding:14px; }
  .ws-account-text-card > strong { display:block; color:#344054 !important; font-size:14px !important; font-weight:600 !important; }
  .ws-account-text-card > p { margin:5px 0 0; color:#667085 !important; font-size:13px !important; font-weight:400 !important; line-height:1.5 !important; }
  .ws-account-danger { padding:14px; background:#f1e7e7; border-color:#dbcaca; }
  .ws-account-danger > span { color:#8a4f4f !important; }
  .ws-account-danger > strong { display:block; margin-top:5px; color:#7b3030 !important; font-size:16px !important; font-weight:600 !important; }
  .ws-account-danger > p { margin:5px 0 0; color:#8c5555 !important; font-size:13px !important; font-weight:400 !important; line-height:1.5 !important; }
  .ws-account-danger-button { width:100%; min-height:42px; border:1px solid #dbcaca; border-radius:6px; background:#f3eded; color:#8a4f4f !important; font-size:14px !important; font-weight:600 !important; opacity:.7; }

  .ws-plan-stack { display:grid; gap:12px; }
  .ws-plan-summary-card,
  .ws-plan-cycle-strip,
  .ws-plan-invoices-card { border:1px solid #d5dbe1; border-radius:8px; background:#fff; }

  .ws-plan-summary-card { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:22px; padding:16px 18px; }
  .ws-plan-summary-main > span,
  .ws-plan-summary-facts span,
  .ws-plan-cycle-strip span,
  .ws-plan-filter-label,
  .ws-plan-invoice-field span { color:#667085 !important; font-size:11px !important; font-weight:500 !important; }
  .ws-plan-title-line { display:flex; flex-wrap:wrap; align-items:center; gap:9px; margin-top:3px; }
  .ws-plan-title-line h4 { margin:0; color:#101828 !important; font-size:18px !important; font-weight:600 !important; }
  .ws-plan-badge { display:inline-flex; min-height:24px; align-items:center; border-radius:999px; padding:0 9px; font-size:10px !important; font-weight:600 !important; }
  .ws-plan-badge.is-active { background:#e7f6eb; color:#31744a !important; }
  .ws-plan-badge.is-warning { background:#fff3dc; color:#875b1b !important; }
  .ws-plan-badge.is-neutral { background:#eef1f3; color:#536077 !important; }
  .ws-plan-summary-facts { display:grid; grid-template-columns:repeat(2,minmax(100px,1fr)); }
  .ws-plan-summary-facts > div { display:grid; gap:4px; padding:0 18px; border-left:1px solid #dde2e7; }
  .ws-plan-summary-facts strong { color:#1d2939 !important; font-size:14px !important; font-weight:600 !important; }

  .ws-plan-cycle-strip { display:flex; align-items:center; justify-content:space-between; gap:20px; padding:13px 18px; }
  .ws-plan-cycle-strip > div { display:grid; gap:3px; }
  .ws-plan-cycle-strip strong { color:#344054 !important; font-size:13px !important; font-weight:500 !important; }
  .ws-plan-cycle-side { text-align:right; }

  .ws-plan-invoices-card { overflow:hidden; }
  .ws-plan-invoices-head { display:flex; align-items:flex-start; justify-content:space-between; gap:16px; padding:17px 18px 11px; }
  .ws-plan-invoices-head h4 { margin:0; color:#101828 !important; font-size:17px !important; font-weight:600 !important; }
  .ws-plan-invoices-head p { margin:4px 0 0; color:#667085 !important; font-size:12px !important; line-height:1.45 !important; }
  .ws-plan-filter-label { padding:0 18px 7px; }
  .ws-plan-toolbar { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:0 18px 14px; border-bottom:1px solid #e1e5e9; }
  .ws-plan-filters { display:flex; flex-wrap:wrap; gap:7px; }
  .ws-plan-filter { display:inline-flex; min-height:34px; align-items:center; gap:6px; border:1px solid transparent; border-radius:999px; background:transparent; padding:0 12px; color:#344054 !important; font-size:12px !important; font-weight:400 !important; cursor:pointer; }
  .ws-plan-filter:hover { background:#f3f4f6; }
  .ws-plan-filter.is-active { border-color:#e0e4e8; background:#eef1f3; color:#182230 !important; }
  .ws-plan-filter > span { color:#475467 !important; font-size:11px !important; }
  .ws-plan-search-area { display:flex; align-items:center; gap:10px; }
  .ws-plan-search-area input { width:210px; height:34px; border:0; border-bottom:1px solid #cfd5dc; border-radius:0; outline:0; background:transparent; padding:0 4px; color:#344054 !important; font-size:12px !important; }
  .ws-plan-search-area input::placeholder { color:#98a2b3; }
  .ws-plan-search-area button { border:0; background:transparent; padding:0; color:#536077 !important; font-size:11px !important; font-weight:500 !important; cursor:pointer; }

  .ws-plan-invoice-list { background:#fff; }
  .ws-plan-invoice-row { display:grid; grid-template-columns:minmax(210px,2fr) minmax(120px,.95fr) minmax(100px,.75fr) minmax(130px,1fr) auto; align-items:center; gap:18px; min-height:96px; padding:14px 18px; border-bottom:1px solid #e1e5e9; background:#fff !important; color:#344054 !important; }
  .ws-plan-invoice-row:last-child { border-bottom:0; }
  .ws-plan-invoice-row:hover { background:#fafbfc !important; }
  .ws-plan-invoice-primary { min-width:0; }
  .ws-plan-invoice-id-line { display:flex; flex-wrap:wrap; align-items:center; gap:9px; }
  .ws-plan-invoice-id-line > strong { color:#344054 !important; font-size:14px !important; font-weight:500 !important; }
  .ws-plan-invoice-primary p { margin:7px 0 0; overflow:hidden; color:#344054 !important; font-size:12px !important; font-weight:400 !important; text-overflow:ellipsis; white-space:nowrap; }
  .ws-plan-invoice-primary small { display:block; margin-top:3px; color:#7a8492 !important; font-size:10px !important; font-weight:400 !important; }
  .ws-plan-invoice-status { display:inline-flex; min-height:24px; align-items:center; border-radius:5px; padding:0 8px; font-size:10px !important; font-weight:600 !important; }
  .ws-plan-invoice-status.is-paid { background:#e4f7e7; color:#23753b !important; }
  .ws-plan-invoice-status.is-open { background:#eef2f6; color:#536077 !important; }
  .ws-plan-invoice-status.is-overdue { background:#fff0dd; color:#8a5a18 !important; }
  .ws-plan-invoice-status.is-canceled { background:#f4e8e8; color:#8b4b4b !important; }
  .ws-plan-invoice-field { display:grid; gap:5px; min-width:0; }
  .ws-plan-invoice-field strong { color:#344054 !important; font-size:12px !important; font-weight:400 !important; overflow-wrap:anywhere; }
  .ws-plan-invoice-actions { display:flex; align-items:center; justify-content:flex-end; gap:8px; }
  .ws-plan-invoice-actions a,
  .ws-plan-invoice-actions button { display:inline-flex; min-height:36px; align-items:center; justify-content:center; border:1px solid #aeb7c2; border-radius:7px; background:#fff; padding:0 12px; color:#344054 !important; font-size:11px !important; font-weight:500 !important; text-decoration:none; white-space:nowrap; cursor:pointer; }
  .ws-plan-invoice-actions a:hover,
  .ws-plan-invoice-actions button:hover { background:#f3f4f6; border-color:#8f9aa8; }
  .ws-plan-invoice-actions > span { color:#98a2b3 !important; font-size:12px !important; }
  .ws-plan-empty { display:grid; min-height:140px; place-content:center; gap:5px; padding:28px; text-align:center; background:#fff; }
  .ws-plan-empty strong { color:#344054 !important; font-size:13px !important; font-weight:600 !important; }
  .ws-plan-empty span { color:#7a8492 !important; font-size:11px !important; font-weight:400 !important; }

  .ws-account-footer { border-top:1px solid #d2d7dc; background:#eaedf0; padding:10px 12px max(10px,env(safe-area-inset-bottom)); }
  .ws-account-logout { width:100%; min-height:42px; border:0; border-radius:6px; background:#202833; color:#fff !important; font-size:14px !important; font-weight:600 !important; cursor:pointer; }
  .ws-account-logout:hover { background:#171e27; }

  @media (max-width: 980px) and (min-width: 721px) {
    .ws-plan-invoice-row { grid-template-columns:minmax(190px,1.8fr) 120px 105px minmax(110px,1fr); }
    .ws-plan-invoice-actions { grid-column:1 / -1; justify-content:flex-start; }
  }

  @media (max-width:720px) {
    .ws-account-overlay { background:#f3f4f6; backdrop-filter:none; -webkit-backdrop-filter:none; }
    .ws-account-drawer,
    .ws-account-drawer.is-saas { position:fixed; inset:0; width:100vw; height:100dvh; max-width:none; box-shadow:none; }

    .ws-account-header { min-height:auto; align-items:flex-start; padding:15px 14px 14px; gap:12px; }
    .ws-account-profile { align-items:center; gap:12px; }
    .ws-account-avatar.is-large { width:44px; height:44px; }
    .ws-account-kicker { margin-bottom:4px; font-size:10px !important; }
    .ws-account-profile-copy h2 { max-width:calc(100vw - 126px); font-size:16px !important; line-height:1.2 !important; }
    .ws-account-profile-copy p { max-width:calc(100vw - 126px); margin-top:3px; font-size:12px !important; line-height:1.4 !important; }
    .ws-account-profile-copy small { margin-top:3px; font-size:10px !important; line-height:1.35 !important; }
    .ws-account-close { width:38px; height:38px; border-radius:6px; font-size:22px !important; }

    .ws-account-body,
    .ws-account-drawer.is-saas .ws-account-body { display:flex; min-height:0; flex:1; flex-direction:column; }
    .ws-account-nav { flex:0 0 auto; overflow:hidden; border-right:0; border-bottom:1px solid #d2d7dc; background:#eaedf0; padding:8px 10px; }
    .ws-account-nav-label,
    .ws-account-nav-full { display:none; }
    .ws-account-nav-list { flex-direction:row; overflow-x:auto; gap:5px; padding:1px 0 2px; scrollbar-width:none; overscroll-behavior-x:contain; scroll-padding-inline:12px; }
    .ws-account-nav-list::-webkit-scrollbar { display:none; }
    .ws-account-nav-item { width:auto; min-width:max-content; min-height:34px; flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center; border:1px solid transparent; border-radius:6px; padding:0 11px; color:#536077 !important; font-size:12px !important; font-weight:400 !important; text-align:center; }
    .ws-account-nav-item.is-active { border-color:#c7cdd3; background:#d9dee4; color:#111827 !important; font-weight:600 !important; }
    .ws-account-nav-short { display:inline; color:inherit !important; font-size:inherit !important; font-weight:inherit !important; }

    .ws-account-content,
    .ws-account-drawer.is-saas .ws-account-content { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; background:#f3f4f6; padding:18px 14px 26px; }
    .ws-account-section-head { margin-bottom:14px; }
    .ws-account-section-head > span { margin-bottom:6px; font-size:10px !important; }
    .ws-account-section-head h3 { font-size:16px !important; line-height:1.25 !important; }
    .ws-account-section-head p { margin-top:7px; max-width:none; font-size:12px !important; line-height:1.5 !important; }

    .ws-account-content-stack { gap:8px; }
    .ws-account-grid { grid-template-columns:1fr; gap:8px; }
    .ws-account-summary,
    .ws-account-plan,
    .ws-account-info,
    .ws-account-text-card,
    .ws-account-danger,
    .ws-account-danger-button { border-radius:8px; }
    .ws-account-summary,
    .ws-account-plan { padding:13px; gap:10px; }
    .ws-account-summary > div > strong { font-size:15px !important; }
    .ws-account-summary > div > p { margin-top:6px; line-height:1.5 !important; }
    .ws-account-plan > div > strong { font-size:16px !important; }
    .ws-account-status { min-height:24px; padding:0 8px; border-radius:5px; }
    .ws-account-info { min-height:64px; padding:12px; }
    .ws-account-info > strong { margin-top:6px; font-size:13px !important; }
    .ws-account-text-card,
    .ws-account-danger { padding:12px; }
    .ws-account-text-card > p,
    .ws-account-danger > p { margin-top:7px; line-height:1.55 !important; }
    .ws-account-danger-button { min-height:40px; margin-top:0; }

    .ws-plan-summary-card { grid-template-columns:1fr; gap:12px; padding:14px; }
    .ws-plan-summary-facts { border-top:1px solid #e1e5e9; padding-top:10px; }
    .ws-plan-summary-facts > div:first-child { border-left:0; padding-left:0; }
    .ws-plan-title-line h4 { font-size:16px !important; }
    .ws-plan-cycle-strip { padding:12px 14px; }
    .ws-plan-invoices-head { padding:14px 14px 10px; }
    .ws-plan-filter-label { padding-inline:14px; }
    .ws-plan-toolbar { align-items:stretch; flex-direction:column; padding:0 14px 13px; }
    .ws-plan-filters { flex-wrap:nowrap; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
    .ws-plan-filters::-webkit-scrollbar { display:none; }
    .ws-plan-filter { flex:0 0 auto; }
    .ws-plan-search-area { width:100%; }
    .ws-plan-search-area input { flex:1; width:auto; min-width:0; font-size:16px !important; }
    .ws-plan-invoice-row { grid-template-columns:1fr 1fr; gap:12px; min-height:0; padding:14px; }
    .ws-plan-invoice-primary { grid-column:1 / -1; }
    .ws-plan-invoice-primary p { white-space:normal; }
    .ws-plan-invoice-actions { grid-column:1 / -1; justify-content:flex-start; flex-wrap:wrap; }
    .ws-plan-invoice-actions a,
    .ws-plan-invoice-actions button { min-height:36px; }

    .ws-account-footer { flex:0 0 auto; border-top:1px solid #d2d7dc; background:#eaedf0; padding:8px 10px max(8px,env(safe-area-inset-bottom)); }
    .ws-account-logout { min-height:40px; border-radius:7px; }
  }

  @media (max-width:360px) {
    .ws-account-header { padding-inline:12px; }
    .ws-account-profile-copy h2,
    .ws-account-profile-copy p { max-width:calc(100vw - 116px); }
    .ws-account-nav { padding-inline:10px; }
    .ws-account-content,
    .ws-account-drawer.is-saas .ws-account-content { padding:16px 12px 24px; }
    .ws-plan-summary-facts { grid-template-columns:1fr; gap:8px; }
    .ws-plan-summary-facts > div { border-left:0; padding:0; }
    .ws-plan-summary-facts > div + div { border-top:1px solid #e1e5e9; padding-top:8px; }
    .ws-plan-cycle-strip { align-items:flex-start; flex-direction:column; gap:8px; }
    .ws-plan-cycle-side { text-align:left; }
    .ws-plan-invoice-row { grid-template-columns:1fr; }
    .ws-plan-invoice-primary,
    .ws-plan-invoice-actions { grid-column:auto; }
  }
`;
