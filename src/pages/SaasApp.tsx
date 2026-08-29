import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown, CircleDollarSign, CircleSlash2, Clock3, FilePlus2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import SaasCadastros, { CadastroSection } from "@/components/saas/SaasCadastros";

const WS_LOGO = "/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png";
const fieldClass = "!border-[#d9e0e8] !bg-white !text-[#0f1f3d] dark:!bg-white dark:!text-[#0f1f3d] placeholder:!text-[#9aa6b5]";

const groups = [
  { title: "Cadastros", items: ["Clientes", "Fornecedores", "Produtos", "Serviços", "Transportadoras"] },
  { title: "Notas de produtos", items: ["Emitir NF-e", "Emitir NFC-e", "Emitir DF-e"] },
  { title: "Notas de serviços", items: ["Emitir NFS-e"] },
  { title: "Notas de transportes", items: ["Emitir CT-e", "Emitir MDF-e"] },
];

const kpis = [
  { label: "Notas aprovadas", value: "R$ 0,00", status: "Nenhuma nota aprovada", tone: "green", icon: Check },
  { label: "Notas pendentes", value: "R$ 0,00", status: "Nenhuma nota pendente", tone: "orange", icon: Clock3 },
  { label: "Notas canceladas", value: "R$ 0,00", status: "Nenhuma nota cancelada", tone: "red", icon: CircleSlash2 },
  { label: "Ticket médio", value: "R$ 0,00", status: "Nenhuma nota no período", tone: "blue", icon: CircleDollarSign },
] as const;

const toneMap = {
  green: { border: "#b9e8ca", accent: "#16a34a", pale: "#e9f8ef", text: "#13933f" },
  orange: { border: "#f6d7a8", accent: "#f59e0b", pale: "#fff4df", text: "#ea8c00" },
  red: { border: "#f4c8c8", accent: "#ef4444", pale: "#fdecec", text: "#e23b3b" },
  blue: { border: "#c3d7f4", accent: "#3b82f6", pale: "#eaf2ff", text: "#2d6fca" },
};

const cadastroSections = new Set(["Clientes", "Fornecedores", "Produtos", "Serviços", "Transportadoras"]);

const SaasApp = () => {
  const { user } = useAuth();
  const [active, setActive] = useState("Início");
  const [organization, setOrganization] = useState<any>(null);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [filter, setFilter] = useState("Todas as notas");
  const [month, setMonth] = useState("Agosto de 2026");
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("organization_members")
        .select("organization_id, organizations(id,name,slug)")
        .eq("user_id", user.id)
        .eq("status", "active")
        .limit(1)
        .maybeSingle();
      const org = data?.organizations || (data?.organization_id ? { id: data.organization_id, name: "Empresa Teste" } : null);
      setOrganization(org || { name: "Empresa Teste" });
      if (!org?.id) return;
      const { data: profile } = await (supabase as any).from("saas_company_fiscal_profiles").select("id,logo_path").eq("organization_id", org.id).limit(1).maybeSingle();
      if (profile?.id) setProfileId(profile.id);
      if (profile?.logo_path) {
        const { data: signed } = await supabase.storage.from("saas-private").createSignedUrl(profile.logo_path, 3600);
        setLogoUrl(signed?.signedUrl || null);
      }
    })();
  }, [user?.id]);

  const companyName = organization?.name || "Empresa Teste";

  const openEmission = (doc?: string) => {
    setSelectedDocument(doc || null);
    setActive("Emissão");
  };

  const chooseNav = (item: string) => {
    if (item.startsWith("Emitir ")) {
      openEmission(item.replace("Emitir ", ""));
      return;
    }
    setSelectedDocument(null);
    setActive(item);
  };

  const handleLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !organization?.id) return;
    const ext = file.name.split(".").pop()?.toLowerCase() || "png";
    const path = `${organization.id}/branding/company-logo-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage.from("saas-private").upload(path, file, { upsert: false, cacheControl: "3600" });
    if (uploadError) return;
    if (profileId) {
      await (supabase as any).from("saas_company_fiscal_profiles").update({ logo_path: path, updated_at: new Date().toISOString() }).eq("id", profileId);
    } else {
      const { data: inserted } = await (supabase as any).from("saas_company_fiscal_profiles").insert({ organization_id: organization.id, logo_path: path }).select("id").maybeSingle();
      if (inserted?.id) setProfileId(inserted.id);
    }
    const { data: signed } = await supabase.storage.from("saas-private").createSignedUrl(path, 3600);
    setLogoUrl(signed?.signedUrl || null);
    event.target.value = "";
  };

  const EmptyChart = ({ title, type = "bars" }: { title: string; type?: "bars" | "lines" | "horizontal" }) => (
    <section className="rounded-2xl border border-[#e1e6ec] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,61,0.02)]">
      <h3 className="text-[15px] font-semibold text-[#12213f]">{title}</h3>
      <div className="relative mt-6 h-[250px] overflow-hidden rounded-xl bg-[#fbfcfe] px-5 pb-5 pt-6">
        <div className="absolute inset-x-5 top-10 space-y-9">{[0,1,2,3].map(i=><div key={i} className="border-t border-dashed border-[#e4e8ee]"/>)}</div>
        {type === "bars" && <div className="absolute inset-x-12 bottom-8 flex h-36 items-end justify-between gap-3 opacity-70">{[48,35,27,41,31,22,44,62].map((h,i)=><div key={i} className="w-full rounded-t-md bg-[#dce9fa]" style={{height:`${h}%`}}/>)}</div>}
        {type === "lines" && <div className="absolute inset-x-12 top-16 h-24"><svg viewBox="0 0 500 110" className="h-full w-full opacity-60"><polyline fill="none" stroke="#8db5ec" strokeWidth="4" points="0,80 70,55 145,68 225,32 300,48 380,22 500,38"/><polyline fill="none" stroke="#f2a5a5" strokeWidth="3" points="0,96 75,88 160,92 235,78 315,83 395,70 500,75"/></svg></div>}
        {type === "horizontal" && <div className="absolute inset-x-10 top-14 space-y-5 opacity-70">{[78,64,51,42,32].map((w,i)=><div key={i} className="flex items-center gap-4"><div className="h-2 w-20 rounded bg-[#e6ebf2]"/><div className="h-3 rounded bg-[#dce6f5]" style={{width:`${w}%`}}/></div>)}</div>}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center"><p className="text-sm font-medium text-[#536077]">Sem dados para exibir</p><p className="mt-1 text-xs text-[#97a1af]">Emita notas para acompanhar estas informações.</p></div>
      </div>
    </section>
  );

  const Dashboard = () => <div>
    <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between"><div><h1 className="text-[27px] font-semibold tracking-[-0.035em] text-[#101f3c]">Bom dia, {companyName}</h1><p className="mt-2 text-sm text-[#68758c]">Veja o resumo da sua atividade fiscal e gerencie suas notas.</p></div><div className="flex flex-wrap items-center gap-3"><button onClick={()=>setFilter(filter === "Todas as notas" ? "Notas aprovadas" : "Todas as notas")} className="flex h-11 items-center gap-2 rounded-xl border border-[#dce2ea] bg-white px-4 text-sm font-medium text-[#1c2944] shadow-sm">{filter}<ChevronDown className="h-4 w-4"/></button><button onClick={()=>setMonth(month === "Agosto de 2026" ? "Julho de 2026" : "Agosto de 2026")} className="flex h-11 items-center gap-2 rounded-xl border border-[#dce2ea] bg-white px-4 text-sm font-medium text-[#1c2944] shadow-sm"><CalendarDays className="h-4 w-4"/>{month}<ChevronDown className="h-4 w-4"/></button><Button onClick={()=>openEmission()} className="h-11 rounded-xl bg-[#0b5bd7] px-5 font-semibold text-white shadow-[0_8px_18px_rgba(11,91,215,0.18)] hover:bg-[#084db9]"><FilePlus2 className="mr-2 h-4 w-4"/>Emitir nova nota</Button></div></div>
    <div className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">{kpis.map(item=>{const tone=toneMap[item.tone]; const Icon=item.icon; return <div key={item.label} className="relative min-h-[146px] overflow-hidden rounded-2xl border bg-white px-6 py-5 shadow-[0_2px_10px_rgba(16,31,60,0.025)]" style={{borderColor:tone.border}}><div className="absolute inset-y-0 left-0 w-1" style={{backgroundColor:tone.accent}}/><div className="absolute right-5 top-1/2 grid h-16 w-16 -translate-y-1/2 place-items-center rounded-full" style={{backgroundColor:tone.pale}}><Icon className="h-8 w-8" style={{color:tone.accent}}/></div><p className="text-sm font-medium" style={{color:tone.text}}>{item.label}</p><p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#111f3a]">{item.value}</p><p className="mt-5 max-w-[70%] text-xs font-medium" style={{color:tone.text}}>{item.status}</p></div>})}</div>
    <div className="mt-6 grid gap-5 xl:grid-cols-2"><EmptyChart title="Faturamento por modalidade" type="bars"/><EmptyChart title="Notas aprovadas x notas canceladas" type="lines"/><EmptyChart title="Notas emitidas por cliente" type="horizontal"/><EmptyChart title="Produtos mais vendidos" type="horizontal"/></div>
  </div>;

  const Emission = () => {
    const docs = ["NF-e","NFC-e","NFS-e","CT-e","MDF-e","DF-e"];
    if (selectedDocument) return <div className="max-w-5xl"><button className="mb-5 text-sm font-semibold text-[#536077]" onClick={()=>setSelectedDocument(null)}>Voltar</button><div className="rounded-2xl border border-[#e0e5ec] bg-white p-7"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#728099]">Nova emissão</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#10203e]">{selectedDocument}</h1><p className="mt-2 text-sm text-[#69768b]">O fluxo funcional desta emissão será a próxima etapa do desenvolvimento.</p><div className="mt-7 grid gap-5 md:grid-cols-2"><label className="text-sm font-medium">Cliente / destinatário<Input className={`${fieldClass} mt-2 h-11`} placeholder="Buscar cliente cadastrado"/></label><label className="text-sm font-medium">Produto / serviço<Input className={`${fieldClass} mt-2 h-11`} placeholder="Buscar item cadastrado"/></label></div></div></div>;
    return <div><div className="mb-7"><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#10203e]">Emitir nova nota</h1><p className="mt-2 text-sm text-[#69768b]">Escolha o documento fiscal que deseja emitir.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{docs.map(doc=><button key={doc} onClick={()=>setSelectedDocument(doc)} className="min-h-[150px] rounded-2xl border border-[#dfe5ec] bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#9fc0ef] hover:shadow-md"><p className="text-2xl font-semibold tracking-[-0.03em] text-[#10203e]">{doc}</p><p className="mt-2 text-sm text-[#6d7a90]">Iniciar emissão de {doc}.</p><p className="mt-7 text-xs font-semibold uppercase tracking-[0.12em] text-[#2d6fca]">Emitir agora</p></button>)}</div></div>;
  };

  const Generic = ({ title, description }: { title: string; description: string }) => <div><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#10203e]">{title}</h1><p className="mt-2 text-sm text-[#6d7a90]">{description}</p><div className="mt-7 min-h-[360px] rounded-2xl border border-[#e0e5ec] bg-white p-7"><p className="text-sm font-medium text-[#536077]">Esta área será desenvolvida na próxima etapa.</p></div></div>;

  const content = useMemo(() => {
    if (active === "Início") return Dashboard();
    if (cadastroSections.has(active)) return <SaasCadastros organizationId={organization?.id || null} section={active as CadastroSection}/>;
    if (active === "Emissão") return Emission();
    if (active === "Relatórios") return Generic({title:"Relatórios",description:"Indicadores, faturamento e análises das emissões."});
    if (active === "Configurações") return Generic({title:"Configurações",description:"Dados fiscais da empresa, certificado e preferências de emissão."});
    return Generic({title:active,description:"Área em preparação."});
  }, [active, organization?.id, selectedDocument, filter, month]);

  return <div className="min-h-screen bg-[#f6f8fb] text-[#10203e]">
    <header className="fixed inset-x-0 top-0 z-40 flex h-[82px] items-center border-b border-[#e2e7ee] bg-white px-7"><div className="flex w-[250px] items-center"><img src={WS_LOGO} alt="WS Assessoria Contábil" className="h-14 max-w-[230px] object-contain"/></div></header>
    <aside className="fixed bottom-0 left-0 top-[82px] z-30 w-[250px] overflow-y-auto border-r border-[#e3e7ed] bg-white">
      <div className="border-b border-[#edf0f4] p-4"><input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleLogo}/>{logoUrl ? <button onClick={()=>fileRef.current?.click()} className="flex h-[126px] w-full items-center justify-center overflow-hidden rounded-2xl bg-white"><img src={logoUrl} alt="Logomarca da empresa" className="max-h-full max-w-full object-contain"/></button> : <button onClick={()=>fileRef.current?.click()} className="flex h-[126px] w-full flex-col items-center justify-center rounded-2xl border border-dashed border-[#cfd7e2] bg-[#fbfcfe] text-center"><span className="text-sm font-semibold text-[#41516d]">Sua logomarca</span><span className="mt-1 text-xs text-[#8a96a8]">Clique para enviar</span></button>}</div>
      <nav className="p-3"><button onClick={()=>chooseNav("Início")} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold ${active === "Início" ? "bg-[#eaf2ff] text-[#1e63c6]" : "text-[#43526b] hover:bg-[#f5f7fa]"}`}>Início</button>
        <div className="mt-2 space-y-1">{groups.map(group=><div key={group.title}><button onClick={()=>setOpenGroups(prev=>({...prev,[group.title]:!prev[group.title]}))} className="flex w-full items-center justify-between rounded-xl px-4 py-3 text-left text-sm font-semibold text-[#273953] hover:bg-[#f5f7fa]"><span>{group.title}</span><span className="text-xs text-[#8793a4]">{openGroups[group.title] ? "−" : "+"}</span></button>{openGroups[group.title] && <div className="mb-2 ml-3 border-l border-[#e5e9ef] pl-2">{group.items.map(item=><button key={item} onClick={()=>chooseNav(item)} className={`block w-full rounded-lg px-3 py-2.5 text-left text-sm ${active === item || (item.startsWith("Emitir ") && selectedDocument === item.replace("Emitir ","")) ? "bg-[#eef4fd] font-semibold text-[#2468c7]" : "text-[#657289] hover:bg-[#f6f8fb] hover:text-[#273953]"}`}>{item}</button>)}</div>}</div>)}</div>
        <div className="mt-3 border-t border-[#edf0f4] pt-3"><button onClick={()=>chooseNav("Relatórios")} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold ${active === "Relatórios" ? "bg-[#eaf2ff] text-[#1e63c6]" : "text-[#43526b] hover:bg-[#f5f7fa]"}`}>Relatórios</button><button onClick={()=>chooseNav("Configurações")} className={`w-full rounded-xl px-4 py-3 text-left text-sm font-semibold ${active === "Configurações" ? "bg-[#eaf2ff] text-[#1e63c6]" : "text-[#43526b] hover:bg-[#f5f7fa]"}`}>Configurações</button></div>
      </nav>
    </aside>
    <main className="min-h-screen pl-[250px] pt-[82px]"><div className="mx-auto max-w-[1540px] p-7 xl:p-9">{content}</div></main>
  </div>;
};

export default SaasApp;
