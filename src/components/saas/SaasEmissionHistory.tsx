import { useState } from "react";
import SaasDanfePreview,{printDanfe} from "./SaasDanfePreview";

const money=(v:any)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const statusLabel=(s:string)=>s==="authorized"?"Autorizada":s==="rejected"?"Rejeitada":s==="cancelled"?"Cancelada":s==="error"?"Erro":s;
const itemName=(x:any)=>x?.payload?.produto||x?.payload?.descricao||x?.payload?.proPred||x?.payload?.munDescargaNome||"Documento fiscal";
const originLabel=(x:any)=>x?.source==="imported"||x?.origin==="imported"?"Extraída":"Emitida aqui";
const downloadXml=(x:any,documentType:string)=>{if(!x?.xml)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([x.xml],{type:"application/xml"}));a.download=`${documentType}-${x.number||"documento"}.xml`;a.click();URL.revokeObjectURL(a.href)};

export default function SaasEmissionHistory({items,documentType}:{items:any[];documentType:string}){
 const [selected,setSelected]=useState<any>(null);
 return <>
  <section className="rounded-lg border border-[#c5ccd6] bg-white p-5 md:p-6">
   <div className="flex items-center justify-between gap-4"><div><h2 className="font-semibold">Últimas emissões</h2><p className="mt-1 text-xs text-muted-foreground">Histórico fiscal recente. Clique na linha para abrir o DANFE.</p></div><span className="text-xs font-medium text-muted-foreground">{items.length} registro{items.length===1?"":"s"}</span></div>
   <div className="mt-4 overflow-x-auto rounded-md border border-[#c7cfd9] bg-white">
    <table className="w-full min-w-[1120px] text-left text-sm">
     <thead className="!bg-[#dfe4ea]"><tr><th className="px-4 py-3">Nº</th><th className="px-4 py-3">Série</th><th className="px-4 py-3">Destinatário</th><th className="px-4 py-3">Item / operação</th><th className="px-4 py-3">Origem</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Data</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr></thead>
     <tbody>{items.length===0?<tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma emissão deste tipo.</td></tr>:items.slice(0,30).map((x,i)=><tr key={x.id} onClick={()=>setSelected(x)} className={`cursor-pointer border-t border-[#d8dee6] transition-colors hover:!bg-[#e6ebf0] ${i%2===0?"!bg-white":"!bg-[#edf1f4]"}`}><td className="px-4 py-3 font-semibold">{x.number||"—"}</td><td className="px-4 py-3">{x.series||"—"}</td><td className="max-w-[210px] truncate px-4 py-3">{x.recipient_name||"Sem destinatário"}</td><td className="max-w-[220px] truncate px-4 py-3 text-muted-foreground">{itemName(x)}</td><td className="px-4 py-3"><span className={`inline-flex rounded border px-2 py-1 text-[10px] font-semibold ${originLabel(x)==="Extraída"?"border-blue-200 bg-blue-50 text-blue-700":"border-slate-300 bg-white text-slate-700"}`}>{originLabel(x)}</span></td><td className={`px-4 py-3 font-semibold ${x.status==="authorized"?"text-emerald-700":x.status==="rejected"||x.status==="error"?"text-red-700":"text-amber-700"}`}>{statusLabel(x.status)}</td><td className="px-4 py-3 text-xs text-slate-600">{new Date(x.external_issue_date||x.created_at).toLocaleString("pt-BR")}</td><td className="px-4 py-3 text-right font-semibold">{money(x.total)}</td><td className="px-4 py-3"><div className="flex justify-end gap-2" onClick={e=>e.stopPropagation()}><button onClick={()=>setSelected(x)} className="rounded border border-[#aeb8c5] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#202833]">DANFE</button>{x.xml&&<button onClick={()=>downloadXml(x,documentType)} className="rounded border border-[#aeb8c5] bg-white px-2.5 py-1.5 text-[10px] font-semibold text-[#202833]">XML</button>}</div></td></tr>)}</tbody>
    </table>
   </div>
  </section>
  {selected&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4" onMouseDown={e=>{if(e.target===e.currentTarget)setSelected(null)}}><div className="max-h-[95vh] w-full max-w-5xl overflow-auto rounded-lg border border-[#cfd6df] bg-[#eef1f4] shadow-2xl">
   <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#cbd2db] bg-white px-5 py-3"><div><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{documentType} · Série {selected.series||"—"} · Nº {selected.number||"—"}</p><h3 className="mt-1 text-lg font-semibold">DANFE / Documento auxiliar</h3></div><div className="flex flex-wrap gap-2"><button onClick={()=>printDanfe(`history-danfe-${selected.id}`,`${documentType}-${selected.number}`)} className="rounded-md bg-[#202833] px-3 py-2 text-xs font-semibold text-white">Imprimir / salvar PDF</button>{selected.xml&&<button onClick={()=>downloadXml(selected,documentType)} className="rounded-md border border-[#aeb8c5] bg-white px-3 py-2 text-xs font-semibold text-[#202833]">Baixar XML</button>}<button onClick={()=>setSelected(null)} className="rounded-md border border-[#aeb8c5] bg-white px-3 py-2 text-xs font-semibold text-[#202833]">Fechar</button></div></div>
   <div className="p-5"><SaasDanfePreview id={`history-danfe-${selected.id}`} documentType={documentType} environment={selected.environment||"homologation"} emission={selected}/></div>
  </div></div>}
 </>
}
