import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Plus, Search, X } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminEmptyState, AdminLoadingState, AdminPage, AdminPageHeader, AdminSection } from '@/components/admin/ui/AdminPage';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useCompanySelection } from '@/contexts/CompanySelectionContext';

type Company = { id:string; cnpj:string|null; company_name:string; trade_name:string|null; address:string|null; company_size:string|null; logo_url?:string|null; created_at:string; };
type Form = { company_name:string; trade_name:string; cnpj:string; address:string; company_size:string };
const blank=():Form=>({company_name:'',trade_name:'',cnpj:'',address:'',company_size:''});
const digits=(v:string|null|undefined)=>String(v||'').replace(/\D/g,'');
const formatCnpj=(v:string|null|undefined)=>{const d=digits(v);return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,'$1.$2.$3/$4-$5'):'Cadastro pendente'};
const initial=(name:string)=>name.trim().charAt(0).toUpperCase()||'?';

export default function AdminCompanies(){
 const navigate=useNavigate();
 const {refreshCompanies,selectCompany}=useCompanySelection();
 const [companies,setCompanies]=useState<Company[]>([]),[query,setQuery]=useState(''),[loading,setLoading]=useState(true),[open,setOpen]=useState(false),[form,setForm]=useState<Form>(blank()),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const load=async()=>{setLoading(true);setError('');const {data,error}=await (supabase as any).from('companies').select('id,cnpj,company_name,trade_name,address,company_size,logo_url,created_at').order('company_name');if(error)setError(error.message);else setCompanies((data||[]) as Company[]);setLoading(false)};
 useEffect(()=>{void load()},[]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return !q?companies:companies.filter(c=>[c.company_name,c.trade_name,c.cnpj].some(v=>String(v||'').toLowerCase().includes(q)))},[companies,query]);
 const save=async()=>{const cnpj=digits(form.cnpj);if(!form.company_name.trim()||cnpj.length!==14){setError('Informe a razão social e um CNPJ válido.');return}setSaving(true);setError('');const {error:e}=await (supabase as any).from('companies').insert({company_name:form.company_name.trim(),trade_name:form.trade_name.trim()||null,cnpj,address:form.address.trim()||null,company_size:form.company_size.trim()||null});if(e)setError(e.message);else{setOpen(false);setForm(blank());await Promise.all([load(),refreshCompanies()])}setSaving(false)};
 const openCompany=(company:Company)=>{selectCompany(company.id);navigate(`/admin/clientes/${company.id}`)};
 return <AdminLayout><AdminPage>
   <AdminPageHeader eyebrow="Clientes do escritório" title="Clientes" description="Cada empresa existe uma única vez no sistema. Clique em uma empresa para abrir seu cadastro completo." actions={<Button onClick={()=>setOpen(true)}><Plus className="mr-2 h-4 w-4"/>Novo cliente</Button>}/>
   {error&&!open&&<div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
   <div className="mt-6 flex items-center gap-3"><div className="relative w-full max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar cliente por nome ou CNPJ..." className="pl-9"/></div><span className="whitespace-nowrap text-xs text-muted-foreground">{filtered.length} cliente(s)</span></div>
   <AdminSection className="mt-4">
    {loading?<AdminLoadingState label="Carregando clientes..."/>:filtered.length===0?<AdminEmptyState title="Nenhum cliente encontrado"/>:<div>{filtered.map((c,i)=>{const name=c.trade_name||c.company_name;const pending=digits(c.cnpj).length!==14;return <button key={c.id} onClick={()=>openCompany(c)} className={`flex w-full items-center gap-4 border-b px-5 py-4 text-left transition last:border-b-0 ${pending?'border-amber-400/20 bg-amber-500/[.045] hover:bg-amber-500/[.08]':'border-border/45 hover:bg-muted/20'} ${!pending&&(i%2?'bg-muted/[.06]':'bg-card')}`}>
      <span className={`flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border text-sm font-semibold ${pending?'border-amber-400/25 bg-amber-500/10 text-amber-500':'border-border/50 bg-muted/35 text-muted-foreground'}`}>{c.logo_url?<img src={c.logo_url} alt="" className="h-full w-full object-contain"/>:initial(name)}</span>
      <span className="min-w-0 flex-1"><span className="flex min-w-0 flex-wrap items-center gap-2"><span className="truncate text-sm font-semibold">{name}</span>{pending&&<span className="inline-flex items-center gap-1 rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-500"><AlertTriangle className="h-3 w-3"/>Cadastro pendente</span>}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{pending?'Faltam dados obrigatórios para concluir o cadastro.':c.company_name}</span></span>
      <span className={`hidden text-xs sm:block ${pending?'font-medium text-amber-500':'text-muted-foreground'}`}>{formatCnpj(c.cnpj)}</span>
      <span className="text-lg text-muted-foreground/60">›</span>
    </button>})}</div>}
   </AdminSection>
   {open&&<div className="fixed inset-0 z-[130] flex justify-end bg-black/45" onMouseDown={e=>{if(e.target===e.currentTarget)setOpen(false)}}><aside className="h-full w-full max-w-lg overflow-y-auto bg-card shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b border-border bg-card px-6 py-5"><div><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Cliente do escritório</p><h2 className="mt-1 text-xl font-semibold">Novo cliente</h2></div><Button variant="ghost" size="icon" onClick={()=>setOpen(false)}><X className="h-4 w-4"/></Button></div><div className="space-y-4 p-6"><Field label="Razão social"><Input value={form.company_name} onChange={e=>setForm({...form,company_name:e.target.value})}/></Field><Field label="Nome fantasia"><Input value={form.trade_name} onChange={e=>setForm({...form,trade_name:e.target.value})}/></Field><Field label="CNPJ"><Input value={form.cnpj} onChange={e=>setForm({...form,cnpj:e.target.value})}/></Field><Field label="Porte"><Input value={form.company_size} onChange={e=>setForm({...form,company_size:e.target.value})}/></Field><Field label="Endereço"><Input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></Field>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={saving} onClick={()=>void save()}>{saving?'Salvando...':'Criar cliente'}</Button></div></aside></div>}
 </AdminPage></AdminLayout>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>}
