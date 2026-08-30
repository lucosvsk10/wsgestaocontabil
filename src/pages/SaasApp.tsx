import { useEffect, useState } from "react";
import { BarChart3, Boxes, Building2, FileInput, FileText, Home, Package2, ReceiptText, Settings2, ShoppingBag, Truck, UsersRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SaasCadastros, { CadastroSection } from "@/components/saas/SaasCadastros";
import SaasEmission from "@/components/saas/SaasEmission";
import SaasCompanyProfile from "@/components/saas/SaasCompanyProfile";
import SaasReports from "@/components/saas/SaasReports";
import SaasDashboard from "@/components/saas/SaasDashboard";
import SaasDfeManager from "@/components/saas/SaasDfeManager";
import SaasIssuedNotes from "@/components/saas/SaasIssuedNotes";
import SaasSetupGuide from "@/components/saas/SaasSetupGuide";
import AccountDrawer from "@/components/account/AccountDrawer";
import "@/styles/saas-admin-light.css";

const WS_LOGO = "/lovable-uploads/fecb5c37-c321-44e3-89ca-58de7e59e59d.png";
const cadastroSections = new Set(["Clientes", "Fornecedores", "Produtos", "Serviços", "Transportadoras"]);
const groups = [
  { title: "Notas de produtos", display: "Emitir produtos", icon: ReceiptText, items: [{label:"Emitir NF-e",icon:FileText},{label:"Emitir NFC-e",icon:FileInput},{label:"Gerenciar DF-e",icon:FileText}] },
  { title: "Notas de serviços", display: "Emitir serviços", icon: ShoppingBag, items: [{label:"Emitir NFS-e",icon:ReceiptText}] },
  { title: "Notas de transportes", display: "Emitir transportes", icon: Truck, items: [{label:"Emitir CT-e",icon:FileText},{label:"Emitir MDF-e",icon:FileText}] },
  { title: "Cadastros", display: "Cadastros", icon: Boxes, items: [{label:"Clientes",icon:UsersRound},{label:"Fornecedores",icon:Building2},{label:"Produtos",icon:Package2},{label:"Serviços",icon:ShoppingBag},{label:"Transportadoras",icon:Truck}] },
];
const lightVars: any = { "--background": "210 20% 98%", "--foreground": "222.2 84% 4.9%", "--card": "0 0% 100%", "--card-foreground": "222.2 84% 4.9%", "--popover": "0 0% 100%", "--popover-foreground": "222.2 84% 4.9%", "--primary": "222.2 47.4% 11.2%", "--primary-foreground": "210 40% 98%", "--secondary": "210 40% 96.1%", "--secondary-foreground": "222.2 47.4% 11.2%", "--muted": "210 28% 94%", "--muted-foreground": "215.4 16.3% 42%", "--accent": "210 40% 96.1%", "--accent-foreground": "222.2 47.4% 11.2%", "--border": "214 24% 84%", "--input": "214 24% 82%", "--ring": "222.2 84% 4.9%" };

export default function SaasApp() {
  const { user } = useAuth();
  const [active, setActive] = useState("Início");
  const [organization, setOrganization] = useState<any>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [certificateConfigured, setCertificateConfigured] = useState(false);
  const [setupDismissed, setSetupDismissed] = useState(false);
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
    setSetupDismissed(localStorage.getItem(`ws_fiscal_setup_dismissed_${org.id}`) === "1");

    await supabase.functions.invoke("saas-sales-history-sync", { body: { organization_id: org.id, mode: "auto" } }).catch(() => null);

    const [{ data: config }, { data: e }, { data: s }] = await Promise.all([
      supabase.functions.invoke("saas-fiscal-config", { body: { action: "get", organization_id: org.id } }),
      (supabase as any).from("saas_fiscal_emissions").select("*").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(800),
      (supabase as any).from("saas_subscriptions").select("status,saas_plans(name)").eq("organization_id", org.id).order("created_at", { ascending: false }).limit(1).maybeSingle(),
    ]);
    setEmissions(e || []);
    const p = config?.profile || null;
    setProfile(p);
    setCertificateConfigured(Boolean(config?.certificate_configured));
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
  const isGroupActive = (title: string) => groups.find((x) => x.title === title)?.items.some((x) => isItemActive(x.label)) || false;
  const setupComplete = Boolean(profile?.tax_id && profile?.legal_name && profile?.state_registration && profile?.city_ibge_code && profile?.tax_regime && profile?.crt && certificateConfigured);
  const showSetup = active === "Início" && Boolean(organization?.id) && !setupComplete && !setupDismissed;
  const dismissSetup = () => { if (organization?.id) localStorage.setItem(`ws_fiscal_setup_dismissed_${organization.id}`, "1"); setSetupDismissed(true); };

  let content: any;
  if (active === "Início") content = <SaasDashboard organizationName={organization?.name} emissions={emissions} onNew={() => { setSelectedDocument(null); setActive("Emissão"); }} onReports={() => setActive("Relatórios")} />;
  else if (cadastroSections.has(active)) content = <SaasCadastros organizationId={organization?.id || null} section={active as CadastroSection} />;
  else if (active === "Emissão") content = <SaasEmission organizationId={organization?.id || null} documentType={selectedDocument} onChoose={setSelectedDocument} />;
  else if (active === "Gerenciar DF-e") content = <SaasDfeManager />;
  else if (active === "Notas Emitidas") content = <SaasIssuedNotes emissions={emissions} onNew={() => { setSelectedDocument(null); setActive("Emissão"); }} />;
  else if (active === "Minha Empresa") content = <SaasCompanyProfile organizationId={organization?.id || null} organizationName={organization?.name} onLogoChanged={(url)=>{setLogoUrl(url);void loadOrg();}} />;
  else if (active === "Relatórios") content = <SaasReports organizationId={organization?.id || null} />;

  const accountNotifications = [
    ...(!setupComplete ? [{title:"Termine sua configuração fiscal",text:"Preencha os dados obrigatórios e adicione o certificado A1 antes de emitir em produção."}] : []),
    {title:"Primeiros passos",text:"Cadastre clientes, produtos ou serviços e faça a primeira emissão em ambiente de homologação."},
    {title:"Documentos emitidos",text:"A aba Notas Emitidas reúne o histórico de NF-e, NFC-e, NFS-e, CT-e e MDF-e."},
  ];

  return <div className="saas-admin-light min-h-screen bg-background text-foreground" style={lightVars}>
    <header className="saas-topbar fixed inset-x-0 top-0 z-[90] flex h-[72px] items-center border-b">
      <div className="flex h-full w-72 shrink-0 items-center justify-center border-r border-white/10 px-5"><img src={WS_LOGO} alt="WS Gestão Contábil" className="h-7 object-contain" /></div>
      <div className="flex min-w-0 flex-1 items-center px-6"><div className="flex-1"/><div className="min-w-0 flex-1 text-center"><p className="truncate text-sm font-medium text-white">{organization?.name || "Sua empresa"}</p><p className="mt-0.5 text-[10px] uppercase tracking-[.12em] text-white/55">Painel fiscal</p></div><div className="flex flex-1 justify-end"><AccountDrawer darkTrigger avatarUrl={logoUrl} accessLabel="Assinante do emissor fiscal" planLabel={planLabel} notifications={accountNotifications} usageRows={[{ label: "Notas emitidas", value: String(emissions.length) }, { label: "Organização", value: organization?.name || "Sua empresa" }]} /></div></div>
    </header>

    <aside className="fixed bottom-0 left-0 top-[72px] z-50 flex w-72 flex-col border-r border-border bg-white">
      <div className="border-b border-border px-5 py-4"><button onClick={() => setActive("Minha Empresa")} className="mx-auto flex h-[104px] w-full items-center justify-center bg-transparent px-4 transition-opacity hover:opacity-80">{logoUrl ? <img src={logoUrl} alt="Logo da empresa" className="max-h-[76px] max-w-[190px] object-contain" /> : <span className="text-center text-xs font-medium text-muted-foreground">Adicionar logomarca</span>}</button></div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <section><p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">Visão geral</p><NavButton icon={Home} active={active === "Início"} onClick={() => chooseNav("Início")}>Início</NavButton><NavButton icon={FileText} active={active === "Notas Emitidas"} onClick={() => chooseNav("Notas Emitidas")}>Notas Emitidas</NavButton></section>
        <div className="mt-5 space-y-5">{groups.map((group) => {const expanded=Boolean(openGroups[group.title]),groupActive=isGroupActive(group.title),emission=group.title.startsWith("Notas de "),GroupIcon=group.icon;return <section key={group.title}><p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">{group.title}</p><button onClick={() => setOpenGroups((p) => ({ ...p, [group.title]: !p[group.title] }))} className={`flex w-full items-center gap-3 rounded-md border-l-2 px-4 py-3 text-left transition-colors ${groupActive ? "border-[#202833] bg-[#e8edf3] text-[#111827]" : emission ? "saas-emission-group border-[#8794a5] bg-[#e9edf2] text-[#172033] hover:bg-[#e1e6ec]" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}><GroupIcon className="h-4 w-4 shrink-0" strokeWidth={1.8}/><span className={`flex-1 text-sm tracking-tight ${emission ? "font-semibold" : "font-medium"}`}>{group.display}</span><span className="text-xs text-muted-foreground">{expanded ? "−" : "+"}</span></button><div className={`ml-7 overflow-hidden border-l border-border pl-3 transition-all duration-200 ${expanded ? "mt-1 max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>{group.items.map((item) => {const ItemIcon=item.icon;return <button key={item.label} onClick={() => chooseNav(item.label)} className={`flex w-full items-center gap-2.5 rounded-sm px-3 py-2 text-left text-xs transition-colors ${isItemActive(item.label) ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}><ItemIcon className="h-3.5 w-3.5" strokeWidth={1.8}/><span>{item.label}</span></button>})}</div></section>})}</div>
        <section className="mt-5 border-t border-border pt-4"><p className="mb-2 px-4 text-[9px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90">Gestão</p><NavButton icon={BarChart3} active={active === "Relatórios"} onClick={() => chooseNav("Relatórios")}>Relatórios</NavButton><NavButton icon={Settings2} active={active === "Minha Empresa"} onClick={() => chooseNav("Minha Empresa")}>Minha Empresa</NavButton></section>
      </nav>
    </aside>

    <main className="saas-main-content min-h-screen bg-[#f3f5f7] pl-72 pt-[72px]"><div className="mx-auto w-full max-w-[1540px] px-4 py-5 sm:px-5 sm:py-6 lg:px-8">{content}</div></main>
    {showSetup && <SaasSetupGuide organizationId={organization.id} organizationName={organization?.name} profile={profile} certificateConfigured={certificateConfigured} emissionsCount={emissions.length} onOpenCompany={() => setActive("Minha Empresa")} onStartEmission={() => {setSelectedDocument(null);setActive("Emissão")}} onDismiss={dismissSetup}/>}
  </div>;
}

function NavButton({ icon:Icon, active, onClick, children }: { icon:any; active:boolean; onClick:()=>void; children:React.ReactNode }) { return <button onClick={onClick} className={`mb-1 flex w-full items-center gap-3 rounded-md border-l-2 px-4 py-2.5 text-left transition-colors ${active ? "border-[#202833] bg-muted text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/60 hover:text-foreground"}`}><Icon className="h-4 w-4" strokeWidth={1.8}/><span className="text-sm font-medium tracking-tight">{children}</span></button>; }
