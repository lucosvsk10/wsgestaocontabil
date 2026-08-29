import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  CircleDollarSign,
  CircleSlash2,
  Clock3,
  FileCheck2,
  FilePlus2,
  HelpCircle,
  Home,
  Package,
  Settings,
  ShoppingBag,
  Truck,
  Upload,
  UserRound,
  UsersRound,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const fieldClass = "!border-[#d9e0e8] !bg-white !text-[#0f1f3d] dark:!bg-white dark:!text-[#0f1f3d] placeholder:!text-[#9aa6b5]";

const navGroups = [
  {
    title: "CADASTROS",
    items: [
      { label: "Clientes", icon: UsersRound },
      { label: "Fornecedores", icon: ShoppingBag },
      { label: "Produtos", icon: Package },
      { label: "Serviços", icon: Wrench },
      { label: "Transportadoras", icon: Truck },
    ],
  },
  {
    title: "NOTAS DE PRODUTOS",
    items: [
      { label: "Emitir NF-e", icon: FileCheck2, doc: "NF-e" },
      { label: "Emitir NFC-e", icon: FileCheck2, doc: "NFC-e" },
      { label: "Emitir DF-e", icon: FileCheck2, doc: "DF-e" },
    ],
  },
  {
    title: "NOTAS DE SERVIÇOS",
    items: [{ label: "Emitir NFS-e", icon: FileCheck2, doc: "NFS-e" }],
  },
  {
    title: "NOTAS DE TRANSPORTES",
    items: [
      { label: "Emitir CT-e", icon: FileCheck2, doc: "CT-e" },
      { label: "Emitir MDF-e", icon: FileCheck2, doc: "MDF-e" },
    ],
  },
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

const SaasApp = () => {
  const { user } = useAuth();
  const [active, setActive] = useState("Início");
  const [organization, setOrganization] = useState<any>(null);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [filter, setFilter] = useState("Todas as notas");
  const [month, setMonth] = useState("Agosto de 2026");
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
    })();
  }, [user?.id]);

  const companyName = organization?.name || "Empresa Teste";

  const openEmission = (doc?: string) => {
    setSelectedDocument(doc || null);
    setActive("Emissão");
  };

  const handleLogo = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setLogoPreview(String(reader.result));
    reader.readAsDataURL(file);
  };

  const title = useMemo(() => selectedDocument ? `Emitir ${selectedDocument}` : active, [active, selectedDocument]);

  const EmptyChart = ({ title, type = "bars" }: { title: string; type?: "bars" | "lines" | "horizontal" }) => (
    <section className="rounded-2xl border border-[#e1e6ec] bg-white p-5 shadow-[0_1px_2px_rgba(15,31,61,0.02)]">
      <div className="flex items-center justify-between">
        <h3 className="text-[15px] font-semibold text-[#12213f]">{title}</h3>
        <HelpCircle className="h-4 w-4 text-[#74819a]" />
      </div>
      <div className="relative mt-6 h-[250px] overflow-hidden rounded-xl bg-[#fbfcfe] px-5 pb-5 pt-6">
        <div className="absolute inset-x-5 top-10 space-y-9">
          {[0, 1, 2, 3].map(i => <div key={i} className="border-t border-dashed border-[#e4e8ee]" />)}
        </div>
        {type === "bars" && (
          <div className="absolute inset-x-12 bottom-8 flex h-36 items-end justify-between gap-3 opacity-70">
            {[48, 35, 27, 41, 31, 22, 44, 62].map((h, i) => <div key={i} className="w-full rounded-t-md bg-[#dce9fa]" style={{ height: `${h}%` }} />)}
          </div>
        )}
        {type === "lines" && (
          <div className="absolute inset-x-12 top-16 h-24">
            <svg viewBox="0 0 500 110" className="h-full w-full opacity-60"><polyline fill="none" stroke="#8db5ec" strokeWidth="4" points="0,80 70,55 145,68 225,32 300,48 380,22 500,38" /><polyline fill="none" stroke="#f2a5a5" strokeWidth="3" points="0,96 75,88 160,92 235,78 315,83 395,70 500,75" /></svg>
          </div>
        )}
        {type === "horizontal" && (
          <div className="absolute inset-x-10 top-14 space-y-5 opacity-70">
            {[78, 64, 51, 42, 32].map((w, i) => <div key={i} className="flex items-center gap-4"><div className="h-2 w-20 rounded bg-[#e6ebf2]"/><div className="h-3 rounded bg-[#dce6f5]" style={{ width: `${w}%` }}/></div>)}
          </div>
        )}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-[#f0f4f9] text-[#8a98ad]"><span className="text-xl font-semibold">—</span></div>
          <p className="mt-3 text-sm font-medium text-[#536077]">Sem dados para exibir</p>
          <p className="mt-1 text-xs text-[#97a1af]">Emita notas para acompanhar estas informações.</p>
        </div>
      </div>
    </section>
  );

  const Dashboard = () => (
    <div>
      <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h1 className="text-[27px] font-semibold tracking-[-0.035em] text-[#101f3c]">Bom dia, {companyName}</h1>
          <p className="mt-2 text-sm text-[#68758c]">Veja o resumo da sua atividade fiscal e gerencie suas notas.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button onClick={() => setFilter(filter === "Todas as notas" ? "Notas aprovadas" : "Todas as notas")} className="flex h-11 items-center gap-2 rounded-xl border border-[#dce2ea] bg-white px-4 text-sm font-medium text-[#1c2944] shadow-sm">{filter}<ChevronDown className="h-4 w-4"/></button>
          <button onClick={() => setMonth(month === "Agosto de 2026" ? "Julho de 2026" : "Agosto de 2026")} className="flex h-11 items-center gap-2 rounded-xl border border-[#dce2ea] bg-white px-4 text-sm font-medium text-[#1c2944] shadow-sm"><CalendarDays className="h-4 w-4"/>{month}<ChevronDown className="h-4 w-4"/></button>
          <Button onClick={() => openEmission()} className="h-11 rounded-xl bg-[#0b5bd7] px-5 font-semibold text-white shadow-[0_8px_18px_rgba(11,91,215,0.18)] hover:bg-[#084db9]"><FilePlus2 className="mr-2 h-4 w-4"/>Emitir nova nota</Button>
        </div>
      </div>

      <div className="mt-8 grid gap-4 md:grid-cols-2 2xl:grid-cols-4">
        {kpis.map(item => {
          const tone = toneMap[item.tone];
          const Icon = item.icon;
          return <div key={item.label} className="relative min-h-[146px] overflow-hidden rounded-2xl border bg-white px-6 py-5 shadow-[0_2px_10px_rgba(16,31,60,0.025)]" style={{ borderColor: tone.border }}>
            <div className="absolute inset-y-0 left-0 w-1" style={{ backgroundColor: tone.accent }}/>
            <div className="absolute right-5 top-1/2 grid h-16 w-16 -translate-y-1/2 place-items-center rounded-full" style={{ backgroundColor: tone.pale }}><Icon className="h-8 w-8" style={{ color: tone.accent }}/></div>
            <p className="text-sm font-medium" style={{ color: tone.text }}>{item.label}</p>
            <p className="mt-4 text-2xl font-semibold tracking-[-0.03em] text-[#111f3a]">{item.value}</p>
            <p className="mt-5 max-w-[70%] text-xs font-medium" style={{ color: tone.text }}>{item.status}</p>
          </div>
        })}
      </div>

      <div className="mt-6 grid gap-5 xl:grid-cols-2">
        <EmptyChart title="Faturamento por modalidade" type="bars"/>
        <EmptyChart title="Notas aprovadas x notas canceladas" type="lines"/>
        <EmptyChart title="Notas emitidas por cliente" type="horizontal"/>
        <EmptyChart title="Produtos mais vendidos" type="horizontal"/>
      </div>
    </div>
  );

  const Emission = () => {
    const docs = ["NF-e", "NFC-e", "NFS-e", "CT-e", "MDF-e", "DF-e"];
    if (selectedDocument) return <div className="max-w-5xl"><button className="mb-5 text-sm font-semibold text-[#536077]" onClick={() => setSelectedDocument(null)}>Voltar</button><div className="rounded-2xl border border-[#e0e5ec] bg-white p-7"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#728099]">Nova emissão</p><h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-[#10203e]">{selectedDocument}</h1><p className="mt-2 text-sm text-[#69768b]">Este é o início do fluxo de emissão. Os campos reais serão conectados etapa por etapa.</p><div className="mt-7 grid gap-5 md:grid-cols-2"><div><label className="text-sm font-medium">Cliente / destinatário</label><Input className={`${fieldClass} mt-2 h-11`} placeholder="Buscar cliente"/></div><div><label className="text-sm font-medium">Produto / serviço</label><Input className={`${fieldClass} mt-2 h-11`} placeholder="Buscar item cadastrado"/></div></div></div></div>;
    return <div><div className="mb-7"><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#10203e]">Emitir nova nota</h1><p className="mt-2 text-sm text-[#69768b]">Escolha o documento fiscal que deseja emitir.</p></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{docs.map(doc => <button key={doc} onClick={() => setSelectedDocument(doc)} className="min-h-[150px] rounded-2xl border border-[#dfe5ec] bg-white p-6 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-[#9fc0ef] hover:shadow-md"><p className="text-2xl font-semibold tracking-[-0.03em] text-[#10203e]">{doc}</p><p className="mt-2 text-sm text-[#6d7a90]">Iniciar emissão de {doc}.</p><p className="mt-7 text-xs font-semibold uppercase tracking-[0.12em] text-[#2d6fca]">Emitir agora</p></button>)}</div></div>;
  };

  const GenericPage = ({ label }: { label: string }) => <div><h1 className="text-3xl font-semibold tracking-[-0.04em] text-[#10203e]">{label}</h1><p className="mt-2 text-sm text-[#6d7a90]">Estrutura criada. Esta área será conectada à funcionalidade real na próxima etapa.</p><div className="mt-7 min-h-[360px] rounded-2xl border border-[#e0e5ec] bg-white p-7"><p className="text-sm font-medium text-[#536077]">Nenhum registro ainda.</p></div></div>;

  return (
    <div className="min-h-screen bg-[#f6f8fb] text-[#10203e]">
      <header className="fixed inset-x-0 top-0 z-40 flex h-[74px] items-center border-b border-[#e2e7ee] bg-white px-7">
        <div className="flex w-[220px] items-center gap-3"><div className="text-4xl font-black italic tracking-[-0.09em] text-[#4d7fe0]">WS</div><span className="text-sm font-semibold text-[#1a2946]">Soluções Fiscais</span></div>
        <div className="ml-auto flex items-center gap-3"><button className="grid h-9 w-9 place-items-center rounded-full text-[#40516e] hover:bg-[#f2f5f9]"><Bell className="h-4 w-4"/></button><button className="grid h-9 w-9 place-items-center rounded-full text-[#40516e] hover:bg-[#f2f5f9]"><HelpCircle className="h-4 w-4"/></button><button className="flex items-center gap-2 rounded-full pl-1 pr-2 text-[#40516e]"><span className="grid h-9 w-9 place-items-center rounded-full bg-[#d9e3f4] text-sm font-semibold">WS</span><ChevronDown className="h-4 w-4"/></button></div>
      </header>

      <aside className="fixed bottom-0 left-0 top-[74px] z-30 w-[240px] overflow-y-auto border-r border-[#e2e7ee] bg-white px-4 pb-6 pt-5">
        <div className="rounded-2xl border border-dashed border-[#cfd7e2] bg-[#fbfcfe] p-4 text-center">
          <input ref={fileRef} type="file" accept="image/*" onChange={handleLogo} className="hidden"/>
          {logoPreview ? <img src={logoPreview} alt="Logomarca da empresa" className="mx-auto h-20 max-w-full object-contain"/> : <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl border border-[#d9e0e8] bg-white text-[#8794a8]"><Upload className="h-5 w-5"/></div>}
          <p className="mt-3 text-sm font-semibold text-[#21304d]">Sua logomarca</p>
          <p className="mt-1 text-xs text-[#8995a8]">Envie sua logo</p>
          <button onClick={() => fileRef.current?.click()} className="mt-3 rounded-lg border border-[#d8dfe8] bg-white px-3 py-1.5 text-xs font-semibold text-[#44536e] shadow-sm">Alterar</button>
        </div>

        <button onClick={() => { setActive("Início"); setSelectedDocument(null); }} className={`mt-5 flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-semibold ${active === "Início" ? "bg-[#eef4fd] text-[#145fc9]" : "text-[#4f5d73] hover:bg-[#f5f7fa]"}`}><Home className="h-4 w-4"/>Início</button>

        {navGroups.map(group => <div key={group.title} className="mt-5 border-t border-[#edf0f4] pt-4"><div className="flex items-center justify-between px-2"><p className="text-[10px] font-semibold tracking-[0.08em] text-[#6e7b90]">{group.title}</p><ChevronDown className="h-3.5 w-3.5 text-[#8290a4]"/></div><div className="mt-2 space-y-0.5">{group.items.map(item => { const Icon = item.icon; return <button key={item.label} onClick={() => item.doc ? openEmission(item.doc) : setActive(item.label)} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[13px] ${active === item.label ? "bg-[#f0f5fc] font-semibold text-[#145fc9]" : "text-[#5d687a] hover:bg-[#f7f8fa]"}`}><Icon className="h-4 w-4 text-[#75849a]"/>{item.label}</button>})}</div></div>)}

        <div className="mt-5 border-t border-[#edf0f4] pt-4 space-y-1"><button onClick={() => setActive("Relatórios")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#566275] hover:bg-[#f7f8fa]"><CircleDollarSign className="h-4 w-4"/>Relatórios</button><button onClick={() => setActive("Configurações")} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-medium text-[#566275] hover:bg-[#f7f8fa]"><Settings className="h-4 w-4"/>Configurações</button></div>
      </aside>

      <main className="ml-[240px] pt-[74px]">
        <div className="mx-auto max-w-[1500px] px-8 py-8">
          {active === "Início" && <Dashboard/>}
          {active === "Emissão" && <Emission/>}
          {active !== "Início" && active !== "Emissão" && <GenericPage label={title}/>} 
        </div>
      </main>
    </div>
  );
};

export default SaasApp;
