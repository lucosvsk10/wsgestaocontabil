import { useMemo, useState } from "react";
import { CalendarDays, Download, FileText, Search } from "lucide-react";
import SaasDanfePreview,{printDanfe} from "./SaasDanfePreview";

type Props={emissions:any[];onNew:()=>void};
type PreviewMode="danfe"|"receipt";

const MONTHS=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PAGE_SIZE=10;
const money=(value:number)=>Number(value||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const itemName=(x:any)=>x?.payload?.produto||x?.payload?.descricao||x?.payload?.proPred||x?.payload?.munDescargaNome||"Documento fiscal";
const typeLabel=(x:any)=>({nfe:"NF-e",nfce:"NFC-e",nfse:"NFS-e",cte:"CT-e",mdfe:"MDF-e"} as any)[String(x?.document_type||"").toLowerCase()]||String(x?.document_type||"Documento").toUpperCase();
const statusLabel=(s:string)=>({authorized:"Autorizada",draft:"Rascunho",validated:"Em andamento",rejected:"Rejeitada",cancelled:"Cancelada",error:"Erro"} as any)[String(s||"").toLowerCase()]||s;
const downloadXml=(item:any)=>{if(!item?.xml)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([item.xml],{type:"application/xml"}));a.download=`${typeLabel(item)}-${item.number||"documento"}.xml`;a.click();URL.revokeObjectURL(a.href)};

export default function SaasIssuedNotes({emissions,onNew}:Props){
 const now=new Date();
 const [year,setYear]=useState(now.getFullYear());
 const [month,setMonth]=useState<number|null>(now.getMonth());
 const [query,setQuery]=useState("");
 const [tab,setTab]=useState("Todas");
 const [selected,setSelected]=useState<any>(null);
 const [previewMode,setPreviewMode]=useState<PreviewMode>("danfe");
 const [page,setPage]=useState(1);

 const scoped=useMemo(()=>emissions.filter((x:any)=>{const d=new Date(x.external_issue_date||x.created_at||0);return d.getFullYear()===year&&(month===null||d.getMonth()===month)}),[emissions,year,month]);
 const authorized=scoped.filter(x=>x.status==="authorized"&&!x.cancelled_at);
 const cancelled=scoped.filter(x=>x.status==="cancelled"||Boolean(x.cancelled_at));
 const pending=scoped.filter(x=>x.status==="draft"||x.status==="validated");
 const revenue=authorized.reduce((sum:number,x:any)=>sum+Number(x.total||0),0);
 const typeCounts=useMemo(()=>["NF-e","NFC-e","NFS-e","CT-e","MDF-e"].map(name=>({name,count:scoped.filter(x=>typeLabel(x)===name).length})),[scoped]);
 const tabs=[
  {label:"Todas",count:scoped.length},
  {label:"Autorizadas",count:authorized.length},
  {label:"Rascunhos",count:scoped.filter(x=>x.status==="draft").length},
  {label:"Em andamento",count:scoped.filter(x=>x.status==="validated").length},
  {label:"Canceladas",count:cancelled.length},
  ...typeCounts,
 ];
 const rows=useMemo(()=>scoped.filter((item:any)=>{
  const q=query.trim().toLowerCase();
  const text=[item.number,item.series,item.recipient_name,item.recipient_tax_id,item.access_key,itemName(item),typeLabel(item),statusLabel(item.status)].map(v=>String(v||"").toLowerCase()).join(" ");
  const matchesQuery=!q||text.includes(q);
  const matchesTab=tab==="Todas"||(tab==="Autorizadas"&&item.status==="authorized")||(tab==="Rascunhos"&&item.status==="draft")||(tab==="Em andamento"&&item.status==="validated")||(tab==="Canceladas"&&(item.status==="cancelled"||Boolean(item.cancelled_at)))||typeLabel(item)===tab;
  return matchesQuery&&matchesTab;
 }),[scoped,query,tab]);
 const pages=Math.max(1,Math.ceil(rows.length/PAGE_SIZE));
 const safePage=Math.min(page,pages);
 const visibleRows=rows.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);
 const chooseTab=(v:string)=>{setTab(v);setPage(1)};
 const moveYear=(delta:number)=>{setYear(y=>y+delta);setPage(1)};
 const chooseMonth=(value:number|null)=>{setMonth(value);setPage(1)};
 const openPreview=(item:any)=>{setSelected(item);setPreviewMode("danfe")};

 return <div className="w-full space-y-3 text-[#0f172a]">
  <header className="flex flex-col gap-4 rounded-2xl bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,.05)] ring-1 ring-[#e7ebf0] lg:flex-row lg:items-center lg:justify-between">
   <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-[#64748b]">Emissão fiscal</p><h1 className="mt-1 text-2xl font-semibold tracking-tight text-[#0f172a]">Notas Emitidas</h1><p className="mt-1 text-sm text-[#64748b]">Consulte documentos, arquivos fiscais e valores emitidos.</p></div>
   <button onClick={onNew} className="h-10 rounded-lg border border-[#d9e0e8] bg-white px-4 text-sm font-semibold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]">Emitir nova nota</button>
  </header>

  <section className="rounded-2xl bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-1 ring-[#e7ebf0]">
   <div className="flex flex-wrap items-center gap-1.5">
    <button onClick={()=>moveYear(-1)} className="grid h-9 w-9 place-items-center rounded-lg text-[#64748b] hover:bg-[#f3f6f9]">‹</button>
    <span className="min-w-[64px] px-1 text-lg font-semibold text-[#0f172a]">{year}</span>
    <button onClick={()=>moveYear(1)} className="mr-3 grid h-9 w-9 place-items-center rounded-lg text-[#64748b] hover:bg-[#f3f6f9]">›</button>
    <button onClick={()=>chooseMonth(null)} className={`min-w-11 rounded-lg px-3 py-2 text-sm font-medium transition ${month===null?"bg-[#eef3f8] text-[#0f172a] shadow-sm":"text-[#475569] hover:bg-[#f5f7fa]"}`}>Ano</button>
    {MONTHS.map((m,i)=><button key={m} onClick={()=>chooseMonth(i)} className={`min-w-11 rounded-lg px-3 py-2 text-sm font-medium transition ${month===i?"bg-[#eef3f8] text-[#0f172a] shadow-sm":"text-[#475569] hover:bg-[#f5f7fa]"}`}>{m}</button>)}
    <button className="ml-auto inline-flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-[#475569] hover:bg-[#f5f7fa]"><CalendarDays className="h-4 w-4"/>Personalizado</button>
   </div>
  </section>

  <section className="grid gap-2 md:grid-cols-4">
   <Summary label="Total notas" value={String(scoped.length)}/>
   <Summary label="Autorizadas" value={String(authorized.length)}/>
   <Summary label="Canceladas" value={String(cancelled.length)}/>
   <Summary label="Faturamento" value={money(revenue)} detail={pending.length?`${pending.length} em andamento`:undefined}/>
  </section>

  <section className="overflow-hidden rounded-2xl bg-white shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-1 ring-[#e7ebf0]">
   <div className="flex flex-wrap items-center gap-2 px-4 py-3">
    {tabs.map(t=><button key={t.label} onClick={()=>chooseTab(t.label)} className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${tab===t.label?"bg-[#e7f4fb] text-[#0877a8]":"bg-[#f4f6f8] text-[#526173] hover:bg-[#edf1f5]"}`}>{t.label} <b>{t.count}</b></button>)}
   </div>

   <div className="flex items-center gap-2 px-4 pb-3">
    <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#94a3b8]"/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Buscar por número, chave, razão social, CNPJ, produto ou situação..." className="h-10 w-full rounded-lg border border-[#e1e7ee] bg-[#f8fafc] pl-10 pr-3 text-sm text-[#0f172a] outline-none placeholder:text-[#94a3b8] focus:border-[#8fc7df] focus:bg-white"/></div>
    <button className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-[#d9e0e8] bg-white px-4 text-xs font-semibold text-[#0f172a] shadow-sm hover:bg-[#f8fafc]"><Download className="h-4 w-4"/>Download</button>
   </div>

   <div className="overflow-x-auto">
    <table className="w-full min-w-[1050px] table-fixed text-left text-sm">
     <colgroup><col className="w-[13%]"/><col className="w-[23%]"/><col className="w-[24%]"/><col className="w-[22%]"/><col className="w-[10%]"/><col className="w-[8%]"/></colgroup>
     <thead className="border-y border-[#e7ebf0] bg-[#f8fafc] text-[10px] uppercase tracking-[.06em] text-[#64748b]"><tr><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Nota / Chave</th><th className="px-4 py-3">Destinatário / Emitente</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
     <tbody>{visibleRows.map((item:any,index:number)=>{const d=new Date(item.external_issue_date||item.created_at||0);return <tr key={item.id||index} onClick={()=>openPreview(item)} className={`cursor-pointer border-b border-[#edf0f3] transition-colors ${index%2===0?"bg-white":"bg-[#fbfcfd]"} hover:bg-[#f1f6fa]`}>
      <td className="px-4 py-3.5 align-middle"><div className="font-semibold text-[#0f172a]">{d.toLocaleDateString("pt-BR")}</div><div className="mt-0.5 text-[10px] text-[#64748b]">{d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div></td>
      <td className="px-4 py-3.5 align-middle"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold text-[#0f172a]">{item.number||"—"}</span><span className="text-[10px] text-[#64748b]">/ {item.series||"—"}</span><TypeBadge value={typeLabel(item)}/><Status value={String(item.status||"draft")}/></div><div className="mt-1 max-w-full truncate text-[9px] text-[#94a3b8]">{item.access_key||"Chave não informada"}</div></td>
      <td className="px-4 py-3.5 align-middle"><div className="truncate font-medium text-[#253349]">{item.recipient_name||"Sem destinatário"}</div><div className="mt-0.5 truncate text-[10px] text-[#64748b]">{item.recipient_tax_id||"Documento não informado"}</div></td>
      <td className="px-4 py-3.5 align-middle"><div className="truncate text-[#253349]">{itemName(item)}</div><div className="mt-0.5 text-[10px] text-[#64748b]">{item.source==="imported"?"Documento extraído":"Emitida pelo SaaS"}</div></td>
      <td className="px-4 py-3.5 text-right align-middle font-semibold text-[#0f172a]">{money(Number(item.total||0))}</td>
      <td className="px-4 py-3.5 align-middle" onClick={e=>e.stopPropagation()}><div className="flex justify-end gap-1"><button onClick={()=>openPreview(item)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-[#334155] hover:bg-[#eef3f8]"><FileText className="h-3.5 w-3.5"/>Visualizar</button>{item.xml&&<button onClick={()=>downloadXml(item)} className="rounded-lg px-2 py-1.5 text-[10px] font-semibold text-[#334155] hover:bg-[#eef3f8]">XML</button>}</div></td>
     </tr>})}{!visibleRows.length&&<tr><td colSpan={6} className="h-48 text-center text-sm text-[#94a3b8]">Nenhuma nota encontrada neste período.</td></tr>}</tbody>
    </table>
   </div>

   <div className="flex items-center justify-between border-t border-[#edf0f3] px-4 py-3 text-xs text-[#64748b]"><span>{rows.length?`${(safePage-1)*PAGE_SIZE+1}–${Math.min(safePage*PAGE_SIZE,rows.length)} de ${rows.length}`:"0 documento(s)"}</span><div className="flex items-center"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg px-3 py-2 hover:bg-[#f4f6f8] disabled:opacity-25">‹</button><span className="px-2">{safePage} / {pages}</span><button disabled={safePage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="rounded-lg px-3 py-2 hover:bg-[#f4f6f8] disabled:opacity-25">›</button></div></div>
  </section>

  {selected&&<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#d9e0e8]/55 p-6 backdrop-blur-[20px]" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="flex h-[min(900px,calc(100vh-48px))] w-[min(1160px,calc(100vw-48px))] flex-col overflow-hidden rounded-2xl border border-white bg-white shadow-[0_26px_80px_rgba(28,42,58,.20)]"><div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#e4e9ef] bg-white px-5 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#64748b]">{typeLabel(selected)} · Nº {selected.number||"—"} · Série {selected.series||"—"}</p><h3 className="mt-1 text-lg font-semibold text-[#0f172a]">{previewMode==="receipt"?"Visualização em notinha":"Visualização do DANFE"}</h3></div><div className="flex flex-wrap gap-2"><button onClick={()=>setPreviewMode(previewMode==="danfe"?"receipt":"danfe")} className="rounded-lg border border-[#d7dee6] bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]">{previewMode==="danfe"?"Ver notinha":"Ver DANFE"}</button><button onClick={()=>printDanfe(`issued-doc-${selected.id}`,`${typeLabel(selected)}-${selected.number}`)} className="rounded-lg bg-[#0099d8] px-3 py-2 text-xs font-semibold text-white">Imprimir / salvar PDF</button>{selected.xml&&<button onClick={()=>downloadXml(selected)} className="rounded-lg border border-[#d7dee6] bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]">Baixar XML</button>}<button onClick={()=>setSelected(null)} className="rounded-lg border border-[#d7dee6] bg-white px-3 py-2 text-xs font-semibold text-[#334155] hover:bg-[#f8fafc]">Fechar</button></div></div><div className="min-h-0 flex-1 overflow-auto bg-[#f6f8fa] p-6"><div className="mx-auto flex min-h-full w-full items-start justify-center"><SaasDanfePreview id={`issued-doc-${selected.id}`} documentType={typeLabel(selected)} environment={selected.environment||"homologation"} emission={selected} mode={previewMode}/></div></div></div></div>}
 </div>;
}

function Summary({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="min-h-[92px] rounded-2xl bg-white px-5 py-4 shadow-[0_1px_2px_rgba(15,23,42,.04)] ring-1 ring-[#e7ebf0]"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#64748b]">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-[#0f172a]">{value}</p>{detail&&<p className="mt-1 text-[10px] text-[#64748b]">{detail}</p>}</div>}
function TypeBadge({value}:{value:string}){return <span className="rounded-md bg-[#e8f4fa] px-2 py-1 text-[9px] font-semibold text-[#176d94]">{value}</span>}
function Status({value}:{value:string}){const n=value.toLowerCase();const labels:Record<string,string>={authorized:"Autorizada",draft:"Rascunho",validated:"Em andamento",rejected:"Rejeitada",cancelled:"Cancelada",error:"Erro"};const classes:Record<string,string>={authorized:"bg-[#e5f7ef] text-[#137456]",draft:"bg-[#eef2f6] text-[#526173]",validated:"bg-[#fff4db] text-[#94620d]",rejected:"bg-[#fde8e8] text-[#b42318]",cancelled:"bg-[#eef0f3] text-[#59636f]",error:"bg-[#fde8e8] text-[#b42318]"};return <span className={`rounded-md px-2 py-1 text-[9px] font-semibold ${classes[n]||classes.draft}`}>{labels[n]||value}</span>}
