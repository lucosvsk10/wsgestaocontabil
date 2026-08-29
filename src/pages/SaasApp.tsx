import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SaasCadastros, { CadastroSection } from "@/components/saas/SaasCadastros";
import SaasEmission from "@/components/saas/SaasEmission";
import SaasCompanyProfile from "@/components/saas/SaasCompanyProfile";
import SaasReports from "@/components/saas/SaasReports";
import SaasDashboard from "@/components/saas/SaasDashboard";
import SaasDfeManager from "@/components/saas/SaasDfeManager";
import SaasIssuedNotes from "@/components/saas/SaasIssuedNotes";
import AccountDrawer from "@/components/account/AccountDrawer";
import "@/styles/saas-admin-light.css";

const WS_LOGO = "/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png";
const cadastroSections = new Set(["Clientes", "Fornecedores", "Produtos", "Serviços", "Transportadoras"]);
const groups = [
  { title: "Cadastros", display: "Cadastros", items: ["Clientes", "Fornecedores", "Produtos", "Serviços", "Transportadoras"] },
  { title: "Notas de produtos", display: "Emitir produtos", items: ["Emitir NF-e", "Emitir NFC-e", "Gerenciar DF-e"] },
  { title: "Notas de serviços", display: "Emitir serviços", items: ["Emitir NFS-e"] },
  { title: "Notas de transportes", display: "Emitir transportes", items: ["Emitir CT-e", "Emitir MDF-e"] },
];
const lightVars: any = { "--background": "210 20% 98%", "--foreground": "222.2 84% 4.9%", "--card": "0 0% 100%", "--card-foreground": "222.2 84% 4.9%", "--popover": "0 0% 100%", "--popover-foreground": "222.2 84% 4.9%", "--primary": "222.2 47.4% 11.2%", "--primary-foreground": "210 40% 98%", "--secondary": "210 40% 96.1%", "--secondary-foreground": "222.2 47.4% 11.2%", "--muted": "210 28% 94%", "--muted-foreground": "215.4 16.3% 42%", "--accent": "210 40% 96.1%", "--accent-foreground": "222.2 47.4% 11.2%", "--border": "214 24% 84%", "--input": "214 24% 82%", "--ring": "222.2 84% 4.9%" };

export default function SaasApp() {
  const { user } = useAuth();
  const [active, setActive] = useState("Início");
  const [organization, setOrganization] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const [emissions, setEmissions] = useState<any[]>([]);
  const [planLabel, setPlanLabel] = useState("Plano fiscal");

  const loadOrg = async () => {
    if (!user) return;
    const { data } = await (supabase as any).from("organization_members").select("organization_id, organizations(id,name,slug)").eq("user_id", user.id).eq("status", "active").limit(1).maybeSingle();
    const org = data?.organizations || (data?.organization_id ? { id: data.organization_id, name: "Empresa Teste" } : null);
    setOrganization(org || { name: "Empresa Teste" });
    if (!org?.id) return;
    const [{ data: p }, { data: e }, { data: s }] = await Promise.all([
      (supabase as any).from("saas_company_fiscal_profiles").select("logo_path,trade_name,legal_name").eq("organization_id", org.id).order("created_at").limit(1).maybeSingle(),
      (supabase as any).from("saas_fiscal_emissions").select("*").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(800),
      (supabase as any).from("saas_subscriptions").select("status,saas_plans(name)").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setEmissions(e || []);
    if (p?.trade_name || p?.legal_name) setOrganization((x: any) => ({ ...x, name: p.trade_name || p.legal_name }));
    if (p?.logo_path) {
      const { data: signed } = await supabase.storage.from("saas-private").createSignedUrl(p.logo_path, 3600);
      setLogoUrl(signed?.signedUrl || null);
    }
    if (s?.saas_plans?.name) setPlanLabel(s.saas_plans.name);
  };

  useEffect(() => { void loadOrg(); }, [user?.id]);

  const chooseNav = (item: string) => {
    if (item === "Gerenciar DF-e") { setSelectedDocument(null); setActive("Gerenciar DF-e"); return; }
    if (item.startsWith("Emitir ")) { setSelectedDocument(item.replace("Emitir ", "")); setActive("Emissão"); return; }
    setSelectedDocument(null);
    setActive(item);
  };

  const isItemActive = (label: string) => label === "Gerenciar DF-e" ? active === "Gerenciar DF-e" : label.startsWith("Emitir ") ? active === "Emissão" && selectedDocument === label.replace("Emitir ", "") : active === label;
  const isGroupActive = (title: string) => groups.find((x) => x.title === title)?.items.some((x) => isItemActive(x)) || false;

  let content: any;
  if (active === "Início") content = <SaasDashboard organizationName={organization?.name} emissions={emissions} onNew={() => { setSelectedDocument(null); setActive("Emissão"); }} onReports={() => setActive("Relatórios")} />;
  else if (cadastroSections.has(active)) content = <SaasCadastros organizationId={organization?.id || null} section={active as CadastroSection} />;
  else if (active === "Emissão") content = <SaasEmission organizationId={organization?.id || null} documentType={selectedDocument} onChoose={setSelectedDocument} />;
  else if (active === "Gerenciar DF-e") content = <SaasDfeManager />;
  else if (active === "Notas Emitidas") content = <SaasIssuedNotes emissions={emissions} onNew={() => { setSelectedDocument(null); setActive("Emissão"); }} />;
  else if (active === "Minha Empresa") content = <SaasCompanyProfile organizationId={organization?.id || null} organizationName={organization?.name} onLogoChanged={setLogoUrl} />;
  else if (active === "Relatórios") content = <SaasReports organizationId={organization?.id || null} />;

  return <div className="saas-admin-light min-h-screen bg-background text-foreground" style={lightVars}>
    <header className="saas-topbar fixed inset-x-0 top-0 z-[90] flex h-20 items-center border-b">
      <div className="flex h-full w-72 shrink-0 items-center justify-center border-r border-white/10 px-5">
        <img src={WS_LOGO} alt="WS Gestão Contábil" className="h-7 object-contain" />
      </div>
      <div className="flex min-w-0 flex-1 items-center px-6">
        <div className="flex-1" />
        <div className="min-w-0 flex-1 text-center">
          <p className="truncate text-sm font-medium text-white">{organization?.name || "Sua empresa"}</p>
          <p className="mt-0.5 text-[10px] uppercase tracking-[.12em] text-white/55">Painel fiscal</p>
        </div>
        <div className="flex flex-1 justify-end">
          <AccountDrawer darkTrigger accessLabel="Assinante do emissor fiscal" planLabel={planLabel} usageRows={[{ label: "Notas emitidas", value: String(emissions.length) }, { label: "Organização", value: organization?.name || "Sua empresa" }]} />
        </div>
      </div>
    </header>

    <aside className="fixed bottom-0 left-0 top-20 z-50 flex w-72 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-5 py-5">
        <button onClick={() => setActive("Minha Empresa")} className="flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl border border-border bg-[#f7f8fa] p-6 transition hover:bg-[#f1f3f6]">
          {logoUrl ? <img src={logoUrl} alt="Logo da empresa" className="max-h-full max-w-full object-contain" /> : <span className="text-center text-xs font-medium text-muted-foreground">Adicionar logomarca</span>}
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <section>
          <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">Visão geral</p>
          <NavButton active={active === "Início"} onClick={() => chooseNav("Início")}>Início</NavButton>
          <NavButton active={active === "Notas Emitidas"} onClick={() => chooseNav("Notas Emitidas")}>Notas Emitidas</NavButton>
        </section>

        <div className="mt-5 space-y-5">
          {groups.map((group) => {
            const expanded = Boolean(openGroups[group.title]);
            const groupActive = isGroupActive(group.title);
            const emission = group.title.startsWith("Notas de ");
            return <section key={group.title}>
              <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">{group.title}</p>
              <button onClick={() => setOpenGroups((p) => ({ ...p, [group.title]: !p[group.title] }))} className={`flex w-full items-center justify-between rounded-md border-l-2 px-4 py-3 text-left transition-colors ${groupActive ? "border-[#202833] bg-[#e8edf3] text-[#111827]" : emission ? "saas-emission-group border-[#8794a5] bg-[#e9edf2] text-[#172033] hover:bg-[#e1e6ec]" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>
                <span className={`text-sm tracking-tight ${emission ? "font-semibold" : "font-medium"}`}>{group.display}</span>
                <span className="text-xs text-muted-foreground">{expanded ? "−" : "+"}</span>
              </button>
              <div className={`ml-5 overflow-hidden border-l border-border pl-3 transition-all duration-200 ${expanded ? "mt-1 max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
                {group.items.map((item) => <button key={item} onClick={() => chooseNav(item)} className={`block w-full rounded-sm px-3 py-2 text-left text-xs transition-colors ${isItemActive(item) ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}>{item}</button>)}
              </div>
            </section>;
          })}
        </div>

        <section className="mt-5 border-t border-border pt-4">
          <p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">Gestão</p>
          <NavButton active={active === "Relatórios"} onClick={() => chooseNav("Relatórios")}>Relatórios</NavButton>
          <NavButton active={active === "Minha Empresa"} onClick={() => chooseNav("Minha Empresa")}>Minha Empresa</NavButton>
        </section>
      </nav>
    </aside>

    <main className="min-h-screen bg-[#f3f5f7] pl-72 pt-20">
      <div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8">{content}</div>
    </main>
  </div>;
}

function NavButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button onClick={onClick} className={`mb-1 flex w-full items-center rounded-md border-l-2 px-4 py-2.5 text-left transition-colors ${active ? "border-[#202833] bg-muted text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}><span className="text-sm font-medium tracking-tight">{children}</span></button>;
}
