import { Download, FileText, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export type PreviewDocument = {
  nsu?: string; schema?: string; documentKind?: "nfe" | "resumo" | "evento" | "documento"; fullXml?: boolean;
  direction?: "entrada" | "saida" | "relacionada"; accessKey?: string; issueDate?: string; value?: number;
  issuerCnpj?: string; issuerName?: string; recipientCnpj?: string; number?: string; series?: string;
  statusCode?: string; xml?: string; parseError?: string;
};

const money = (v?: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = (v?: string) => { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString("pt-BR"); };
const digits = (v?: string) => String(v || "").replace(/\D/g, "");
const formatCnpj = (v?: string) => { const d = digits(v); return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : v || "—"; };

function downloadXml(doc: PreviewDocument) {
  if (!doc.xml) return;
  const blob = new Blob([doc.xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.accessKey || doc.nsu || "documento-fiscal"}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

async function downloadPdf(doc: PreviewDocument) {
  const { data, error } = await supabase.functions.invoke("dfe-danfe-pdf", { body: { document: doc } });
  if (error) throw error;
  const base64 = String(data?.pdf_base64 || "");
  if (!base64) throw new Error("PDF não foi gerado.");
  const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.accessKey || doc.nsu || "danfe"}.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FiscalDocumentPreview({ doc, onClose }: { doc: PreviewDocument; onClose: () => void }) {
  const event = doc.documentKind === "evento" || doc.direction === "relacionada";
  return <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl">
      <div className="flex items-center justify-between gap-4 border-b px-5 py-4">
        <div><p className="text-xs uppercase text-muted-foreground">Visualização do documento</p><h2 className="mt-1 text-lg font-semibold">{event ? "Evento / documento relacionado" : `NF-e ${doc.number || ""}${doc.series ? ` · Série ${doc.series}` : ""}`}</h2></div>
        <div className="flex items-center gap-2"><Button variant="outline" size="sm" disabled={!doc.xml} onClick={() => downloadXml(doc)}><Download className="mr-2 h-4 w-4"/>XML</Button><Button size="sm" disabled={event} onClick={() => void downloadPdf(doc)}><FileText className="mr-2 h-4 w-4"/>Baixar PDF</Button><Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button></div>
      </div>

      <div className="overflow-y-auto bg-muted/20 p-4 sm:p-6">
        <div className="mx-auto max-w-4xl bg-white text-black shadow-xl">
          <div className="border-2 border-black p-3">
            <div className="grid grid-cols-[1.2fr_1fr] border-b-2 border-black pb-3">
              <div className="pr-4"><p className="text-[10px] font-bold uppercase">Emitente</p><p className="mt-1 text-lg font-bold">{doc.issuerName || "Emitente não informado"}</p><p className="mt-1 text-xs">CNPJ {formatCnpj(doc.issuerCnpj)}</p></div>
              <div className="border-l-2 border-black pl-4 text-center"><p className="text-2xl font-black tracking-tight">DANFE</p><p className="text-[10px] font-bold uppercase">Documento Auxiliar da Nota Fiscal Eletrônica</p><div className="mt-2 grid grid-cols-2 gap-2 text-left text-xs"><div><b>Nº</b><br/>{doc.number || "—"}</div><div><b>Série</b><br/>{doc.series || "—"}</div></div></div>
            </div>

            <div className="border-b border-black py-3"><p className="text-[9px] font-bold uppercase">Chave de acesso</p><p className="mt-1 break-all font-mono text-sm font-bold tracking-wide">{doc.accessKey || "—"}</p></div>

            <div className="grid grid-cols-3 border-b border-black text-xs"><Cell label="Data de emissão" value={dateTime(doc.issueDate)}/><Cell label="Tipo" value={doc.direction === "saida" ? "Saída" : doc.direction === "entrada" ? "Entrada" : "Relacionado"}/><Cell label="Valor total" value={event ? "—" : money(doc.value)}/></div>
            <div className="grid grid-cols-2 border-b border-black text-xs"><Cell label="CNPJ emitente" value={formatCnpj(doc.issuerCnpj)}/><Cell label="CNPJ destinatário" value={formatCnpj(doc.recipientCnpj)}/></div>
            <div className="grid grid-cols-3 text-xs"><Cell label="Status" value={doc.statusCode || "—"}/><Cell label="NSU" value={doc.nsu || "—"}/><Cell label="Schema" value={doc.schema || "—"}/></div>
          </div>
          <div className="px-3 py-2 text-[9px] text-neutral-600">Visualização gerada pelo WS Gestão a partir do XML/DF-e armazenado. Para validade fiscal, prevalecem o XML autorizado e o protocolo da SEFAZ.</div>
        </div>
      </div>
    </div>
  </div>;
}

function Cell({ label, value }: { label: string; value: string }) { return <div className="min-h-16 border-r border-black p-2 last:border-r-0"><p className="text-[9px] font-bold uppercase">{label}</p><p className="mt-1 break-words font-semibold">{value}</p></div>; }
