import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const documentTypes = [
  { label: "NF-e", description: "Venda de produtos, circulação de mercadorias e operações fiscais." },
  { label: "NFC-e", description: "Venda direta ao consumidor final em operações de varejo." },
  { label: "NFS-e", description: "Prestação de serviços municipais e padrão nacional." },
  { label: "CT-e", description: "Prestação de serviço de transporte de cargas." },
  { label: "MDF-e", description: "Manifesto de documentos fiscais eletrônicos em transporte." },
  { label: "Outros documentos", description: "Acesse os demais modelos fiscais disponíveis para sua empresa." },
];

const nav = ["Visão geral", "Emitir documento", "Documentos", "Empresas"];

const SaasApp = () => {
  const [active, setActive] = useState("Visão geral");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const currentTitle = useMemo(() => selectedDocument ? `Emitir ${selectedDocument}` : active, [active, selectedDocument]);

  const goTo = (page: string) => { setSelectedDocument(null); setActive(page); setMobileOpen(false); };
  const startEmission = (label: string) => { setSelectedDocument(label); setActive("Emitir documento"); };

  const emissionCards = (compact = false) => (
    <div className={`grid gap-4 ${compact ? "md:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-3"}`}>
      {documentTypes.map((item) => (
        <button key={item.label} onClick={() => startEmission(item.label)} className="group min-h-[178px] rounded-2xl border border-[#d8dde3] bg-[#eaedf0] p-6 text-left transition-all hover:-translate-y-0.5 hover:border-[#bfc6ce] hover:bg-[#e4e8eb] hover:shadow-sm">
          <p className="text-2xl font-semibold tracking-[-0.03em] text-[#111827]">{item.label}</p>
          <p className="mt-3 max-w-sm text-sm leading-6 text-[#66707d]">{item.description}</p>
          <p className="mt-7 text-xs font-semibold uppercase tracking-[0.12em] text-[#4b5563]">Iniciar emissão</p>
        </button>
      ))}
    </div>
  );

  const renderOverview = () => (
    <div className="space-y-8">
      <section className="rounded-2xl border border-[#d8dde3] bg-[#eaedf0] p-7 md:p-9">
        <p className="text-sm text-[#68717d]">Olá,</p>
        <h2 className="mt-1 text-3xl font-semibold tracking-[-0.04em] md:text-4xl">Empresa Teste</h2>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[#66707d]">Seu ambiente fiscal está sendo preparado. Aqui você encontra somente o que importa para emitir e acompanhar documentos da empresa.</p>
        <div className="mt-7 grid gap-x-10 gap-y-5 border-t border-[#d5dae0] pt-6 sm:grid-cols-2 xl:grid-cols-4">
          <div><p className="text-xs text-[#7b8491]">CNPJ</p><p className="mt-1 text-sm font-medium">Não informado</p></div>
          <div><p className="text-xs text-[#7b8491]">Regime tributário</p><p className="mt-1 text-sm font-medium">Não informado</p></div>
          <div><p className="text-xs text-[#7b8491]">Certificado digital</p><p className="mt-1 text-sm font-medium">Pendente</p></div>
          <div><p className="text-xs text-[#7b8491]">Ambiente</p><p className="mt-1 text-sm font-medium">Configuração inicial</p></div>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4"><div><h3 className="text-xl font-semibold tracking-tight">Emitir documento</h3><p className="mt-1 text-sm text-[#6b7280]">Atalhos para os principais modelos fiscais.</p></div><button onClick={() => goTo("Emitir documento")} className="text-sm font-medium text-[#4b5563] hover:text-[#111827]">Ver todos</button></div>
        {emissionCards(true)}
      </section>
    </div>
  );

  const renderEmission = () => {
    if (!selectedDocument) return <div><div className="mb-6"><h2 className="text-2xl font-semibold tracking-[-0.03em]">Escolha o documento que deseja emitir</h2><p className="mt-2 text-sm text-[#6b7280]">O fluxo muda de acordo com o modelo fiscal selecionado.</p></div>{emissionCards()}</div>;
    return (
      <div className="max-w-5xl">
        <button onClick={() => setSelectedDocument(null)} className="mb-5 text-sm font-medium text-[#5f6875] hover:text-[#111827]">Voltar para tipos de documento</button>
        <div className="rounded-2xl border border-[#d8dde3] bg-[#eaedf0] p-7 md:p-9">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#77808b]">Nova emissão</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">{selectedDocument}</h2>
          <p className="mt-3 text-sm leading-6 text-[#66707d]">Este é o início do fluxo de emissão. Os campos fiscais específicos desse documento serão construídos na próxima etapa.</p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <label className="text-sm font-medium">Destinatário<Input placeholder="Nome ou razão social" className="mt-2 h-11 !border-[#cfd5dc] !bg-white !text-[#111827] dark:!bg-white dark:!text-[#111827]" /></label>
            <label className="text-sm font-medium">CPF ou CNPJ<Input placeholder="Documento" className="mt-2 h-11 !border-[#cfd5dc] !bg-white !text-[#111827] dark:!bg-white dark:!text-[#111827]" /></label>
          </div>
          <div className="mt-6 flex gap-3"><Button className="bg-[#111827] text-white hover:bg-[#202938]">Continuar</Button><Button variant="outline" onClick={() => setSelectedDocument(null)}>Cancelar</Button></div>
        </div>
      </div>
    );
  };

  const renderDocuments = () => (
    <div className="overflow-hidden rounded-2xl border border-[#d8dde3] bg-[#eaedf0]">
      <div className="flex flex-col gap-4 border-b border-[#d8dde3] p-5 md:flex-row md:items-center md:justify-between"><div><h2 className="text-lg font-semibold">Documentos fiscais</h2><p className="mt-1 text-sm text-[#6b7280]">Consulte emissões e acompanhe o status de cada documento.</p></div><Button onClick={() => goTo("Emitir documento")} className="bg-[#111827] text-white hover:bg-[#202938]">Nova emissão</Button></div>
      <div className="p-5"><Input placeholder="Buscar por número, cliente ou documento" className="h-11 max-w-lg !border-[#cfd5dc] !bg-white !text-[#111827] dark:!bg-white dark:!text-[#111827]" /><div className="mt-5 rounded-xl border border-dashed border-[#cbd1d8] p-14 text-center"><p className="text-sm font-medium">Nenhum documento emitido ainda.</p><p className="mt-1 text-xs text-[#7b8491]">Quando houver emissões, elas aparecerão aqui.</p></div></div>
    </div>
  );

  const renderCompanies = () => (
    <div className="max-w-5xl rounded-2xl border border-[#d8dde3] bg-[#eaedf0] p-7 md:p-9"><p className="text-xs font-semibold uppercase tracking-[0.12em] text-[#77808b]">Empresa ativa</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em]">Empresa Teste</h2><div className="mt-7 grid gap-6 border-t border-[#d5dae0] pt-6 md:grid-cols-2"><div><p className="text-xs text-[#7b8491]">Razão social</p><p className="mt-1 text-sm font-medium">Empresa Teste</p></div><div><p className="text-xs text-[#7b8491]">CNPJ</p><p className="mt-1 text-sm font-medium">Não informado</p></div><div><p className="text-xs text-[#7b8491]">Inscrição Estadual</p><p className="mt-1 text-sm font-medium">Não informada</p></div><div><p className="text-xs text-[#7b8491]">Regime tributário</p><p className="mt-1 text-sm font-medium">Não informado</p></div></div><Button onClick={() => goTo("Configurações")} className="mt-7 bg-[#111827] text-white hover:bg-[#202938]">Configurar empresa</Button></div>
  );

  const renderSettings = () => (
    <div className="max-w-5xl space-y-5">
      <div><h2 className="text-2xl font-semibold tracking-[-0.03em]">Configurações da empresa</h2><p className="mt-2 text-sm text-[#6b7280]">Cadastre as informações necessárias para habilitar a emissão fiscal.</p></div>
      <div className="rounded-2xl border border-[#d8dde3] bg-[#eaedf0] p-6 md:p-8">
        <h3 className="font-semibold">Dados cadastrais</h3>
        <div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-sm font-medium">Razão social<Input defaultValue="Empresa Teste" className="mt-2 h-11 !border-[#cfd5dc] !bg-white !text-[#111827] dark:!bg-white dark:!text-[#111827]" /></label><label className="text-sm font-medium">CNPJ<Input placeholder="00.000.000/0000-00" className="mt-2 h-11 !border-[#cfd5dc] !bg-white !text-[#111827] dark:!bg-white dark:!text-[#111827]" /></label><label className="text-sm font-medium">Inscrição Estadual<Input placeholder="Inscrição estadual" className="mt-2 h-11 !border-[#cfd5dc] !bg-white !text-[#111827] dark:!bg-white dark:!text-[#111827]" /></label><label className="text-sm font-medium">Regime tributário<select className="mt-2 h-11 w-full rounded-lg border border-[#cfd5dc] bg-white px-3 text-sm text-[#111827]"><option>Selecione</option><option>Simples Nacional</option><option>Lucro Presumido</option><option>Lucro Real</option></select></label></div>
        <div className="mt-7 border-t border-[#d5dae0] pt-6"><h3 className="font-semibold">Certificado digital</h3><p className="mt-2 text-sm text-[#6b7280]">Nenhum certificado vinculado a esta empresa.</p><Button variant="outline" className="mt-4">Adicionar certificado A1</Button></div>
        <div className="mt-7 flex items-center gap-3"><Button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2500); }} className="bg-[#111827] text-white hover:bg-[#202938]">Salvar alterações</Button>{saved && <span className="text-sm text-[#4b5563]">Alterações salvas.</span>}</div>
      </div>
    </div>
  );

  const renderContent = () => {
    if (active === "Emitir documento") return renderEmission();
    if (active === "Documentos") return renderDocuments();
    if (active === "Empresas") return renderCompanies();
    if (active === "Configurações") return renderSettings();
    return renderOverview();
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] text-[#111827]">
      <div className="flex min-h-screen">
        <aside className={`fixed inset-y-0 left-0 z-50 flex w-[268px] flex-col border-r border-[#dfe3e8] bg-[#eaedf0] transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full"}`}>
          <div className="relative flex h-20 shrink-0 items-center justify-center border-b border-[#d9dde2] px-5"><img src="/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" alt="WS Gestão Contábil" className="h-7 object-contain" /><button className="absolute right-4 text-sm text-[#6b7280] lg:hidden" onClick={() => setMobileOpen(false)}>Fechar</button></div>
          <div className="border-b border-[#d9dde2] px-5 py-4"><p className="truncate text-sm font-semibold">Empresa Teste</p><p className="mt-1 text-xs text-[#79818c]">Ambiente fiscal</p></div>
          <nav className="flex-1 px-3 py-4"><p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[#7b8491]">Navegação</p><div className="space-y-1">{nav.map((item) => <button key={item} onClick={() => goTo(item)} className={`flex w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${active === item && !selectedDocument ? "bg-[#d9dde2] text-[#111827]" : "text-[#5f6875] hover:bg-[#e1e5e9] hover:text-[#111827]"}`}>{item}</button>)}</div></nav>
          <div className="border-t border-[#d9dde2] p-3"><button onClick={() => goTo("Configurações")} className={`flex w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${active === "Configurações" ? "bg-[#d9dde2] text-[#111827]" : "text-[#5f6875] hover:bg-[#e1e5e9] hover:text-[#111827]"}`}>Configurações</button><button className="flex w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-[#5f6875] hover:bg-[#e1e5e9] hover:text-[#111827]">Ajuda</button></div>
        </aside>
        {mobileOpen && <button className="fixed inset-0 z-40 bg-black/20 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Fechar menu" />}
        <main className="min-w-0 flex-1">
          <header className="sticky top-0 z-30 flex h-20 items-center gap-4 border-b border-[#dfe3e8] bg-[#f3f4f6]/95 px-5 backdrop-blur md:px-8"><button className="text-sm font-medium text-[#4b5563] lg:hidden" onClick={() => setMobileOpen(true)}>Menu</button><div className="min-w-0 flex-1"><p className="text-xs font-medium text-[#7b8491]">WS / Emissão fiscal</p><h1 className="truncate text-lg font-semibold tracking-tight">{currentTitle}</h1></div><div className="hidden w-full max-w-sm md:block"><Input placeholder="Buscar documentos..." className="h-10 !border-[#cfd5dc] !bg-white !text-[#111827] dark:!bg-white dark:!text-[#111827] placeholder:!text-[#89919c]" /></div><button className="rounded-lg border border-[#d8dde3] bg-[#eaedf0] px-3.5 py-2 text-sm font-medium text-[#4b5563]">Conta</button></header>
          <div className="mx-auto max-w-[1440px] px-5 py-7 md:px-8 md:py-9">{renderContent()}</div>
        </main>
      </div>
    </div>
  );
};

export default SaasApp;
