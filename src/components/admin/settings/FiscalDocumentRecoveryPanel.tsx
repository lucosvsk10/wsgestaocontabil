import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Clock3, FileText, Loader2, RefreshCw, Search, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { AdminSection } from "@/components/admin/ui/AdminPage";

type RecoveryRun={
  id:string;status:"running"|"completed"|"partial"|"cancelled";window_start:string;window_end:string;
  total:number;processed:number;ready:number;requires_manifestation:number;failed:number;created_at:string;finished_at?:string|null;
};
type RecoveryItem={
  id:string;company_id:string;document_id:string;access_key?:string|null;note_number?:string|null;series?:string|null;model?:string|null;
  direction?:string|null;issue_date?:string|null;position:number;status:"queued"|"searching_xml"|"generating_danfe"|"ready"|"requires_manifestation"|"retry"|"failed";
  message?:string|null;attempts:number;pdf_verified:boolean;company?:{razao_social?:string|null;nome_fantasia?:string|null;cnpj?:string|null}|null;
};
type RecoveryData={ok?:boolean;run:RecoveryRun|null;items:RecoveryItem[];error?:string};

const fmtDate=(value?:string|null)=>value?new Date(value).toLocaleString("pt-BR",{dateStyle:"short",timeStyle:"short"}):"—";
const fmtDay=(value?:string|null)=>value?new Date(value).toLocaleDateString("pt-BR"):"—";
const label=(status:RecoveryItem["status"])=>({
  queued:"Aguardando",searching_xml:"Buscando XML",generating_danfe:"Validando DANFE",ready:"XML + DANFE prontos",
  requires_manifestation:"Manifestação necessária",retry:"Nova tentativa",failed:"Falhou",
}[status]);

async function invoke(body:Record<string,unknown>){
  const {data,error}=await supabase.functions.invoke("admin-fiscal-document-recovery",{body});
  if(error)throw error;
  if(data?.error)throw new Error(String(data.error));
  return data as RecoveryData;
}

export function FiscalDocumentRecoveryPanel({onChanged}:{onChanged?:()=>void}){
  const [data,setData]=useState<RecoveryData>({run:null,items:[]});
  const [loading,setLoading]=useState(true),[starting,setStarting]=useState(false),[stepping,setStepping]=useState(false),[error,setError]=useState("");
  const mounted=useRef(true);
  const load=async(runId?:string)=>{try{const next=await invoke({action:"status",...(runId?{run_id:runId}:{})});if(mounted.current)setData(next)}catch(e){if(mounted.current)setError(e instanceof Error?e.message:String(e))}finally{if(mounted.current)setLoading(false)}};

  useEffect(()=>{mounted.current=true;void load();return()=>{mounted.current=false}},[]);
  useEffect(()=>{
    if(data.run?.status!=="running")return;
    const timer=window.setInterval(()=>void load(data.run?.id),1800);
    return()=>window.clearInterval(timer);
  },[data.run?.id,data.run?.status]);
  useEffect(()=>{
    if(data.run?.status!=="running"||stepping)return;
    const timer=window.setTimeout(async()=>{
      setStepping(true);
      try{const next=await invoke({action:"step",run_id:data.run!.id});if(mounted.current){setData(next);if(next.run?.status!=="running")onChanged?.()}}
      catch(e){if(mounted.current)setError(e instanceof Error?e.message:String(e))}
      finally{if(mounted.current)setStepping(false)}
    },350);
    return()=>window.clearTimeout(timer);
  },[data.run?.id,data.run?.status,data.run?.processed,stepping,onChanged]);

  const start=async()=>{setStarting(true);setError("");try{const next=await invoke({action:"start"});setData(next);onChanged?.()}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setStarting(false)}};
  const current=useMemo(()=>data.items.find(x=>x.status==="searching_xml"||x.status==="generating_danfe")||data.items.find(x=>x.status==="queued"||x.status==="retry"),[data.items]);
  const running=data.run?.status==="running";

  return <AdminSection className="p-5">
    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
      <div><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">Recuperação de documentos</p><h2 className="mt-1 text-lg font-semibold">Buscar XML e DANFE pendentes</h2><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Busca as notas da mais recente para a mais antiga, limitada ao mês atual e ao mês anterior. Cada documento é acompanhado individualmente até o XML integral e o DANFE serem validados.</p></div>
      <Button onClick={()=>void start()} disabled={starting||running} className="shrink-0">{starting||running?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Search className="mr-2 h-4 w-4"/>}{running?"Buscando documentos...":data.run?"Buscar novamente":"Buscar XML e DANFE"}</Button>
    </div>

    {error&&<div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"><span>{error}</span><Button variant="outline" size="sm" onClick={()=>void load(data.run?.id)}><RefreshCw className="mr-2 h-4 w-4"/>Atualizar</Button></div>}

    {loading&&!data.run?<div className="mt-5 flex items-center gap-2 py-6 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Carregando fila de documentos...</div>:data.run?<>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <Metric label="Período" value={`${fmtDay(data.run.window_start)} → hoje`}/><Metric label="Fila" value={String(data.run.total)}/><Metric label="Concluídos" value={`${data.run.ready}/${data.run.total}`}/><Metric label="Manifestação" value={String(data.run.requires_manifestation)}/><Metric label="Falhas" value={String(data.run.failed)}/>
      </div>
      {current&&running&&<div className="mt-4 flex items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm"><Loader2 className="h-4 w-4 shrink-0 animate-spin"/><div className="min-w-0"><b>{label(current.status)}</b><span className="ml-2 text-muted-foreground">NF-e {current.note_number||"—"}{current.series?` · série ${current.series}`:""} · {fmtDay(current.issue_date)}</span></div></div>}
      {data.items.length?<div className="mt-4 max-h-[430px] overflow-auto rounded-xl border border-border/60"><div className="divide-y divide-border/60">{data.items.map(item=><RecoveryItemRow key={item.id} item={item}/>)}</div></div>:<div className="mt-4 rounded-xl border border-emerald-200/70 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:text-emerald-300"><CheckCircle2 className="mr-2 inline h-4 w-4"/>Nenhuma nota pendente dentro do período obrigatório.</div>}
    </>:<div className="mt-5 rounded-xl border border-border/60 bg-muted/10 px-4 py-4 text-sm text-muted-foreground">Nenhuma busca manual executada ainda.</div>}
  </AdminSection>
}

function Metric({label:caption,value}:{label:string;value:string}){return <div className="rounded-xl border border-border/55 bg-muted/10 p-3"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{caption}</p><p className="mt-1 text-sm font-semibold">{value}</p></div>}

function RecoveryItemRow({item}:{item:RecoveryItem}){
  const active=item.status==="searching_xml"||item.status==="generating_danfe"||item.status==="retry";
  const ok=item.status==="ready";
  const warn=item.status==="requires_manifestation"||item.status==="failed";
  const company=item.company?.razao_social||item.company?.nome_fantasia||"Empresa fiscal";
  return <div className="grid gap-3 bg-background px-4 py-3 md:grid-cols-[minmax(0,1.15fr)_minmax(0,.8fr)_minmax(0,1.35fr)] md:items-center">
    <div className="min-w-0"><div className="flex items-center gap-2"><FileText className="h-4 w-4 shrink-0 text-muted-foreground"/><p className="truncate text-sm font-semibold">{String(item.model)==="65"?"NFC-e":"NF-e"} {item.note_number||"—"}{item.series?` · Série ${item.series}`:""}</p></div><p className="mt-1 truncate text-[11px] text-muted-foreground">{company} · {fmtDate(item.issue_date)}</p></div>
    <div className="flex items-center gap-2">{ok?<CheckCircle2 className="h-4 w-4 text-emerald-600"/>:active?<Loader2 className="h-4 w-4 animate-spin text-primary"/>:warn?<TriangleAlert className="h-4 w-4 text-amber-600"/>:<Clock3 className="h-4 w-4 text-muted-foreground"/>}<span className={`text-xs font-semibold ${ok?"text-emerald-700 dark:text-emerald-300":warn?"text-amber-700 dark:text-amber-300":""}`}>{label(item.status)}</span></div>
    <div className="min-w-0"><p className="text-xs text-muted-foreground">{item.message||"—"}</p>{item.access_key&&<p className="mt-1 truncate font-mono text-[10px] text-muted-foreground/70">{item.access_key}</p>}</div>
  </div>
}
