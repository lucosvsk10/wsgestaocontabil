import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, ChevronRight, FileKey2, Plus, Search, ShieldCheck, X } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Cert = { id:string; certificate_name:string; holder_cnpj?:string; holder_name?:string; valid_from?:string; valid_until?:string; is_active?:boolean; inspected_at?:string };
type FiscalCompany = {
  id:string; cnpj:string; razao_social:string; nome_fantasia?:string; inscricao_estadual?:string; inscricao_municipal?:string;
  uf?:string; municipio?:string; codigo_municipio?:string; regime_tributario?:string; ambiente_padrao?:"producao"|"homologacao";
  status?:string; endereco?:Record<string,string>; fiscal_certificates?:Cert[];
};

const blankCompany = () => ({ razao_social:"", nome_fantasia:"", cnpj:"", inscricao_estadual:"", inscricao_municipal:"", uf:"AL", municipio:"", codigo_municipio:"", regime_tributario:"simples_nacional", ambiente_padrao:"producao" as const, status:"ativa", endereco:{logradouro:"",numero:"",bairro:"",cep:""} });

async function callVault(body:Record<string,unknown>) {
  const { data, error } = await supabase.functions.invoke("fiscal-company-vault", { body });
  if (!error) return data;
  let message = error.message;
  try { const ctx=(error as {context?:Response}).context; if(ctx) message=(await ctx.clone().json())?.error||message; } catch {}
  throw new Error(message);
}
function digits(v:string){ return String(v||"").replace(/\D/g,""); }
function formatCnpj(v:string){ const d=digits(v); return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"):v; }
function date(v?:string){ if(!v)return "—"; const d=new Date(v+"T12:00:00"); return Number.isNaN(d.getTime())?v:d.toLocaleDateString("pt-BR"); }

export default function AdminFiscalCompanies(){
  const navigate=useNavigate();
  const [companies,setCompanies]=useState<FiscalCompany[]>([]);
  const [loading,setLoading]=useState(true);
  const [query,setQuery]=useState("");
  const [drawerOpen,setDrawerOpen]=useState(false);
  const [editing,setEditing]=useState<FiscalCompany|null>(null);
  const [form,setForm]=useState<any>(blankCompany());
  const [certificateFile,setCertificateFile]=useState<File|null>(null);
  const [certificatePassword,setCertificatePassword]=useState("");
  const [saving,setSaving]=useState(false);
  const [error,setError]=useState("");

  const load=async()=>{ setLoading(true); try{ const data=await callVault({action:"list"}); setCompanies(data.companies||[]); }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setLoading(false);} };
  useEffect(()=>{void load();},[]);

  const filtered=useMemo(()=>companies.filter(c=>[c.razao_social,c.nome_fantasia,c.cnpj,c.municipio].some(v=>String(v||"").toLowerCase().includes(query.toLowerCase()))),[companies,query]);
  const openNew=()=>{setEditing(null);setForm(blankCompany());setCertificateFile(null);setCertificatePassword("");setError("");setDrawerOpen(true);};
  const openEdit=(c:FiscalCompany)=>{setEditing(c);setForm({...blankCompany(),...c,endereco:{...blankCompany().endereco,...(c.endereco||{})}});setCertificateFile(null);setCertificatePassword("");setError("");setDrawerOpen(true);};
  const close=()=>{setDrawerOpen(false);setEditing(null);setForm(blankCompany());setCertificateFile(null);setCertificatePassword("");setError("");};
  const fileToBase64=async(file:File)=>{ const bytes=new Uint8Array(await file.arrayBuffer()); let binary=""; for(let i=0;i<bytes.length;i+=0x8000) binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000)); return btoa(binary); };
  const save=async()=>{
    setSaving(true);setError("");
    try{
      const body:any={ action:"save", company:{...form,id:editing?.id||undefined,cnpj:digits(form.cnpj)} };
      if(certificateFile){ body.certificate_base64=await fileToBase64(certificateFile); body.certificate_password=certificatePassword; body.certificate_name=certificateFile.name; }
      await callVault(body); close(); await load();
    }catch(e){setError(e instanceof Error?e.message:String(e));}finally{setSaving(false);}
  };
  const selectCompany=(c:FiscalCompany)=>{ localStorage.setItem("ws_fiscal_company_id",c.id); localStorage.setItem("ws_fiscal_company_name",c.razao_social); navigate("/admin/feature"); };

  return <AdminLayout><main className="mx-auto w-full max-w-[1480px] px-5 py-6 lg:px-8">
    <div className="flex flex-wrap items-center justify-between gap-4">
      <div><p className="text-[11px] font-semibold uppercase tracking-[.16em] text-muted-foreground">Fiscal</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Empresas</h1><p className="mt-1 text-sm text-muted-foreground">Cadastre empresas e mantenha as credenciais fiscais centralizadas.</p></div>
      <Button onClick={openNew}><Plus className="mr-2 h-4 w-4"/>Nova empresa</Button>
    </div>

    <section className="mt-6 overflow-hidden rounded-2xl border bg-background shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/15 p-4">
        <div className="relative w-full max-w-xl"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar empresa por nome, CNPJ ou município..."/></div>
        <div className="text-xs text-muted-foreground">{filtered.length} empresa(s)</div>
      </div>
      <div className="divide-y">
        {loading?<div className="p-10 text-center text-sm text-muted-foreground">Carregando empresas...</div>:filtered.length?filtered.map(c=>{
          const cert=(c.fiscal_certificates||[]).find(x=>x.is_active) || c.fiscal_certificates?.[0];
          const certValid=!!cert?.valid_until && new Date(cert.valid_until+"T23:59:59")>new Date();
          return <div key={c.id} className="group grid gap-4 p-5 transition hover:bg-muted/10 lg:grid-cols-[minmax(280px,1.4fr)_1fr_1fr_auto] lg:items-center">
            <div className="flex min-w-0 items-center gap-4"><div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border bg-muted/20"><Building2 className="h-5 w-5"/></div><div className="min-w-0"><p className="truncate font-semibold">{c.razao_social}</p><p className="mt-1 text-xs text-muted-foreground">{formatCnpj(c.cnpj)}{c.municipio?` · ${c.municipio}/${c.uf||""}`:""}</p></div></div>
            <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Certificado A1</p>{cert?<div className="mt-1 flex items-center gap-2 text-sm"><span className={`h-2 w-2 rounded-full ${certValid?"bg-emerald-500":"bg-destructive"}`}/><span>{certValid?"Válido":"Vencido"}</span><span className="text-xs text-muted-foreground">até {date(cert.valid_until)}</span></div>:<p className="mt-1 text-sm text-muted-foreground">Não configurado</p>}</div>
            <div><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Integrações</p><div className="mt-1 flex flex-wrap gap-1.5"><Chip>NF-e</Chip><Chip>NFC-e</Chip><Chip>DF-e</Chip></div></div>
            <div className="flex items-center justify-end gap-2"><Button variant="outline" onClick={()=>openEdit(c)}>Configurar</Button><Button onClick={()=>selectCompany(c)}>Notas <ChevronRight className="ml-1 h-4 w-4"/></Button></div>
          </div>;
        }):<div className="p-14 text-center"><Building2 className="mx-auto h-8 w-8 text-muted-foreground"/><p className="mt-3 font-medium">Nenhuma empresa fiscal cadastrada</p><p className="mt-1 text-sm text-muted-foreground">Cadastre a primeira empresa e vincule o certificado A1.</p></div>}
      </div>
    </section>

    {drawerOpen && <div className="fixed inset-0 z-[120] flex justify-end bg-black/45" onMouseDown={e=>{if(e.target===e.currentTarget)close();}}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-background shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-background/95 px-6 py-5 backdrop-blur"><div><p className="text-[10px] uppercase tracking-[.16em] text-muted-foreground">Empresa fiscal</p><h2 className="mt-1 text-xl font-semibold">{editing?"Configurar empresa":"Nova empresa"}</h2></div><Button variant="ghost" size="icon" onClick={close}><X className="h-4 w-4"/></Button></div>
        <div className="space-y-7 p-6">
          <Section title="Dados da empresa" subtitle="Informações utilizadas nas consultas e emissões fiscais.">
            <div className="grid gap-4 sm:grid-cols-2"><Field label="Razão social"><Input value={form.razao_social||""} onChange={e=>setForm({...form,razao_social:e.target.value})}/></Field><Field label="Nome fantasia"><Input value={form.nome_fantasia||""} onChange={e=>setForm({...form,nome_fantasia:e.target.value})}/></Field><Field label="CNPJ"><Input value={form.cnpj||""} onChange={e=>setForm({...form,cnpj:e.target.value})}/></Field><Field label="Inscrição estadual"><Input value={form.inscricao_estadual||""} onChange={e=>setForm({...form,inscricao_estadual:e.target.value})}/></Field><Field label="UF"><Input value={form.uf||""} maxLength={2} onChange={e=>setForm({...form,uf:e.target.value.toUpperCase()})}/></Field><Field label="Município"><Input value={form.municipio||""} onChange={e=>setForm({...form,municipio:e.target.value})}/></Field><Field label="Código IBGE"><Input value={form.codigo_municipio||""} onChange={e=>setForm({...form,codigo_municipio:e.target.value})}/></Field><Field label="Regime tributário"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.regime_tributario||""} onChange={e=>setForm({...form,regime_tributario:e.target.value})}><option value="simples_nacional">Simples Nacional</option><option value="lucro_presumido">Lucro Presumido</option><option value="lucro_real">Lucro Real</option></select></Field></div>
          </Section>
          <Section title="Certificado digital A1" subtitle="O arquivo e a senha são criptografados no backend antes de serem armazenados.">
            {editing?.fiscal_certificates?.find(x=>x.is_active)&&<div className="mb-4 flex items-center justify-between rounded-xl border bg-muted/15 p-4"><div className="flex items-center gap-3"><div className="rounded-lg border bg-background p-2"><FileKey2 className="h-5 w-5"/></div><div><p className="text-sm font-medium">{editing.fiscal_certificates.find(x=>x.is_active)?.certificate_name}</p><p className="text-xs text-muted-foreground">Validade até {date(editing.fiscal_certificates.find(x=>x.is_active)?.valid_until)}</p></div></div><div className="inline-flex items-center gap-1.5 text-xs font-medium"><ShieldCheck className="h-4 w-4"/>Criptografado</div></div>}
            <div className="grid gap-4 sm:grid-cols-[1fr_220px]"><Field label={editing?"Substituir certificado (.pfx/.p12)":"Certificado (.pfx/.p12)"}><Input type="file" accept=".pfx,.p12,application/x-pkcs12" onChange={e=>setCertificateFile(e.target.files?.[0]||null)}/></Field><Field label="Senha do A1"><Input type="password" value={certificatePassword} onChange={e=>setCertificatePassword(e.target.value)} placeholder={editing?"Só informe ao substituir":"Senha"}/></Field></div>
            <div className="mt-4 flex items-start gap-2 rounded-lg border bg-muted/10 p-3 text-xs text-muted-foreground"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0"/><span>A senha não fica disponível para leitura na interface. O backend usa a credencial apenas quando uma operação fiscal exige o certificado.</span></div>
          </Section>
          <Section title="Preferências fiscais" subtitle="Configuração padrão para as consultas desta empresa."><div className="grid gap-4 sm:grid-cols-2"><Field label="Ambiente padrão"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.ambiente_padrao||"producao"} onChange={e=>setForm({...form,ambiente_padrao:e.target.value})}><option value="producao">Produção</option><option value="homologacao">Homologação</option></select></Field><Field label="Status"><select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={form.status||"ativa"} onChange={e=>setForm({...form,status:e.target.value})}><option value="ativa">Ativa</option><option value="inativa">Inativa</option></select></Field></div></Section>
          {error&&<div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>}
        </div>
        <div className="sticky bottom-0 flex justify-end gap-2 border-t bg-background px-6 py-4"><Button variant="outline" onClick={close}>Cancelar</Button><Button onClick={save} disabled={saving}>{saving?"Salvando...":"Salvar empresa"}</Button></div>
      </aside>
    </div>}
  </main></AdminLayout>;
}

function Chip({children}:{children:React.ReactNode}){return <span className="rounded-full border bg-muted/10 px-2 py-1 text-[10px] font-semibold">{children}</span>}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block"><span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>{children}</label>}
function Section({title,subtitle,children}:{title:string;subtitle:string;children:React.ReactNode}){return <section><div className="mb-4"><h3 className="font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{subtitle}</p></div>{children}</section>}
