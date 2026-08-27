import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Database, Download, FileSearch, Info, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

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
function downloadXml(doc: DfeDocument) { if (!doc.xml) return; const blob = new Blob([doc.xml], { type: "application/xml;charset=utf-8" }); const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = `${doc.accessKey || doc.nsu || "documento-fiscal"}.xml`; a.click(); URL.revokeObjectURL(url); }
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
          db.from("fiscal_dfe_documents").select("*").eq("cnpj", cnpj).eq("environment", environment).eq("uf_code", ufCode).order("received_at", { ascending: false }).limit(1000),
        ]);
        if (!active) return;
        const sync = (state || null) as SyncState | null;
        setUltNSU(padNsu(sync?.ult_nsu)); setMaxNSU(padNsu(sync?.max_nsu)); setLastSyncedAt(sync?.last_synced_at || null);
        const documents = (stored || []).map(rowToDoc);
        setResult(documents.length ? { ok: true, documents, response: { ultNSU: padNsu(sync?.ult_nsu), maxNSU: padNsu(sync?.max_nsu) }, retentionDays: 90 } : null);
        setError("");
      } finally { if (active) setLoadingState(false); }
    };
    void load(); return () => { active = false; };
  }, [cnpj, environment, ufCode]);

  const all = result?.documents || [];
  const entries = all.filter(d => d.direction === "entrada" && d.documentKind !== "evento");
  const exits = all.filter(d => d.direction === "saida");
  const events = all.filter(d => d.documentKind === "evento" || d.direction === "relacionada");
  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return all.filter(doc => {
      if (filter === "entrada" && !(doc.direction === "entrada" && doc.documentKind !== "evento")) return false;
      if (filter === "saida" && doc.direction !== "saida") return false;
      if (filter === "evento" && !(doc.documentKind === "evento" || doc.direction === "relacionada")) return false;
      if (!q) return true;
      return [doc.accessKey, doc.issuerName, doc.issuerCnpj, doc.recipientCnpj, doc.number, doc.nsu, doc.schema].some(v => String(v || "").toLowerCase().includes(q));
    });
  }, [all, filter, query]);

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

  const caughtUp = Boolean(result && padNsu(result.response?.ultNSU || ultNSU) === padNsu(result.response?.maxNSU || maxNSU));

  return <div className="min-w-0 space-y-5">
    <section className="grid gap-3 md:grid-cols-3"><Mini label="Fonte oficial" value="Ambiente Nacional NF-e"/><Mini label="Conexão" value="A1 via bridge fiscal seguro"/><Mini label="Custo por documento" value="R$ 0,00"/></section>

    <section className="overflow-hidden rounded-xl border bg-background">
      <div className="border-b bg-muted/20 p-4 sm:p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-muted-foreground">Distribuição DF-e</p><h2 className="mt-1 text-lg font-semibold">Extrator de notas</h2><p className="mt-1 max-w-2xl text-sm text-muted-foreground">Sincroniza compras e documentos de interesse do CNPJ e mantém o histórico local salvo.</p></div>{certificate?.cnpj&&<div className="rounded-lg border bg-background px-3 py-2 text-right"><p className="text-[10px] uppercase text-muted-foreground">Empresa conectada</p><p className="mt-1 text-sm font-medium">{certificate.nome||"Certificado A1"}</p><p className="mt-0.5 text-xs text-muted-foreground">{certificate.cnpj}</p></div>}</div></div>
      <div className="p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-[220px_220px_minmax(280px,1fr)_auto] lg:items-end">
          <Field label="Ambiente"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={environment} onChange={e=>setEnvironment(e.target.value as any)}><option value="producao">Produção · notas reais</option><option value="homologacao">Homologação</option></select></Field>
          <Field label="UF do autor"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={ufCode} onChange={e=>setUfCode(e.target.value)}>{UF_CODES.map(([code,uf])=><option key={code} value={code}>{uf} · {code}</option>)}</select></Field>
          <Field label="Checkpoint de sincronização"><div className="flex h-10 items-center rounded-md border bg-muted/20 px-3 font-mono text-sm"><Database className="mr-2 h-4 w-4 text-muted-foreground"/>{loadingState?"Carregando...":ultNSU}</div></Field>
          <Button onClick={fetchDocuments} disabled={!hasCert||loading||loadingState}>{loading?<RefreshCw className="mr-2 h-4 w-4 animate-spin"/>:<FileSearch className="mr-2 h-4 w-4"/>}{loading?"Sincronizando...":"Sincronizar agora"}</Button>
        </div>
        <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"><span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5"/>Última sincronização: {dateTime(lastSyncedAt)}</span><span>Checkpoint salvo automaticamente por CNPJ.</span><span>Ambiente Nacional: documentos disponíveis por até 90 dias.</span></div>
        {error&&<p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>
    </section>

    <section className="rounded-xl border bg-muted/10 p-4 sm:p-5"><div className="flex gap-3"><Info className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground"/><div><p className="text-sm font-medium">Como entradas e vendas são montadas</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Compras/entradas vêm do Ambiente Nacional. O serviço oficial não redistribui para a empresa os documentos que ela própria gerou; por isso as saídas emitidas pelo WS são guardadas automaticamente no momento da autorização. Vendas antigas emitidas em outro sistema precisam ser importadas por XML/arquivo fiscal.</p></div></div></section>

    {result&&<>
      <section className="rounded-xl border bg-background p-4 sm:p-5"><div className="flex items-start gap-3"><div className="rounded-full border bg-muted/30 p-2"><CheckCircle2 className="h-5 w-5"/></div><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">Sincronização concluída</h3>{result.response?.cStat&&<span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">RETORNO {result.response.cStat}</span>}</div><p className="mt-1 text-sm text-muted-foreground">{result.newDocuments ? `${result.newDocuments} documento(s) recebidos nesta sincronização.` : "Histórico carregado e nenhum documento novo pendente."}</p>{caughtUp&&<p className="mt-2 text-xs font-medium">Em dia com o NSU máximo informado pelo governo.</p>}</div></div></section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Mini label="Histórico sincronizado" value={String(all.length)}/><Mini label="Entradas" value={`${entries.length} · ${money(entries.reduce((s,d)=>s+Number(d.value||0),0))}`}/><Mini label="Saídas do WS" value={`${exits.length} · ${money(exits.reduce((s,d)=>s+Number(d.value||0),0))}`}/><Mini label="Eventos / resumos" value={String(events.length)}/></section>

      <section className="overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5"><div><p className="text-xs uppercase text-muted-foreground">Documentos fiscais</p><h3 className="mt-1 font-semibold">Histórico da empresa</h3><p className="mt-1 text-xs text-muted-foreground">NSU {ultNSU} / {maxNSU}</p></div><div className="flex flex-wrap gap-2">{([['todos','Todos'],['entrada','Entradas'],['saida','Saídas'],['evento','Eventos']] as [Filter,string][]).map(([id,label])=><button key={id} onClick={()=>setFilter(id)} className={`rounded-md border px-3 py-2 text-xs font-medium ${filter===id?"bg-foreground text-background":"bg-background hover:bg-muted"}`}>{label}</button>)}</div></div>
        <div className="border-b p-4 sm:px-5"><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por chave, empresa, CNPJ, número ou NSU..."/></div>
        <div className="overflow-x-auto"><table className="w-full min-w-[1050px] text-left text-sm"><thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Emissão</th><th className="px-4 py-3 font-medium">Nota / chave</th><th className="px-4 py-3 font-medium">Emitente</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">NSU</th><th className="px-4 py-3 font-medium">XML</th></tr></thead><tbody>{docs.length?docs.map((doc,i)=><tr key={`${doc.nsu}-${i}`} className="border-t transition-colors hover:bg-muted/20"><td className="px-4 py-3"><Badge doc={doc}/></td><td className="whitespace-nowrap px-4 py-3">{date(doc.issueDate)}</td><td className="px-4 py-3"><p className="font-medium">{doc.number?`${doc.number}${doc.series?` / ${doc.series}`:""}`:doc.documentKind==='evento'?"Evento fiscal":"—"}</p><p className="mt-1 max-w-[290px] truncate text-xs text-muted-foreground" title={doc.accessKey}>{doc.accessKey||doc.schema||"—"}</p></td><td className="px-4 py-3"><p className="max-w-[280px] truncate font-medium" title={doc.issuerName}>{doc.issuerName||"—"}</p><p className="mt-1 text-xs text-muted-foreground">{doc.issuerCnpj||"—"}</p></td><td className="whitespace-nowrap px-4 py-3 font-medium">{doc.documentKind==='evento'?"—":money(doc.value)}</td><td className="px-4 py-3 font-mono text-xs">{doc.nsu||"—"}</td><td className="px-4 py-3"><Button size="sm" variant="outline" disabled={!doc.xml} onClick={()=>downloadXml(doc)}><Download className="mr-2 h-3.5 w-3.5"/>XML</Button></td></tr>):<tr><td colSpan={7} className="px-5 py-14 text-center text-sm text-muted-foreground">Nenhum documento neste filtro.</td></tr>}</tbody></table></div>
      </section>
    </>}
  </div>;
}

function Badge({doc}:{doc:DfeDocument}) { const event = doc.documentKind === "evento" || doc.direction === "relacionada"; const label = event ? "Evento" : doc.direction === "saida" ? "Saída WS" : doc.documentKind === "resumo" ? "Resumo entrada" : "Entrada"; return <span className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase">{label}</span>; }
function Field({label,children}:{label:string;children:React.ReactNode}) { return <div className="min-w-0"><label className="mb-2 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>; }
function Mini({label,value}:{label:string;value:string}) { return <div className="min-w-0 rounded-xl border bg-background px-4 py-3"><p className="text-[10px] uppercase text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium" title={value}>{value}</p></div>; }
