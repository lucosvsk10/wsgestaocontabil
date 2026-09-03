import { useMemo, useState } from "react";
import { CalendarDays, Download, FileText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import SaasDanfePreview,{printDanfe} from "./SaasDanfePreview";

type Props={emissions:any[];onNew:()=>void};
type PreviewMode="danfe"|"receipt";
const money=(value:number)=>value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const itemName=(x:any)=>x?.payload?.produto||x?.payload?.descricao||x?.payload?.proPred||x?.payload?.munDescargaNome||"Documento fiscal";
const typeLabel=(x:any)=>({nfe:"NF-e",nfce:"NFC-e",nfse:"NFS-e",cte:"CT-e",mdfe:"MDF-e"} as any)[String(x?.document_type||"").toLowerCase()]||String(x?.document_type||"Documento").toUpperCase();
const statusLabel=(s:string)=>({authorized:"Autorizada",draft:"Rascunho",validated:"Em processamento",rejected:"Rejeitada",cancelled:"Cancelada",error:"Erro"} as any)[String(s||"").toLowerCase()]||s;
const downloadXml=(item:any)=>{if(!item?.xml)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([item.xml],{type:"application/xml"}));a.download=`${typeLabel(item)}-${item.number||"documento"}.xml`;a.click();URL.revokeObjectURL(a.href)};
const months=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

export default function SaasIssuedNotes({emissions,onNew}:Props){
 const now=new Date();
 const [year,setYear]=useState(now.getFullYear());
 const [month,setMonth]=useState<number|null>(now.getMonth());
 const [query,setQuery]=useState("");
 const [tab,setTab]=useState("Todas");
 const [selected,setSelected]=useState<any>(null);
 const [previewMode,setPreviewMode]=useState<PreviewMode>("danfe");
 const [pageSize,setPageSize]=useState(10);
 const [page,setPage]=useState(1);

 const scoped=useMemo(()=>emissions.filter((x:any)=>{const d=new Date(x.external_issue_date||x.created_at||0);return d.getFullYear()===year&&(month===null||d.getMonth()===month)}),[emissions,year,month]);
 const authorized=scoped.filter(x=>x.status==="authorized"&&!x.cancelled_at);
 const pending=scoped.filter(x=>x.status==="draft"||x.status==="validated");
 const missingXml=authorized.filter(x=>!x.xml);
 const revenue=authorized.reduce((a:number,x:any)=>a+Number(x.total||0),0);
 const typeCounts=useMemo(()=>["NF-e","NFC-e","NFS-e","CT-e","MDF-e"].map(name=>({name,count:scoped.filter(x=>typeLabel(x)===name).length})),[scoped]);
 const tabs=[
  {label:"Todas",count:scoped.length},
  {label:"Autorizadas",count:authorized.length},
  {label:"Rascunhos",count:scoped.filter(x=>x.status==="draft").length},
  {label:"Em andamento",count:scoped.filter(x=>x.status==="validated").length},
  {label:"Canceladas",count:scoped.filter(x=>x.status==="cancelled").length},
  ...typeCounts,
 ];
 const rows=useMemo(()=>scoped.filter((item:any)=>{
  const q=query.trim().toLowerCase();
  const text=[item.number,item.series,item.recipient_name,item.recipient_tax_id,item.access_key,itemName(item),typeLabel(item),statusLabel(item.status)].map(v=>String(v||"").toLowerCase()).join(" ");
  const matchesQuery=!q||text.includes(q);
  const matchesTab=tab==="Todas"||(tab==="Autorizadas"&&item.status==="authorized")||(tab==="Rascunhos"&&item.status==="draft")||(tab==="Em andamento"&&item.status==="validated")||(tab==="Canceladas"&&item.status==="cancelled")||typeLabel(item)===tab;
  return matchesQuery&&matchesTab;
 }),[scoped,query,tab]);
 const pages=Math.max(1,Math.ceil(rows.length/pageSize));
 const safePage=Math.min(page,pages);
 const visibleRows=rows.slice((safePage-1)*pageSize,safePage*pageSize);
 const chooseTab=(v:string)=>{setTab(v);setPage(1)};
 const moveYear=(delta:number)=>{setYear(y=>y+delta);setPage(1)};
 const openPreview=(item:any)=>{setSelected(item);setPreviewMode("danfe")};

 return <div className="saas-issued-notes w-full space-y-4 text-[#111827]">
  <style>{`.saas-issued-notes>section:first-of-type{background:var(--ca-bg)!important;border-color:transparent!important;box-shadow:none!important}`}</style>
  <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between" style={{background:"transparent",boxShadow:"none",border:"none"}}>
   <div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#7b8492]">Emissão fiscal</p><h1 className="mt-1 text-[26px] font-semibold tracking-tight">Notas Emitidas</h1><p className="mt-1 text-sm text-[#667085]">Consulte documentos, arquivos fiscais e valores emitidos.</p></div>
   <Button onClick={onNew}>Emitir nova nota</Button>
  </div>

  <section className="rounded-md border border-[#d9dfe6] bg-white p-4 shadow-sm">
   <div className="flex flex-wrap items-center gap-2 text-sm">
    <button onClick={()=>moveYear(-1)} className="grid h-8 w-8 place-items-center rounded border border-transparent bg-transparent text-[#667085]">‹</button>
    <strong className="mr-3 text-lg">{year}</strong>
    <button onClick={()=>moveYear(1)} className="mr-4 grid h-8 w-8 place-items-center rounded border border-transparent bg-transparent text-[#667085]">›</button>
    <button onClick={()=>{setMonth(null);setPage(1)}} className={`h-9 rounded-md px-3 text-xs ${month===null?"bg-white shadow-sm ring-1 ring-[#cfd7e1]":"bg-transparent text-[#667085]"}`}>Ano</button>
    {months.map((m,i)=><button key={m} onClick={()=>{setMonth(i);setPage(1)}} className={`h-9 rounded-md px-3 text-xs ${month===i?"bg-white font-semibold text-[#111827] shadow-sm ring-1 ring-[#cfd7e1]":"bg-transparent text-[#667085] hover:bg-[#f4f6f8]"}`}>{m}</button>)}
    <div className="ml-auto flex h-9 items-center gap-2 rounded-md border border-[#d7dee6] bg-white px-3 text-xs text-[#344054]"><CalendarDays className="h-4 w-4"/>Personalizado</div>
   </div>
  </section>

  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
   <Summary label="Total de notas" value={String(scoped.length)}/>
   <Summary label="Autorizadas" value={String(authorized.length)} detail={scoped.length?`${Math.round(authorized.length/scoped.length*100)}% do período`:"0% do período"}/>
   <Summary label="Em andamento" value={String(pending.length)} detail="Rascunhos e processamentos"/>
   <Summary label="Faturamento" value={money(revenue)} detail={`${authorized.length} documento(s) autorizado(s)`}/>
  </div>

  {missingXml.length>0&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-[#eadfce] bg-[#fffaf2] px-4 py-3"><div><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-[#8a6a3a]">Recuperação automática</p><p className="mt-1 text-sm font-medium text-[#b46b00]">{missingXml.length} documento{missingXml.length===1?"":"s"} aguardando XML</p></div><span className="text-xs text-[#8a7559]">Os arquivos serão vinculados quando estiverem disponíveis.</span></div>}

  <section className="overflow-hidden rounded-md border border-[#d7dde5] bg-white shadow-sm">
   <div className="border-b border-[#dfe4ea] bg-[#fbfcfd] px-4 pt-3">
    <div className="flex flex-wrap items-center gap-1">{tabs.map(t=><button key={t.label} onClick={()=>chooseTab(t.label)} className={`h-9 rounded-t-md px-3 text-[11px] font-medium ${tab===t.label?"bg-[#152238] text-white":"bg-transparent text-[#667085] hover:bg-[#f0f3f6]"}`}>{t.label}<span className="ml-1 opacity-75">{t.count}</span></button>)}</div>
   </div>
   <div className="flex flex-col gap-3 border-b border-[#dfe4ea] p-4 lg:flex-row lg:items-center">
    <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]"/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Buscar por número, chave, razão social, CNPJ, produto ou situação..." className="h-10 w-full rounded-md border border-[#d7dde5] bg-[#f9fafb] pl-10 pr-3 text-sm outline-none focus:border-[#8aa4c3]"/></div>
    <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-[#152238] px-4 text-xs font-semibold text-white"><Download className="h-4 w-4"/>Download</button>
   </div>

   <div className="overflow-x-auto"><table className="w-full min-w-[1240px] text-left"><thead><tr className="border-b border-[#d8dee6] bg-[#eef1f4]"><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Arquivo</th><th className="px-4 py-3">Nota / chave</th><th className="px-4 py-3">Destinatário / emitente</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
    <tbody>{visibleRows.map((item:any,index:number)=>{const d=new Date(item.external_issue_date||item.created_at||0);return <tr key={item.id||index} onClick={()=>openPreview(item)} className={`cursor-pointer border-b border-[#e1e6ec] ${index%2===0?"bg-white":"bg-[#f1f4f6]"} hover:bg-[#e4eaf0]`}>
     <td className="px-4 py-3.5"><div className="font-semibold text-[#172033]">{d.toLocaleDateString("pt-BR")}</div><div className="mt-0.5 text-[10px] text-[#7b8794]">{d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div></td>
     <td className="px-4 py-3.5"><div className={`text-xs font-semibold ${item.xml?"text-emerald-600":"text-amber-600"}`}>{item.xml?"Completo":"Aguardando"}</div><div className="mt-0.5 text-[10px] text-[#7b8794]">{item.xml?"DANFE + XML":"DANFE disponível"}</div></td>
     <td className="min-w-[230px] px-4 py-3.5"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{item.number||"—"}</span><span className="text-[10px] text-[#7b8794]">/ {item.series||"—"}</span><span className="rounded bg-[#e7f2f7] px-2 py-1 text-[9px] font-semibold text-[#27708f]">{typeLabel(item)}</span><Status value={String(item.status||"draft")}/></div><div className="mt-1 max-w-[340px] break-all text-[9px] leading-4 text-[#98a2b3]">{item.access_key||"Chave não informada"}</div></td>
     <td className="min-w-[240px] px-4 py-3.5"><div className="font-medium leading-5 text-[#344054]">{item.recipient_name||"Sem destinatário"}</div><div className="mt-0.5 text-[10px] text-[#7b8794]">{item.recipient_tax_id||"Documento não informado"}</div></td>
     <td className="min-w-[210px] px-4 py-3.5"><div className="leading-5 text-[#344054]">{itemName(item)}</div><div className="mt-0.5 text-[10px] text-[#7b8794]">{item.source==="imported"?"Documento extraído":"Emitida pelo SaaS"}</div></td>
     <td className="px-4 py-3.5 text-right font-semibold">{money(Number(item.total||0))}</td>
     <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}><div className="flex justify-end gap-2"><button onClick={()=>openPreview(item)} className="inline-flex items-center gap-1 rounded border border-transparent bg-transparent px-2 py-1 text-xs font-semibold text-[#344054]"><FileText className="h-3.5 w-3.5"/>Visualizar</button>{item.xml&&<button onClick={()=>downloadXml(item)} className="rounded border border-[#d4dce5] bg-white px-2 py-1 text-[10px] font-semibold text-[#344054]">XML</button>}</div></td>
    </tr>})}{!visibleRows.length&&<tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-[#98a2b3]">Nenhuma nota encontrada neste período.</td></tr>}</tbody></table></div>

   <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[#dfe4ea] px-4 py-3 text-xs text-[#667085]"><div className="flex items-center gap-2"><span>Linhas por página</span><select value={pageSize} onChange={e=>{setPageSize(Number(e.target.value));setPage(1)}} className="h-8 rounded border border-[#d4dce5] bg-white px-2"><option value={10}>10</option><option value={20}>20</option><option value={50}>50</option></select></div><span>{rows.length?`${(safePage-1)*pageSize+1}–${Math.min(safePage*pageSize,rows.length)} de ${rows.length}`:"0 de 0"}</span><div className="flex gap-2"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="h-8 min-w-8 rounded border border-[#d4dce5] bg-white px-2 disabled:opacity-30">‹</button><span className="grid h-8 min-w-8 place-items-center rounded bg-[#152238] px-2 font-semibold text-white">{safePage}</span><button disabled={safePage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="h-8 min-w-8 rounded border border-[#d4dce5] bg-white px-2 disabled:opacity-30">›</button></div></div>
  </section>

  {selected&&<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#e7ebef]/30 p-6 backdrop-blur-[32px] backdrop-saturate-50" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="flex h-[min(900px,calc(100vh-48px))] w-[min(1160px,calc(100vw-48px))] flex-col overflow-hidden rounded-lg border border-white/90 bg-white/92 shadow-[0_26px_80px_rgba(28,42,58,.20)]"><div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#d5dce4] bg-white/95 px-5 py-3 backdrop-blur-md"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7b8492]">{typeLabel(selected)} · Nº {selected.number||"—"} · Série {selected.series||"—"}</p><h3 className="mt-1 text-lg font-semibold">{previewMode==="receipt"?"Visualização em notinha":"Visualização do DANFE"}</h3></div><div className="flex flex-wrap gap-2"><button onClick={()=>setPreviewMode(previewMode==="danfe"?"receipt":"danfe")} className="rounded-md border border-[#cbd3dc] bg-white px-3 py-2 text-xs font-semibold text-[#344054]">{previewMode==="danfe"?"Ver notinha":"Ver DANFE"}</button><button onClick={()=>printDanfe(`issued-doc-${selected.id}`,`${typeLabel(selected)}-${selected.number}`)} className="rounded-md bg-[#0099d8] px-3 py-2 text-xs font-semibold text-white">Imprimir / salvar PDF</button>{selected.xml&&<button onClick={()=>downloadXml(selected)} className="rounded-md border border-[#cbd3dc] bg-white px-3 py-2 text-xs font-semibold text-[#344054]">Baixar XML</button>}<button onClick={()=>setSelected(null)} className="rounded-md border border-[#cbd3dc] bg-white px-3 py-2 text-xs font-semibold text-[#344054]">Fechar</button></div></div><div className="min-h-0 flex-1 overflow-auto bg-white/35 p-6"><div className="mx-auto flex min-h-full w-full items-start justify-center"><SaasDanfePreview id={`issued-doc-${selected.id}`} documentType={typeLabel(selected)} environment={selected.environment||"homologation"} emission={selected} mode={previewMode}/></div></div></div></div>}
 </div>;
}

function Summary({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-md border border-[#d9dfe6] bg-white px-4 py-4 shadow-sm"><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-[#7b8492]">{label}</p><p className="mt-2 text-[22px] font-semibold tracking-tight text-[#101828]">{value}</p>{detail&&<p className="mt-1 text-[10px] text-[#7b8794]">{detail}</p>}</div>}
function Status({value}:{value:string}){const n=value.toLowerCase();const labels:Record<string,string>={authorized:"Autorizada",draft:"Rascunho",validated:"Em andamento",rejected:"Rejeitada",cancelled:"Cancelada",error:"Erro"};const classes:Record<string,string>={authorized:"bg-emerald-100 text-emerald-700",draft:"bg-slate-100 text-slate-600",validated:"bg-amber-100 text-amber-700",rejected:"bg-red-100 text-red-700",cancelled:"bg-zinc-200 text-zinc-700",error:"bg-red-100 text-red-700"};return <span className={`rounded px-2 py-1 text-[9px] font-semibold ${classes[n]||classes.draft}`}>{labels[n]||value}</span>}
