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

const sections = ["Configurações gerais", "Meu plano", "Relatório da conta", "Exclusão de dados", "Notificações"] as const;
type Section = (typeof sections)[number];

export default function AccountDrawer({ accessLabel = "Usuário", planLabel = "Plano não informado", usageRows = [], triggerClassName = "", darkTrigger = false, avatarUrl = null, notifications = [] }: AccountDrawerProps) {
  const { user, userData } = useAuth();
  const { handleLogout } = useNavigation();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("Configurações gerais");
  const email = user?.email || "Usuário";
  const name = (userData as any)?.name || (userData as any)?.full_name || email.split("@")[0];
  const initials = useMemo(() => String(name || "U").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U", [name]);
  const defaultNotifications = notifications.length ? notifications : [
    { title: "Complete sua conta", text: "Revise seus dados gerais para manter o cadastro atualizado." },
    { title: "Conheça o painel", text: "Use o relatório da conta para acompanhar acessos e informações de uso." },
  ];

  const Avatar = ({ large = false }: { large?: boolean }) => avatarUrl ? <span className={`grid ${large ? "h-16 w-16" : "h-10 w-10"} place-items-center overflow-hidden rounded-full border border-[#dfe4ea] bg-white`}><img src={avatarUrl} alt="Logo" className="h-full w-full object-contain p-1" /></span> : <span className={`grid ${large ? "h-16 w-16" : "h-10 w-10"} place-items-center rounded-full bg-[#eef1f4] text-sm font-semibold text-[#334155]`}>{initials}</span>;

  return <>
    <button type="button" aria-label="Abrir conta" onClick={() => setOpen(true)} className={`grid h-10 w-10 place-items-center overflow-hidden rounded-full border text-xs font-semibold transition ${darkTrigger ? "border-white/20 bg-white/8 text-white hover:bg-white/14" : "border-border bg-card text-foreground hover:bg-muted"} ${triggerClassName}`}>
      {avatarUrl ? <img src={avatarUrl} alt="Logo da conta" className="h-full w-full object-contain bg-white p-1" /> : initials}
    </button>

    {open && <div className="fixed inset-0 z-[220] bg-black/40" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[520px] flex-col overflow-hidden bg-white text-[#111827] shadow-2xl">
        <div className="border-b border-[#e5e7eb] px-7 py-6">
          <div className="flex items-start justify-between gap-5">
            <div className="flex min-w-0 items-center gap-4"><Avatar large/><div className="min-w-0"><p className="truncate text-lg font-semibold">{name}</p><p className="mt-1 truncate text-xs text-[#6b7280]">{email}</p><p className="mt-1.5 text-[9px] font-semibold uppercase tracking-[.14em] text-[#9ca3af]">{accessLabel}</p></div></div>
            <button type="button" onClick={() => setOpen(false)} className="rounded-md px-2 py-1 text-xl leading-none text-[#9aa3af] hover:bg-[#f3f4f6] hover:text-[#111827]" aria-label="Fechar">×</button>
          </div>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-[170px_1fr]">
          <nav className="border-r border-[#e5e7eb] bg-[#f7f9fb] px-3 py-5">
            <p className="px-3 pb-3 text-[9px] font-semibold uppercase tracking-[.14em] text-[#9ca3af]">Conta</p>
            {sections.map((item) => <button key={item} type="button" onClick={() => setSection(item)} className={`mb-1 w-full rounded-lg px-3 py-3 text-left text-xs leading-4 transition ${section === item ? "border border-[#dfe4ea] bg-white font-semibold text-[#111827] shadow-sm" : "border border-transparent text-[#667085] hover:bg-white hover:text-[#111827]"}`}>{item}</button>)}
          </nav>

          <div className="min-w-0 overflow-y-auto bg-white p-6">
            {section === "Configurações gerais" && <SectionBox title="Configurações gerais" subtitle="Informações básicas vinculadas ao seu acesso."><Info label="Nome" value={name} /><Info label="E-mail" value={email} /><Info label="Tipo de acesso" value={accessLabel} /></SectionBox>}
            {section === "Meu plano" && <SectionBox title="Meu plano" subtitle="Plano e condição atual da conta."><div className="rounded-xl border border-[#dfe4ea] bg-[#f8fafc] p-5"><p className="text-[10px] uppercase tracking-[.13em] text-[#9ca3af]">Plano atual</p><p className="mt-2 text-xl font-semibold text-[#111827]">{planLabel}</p></div></SectionBox>}
            {section === "Relatório da conta" && <SectionBox title="Relatório da conta" subtitle="Resumo de uso e informações importantes da sua conta."><Info label="Status da sessão" value="Ativa" /><Info label="Acesso" value={accessLabel} />{usageRows.map((row) => <Info key={row.label} label={row.label} value={row.value} />)}</SectionBox>}
            {section === "Exclusão de dados" && <SectionBox title="Exclusão de dados" subtitle="A exclusão é permanente e exige confirmação antes do processamento."><div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs leading-5 text-red-700">A solicitação de exclusão deve ser revisada antes de remover definitivamente os dados da conta.</div><button type="button" disabled className="w-full rounded-lg border border-red-200 bg-white px-4 py-3 text-xs font-semibold text-red-700 opacity-70">Solicitar exclusão de dados</button></SectionBox>}
            {section === "Notificações" && <SectionBox title="Notificações" subtitle="Avisos úteis sobre configuração, uso e próximos passos.">{defaultNotifications.map((n,i)=><div key={`${n.title}-${i}`} className="rounded-xl border border-[#dfe4ea] bg-[#fbfcfd] p-4"><p className="text-sm font-semibold text-[#111827]">{n.title}</p><p className="mt-1.5 text-xs leading-5 text-[#667085]">{n.text}</p></div>)}</SectionBox>}
          </div>
        </div>

        <div className="border-t border-[#e5e7eb] bg-white p-4"><button type="button" onClick={handleLogout} className="w-full rounded-lg bg-[#202833] px-4 py-3 text-sm font-semibold text-white hover:bg-[#171e27]">Sair</button></div>
      </aside>
    </div>}
  </>;
}

function SectionBox({ title, subtitle, children }: { title:string; subtitle:string; children:React.ReactNode }) { return <div><p className="text-base font-semibold text-[#111827]">{title}</p><p className="mt-1 text-xs leading-5 text-[#667085]">{subtitle}</p><div className="mt-5 space-y-3">{children}</div></div>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-[#dfe4ea] bg-white px-4 py-3.5"><p className="text-[9px] uppercase tracking-[.13em] text-[#9ca3af]">{label}</p><p className="mt-1.5 break-words text-sm font-medium text-[#344054]">{value}</p></div>; }
