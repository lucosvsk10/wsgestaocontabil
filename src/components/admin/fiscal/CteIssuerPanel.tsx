import { useState } from "react";
import { RefreshCw, Send, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Props = { token: string; certificateBase64: string; certificatePassword: string };
type Result = { ok?: boolean; chave?: string; response?: { authorized?: boolean; cStat?: string; xMotivo?: string; chCTe?: string; nProt?: string; raw?: string }; xml?: string; endpoint?: string; errors?: string[]; [key:string]: unknown };

const initial = {
  serie: "1", numero: "1", cfop: "5353", natOp: "PRESTACAO DE SERVICO DE TRANSPORTE", cUF: "27",
  cMunIni: "2704401", xMunIni: "Major Isidoro", UFIni: "AL", cMunFim: "2704302", xMunFim: "Maceio", UFFim: "AL",
  vTPrest: "100.00", chNFe: "",
  emitIE: "", emitNome: "", emitLgr: "", emitNro: "", emitBairro: "", emitMun: "2704401", emitXMun: "Major Isidoro", emitCEP: "57580000", emitUF: "AL", emitCRT: "1",
  remCNPJ: "", remIE: "", remNome: "", remLgr: "", remNro: "", remBairro: "", remMun: "", remXMun: "", remCEP: "", remUF: "AL",
  destCNPJ: "", destIE: "", destNome: "", destLgr: "", destNro: "", destBairro: "", destMun: "", destXMun: "", destCEP: "", destUF: "AL",
  vCarga: "1000.00", qCarga: "100.0000", proPred: "CARGA GERAL", RNTRC: "",
};

async function invoke(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke("cte-issue-native", { body });
  if (!error) return data as Result;
  let message = error.message;
  try {
    const context = (error as { context?: Response }).context;
    if (context) {
      const payload = await context.clone().json();
      const details = Array.isArray(payload?.errors) ? payload.errors.join(" · ") : "";
      message = [payload?.error || message, details].filter(Boolean).join(" — ");
    }
  } catch { /* noop */ }
  throw new Error(message);
}

export function CteIssuerPanel({ token, certificateBase64, certificatePassword }: Props) {
  const [form, setForm] = useState(initial);
  const [action, setAction] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState("");
  const update = (key: keyof typeof initial, value: string) => setForm(s => ({ ...s, [key]: value }));
  const hasCert = Boolean(certificateBase64 && certificatePassword);
  const payload = () => ({
    serie: form.serie, numero: form.numero, cfop: form.cfop, natOp: form.natOp, cUF: form.cUF,
    cMunIni: form.cMunIni, xMunIni: form.xMunIni, UFIni: form.UFIni, cMunFim: form.cMunFim, xMunFim: form.xMunFim, UFFim: form.UFFim,
    vTPrest: form.vTPrest, chNFe: form.chNFe,
    emit: { IE: form.emitIE, xNome: form.emitNome, xLgr: form.emitLgr, nro: form.emitNro, xBairro: form.emitBairro, cMun: form.emitMun, xMun: form.emitXMun, CEP: form.emitCEP, UF: form.emitUF, CRT: form.emitCRT },
    rem: { CNPJ: form.remCNPJ, IE: form.remIE, xNome: form.remNome, xLgr: form.remLgr, nro: form.remNro, xBairro: form.remBairro, cMun: form.remMun, xMun: form.remXMun, CEP: form.remCEP, UF: form.remUF },
    dest: { CNPJ: form.destCNPJ, IE: form.destIE, xNome: form.destNome, xLgr: form.destLgr, nro: form.destNro, xBairro: form.destBairro, cMun: form.destMun, xMun: form.destXMun, CEP: form.destCEP, UF: form.destUF },
    carga: { vCarga: form.vCarga, qCarga: form.qCarga, proPred: form.proPred }, rodo: { RNTRC: form.RNTRC },
  });
  const run = async (kind: "status" | "preview" | "issue") => {
    setAction(kind); setError(""); setResult(null);
    try {
      const data = await invoke({ action: kind, engine_token: token, environment: "homologacao", certificate_base64: certificateBase64, certificate_password: certificatePassword, data: payload() });
      setResult(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Falha no CT-e."); }
    finally { setAction(null); }
  };

  return <div className="grid min-w-0 gap-6 2xl:grid-cols-[minmax(520px,1fr)_minmax(0,.8fr)]">
    <section className="min-w-0 rounded-lg border bg-background p-5">
      <div className="mb-5 flex items-center gap-3"><Truck className="h-5 w-5"/><div><p className="text-xs uppercase text-muted-foreground">CT-e 4.00 · Modelo 57</p><h2 className="font-semibold">Transporte rodoviário</h2></div></div>
      <Group title="Documento"><Grid><F label="Série" v={form.serie} on={v=>update("serie",v)}/><F label="Número" v={form.numero} on={v=>update("numero",v)}/><F label="CFOP" v={form.cfop} on={v=>update("cfop",v)}/><F label="Valor prestação" v={form.vTPrest} on={v=>update("vTPrest",v)}/><F label="RNTRC" v={form.RNTRC} on={v=>update("RNTRC",v)}/><F label="Chave NF-e" v={form.chNFe} on={v=>update("chNFe",v)}/></Grid></Group>
      <Group title="Emitente transportador"><Grid><F label="IE" v={form.emitIE} on={v=>update("emitIE",v)}/><F label="Razão social" v={form.emitNome} on={v=>update("emitNome",v)}/><F label="Logradouro" v={form.emitLgr} on={v=>update("emitLgr",v)}/><F label="Número" v={form.emitNro} on={v=>update("emitNro",v)}/><F label="Bairro" v={form.emitBairro} on={v=>update("emitBairro",v)}/><F label="Município" v={form.emitXMun} on={v=>update("emitXMun",v)}/></Grid></Group>
      <Group title="Rota"><Grid><F label="Município início" v={form.xMunIni} on={v=>update("xMunIni",v)}/><F label="Código IBGE início" v={form.cMunIni} on={v=>update("cMunIni",v)}/><F label="Município fim" v={form.xMunFim} on={v=>update("xMunFim",v)}/><F label="Código IBGE fim" v={form.cMunFim} on={v=>update("cMunFim",v)}/></Grid></Group>
      <Group title="Remetente"><Grid><F label="CNPJ" v={form.remCNPJ} on={v=>update("remCNPJ",v)}/><F label="IE" v={form.remIE} on={v=>update("remIE",v)}/><F label="Razão social" v={form.remNome} on={v=>update("remNome",v)}/><F label="Município" v={form.remXMun} on={v=>update("remXMun",v)}/></Grid></Group>
      <Group title="Destinatário"><Grid><F label="CNPJ" v={form.destCNPJ} on={v=>update("destCNPJ",v)}/><F label="IE" v={form.destIE} on={v=>update("destIE",v)}/><F label="Razão social" v={form.destNome} on={v=>update("destNome",v)}/><F label="Município" v={form.destXMun} on={v=>update("destXMun",v)}/></Grid></Group>
      <Group title="Carga"><Grid><F label="Valor da carga" v={form.vCarga} on={v=>update("vCarga",v)}/><F label="Peso bruto" v={form.qCarga} on={v=>update("qCarga",v)}/><F label="Produto predominante" v={form.proPred} on={v=>update("proPred",v)}/></Grid></Group>
      <div className="mt-5 flex flex-wrap gap-3 border-t pt-5"><Button variant="outline" onClick={()=>run("status")} disabled={!hasCert||!!action}>{action==="status"&&<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>}Testar SVRS</Button><Button variant="outline" onClick={()=>run("preview")} disabled={!hasCert||!!action}>Gerar XML</Button><Button onClick={()=>run("issue")} disabled={!hasCert||!!action}>{action==="issue"?<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>:<Send className="mr-2 h-4 w-4"/>}Emitir CT-e teste</Button></div>
    </section>
    <section className="min-w-0 rounded-lg border bg-background p-5"><p className="text-xs uppercase text-muted-foreground">Retorno CT-e</p>{error?<p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</p>:result?<div className="mt-4 space-y-3 text-sm"><Row k="Status" v={result.response?.cStat || (result.ok?"OK":"—")}/><Row k="Motivo" v={result.response?.xMotivo || "—"}/><Row k="Chave" v={result.response?.chCTe || result.chave || "—"}/><Row k="Protocolo" v={result.response?.nProt || "—"}/><details className="rounded-md border p-3"><summary className="cursor-pointer text-muted-foreground">Detalhes técnicos</summary><pre className="mt-3 max-h-[440px] overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(result,null,2)}</pre></details></div>:<p className="mt-4 text-sm text-muted-foreground">Teste a SVRS ou gere um CT-e de homologação.</p>}</section>
  </div>;
}
function Group({title,children}:{title:string;children:React.ReactNode}){return <div className="mt-5 border-t pt-5 first:mt-0 first:border-0 first:pt-0"><p className="mb-3 text-xs font-semibold uppercase text-muted-foreground">{title}</p>{children}</div>}
function Grid({children}:{children:React.ReactNode}){return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>}
function F({label,v,on}:{label:string;v:string;on:(v:string)=>void}){return <label className="min-w-0"><span className="mb-1.5 block text-xs text-muted-foreground">{label}</span><Input value={v} onChange={e=>on(e.target.value)}/></label>}
function Row({k,v}:{k:string;v:string}){return <div className="grid grid-cols-[90px_minmax(0,1fr)] gap-3 border-b pb-2"><span className="text-muted-foreground">{k}</span><span className="break-all font-medium">{v}</span></div>}
