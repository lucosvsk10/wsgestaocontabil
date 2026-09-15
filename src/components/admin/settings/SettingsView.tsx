import { useEffect, useMemo, useState } from "react";
import { Activity, CheckCircle2, Clock3, Database, FileCheck2, Lock, LogOut, MonitorCog, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui/AdminPage";

export const SettingsView=()=>{
 const {toast}=useToast();const {signOut,user}=useAuth();
 const [tab,setTab]=useState<'general'|'health'>('general');
 const [newPassword,setNewPassword]=useState(''),[confirm,setConfirm]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const changePassword=async(e:React.FormEvent)=>{e.preventDefault();setError('');if(newPassword.length<8){setError('Use uma senha com pelo menos 8 caracteres.');return}if(newPassword!==confirm){setError('As senhas não conferem.');return}setLoading(true);const {error:authError}=await supabase.auth.updateUser({password:newPassword});if(authError)setError(authError.message);else{setNewPassword('');setConfirm('');toast({title:'Senha alterada',description:'Sua senha foi atualizada com sucesso.'})}setLoading(false)};
 return <div>
  <AdminPageHeader eyebrow="Administração" title="Configurações" description="Preferências do Admin e segurança da sua conta."/>
  <div className="mt-5 flex gap-2 border-b border-border/60"><button onClick={()=>setTab('general')} className={`px-3 py-2 text-sm font-medium ${tab==='general'?'border-b-2 border-primary text-foreground':'text-muted-foreground'}`}>Geral</button><button onClick={()=>setTab('health')} className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium ${tab==='health'?'border-b-2 border-primary text-foreground':'text-muted-foreground'}`}><Activity className="h-4 w-4"/>Saúde do sistema</button></div>
  {tab==='health'?<FiscalHealth/>:<div className="mt-6 grid gap-5 lg:grid-cols-2">
   <AdminSection className="p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/45"><Lock className="h-5 w-5"/></span><div><h2 className="font-semibold">Segurança da conta</h2><p className="text-xs text-muted-foreground">{user?.email}</p></div></div><form onSubmit={changePassword} className="mt-6 space-y-4"><Field label="Nova senha"><Input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></Field><Field label="Confirmar nova senha"><Input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={loading}>{loading?'Salvando...':'Alterar senha'}</Button></form><Button variant="outline" className="mt-3 w-full text-destructive hover:text-destructive" onClick={()=>void signOut()}><LogOut className="mr-2 h-4 w-4"/>Sair da conta</Button></AdminSection>
   <AdminSection className="p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/45"><MonitorCog className="h-5 w-5"/></span><div><h2 className="font-semibold">Aparência</h2><p className="text-xs text-muted-foreground">Escolha o tema do painel administrativo.</p></div></div><div className="mt-6 rounded-xl border border-border/60 bg-muted/10 p-4"><p className="mb-3 text-xs font-medium text-muted-foreground">Tema</p><ThemeToggle/></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Ambiente" value="Produção"/><Info label="Interface" value="Admin v2"/></div></AdminSection>
  </div>}
 </div>
}

type SyncRow={company_id:string;paused?:boolean;status?:string;consecutive_failures?:number;last_status_code?:string;last_status_message?:string;last_started_at?:string;last_completed_at?:string;last_failed_at?:string;last_error?:string;next_scheduled_at?:string;updated_at?:string;latest_number?:number;cursor_number?:number;scanned_numbers?:number;found_documents?:number;reconciliation_total?:number;reconciliation_resolved?:number;reconciliation_pending?:number;reconciliation_complete?:boolean;xml_expected?:number;xml_saved?:number;xml_pending?:number;xml_failed?:number;xml_complete?:boolean;detail_expected?:number;detail_saved?:number;detail_pending?:number;detail_complete?:boolean};
type HealthRow={company_id:string;purchases_status?:string;sales_status?:string;purchases_last_checked_at?:string;sales_last_checked_at?:string;purchases_last_progress_at?:string;sales_last_progress_at?:string;purchases_last_recovery_at?:string;sales_last_recovery_at?:string;purchases_failure_count?:number;sales_failure_count?:number;recovery_count?:number;last_recovery_reason?:string;last_checked_at?:string;updated_at?:string;sales_reconciliation_stall_since?:string;sales_xml_stall_since?:string;sales_detail_stall_since?:string};
type CompanyRow={id:string;cnpj?:string;razao_social?:string;nome_fantasia?:string;status?:string;last_sync_at?:string};
type DocMetric={company_id:string;total:number;full:number;pending:number;last_document_at?:string|null};
type HealthData={purchases:SyncRow[];sales:SyncRow[];health:HealthRow[];companies:CompanyRow[];documents:DocMetric[];generated_at:string;cadence?:{purchases_minutes?:number;sales_hours?:number;watchdog_minutes?:number;xml_backfill_minutes?:number}};

const digits=(v?:string)=>String(v||'').replace(/\D/g,'');
const fmtCnpj=(v?:string)=>{const d=digits(v);return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):v||'—'};
const fmtDate=(v?:string|null)=>v?new Date(v).toLocaleString('pt-BR',{dateStyle:'short',timeStyle:'short'}):'—';
const ageMinutes=(v?:string|null,now=Date.now())=>{if(!v)return Infinity;const n=new Date(v).getTime();return Number.isFinite(n)?Math.max(0,(now-n)/60000):Infinity};
const isOkStatus=(status?:string)=>!status||['idle','ok','healthy','success','completed','ready'].includes(status.toLowerCase());

function FiscalHealth(){
 const [loading,setLoading]=useState(true),[error,setError]=useState(''),[data,setData]=useState<HealthData|null>(null);
 const load=async()=>{setLoading(true);setError('');const {data:result,error:fnError}=await supabase.functions.invoke('admin-fiscal-health');if(fnError||result?.error)setError(result?.error||fnError?.message||'Falha ao carregar a saúde fiscal');else setData(result as HealthData);setLoading(false)};
 useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),60000);return()=>window.clearInterval(timer)},[]);
 const model=useMemo(()=>{
  if(!data)return null;
  const now=new Date(data.generated_at).getTime()||Date.now();
  const companies=new Map(data.companies.map(c=>[c.id,c]));
  const purchases=new Map(data.purchases.map(r=>[r.company_id,r]));
  const sales=new Map(data.sales.map(r=>[r.company_id,r]));
  const health=new Map(data.health.map(r=>[r.company_id,r]));
  const documents=new Map(data.documents.map(r=>[r.company_id,r]));
  const ids=[...new Set([...purchases.keys(),...sales.keys()])];
  const rows=ids.map(id=>{
   const p=purchases.get(id),s=sales.get(id),h=health.get(id),d=documents.get(id),c=companies.get(id);
   const purchaseFresh=ageMinutes(p?.last_completed_at||p?.updated_at,now)<=Math.max(30,(data.cadence?.purchases_minutes||10)*3);
   const salesFresh=ageMinutes(s?.last_completed_at||s?.updated_at,now)<=Math.max(240,(data.cadence?.sales_hours||3)*60+60);
   const watchdogFresh=ageMinutes(h?.last_checked_at||h?.updated_at,now)<=Math.max(30,(data.cadence?.watchdog_minutes||10)*3);
   const purchaseProblem=Boolean(p?.paused||p?.last_error||(p?.consecutive_failures||0)>0||!isOkStatus(p?.status)||!purchaseFresh);
   const salesProblem=Boolean(s?.paused||s?.last_error||!isOkStatus(s?.status)||!salesFresh||h?.sales_reconciliation_stall_since||h?.sales_xml_stall_since||h?.sales_detail_stall_since);
   const watchdogProblem=Boolean(h&&!watchdogFresh);
   const state=purchaseProblem||salesProblem||watchdogProblem?'attention':'ok';
   return {id,c,p,s,h,d,state,purchaseFresh,salesFresh,watchdogFresh};
  });
  const totalDocs=rows.reduce((sum,r)=>sum+(r.d?.total||0),0),fullDocs=rows.reduce((sum,r)=>sum+(r.d?.full||0),0),pendingDocs=rows.reduce((sum,r)=>sum+(r.d?.pending||0),0);
  const purchaseOk=rows.filter(r=>r.p&&!r.p.paused&&!r.p.last_error&&(r.p.consecutive_failures||0)===0&&isOkStatus(r.p.status)&&r.purchaseFresh).length;
  const salesOk=rows.filter(r=>r.s&&!r.s.paused&&!r.s.last_error&&isOkStatus(r.s.status)&&r.salesFresh&&!r.h?.sales_reconciliation_stall_since&&!r.h?.sales_xml_stall_since&&!r.h?.sales_detail_stall_since).length;
  const warnings=rows.filter(r=>r.state==='attention').length;
  return {rows,totalDocs,fullDocs,pendingDocs,purchaseOk,salesOk,warnings};
 },[data]);

 if(loading&&!data)return <div className="mt-6 flex items-center gap-2 py-10 text-sm text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin"/>Carregando saúde do sistema…</div>;
 return <div className="mt-6 space-y-5">
  {error&&<div className="flex items-center justify-between gap-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"><span>{error}</span><Button variant="outline" size="sm" onClick={()=>void load()}><RefreshCw className="mr-2 h-4 w-4"/>Tentar novamente</Button></div>}
  {data&&model&&<>
   <AdminSection className="overflow-hidden p-0"><div className={`flex flex-col gap-4 px-5 py-5 sm:flex-row sm:items-center sm:justify-between ${model.warnings===0?'bg-emerald-500/[.06]':'bg-amber-500/[.07]'}`}><div className="flex items-start gap-3">{model.warnings===0?<CheckCircle2 className="mt-0.5 h-6 w-6 text-emerald-600"/>:<TriangleAlert className="mt-0.5 h-6 w-6 text-amber-600"/>}<div><h2 className="text-lg font-semibold">{model.warnings===0?'Sistema fiscal operando normalmente':`${model.warnings} empresa(s) precisam de atenção`}</h2><p className="mt-1 text-sm text-muted-foreground">Monitoramento de buscas, sincronização, documentos integrais e respostas dos serviços fiscais.</p></div></div><div className="flex items-center gap-3"><span className="text-xs text-muted-foreground">Atualizado {fmtDate(data.generated_at)}</span><Button variant="outline" size="sm" disabled={loading} onClick={()=>void load()}><RefreshCw className={`mr-2 h-4 w-4 ${loading?'animate-spin':''}`}/>Atualizar</Button></div></div></AdminSection>
   <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <HealthKpi icon={<Database className="h-4 w-4"/>} label="Empresas monitoradas" value={String(model.rows.length)} detail="com rotina fiscal ativa"/>
    <HealthKpi icon={<Activity className="h-4 w-4"/>} label="Buscas de compras" value={`${model.purchaseOk}/${model.rows.filter(r=>r.p).length}`} detail="em dia no ciclo automático" good={model.purchaseOk===model.rows.filter(r=>r.p).length}/>
    <HealthKpi icon={<Clock3 className="h-4 w-4"/>} label="Buscas de vendas" value={`${model.salesOk}/${model.rows.filter(r=>r.s).length}`} detail="sem atraso ou travamento" good={model.salesOk===model.rows.filter(r=>r.s).length}/>
    <HealthKpi icon={<FileCheck2 className="h-4 w-4"/>} label="Documentos integrais" value={`${model.fullDocs}/${model.totalDocs}`} detail={model.pendingDocs?`${model.pendingDocs} aguardando XML integral`:'nenhum documento pendente'} good={model.pendingDocs===0}/>
   </div>
   <AdminSection className="p-5"><div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.14em] text-muted-foreground">Por empresa</p><h2 className="mt-1 text-lg font-semibold">Estado das rotinas fiscais</h2></div><p className="text-xs text-muted-foreground">Compras a cada ~{data.cadence?.purchases_minutes||10} min · vendas a cada ~{data.cadence?.sales_hours||3} h · watchdog a cada ~{data.cadence?.watchdog_minutes||10} min</p></div><div className="mt-5 space-y-3">{model.rows.map(row=><CompanyHealth key={row.id} row={row}/>)}</div></AdminSection>
  </>}
 </div>
}

function CompanyHealth({row}:{row:any}){
 const {c,p,s,h,d,state,purchaseFresh,salesFresh,watchdogFresh}=row;
 const name=c?.razao_social||c?.nome_fantasia||`Empresa ${row.id.slice(0,8)}`;
 const purchaseText=p?.paused?'Pausada':p?.last_error?'Erro recente':!purchaseFresh?'Atrasada':(p?.consecutive_failures||0)>0?`${p.consecutive_failures} falha(s) seguida(s)`:isOkStatus(p?.status)?'Em dia':p?.status||'Sem status';
 const salesText=s?.paused?'Pausada':s?.last_error?'Erro recente':!salesFresh?'Atrasada':h?.sales_reconciliation_stall_since?'Reconciliação parada':h?.sales_xml_stall_since?'XML parado':h?.sales_detail_stall_since?'Detalhamento parado':isOkStatus(s?.status)?'Em dia':s?.status||'Sem status';
 const externalError=p?.last_error||p?.last_status_message||s?.last_error||'';
 return <div className="rounded-2xl border border-border/60 bg-muted/[.08] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex items-center gap-2"><StatusIcon ok={state==='ok'}/><p className="font-semibold">{name}</p></div><p className="mt-1 text-xs text-muted-foreground">{fmtCnpj(c?.cnpj)}</p></div><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${state==='ok'?'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300':'bg-amber-500/10 text-amber-700 dark:text-amber-300'}`}>{state==='ok'?'Tudo certo':'Verificar'}</span></div>
  <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
   <MiniStatus label="Compras" value={purchaseText} ok={Boolean(p)&&!p?.paused&&!p?.last_error&&(p?.consecutive_failures||0)===0&&purchaseFresh&&isOkStatus(p?.status)} detail={`Última conclusão: ${fmtDate(p?.last_completed_at||p?.updated_at)}`}/>
   <MiniStatus label="Vendas" value={salesText} ok={Boolean(s)&&!s?.paused&&!s?.last_error&&salesFresh&&isOkStatus(s?.status)&&!h?.sales_reconciliation_stall_since&&!h?.sales_xml_stall_since&&!h?.sales_detail_stall_since} detail={`Última conclusão: ${fmtDate(s?.last_completed_at||s?.updated_at)}`}/>
   <MiniStatus label="Documentos" value={`${d?.full||0}/${d?.total||0} integrais`} ok={(d?.pending||0)===0} detail={(d?.pending||0)>0?`${d.pending} aguardando arquivo integral`:`Último documento: ${fmtDate(d?.last_document_at)}`}/>
   <MiniStatus label="Watchdog" value={watchdogFresh?'Monitorando':'Sem atualização recente'} ok={watchdogFresh} detail={`Última checagem: ${fmtDate(h?.last_checked_at||h?.updated_at)}`}/>
  </div>
  <div className="mt-3 grid gap-3 lg:grid-cols-2"><div className="rounded-xl bg-background/70 px-3 py-2.5 text-xs"><span className="text-muted-foreground">Retorno fiscal:</span> <b>{p?.last_status_code?`cStat ${p.last_status_code}`:'sem erro recente'}</b>{p?.last_status_message&&<span className="ml-2 text-muted-foreground">{p.last_status_message}</span>}</div><div className="rounded-xl bg-background/70 px-3 py-2.5 text-xs"><span className="text-muted-foreground">Vendas:</span> <b>{s?.reconciliation_pending??0} pendente(s) na reconciliação</b><span className="ml-2 text-muted-foreground">· XML {s?.xml_saved??0}/{s?.xml_expected??0}</span></div></div>
  {externalError&&(p?.last_error||s?.last_error)&&<div className="mt-3 rounded-xl border border-red-200/70 bg-red-50 px-3 py-2.5 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-950/20 dark:text-red-300"><b>Último erro:</b> {p?.last_error||s?.last_error}</div>}
  {(h?.last_recovery_reason||h?.recovery_count)&&<p className="mt-3 text-[11px] text-muted-foreground">Recuperações automáticas: {h?.recovery_count||0}{h?.last_recovery_reason?` · última ação: ${h.last_recovery_reason}`:''}</p>}
 </div>
}

function HealthKpi({icon,label,value,detail,good}:{icon:React.ReactNode;label:string;value:string;detail:string;good?:boolean}){return <AdminSection className="p-4"><div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">{icon}{label}</div><p className={`mt-2 text-2xl font-semibold ${good===false?'text-amber-600':''}`}>{value}</p><p className="mt-1 text-xs text-muted-foreground">{detail}</p></AdminSection>}
function MiniStatus({label,value,detail,ok}:{label:string;value:string;detail:string;ok:boolean}){return <div className="rounded-xl border border-border/50 bg-background/65 p-3"><div className="flex items-center justify-between gap-2"><p className="text-[10px] font-semibold uppercase tracking-[.12em] text-muted-foreground">{label}</p><StatusIcon ok={ok}/></div><p className={`mt-1.5 text-sm font-semibold ${ok?'':'text-amber-700 dark:text-amber-300'}`}>{value}</p><p className="mt-1 text-[11px] text-muted-foreground">{detail}</p></div>}
function StatusIcon({ok}:{ok:boolean}){return ok?<CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600"/>:<TriangleAlert className="h-4 w-4 shrink-0 text-amber-600"/>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-border/55 bg-muted/10 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>}
