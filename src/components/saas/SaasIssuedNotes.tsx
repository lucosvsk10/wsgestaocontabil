import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SaasDanfePreview,{printDanfe} from "./SaasDanfePreview";

type Props = { emissions: any[]; onNew: () => void };
type PreviewMode="danfe"|"receipt";
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const itemName=(x:any)=>x?.payload?.produto||x?.payload?.descricao||x?.payload?.proPred||x?.payload?.munDescargaNome||"Documento fiscal";
const typeLabel=(x:any)=>String(x?.document_type||"Documento").replace("nfe","NF-e").replace("nfce","NFC-e").replace("nfse","NFS-e").replace("cte","CT-e").replace("mdfe","MDF-e");
const downloadXml=(item:any)=>{if(!item?.xml)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([item.xml],{type:"application/xml"}));a.download=`${typeLabel(item)}-${item.number||"documento"}.xml`;a.click();URL.revokeObjectURL(a.href)};

export default function SaasIssuedNotes({ emissions, onNew }: Props) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("Todas");
  const [status, setStatus] = useState("Todos");
  const [origin,setOrigin]=useState("Todas");
  const [period,setPeriod]=useState("90");
  const [selected,setSelected]=useState<any>(null);
  const [previewMode,setPreviewMode]=useState<PreviewMode>("danfe");
  const [pageSize,setPageSize]=useState(10);
  const [page,setPage]=useState(1);

  const rows = useMemo(() => emissions.filter((item) => {
    const docType = String(item.document_type || "").toUpperCase();
    const matchesType = type === "Todas" || docType === type;
    const matchesStatus = status === "Todos" || String(item.status || "").toLowerCase() === status.toLowerCase();
    const matchesOrigin=origin==="Todas"||(origin==="imported"?item.source==="imported":item.source!=="imported");
    const date=new Date(item.external_issue_date||item.created_at||0).getTime();
    const matchesPeriod=period==="all"||date>=Date.now()-Number(period)*86400000;
    const text = [item.number,item.series,item.recipient_name,item.recipient_tax_id,item.access_key,item.document_type,item.source,item.external_source,itemName(item)].map((x) => String(x || "").toLowerCase()).join(" ");
    const matchesQuery = !query.trim() || text.includes(query.trim().toLowerCase());
    return matchesType && matchesStatus && matchesQuery && matchesOrigin && matchesPeriod;
  }), [emissions, query, type, status,origin,period]);
  const pages=Math.max(1,Math.ceil(rows.length/pageSize));
  const safePage=Math.min(page,pages);
  const visibleRows=rows.slice((safePage-1)*pageSize,safePage*pageSize);
  const resetPage=()=>setPage(1);

  return <div className="saas-issued-notes w-full space-y-6 text-[#111827]">
    <div className="relative pt-1">
      <div className="mx-auto max-w-3xl text-center">
        <p className="text-[10px] font-semibold uppercase tracking-[.18em] text-[#7b8492]">Emissão fiscal</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Notas Emitidas</h1>
        <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-[#667085]">Consulte, filtre, abra o DANFE, imprima e baixe os documentos emitidos ou extraídos.</p>
      </div>
      <Button onClick={onNew} className="mt-4 lg:absolute lg:right-0 lg:top-8 lg:mt-0">Emitir nova nota</Button>
    </div>

    <section className="overflow-hidden rounded-lg border border-[#c7cfd9] bg-white shadow-sm">
      <div className="border-b border-[#d6dce4] p-5 md:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_285px] xl:items-end">
          <div>
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-[.14em] text-[#7b8492]">Filtros</p>
            <div className="grid gap-3 md:grid-cols-[145px_minmax(260px,1fr)_180px_170px_155px]">
              <select value={type} onChange={e=>{setType(e.target.value);resetPage()}} className="h-10 rounded-md border border-[#cbd3dc] bg-white px-3 text-sm text-[#263652]"><option value="Todas">Tipos de notas</option><option value="NFE">NF-e</option><option value="NFCE">NFC-e</option><option value="NFSE">NFS-e</option><option value="CTE">CT-e</option><option value="MDFE">MDF-e</option></select>
              <Input value={query} onChange={(e) => {setQuery(e.target.value);resetPage()}} placeholder="Buscar por destinatário, produto, nº da nota..." />
              <select value={status} onChange={(e) => {setStatus(e.target.value);resetPage()}} className="h-10 rounded-md border border-[#cbd3dc] bg-white px-3 text-sm text-[#263652]"><option>Todos</option><option value="authorized">Autorizadas</option><option value="draft">Rascunhos</option><option value="validated">Em processamento</option><option value="rejected">Rejeitadas</option><option value="cancelled">Canceladas</option></select>
              <select value={origin} onChange={e=>{setOrigin(e.target.value);resetPage()}} className="h-10 rounded-md border border-[#cbd3dc] bg-white px-3 text-sm text-[#263652]"><option>Todas</option><option value="system">Emitidas aqui</option><option value="imported">Extraídas</option></select>
              <select value={period} onChange={e=>{setPeriod(e.target.value);resetPage()}} className="h-10 rounded-md border border-[#cbd3dc] bg-white px-3 text-sm text-[#263652]"><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Último ano</option><option value="all">Todo período</option></select>
            </div>
          </div>
          <div>
            <p className="mb-3 text-[9px] font-semibold uppercase tracking-[.14em] text-[#7b8492]">Visualização do documento</p>
            <div className="grid grid-cols-2 gap-2">
              <button type="button" onClick={()=>setPreviewMode("danfe")} className={`min-h-[48px] rounded-md border px-3 py-2 text-left ${previewMode==="danfe"?"border-[#202833] bg-[#202833] text-white":"border-[#cbd3dc] bg-white text-[#263652]"}`}><span className="block text-xs font-semibold">DANFE</span><span className="mt-0.5 block text-[9px] opacity-75">Padrão para imprimir</span></button>
              <button type="button" onClick={()=>setPreviewMode("receipt")} className={`min-h-[48px] rounded-md border px-3 py-2 text-left ${previewMode==="receipt"?"border-[#202833] bg-[#202833] text-white":"border-[#cbd3dc] bg-white text-[#263652]"}`}><span className="block text-xs font-semibold">Notinha</span><span className="mt-0.5 block text-[9px] opacity-75">Compacta · recibo</span></button>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#d6dce4] px-5 py-3 text-xs text-[#667085]"><span>{rows.length} documento{rows.length===1?"":"s"} encontrado{rows.length===1?"":"s"}</span><span>{rows.filter(x=>x.status==="authorized").length} autorizada(s) · {rows.filter(x=>x.status==="rejected").length} rejeitada(s) · {rows.filter(x=>x.source==="imported").length} extraída(s)</span></div>

      <div className="bg-white"><table className="w-full table-fixed text-left"><colgroup><col className="w-[8%]"/><col className="w-[9%]"/><col className="w-[18%]"/><col className="w-[18%]"/><col className="w-[14%]"/><col className="w-[11%]"/><col className="w-[10%]"/><col className="w-[12%]"/></colgroup><thead className="!bg-[#e2e7ec]"><tr className="border-b border-[#c6ced8]"><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Nº / série</th><th className="px-4 py-3">Destinatário</th><th className="px-4 py-3">Item / operação</th><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Origem</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3 text-right">Valor total</th></tr></thead>
        <tbody>{visibleRows.map((item,index)=><tr key={item.id||index} onClick={()=>setSelected(item)} className={`cursor-pointer border-b border-[#d8dee6] text-sm transition-colors hover:!bg-[#dce4ea] ${index%2===0?"!bg-white":"!bg-[#edf1f4]"}`}><td className="px-4 py-4 font-semibold">{typeLabel(item)}</td><td className="px-4 py-4"><span className="font-semibold">{item.number||"—"}</span><span className="ml-1 text-[10px] text-[#667085]">Série {item.series||"—"}</span></td><td className="px-4 py-4"><div className="truncate font-medium text-[#344054]">{item.recipient_name||"Sem destinatário"}</div><div className="mt-1 truncate text-[10px] text-[#7d8997]">{item.recipient_tax_id||"Documento não informado"}</div></td><td className="truncate px-4 py-4 text-[#475467]">{itemName(item)}</td><td className="px-4 py-4 text-[11px] text-[#667085]">{(item.external_issue_date||item.created_at)?new Date(item.external_issue_date||item.created_at).toLocaleString("pt-BR"):"—"}</td><td className="px-4 py-4"><Origin imported={item.source==="imported"} source={item.external_source}/></td><td className="px-4 py-4"><Status value={String(item.status||"draft")}/></td><td className="px-4 py-4 text-right"><div className="font-semibold">{money(Number(item.total||0))}</div><div className="mt-1 flex justify-end gap-2" onClick={e=>e.stopPropagation()}><button onClick={()=>setSelected(item)} className="text-[9px] font-semibold text-[#455468] underline underline-offset-2">Abrir</button>{item.xml&&<button onClick={()=>downloadXml(item)} className="text-[9px] font-semibold text-[#455468] underline underline-offset-2">XML</button>}</div></td></tr>)}{!visibleRows.length&&<tr><td colSpan={8} className="px-5 py-16 text-center text-sm text-[#98a2b3]">Nenhuma nota encontrada com os filtros atuais.</td></tr>}</tbody></table></div>

      <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#d6dce4] px-5 py-3 text-xs text-[#667085]"><div className="flex items-center gap-2"><span>Linhas por página</span><select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}} className="h-9 rounded-md border border-[#cbd3dc] bg-white px-2"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></div><span>{rows.length?`${(safePage-1)*pageSize+1}–${Math.min(safePage*pageSize,rows.length)} de ${rows.length}`:"0 de 0"}</span><div className="flex items-center gap-2"><button disabled={safePage<=1} onClick={()=>setPage(1)} className="min-w-8 rounded border border-[#cbd3dc] bg-white px-2 py-1.5 text-[#202833] disabled:opacity-30">«</button><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="min-w-8 rounded border border-[#cbd3dc] bg-white px-2 py-1.5 text-[#202833] disabled:opacity-30">‹</button><span className="min-w-8 rounded bg-[#202833] px-2 py-1.5 text-center font-semibold text-white">{safePage}</span><button disabled={safePage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="min-w-8 rounded border border-[#cbd3dc] bg-white px-2 py-1.5 text-[#202833] disabled:opacity-30">›</button><button disabled={safePage>=pages} onClick={()=>setPage(pages)} className="min-w-8 rounded border border-[#cbd3dc] bg-white px-2 py-1.5 text-[#202833] disabled:opacity-30">»</button></div></div>
    </section>

    {selected&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="max-h-[96vh] w-full max-w-5xl overflow-auto rounded-lg border border-[#c7cfd8] bg-[#edf1f4] shadow-2xl"><div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#cbd3dc] bg-white px-5 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7b8492]">{typeLabel(selected)} · Nº {selected.number||"—"} · Série {selected.series||"—"}</p><h3 className="mt-1 text-lg font-semibold">{previewMode==="receipt"?"Visualização em notinha":"Visualização do DANFE"}</h3></div><div className="flex flex-wrap gap-2"><button onClick={()=>setPreviewMode(previewMode==="danfe"?"receipt":"danfe")} className="rounded-md border border-[#aeb8c5] bg-white px-3 py-2 text-xs font-semibold text-[#202833]">{previewMode==="danfe"?"Ver notinha":"Ver DANFE"}</button><button onClick={()=>printDanfe(`issued-doc-${selected.id}`,`${typeLabel(selected)}-${selected.number}`)} className="rounded-md bg-[#202833] px-3 py-2 text-xs font-semibold text-white">Imprimir / salvar PDF</button>{selected.xml&&<button onClick={()=>downloadXml(selected)} className="rounded-md border border-[#aeb8c5] bg-white px-3 py-2 text-xs font-semibold text-[#202833]">Baixar XML</button>}<button onClick={()=>setSelected(null)} className="rounded-md border border-[#aeb8c5] bg-white px-3 py-2 text-xs font-semibold text-[#202833]">Fechar</button></div></div><div className="p-5"><SaasDanfePreview id={`issued-doc-${selected.id}`} documentType={typeLabel(selected)} environment={selected.environment||"homologation"} emission={selected} mode={previewMode}/></div></div></div>}
  </div>;
}

function Origin({ imported, source }: { imported: boolean; source?: string | null }) {return imported?<span className="inline-flex rounded border border-blue-300 bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-700">Extraída{source?` · ${source}`:""}</span>:<span className="inline-flex rounded border border-slate-300 bg-white px-2 py-1 text-[9px] font-semibold text-slate-700">Emitida aqui</span>}
function Status({ value }: { value: string }) {const normalized=value.toLowerCase();const labels:Record<string,string>={authorized:"Autorizada",draft:"Rascunho",validated:"Em processamento",rejected:"Rejeitada",cancelled:"Cancelada",error:"Erro"};const classes:Record<string,string>={authorized:"border-emerald-300 bg-emerald-50 text-emerald-700",draft:"border-slate-300 bg-white text-slate-600",validated:"border-amber-300 bg-amber-50 text-amber-700",rejected:"border-red-300 bg-red-50 text-red-700",cancelled:"border-zinc-300 bg-zinc-100 text-zinc-700",error:"border-red-300 bg-red-50 text-red-700"};return <span className={`inline-flex rounded border px-2 py-1 text-[9px] font-semibold ${classes[normalized]||classes.draft}`}>{labels[normalized]||value}</span>}
