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
   <div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-[#7b8492]">Emissão fiscal</p><h1 className="mt-1 text-[26px] font-semibold tracking-tight">Notas Emitidas</h1><p className="mt-1 text-sm text-muted-foreground">Consulte documentos, arquivos fiscais e valores emitidos.</p></div>
   <Button onClick={onNew}>Emitir nova nota</Button>
  </div>

  <section className="rounded-2xl bg-muted/10 px-4 py-3">
   <div className="flex flex-wrap items-center gap-2 text-sm">
    <button onClick={()=>moveYear(-1)} className="grid h-8 w-8 place-items-center rounded border border-transparent bg-transparent text-muted-foreground">‹</button>
    <strong className="mr-3 text-lg">{year}</strong>
    <button onClick={()=>moveYear(1)} className="mr-4 grid h-8 w-8 place-items-center rounded border border-transparent bg-transparent text-muted-foreground">›</button>
    <button onClick={()=>{setMonth(null);setPage(1)}} className={`min-w-11 rounded-xl px-3 py-2 text-sm font-medium ${month===null?"bg-background shadow-sm":"text-muted-foreground hover:bg-background/70"}`}>Ano</button>
    {months.map((m,i)=><button key={m} onClick={()=>{setMonth(i);setPage(1)}} className={`min-w-11 rounded-xl px-3 py-2 text-sm font-medium ${month===i?"bg-background shadow-sm":"text-muted-foreground hover:bg-background/70"}`}>{m}</button>)}
    <div className="ml-auto flex h-9 items-center gap-2 rounded-xl px-3 text-sm font-medium text-muted-foreground"><CalendarDays className="h-4 w-4"/>Personalizado</div>
   </div>
  </section>

  <div className="grid gap-2 md:grid-cols-4">
   <Summary label="Total notas" value={String(scoped.length)}/>
   <Summary label="Autorizadas" value={String(authorized.length)}/>
   <Summary label="Canceladas" value={String(scoped.filter(x=>x.status==="cancelled").length)}/>
   <Summary label="Faturamento" value={money(revenue)} detail={pending.length?`${pending.length} em andamento`:undefined}/>
  </div>

  <section className="overflow-hidden rounded-2xl bg-background shadow-sm ring-1 ring-black/[.04]">
   <div className="flex flex-wrap items-center gap-2 px-4 py-3">{tabs.map(t=><button key={t.label} onClick={()=>chooseTab(t.label)} className={`rounded-full px-3 py-1.5 text-xs font-medium ${tab===t.label?"bg-foreground text-background shadow-sm":"bg-muted/35 text-muted-foreground hover:bg-muted/60"}`}>{t.label} <b>{t.count}</b></button>)}</div>
   <div className="flex items-center gap-2 px-4 pb-3">
    <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input value={query} onChange={e=>{setQuery(e.target.value);setPage(1)}} placeholder="Buscar por número, chave, razão social, CNPJ, produto ou situação..." className="h-10 w-full rounded-md border-0 bg-muted/30 pl-10 pr-3 text-sm outline-none"/></div>
    <button className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-foreground px-4 text-xs font-semibold text-background"><Download className="h-4 w-4"/>Download</button>
   </div>

   <div className="overflow-x-auto"><table className="w-full min-w-[1000px] text-left text-sm"><thead className="bg-muted/20 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Nota / chave</th><th className="px-4 py-3">Destinatário / emitente</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
    <tbody>{visibleRows.map((item:any,index:number)=>{const d=new Date(item.external_issue_date||item.created_at||0);return <tr key={item.id||index} onClick={()=>openPreview(item)} className={`ws-zebra-row cursor-pointer transition-colors hover:bg-muted/40`}>
     <td className="px-4 py-3.5"><div className="font-semibold text-foreground">{d.toLocaleDateString("pt-BR")}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})}</div></td>
     <td className="min-w-[230px] px-4 py-3.5"><div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{item.number||"—"}</span><span className="text-[10px] text-muted-foreground">/ {item.series||"—"}</span><span className="rounded bg-[#e7f2f7] px-2 py-1 text-[9px] font-semibold text-[#27708f]">{typeLabel(item)}</span><Status value={String(item.status||"draft")}/></div><div className="mt-1 max-w-[340px] break-all text-[9px] leading-4 text-muted-foreground">{item.access_key||"Chave não informada"}</div></td>
     <td className="min-w-[240px] px-4 py-3.5"><div className="font-medium leading-5 text-foreground">{item.recipient_name||"Sem destinatário"}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{item.recipient_tax_id||"Documento não informado"}</div></td>
     <td className="min-w-[210px] px-4 py-3.5"><div className="leading-5 text-foreground">{itemName(item)}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{item.source==="imported"?"Documento extraído":"Emitida pelo SaaS"}</div></td>
     <td className="px-4 py-3.5 text-right font-semibold">{money(Number(item.total||0))}</td>
     <td className="px-4 py-3.5" onClick={e=>e.stopPropagation()}><div className="flex justify-end gap-2"><button onClick={()=>openPreview(item)} className="inline-flex items-center gap-1 rounded border border-transparent bg-transparent px-2 py-1 text-xs font-semibold text-foreground"><FileText className="h-3.5 w-3.5"/>Visualizar</button>{item.xml&&<button onClick={()=>downloadXml(item)} className="rounded border border-[#d4dce5] bg-white px-2 py-1 text-[10px] font-semibold text-foreground">XML</button>}</div></td>
    </tr>})}{!visibleRows.length&&<tr><td colSpan={6} className="px-5 py-16 text-center text-sm text-muted-foreground">Nenhuma nota encontrada neste período.</td></tr>}</tbody></table></div>

   <div className="flex items-center justify-between px-4 py-3 text-xs text-muted-foreground"><span>{rows.length?`${(safePage-1)*pageSize+1}–${Math.min(safePage*pageSize,rows.length)} de ${rows.length}`:"0 documento(s)"}</span><div><button disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))} className="rounded-lg px-3 py-2 disabled:opacity-25">‹</button><span className="px-2">{safePage} / {pages}</span><button disabled={safePage>=pages} onClick={()=>setPage(p=>Math.min(pages,p+1))} className="rounded-lg px-3 py-2 disabled:opacity-25">›</button></div></div>
  </section>

  {selected&&<div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#e7ebef]/30 p-6 backdrop-blur-[32px] backdrop-saturate-50" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="flex h-[min(900px,calc(100vh-48px))] w-[min(1160px,calc(100vw-48px))] flex-col overflow-hidden rounded-lg border border-white/90 bg-white/92 shadow-[0_26px_80px_rgba(28,42,58,.20)]"><div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-[#d5dce4] bg-white/95 px-5 py-3 backdrop-blur-md"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-[#7b8492]">{typeLabel(selected)} · Nº {selected.number||"—"} · Série {selected.series||"—"}</p><h3 className="mt-1 text-lg font-semibold">{previewMode==="receipt"?"Visualização em notinha":"Visualização do DANFE"}</h3></div><div className="flex flex-wrap gap-2"><button onClick={()=>setPreviewMode(previewMode==="danfe"?"receipt":"danfe")} className="rounded-md border border-[#cbd3dc] bg-white px-3 py-2 text-xs font-semibold text-foreground">{previewMode==="danfe"?"Ver notinha":"Ver DANFE"}</button><button onClick={()=>printDanfe(`issued-doc-${selected.id}`,`${typeLabel(selected)}-${selected.number}`)} className="rounded-md bg-[#0099d8] px-3 py-2 text-xs font-semibold text-white">Imprimir / salvar PDF</button>{selected.xml&&<button onClick={()=>downloadXml(selected)} className="rounded-md border border-[#cbd3dc] bg-white px-3 py-2 text-xs font-semibold text-foreground">Baixar XML</button>}<button onClick={()=>setSelected(null)} className="rounded-md border border-[#cbd3dc] bg-white px-3 py-2 text-xs font-semibold text-foreground">Fechar</button></div></div><div className="min-h-0 flex-1 overflow-auto bg-white/35 p-6"><div className="mx-auto flex min-h-full w-full items-start justify-center"><SaasDanfePreview id={`issued-doc-${selected.id}`} documentType={typeLabel(selected)} environment={selected.environment||"homologation"} emission={selected} mode={previewMode}/></div></div></div></div>}
 </div>;
}

function Summary({label,value,detail}:{label:string;value:string;detail?:string}){return <div className="rounded-md border border-[#d9dfe6] bg-white px-4 py-4 shadow-sm"><p className="text-[9px] font-semibold uppercase tracking-[.13em] text-[#7b8492]">{label}</p><p className="mt-2 text-[22px] font-semibold tracking-tight text-[#101828]">{value}</p>{detail&&<p className="mt-1 text-[10px] text-muted-foreground">{detail}</p>}</div>}
function Status({value}:{value:string}){const n=value.toLowerCase();const labels:Record<string,string>={authorized:"Autorizada",draft:"Rascunho",validated:"Em andamento",rejected:"Rejeitada",cancelled:"Cancelada",error:"Erro"};const classes:Record<string,string>={authorized:"bg-emerald-100 text-emerald-700",draft:"bg-slate-100 text-slate-600",validated:"bg-amber-100 text-amber-700",rejected:"bg-red-100 text-red-700",cancelled:"bg-zinc-200 text-zinc-700",error:"bg-red-100 text-red-700"};return <span className={`rounded px-2 py-1 text-[9px] font-semibold ${classes[n]||classes.draft}`}>{labels[n]||value}</span>}
