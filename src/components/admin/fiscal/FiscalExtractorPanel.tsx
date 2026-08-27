import { useEffect, useMemo, useState } from "react";
import { Building2, CalendarDays, CheckCircle2, Clock3, Database, Eye, FileSearch, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { FiscalDocumentPreview } from "@/components/admin/fiscal/FiscalDocumentPreview";

type CertificateInfo = { cnpj?: string | null; cpf?: string | null; nome?: string | null; validadeFim?: string; validoAgora?: boolean };
type DfeDocument = {
  nsu?: string; schema?: string; documentKind?: "nfe" | "resumo" | "evento" | "documento"; fullXml?: boolean;
  direction?: "entrada" | "saida" | "relacionada"; accessKey?: string; issueDate?: string; value?: number;
  issuerCnpj?: string; issuerName?: string; recipientCnpj?: string; number?: string; series?: string;
  statusCode?: string; xml?: string; parseError?: string;
};
type DfeResult = {
  ok?: boolean; response?: { cStat?: string; xMotivo?: string; ultNSU?: string; maxNSU?: string };
  documents?: DfeDocument[]; newDocuments?: number;
};
type SyncState = { ult_nsu?: string | null; max_nsu?: string | null; last_synced_at?: string | null; last_status_code?: string | null };
type Filter = "todos" | "entrada" | "saida" | "evento";

const UF_CODES = [["12","AC"],["27","AL"],["16","AP"],["13","AM"],["29","BA"],["23","CE"],["53","DF"],["32","ES"],["52","GO"],["21","MA"],["51","MT"],["50","MS"],["31","MG"],["15","PA"],["25","PB"],["41","PR"],["26","PE"],["22","PI"],["33","RJ"],["24","RN"],["43","RS"],["11","RO"],["14","RR"],["42","SC"],["35","SP"],["28","SE"],["17","TO"]] as const;
const MONTHS = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

async function invoke<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (!error) return data as T;
  let message = error.message;
  try { const context = (error as { context?: Response }).context; if (context) message = (await context.clone().json())?.error || message; } catch { /* noop */ }
  throw new Error(message);
}
const digits = (v?: string | null) => String(v || "").replace(/\D/g, "");
const padNsu = (v?: string | null) => digits(v || "0").padStart(15, "0").slice(-15);
const money = (v?: number) => Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const date = (v?: string) => { if (!v) return "—"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleDateString("pt-BR"); };
const dateTime = (v?: string | null) => { if (!v) return "Ainda não sincronizado"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); };
function rowToDoc(row: any): DfeDocument { return { nsu: row.nsu, schema: row.schema_name, documentKind: row.document_kind, fullXml: row.full_xml, direction: row.direction, accessKey: row.access_key, issueDate: row.issue_date, value: Number(row.value || 0), issuerCnpj: row.issuer_cnpj, issuerName: row.issuer_name, recipientCnpj: row.recipient_cnpj, number: row.note_number, series: row.series, statusCode: row.status_code, xml: row.xml, parseError: row.parse_error }; }

export function FiscalExtractorPanel({ token, certificateBase64, certificatePassword, certificate }: { token: string; certificateBase64: string; certificatePassword: string; certificate: CertificateInfo | null }) {
  const now = new Date();
  const [environment, setEnvironment] = useState<"producao" | "homologacao">("producao");
  const [ufCode, setUfCode] = useState("27");
  const [ultNSU, setUltNSU] = useState("000000000000000");
  const [maxNSU, setMaxNSU] = useState("000000000000000");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DfeResult | null>(null);
  const [filter, setFilter] = useState<Filter>("todos");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<DfeDocument | null>(null);
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState<number | "all">(now.getMonth());

  const hasCert = Boolean(certificateBase64 && certificatePassword);
  const cnpj = digits(certificate?.cnpj);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (cnpj.length !== 14) { setUltNSU(padNsu()); setMaxNSU(padNsu()); setLastSyncedAt(null); setResult(null); return; }
      setLoadingState(true);
      try {
        const db = supabase as any;
        const [{ data: state }, { data: stored }] = await Promise.all([
          db.from("fiscal_dfe_sync_state").select("ult_nsu,max_nsu,last_synced_at,last_status_code").eq("cnpj", cnpj).eq("environment", environment).eq("uf_code", ufCode).maybeSingle(),
          db.from("fiscal_dfe_documents").select("*").eq("cnpj", cnpj).eq("environment", environment).eq("uf_code", ufCode).order("received_at", { ascending: false }).limit(2000),
        ]);
        if (!active) return;
        const sync = (state || null) as SyncState | null;
        setUltNSU(padNsu(sync?.ult_nsu)); setMaxNSU(padNsu(sync?.max_nsu)); setLastSyncedAt(sync?.last_synced_at || null);
        const documents = (stored || []).map(rowToDoc);
        setResult({ ok: true, documents, response: { ultNSU: padNsu(sync?.ult_nsu), maxNSU: padNsu(sync?.max_nsu), cStat: sync?.last_status_code || undefined } });
        setError(sync?.last_status_code === "656" ? "656 · Consulta temporariamente bloqueada pelo Ambiente Nacional. Aguarde 1 hora desde a última tentativa." : "");
      } finally { if (active) setLoadingState(false); }
    };
    void load(); return () => { active = false; };
  }, [cnpj, environment, ufCode]);

  const all = result?.documents || [];
  const periodDocs = useMemo(() => all.filter(doc => {
    if (!doc.issueDate) return month === "all";
    const d = new Date(doc.issueDate);
    if (Number.isNaN(d.getTime())) return true;
    if (d.getFullYear() !== year) return false;
    return month === "all" || d.getMonth() === month;
  }), [all, year, month]);
  const entries = periodDocs.filter(d => d.direction === "entrada" && d.documentKind !== "evento");
  const exits = periodDocs.filter(d => d.direction === "saida");
  const events = periodDocs.filter(d => d.documentKind === "evento" || d.direction === "relacionada");
  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return periodDocs.filter(doc => {
      if (filter === "entrada" && !(doc.direction === "entrada" && doc.documentKind !== "evento")) return false;
      if (filter === "saida" && doc.direction !== "saida") return false;
      if (filter === "evento" && !(doc.documentKind === "evento" || doc.direction === "relacionada")) return false;
      if (!q) return true;
      return [doc.accessKey, doc.issuerName, doc.issuerCnpj, doc.recipientCnpj, doc.number, doc.nsu, doc.schema].some(v => String(v || "").toLowerCase().includes(q));
    });
  }, [periodDocs, filter, query]);

  const fetchDocuments = async () => {
    setLoading(true); setError("");
    try {
      const data = await invoke<DfeResult>("dfe-extractor-native", { engine_token: token, environment, uf_code: ufCode, ult_nsu: ultNSU, certificate_base64: certificateBase64, certificate_password: certificatePassword });
      setResult(data); setUltNSU(padNsu(data.response?.ultNSU || ultNSU)); setMaxNSU(padNsu(data.response?.maxNSU || maxNSU)); setLastSyncedAt(new Date().toISOString());
      if (!data.ok && data.response?.xMotivo) setError(`${data.response.cStat || ""} · ${data.response.xMotivo}`);
    } catch (x) { setError(x instanceof Error ? x.message : "Falha ao consultar documentos fiscais."); }
    finally { setLoading(false); }
  };

  const totalIn = entries.reduce((s,d)=>s+Number(d.value||0),0);
  const totalOut = exits.reduce((s,d)=>s+Number(d.value||0),0);

  return <div className="min-w-0 space-y-4">
    <section className="rounded-2xl border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3"><div className="rounded-xl border bg-muted/30 p-3"><Building2 className="h-5 w-5"/></div><div className="min-w-0"><p className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Empresa selecionada</p><h2 className="mt-1 truncate text-lg font-semibold">{certificate?.nome || "Carregue um certificado A1"}</h2><p className="text-xs text-muted-foreground">{certificate?.cnpj || "—"}</p></div></div>
        <div className="flex flex-wrap gap-2 text-xs"><StatusPill>NF-e</StatusPill><StatusPill>Entradas nacional</StatusPill><StatusPill>Saídas estadual</StatusPill><StatusPill>Certificado válido</StatusPill></div>
      </div>
    </section>

    <section className="rounded-2xl border bg-background p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 border-r pr-4"><CalendarDays className="h-4 w-4 text-muted-foreground"/><button onClick={()=>setYear(y=>y-1)} className="px-2 text-muted-foreground">‹</button><span className="min-w-12 text-center font-semibold">{year}</span><button onClick={()=>setYear(y=>y+1)} className="px-2 text-muted-foreground">›</button></div>
        <button onClick={()=>setMonth("all")} className={`rounded-lg px-3 py-2 text-xs font-medium ${month==="all"?"bg-foreground text-background":"hover:bg-muted"}`}>Ano</button>
        <div className="flex flex-1 flex-wrap gap-1">{MONTHS.map((m,i)=><button key={m} onClick={()=>setMonth(i)} className={`rounded-lg px-3 py-2 text-xs font-medium ${month===i?"bg-foreground text-background":"text-muted-foreground hover:bg-muted hover:text-foreground"}`}>{m}</button>)}</div>
      </div>
    </section>

    <section className="grid gap-3 md:grid-cols-4"><Metric label="Total documentos" value={String(periodDocs.length)} sub="no período"/><Metric label="Entradas" value={String(entries.length)} sub={money(totalIn)}/><Metric label="Saídas" value={String(exits.length)} sub={money(totalOut)}/><Metric label="Eventos / resumos" value={String(events.length)} sub="documentos relacionados"/></section>

    <section className="overflow-hidden rounded-2xl border bg-background">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="flex flex-wrap gap-2">{([['todos','Todos'],['entrada',`Recebidas ${entries.length}`],['saida',`Emitidas ${exits.length}`],['evento',`Eventos ${events.length}`]] as [Filter,string][]).map(([id,label])=><button key={id} onClick={()=>setFilter(id)} className={`rounded-full border px-4 py-2 text-xs font-medium ${filter===id?"bg-foreground text-background":"bg-background hover:bg-muted"}`}>{label}</button>)}</div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5"/>Última busca {dateTime(lastSyncedAt)}</div>
      </div>

      <div className="grid gap-3 border-b p-4 lg:grid-cols-[1fr_150px_150px_auto]">
        <div className="relative"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground"/><Input className="pl-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por nota, chave, empresa, CNPJ ou NSU..."/></div>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={environment} onChange={e=>setEnvironment(e.target.value as any)}><option value="producao">Produção</option><option value="homologacao">Homologação</option></select>
        <select className="h-10 rounded-md border bg-background px-3 text-sm" value={ufCode} onChange={e=>setUfCode(e.target.value)}>{UF_CODES.map(([code,uf])=><option key={code} value={code}>{uf} · {code}</option>)}</select>
        <Button onClick={fetchDocuments} disabled={!hasCert||loading||loadingState}>{loading?<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>:<FileSearch className="mr-2 h-4 w-4"/>}{loading?"Buscando...":"Sincronizar"}</Button>
      </div>

      {error&&<div className="border-b px-4 py-3"><p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p></div>}

      <div className="flex flex-wrap items-center gap-4 border-b bg-muted/10 px-4 py-2 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Database className="h-3.5 w-3.5"/>NSU {ultNSU} / {maxNSU}</span><span>Entradas: Ambiente Nacional</span><span>Saídas: conectores SEFAZ estaduais em implementação</span><span>XMLs nacionais disponíveis por até 90 dias</span></div>

      <div className="overflow-x-auto"><table className="w-full min-w-[1080px] text-left text-sm"><thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Tipo</th><th className="px-4 py-3">Emitente / destinatário</th><th className="px-4 py-3">Valor</th><th className="px-4 py-3">NSU</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody>{docs.length?docs.map((doc,i)=><tr key={`${doc.nsu}-${i}`} className="border-t transition-colors hover:bg-muted/20"><td className="whitespace-nowrap px-4 py-3"><p className="font-medium">{date(doc.issueDate)}</p></td><td className="px-4 py-3"><p className="font-semibold">{doc.number || "—"}{doc.series?` / ${doc.series}`:""}</p><p className="mt-1 max-w-[260px] truncate font-mono text-[10px] text-muted-foreground" title={doc.accessKey}>{doc.accessKey||"—"}</p></td><td className="px-4 py-3"><Badge doc={doc}/></td><td className="px-4 py-3"><p className="max-w-[300px] truncate font-medium">{doc.issuerName||"—"}</p><p className="mt-1 text-xs text-muted-foreground">{doc.issuerCnpj||doc.recipientCnpj||"—"}</p></td><td className="whitespace-nowrap px-4 py-3 font-semibold">{doc.documentKind==='evento'?"—":money(doc.value)}</td><td className="px-4 py-3 font-mono text-xs text-muted-foreground">{doc.nsu||"—"}</td><td className="px-4 py-3"><div className="flex justify-end"><Button size="sm" variant="outline" onClick={()=>setSelected(doc)}><Eye className="mr-2 h-3.5 w-3.5"/>Visualizar</Button></div></td></tr>):<tr><td colSpan={7} className="px-5 py-16 text-center text-sm text-muted-foreground">Nenhum documento para este período/filtro.</td></tr>}</tbody></table></div>
    </section>
    {selected&&<FiscalDocumentPreview doc={selected} onClose={()=>setSelected(null)}/>} 
  </div>;
}

function Badge({doc}:{doc:DfeDocument}) { const event=doc.documentKind==='evento'||doc.direction==='relacionada'; const label=event?'Evento':doc.direction==='saida'?'Emitida':doc.documentKind==='resumo'?'Resumo entrada':'Recebida'; return <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase">{label}</span>; }
function Metric({label,value,sub}:{label:string;value:string;sub:string}) { return <div className="rounded-2xl border bg-background p-4"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground">{sub}</p></div>; }
function StatusPill({children}:{children:React.ReactNode}) { return <span className="rounded-full border bg-muted/20 px-3 py-1.5 font-medium">{children}</span>; }
