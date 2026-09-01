import { useState } from "react";
import SaasDanfePreview,{printDanfe} from "./SaasDanfePreview";

const money=(v:any)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const statusLabel=(s:string)=>s==="authorized"?"Autorizada":s==="rejected"?"Rejeitada":s==="cancelled"?"Cancelada":s==="error"?"Erro":s;
const itemName=(x:any)=>x?.payload?.produto||x?.payload?.descricao||x?.payload?.carga?.proPred||x?.payload?.proPred||x?.payload?.natOp||x?.payload?.munDescargaNome||(x?.document_type==="cte"?"Prestação de serviço de transporte":"Documento fiscal");
const originLabel=(x:any)=>x?.source==="imported"||x?.origin==="imported"?"Extraída":"Emitida aqui";
const downloadXml=(x:any,documentType:string)=>{if(!x?.xml)return;const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([x.xml],{type:"application/xml"}));a.download=`${documentType}-${x.number||"documento"}.xml`;a.click();URL.revokeObjectURL(a.href)};
const auxName=(documentType:string)=>documentType==="CT-e"?"DACTE":documentType==="MDF-e"?"DAMDFE":documentType==="NFC-e"?"DANFE NFC-e":"DANFE";
const dateText=(x:any)=>new Date(x.external_issue_date||x.authorized_at||x.created_at).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"});

export default function SaasEmissionHistory({items,documentType}:{items:any[];documentType:string}){
 const [selected,setSelected]=useState<any>(null);
 const [viewMode,setViewMode]=useState<"danfe"|"receipt">("danfe");
 const openDocument=(x:any)=>{setSelected(x);setViewMode("danfe")};
 const closeDocument=()=>{setSelected(null);setViewMode("danfe")};
 return <>
  <section className="saas-emission-history rounded-lg border border-[#c5ccd6] bg-white p-5 md:p-6">
   <div className="flex items-start justify-between gap-4"><div><h2 className="text-[15px] font-semibold text-[#121923]">Últimas emissões</h2><p className="mt-1 text-xs text-muted-foreground">Histórico fiscal recente. Clique na linha para abrir o documento auxiliar.</p></div><span className="whitespace-nowrap pt-1 text-xs font-medium text-muted-foreground">{items.length} registro{items.length===1?"":"s"}</span></div>
   <div className="mt-4 overflow-x-auto rounded-md border border-[#c7cfd9] bg-white">
    <table className="w-full min-w-[980px] table-fixed text-left text-[13px]">
     <colgroup><col className="w-[5%]"/><col className="w-[6%]"/><col className="w-[24%]"/><col className="w-[22%]"/><col className="w-[10%]"/><col className="w-[10%]"/><col className="w-[12%]"/><col className="w-[9%]"/><col className="w-[12%]"/></colgroup>
     <thead className="!bg-[#dfe4ea]"><tr><th className="px-3 py-3">Nº</th><th className="px-3 py-3">Série</th><th className="px-3 py-3">Destinatário</th><th className="px-3 py-3">Item / operação</th><th className="px-3 py-3">Origem</th><th className="px-3 py-3">Status</th><th className="px-3 py-3">Data</th><th className="px-3 py-3 text-right">Valor</th><th className="px-3 py-3 text-right">Ações</th></tr></thead>
     <tbody>{items.length===0?<tr><td colSpan={9} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma emissão deste tipo.</td></tr>:items.slice(0,30).map((x,i)=><tr key={x.id} onClick={()=>openDocument(x)} className={`cursor-pointer border-t border-[#d8dee6] transition-colors hover:!bg-[#e6ebf0] ${i%2===0?"!bg-white":"!bg-[#edf1f4]"}`}>
      <td className="px-3 py-3 font-semibold">{x.number||"—"}</td><td className="px-3 py-3">{x.series||"—"}</td>
      <td className="px-3 py-3"><div className="line-clamp-2 font-medium leading-5" title={x.recipient_name||""}>{x.recipient_name||"Sem destinatário"}</div></td>
      <td className="px-3 py-3"><div className="line-clamp-2 leading-5 text-slate-600" title={itemName(x)}>{itemName(x)}</div></td>
      <td className="px-3 py-3"><span className={`inline-flex whitespace-nowrap rounded border px-2 py-1 text-[10px] font-semibold ${originLabel(x)==="Extraída"?"border-blue-200 bg-blue-50 text-blue-700":"border-slate-300 bg-white text-slate-700"}`}>{originLabel(x)}</span></td>
      <td className={`px-3 py-3 whitespace-nowrap font-semibold ${x.status==="authorized"?"text-emerald-700":x.status==="rejected"||x.status==="error"?"text-red-700":"text-amber-700"}`}>{statusLabel(x.status)}</td>
      <td className="whitespace-nowrap px-3 py-3 text-[11px] text-slate-600">{dateText(x)}</td>
      <td className="whitespace-nowrap px-3 py-3 text-right font-semibold">{money(x.total)}</td>
      <td className="px-3 py-3"><div className="flex min-w-max justify-end gap-2" onClick={e=>e.stopPropagation()}><button onClick={()=>openDocument(x)} className="min-w-[58px] whitespace-nowrap rounded border border-[#aeb8c5] bg-white px-3 py-2 text-[10px] font-semibold text-[#202833]">{auxName(documentType)}</button>{x.xml&&<button onClick={()=>downloadXml(x,documentType)} className="min-w-[46px] whitespace-nowrap rounded border border-[#aeb8c5] bg-white px-3 py-2 text-[10px] font-semibold text-[#202833]">XML</button>}</div></td>
     </tr>)}</tbody>
    </table>
   </div>
  </section>
  {selected&&<div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-3 md:p-6" onMouseDown={e=>{if(e.target===e.currentTarget)closeDocument()}}><div className={`flex max-h-[94vh] w-full flex-col overflow-hidden rounded-xl border border-[#cfd6df] bg-[#eef1f4] shadow-2xl transition-[max-width] ${viewMode==="receipt"?"max-w-[760px]":"max-w-6xl"}`}>
   <div className="z-10 border-b border-[#cbd2db] bg-white px-5 py-4"><div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between"><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{documentType} · Série {selected.series||"—"} · Nº {selected.number||"—"}</p><h3 className="mt-1 text-lg font-semibold text-[#151d27]">{viewMode==="receipt"?"Notinha / visualização compacta":`${auxName(documentType)} / Documento auxiliar`}</h3></div><div className="flex flex-wrap items-center gap-2"><div className="inline-flex rounded-md border border-[#aeb8c5] bg-[#f4f6f8] p-0.5"><button onClick={()=>setViewMode("danfe")} className={`rounded px-4 py-2 text-xs font-semibold transition ${viewMode==="danfe"?"bg-[#202833] text-white shadow-sm":"text-[#202833] hover:bg-white"}`}>Documento</button><button onClick={()=>setViewMode("receipt")} className={`rounded px-4 py-2 text-xs font-semibold transition ${viewMode==="receipt"?"bg-[#202833] text-white shadow-sm":"text-[#202833] hover:bg-white"}`}>Notinha</button></div><button onClick={()=>printDanfe(`history-danfe-${selected.id}`,`${viewMode==="receipt"?"Notinha":auxName(documentType)}-${selected.number}`)} className="whitespace-nowrap rounded-md bg-[#202833] px-4 py-2.5 text-xs font-semibold text-white">Imprimir / salvar PDF</button>{selected.xml&&<button onClick={()=>downloadXml(selected,documentType)} className="whitespace-nowrap rounded-md border border-[#aeb8c5] bg-white px-4 py-2.5 text-xs font-semibold text-[#202833]">Baixar XML</button>}<button onClick={closeDocument} className="rounded-md border border-[#aeb8c5] bg-white px-4 py-2.5 text-xs font-semibold text-[#202833]">Fechar</button></div></div></div>
   <div className={`overflow-auto ${viewMode==="receipt"?"px-5 py-5 md:px-8 md:py-6":"p-5 md:p-7"}`}><SaasDanfePreview id={`history-danfe-${selected.id}`} documentType={documentType} environment={selected.environment||"homologation"} emission={selected} mode={viewMode}/></div>
  </div></div>}
 </>
}
