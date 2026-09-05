import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";

type AccountDrawerProps = {
  accessLabel?: string;
  planLabel?: string;
  usageRows?: Array<{ label: string; value: string }>;
  triggerClassName?: string;
  darkTrigger?: boolean;
  avatarUrl?: string | null;
  notifications?: Array<{ title: string; text: string }>;
};

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
    subtitle: "Plano atual e recursos vinculados à organização.",
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
          <aside className={`ws-account-drawer ${isSaasAccount && section === "Meu plano" ? "is-plan" : ""}`} aria-label="Perfil e configurações da conta">
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
                  subtitle={isSaasAccount && section === "Meu plano"
                    ? "Gerencie sua assinatura, ciclos de faturamento e faturas da empresa."
                    : sectionMeta[section].subtitle}
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
  const cycle = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    const fmt = (value: Date) => new Intl.DateTimeFormat("pt-BR").format(value);
    const month = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "numeric" })
      .format(now)
      .replace(".", "")
      .replace(/^./, (char) => char.toUpperCase());
    return { start: fmt(start), end: fmt(end), month };
  }, []);

  return (
    <div className="ws-plan-stack">
      <section className="ws-plan-card ws-plan-overview">
        <div className="ws-plan-overview-main">
          <div className="ws-plan-title-row">
            <h4>{planLabel || "Plano fiscal"}</h4>
            <span className="ws-plan-badge ws-plan-badge-active">Assinatura ativa</span>
          </div>
          <p>Plano vinculado ao emissor fiscal desta empresa.</p>
        </div>
        <div className="ws-plan-overview-meta">
          <div><span>Ciclo de cobrança</span><strong>Mensal</strong></div>
          <div><span>Valor do plano</span><strong>—</strong><small>Disponível após integrar a cobrança.</small></div>
        </div>
      </section>

      <section className="ws-plan-card ws-plan-cycle">
        <div className="ws-plan-cycle-top">
          <div>
            <span className="ws-plan-eyebrow">Ciclo atual</span>
            <strong>Período</strong>
            <h4>{cycle.start} a {cycle.end}</h4>
            <p>Este período ainda está em andamento. A fatura será liberada para pagamento somente após o fechamento.</p>
          </div>
          <span className="ws-plan-badge ws-plan-badge-open">Em aberto</span>
        </div>
        <div className="ws-plan-flow-note">
          <span className="ws-plan-info-dot">i</span>
          <p><strong>Como funciona:</strong> a fatura do mês permanece em aberto durante o período. Após o fechamento do ciclo, o valor é consolidado e liberado para pagamento.</p>
        </div>
      </section>

      <div className="ws-plan-metrics">
        <div className="ws-plan-metric"><span>Próximo fechamento</span><strong>{cycle.end}</strong></div>
        <div className="ws-plan-metric"><span>Próxima cobrança estimada</span><strong>—</strong></div>
        <div className="ws-plan-metric"><span>Renovação automática</span><strong>Não configurada</strong></div>
        <div className="ws-plan-metric"><span>Forma de cobrança</span><strong>Pós-paga</strong><small>Pagamento após o fechamento.</small></div>
      </div>

      <section className="ws-plan-card ws-plan-invoices">
        <div className="ws-plan-section-head">
          <div>
            <h4>Faturas</h4>
            <p>Acompanhe o histórico de faturas da sua assinatura.</p>
          </div>
          <button type="button" disabled>Ver todas as faturas</button>
        </div>
        <div className="ws-plan-table-wrap">
          <table className="ws-plan-table">
            <thead>
              <tr><th>Mês/Ano</th><th>Período</th><th>Valor</th><th>Status</th><th>Ação</th></tr>
            </thead>
            <tbody>
              <tr>
                <td>{cycle.month}</td>
                <td>{cycle.start} a {cycle.end}</td>
                <td>—</td>
                <td><span className="ws-plan-status is-open"><i />Em aberto</span></td>
                <td><span className="ws-plan-action-muted">Disponível após fechamento</span></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="ws-plan-empty-history">Nenhuma fatura fechada disponível ainda.</div>
        <div className="ws-plan-flow-note is-bottom">
          <span className="ws-plan-info-dot">i</span>
          <p><strong>Fluxo de cobrança:</strong> durante o período a fatura fica em aberto. Depois do fechamento, ela será gerada e liberada para pagamento em uma página de checkout separada.</p>
        </div>
      </section>

      <section className="ws-plan-management">
        <h4>Gestão da assinatura</h4>
        <div className="ws-plan-management-grid">
          <button type="button"><span>Dados de cobrança</span><small>Dados da empresa usados nas futuras faturas.</small><b>›</b></button>
          <button type="button"><span>Renovação automática</span><small>Gerencie a renovação quando a cobrança for ativada.</small><b>›</b></button>
          <button type="button"><span>Precisa de ajuda?</span><small>Acesse o suporte para dúvidas sobre assinatura.</small><b>›</b></button>
        </div>
      </section>
    </div>
  );
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

  .ws-account-drawer.is-plan { width: min(980px, 100vw); }
  .ws-account-drawer.is-plan .ws-account-body { grid-template-columns: 184px minmax(0, 1fr); }
  .ws-account-drawer.is-plan .ws-account-content { padding: 20px 22px 24px; }

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
  .ws-account-profile-copy h2 { margin:0; max-width:390px; overflow:hidden; color:#f8fafc !important; font-size:20px !important; font-weight:600 !important; line-height:1.25 !important; text-overflow:ellipsis; white-space:nowrap; }
  .ws-account-profile-copy p { margin:3px 0 0; max-width:390px; overflow:hidden; color:#cbd5e1 !important; font-size:14px !important; font-weight:400 !important; text-overflow:ellipsis; white-space:nowrap; }
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
  .ws-account-section-head { margin-bottom:14px; }
  .ws-account-section-head > span { display:block; margin-bottom:4px; color:#667085 !important; font-size:12px !important; font-weight:600 !important; }
  .ws-account-section-head h3 { margin:0; color:#0f172a !important; font-size:16px !important; font-weight:600 !important; line-height:1.3 !important; }
  .ws-account-section-head p { margin:5px 0 0; color:#667085 !important; font-size:14px !important; font-weight:400 !important; line-height:1.5 !important; }

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

  .ws-plan-stack { display:grid; gap:9px; }
  .ws-plan-card { border:1px solid #d2d7dc; border-radius:7px; background:#eef1f3; overflow:hidden; }
  .ws-plan-overview { display:grid; grid-template-columns:minmax(0,1fr) 270px; gap:18px; padding:14px 15px; }
  .ws-plan-title-row { display:flex; flex-wrap:wrap; align-items:center; gap:8px; }
  .ws-plan-title-row h4,
  .ws-plan-cycle h4,
  .ws-plan-section-head h4,
  .ws-plan-management h4 { margin:0; color:#111827 !important; font-size:14px !important; font-weight:600 !important; line-height:1.25 !important; }
  .ws-plan-overview-main > p { margin:4px 0 0; color:#667085 !important; font-size:10px !important; line-height:1.45 !important; }
  .ws-plan-overview-meta { display:grid; grid-template-columns:1fr 1fr; align-content:start; border-left:1px solid #d2d7dc; }
  .ws-plan-overview-meta > div { display:grid; gap:3px; align-content:start; padding:2px 0 2px 14px; }
  .ws-plan-overview-meta > div + div { border-left:1px solid #d2d7dc; }
  .ws-plan-overview-meta span,
  .ws-plan-metric span,
  .ws-plan-eyebrow { color:#667085 !important; font-size:9px !important; font-weight:600 !important; }
  .ws-plan-overview-meta strong { color:#172033 !important; font-size:13px !important; font-weight:600 !important; }
  .ws-plan-overview-meta small,
  .ws-plan-metric small { color:#7a8492 !important; font-size:9px !important; font-weight:400 !important; }

  .ws-plan-badge { display:inline-flex; min-height:22px; align-items:center; justify-content:center; padding:0 7px; border-radius:999px; font-size:9px !important; font-weight:600 !important; white-space:nowrap; }
  .ws-plan-badge-active { border:1px solid #cce6d4; background:#e1f3e7; color:#31744a !important; }
  .ws-plan-badge-open { border:1px solid #cad9e9; background:#e5edf6; color:#345b82 !important; }

  .ws-plan-cycle { padding:13px 14px; }
  .ws-plan-cycle-top { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; }
  .ws-plan-cycle-top > div { min-width:0; }
  .ws-plan-cycle-top strong { display:block; margin:4px 0 2px; color:#667085 !important; font-size:9px !important; font-weight:500 !important; }
  .ws-plan-cycle h4 { font-size:13px !important; }
  .ws-plan-cycle-top p { margin:4px 0 0; color:#667085 !important; font-size:10px !important; line-height:1.45 !important; }
  .ws-plan-flow-note { display:flex; align-items:flex-start; gap:7px; margin-top:10px; border:1px solid #cfdae5; border-radius:6px; background:#e4ebf1; padding:7px 9px; }
  .ws-plan-flow-note p { margin:0; color:#506176 !important; font-size:9px !important; line-height:1.45 !important; }
  .ws-plan-flow-note p strong { color:#34495f !important; font-weight:600 !important; }
  .ws-plan-info-dot { display:grid; width:15px; height:15px; flex:0 0 auto; place-items:center; border:1px solid #7c91a8; border-radius:50%; color:#536b84 !important; font-size:8px !important; font-weight:700 !important; }

  .ws-plan-metrics { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:7px; }
  .ws-plan-metric { min-height:62px; display:grid; align-content:start; gap:4px; border:1px solid #d2d7dc; border-radius:7px; background:#e9ecef; padding:9px 10px; }
  .ws-plan-metric strong { color:#253247 !important; font-size:11px !important; font-weight:600 !important; line-height:1.3 !important; }

  .ws-plan-invoices { padding:0; }
  .ws-plan-section-head { display:flex; align-items:flex-start; justify-content:space-between; gap:12px; padding:11px 12px 8px; }
  .ws-plan-section-head p { margin:3px 0 0; color:#667085 !important; font-size:9px !important; }
  .ws-plan-section-head button { border:0; background:transparent; padding:2px 0; color:#697586 !important; font-size:9px !important; font-weight:500 !important; opacity:.65; }
  .ws-plan-table-wrap { overflow-x:auto; }
  .ws-plan-table { width:100%; border-collapse:collapse; min-width:590px; }
  .ws-plan-table th { background:#dde2e6; padding:6px 9px; color:#667085 !important; font-size:8px !important; font-weight:600 !important; text-align:left; }
  .ws-plan-table td { border-top:1px solid #d5dbe0; padding:7px 9px; color:#344054 !important; font-size:9px !important; font-weight:400 !important; vertical-align:middle; }
  .ws-plan-table td:first-child { font-weight:600 !important; color:#253247 !important; }
  .ws-plan-status { display:inline-flex; min-height:20px; align-items:center; gap:4px; border-radius:999px; padding:0 6px; font-size:8px !important; font-weight:600 !important; }
  .ws-plan-status i { width:5px; height:5px; border-radius:50%; background:#70849a; }
  .ws-plan-status.is-open { background:#e5edf6; color:#345b82 !important; }
  .ws-plan-action-muted { color:#85909d !important; font-size:8px !important; }
  .ws-plan-empty-history { border-top:1px solid #d5dbe0; padding:7px 12px; color:#7a8492 !important; font-size:9px !important; }
  .ws-plan-flow-note.is-bottom { margin:0 8px 8px; }

  .ws-plan-management > h4 { margin:1px 0 7px; font-size:12px !important; }
  .ws-plan-management-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:7px; }
  .ws-plan-management-grid button { position:relative; display:grid; min-height:59px; align-content:center; gap:2px; border:1px solid #d2d7dc; border-radius:7px; background:#e9ecef; padding:8px 26px 8px 10px; text-align:left; cursor:pointer; }
  .ws-plan-management-grid button:hover { background:#e2e6ea; }
  .ws-plan-management-grid span { color:#253247 !important; font-size:10px !important; font-weight:600 !important; }
  .ws-plan-management-grid small { color:#667085 !important; font-size:8px !important; font-weight:400 !important; line-height:1.4 !important; }
  .ws-plan-management-grid b { position:absolute; right:10px; top:50%; transform:translateY(-50%); color:#667085 !important; font-size:17px !important; font-weight:400 !important; }

  .ws-account-footer { border-top:1px solid #d2d7dc; background:#eaedf0; padding:10px 12px max(10px,env(safe-area-inset-bottom)); }
  .ws-account-logout { width:100%; min-height:42px; border:0; border-radius:6px; background:#202833; color:#fff !important; font-size:14px !important; font-weight:600 !important; cursor:pointer; }
  .ws-account-logout:hover { background:#171e27; }

  @media (max-width:720px) {
    .ws-account-overlay { background:#f3f4f6; backdrop-filter:none; -webkit-backdrop-filter:none; }
    .ws-account-drawer,
    .ws-account-drawer.is-plan { position:fixed; inset:0; width:100vw; height:100dvh; max-width:none; box-shadow:none; }

    .ws-account-header { min-height:auto; align-items:flex-start; padding:15px 14px 14px; gap:12px; }
    .ws-account-profile { align-items:center; gap:12px; }
    .ws-account-avatar.is-large { width:44px; height:44px; }
    .ws-account-kicker { margin-bottom:4px; font-size:10px !important; }
    .ws-account-profile-copy h2 { max-width:calc(100vw - 126px); font-size:16px !important; line-height:1.2 !important; }
    .ws-account-profile-copy p { max-width:calc(100vw - 126px); margin-top:3px; font-size:12px !important; line-height:1.4 !important; }
    .ws-account-profile-copy small { margin-top:3px; font-size:10px !important; line-height:1.35 !important; }
    .ws-account-close { width:38px; height:38px; border-radius:6px; font-size:22px !important; }

    .ws-account-body,
    .ws-account-drawer.is-plan .ws-account-body { display:flex; min-height:0; flex:1; flex-direction:column; }
    .ws-account-nav { flex:0 0 auto; overflow:hidden; border-right:0; border-bottom:1px solid #d2d7dc; background:#eaedf0; padding:8px 10px; }
    .ws-account-nav-label,
    .ws-account-nav-full { display:none; }
    .ws-account-nav-list { flex-direction:row; overflow-x:auto; gap:5px; padding:1px 0 2px; scrollbar-width:none; overscroll-behavior-x:contain; scroll-padding-inline:12px; }
    .ws-account-nav-list::-webkit-scrollbar { display:none; }
    .ws-account-nav-item { width:auto; min-width:max-content; min-height:34px; flex:0 0 auto; display:inline-flex; align-items:center; justify-content:center; border:1px solid transparent; border-radius:6px; padding:0 11px; color:#536077 !important; font-size:12px !important; font-weight:400 !important; text-align:center; }
    .ws-account-nav-item.is-active { border-color:#c7cdd3; background:#d9dee4; color:#111827 !important; font-weight:600 !important; }
    .ws-account-nav-short { display:inline; color:inherit !important; font-size:inherit !important; font-weight:inherit !important; }

    .ws-account-content,
    .ws-account-drawer.is-plan .ws-account-content { flex:1; min-height:0; overflow-y:auto; overscroll-behavior:contain; -webkit-overflow-scrolling:touch; background:#f3f4f6; padding:18px 14px 26px; }
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

    .ws-plan-stack { gap:8px; }
    .ws-plan-overview { grid-template-columns:1fr; gap:10px; padding:12px; }
    .ws-plan-overview-meta { grid-template-columns:1fr 1fr; border-left:0; border-top:1px solid #d2d7dc; padding-top:9px; }
    .ws-plan-overview-meta > div { padding-left:0; }
    .ws-plan-overview-meta > div + div { padding-left:9px; }
    .ws-plan-cycle { padding:11px; }
    .ws-plan-cycle-top { gap:8px; }
    .ws-plan-metrics { grid-template-columns:repeat(2,minmax(0,1fr)); gap:6px; }
    .ws-plan-metric { min-height:58px; padding:9px; }
    .ws-plan-management-grid { grid-template-columns:1fr; gap:6px; }
    .ws-plan-management-grid button { min-height:54px; }
    .ws-plan-table-wrap { margin:0; }

    .ws-account-footer { flex:0 0 auto; border-top:1px solid #d2d7dc; background:#eaedf0; padding:8px 10px max(8px,env(safe-area-inset-bottom)); }
    .ws-account-logout { min-height:40px; border-radius:7px; }
  }

  @media (max-width:360px) {
    .ws-account-header { padding-inline:12px; }
    .ws-account-avatar.is-large { width:44px; height:44px; }
    .ws-account-profile-copy h2,
    .ws-account-profile-copy p { max-width:calc(100vw - 116px); }
    .ws-account-nav { padding-inline:10px; }
    .ws-account-content,
    .ws-account-drawer.is-plan .ws-account-content { padding:16px 12px 24px; }
    .ws-plan-overview-meta { grid-template-columns:1fr; }
    .ws-plan-overview-meta > div + div { border-left:0; border-top:1px solid #d2d7dc; padding:8px 0 0; margin-top:6px; }
    .ws-plan-metrics { grid-template-columns:1fr 1fr; }
  }
`;
