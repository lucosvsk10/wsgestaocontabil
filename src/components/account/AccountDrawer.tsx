import { useMemo, useState } from "react";
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
  "Exclusão de dados",
  "Notificações",
] as const;
type Section = (typeof sections)[number];

const sectionShort: Record<Section, string> = {
  "Configurações gerais": "Geral",
  "Meu plano": "Plano",
  "Relatório da conta": "Relatório",
  "Exclusão de dados": "Dados",
  "Notificações": "Notificações",
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

  const email = user?.email || "Usuário";
  const name =
    (userData as any)?.name ||
    (userData as any)?.full_name ||
    email.split("@")[0];

  const initials = useMemo(
    () =>
      String(name || "U")
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join("") || "U",
    [name],
  );

  const defaultNotifications = notifications.length
    ? notifications
    : [
        {
          title: "Complete sua conta",
          text: "Revise seus dados gerais para manter o cadastro atualizado.",
        },
        {
          title: "Conheça o painel",
          text: "Use o relatório da conta para acompanhar acessos e informações de uso.",
        },
      ];

  const Avatar = ({ large = false }: { large?: boolean }) =>
    avatarUrl ? (
      <span className={`ws-account-avatar ${large ? "is-large" : ""}`}>
        <img src={avatarUrl} alt="Logo da conta" />
      </span>
    ) : (
      <span className={`ws-account-avatar ws-account-initials ${large ? "is-large" : ""}`}>
        {initials}
      </span>
    );

  return (
    <>
      <button
        type="button"
        aria-label="Abrir conta"
        onClick={() => setOpen(true)}
        className={`grid h-10 w-10 place-items-center overflow-hidden rounded-full border text-xs font-semibold transition ${
          darkTrigger
            ? "border-white/20 bg-white/8 text-white hover:bg-white/14"
            : "border-border bg-card text-foreground hover:bg-muted"
        } ${triggerClassName}`}
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt="Logo da conta" className="h-full w-full object-contain bg-white p-1" />
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
          <aside className="ws-account-drawer" aria-label="Perfil e configurações da conta">
            <style>{accountDrawerStyles}</style>

            <header className="ws-account-header">
              <div className="ws-account-profile">
                <Avatar large />
                <div className="ws-account-profile-copy">
                  <p className="ws-account-name">{name}</p>
                  <p className="ws-account-email">{email}</p>
                  <span className="ws-account-access">{accessLabel}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                className="ws-account-close"
                aria-label="Fechar perfil"
              >
                ×
              </button>
            </header>

            <div className="ws-account-mobile-heading">
              <span>Minha conta</span>
              <strong>{section}</strong>
            </div>

            <div className="ws-account-body">
              <nav className="ws-account-nav" aria-label="Seções da conta">
                <p className="ws-account-nav-title">Conta</p>
                <div className="ws-account-nav-list">
                  {sections.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setSection(item)}
                      className={`ws-account-nav-item ${section === item ? "is-active" : ""}`}
                    >
                      <span className="ws-account-nav-desktop">{item}</span>
                      <span className="ws-account-nav-mobile">{sectionShort[item]}</span>
                    </button>
                  ))}
                </div>
              </nav>

              <main className="ws-account-content">
                {section === "Configurações gerais" && (
                  <SectionBox
                    eyebrow="Perfil"
                    title="Configurações gerais"
                    subtitle="Informações básicas vinculadas ao seu acesso."
                  >
                    <div className="ws-account-info-grid">
                      <Info label="Nome" value={name} />
                      <Info label="E-mail" value={email} />
                      <Info label="Tipo de acesso" value={accessLabel} wide />
                    </div>
                  </SectionBox>
                )}

                {section === "Meu plano" && (
                  <SectionBox
                    eyebrow="Assinatura"
                    title="Meu plano"
                    subtitle="Plano e condição atual da conta."
                  >
                    <div className="ws-account-plan-card">
                      <span>Plano atual</span>
                      <strong>{planLabel}</strong>
                      <p>As informações da assinatura ficam vinculadas à sua organização.</p>
                    </div>
                  </SectionBox>
                )}

                {section === "Relatório da conta" && (
                  <SectionBox
                    eyebrow="Atividade"
                    title="Relatório da conta"
                    subtitle="Resumo de uso e informações importantes da sua conta."
                  >
                    <div className="ws-account-info-grid">
                      <Info label="Status da sessão" value="Ativa" />
                      <Info label="Acesso" value={accessLabel} />
                      {usageRows.map((row) => (
                        <Info key={row.label} label={row.label} value={row.value} />
                      ))}
                    </div>
                  </SectionBox>
                )}

                {section === "Exclusão de dados" && (
                  <SectionBox
                    eyebrow="Privacidade"
                    title="Exclusão de dados"
                    subtitle="A exclusão é permanente e exige confirmação antes do processamento."
                  >
                    <div className="ws-account-danger-card">
                      <strong>Exclusão permanente</strong>
                      <p>
                        A solicitação deve ser revisada antes de remover definitivamente os dados da conta.
                      </p>
                    </div>
                    <button type="button" disabled className="ws-account-danger-button">
                      Solicitar exclusão de dados
                    </button>
                  </SectionBox>
                )}

                {section === "Notificações" && (
                  <SectionBox
                    eyebrow="Central de avisos"
                    title="Notificações"
                    subtitle="Avisos úteis sobre configuração, uso e próximos passos."
                  >
                    <div className="ws-account-notifications">
                      {defaultNotifications.map((notification, index) => (
                        <article key={`${notification.title}-${index}`} className="ws-account-notification-card">
                          <strong>{notification.title}</strong>
                          <p>{notification.text}</p>
                        </article>
                      ))}
                    </div>
                  </SectionBox>
                )}
              </main>
            </div>

            <footer className="ws-account-footer">
              <button type="button" onClick={handleLogout} className="ws-account-logout">
                Sair da conta
              </button>
            </footer>
          </aside>
        </div>
      )}
    </>
  );
}

function SectionBox({
  eyebrow,
  title,
  subtitle,
  children,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <section className="ws-account-section">
      <div className="ws-account-section-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      <div className="ws-account-section-content">{children}</div>
    </section>
  );
}

function Info({ label, value, wide = false }: { label: string; value: string; wide?: boolean }) {
  return (
    <div className={`ws-account-info-card ${wide ? "is-wide" : ""}`}>
      <span>{label}</span>
      <strong>{value || "—"}</strong>
    </div>
  );
}

const accountDrawerStyles = `
  .ws-account-overlay {
    position: fixed;
    inset: 0;
    z-index: 220;
    background: rgba(8, 15, 26, .50);
    backdrop-filter: blur(2px);
    -webkit-backdrop-filter: blur(2px);
  }

  .ws-account-drawer {
    position: absolute;
    right: 0;
    top: 0;
    display: flex;
    width: min(92vw, 640px);
    height: 100dvh;
    flex-direction: column;
    overflow: hidden;
    background: #f3f4f6;
    color: #172033 !important;
    box-shadow: -18px 0 52px rgba(5, 14, 28, .18);
    font-family: inherit !important;
  }

  .ws-account-drawer button,
  .ws-account-drawer input,
  .ws-account-drawer select,
  .ws-account-drawer textarea {
    font: inherit;
  }

  .ws-account-header {
    display: flex;
    min-height: 112px;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    border-bottom: 1px solid #d7dce2;
    background: #eef1f4;
    padding: 22px 26px;
  }

  .ws-account-profile {
    display: flex;
    min-width: 0;
    align-items: center;
    gap: 16px;
  }

  .ws-account-avatar {
    display: grid;
    width: 40px;
    height: 40px;
    flex: 0 0 auto;
    place-items: center;
    overflow: hidden;
    border: 1px solid #d4dae1;
    border-radius: 999px;
    background: #e2e6ea;
  }

  .ws-account-avatar.is-large {
    width: 64px;
    height: 64px;
  }

  .ws-account-avatar img {
    width: 100%;
    height: 100%;
    object-fit: contain;
    padding: 5px;
    background: #f7f8fa;
  }

  .ws-account-initials {
    background: #dfe4e9;
    color: #344054 !important;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: .04em;
  }

  .ws-account-initials.is-large {
    font-size: 15px;
  }

  .ws-account-profile-copy {
    min-width: 0;
  }

  .ws-account-name {
    margin: 0;
    max-width: 360px;
    overflow: hidden;
    color: #111827 !important;
    font-size: 17px !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: -.01em !important;
    opacity: 1 !important;
  }

  .ws-account-email {
    margin: 5px 0 0;
    max-width: 360px;
    overflow: hidden;
    color: #667085 !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    line-height: 1.35 !important;
    text-overflow: ellipsis;
    white-space: nowrap;
    opacity: 1 !important;
  }

  .ws-account-access {
    display: inline-block;
    margin-top: 8px;
    color: #596579 !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    line-height: 1.2 !important;
    letter-spacing: .10em !important;
    text-transform: uppercase;
    opacity: 1 !important;
  }

  .ws-account-close {
    display: grid;
    width: 38px;
    height: 38px;
    flex: 0 0 auto;
    place-items: center;
    border: 1px solid transparent;
    border-radius: 9px;
    background: transparent;
    color: #697586 !important;
    font-size: 24px !important;
    line-height: 1 !important;
    cursor: pointer;
    transition: .16s ease;
  }

  .ws-account-close:hover {
    border-color: #d4dae1;
    background: #e1e5e9;
    color: #172033 !important;
  }

  .ws-account-mobile-heading {
    display: none;
  }

  .ws-account-body {
    display: grid;
    min-height: 0;
    flex: 1;
    grid-template-columns: 180px minmax(0, 1fr);
  }

  .ws-account-nav {
    min-width: 0;
    border-right: 1px solid #d7dce2;
    background: #e9ecef;
    padding: 22px 12px;
  }

  .ws-account-nav-title {
    margin: 0 0 9px;
    padding: 0 11px;
    color: #8a94a3 !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: .13em !important;
    text-transform: uppercase;
  }

  .ws-account-nav-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .ws-account-nav-item {
    width: 100%;
    min-height: 42px;
    border: 1px solid transparent;
    border-radius: 8px;
    background: transparent;
    padding: 9px 11px;
    color: #536077 !important;
    font-size: 12px !important;
    font-weight: 500 !important;
    line-height: 1.3 !important;
    text-align: left;
    cursor: pointer;
    transition: .15s ease;
  }

  .ws-account-nav-item:hover {
    background: #dfe3e7;
    color: #172033 !important;
  }

  .ws-account-nav-item.is-active {
    border-color: #cfd5dc;
    background: #f4f5f6;
    color: #172033 !important;
    font-weight: 600 !important;
    box-shadow: 0 1px 2px rgba(15, 23, 42, .04);
  }

  .ws-account-nav-mobile {
    display: none;
  }

  .ws-account-content {
    min-width: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    background: #f3f4f6;
    padding: 30px;
  }

  .ws-account-section {
    width: 100%;
  }

  .ws-account-section-heading > span {
    display: block;
    margin-bottom: 5px;
    color: #7b8696 !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: .12em !important;
    text-transform: uppercase;
  }

  .ws-account-section-heading h2 {
    margin: 0;
    color: #111827 !important;
    font-size: 20px !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
    letter-spacing: -.015em !important;
    opacity: 1 !important;
  }

  .ws-account-section-heading p {
    margin: 6px 0 0;
    max-width: 390px;
    color: #667085 !important;
    font-size: 12px !important;
    font-weight: 400 !important;
    line-height: 1.55 !important;
    opacity: 1 !important;
  }

  .ws-account-section-content {
    margin-top: 22px;
  }

  .ws-account-info-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .ws-account-info-card {
    min-width: 0;
    min-height: 91px;
    border: 1px solid #d4dae1;
    border-radius: 12px;
    background: #eaedf0;
    padding: 16px;
  }

  .ws-account-info-card.is-wide {
    grid-column: 1 / -1;
  }

  .ws-account-info-card > span,
  .ws-account-plan-card > span {
    display: block;
    color: #7a8594 !important;
    font-size: 9px !important;
    font-weight: 700 !important;
    letter-spacing: .10em !important;
    text-transform: uppercase;
  }

  .ws-account-info-card > strong {
    display: block;
    margin-top: 10px;
    overflow-wrap: anywhere;
    color: #27364a !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    line-height: 1.4 !important;
    opacity: 1 !important;
  }

  .ws-account-plan-card {
    border: 1px solid #d4dae1;
    border-radius: 14px;
    background: #e9ecef;
    padding: 20px;
  }

  .ws-account-plan-card strong {
    display: block;
    margin-top: 9px;
    color: #172033 !important;
    font-size: 22px !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
  }

  .ws-account-plan-card p {
    margin: 9px 0 0;
    color: #667085 !important;
    font-size: 11px !important;
    line-height: 1.5 !important;
  }

  .ws-account-danger-card {
    border: 1px solid #e4c2c2;
    border-radius: 12px;
    background: #f5eaea;
    padding: 16px;
  }

  .ws-account-danger-card strong {
    color: #852f2f !important;
    font-size: 13px !important;
    font-weight: 600 !important;
  }

  .ws-account-danger-card p {
    margin: 6px 0 0;
    color: #965454 !important;
    font-size: 11px !important;
    line-height: 1.55 !important;
  }

  .ws-account-danger-button {
    width: 100%;
    margin-top: 10px;
    border: 1px solid #dec1c1;
    border-radius: 9px;
    background: #f3eeee;
    padding: 12px 14px;
    color: #8a4141 !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    opacity: .66;
  }

  .ws-account-notifications {
    display: grid;
    gap: 10px;
  }

  .ws-account-notification-card {
    border: 1px solid #d4dae1;
    border-radius: 12px;
    background: #eaedf0;
    padding: 16px;
  }

  .ws-account-notification-card strong {
    color: #27364a !important;
    font-size: 13px !important;
    font-weight: 600 !important;
  }

  .ws-account-notification-card p {
    margin: 5px 0 0;
    color: #667085 !important;
    font-size: 11px !important;
    line-height: 1.55 !important;
  }

  .ws-account-footer {
    border-top: 1px solid #d7dce2;
    background: #eef1f4;
    padding: 12px 16px max(12px, env(safe-area-inset-bottom));
  }

  .ws-account-logout {
    width: 100%;
    min-height: 43px;
    border: 0;
    border-radius: 9px;
    background: #202a36;
    padding: 11px 16px;
    color: #fff !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    cursor: pointer;
    transition: .15s ease;
  }

  .ws-account-logout:hover {
    background: #151d27;
  }

  @media (max-width: 680px) {
    .ws-account-overlay {
      background: rgba(8, 15, 26, .35);
    }

    .ws-account-drawer {
      position: fixed;
      inset: 0;
      width: 100vw;
      max-width: none;
      height: 100dvh;
      border-radius: 0;
      box-shadow: none;
    }

    .ws-account-header {
      min-height: 88px;
      padding: 14px 16px;
      gap: 12px;
    }

    .ws-account-profile {
      gap: 12px;
    }

    .ws-account-avatar.is-large {
      width: 52px;
      height: 52px;
    }

    .ws-account-initials.is-large {
      font-size: 13px;
    }

    .ws-account-name {
      max-width: calc(100vw - 130px);
      font-size: 15px !important;
    }

    .ws-account-email {
      max-width: calc(100vw - 130px);
      margin-top: 3px;
      font-size: 11px !important;
    }

    .ws-account-access {
      margin-top: 5px;
      font-size: 8px !important;
    }

    .ws-account-close {
      width: 40px;
      height: 40px;
      font-size: 23px !important;
    }

    .ws-account-mobile-heading {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
      border-bottom: 1px solid #d7dce2;
      background: #f3f4f6;
      padding: 12px 16px 9px;
    }

    .ws-account-mobile-heading span {
      color: #8993a1 !important;
      font-size: 8px !important;
      font-weight: 700 !important;
      letter-spacing: .11em !important;
      text-transform: uppercase;
    }

    .ws-account-mobile-heading strong {
      min-width: 0;
      overflow: hidden;
      color: #344054 !important;
      font-size: 11px !important;
      font-weight: 600 !important;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .ws-account-body {
      display: flex;
      min-height: 0;
      flex: 1;
      flex-direction: column;
    }

    .ws-account-nav {
      flex: 0 0 auto;
      overflow: hidden;
      border-right: 0;
      border-bottom: 1px solid #d7dce2;
      background: #e9ecef;
      padding: 8px 10px;
    }

    .ws-account-nav-title,
    .ws-account-nav-desktop {
      display: none;
    }

    .ws-account-nav-list {
      display: flex;
      overflow-x: auto;
      flex-direction: row;
      gap: 6px;
      scrollbar-width: none;
      overscroll-behavior-x: contain;
    }

    .ws-account-nav-list::-webkit-scrollbar {
      display: none;
    }

    .ws-account-nav-item {
      width: auto;
      min-width: max-content;
      min-height: 36px;
      flex: 0 0 auto;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 11px !important;
      text-align: center;
    }

    .ws-account-nav-mobile {
      display: inline;
    }

    .ws-account-content {
      flex: 1;
      padding: 20px 16px 24px;
    }

    .ws-account-section-heading > span {
      margin-bottom: 4px;
      font-size: 8px !important;
    }

    .ws-account-section-heading h2 {
      font-size: 18px !important;
    }

    .ws-account-section-heading p {
      margin-top: 5px;
      font-size: 11px !important;
      line-height: 1.5 !important;
    }

    .ws-account-section-content {
      margin-top: 17px;
    }

    .ws-account-info-grid {
      grid-template-columns: 1fr;
      gap: 8px;
    }

    .ws-account-info-card,
    .ws-account-info-card.is-wide {
      grid-column: auto;
      min-height: 74px;
      padding: 13px 14px;
    }

    .ws-account-info-card > strong {
      margin-top: 7px;
      font-size: 13px !important;
    }

    .ws-account-plan-card,
    .ws-account-danger-card,
    .ws-account-notification-card {
      padding: 14px;
    }

    .ws-account-plan-card strong {
      font-size: 19px !important;
    }

    .ws-account-footer {
      padding: 10px 12px max(10px, env(safe-area-inset-bottom));
    }

    .ws-account-logout {
      min-height: 44px;
      font-size: 12px !important;
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
      max-width: calc(100vw - 118px);
    }

    .ws-account-content {
      padding-inline: 13px;
    }
  }
`;
