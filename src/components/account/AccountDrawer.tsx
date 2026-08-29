import { useMemo, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigation } from "@/components/navbar/hooks/useNavigation";

type AccountDrawerProps = {
  accessLabel?: string;
  planLabel?: string;
  usageRows?: Array<{ label: string; value: string }>;
  triggerClassName?: string;
  darkTrigger?: boolean;
};

const sections = ["Configurações gerais", "Meu plano", "Relatório da conta", "Exclusão de dados"] as const;
type Section = (typeof sections)[number];

export default function AccountDrawer({ accessLabel = "Usuário", planLabel = "Plano não informado", usageRows = [], triggerClassName = "", darkTrigger = false }: AccountDrawerProps) {
  const { user, userData } = useAuth();
  const { handleLogout } = useNavigation();
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<Section>("Configurações gerais");
  const email = user?.email || "Usuário";
  const name = (userData as any)?.name || (userData as any)?.full_name || email.split("@")[0];
  const initials = useMemo(() => String(name || "U").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("") || "U", [name]);

  return <>
    <button
      type="button"
      aria-label="Abrir conta"
      onClick={() => setOpen(true)}
      className={`grid h-10 w-10 place-items-center rounded-full border text-xs font-semibold transition ${darkTrigger ? "border-white/20 bg-white/8 text-white hover:bg-white/14" : "border-border bg-card text-foreground hover:bg-muted"} ${triggerClassName}`}
    >
      {initials}
    </button>

    {open && <div className="fixed inset-0 z-[220] bg-black/35" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
      <aside className="absolute right-0 top-0 flex h-full w-full max-w-[390px] flex-col overflow-hidden bg-white text-[#111827] shadow-2xl">
        <div className="flex items-start justify-between border-b border-[#e5e7eb] px-6 py-5">
          <div className="min-w-0">
            <div className="grid h-14 w-14 place-items-center rounded-full bg-[#eef1f4] text-sm font-semibold text-[#334155]">{initials}</div>
            <p className="mt-3 truncate text-base font-semibold">{name}</p>
            <p className="mt-0.5 truncate text-xs text-[#6b7280]">{email}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[.13em] text-[#9ca3af]">{accessLabel}</p>
          </div>
          <button type="button" onClick={() => setOpen(false)} className="px-2 py-1 text-lg leading-none text-[#6b7280] hover:text-[#111827]" aria-label="Fechar">×</button>
        </div>

        <div className="flex min-h-0 flex-1">
          <nav className="w-[150px] shrink-0 border-r border-[#e5e7eb] bg-[#f8fafc] p-3">
            <p className="px-2 pb-2 text-[9px] font-semibold uppercase tracking-[.14em] text-[#9ca3af]">Conta</p>
            {sections.map((item) => <button key={item} type="button" onClick={() => setSection(item)} className={`mb-1 w-full rounded-md px-3 py-2.5 text-left text-xs transition ${section === item ? "bg-white font-semibold text-[#111827] shadow-sm" : "text-[#667085] hover:bg-white/80 hover:text-[#111827]"}`}>{item}</button>)}
          </nav>

          <div className="min-w-0 flex-1 overflow-y-auto p-5">
            {section === "Configurações gerais" && <div>
              <p className="text-sm font-semibold">Configurações gerais</p>
              <div className="mt-4 space-y-3 text-xs">
                <Info label="Nome" value={name} />
                <Info label="E-mail" value={email} />
                <Info label="Tipo de acesso" value={accessLabel} />
              </div>
            </div>}

            {section === "Meu plano" && <div>
              <p className="text-sm font-semibold">Meu plano</p>
              <div className="mt-4 rounded-xl border border-[#e5e7eb] bg-[#f8fafc] p-4">
                <p className="text-[10px] uppercase tracking-[.13em] text-[#9ca3af]">Plano atual</p>
                <p className="mt-2 text-lg font-semibold">{planLabel}</p>
              </div>
            </div>}

            {section === "Relatório da conta" && <div>
              <p className="text-sm font-semibold">Relatório da conta</p>
              <p className="mt-1 text-xs leading-5 text-[#6b7280]">Resumo de uso e informações da conta.</p>
              <div className="mt-4 space-y-3">
                <Info label="Status da sessão" value="Ativa" />
                <Info label="Acesso" value={accessLabel} />
                {usageRows.map((row) => <Info key={row.label} label={row.label} value={row.value} />)}
              </div>
            </div>}

            {section === "Exclusão de dados" && <div>
              <p className="text-sm font-semibold">Exclusão de dados</p>
              <p className="mt-2 text-xs leading-5 text-[#6b7280]">A exclusão permanente deve ser solicitada e confirmada antes de qualquer remoção de dados.</p>
              <button type="button" disabled className="mt-5 w-full rounded-md border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-700 opacity-70">Solicitar exclusão de dados</button>
            </div>}
          </div>
        </div>

        <div className="border-t border-[#e5e7eb] p-4">
          <button type="button" onClick={handleLogout} className="w-full rounded-md bg-[#202833] px-4 py-3 text-sm font-semibold text-white hover:bg-[#171e27]">Sair</button>
        </div>
      </aside>
    </div>}
  </>;
}

function Info({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-[#e5e7eb] bg-white px-3 py-3"><p className="text-[10px] uppercase tracking-[.12em] text-[#9ca3af]">{label}</p><p className="mt-1 break-words text-xs font-medium text-[#344054]">{value}</p></div>;
}
