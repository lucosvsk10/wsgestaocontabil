import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import SaasDanfePreview,{printDanfe} from "./SaasDanfePreview";

type Props = { emissions: any[]; onNew: () => void };
const money = (value: number) => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const types = ["Todas", "NF-E", "NFC-E", "NFS-E", "CT-E", "MDF-E"];
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

  return <div className="mx-auto w-full max-w-[1540px] space-y-5 text-[#111827]">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between"><div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#7b8492]">Emissão fiscal</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Notas Emitidas</h1><p className="mt-1 max-w-3xl text-sm leading-6 text-[#667085]">Consulte, filtre, abra o DANFE, imprima e baixe os documentos emitidos ou extraídos.</p></div><Button onClick={onNew}>Emitir nova nota</Button></div>

    <section className="rounded-lg border border-[#c5ccd6] bg-white shadow-sm">
      <div className="border-b border-[#d4dae2] p-5"><div className="flex flex-wrap items-center gap-2">{types.map((item) => <button key={item} type="button" onClick={() => setType(item)} className={`rounded-md px-3 py-2 text-xs font-medium transition ${type === item ? "bg-[#202833] text-white" : "border border-[#cbd3dc] bg-white text-[#4f5f73] hover:bg-[#edf1f4]"}`}>{item}</button>)}</div>
        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(280px,1fr)_190px_190px_170px]"><Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar número, série, destinatário, CNPJ/CPF, chave ou item..." /><select value={status} onChange={(e) => setStatus(e.target.value)} className="h-10 rounded-md border border-[#cbd3dc] bg-white px-3 text-sm text-[#111827]"><option>Todos</option><option value="authorized">Autorizadas</option><option value="draft">Rascunhos</option><option value="validated">Em processamento</option><option value="rejected">Rejeitadas</option><option value="cancelled">Canceladas</option></select><select value={origin} onChange={e=>setOrigin(e.target.value)} className="h-10 rounded-md border border-[#cbd3dc] bg-white px-3 text-sm"><option>Todas</option><option value="system">Emitidas aqui</option><option value="imported">Extraídas</option></select><select value={period} onChange={e=>setPeriod(e.target.value)} className="h-10 rounded-md border border-[#cbd3dc] bg-white px-3 text-sm"><option value="30">Últimos 30 dias</option><option value="90">Últimos 90 dias</option><option value="365">Último ano</option><option value="all">Todo período</option></select></div>
        <div className="mt-3 flex items-center justify-between text-xs text-[#667085]"><span>{rows.length} documento{rows.length===1?"":"s"} encontrado{rows.length===1?"":"s"}</span><span>{rows.filter(x=>x.status==="authorized").length} autorizada(s) · {rows.filter(x=>x.status==="rejected").length} rejeitada(s) · {rows.filter(x=>x.source==="imported").length} extraída(s)</span></div>
      </div>

      <div className="overflow-x-auto bg-white"><table className="w-full min-w-[1320px] text-left"><thead className="!bg-[#dce2e8]"><tr className="border-b border-[#bfc8d3]"><th className="px-4 py-3">Documento</th><th className="px-4 py-3">Nº / Série</th><th className="px-4 py-3">Destinatário</th><th className="px-4 py-3">Item / operação</th><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Origem</th><th className="px-4 py-3">Situação</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
          <tbody>{rows.map((item,index)=><tr key={item.id||index} onClick={()=>setSelected(item)} className={`cursor-pointer border-b border-[#d5dbe3] text-sm transition-colors hover:!bg-[#dfe6ec] ${index%2===0?"!bg-white":"!bg-[#e9eef2]"}`}><td className="px-4 py-4 font-semibold">{typeLabel(item)}</td><td className="px-4 py-4"><span className="font-semibold">{item.number||"—"}</span><span className="ml-2 text-xs text-[#667085]">Série {item.series||"—"}</span></td><td className="px-4 py-4"><div className="max-w-[230px] truncate font-medium text-[#344054]">{item.recipient_name||"Sem destinatário"}</div><div className="mt-1 text-[11px] text-[#7d8997]">{item.recipient_tax_id||"Documento não informado"}</div></td><td className="max-w-[230px] truncate px-4 py-4 text-[#475467]">{itemName(item)}</td><td className="px-4 py-4 text-xs text-[#667085]">{(item.external_issue_date||item.created_at)?new Date(item.external_issue_date||item.created_at).toLocaleString("pt-BR"):"—"}</td><td className="px-4 py-4"><Origin imported={item.source==="imported"} source={item.external_source}/></td><td className="px-4 py-4"><Status value={String(item.status||"draft")}/></td><td className="px-4 py-4 text-right font-semibold">{money(Number(item.total||0))}</td><td className="px-4 py-4"><div className="flex justify-end gap-2" onClick={e=>e.stopPropagation()}><button onClick={()=>setSelected(item)} className="rounded border border-[#aeb8c5] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#202833]">DANFE</button>{item.xml&&<button onClick={()=>downloadXml(item)} className="rounded border border-[#aeb8c5] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#202833]">XML</button>}</div></td></tr>)}{!rows.length&&<tr><td colSpan={9} className="px-5 py-16 text-center text-sm text-[#98a2b3]">Nenhuma nota encontrada com os filtros atuais.</td></tr>}</tbody></table></div>
    </section>

    {selected&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="max-h-[96vh] w-full max-w-5xl overflow-auto rounded-lg border border-[#c7cfd8] bg-[#edf1f4] shadow-2xl"><div className="sticky top-0 z-10 flex flex-wrap items-center justify-between gap-3 border-b border-[#cbd3dc] bg-white px-5 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7b8492]">{typeLabel(selected)} · Nº {selected.number||"—"} · Série {selected.series||"—"}</p><h3 className="mt-1 text-lg font-semibold">Visualização do DANFE</h3></div><div className="flex flex-wrap gap-2"><button onClick={()=>printDanfe(`issued-danfe-${selected.id}`,`${typeLabel(selected)}-${selected.number}`)} className="rounded-md bg-[#202833] px-3 py-2 text-xs font-semibold text-white">Imprimir / salvar PDF</button>{selected.xml&&<button onClick={()=>downloadXml(selected)} className="rounded-md border border-[#aeb8c5] bg-white px-3 py-2 text-xs font-semibold text-[#202833]">Baixar XML</button>}<button onClick={()=>setSelected(null)} className="rounded-md border border-[#aeb8c5] bg-white px-3 py-2 text-xs font-semibold text-[#202833]">Fechar</button></div></div><div className="p-5"><SaasDanfePreview id={`issued-danfe-${selected.id}`} documentType={typeLabel(selected)} environment={selected.environment||"homologation"} emission={selected}/></div></div></div>}
  </div>;
}

function Origin({ imported, source }: { imported: boolean; source?: string | null }) {return imported?<span className="inline-flex rounded border border-blue-300 bg-blue-50 px-2.5 py-1 text-[10px] font-semibold text-blue-700">Extraída{source?` · ${source}`:""}</span>:<span className="inline-flex rounded border border-slate-300 bg-white px-2.5 py-1 text-[10px] font-semibold text-slate-700">Emitida aqui</span>}
function Status({ value }: { value: string }) {const normalized=value.toLowerCase();const labels:Record<string,string>={authorized:"Autorizada",draft:"Rascunho",validated:"Em processamento",rejected:"Rejeitada",cancelled:"Cancelada",error:"Erro"};const classes:Record<string,string>={authorized:"border-emerald-300 bg-emerald-50 text-emerald-700",draft:"border-slate-300 bg-white text-slate-600",validated:"border-amber-300 bg-amber-50 text-amber-700",rejected:"border-red-300 bg-red-50 text-red-700",cancelled:"border-zinc-300 bg-zinc-100 text-zinc-700",error:"border-red-300 bg-red-50 text-red-700"};return <span className={`inline-flex rounded border px-2.5 py-1 text-[10px] font-semibold ${classes[normalized]||classes.draft}`}>{labels[normalized]||value}</span>}
