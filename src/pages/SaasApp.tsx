import { useMemo, useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  FileCheck2,
  FileClock,
  FilePlus2,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Menu,
  ReceiptText,
  Search,
  Settings,
  ShieldCheck,
  Truck,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const documentTypes = [
  { label: "NF-e", description: "Nota Fiscal Eletrônica", icon: ReceiptText },
  { label: "NFC-e", description: "Nota Fiscal de Consumidor", icon: FileText },
  { label: "NFS-e", description: "Nota Fiscal de Serviço", icon: FileCheck2 },
  { label: "CT-e", description: "Conhecimento de Transporte", icon: Truck },
  { label: "MDF-e", description: "Manifesto Eletrônico", icon: FileClock },
  { label: "Outros", description: "Demais documentos fiscais", icon: FilePlus2 },
];

const nav = [
  { label: "Visão geral", icon: LayoutDashboard },
  { label: "Emitir documento", icon: FilePlus2 },
  { label: "Documentos", icon: FileText },
  { label: "Empresas", icon: Building2 },
];

const SaasApp = () => {
  const [active, setActive] = useState("Visão geral");
  const [mobileOpen, setMobileOpen] = useState(false);
  const currentTitle = useMemo(() => active, [active]);

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#111827]">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-[#dfe3e8] bg-[#eaedf0] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="flex h-20 items-center justify-between border-b border-[#d9dde2] px-6">
            <img src="/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" alt="WS" className="h-7 object-contain" />
            <button className="text-[#6b7280] lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu"><X size={20} /></button>
          </div>

          <div className="p-4">
            <button className="flex w-full items-center justify-between rounded-xl border border-[#d6dbe1] bg-[#f7f8f9] px-3.5 py-3 text-left shadow-sm">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">Minha organização</p>
                <p className="mt-0.5 truncate text-xs text-[#6b7280]">Empresa principal</p>
              </div>
              <ChevronDown size={16} className="shrink-0 text-[#6b7280]" />
            </button>
          </div>

          <nav className="flex-1 px-3 py-2">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b8491]">Emissão fiscal</p>
            <div className="space-y-1">
              {nav.map((item) => {
                const Icon = item.icon;
                const selected = active === item.label;
                return (
                  <button key={item.label} onClick={() => { setActive(item.label); setMobileOpen(false); }} className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${selected ? "bg-[#d9dde2] text-[#111827]" : "text-[#5f6875] hover:bg-[#e1e5e9] hover:text-[#111827]"}`}>
                    <Icon size={18} strokeWidth={1.8} />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </nav>

          <div className="border-t border-[#d9dde2] p-3">
            {[{ label: "Configurações", icon: Settings }, { label: "Ajuda", icon: HelpCircle }].map((item) => (
              <button key={item.label} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[#5f6875] transition-colors hover:bg-[#e1e5e9] hover:text-[#111827]">
                <item.icon size={18} strokeWidth={1.8} />{item.label}
              </button>
            ))}
          </div>
        </aside>

        {mobileOpen && <button className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />}

        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-[#dfe3e8] bg-[#f3f4f6]/95 px-5 backdrop-blur md:px-8">
            <button className="text-[#4b5563] lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Abrir menu"><Menu size={22} /></button>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[#7b8491]">WS / Emissão fiscal</p>
              <h1 className="truncate text-lg font-semibold tracking-tight">{currentTitle}</h1>
            </div>
            <div className="hidden w-full max-w-sm md:block">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#89919c]" />
                <Input readOnly placeholder="Buscar documentos..." className="h-10 border-[#d8dde3] bg-[#eaedf0] pl-9 shadow-none placeholder:text-[#89919c]" />
              </div>
            </div>
            <button className="grid h-10 w-10 place-items-center rounded-lg border border-[#d8dde3] bg-[#eaedf0] text-[#5f6875]"><Bell size={18} /></button>
            <button className="grid h-10 w-10 place-items-center rounded-lg bg-[#111827] text-white"><UserRound size={18} /></button>
          </header>

          <div className="mx-auto max-w-[1440px] px-5 py-7 md:px-8 md:py-9">
            <section className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
              <div>
                <p className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-[#d8dde3] bg-[#eaedf0] px-2.5 py-1 text-xs font-medium text-[#5f6875]"><ShieldCheck size={13} /> Ambiente fiscal</p>
                <h2 className="text-2xl font-semibold tracking-[-0.03em] md:text-3xl">Tudo para emitir, acompanhar e organizar seus documentos.</h2>
                <p className="mt-2 max-w-2xl text-sm leading-6 text-[#6b7280]">Estrutura inicial do novo produto. Os módulos serão conectados às rotinas fiscais nas próximas etapas.</p>
              </div>
              <Button className="h-11 gap-2 rounded-lg bg-[#111827] px-5 text-white hover:bg-[#202938]"><FilePlus2 size={17} /> Nova emissão</Button>
            </section>

            <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[['Documentos hoje','0'],['Autorizados','0'],['Em processamento','0'],['Com pendência','0']].map(([label,value]) => (
                <div key={label} className="rounded-xl border border-[#dce1e6] bg-[#eaedf0] p-5">
                  <p className="text-sm text-[#6b7280]">{label}</p><p className="mt-3 text-2xl font-semibold tracking-tight">{value}</p>
                </div>
              ))}
            </section>

            <section className="mt-8">
              <div className="mb-4 flex items-center justify-between"><div><h3 className="text-lg font-semibold">Emitir documento</h3><p className="mt-1 text-sm text-[#6b7280]">Escolha o tipo de documento fiscal.</p></div></div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
                {documentTypes.map(({ label, description, icon: Icon }) => (
                  <button key={label} className="group rounded-xl border border-[#dce1e6] bg-[#eaedf0] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[#c8ced5] hover:bg-[#e5e8eb] hover:shadow-sm">
                    <div className="mb-6 grid h-9 w-9 place-items-center rounded-lg border border-[#d3d8de] bg-[#f3f4f6] text-[#374151]"><Icon size={18} /></div>
                    <p className="font-semibold">{label}</p><p className="mt-1 text-xs leading-5 text-[#6b7280]">{description}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="mt-8 grid gap-5 xl:grid-cols-[1.55fr_1fr]">
              <div className="overflow-hidden rounded-xl border border-[#dce1e6] bg-[#eaedf0]">
                <div className="flex items-center justify-between border-b border-[#dce1e6] px-5 py-4"><div><h3 className="font-semibold">Emissões recentes</h3><p className="mt-0.5 text-xs text-[#6b7280]">Últimos documentos movimentados</p></div><button className="text-sm font-medium text-[#4b5563]">Ver todos</button></div>
                <div className="grid min-h-56 place-items-center p-8 text-center"><div><div className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-[#f3f4f6] text-[#7b8491]"><FileText size={20} /></div><p className="mt-3 text-sm font-medium">Nenhuma emissão por enquanto</p><p className="mt-1 text-xs text-[#7b8491]">Seus documentos aparecerão aqui.</p></div></div>
              </div>
              <div className="rounded-xl border border-[#dce1e6] bg-[#eaedf0] p-5"><h3 className="font-semibold">Configuração da empresa</h3><p className="mt-1 text-xs leading-5 text-[#6b7280]">Acompanhe o que falta para começar a emitir.</p><div className="mt-5 space-y-3">{['Dados cadastrais','Certificado digital','Configuração fiscal'].map((item,index)=><div key={item} className="flex items-center gap-3 rounded-lg border border-[#d9dee4] bg-[#f0f2f4] px-3.5 py-3"><div className={`grid h-7 w-7 place-items-center rounded-full text-xs font-semibold ${index===0?'bg-[#d9dde2] text-[#374151]':'bg-[#e4e7ea] text-[#89919c]'}`}>{index+1}</div><span className="text-sm font-medium">{item}</span></div>)}</div></div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SaasApp;
