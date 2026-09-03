import { useMemo, useState } from "react";
import { CalendarDays, Download, FileText, Search } from "lucide-react";
import SaasDanfePreview,{printDanfe} from "./SaasDanfePreview";

type Props={emissions:any[];onNew:()=>void};
type PreviewMode="danfe"|"receipt";

const MONTHS=["Ano","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"] as const;
const MONTH_INDEX:Record<string,number>={Jan:0,Fev:1,Mar:2,Abr:3,Mai:4,Jun:5,Jul:6,Ago:7,Set:8,Out:9,Nov:10,Dez:11};
const TYPES=["NF-e","NFC-e","NFS-e","CT-e","MDF-e"] as const;
const PAGE_SIZE=50;
const money=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const typeLabel=(x:any)=>({nfe:"NF-e",nfce:"NFC-e",nfse:"NFS-e",cte:"CT-e",mdfe:"MDF-e"} as any)[String(x?.document_type||"").toLowerCase()]||String(x?.document_type||"Documento").toUpperCase();
const statusLabel=(s:string)=>({authorized:"Autorizada",draft:"Rascunho",validated:"Em andamento",rejected:"Rejeitada",cancelled:"Cancelada",error:"Erro"} as any)[String(s||"").toLowerCase()]||s;
const itemName=(x:any)=>x?.payload?.produto||x?.payload?.descricao||x?.payload?.proPred||x?.payload?.munDescargaNome||"Documento fiscal";
const downloadXml=(item:any)=>{if(!item?.xml)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([item.xml],{type:"application/xml"}));a.download=`${typeLabel(item)}-${item.number||"documento"}.xml`;a.click();URL.revokeObjectURL(a.href)};

export default function SaasIssuedNotes({emissions,onNew}:Props){
 const now=new Date(),currentYear=now.getFullYear(),currentMonth=now.getMonth();
 const [year,setYear]=useState(currentYear);
 const [month,setMonth]=useState<(typeof MONTHS)[number]>(MONTHS[currentMonth+1]);
 const [typeFilter,setTypeFilter]=useState<string>("");
 const [query,setQuery]=useState("");
 const [page,setPage]=useState(1);
 const [selected,setSelected]=useState<any>(null);
 const [previewMode,setPreviewMode]=useState<PreviewMode>("danfe");

 const periodDocs=useMemo(()=>emissions.filter((x:any)=>{const d=new Date(x.external_issue_date||x.created_at||0);if(Number.isNaN(d.getTime())||d.getFullYear()!==year)return false;return month==="Ano"||d.getMonth()===MONTH_INDEX[month]}),[emissions,year,month]);
 const authorized=periodDocs.filter((x:any)=>x.status==="authorized"&&!x.cancelled_at);
 const cancelled=periodDocs.filter((x:any)=>x.status==="cancelled"||Boolean(x.cancelled_at));
 const revenue=authorized.reduce((sum:number,x:any)=>sum+Number(x.total||0),0);
 const typeCounts=useMemo(()=>Object.fromEntries(TYPES.map(t=>[t,periodDocs.filter((x:any)=>typeLabel(x)===t).length])),[periodDocs]);
 const filtered=useMemo(()=>periodDocs.filter((item:any)=>{if(typeFilter&&typeLabel(item)!==typeFilter)return false;const q=query.trim().toLowerCase();if(!q)return true;return[item.number,item.series,item.recipient_name,item.recipient_tax_id,item.access_key,itemName(item),typeLabel(item),statusLabel(item.status)].some(v=>String(v||"").toLowerCase().includes(q))}),[periodDocs,typeFilter,query]);
 const totalPages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE)),safePage=Math.min(page,totalPages),pageDocs=filtered.slice((safePage-1)*PAGE_SIZE,safePage*PAGE_SIZE);
 const chooseMonth=(m:(typeof MONTHS)[number])=>{if(m!=="Ano"&&year===currentYear&&MONTH_INDEX[m]>currentMonth)return;setMonth(m);setPage(1)};
 const changeYear=(delta:number)=>{const next=Math.min(currentYear,year+delta);setYear(next);if(next===currentYear&&month!=="Ano"&&MONTH_INDEX[month]>currentMonth)setMonth(MONTHS[currentMonth+1]);setPage(1)};
 const toggleType=(t:string)=>{setTypeFilter(v=>v===t?"":t);setPage(1)};
 const openPreview=(item:any)=>{setSelected(item);setPreviewMode("danfe")};

 return <div className="saas-issued-admin-clone w-full text-[#0f172a]">
  <style>{`
   .saas-issued-admin-clone.saas-issued-admin-clone.saas-issued-admin-clone button{background-color:transparent!important;background-image:none!important;color:inherit!important;box-shadow:none!important}
   .saas-issued-admin-clone.saas-issued-admin-clone.saas-issued-admin-clone button:hover:not(:disabled){background-color:rgba(255,255,255,.35)!important;background-image:none!important}
   .saas-issued-admin-clone .row-a{background:#ffffff!important}
   .saas-issued-admin-clone .row-b{background:#ececeb!important}
   .saas-issued-admin-clone .note-row:hover{background:#e3e3e1!important}
  `}</style>

  <section className="flex flex-wrap items-center justify-between gap-3 rounded-[4px] bg-[#ececea] px-5 py-4">
   <div>
    <p className="text-[10px] font-semibold uppercase tracking-[.15em] text-[#657185]">Emissão fiscal</p>
    <h1 className="mt-1 text-[24px] font-semibold leading-none tracking-tight">Notas Emitidas</h1>
    <p className="mt-2 text-sm text-[#657185]">Consulte documentos, arquivos fiscais e valores emitidos.</p>
   </div>
   <button onClick={onNew} className="h-10 rounded-[4px] border border-[#bcc5cf] px-4 text-sm font-semibold text-[#172033]">Emitir nova nota</button>
  </section>

  <section className="relative mt-4 rounded-[4px] bg-[#ececea] px-4 py-3">
   <div className="flex flex-wrap items-center gap-2">
    <button onClick={()=>changeYear(-1)} className="rounded px-2 py-1.5 text-[#667085]">‹</button>
    <span className="min-w-16 text-lg font-semibold">{year}</span>
    <button disabled={year>=currentYear} onClick={()=>changeYear(1)} className="rounded px-2 py-1.5 text-[#667085] disabled:opacity-25">›</button>
    <div className="ml-2 flex flex-1 flex-wrap gap-1">
     {MONTHS.map(m=>{const future=m!=="Ano"&&year===currentYear&&MONTH_INDEX[m]>currentMonth,active=month===m;return <button key={m} disabled={future} onClick={()=>chooseMonth(m)} className={`min-w-11 rounded-[4px] border px-3 py-2 text-sm font-medium ${active?"border-[#aeb7c2] text-[#0f172a]":future?"border-transparent text-[#b8bec7]":"border-transparent text-[#344054]"}`}>{m}</button>})}
    </div>
    <button className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium"><CalendarDays className="h-4 w-4"/>Personalizado</button>
   </div>
  </section>

  <section className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
   <Summary label="Total notas" value={String(periodDocs.length)}/>
   <Summary label="Autorizadas" value={String(authorized.length)}/>
   <Summary label="Canceladas" value={String(cancelled.length)}/>
   <Summary label="Faturamento" value={money(revenue)}/>
  </section>

  <section className="mt-4 overflow-hidden rounded-[4px] bg-[#ececea]">
   <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
    <div className="flex flex-wrap items-center gap-1">
     {TYPES.map(t=><button key={t} onClick={()=>toggleType(t)} className={`rounded-[4px] border px-3 py-1.5 text-xs font-medium ${typeFilter===t?"border-[#7e8997] text-[#0f172a]":"border-transparent text-[#475467]"}`}>{t} <b>{typeCounts[t]||0}</b></button>)}
    </div>
    <span className="text-xs text-[#667085]">{periodDocs.length} nota{periodDocs.length===1?"":"s"} no período</span>
   </div>

   <div className="flex items-center gap-2 px-4 pb-3">
    <div className="relative flex-1">
     <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#98a2b3]"/>
     <input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Buscar por número, chave, razão social, CNPJ, tipo ou situação..." className="h-10 w-full rounded-[4px] border border-[#d5d8dc] bg-transparent pl-10 pr-3 text-sm outline-none placeholder:text-[#98a2b3]"/>
    </div>
    <button className="inline-flex h-10 items-center justify-center gap-2 rounded-[4px] border border-[#bcc5cf] px-4 text-xs font-semibold"><Download className="h-4 w-4"/>Download</button>
   </div>

   <div className="overflow-x-auto">
    <table className="w-full min-w-[1080px] table-fixed text-left text-sm">
     <colgroup><col className="w-[12%]"/><col className="w-[22%]"/><col className="w-[25%]"/><col className="w-[19%]"/><col className="w-[10%]"/><col className="w-[12%]"/></colgroup>
     <thead className="border-y border-[#d7d9dc] bg-[#f4f4f3] text-[10px] uppercase tracking-[.06em] text-[#475467]">
      <tr><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Nota / Chave</th><th className="px-4 py-3">Destinatário / Emitente</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr>
     </thead>
     <tbody>{pageDocs.map((item:any,index:number)=>{const d=new Date(item.external_issue_date||item.created_at||0);return <tr key={item.id||index} onClick={()=>openPreview(item)} className={`note-row cursor-pointer border-b border-[#d8d8d6] ${index%2===0?"row-a":"row-b"}`}>
      <td className="px-4 py-3.5 align-middle"><div className="font-semibold">{d.toLocaleDateString("pt-BR")}</div><div className="mt-0.5 text-[10px] text-[#667085]">{d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div></td>
      <td className="px-4 py-3.5 align-middle"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{item.number||"—"}</span><span className="text-[10px] text-[#667085]">/ {item.series||"—"}</span><TypeBadge value={typeLabel(item)}/><Status value={String(item.status||"draft")}/></div><div className="mt-1 truncate text-[9px] text-[#667085]">{item.access_key||"Chave não informada"}</div></td>
      <td className="px-4 py-3.5 align-middle"><div className="truncate font-medium">{item.recipient_name||"Sem destinatário"}</div><div className="mt-0.5 truncate text-[10px] text-[#667085]">{item.recipient_tax_id||"Documento não informado"}</div></td>
      <td className="px-4 py-3.5 align-middle"><div className="truncate">{itemName(item)}</div><div className="mt-0.5 text-[10px] text-[#667085]">{typeLabel(item)} · {statusLabel(item.status)}</div></td>
      <td className="px-4 py-3.5 text-right align-middle font-semibold">{money(Number(item.total||0))}</td>
      <td className="px-4 py-3.5 align-middle" onClick={e=>e.stopPropagation()}><div className="flex justify-end whitespace-nowrap"><button onClick={()=>openPreview(item)} className="inline-flex h-8 items-center gap-2 rounded-[4px] border border-transparent px-2 text-xs font-semibold text-[#172033]"><FileText className="h-3.5 w-3.5"/>Visualizar</button></div></td>
     </tr>})}{!pageDocs.length&&<tr className="row-a"><td colSpan={6} className="h-44 text-center text-sm text-[#667085]">Nenhuma nota encontrada neste período.</td></tr>}</tbody>
    </table>
   </div>

   <div className="flex items-center justify-between border-t border-[#d7d9dc] px-4 py-3 text-xs text-[#667085]">
    <span>{filtered.length?`${(safePage-1)*PAGE_SIZE+1}–${Math.min(safePage*PAGE_SIZE,filtered.length)} de ${filtered.length}`:"0 documento(s)"}</span>
    <div className="flex items-center"><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded px-3 py-2 disabled:opacity-25">‹</button><span className="px-2">{safePage} / {totalPages}</span><button disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))} className="rounded px-3 py-2 disabled:opacity-25">›</button></div>
   </div>
  </section>

  {selected&&<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#d9e0e8]/55 p-6 backdrop-blur-[20px]" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="flex h-[min(900px,calc(100vh-48px))] w-[min(1160px,calc(100vw-48px))] flex-col overflow-hidden rounded-lg border border-white bg-white shadow-[0_26px_80px_rgba(28,42,58,.20)]"><div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#d5dce4] bg-white px-5 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7b8492]">{typeLabel(selected)} · Nº {selected.number||"—"} · Série {selected.series||"—"}</p><h3 className="mt-1 text-lg font-semibold">{previewMode==="receipt"?"Visualização em notinha":"Visualização do DANFE"}</h3></div><div className="flex flex-wrap gap-2"><button onClick={()=>setPreviewMode(previewMode==="danfe"?"receipt":"danfe")} className="rounded border border-[#cbd3dc] px-3 py-2 text-xs font-semibold">{previewMode==="danfe"?"Ver notinha":"Ver DANFE"}</button><button onClick={()=>printDanfe(`issued-doc-${selected.id}`,`${typeLabel(selected)}-${selected.number}`)} className="rounded border border-[#cbd3dc] px-3 py-2 text-xs font-semibold">Imprimir / salvar PDF</button>{selected.xml&&<button onClick={()=>downloadXml(selected)} className="rounded border border-[#cbd3dc] px-3 py-2 text-xs font-semibold">Baixar XML</button>}<button onClick={()=>setSelected(null)} className="rounded border border-[#cbd3dc] px-3 py-2 text-xs font-semibold">Fechar</button></div></div><div className="min-h-0 flex-1 overflow-auto bg-[#f6f8fa] p-6"><div className="mx-auto flex min-h-full w-full items-start justify-center"><SaasDanfePreview id={`issued-doc-${selected.id}`} documentType={typeLabel(selected)} environment={selected.environment||"homologation"} emission={selected} mode={previewMode}/></div></div></div></div>}
 </div>;
}

function Summary({label,value}:{label:string;value:string}){return <div className="min-h-[92px] rounded-[4px] bg-[#f1f2f2] px-5 py-4"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#657185]">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-[#101828]">{value}</p></div>}
function TypeBadge({value}:{value:string}){return <span className="rounded-[3px] bg-[#d7edf5] px-2 py-1 text-[9px] font-semibold text-[#176d94]">{value}</span>}
function Status({value}:{value:string}){const n=value.toLowerCase();const labels:Record<string,string>={authorized:"Autorizada",draft:"Rascunho",validated:"Em andamento",rejected:"Rejeitada",cancelled:"Cancelada",error:"Erro"};const classes:Record<string,string>={authorized:"bg-[#d9eee7] text-[#137456]",draft:"bg-[#e8eaed] text-[#526173]",validated:"bg-[#f6eacb] text-[#94620d]",rejected:"bg-[#f3dddd] text-[#b42318]",cancelled:"bg-[#e5e5e5] text-[#59636f]",error:"bg-[#f3dddd] text-[#b42318]"};return <span className={`rounded-[3px] px-2 py-1 text-[9px] font-semibold ${classes[n]||classes.draft}`}>{labels[n]||value}</span>}