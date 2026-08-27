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
  ok?: boolean; environment?: string; provider?: string; endpoint?: string; certificate?: CertificateInfo;
  response?: { cStat?: string; xMotivo?: string; dhResp?: string; ultNSU?: string; maxNSU?: string };
  documents?: DfeDocument[]; error?: string; batchCount?: number; newDocuments?: number; retentionDays?: number;
};
type SyncState = { ult_nsu?: string | null; max_nsu?: string | null; last_synced_at?: string | null };
type Filter = "todos" | "entrada" | "saida" | "evento";

const UF_CODES = [["12","AC"],["27","AL"],["16","AP"],["13","AM"],["29","BA"],["23","CE"],["53","DF"],["32","ES"],["52","GO"],["21","MA"],["51","MT"],["50","MS"],["31","MG"],["15","PA"],["25","PB"],["41","PR"],["26","PE"],["22","PI"],["33","RJ"],["24","RN"],["43","RS"],["11","RO"],["14","RR"],["42","SC"],["35","SP"],["28","SE"],["17","TO"]] as const;
const MONTHS = ["Ano","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

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
const dateTime = (v?: string | null) => { if (!v) return "Nunca"; const d = new Date(v); return Number.isNaN(d.getTime()) ? v : d.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }); };
function rowToDoc(row: any): DfeDocument { return { nsu: row.nsu, schema: row.schema_name, documentKind: row.document_kind, fullXml: row.full_xml, direction: row.direction, accessKey: row.access_key, issueDate: row.issue_date, value: Number(row.value || 0), issuerCnpj: row.issuer_cnpj, issuerName: row.issuer_name, recipientCnpj: row.recipient_cnpj, number: row.note_number, series: row.series, statusCode: row.status_code, xml: row.xml, parseError: row.parse_error }; }

export function FiscalExtractorPanel({ token, certificateBase64, certificatePassword, certificate }: { token: string; certificateBase64: string; certificatePassword: string; certificate: CertificateInfo | null }) {
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
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(0);

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
          db.from("fiscal_dfe_sync_state").select("ult_nsu,max_nsu,last_synced_at").eq("cnpj", cnpj).eq("environment", environment).eq("uf_code", ufCode).maybeSingle(),
          db.from("fiscal_dfe_documents").select("*").eq("cnpj", cnpj).eq("environment", environment).eq("uf_code", ufCode).order("received_at", { ascending: false }).limit(2000),
        ]);
        if (!active) return;
        const sync = (state || null) as SyncState | null;
        setUltNSU(padNsu(sync?.ult_nsu)); setMaxNSU(padNsu(sync?.max_nsu)); setLastSyncedAt(sync?.last_synced_at || null);
        const documents = (stored || []).map(rowToDoc);
        setResult({ ok: true, documents, response: { ultNSU: padNsu(sync?.ult_nsu), maxNSU: padNsu(sync?.max_nsu) }, retentionDays: 90 });
        setError("");
      } finally { if (active) setLoadingState(false); }
    };
    void load(); return () => { active = false; };
  }, [cnpj, environment, ufCode]);

  const all = result?.documents || [];
  const periodDocs = useMemo(() => all.filter(doc => {
    if (!doc.issueDate) return month === 0;
    const d = new Date(doc.issueDate);
    if (Number.isNaN(d.getTime())) return month === 0;
    if (d.getFullYear() !== year) return false;
    return month === 0 || d.getMonth() + 1 === month;
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
      setResult(data);
      setUltNSU(padNsu(data.response?.ultNSU || ultNSU)); setMaxNSU(padNsu(data.response?.maxNSU || maxNSU)); setLastSyncedAt(new Date().toISOString());
      if (!data.ok && data.response?.xMotivo) setError(`${data.response.cStat || ""} · ${data.response.xMotivo}`);
    } catch (x) { setError(x instanceof Error ? x.message : "Falha ao consultar documentos fiscais."); }
    finally { setLoading(false); }
  };

  const totalValue = periodDocs.filter(d => d.documentKind !== "evento").reduce((s,d)=>s+Number(d.value||0),0);
  const currentUf = UF_CODES.find(([code]) => code === ufCode)?.[1] || ufCode;

  return <div className="min-w-0 space-y-4">
    <section className="rounded-2xl border bg-background p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-xl border bg-muted/30"><Building2 className="h-5 w-5"/></div>
          <div><p className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Empresa selecionada</p><h2 className="mt-1 text-base font-semibold">{certificate?.nome || "Carregue um certificado A1"}</h2><p className="text-xs text-muted-foreground">{certificate?.cnpj || "CNPJ não identificado"}</p></div>
        </div>
        <div className="flex flex-wrap gap-2 text-[11px]">
          <SourcePill label="NF-e entrada" state="on" />
          <SourcePill label={`NF-e saída · ${currentUf}`} state="building" />
          <SourcePill label={`NFC-e · ${currentUf}`} state="building" />
          <SourcePill label="Certificado válido" state={certificate?.validoAgora === false ? "off" : "on"} />
        </div>
      </div>
    </section>

    <section className="rounded-2xl border bg-background p-3 sm:p-4">
      <div className="flex flex-wrap items-center gap-3">
        <button className="rounded-lg border px-3 py-2 text-sm" onClick={()=>setYear(y=>y-1)}>‹</button>
        <div className="min-w-20 text-center text-xl font-semibold">{year}</div>
        <button className="rounded-lg border px-3 py-2 text-sm" onClick={()=>setYear(y=>y+1)}>›</button>
        <div className="hidden h-8 w-px bg-border sm:block"/>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">{MONTHS.map((label,i)=><button key={label} onClick={()=>setMonth(i)} className={`rounded-lg px-3 py-2 text-xs font-medium transition ${month===i?"bg-foreground text-background":"text-muted-foreground hover:bg-muted"}`}>{label}</button>)}</div>
      </div>
    </section>

    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric label="Total de documentos" value={String(periodDocs.length)} sub={`${MONTHS[month]} ${year}`} />
      <Metric label="Recebidas" value={String(entries.length)} sub={money(entries.reduce((s,d)=>s+Number(d.value||0),0))} />
      <Metric label="Emitidas" value={String(exits.length)} sub={money(exits.reduce((s,d)=>s+Number(d.value||0),0))} />
      <Metric label="Movimentação fiscal" value={money(totalValue)} sub={`${events.length} evento(s) / resumo(s)`} />
    </section>

    <section className="overflow-hidden rounded-2xl border bg-background">
      <div className="border-b p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-[10px] uppercase tracking-[.18em] text-muted-foreground">Monitor fiscal</p><h3 className="mt-1 text-base font-semibold">Notas fiscais</h3></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5"/>Última busca {dateTime(lastSyncedAt)}</div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {([['todos','Todas'],['saida','Emitidas'],['entrada','Recebidas'],['evento','Eventos']] as [Filter,string][]).map(([id,label])=><button key={id} onClick={()=>setFilter(id)} className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${filter===id?"bg-foreground text-background":"bg-background hover:bg-muted"}`}>{label}<span className="ml-2 opacity-60">{id==='todos'?periodDocs.length:id==='saida'?exits.length:id==='entrada'?entries.length:events.length}</span></button>)}
          <div className="ml-auto flex flex-wrap gap-2">
            <select className="h-9 rounded-lg border bg-background px-3 text-xs" value={environment} onChange={e=>setEnvironment(e.target.value as any)}><option value="producao">Produção</option><option value="homologacao">Homologação</option></select>
            <select className="h-9 rounded-lg border bg-background px-3 text-xs" value={ufCode} onChange={e=>setUfCode(e.target.value)}>{UF_CODES.map(([code,uf])=><option key={code} value={code}>{uf} · {code}</option>)}</select>
            <Button size="sm" onClick={fetchDocuments} disabled={!hasCert||loading||loadingState}>{loading?<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>:<FileSearch className="mr-2 h-4 w-4"/>}{loading?"Buscando...":"Atualizar"}</Button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-muted-foreground"><span className="inline-flex items-center gap-1"><Database className="h-3.5 w-3.5"/>NSU {ultNSU} / {maxNSU}</span><span>Entradas: Ambiente Nacional · até 90 dias</span><span>Saídas: conector estadual por UF</span></div>
        {error&&<p className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>

      <div className="border-b p-3 sm:px-5"><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por empresa, CNPJ, chave, número ou NSU..."/></div></div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] text-left text-sm">
          <thead className="bg-muted/30 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Emissão</th><th className="px-4 py-3 font-medium">Nota</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Emitente / Destino</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">NSU</th><th className="px-4 py-3 text-right font-medium">Ações</th></tr></thead>
          <tbody>{docs.length?docs.map((doc,i)=><tr key={`${doc.nsu}-${i}`} className="border-t transition-colors hover:bg-muted/20"><td className="whitespace-nowrap px-4 py-3"><p className="font-medium">{date(doc.issueDate)}</p><p className="mt-1 text-[11px] text-muted-foreground">{doc.statusCode?`Status ${doc.statusCode}`:"Documento fiscal"}</p></td><td className="px-4 py-3"><p className="font-semibold">{doc.number||"—"}{doc.series?` / ${doc.series}`:""}</p><p className="mt-1 max-w-56 truncate font-mono text-[10px] text-muted-foreground" title={doc.accessKey}>{doc.accessKey||doc.schema||"—"}</p></td><td className="px-4 py-3"><Badge doc={doc}/></td><td className="px-4 py-3"><p className="max-w-72 truncate font-medium" title={doc.issuerName}>{doc.issuerName||"—"}</p><p className="mt-1 text-[11px] text-muted-foreground">{doc.direction==='saida'?(doc.recipientCnpj||"Consumidor / destinatário"):(doc.issuerCnpj||"CNPJ não informado")}</p></td><td className="whitespace-nowrap px-4 py-3 font-semibold">{doc.documentKind==='evento'?"—":money(doc.value)}</td><td className="px-4 py-3 font-mono text-[11px]">{doc.nsu||"—"}</td><td className="px-4 py-3 text-right"><Button size="sm" variant="outline" disabled={!doc.xml} onClick={()=>setSelected(doc)}><Eye className="mr-2 h-3.5 w-3.5"/>Visualizar</Button></td></tr>):<tr><td colSpan={7} className="px-5 py-16 text-center"><div className="mx-auto max-w-sm"><CalendarDays className="mx-auto h-7 w-7 text-muted-foreground"/><p className="mt-3 text-sm font-medium">Nenhum documento neste período</p><p className="mt-1 text-xs text-muted-foreground">Troque o mês, atualize a sincronização ou aguarde a próxima captura.</p></div></td></tr>}</tbody>
        </table>
      </div>
    </section>

    <section className="grid gap-3 lg:grid-cols-3">
      <SourceCard title="Recebidas · NF-e" status="Operacional" text="Ambiente Nacional / DistDFe. Sincronização incremental por NSU, com histórico persistente no WS." />
      <SourceCard title={`Emitidas · NF-e · ${currentUf}`} status="Conector estadual" text="Arquitetura separada por UF. Alagoas é o primeiro adaptador de saída em desenvolvimento." />
      <SourceCard title={`Emitidas · NFC-e · ${currentUf}`} status="Conector estadual" text="Consulta estadual/SVRS, separada do DistDFe. O WS vai unificar tudo nesta mesma tabela." />
    </section>

    {selected&&<FiscalDocumentPreview doc={selected} onClose={()=>setSelected(null)}/>} 
  </div>;
}

function Badge({doc}:{doc:DfeDocument}) { const event=doc.documentKind==="evento"||doc.direction==="relacionada"; const label=event?"Evento":doc.direction==="saida"?"Emitida":doc.documentKind==="resumo"?"Resumo":"Recebida"; return <span className="rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide">{label}</span>; }
function Metric({label,value,sub}:{label:string;value:string;sub:string}) { return <div className="rounded-2xl border bg-background px-4 py-4"><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">{label}</p><p className="mt-2 text-xl font-semibold">{value}</p><p className="mt-1 truncate text-xs text-muted-foreground" title={sub}>{sub}</p></div>; }
function SourcePill({label,state}:{label:string;state:"on"|"off"|"building"}) { const text=state==="on"?"ativo":state==="building"?"em integração":"indisponível"; return <span className="rounded-full border bg-muted/20 px-3 py-1.5"><span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-current opacity-60"/>{label} · {text}</span>; }
function SourceCard({title,status,text}:{title:string;status:string;text:string}) { return <div className="rounded-xl border bg-background p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-semibold">{title}</p><span className="rounded-full border px-2 py-1 text-[9px] uppercase tracking-wide text-muted-foreground">{status}</span></div><p className="mt-2 text-xs leading-5 text-muted-foreground">{text}</p></div>; }
