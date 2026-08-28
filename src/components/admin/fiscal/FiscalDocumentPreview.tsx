import { useEffect, useState } from "react";
import { Download, FileText, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type PreviewDocument = {
  nsu?: string; schema?: string; documentKind?: "nfe"|"nfse"|"resumo"|"evento"|"documento"; fullXml?: boolean;
  direction?: "entrada"|"saida"|"relacionada"; accessKey?: string; issueDate?: string; value?: number;
  issuerCnpj?: string; issuerName?: string; recipientCnpj?: string; number?: string; series?: string;
  statusCode?: string; statusText?: string; model?: string; xml?: string; parseError?: string;
};

function downloadXml(doc:PreviewDocument){
  if(!doc.xml)return;
  const blob=new Blob([doc.xml],{type:"application/xml;charset=utf-8"});
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=`${doc.accessKey||doc.nsu||"documento-fiscal"}.xml`;a.click();URL.revokeObjectURL(url);
}
async function renderPdf(doc:PreviewDocument){
  const{data,error}=await supabase.functions.invoke("dfe-danfe-pdf",{body:{document:doc}});
  if(error)throw error;
  const base64=String(data?.pdf_base64||"");
  if(!base64)throw new Error("PDF não foi gerado.");
  const bytes=Uint8Array.from(atob(base64),c=>c.charCodeAt(0));
  return {blob:new Blob([bytes],{type:"application/pdf"}),filename:String(data?.filename||`${doc.accessKey||doc.nsu||"documento-fiscal"}.pdf`)};
}

export function FiscalDocumentPreview({doc,onClose}:{doc:PreviewDocument;onClose:()=>void}){
  const event=doc.documentKind==="evento"||doc.direction==="relacionada";
  const complete=Boolean(doc.fullXml&&doc.xml);
  const isNFSe=doc.documentKind==="nfse"||/nfse/i.test(`${doc.schema||""} ${doc.model||""}`);
  const isNFCe=!isNFSe&&String(doc.model)==="65";
  const title=event?"Evento / documento relacionado":isNFSe?`NFS-e ${doc.number||""}`:`${isNFCe?"NFC-e":"NF-e"} ${doc.number||""}${doc.series?` · Série ${doc.series}`:""}`;
  const pdfLabel=isNFSe?"DANFSe":isNFCe?"Notinha NFC-e":"DANFE";
  const[pdfUrl,setPdfUrl]=useState("");
  const[pdfName,setPdfName]=useState("");
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState("");

  useEffect(()=>{
    let active=true,url="";
    if(!complete||event)return;
    setLoading(true);setError("");
    void renderPdf(doc).then(r=>{if(!active)return;url=URL.createObjectURL(r.blob);setPdfUrl(url);setPdfName(r.filename)}).catch(e=>{if(active)setError(e instanceof Error?e.message:String(e))}).finally(()=>{if(active)setLoading(false)});
    return()=>{active=false;if(url)URL.revokeObjectURL(url)};
  },[doc.accessKey,doc.nsu,doc.xml,complete,event]);

  const downloadPdf=()=>{if(!pdfUrl)return;const a=document.createElement("a");a.href=pdfUrl;a.download=pdfName||`${doc.accessKey||doc.nsu||"documento-fiscal"}.pdf`;a.click()};

  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3" onMouseDown={e=>{if(e.target===e.currentTarget)onClose()}}>
    <div className="flex h-[96vh] w-full max-w-7xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-3">
        <div><p className="text-[10px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Documento fiscal</p><h2 className="mt-1 text-base font-semibold">{title}</h2></div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Button variant="outline" size="sm" disabled={!doc.xml} onClick={()=>downloadXml(doc)}><Download className="mr-2 h-4 w-4"/>XML</Button>
          <Button size="sm" disabled={!pdfUrl||loading} onClick={downloadPdf}>{loading?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<FileText className="mr-2 h-4 w-4"/>}Baixar {pdfLabel}</Button>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button>
        </div>
      </div>
      {!event&&!complete&&<div className="border-b bg-amber-500/10 px-5 py-3 text-sm text-amber-700 dark:text-amber-200">Arquivo integral em recuperação. Assim que o XML oficial chegar, o próprio {pdfLabel} aparecerá aqui automaticamente.</div>}
      {error&&<div className="border-b bg-destructive/10 px-5 py-3 text-sm text-destructive">Não foi possível renderizar o documento: {error}</div>}
      <div className="min-h-0 flex-1 bg-muted/20 p-3">
        {loading?<div className="flex h-full items-center justify-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-5 w-5 animate-spin"/>Gerando {pdfLabel} para visualização...</div>:pdfUrl?<iframe title={title} src={`${pdfUrl}#toolbar=1&navpanes=0&view=FitH`} className="h-full w-full rounded-xl bg-white shadow-xl"/>:<div className="flex h-full items-center justify-center"><div className="max-w-md rounded-2xl border bg-background p-8 text-center"><FileText className="mx-auto h-9 w-9 text-muted-foreground"/><h3 className="mt-4 font-semibold">{event?"Evento fiscal":"Documento completo ainda indisponível"}</h3><p className="mt-2 text-sm text-muted-foreground">{event?"Eventos continuam disponíveis como XML e registro fiscal.":"O preview não usa mais resumo. Ele exibe somente o DANFE, a notinha NFC-e ou o DANFSe gerado a partir do XML integral."}</p></div></div>}
      </div>
    </div>
  </div>
}
