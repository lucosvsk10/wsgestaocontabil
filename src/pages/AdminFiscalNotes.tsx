import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Building2, CalendarDays, CheckCircle2, ChevronDown, Download, FileText, RefreshCw, Search, ShieldCheck } from "lucide-react";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { FiscalDocumentPreview } from "@/components/admin/fiscal/FiscalDocumentPreview";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

type Company={id:string;cnpj:string;razao_social:string;nome_fantasia?:string;uf?:string;ambiente_padrao?:"producao"|"homologacao";last_sync_at?:string;fiscal_certificates?:{valid_until?:string;is_active?:boolean}[]};
type Doc={nsu?:string;schema?:string;documentKind?:"nfe"|"resumo"|"evento"|"documento";fullXml?:boolean;direction?:"entrada"|"saida"|"relacionada";accessKey?:string;issueDate?:string;value?:number;issuerCnpj?:string;issuerName?:string;recipientCnpj?:string;number?:string;series?:string;statusCode?:string;xml?:string;parseError?:string};
type Filter="saida"|"entrada"|"todos"|"cancelada";
const months=["Ano","Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const monthIndex:Record<string,number>={Jan:0,Fev:1,Mar:2,Abr:3,Mai:4,Jun:5,Jul:6,Ago:7,Set:8,Out:9,Nov:10,Dez:11};
const money=(v:number)=>Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const cnpj=(v:string)=>{const d=String(v||"").replace(/\D/g,"");return d.length===14?d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5"):v};
const date=(v?:string)=>{if(!v)return "—";const d=new Date(v);return Number.isNaN(d.getTime())?v:d.toLocaleDateString("pt-BR")};
const time=(v?:string)=>{if(!v)return "";const d=new Date(v);return Number.isNaN(d.getTime())?"":d.toLocaleTimeString("pt-BR",{hour:"2-digit",minute:"2-digit"})};
function rowToDoc(r:any):Doc{return{nsu:r.nsu,schema:r.schema_name,documentKind:r.document_kind,fullXml:r.full_xml,direction:r.direction,accessKey:r.access_key,issueDate:r.issue_date,value:Number(r.value||0),issuerCnpj:r.issuer_cnpj,issuerName:r.issuer_name,recipientCnpj:r.recipient_cnpj,number:r.note_number,series:r.series,statusCode:r.status_code,xml:r.xml,parseError:r.parse_error}}
async function vaultList(){const{data,error}=await supabase.functions.invoke("fiscal-company-vault",{body:{action:"list"}});if(error)throw error;return(data?.companies||[]) as Company[]}

export default function AdminFiscalNotes(){
  const navigate=useNavigate();
  const [companies,setCompanies]=useState<Company[]>([]);
  const [company,setCompany]=useState<Company|null>(null);
  const [docs,setDocs]=useState<Doc[]>([]);
  const [year,setYear]=useState(new Date().getFullYear());
  const [month,setMonth]=useState(months[new Date().getMonth()+1]);
  const [filter,setFilter]=useState<Filter>("saida");
  const [query,setQuery]=useState("");
  const [loading,setLoading]=useState(true);
  const [syncing,setSyncing]=useState(false);
  const [error,setError]=useState("");
  const [selected,setSelected]=useState<Doc|null>(null);

  const loadCompanies=async()=>{const list=await vaultList();setCompanies(list);const saved=localStorage.getItem("ws_fiscal_company_id");const chosen=list.find(x=>x.id===saved)||list[0]||null;setCompany(chosen);if(chosen)localStorage.setItem("ws_fiscal_company_id",chosen.id)};
  const loadDocs=async(c:Company|null)=>{if(!c){setDocs([]);return;}const db=supabase as any;const{data,error}=await db.from("fiscal_dfe_documents").select("*").eq("cnpj",String(c.cnpj).replace(/\D/g,"")).eq("environment",c.ambiente_padrao||"producao").order("issue_date",{ascending:false}).limit(3000);if(error)throw error;setDocs((data||[]).map(rowToDoc));};
  useEffect(()=>{(async()=>{setLoading(true);try{await loadCompanies();}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setLoading(false)}})()},[]);
  useEffect(()=>{if(company)void loadDocs(company).catch(e=>setError(e instanceof Error?e.message:String(e)));},[company?.id]);

  const periodDocs=useMemo(()=>docs.filter(d=>{if(!d.issueDate)return month==="Ano";const dt=new Date(d.issueDate);if(dt.getFullYear()!==year)return false;if(month!=="Ano"&&dt.getMonth()!==monthIndex[month])return false;return true;}),[docs,year,month]);
  const emitted=periodDocs.filter(d=>d.direction==="saida");
  const received=periodDocs.filter(d=>d.direction==="entrada"&&d.documentKind!=="evento");
  const cancelled=periodDocs.filter(d=>["101","135","155"].includes(String(d.statusCode||"")));
  const filtered=useMemo(()=>periodDocs.filter(d=>{if(filter==="saida"&&d.direction!=="saida")return false;if(filter==="entrada"&&d.direction!=="entrada")return false;if(filter==="cancelada"&&!cancelled.includes(d))return false;const q=query.trim().toLowerCase();if(!q)return true;return[d.number,d.accessKey,d.issuerName,d.issuerCnpj,d.recipientCnpj,d.nsu].some(v=>String(v||"").toLowerCase().includes(q));}),[periodDocs,filter,query]);
  const cert=company?.fiscal_certificates?.find(x=>x.is_active)||company?.fiscal_certificates?.[0];
  const certValid=!!cert?.valid_until&&new Date(cert.valid_until+"T23:59:59")>new Date();

  const sync=async()=>{if(!company)return;setSyncing(true);setError("");try{const{data,error}=await supabase.functions.invoke("dfe-extractor-native",{body:{company_id:company.id,environment:company.ambiente_padrao||"producao"}});if(error){let m=error.message;try{const ctx=(error as any).context;if(ctx)m=(await ctx.clone().json())?.error||m;}catch{}throw new Error(m)}await loadDocs(company);const list=await vaultList();setCompanies(list);setCompany(list.find(x=>x.id===company.id)||company);if(data?.response?.cStat==="656")setError("Consumo temporariamente bloqueado pelo Ambiente Nacional. Aguarde o intervalo indicado antes de sincronizar novamente.");}catch(e){setError(e instanceof Error?e.message:String(e))}finally{setSyncing(false)}};
  const choose=(id:string)=>{const c=companies.find(x=>x.id===id)||null;setCompany(c);if(c)localStorage.setItem("ws_fiscal_company_id",c.id)};

  return <AdminLayout><main className="mx-auto w-full max-w-[1560px] px-4 py-5 lg:px-7">
    {!loading&&!company?<section className="mx-auto mt-20 max-w-xl rounded-2xl border bg-background p-10 text-center"><Building2 className="mx-auto h-8 w-8"/><h1 className="mt-4 text-xl font-semibold">Cadastre uma empresa fiscal</h1><p className="mt-2 text-sm text-muted-foreground">A área de notas usa o certificado e as configurações cadastradas em Empresas.</p><Button className="mt-6" onClick={()=>navigate("/admin/fiscal/empresas")}>Ir para Empresas</Button></section>:<>
      <section className="rounded-2xl border bg-background shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex min-w-0 items-center gap-4"><div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border bg-muted/20"><Building2 className="h-5 w-5"/></div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Empresa selecionada</p><div className="mt-1 flex items-center gap-2"><select className="max-w-[520px] bg-transparent text-lg font-semibold outline-none" value={company?.id||""} onChange={e=>choose(e.target.value)}>{companies.map(c=><option className="bg-background" key={c.id} value={c.id}>{c.razao_social}</option>)}</select><ChevronDown className="h-4 w-4 text-muted-foreground"/></div><p className="text-xs text-muted-foreground">{cnpj(company?.cnpj||"")}</p></div></div>
          <div className="flex flex-wrap items-center gap-2"><Pill>NF-e</Pill><Pill>NFC-e</Pill><Pill>NF-e ent.</Pill><Pill>NFS-e ent.</Pill><span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${certValid?"border-emerald-500/30 bg-emerald-500/5":"border-destructive/30 bg-destructive/5"}`}><ShieldCheck className="h-3.5 w-3.5"/>{certValid?"Certificado válido":"Certificado pendente"}</span></div>
        </div>
      </section>

      <section className="mt-5 rounded-2xl border bg-background shadow-sm">
        <div className="flex flex-wrap items-center gap-3 px-5 py-4"><button onClick={()=>setYear(y=>y-1)} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted">‹</button><span className="min-w-16 text-xl font-semibold">{year}</span><button onClick={()=>setYear(y=>y+1)} className="rounded-lg px-2 py-1 text-muted-foreground hover:bg-muted">›</button><div className="mx-2 hidden h-8 w-px bg-border lg:block"/><div className="flex flex-1 flex-wrap gap-1">{months.map(m=><button key={m} onClick={()=>setMonth(m)} className={`min-w-12 rounded-xl px-3 py-2 text-sm font-medium transition ${month===m?"bg-foreground text-background shadow-sm":"text-muted-foreground hover:bg-muted"}`}>{m}</button>)}</div><Button variant="outline" className="rounded-full"><CalendarDays className="mr-2 h-4 w-4"/>Personalizado</Button></div>
      </section>

      <section className="mt-3 grid gap-3 md:grid-cols-4"><Kpi label="Total notas" value={String(periodDocs.filter(d=>d.documentKind!=="evento").length)}/><Kpi label="Com XML" value={`${periodDocs.filter(d=>d.fullXml&&d.xml).length}  ${periodDocs.length?Math.round(periodDocs.filter(d=>d.fullXml&&d.xml).length/periodDocs.length*100):0}%`}/><Kpi label="Sem XML" value={String(periodDocs.filter(d=>!d.fullXml).length)}/><Kpi label="Faturamento" value={money(emitted.reduce((s,d)=>s+Number(d.value||0),0))} sub={`Recebidas: ${money(received.reduce((s,d)=>s+Number(d.value||0),0))}`}/></section>

      <section className="mt-3 overflow-hidden rounded-2xl border bg-background shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3"><div className="flex flex-wrap gap-2"><FilterPill active={filter==="saida"} onClick={()=>setFilter("saida")}>↗ Emitidas <b>{emitted.length}</b></FilterPill><FilterPill active={filter==="entrada"} onClick={()=>setFilter("entrada")}>↙ Recebidas <b>{received.length}</b></FilterPill><FilterPill active={filter==="todos"} onClick={()=>setFilter("todos")}>Todas <b>{periodDocs.length}</b></FilterPill><FilterPill active={filter==="cancelada"} onClick={()=>setFilter("cancelada")}>⊘ Canceladas <b>{cancelled.length}</b></FilterPill><Pill>Série 1</Pill></div><div className="text-xs text-muted-foreground">Última busca: {company?.last_sync_at?`${date(company.last_sync_at)} ${time(company.last_sync_at)}`:"ainda não sincronizada"}</div></div>
        <div className="flex items-center gap-2 border-b p-4"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><Input className="pl-9" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar por número, chave, empresa, CNPJ ou NSU..."/></div><Button variant="outline" size="icon" onClick={sync} disabled={syncing}>{syncing?<RefreshCw className="h-4 w-4 animate-spin"/>:<RefreshCw className="h-4 w-4"/>}</Button><Button variant="outline"><Download className="mr-2 h-4 w-4"/>Download</Button></div>
        {error&&<div className="border-b border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
        <div className="overflow-x-auto"><table className="w-full min-w-[1120px] text-left text-sm"><thead className="bg-muted/25 text-[11px] uppercase tracking-wide text-muted-foreground"><tr><th className="px-4 py-3">Emissão</th><th className="px-4 py-3">Download XML</th><th className="px-4 py-3">Nota</th><th className="px-4 py-3">Destinatário / Emitente</th><th className="px-4 py-3">Operação</th><th className="px-4 py-3 text-right">Valor</th><th className="px-4 py-3 text-right">Ações</th></tr></thead><tbody>{filtered.length?filtered.slice(0,50).map((d,i)=><tr key={`${d.nsu}-${i}`} className="border-t transition hover:bg-muted/10"><td className="px-4 py-3"><p className="font-semibold">{date(d.issueDate)}</p><p className="text-xs text-muted-foreground">{time(d.issueDate)}</p></td><td className="px-4 py-3"><p>{d.fullXml?date(d.issueDate):"—"}</p><p className="text-xs text-muted-foreground">{d.fullXml?time(d.issueDate):"Sem XML completo"}</p></td><td className="px-4 py-3"><div className="flex items-center gap-2"><b>{d.number||"—"}</b><span className="text-xs text-muted-foreground">/ {d.series||"1"}</span><span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold">{d.direction==="saida"?"NF-e":"NF-e ent."}</span></div><p className="mt-1 max-w-40 truncate text-[10px] text-muted-foreground">{d.accessKey}</p></td><td className="px-4 py-3"><p className="max-w-[260px] truncate font-medium">{d.direction==="saida"?(d.recipientCnpj||"Consumidor"):(d.issuerName||"—")}</p><p className="text-xs text-muted-foreground">{d.direction==="saida"?d.recipientCnpj:d.issuerCnpj}</p></td><td className="px-4 py-3"><p className="max-w-[280px] truncate">{d.direction==="saida"?"Venda de mercadoria":"Compra / documento recebido"}</p><p className="text-xs text-muted-foreground">{d.schema||"DF-e"}</p></td><td className="px-4 py-3 text-right font-semibold">{money(Number(d.value||0))}</td><td className="px-4 py-3"><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={()=>setSelected(d)}><FileText className="mr-1.5 h-3.5 w-3.5"/>PDF</Button><Button size="sm" variant="outline" onClick={()=>setSelected(d)}>XML</Button></div></td></tr>):<tr><td colSpan={7} className="px-6 py-16 text-center text-sm text-muted-foreground">Nenhuma nota neste filtro/período.</td></tr>}</tbody></table></div>
        <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground"><span>1–{Math.min(50,filtered.length)} de {filtered.length} nota(s)</span><div className="flex gap-1"><button className="rounded border px-3 py-1.5">1</button>{filtered.length>50&&<button className="rounded border px-3 py-1.5">2</button>}</div></div>
      </section>
    </>}
    {selected&&<FiscalDocumentPreview doc={selected} onClose={()=>setSelected(null)}/>} 
  </main></AdminLayout>;
}
function Pill({children}:{children:React.ReactNode}){return <span className="rounded-full border bg-muted/10 px-3 py-1 text-xs font-medium">{children}</span>}
function FilterPill({active,onClick,children}:{active:boolean;onClick:()=>void;children:React.ReactNode}){return <button onClick={onClick} className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${active?"bg-foreground text-background":"bg-background hover:bg-muted"}`}>{children}</button>}
function Kpi({label,value,sub}:{label:string;value:string;sub?:string}){return <div className="rounded-xl border bg-background px-5 py-4 shadow-sm"><p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p><p className="mt-1 text-lg font-semibold">{value}</p>{sub&&<p className="mt-1 text-xs text-muted-foreground">{sub}</p>}</div>}
