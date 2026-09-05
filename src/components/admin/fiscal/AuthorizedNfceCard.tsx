import { CheckCircle2, Copy, Printer, RefreshCw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { openPrintWindow, renderPrintableDocument, showPrintPlaceholder } from "@/utils/security/print";

type Props = {
  token: string;
  sale: Record<string, unknown>;
  result: Record<string, any>;
};

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data as T;
  let message = error.message;
  try {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json();
      message = payload?.error || message;
    }
  } catch { /* noop */ }
  throw new Error(message);
}

export function AuthorizedNfceCard({ token, sale, result }: Props) {
  const [printing, setPrinting] = useState(false);
  const [message, setMessage] = useState("");
  const protocol = result?.response?.protocol || {};
  const chave = String(protocol.chNFe || result.chaveAcesso || "");
  const nProt = String(protocol.nProt || "");
  if (!result?.authorized || protocol.cStat !== "100") return null;

  const printDanfe = async () => {
    setPrinting(true); setMessage("");
    const printWindow = openPrintWindow("width=460,height=760");
    if (!printWindow) { setMessage("O navegador bloqueou a janela de impressão. Libere pop-ups para este site."); setPrinting(false); return; }
    showPrintPlaceholder(printWindow, "Gerando DANFE...");
    try {
      const data = await invoke<{ html: string }>("dfe-danfe-native", {
        engine_token: token,
        environment: "homologacao",
        data: sale,
        chaveAcesso: chave,
        protocol,
      });
      renderPrintableDocument(printWindow, data.html);
    } catch (error) {
      printWindow.close();
      setMessage(error instanceof Error ? error.message : "Falha ao gerar DANFE.");
    } finally { setPrinting(false); }
  };

  const copyKey = async () => {
    await navigator.clipboard.writeText(chave);
    setMessage("Chave copiada.");
  };

  return <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
    <div className="flex items-start gap-3">
      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"/>
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-emerald-900 dark:text-emerald-200">NFC-e autorizada</p>
        <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">cStat 100 · Autorizado o uso da NF-e · Homologação</p>
        <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
          <div className="rounded-md bg-background/80 p-2"><span className="text-muted-foreground">Protocolo</span><p className="mt-0.5 font-mono font-medium">{nProt}</p></div>
          <div className="min-w-0 rounded-md bg-background/80 p-2"><span className="text-muted-foreground">Chave de acesso</span><p className="mt-0.5 break-all font-mono font-medium">{chave}</p></div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" onClick={printDanfe} disabled={printing}>{printing?<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>:<Printer className="mr-2 h-4 w-4"/>}{printing?"Gerando...":"Imprimir DANFE"}</Button>
          <Button size="sm" variant="outline" onClick={copyKey}><Copy className="mr-2 h-4 w-4"/>Copiar chave</Button>
        </div>
        {message&&<p className="mt-2 text-xs text-muted-foreground">{message}</p>}
      </div>
    </div>
  </div>;
}
