import { ChangeEvent, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function SaasDfeManager() {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const filtered = useMemo(() => files.filter((file) => file.name.toLowerCase().includes(query.toLowerCase())), [files, query]);

  const pick = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files || []).filter((file) => file.name.toLowerCase().endsWith(".xml"));
    setFiles((current) => [...current, ...selected]);
    setMessage(selected.length ? `${selected.length} XML(s) selecionado(s) para importação.` : "Selecione arquivos XML válidos.");
    event.target.value = "";
  };

  const exportXml = () => {
    if (!files.length) { setMessage("Ainda não há XMLs importados nesta sessão para exportar."); return; }
    const manifest = files.map((file) => file.name).join("\n");
    const blob = new Blob([manifest], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "xmls-importados.txt";
    anchor.click();
    URL.revokeObjectURL(url);
    setMessage("Lista de XMLs exportada.");
  };

  return <div className="mx-auto w-full max-w-[1540px] space-y-5 text-[#111827]">
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#7b8492]">Notas de produtos</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Gerenciar DF-e</h1>
      <p className="mt-1 max-w-3xl text-sm leading-6 text-[#667085]">Central de importação e exportação de documentos fiscais eletrônicos recebidos.</p>
    </div>

    <div className="flex flex-wrap gap-2 rounded-xl border border-[#d8dee6] bg-white p-4 shadow-sm">
      <input ref={inputRef} type="file" accept=".xml,text/xml,application/xml" multiple className="hidden" onChange={pick} />
      <Button onClick={() => inputRef.current?.click()}>Importar XML</Button>
      <Button variant="outline" onClick={exportXml}>Exportar XML</Button>
    </div>

    <section className="overflow-hidden rounded-2xl border border-[#d8dee6] bg-white shadow-sm">
      <div className="border-b border-[#e2e7ed] px-6 py-6">
        <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#8a94a3]">Documentos fiscais eletrônicos</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">Importe notas recebidas</h2>
        <p className="mt-2 max-w-4xl text-sm leading-6 text-[#667085]">Importe notas fiscais recebidas dos seus fornecedores para manter o controle das compras e o histórico das operações dentro do emissor.</p>
        <Button className="mt-5" onClick={() => inputRef.current?.click()}>Importar notas de compra</Button>
      </div>

      <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1fr_.95fr]">
        <div>
          <h3 className="text-lg font-semibold">Importando notas fiscais de compras você vai conseguir:</h3>
          <div className="mt-4 space-y-3 text-sm leading-6 text-[#475467]">
            <p>Gerenciar as notas fiscais de entrada a partir dos arquivos XML de compra.</p>
            <p>Visualizar e imprimir o DANFE das notas importadas.</p>
            <p>Organizar e manter o histórico completo das notas de compra.</p>
            <p>Evitar lançamentos manuais e reduzir erros de digitação.</p>
          </div>
        </div>
        <div className="rounded-xl border border-[#e1e6ec] bg-[#f8fafc] p-5">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-sm font-semibold">XMLs nesta sessão</p><p className="mt-0.5 text-xs text-[#7b8492]">Arquivos selecionados para processamento</p></div>
            <span className="text-2xl font-semibold">{files.length}</span>
          </div>
          <Input className="mt-4" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar arquivo XML..." />
          <div className="mt-3 max-h-52 overflow-y-auto rounded-lg border border-[#e4e8ed] bg-white">
            {filtered.length ? filtered.map((file, index) => <div key={`${file.name}-${index}`} className="border-b border-[#edf0f3] px-3 py-2.5 text-xs text-[#475467] last:border-b-0">{file.name}</div>) : <p className="px-3 py-8 text-center text-xs text-[#98a2b3]">Nenhum XML selecionado.</p>}
          </div>
        </div>
      </div>
    </section>

    {message && <p className="text-xs text-[#667085]">{message}</p>}
  </div>;
}
