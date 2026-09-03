import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, Loader2, Play, Plus, Search, ShieldAlert, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminEmptyState, AdminLoadingState, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/ui/AdminPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySelection, type OfficeCompanySelection } from '@/contexts/CompanySelectionContext';

type Form = { company_name:string; trade_name:string; cnpj:string; address:string; company_size:string };
type FiscalReadiness = {
  office_company_id:string;
  fiscal_company_id:string|null;
  readiness:'registration_pending'|'not_configured'|'missing_certificate'|'missing_state_credentials'|'ready'|'starting'|'active'|string;
  label:string;
  detail:string;
  can_start:boolean;
  has_valid_certificate:boolean;
  has_state_credentials:boolean;
  purchase_status:string|null;
  sales_status:string|null;
  purchase_documents:number;
  sales_documents:number;
  last_sync_at:string|null;
};

const blank=():Form=>({company_name:'',trade_name:'',cnpj:'',address:'',company_size:''});
const digits=(v:string|null|undefined)=>String(v||'').replace(/\D/g,'');
const formatCnpj=(v:string|null|undefined)=>{const d=digits(v);return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):'Cadastro pendente'};
const initial=(name:string)=>name.trim().charAt(0).toUpperCase()||'?';

async function functionErrorMessage(error: unknown) {
  const fallback = error instanceof Error ? error.message : String(error || 'Erro inesperado');
  try {
    const context = (error as { context?: Response })?.context;
    if (!context) return fallback;
    const payload = await context.clone().json();
    return payload?.error || fallback;
  } catch {
    return fallback;
  }
}

export default function AdminCompanies(){
 const navigate=useNavigate();
 const {companies,loading:companiesLoading,refreshCompanies,selectCompany}=useCompanySelection();
 const [query,setQuery]=useState(''),[open,setOpen]=useState(false),[form,setForm]=useState<Form>(blank()),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const [fiscalStatuses,setFiscalStatuses]=useState<Record<string,FiscalReadiness>>({}),[statusLoading,setStatusLoading]=useState(true);
 const [bootstrapCompany,setBootstrapCompany]=useState<OfficeCompanySelection|null>(null),[starting,setStarting]=useState(false);

 const loadFiscalStatus=async()=>{
  setStatusLoading(true);
  try{
   const {data,error:e}=await supabase.functions.invoke('admin-fiscal-bootstrap',{body:{action:'status'}});
   if(e)throw e;
   const rows=(data?.companies||[]) as FiscalReadiness[];
   setFiscalStatuses(Object.fromEntries(rows.map(row=>[row.office_company_id,row])));
  }catch(e){
   console.error('[AdminCompanies] Falha ao carregar status fiscal',e);
  }finally{setStatusLoading(false)}
 };

 useEffect(()=>{
  void loadFiscalStatus();
  const timer=window.setInterval(()=>void loadFiscalStatus(),30000);
  const onFocus=()=>void loadFiscalStatus();
  window.addEventListener('focus',onFocus);
  return()=>{window.clearInterval(timer);window.removeEventListener('focus',onFocus)};
 },[]);

 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return !q?companies:companies.filter(c=>[c.company_name,c.trade_name,c.cnpj].some(v=>String(v||'').toLowerCase().includes(q)))},[companies,query]);

 const save=async()=>{const cnpj=digits(form.cnpj);if(!form.company_name.trim()||cnpj.length!==14){setError('Informe a razão social e um CNPJ válido.');return}setSaving(true);setError('');const {error:e}=await (supabase as any).from('companies').insert({company_name:form.company_name.trim(),trade_name:form.trade_name.trim()||null,cnpj,address:form.address.trim()||null,company_size:form.company_size.trim()||null});if(e)setError(e.message);else{setOpen(false);setForm(blank());await refreshCompanies();await loadFiscalStatus()}setSaving(false)};
 const openCompany=(company:OfficeCompanySelection)=>{selectCompany(company.id);navigate(`/admin/clientes/${company.id}`)};

 const startBootstrap=async()=>{
  if(!bootstrapCompany)return;
  setStarting(true);setError('');
  try{
   const {data,error:e}=await supabase.functions.invoke('admin-fiscal-bootstrap',{body:{action:'start',company_id:bootstrapCompany.id}});
   if(e)throw e;
   if(!data?.ok)throw new Error(data?.error||'Não foi possível iniciar a extração.');
   setBootstrapCompany(null);
   await loadFiscalStatus();
  }catch(e){setError(await functionErrorMessage(e))}finally{setStarting(false)}
 };

 return <AdminLayout><AdminPage className="ws-admin-polish">
   <AdminPageHeader eyebrow="Clientes" title="Clientes" description="Gerencie os clientes do escritório e acompanhe quem está apto para a extração fiscal." actions={<Button className="ws-stage4-primary-action" onClick={()=>setOpen(true)}><Plus className="mr-2 h-4 w-4"/>Novo cliente</Button>}/>
   <div className="mt-5 flex gap-2 border-b border-border pb-3"><button className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background">Clientes do escritório</button><button onClick={()=>navigate('/admin/assinantes')} className="rounded-md px-4 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground">Assinantes do emissor fiscal</button></div>
   {error&&!open&&<div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
   <div className="mt-6 flex items-center gap-3"><div className="relative w-full max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente por nome ou CNPJ..." className="pl-9"/></div><span className="whitespace-nowrap text-xs text-muted-foreground">{filtered.length} cliente(s)</span></div>
   <AdminSection className="mt-4">
    {companiesLoading?<AdminLoadingState label="Carregando clientes..."/>:filtered.length===0?<AdminEmptyState title="Nenhum cliente encontrado"/>:<div>{filtered.map((c,i)=>{const name=c.trade_name||c.company_name;const fiscal=fiscalStatuses[c.id];const pending=digits(c.cnpj).length!==14;const readiness=fiscal?.readiness||(pending?'registration_pending':'not_configured');return <div key={c.id} role="button" tabIndex={0} onClick={()=>openCompany(c)} onKeyDown={e=>{if(e.key==='Enter')openCompany(c)}} className={`flex w-full cursor-pointer items-center gap-4 border-b px-5 py-4 text-left transition last:border-b-0 ${readiness==='registration_pending'?'border-amber-400/20 bg-amber-500/[.045] hover:bg-amber-500/[.08]':'border-border/45 hover:bg-muted/20'} ${readiness!=='registration_pending'&&(i%2?'bg-muted/[.06]':'bg-card')}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-sm font-semibold ${readiness==='registration_pending'?'border-amber-400/25 bg-amber-500/10 text-amber-500':'border-border/50 bg-muted/35 text-muted-foreground'}`}>{c.logo_url?<img src={c.logo_url} alt="" className="h-full w-full object-contain"/>:initial(name)}</span>
      <span className="min-w-0 flex-1"><span className="flex min-w-0 flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{name}</span><FiscalBadge readiness={readiness} label={fiscal?.label||(pending?'Cadastro pendente':'Fiscal não configurado')} loading={statusLoading&&!fiscal}/></span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{fiscal?.detail||(pending?'Faltam dados obrigatórios para concluir o cadastro.':'Configuração fiscal ainda não vinculada a este cliente.')}</span></span>
      <span className="hidden min-w-[145px] text-right sm:block"><span className="block text-xs text-muted-foreground">{formatCnpj(c.cnpj)}</span>{fiscal?.readiness==='active'&&<span className="mt-1 block text-[10px] text-muted-foreground">{fiscal.purchase_documents} compras · {fiscal.sales_documents} vendas</span>}{fiscal?.can_start&&<button onClick={e=>{e.stopPropagation();setBootstrapCompany(c)}} className="mt-1 inline-flex items-center gap-1 rounded-md border border-emerald-500/25 bg-emerald-500/10 px-2 py-1 text-[10px] font-semibold text-emerald-600 transition hover:bg-emerald-500/15 dark:text-emerald-400"><Play className="h-3 w-3"/>Iniciar extração</button>}</span>
      <span className="text-lg text-muted-foreground/60">›</span>
    </div>})}</div>}
   </AdminSection>

   {bootstrapCompany&&<div className="fixed inset-0 z-[145] grid place-items-center bg-black/55 p-4" onMouseDown={e=>{if(e.target===e.currentTarget&&!starting)setBootstrapCompany(null)}}><div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Primeira extração fiscal</p><h2 className="mt-2 text-xl font-semibold">Buscar notas de {bootstrapCompany.trade_name||bootstrapCompany.company_name}</h2></div><Button variant="ghost" size="icon" disabled={starting} onClick={()=>setBootstrapCompany(null)}><X className="h-4 w-4"/></Button></div><div className="mt-5 rounded-xl border border-border/60 bg-muted/20 p-4"><p className="text-sm leading-6 text-foreground">É a primeira vez que esta empresa será sincronizada. O sistema vai iniciar a busca das notas fiscais de <strong>compra e venda dos últimos 30 dias</strong> e, depois disso, manter a rotina fiscal atualizada automaticamente.</p><p className="mt-2 text-xs leading-5 text-muted-foreground">A disponibilidade efetiva dos documentos de compra também depende do histórico entregue pela distribuição da SEFAZ.</p></div><div className="mt-6 flex justify-end gap-3"><Button variant="outline" disabled={starting} onClick={()=>setBootstrapCompany(null)}>Cancelar</Button><Button disabled={starting} onClick={()=>void startBootstrap()}>{starting?<Loader2 className="mr-2 h-4 w-4 animate-spin"/>:<Play className="mr-2 h-4 w-4"/>}{starting?'Iniciando...':'Iniciar'}</Button></div></div></div>}

   {open&&<div className="fixed inset-0 z-[130] flex justify-end bg-black/45" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><aside className="h-full w-full max-w-lg overflow-y-auto bg-card shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-5"><div><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Cliente do escritório</p><h2 className="mt-1 text-xl font-semibold">Novo cliente</h2></div><Button variant="ghost" size="icon" onClick={()=>setOpen(false)}><X className="h-4 w-4"/></Button></div><div className="space-y-4 p-6"><Field label="Razão social"><Input value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/></Field><Field label="Nome fantasia"><Input value={form.trade_name} onChange={e=>setForm({...form,trade_name:e.target.value})}/></Field><Field label="CNPJ"><Input value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})}/></Field><Field label="Porte"><Input value={form.company_size} onChange={e=>setForm({...form,company_size:e.target.value})}/></Field><Field label="Endereço"><Input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={saving} onClick={()=>void save()}>{saving?'Salvando...':'Criar cliente'}</Button></div></aside></div>}
 </AdminPage></AdminLayout>
}

function FiscalBadge({readiness,label,loading}:{readiness:string;label:string;loading?:boolean}){
 if(loading)return <span className="inline-flex items-center gap-1 rounded-full border border-border/60 bg-muted/30 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin"/>Verificando fiscal</span>;
 if(readiness==='active')return <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400"><CheckCircle2 className="h-3 w-3"/>{label}</span>;
 if(readiness==='ready')return <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400"><Play className="h-3 w-3"/>{label}</span>;
 if(readiness==='starting')return <span className="inline-flex items-center gap-1 rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold text-sky-600 dark:text-sky-400"><Loader2 className="h-3 w-3 animate-spin"/>{label}</span>;
 if(readiness==='registration_pending')return <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500"><AlertTriangle className="h-3 w-3"/>{label}</span>;
 return <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500"><ShieldAlert className="h-3 w-3"/>{label}</span>;
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>}
