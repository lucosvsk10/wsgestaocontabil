import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Clock3, Database, Download, FileSearch, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type CertificateInfo = { cnpj?: string | null; cpf?: string | null; nome?: string | null; validadeFim?: string; validoAgora?: boolean };
type DfeDocument = {
  nsu?: string; schema?: string; fullXml?: boolean; direction?: "entrada" | "saida" | "relacionada";
  accessKey?: string; issueDate?: string; value?: number; issuerCnpj?: string; issuerName?: string;
  recipientCnpj?: string; number?: string; series?: string; statusCode?: string; xml?: string; parseError?: string;
};
type DfeResult = {
  ok?: boolean; environment?: string; provider?: string; endpoint?: string; certificate?: CertificateInfo;
  response?: { cStat?: string; xMotivo?: string; dhResp?: string; ultNSU?: string; maxNSU?: string };
  documents?: DfeDocument[]; error?: string;
};
type SyncState = {
  ult_nsu?: string | null;
  max_nsu?: string | null;
  last_status_code?: string | null;
  last_status_message?: string | null;
  last_synced_at?: string | null;
};

const UF_CODES = [
  ["12","AC"],["27","AL"],["16","AP"],["13","AM"],["29","BA"],["23","CE"],["53","DF"],["32","ES"],["52","GO"],["21","MA"],["51","MT"],["50","MS"],["31","MG"],["15","PA"],["25","PB"],["41","PR"],["26","PE"],["22","PI"],["33","RJ"],["24","RN"],["43","RS"],["11","RO"],["14","RR"],["42","SC"],["35","SP"],["28","SE"],["17","TO"],
] as const;

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

function money(value?: number) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function date(value?: string) {
  if (!value) return "—";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleDateString("pt-BR");
}
function dateTime(value?: string | null) {
  if (!value) return "Ainda não sincronizado";
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}
function onlyDigits(value?: string | null) {
  return String(value || "").replace(/\D/g, "");
}
function padNsu(value?: string | null) {
  return onlyDigits(value || "0").padStart(15, "0").slice(-15);
}
function downloadXml(doc: DfeDocument) {
  if (!doc.xml) return;
  const blob = new Blob([doc.xml], { type: "application/xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${doc.accessKey || doc.nsu || "documento-fiscal"}.xml`;
  a.click();
  URL.revokeObjectURL(url);
}

export function FiscalExtractorPanel({ token, certificateBase64, certificatePassword, certificate }: {
  token: string;
  certificateBase64: string;
  certificatePassword: string;
  certificate: CertificateInfo | null;
}) {
  const [environment, setEnvironment] = useState<"producao" | "homologacao">("producao");
  const [ufCode, setUfCode] = useState("27");
  const [ultNSU, setUltNSU] = useState("000000000000000");
  const [maxNSU, setMaxNSU] = useState("000000000000000");
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const [loadingState, setLoadingState] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DfeResult | null>(null);
  const [direction, setDirection] = useState<"todos" | "entrada" | "saida">("todos");
  const [query, setQuery] = useState("");

  const hasCert = Boolean(certificateBase64 && certificatePassword);
  const cnpj = onlyDigits(certificate?.cnpj);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (cnpj.length !== 14) {
        setUltNSU("000000000000000");
        setMaxNSU("000000000000000");
        setLastSyncedAt(null);
        return;
      }
      setLoadingState(true);
      try {
        const db = supabase as any;
        const { data } = await db.from("fiscal_dfe_sync_state")
          .select("ult_nsu,max_nsu,last_status_code,last_status_message,last_synced_at")
          .eq("cnpj", cnpj)
          .eq("environment", environment)
          .eq("uf_code", ufCode)
          .maybeSingle();
        if (!active) return;
        const state = (data || null) as SyncState | null;
        setUltNSU(padNsu(state?.ult_nsu));
        setMaxNSU(padNsu(state?.max_nsu));
        setLastSyncedAt(state?.last_synced_at || null);
        setResult(null);
        setError("");
      } finally {
        if (active) setLoadingState(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [cnpj, environment, ufCode]);

  const docs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (result?.documents || []).filter(doc => {
      if (direction !== "todos" && doc.direction !== direction) return false;
      if (!q) return true;
      return [doc.accessKey, doc.issuerName, doc.issuerCnpj, doc.recipientCnpj, doc.number, doc.nsu].some(v => String(v || "").toLowerCase().includes(q));
    });
  }, [result, direction, query]);

  const entries = (result?.documents || []).filter(d => d.direction === "entrada");
  const exits = (result?.documents || []).filter(d => d.direction === "saida");
  const status137 = result?.response?.cStat === "137";
  const status138 = result?.response?.cStat === "138";
  const caughtUp = Boolean(result && padNsu(result.response?.ultNSU) === padNsu(result.response?.maxNSU));

  const persistSyncState = async (data: DfeResult) => {
    if (cnpj.length !== 14) return;
    const now = new Date().toISOString();
    const nextUlt = padNsu(data.response?.ultNSU || ultNSU);
    const nextMax = padNsu(data.response?.maxNSU || maxNSU);
    const db = supabase as any;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await db.from("fiscal_dfe_sync_state").upsert({
      user_id: user.id,
      cnpj,
      environment,
      uf_code: ufCode,
      ult_nsu: nextUlt,
      max_nsu: nextMax,
      last_status_code: data.response?.cStat || null,
      last_status_message: data.response?.xMotivo || null,
      last_synced_at: now,
      updated_at: now,
    }, { onConflict: "user_id,cnpj,environment,uf_code" });
    setUltNSU(nextUlt);
    setMaxNSU(nextMax);
    setLastSyncedAt(now);
  };

  const fetchDocuments = async () => {
    setLoading(true); setError("");
    try {
      const data = await invoke<DfeResult>("dfe-extractor-native", {
        engine_token: token,
        environment,
        uf_code: ufCode,
        ult_nsu: ultNSU,
        certificate_base64: certificateBase64,
        certificate_password: certificatePassword,
      });
      setResult(data);
      await persistSyncState(data);
      if (!data.ok && data.response?.xMotivo) setError(`${data.response.cStat || ""} · ${data.response.xMotivo}`);
    } catch (x) {
      setError(x instanceof Error ? x.message : "Falha ao consultar documentos fiscais.");
    } finally { setLoading(false); }
  };

  return <div className="min-w-0 space-y-5">
    <section className="grid min-w-0 gap-3 md:grid-cols-3">
      <Mini label="Fonte oficial" value="Ambiente Nacional NF-e" />
      <Mini label="Conexão" value="A1 via bridge fiscal seguro" />
      <Mini label="Custo por documento" value="R$ 0,00" />
    </section>

    <section className="min-w-0 overflow-hidden rounded-xl border bg-background">
      <div className="border-b bg-muted/20 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Distribuição DF-e</p>
            <h2 className="mt-1 text-lg font-semibold">Extrator de notas</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">Sincroniza os documentos vinculados ao CNPJ do certificado e continua automaticamente do último NSU salvo.</p>
          </div>
          {certificate?.cnpj && <div className="rounded-lg border bg-background px-3 py-2 text-right"><p className="text-[10px] uppercase text-muted-foreground">Empresa conectada</p><p className="mt-1 text-sm font-medium">{certificate.nome || "Certificado A1"}</p><p className="mt-0.5 text-xs text-muted-foreground">{certificate.cnpj}</p></div>}
        </div>
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid min-w-0 gap-4 lg:grid-cols-[220px_220px_minmax(280px,1fr)_auto] lg:items-end">
          <Field label="Ambiente"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={environment} onChange={e=>setEnvironment(e.target.value as "producao"|"homologacao")}><option value="producao">Produção · notas reais</option><option value="homologacao">Homologação</option></select></Field>
          <Field label="UF do autor"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={ufCode} onChange={e=>setUfCode(e.target.value)}>{UF_CODES.map(([code,uf])=><option value={code} key={code}>{uf} · {code}</option>)}</select></Field>
          <Field label="Checkpoint de sincronização"><div className="flex h-10 items-center rounded-md border bg-muted/20 px-3 font-mono text-sm"><Database className="mr-2 h-4 w-4 text-muted-foreground" />{loadingState ? "Carregando..." : ultNSU}</div></Field>
          <Button onClick={fetchDocuments} disabled={!hasCert || loading || loadingState}>{loading ? <RefreshCw className="mr-2 h-4 w-4 animate-spin"/> : <FileSearch className="mr-2 h-4 w-4"/>}{loading ? "Sincronizando..." : "Sincronizar agora"}</Button>
        </div>
        {!hasCert && <p className="mt-3 text-xs text-muted-foreground">Carregue o certificado A1 na área de credencial acima para liberar a consulta.</p>}
        <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5"><Clock3 className="h-3.5 w-3.5" />Última sincronização: {dateTime(lastSyncedAt)}</span>
          <span>O NSU é salvo automaticamente por CNPJ. Você não precisa preencher ou guardar esse número.</span>
        </div>
        {error && <p className="mt-4 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</p>}
      </div>
    </section>

    {result && <>
      {(status137 || status138) && <section className="rounded-xl border bg-background p-4 sm:p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 rounded-full border bg-muted/30 p-2"><CheckCircle2 className="h-5 w-5" /></div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{status137 ? "Sincronização concluída" : "Novos documentos recebidos"}</h3><span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">RETORNO {result.response?.cStat}</span></div>
            <p className="mt-1 text-sm text-muted-foreground">{status137 ? "O Ambiente Nacional respondeu normalmente e não há novos documentos disponíveis para este CNPJ neste momento." : `O Ambiente Nacional retornou ${result.documents?.length || 0} documento(s) neste lote.`}</p>
            {caughtUp && <p className="mt-2 text-xs font-medium">Checkpoint atualizado · sincronização em dia com o NSU máximo informado pelo governo.</p>}
          </div>
        </div>
      </section>}

      <section className="grid min-w-0 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Mini label="Documentos neste lote" value={String(result.documents?.length || 0)} />
        <Mini label="Entradas" value={`${entries.length} · ${money(entries.reduce((s,d)=>s+Number(d.value||0),0))}`} />
        <Mini label="Saídas" value={`${exits.length} · ${money(exits.reduce((s,d)=>s+Number(d.value||0),0))}`} />
        <Mini label="Progresso NSU" value={`${padNsu(result.response?.ultNSU)} / ${padNsu(result.response?.maxNSU)}`} />
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border bg-background">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4 sm:p-5">
          <div><p className="text-xs uppercase text-muted-foreground">Documentos fiscais</p><h3 className="mt-1 font-semibold">{(result.documents?.length || 0) > 0 ? "Documentos encontrados" : "Nenhum documento novo"}</h3><p className="mt-1 text-xs text-muted-foreground">{result.response?.cStat} · {result.response?.xMotivo || "Retorno do Ambiente Nacional"}</p></div>
          <div className="flex flex-wrap gap-2">
            {(["todos","entrada","saida"] as const).map(id=><button key={id} onClick={()=>setDirection(id)} className={`rounded-md border px-3 py-2 text-xs font-medium ${direction===id?"bg-foreground text-background":"bg-background hover:bg-muted"}`}>{id === "todos" ? "Todos" : id === "entrada" ? "Entradas" : "Saídas"}</button>)}
          </div>
        </div>
        {(result.documents?.length || 0) > 0 && <div className="border-b p-4 sm:px-5"><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por chave, empresa, CNPJ, número ou NSU..." /></div>}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-left text-sm">
            <thead className="bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Emissão</th><th className="px-4 py-3 font-medium">Nota</th><th className="px-4 py-3 font-medium">Emitente</th><th className="px-4 py-3 font-medium">Valor</th><th className="px-4 py-3 font-medium">NSU</th><th className="px-4 py-3 font-medium">XML</th></tr></thead>
            <tbody>{docs.length ? docs.map((doc,i)=><tr key={`${doc.nsu}-${i}`} className="border-t hover:bg-muted/20">
              <td className="px-4 py-3"><span className="rounded-full border px-2 py-1 text-[10px] font-semibold uppercase">{doc.direction === "entrada" ? "Entrada" : doc.direction === "saida" ? "Saída" : "Relacionada"}</span></td>
              <td className="px-4 py-3 whitespace-nowrap">{date(doc.issueDate)}</td>
              <td className="px-4 py-3"><p className="font-medium">{doc.number ? `${doc.number}${doc.series ? ` / ${doc.series}` : ""}` : "—"}</p><p className="mt-1 max-w-[250px] truncate text-xs text-muted-foreground" title={doc.accessKey}>{doc.accessKey || doc.schema || "—"}</p></td>
              <td className="px-4 py-3"><p className="max-w-[280px] truncate font-medium" title={doc.issuerName}>{doc.issuerName || "—"}</p><p className="mt-1 text-xs text-muted-foreground">{doc.issuerCnpj || "—"}</p></td>
              <td className="px-4 py-3 whitespace-nowrap font-medium">{money(doc.value)}</td>
              <td className="px-4 py-3 font-mono text-xs">{doc.nsu || "—"}</td>
              <td className="px-4 py-3"><Button size="sm" variant="outline" disabled={!doc.xml} onClick={()=>downloadXml(doc)}><Download className="mr-2 h-3.5 w-3.5"/>XML</Button></td>
            </tr>) : <tr><td colSpan={7} className="px-5 py-14 text-center"><div className="mx-auto max-w-md"><CheckCircle2 className="mx-auto h-7 w-7 text-muted-foreground"/><p className="mt-3 font-medium">Tudo sincronizado por aqui</p><p className="mt-1 text-sm text-muted-foreground">Quando houver novos documentos fiscais disponíveis para este CNPJ, eles aparecerão nesta tabela.</p></div></td></tr>}</tbody>
          </table>
        </div>
      </section>
    </>}
  </div>;
}

function Field({label,children}:{label:string;children:React.ReactNode}) { return <div className="min-w-0"><label className="mb-2 block text-xs font-medium text-muted-foreground">{label}</label>{children}</div>; }
function Mini({label,value}:{label:string;value:string}) { return <div className="min-w-0 rounded-xl border bg-background px-4 py-3"><p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-medium" title={value}>{value}</p></div>; }
