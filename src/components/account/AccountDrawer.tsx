import { useEffect, useMemo, useState, type ReactNode } from "react";
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

const sectionMeta: Record<
  Section,
  { short: string; eyebrow: string; title: string; subtitle: string }
> = {
  "Configurações gerais": {
    short: "Geral",
    eyebrow: "Perfil",
    title: "Configurações gerais",
    subtitle: "Informações principais vinculadas ao seu acesso.",
  },
  "Meu plano": {
    short: "Plano",
    eyebrow: "Assinatura",
    title: "Meu plano",
    subtitle: "Resumo da assinatura e do estado atual da conta.",
  },
  "Relatório da conta": {
    short: "Relatório",
    eyebrow: "Atividade",
    title: "Relatório da conta",
    subtitle: "Dados rápidos de uso e situação da sessão.",
  },
  "Notificações": {
    short: "Avisos",
    eyebrow: "Central",
    title: "Notificações",
    subtitle: "Avisos e lembretes úteis da sua conta.",
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

  const email = user?.email || "usuario@email.com";
  const name =
    (userData as any)?.name ||
    (userData as any)?.full_name ||
    email.split("@")[0] ||
    "Usuário";

  const initials = useMemo(() => {
    return (
      String(name)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "U"
    );
  }, [name]);

  const defaultNotifications =
    notifications.length > 0
      ? notifications
      : [
          {
            title: "Conta ativa",
            text: "Seu acesso está funcionando normalmente e vinculado ao emissor fiscal.",
          },
          {
            title: "Mantenha seus dados revisados",
            text: "Verifique periodicamente nome, e-mail e dados da organização para manter o acesso consistente.",
          },
        ];

  const resolvedUsageRows =
    usageRows.length > 0
      ? usageRows
      : [
          { label: "Status da sessão", value: "Ativa" },
          { label: "Tipo de acesso", value: accessLabel },
          { label: "E-mail principal", value: email },
        ];

  useEffect(() => {
    if (!open) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  const Avatar = ({ large = false }: { large?: boolean }) =>
    avatarUrl ? (
      <span className={`ws-account-avatar ${large ? "is-large" : ""}`}>
        <img src={avatarUrl} alt="Avatar da conta" />
      </span>
    ) : (
      <span
        className={`ws-account-avatar ws-account-avatar-fallback ${large ? "is-large" : ""}`}
      >
        {initials}
      </span>
    );

  return (
    <>
      <button
        type="button"
        aria-label="Abrir perfil da conta"
        onClick={() => setOpen(true)}
        className={`grid h-10 w-10 place-items-center overflow-hidden rounded-full border text-xs font-semibold transition ${
          darkTrigger
            ? "border-white/20 bg-white/10 text-white hover:bg-white/16"
            : "border-border bg-card text-foreground hover:bg-muted"
        } ${triggerClassName}`}
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Avatar da conta"
            className="h-full w-full object-contain bg-white p-1"
          />
        ) : (
          initials
        )}
      </button>

      {open && (
        <div
          className="ws-account-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setOpen(false);
          }}
        >
          <style>{drawerCss}</style>

          <aside
            className="ws-account-drawer"
            aria-label="Perfil e configurações da conta"
          >
            <header className="ws-account-header">
              <div className="ws-account-header-main">
                <div className="ws-account-header-topline">Minha conta</div>

                <div className="ws-account-profile-row">
                  <Avatar large />

                  <div className="ws-account-profile-copy">
                    <h2 className="ws-account-name">{name}</h2>
                    <p className="ws-account-email">{email}</p>
                    <span className="ws-account-role">{accessLabel}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="ws-account-close"
                aria-label="Fechar perfil"
                onClick={() => setOpen(false)}
              >
                ×
              </button>
            </header>

            <div className="ws-account-body">
              <nav className="ws-account-sidebar" aria-label="Seções da conta">
                <div className="ws-account-sidebar-title">Conta</div>

                <div className="ws-account-sidebar-list">
                  {sections.map((item) => {
                    const active = item === section;
                    return (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setSection(item)}
                        className={`ws-account-sidebar-item ${active ? "is-active" : ""}`}
                      >
                        <span className="ws-account-sidebar-item-title">
                          {item}
                        </span>
                        <span className="ws-account-sidebar-item-mobile">
                          {sectionMeta[item].short}
                        </span>
                        <span className="ws-account-sidebar-item-text">
                          {sectionMeta[item].eyebrow}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>

              <main className="ws-account-main">
                <SectionShell
                  eyebrow={sectionMeta[section].eyebrow}
                  title={sectionMeta[section].title}
                  subtitle={sectionMeta[section].subtitle}
                >
                  {section === "Configurações gerais" && (
                    <>
                      <div className="ws-account-hero-card">
                        <div className="ws-account-hero-copy">
                          <span>Perfil principal</span>
                          <strong>{name}</strong>
                          <p>
                            Estas são as informações básicas associadas ao seu
                            acesso no emissor fiscal.
                          </p>
                        </div>

                        <div className="ws-account-hero-meta">
                          <MiniTag>Conta ativa</MiniTag>
                          <MiniTag>{accessLabel}</MiniTag>
                        </div>
                      </div>

                      <div className="ws-account-grid two">
                        <InfoCard label="Nome" value={name} />
                        <InfoCard label="E-mail" value={email} />
                        <InfoCard label="Tipo de acesso" value={accessLabel} />
                        <InfoCard label="Status" value="Ativo" />
                      </div>
                    </>
                  )}

                  {section === "Meu plano" && (
                    <>
                      <div className="ws-account-plan-card">
                        <div>
                          <span>Plano atual</span>
                          <strong>{planLabel}</strong>
                          <p>
                            O plano controla os recursos disponíveis para sua
                            organização dentro do sistema.
                          </p>
                        </div>

                        <div className="ws-account-plan-badge">Ativo</div>
                      </div>

                      <div className="ws-account-grid two">
                        <FeatureCard
                          title="Emissor fiscal"
                          text="Acesso ao ambiente do emissor e às rotinas principais da conta."
                        />
                        <FeatureCard
                          title="Central de documentos"
                          text="Gerenciamento das operações e visualização dos documentos vinculados."
                        />
                      </div>
                    </>
                  )}

                  {section === "Relatório da conta" && (
                    <div className="ws-account-grid two">
                      {resolvedUsageRows.map((row) => (
                        <InfoCard
                          key={row.label}
                          label={row.label}
                          value={row.value}
                        />
                      ))}
                    </div>
                  )}

                  {section === "Notificações" && (
                    <div className="ws-account-stack">
                      {defaultNotifications.map((item, index) => (
                        <NoticeCard
                          key={`${item.title}-${index}`}
                          title={item.title}
                          text={item.text}
                        />
                      ))}
                    </div>
                  )}

                  {section === "Exclusão de dados" && (
                    <>
                      <div className="ws-account-danger">
                        <span>Zona sensível</span>
                        <strong>Exclusão permanente</strong>
                        <p>
                          Esta ação remove definitivamente os dados da conta e
                          deve ser usada somente após confirmação.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="ws-account-danger-button"
                        disabled
                      >
                        Solicitar exclusão de dados
                      </button>
                    </>
                  )}
                </SectionShell>
              </main>
            </div>

            <footer className="ws-account-footer">
              <button
                type="button"
                onClick={handleLogout}
                className="ws-account-logout"
              >
                Sair da conta
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}

function SectionShell({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="ws-account-section">
      <div className="ws-account-section-head">
        <span>{eyebrow}</span>
        <h3>{title}</h3>
        <p>{subtitle}</p>
      </div>

      <div className="ws-account-section-body">{children}</div>
    </section>
  );
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="ws-account-info-card">
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

function FeatureCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="ws-account-feature-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function NoticeCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="ws-account-notice-card">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function MiniTag({ children }: { children: ReactNode }) {
  return <span className="ws-account-mini-tag">{children}</span>;
}

const drawerCss = `
  .ws-account-overlay {
    position: fixed;
    inset: 0;
    z-index: 220;
    background: rgba(4, 10, 18, .48);
    backdrop-filter: blur(5px);
    -webkit-backdrop-filter: blur(5px);
  }

  .ws-account-drawer {
    position: absolute;
    top: 0;
    right: 0;
    display: flex;
    flex-direction: column;
    width: min(760px, 100vw);
    height: 100dvh;
    overflow: hidden;
    background: #f3f5f7;
    color: #142033 !important;
    box-shadow: -20px 0 60px rgba(10, 18, 32, .22);
    font-family: inherit !important;
  }

  .ws-account-drawer *,
  .ws-account-drawer *::before,
  .ws-account-drawer *::after {
    box-sizing: border-box;
  }

  .ws-account-drawer button {
    font: inherit;
  }

  .ws-account-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    padding: 24px 24px 22px;
    border-bottom: 1px solid rgba(255,255,255,.08);
    background: linear-gradient(135deg, #07111f 0%, #0d1d31 100%);
    color: #f8fafc !important;
  }

  .ws-account-header-main {
    min-width: 0;
    flex: 1;
  }

  .ws-account-header-topline {
    margin-bottom: 16px;
    color: rgba(255,255,255,.58) !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    letter-spacing: .16em !important;
    text-transform: uppercase;
  }

  .ws-account-profile-row {
    display: flex;
    align-items: center;
    gap: 16px;
    min-width: 0;
  }

  .ws-account-avatar {
    width: 48px;
    height: 48px;
    border-radius: 999px;
    overflow: hidden;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 1px solid rgba(255,255,255,.18);
    background: rgba(255,255,255,.12);
  }

  .ws-account-avatar.is-large {
    width: 64px;
    height: 64px;
  }

  .ws-account-avatar img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    background: white;
    padding: 5px;
  }

  .ws-account-avatar-fallback {
    color: #ffffff !important;
    font-size: 14px !important;
    font-weight: 700 !important;
    letter-spacing: .04em !important;
  }

  .ws-account-profile-copy {
    min-width: 0;
  }

  .ws-account-name {
    margin: 0;
    font-size: 26px !important;
    line-height: 1.08 !important;
    font-weight: 600 !important;
    color: #ffffff !important;
    letter-spacing: -.03em !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 420px;
    opacity: 1 !important;
  }

  .ws-account-email {
    margin: 6px 0 0;
    font-size: 13px !important;
    line-height: 1.45 !important;
    color: rgba(255,255,255,.78) !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 420px;
    opacity: 1 !important;
  }

  .ws-account-role {
    display: inline-flex;
    align-items: center;
    margin-top: 10px;
    min-height: 28px;
    padding: 0 12px;
    border-radius: 999px;
    border: 1px solid rgba(255,255,255,.14);
    background: rgba(255,255,255,.09);
    color: #ffffff !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    line-height: 1 !important;
    letter-spacing: .03em !important;
    opacity: 1 !important;
  }

  .ws-account-close {
    width: 42px;
    height: 42px;
    border: 1px solid rgba(255,255,255,.14);
    border-radius: 12px;
    background: rgba(255,255,255,.08);
    color: rgba(255,255,255,.88) !important;
    font-size: 28px !important;
    line-height: 1 !important;
    display: grid;
    place-items: center;
    cursor: pointer;
    transition: .16s ease;
    flex: 0 0 auto;
  }

  .ws-account-close:hover {
    background: rgba(255,255,255,.15);
    color: #fff !important;
  }

  .ws-account-body {
    flex: 1;
    min-height: 0;
    display: grid;
    grid-template-columns: 220px minmax(0, 1fr);
  }

  .ws-account-sidebar {
    padding: 18px;
    border-right: 1px solid #dde3ea;
    background: #e9edf1;
  }

  .ws-account-sidebar-title {
    margin-bottom: 12px;
    color: #667085 !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    letter-spacing: .14em !important;
    text-transform: uppercase;
  }

  .ws-account-sidebar-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .ws-account-sidebar-item {
    width: 100%;
    padding: 12px 13px;
    border-radius: 12px;
    border: 1px solid transparent;
    background: transparent;
    text-align: left;
    cursor: pointer;
    transition: .16s ease;
  }

  .ws-account-sidebar-item:hover {
    background: #f1f3f5;
    border-color: #d7dde5;
  }

  .ws-account-sidebar-item.is-active {
    background: #ffffff;
    border-color: #d7dde5;
    box-shadow: 0 8px 20px rgba(15, 23, 42, .05);
  }

  .ws-account-sidebar-item-title {
    display: block;
    font-size: 12px !important;
    line-height: 1.35 !important;
    font-weight: 600 !important;
    color: #182436 !important;
    opacity: 1 !important;
  }

  .ws-account-sidebar-item-text {
    display: block;
    margin-top: 4px;
    font-size: 9px !important;
    line-height: 1.45 !important;
    color: #7b8797 !important;
    opacity: 1 !important;
  }

  .ws-account-sidebar-item-mobile {
    display: none;
  }

  .ws-account-main {
    min-width: 0;
    overflow-y: auto;
    padding: 28px;
    background: #f4f6f8;
  }

  .ws-account-section-head span {
    display: block;
    color: #667085 !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    letter-spacing: .14em !important;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .ws-account-section-head h3 {
    margin: 0;
    font-size: 19px !important;
    line-height: 1.15 !important;
    font-weight: 600 !important;
    color: #101828 !important;
    letter-spacing: -.02em !important;
    opacity: 1 !important;
  }

  .ws-account-section-head p {
    margin: 8px 0 0;
    max-width: 480px;
    font-size: 11px !important;
    line-height: 1.6 !important;
    color: #667085 !important;
    opacity: 1 !important;
  }

  .ws-account-section-body {
    margin-top: 22px;
  }

  .ws-account-hero-card,
  .ws-account-plan-card,
  .ws-account-info-card,
  .ws-account-feature-card,
  .ws-account-notice-card,
  .ws-account-danger {
    border: 1px solid #d7dde5;
    background: #ffffff;
    border-radius: 14px;
    box-shadow: 0 6px 18px rgba(15, 23, 42, .035);
  }

  .ws-account-hero-card {
    padding: 18px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 18px;
    margin-bottom: 14px;
  }

  .ws-account-hero-copy span,
  .ws-account-info-card span,
  .ws-account-plan-card span {
    display: block;
    color: #7a8594 !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    letter-spacing: .12em !important;
    text-transform: uppercase;
  }

  .ws-account-hero-copy strong {
    display: block;
    margin-top: 8px;
    color: #101828 !important;
    font-size: 20px !important;
    line-height: 1.1 !important;
    font-weight: 600 !important;
    letter-spacing: -.03em !important;
    opacity: 1 !important;
  }

  .ws-account-hero-copy p {
    margin: 10px 0 0;
    color: #667085 !important;
    font-size: 11px !important;
    line-height: 1.6 !important;
    max-width: 440px;
    opacity: 1 !important;
  }

  .ws-account-hero-meta {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    justify-content: flex-end;
  }

  .ws-account-mini-tag {
    display: inline-flex;
    align-items: center;
    min-height: 28px;
    padding: 0 11px;
    border-radius: 999px;
    border: 1px solid #d7dde5;
    background: #f4f6f8;
    color: #344054 !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    opacity: 1 !important;
  }

  .ws-account-grid.two {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 12px;
  }

  .ws-account-stack {
    display: grid;
    gap: 12px;
  }

  .ws-account-info-card,
  .ws-account-feature-card,
  .ws-account-notice-card {
    padding: 16px;
  }

  .ws-account-info-card strong {
    display: block;
    margin-top: 9px;
    color: #243447 !important;
    font-size: 15px !important;
    line-height: 1.3 !important;
    font-weight: 500 !important;
    overflow-wrap: anywhere;
    opacity: 1 !important;
  }

  .ws-account-feature-card strong,
  .ws-account-notice-card strong {
    display: block;
    color: #101828 !important;
    font-size: 13px !important;
    font-weight: 600 !important;
    line-height: 1.35 !important;
    opacity: 1 !important;
  }

  .ws-account-feature-card p,
  .ws-account-notice-card p {
    margin: 7px 0 0;
    color: #667085 !important;
    font-size: 10px !important;
    line-height: 1.6 !important;
    opacity: 1 !important;
  }

  .ws-account-plan-card {
    padding: 18px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    margin-bottom: 14px;
  }

  .ws-account-plan-card strong {
    display: block;
    margin-top: 8px;
    color: #101828 !important;
    font-size: 22px !important;
    line-height: 1.1 !important;
    font-weight: 600 !important;
    letter-spacing: -.03em !important;
    opacity: 1 !important;
  }

  .ws-account-plan-card p {
    margin: 10px 0 0;
    color: #667085 !important;
    font-size: 11px !important;
    line-height: 1.6 !important;
    max-width: 440px;
    opacity: 1 !important;
  }

  .ws-account-plan-badge {
    display: inline-flex;
    align-items: center;
    min-height: 30px;
    padding: 0 11px;
    border-radius: 999px;
    background: #eaf7ef;
    color: #1f7a42 !important;
    border: 1px solid #ccebd7;
    font-size: 10px !important;
    font-weight: 700 !important;
    white-space: nowrap;
  }

  .ws-account-danger {
    padding: 18px;
    background: #fff6f6;
    border-color: #f0caca;
  }

  .ws-account-danger span {
    display: block;
    color: #b42318 !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: .12em !important;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .ws-account-danger strong {
    display: block;
    color: #7a271a !important;
    font-size: 16px !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
    opacity: 1 !important;
  }

  .ws-account-danger p {
    margin: 10px 0 0;
    color: #a04438 !important;
    font-size: 11px !important;
    line-height: 1.6 !important;
    max-width: 480px;
    opacity: 1 !important;
  }

  .ws-account-danger-button {
    width: 100%;
    min-height: 44px;
    margin-top: 12px;
    border-radius: 12px;
    border: 1px solid #efc2c2;
    background: #fff;
    color: #b42318 !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    opacity: .65;
  }

  .ws-account-footer {
    border-top: 1px solid #dbe2ea;
    background: #eef1f4;
    padding: 12px 16px max(12px, env(safe-area-inset-bottom));
  }

  .ws-account-logout {
    width: 100%;
    min-height: 46px;
    border: 0;
    border-radius: 12px;
    background: linear-gradient(90deg, #1f2a39, #263445);
    color: #ffffff !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    cursor: pointer;
    transition: .16s ease;
  }

  .ws-account-logout:hover {
    filter: brightness(1.03);
  }

  @media (max-width: 820px) {
    .ws-account-drawer {
      position: fixed;
      inset: 0;
      width: 100vw;
      max-width: none;
      height: 100dvh;
      box-shadow: none;
    }

    .ws-account-header {
      padding: 18px 16px;
      gap: 12px;
    }

    .ws-account-header-topline {
      margin-bottom: 12px;
      font-size: 8px !important;
    }

    .ws-account-avatar.is-large {
      width: 52px;
      height: 52px;
    }

    .ws-account-name {
      max-width: calc(100vw - 128px);
      font-size: 18px !important;
    }

    .ws-account-email {
      max-width: calc(100vw - 128px);
      margin-top: 4px;
      font-size: 11px !important;
    }

    .ws-account-role {
      margin-top: 6px;
      min-height: 23px;
      padding: 0 9px;
      font-size: 8px !important;
    }

    .ws-account-close {
      width: 38px;
      height: 38px;
      font-size: 24px !important;
      border-radius: 10px;
    }

    .ws-account-body {
      grid-template-columns: 1fr;
      grid-template-rows: auto minmax(0, 1fr);
    }

    .ws-account-sidebar {
      border-right: 0;
      border-bottom: 1px solid #dde3ea;
      padding: 9px 10px;
      overflow: hidden;
    }

    .ws-account-sidebar-title,
    .ws-account-sidebar-item-text,
    .ws-account-sidebar-item-title {
      display: none;
    }

    .ws-account-sidebar-list {
      flex-direction: row;
      overflow-x: auto;
      gap: 6px;
      scrollbar-width: none;
      overscroll-behavior-x: contain;
    }

    .ws-account-sidebar-list::-webkit-scrollbar {
      display: none;
    }

    .ws-account-sidebar-item {
      width: auto;
      min-width: max-content;
      padding: 9px 13px;
      border-radius: 999px;
      flex: 0 0 auto;
    }

    .ws-account-sidebar-item-mobile {
      display: inline;
      font-size: 10px !important;
      font-weight: 600 !important;
      color: #344054 !important;
    }

    .ws-account-sidebar-item.is-active {
      background: #202a39;
      border-color: #202a39;
      box-shadow: none;
    }

    .ws-account-sidebar-item.is-active .ws-account-sidebar-item-mobile {
      color: #fff !important;
    }

    .ws-account-main {
      min-height: 0;
      padding: 18px 14px 22px;
    }

    .ws-account-section-head h3 {
      font-size: 16px !important;
    }

    .ws-account-section-head p {
      font-size: 10px !important;
    }

    .ws-account-section-body {
      margin-top: 16px;
    }

    .ws-account-grid.two {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .ws-account-hero-card,
    .ws-account-plan-card {
      flex-direction: column;
      align-items: stretch;
      padding: 15px;
    }

    .ws-account-hero-meta {
      justify-content: flex-start;
    }

    .ws-account-hero-copy strong,
    .ws-account-plan-card strong {
      font-size: 18px !important;
    }

    .ws-account-info-card,
    .ws-account-feature-card,
    .ws-account-notice-card,
    .ws-account-danger {
      padding: 14px;
      border-radius: 12px;
    }

    .ws-account-info-card strong {
      font-size: 13px !important;
    }

    .ws-account-footer {
      padding: 9px 10px max(9px, env(safe-area-inset-bottom));
    }

    .ws-account-logout {
      min-height: 44px;
      font-size: 11px !important;
    }
  }

  @media (max-width: 360px) {
    .ws-account-header {
      padding-inline: 12px;
    }

    .ws-account-avatar.is-large {
      width: 46px;
      height: 46px;
    }

    .ws-account-name,
    .ws-account-email {
      max-width: calc(100vw - 116px);
    }

    .ws-account-main {
      padding-inline: 12px;
    }
  }
`;
