import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AdminLayout } from "@/components/admin/layout/AdminLayout";
import { AdminPage } from "@/components/admin/ui/AdminPage";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

type Org = { id:string; name:string; slug:string; status:string; created_at:string };
type Member = { id:string; organization_id:string; user_id:string; role:string; status:string; created_at:string };
type User = { id:string; name?:string|null; email?:string|null };
type Subscription = { organization_id:string; status:string; saas_plans?:{name?:string|null}|null };

export default function AdminSubscribers(){
 const navigate=useNavigate();
 const [orgs,setOrgs]=useState<Org[]>([]),[members,setMembers]=useState<Member[]>([]),[users,setUsers]=useState<User[]>([]),[subs,setSubs]=useState<Subscription[]>([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=async()=>{setLoading(true);setError("");const [{data:o,error:oe},{data:m,error:me},{data:s,error:se}]=await Promise.all([(supabase as any).from("organizations").select("id,name,slug,status,created_at").order("created_at",{ascending:false}),(supabase as any).from("organization_members").select("id,organization_id,user_id,role,status,created_at").order("created_at",{ascending:false}),(supabase as any).from("saas_subscriptions").select("organization_id,status,saas_plans(name)").order("created_at",{ascending:false})]);if(oe||me||se){setError(oe?.message||me?.message||se?.message||"Falha ao carregar assinantes.");setLoading(false);return}const memberRows=(m||[]) as Member[];setOrgs((o||[]) as Org[]);setMembers(memberRows);setSubs((s||[]) as Subscription[]);const ids=[...new Set(memberRows.map(x=>x.user_id).filter(Boolean))];if(ids.length){const {data:u}=await (supabase as any).from("users").select("id,name,email").in("id",ids);setUsers((u||[]) as User[])}else setUsers([]);setLoading(false)};
 useEffect(()=>{void load()},[]);
 const userMap=useMemo(()=>new Map(users.map(u=>[u.id,u])),[users]);const subMap=useMemo(()=>new Map(subs.map(s=>[s.organization_id,s])),[subs]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return orgs.filter(org=>{const orgMembers=members.filter(m=>m.organization_id===org.id),people=orgMembers.map(m=>userMap.get(m.user_id));const text=[org.name,org.slug,...people.flatMap(p=>[p?.name,p?.email])].join(" ").toLowerCase();return !q||text.includes(q)})},[orgs,members,userMap,query]);
 const updateMember=async(id:string,patch:Record<string,string>)=>{const {error}=await (supabase as any).from("organization_members").update({...patch,updated_at:new Date().toISOString()}).eq("id",id);if(error)setError(error.message);else await load()};
 return <AdminLayout><AdminPage>
  <div className="space-y-6">
   <div className="flex flex-wrap items-end justify-between gap-4">
    <div><p className="text-[10px] font-semibold uppercase tracking-[.15em] text-muted-foreground">Clientes</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">Assinantes do emissor fiscal</h1><p className="mt-1 max-w-3xl text-sm text-muted-foreground">Organizações e usuários que assinam o emissor fiscal, separados dos clientes contábeis do escritório.</p></div>
    <Button disabled>Novo assinante</Button>
   </div>
   <div className="flex gap-2 border-b border-border pb-3"><button onClick={()=>navigate("/admin/clientes")} className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:bg-muted">Clientes do escritório</button><button className="rounded-md bg-foreground px-4 py-2 text-sm font-semibold text-background">Assinantes do emissor fiscal</button></div>
   {error&&<div className="rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">{error}</div>}
   <div className="grid gap-3 md:grid-cols-3"><Metric label="Organizações" value={String(orgs.length)}/><Metric label="Usuários ativos" value={String(members.filter(m=>m.status==="active").length)}/><Metric label="Assinaturas ativas" value={String(subs.filter(s=>s.status==="active"||s.status==="trialing").length)}/></div>
   <div className="overflow-hidden rounded-xl border border-border bg-card">
    <div className="border-b border-border p-4"><div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"><div><h2 className="font-semibold">Contas do emissor fiscal</h2><p className="mt-0.5 text-xs text-muted-foreground">Gerencie organização, plano, função e status de acesso dos usuários.</p></div><Input value={query} onChange={e=>setQuery(e.target.value)} className="md:w-80" placeholder="Buscar empresa, usuário ou e-mail..."/></div></div>
    {loading?<p className="px-5 py-14 text-center text-sm text-muted-foreground">Carregando assinantes...</p>:filtered.length===0?<p className="px-5 py-14 text-center text-sm text-muted-foreground">Nenhum assinante encontrado.</p>:<div className="divide-y divide-border">{filtered.map(org=>{const orgMembers=members.filter(m=>m.organization_id===org.id),sub=subMap.get(org.id);return <section key={org.id} className="p-5"><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><p className="text-base font-semibold">{org.name}</p><p className="mt-1 text-xs text-muted-foreground">{sub?.saas_plans?.name||"Plano não informado"} · {sub?.status||"sem assinatura"} · {orgMembers.length} usuário(s)</p></div><span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold ${org.status==="active"?"border-emerald-200 bg-emerald-50 text-emerald-700":"border-zinc-200 bg-zinc-50 text-zinc-600"}`}>{org.status}</span></div><div className="mt-4 overflow-hidden rounded-lg border border-border"><table className="w-full text-left"><thead><tr className="bg-muted/30 text-[10px] uppercase tracking-[.12em] text-muted-foreground"><th className="px-4 py-2.5">Usuário</th><th className="px-4 py-2.5">Função</th><th className="px-4 py-2.5">Status</th></tr></thead><tbody>{orgMembers.map(member=>{const person=userMap.get(member.user_id);return <tr key={member.id} className="border-t border-border/60"><td className="px-4 py-3"><p className="text-sm font-medium">{person?.name||"Usuário"}</p><p className="mt-0.5 text-xs text-muted-foreground">{person?.email||member.user_id}</p></td><td className="px-4 py-3"><select value={member.role} onChange={e=>void updateMember(member.id,{role:e.target.value})} className="h-9 rounded-md border border-border bg-background px-2 text-xs"><option value="owner">owner</option><option value="admin">admin</option><option value="member">member</option><option value="viewer">viewer</option></select></td><td className="px-4 py-3"><select value={member.status} onChange={e=>void updateMember(member.id,{status:e.target.value})} className="h-9 rounded-md border border-border bg-background px-2 text-xs" disabled={member.role==="owner"}><option value="active">active</option><option value="invited">invited</option><option value="disabled">disabled</option></select></td></tr>})}</tbody></table></div></section>})}</div>}
   </div>
  </div>
 </AdminPage></AdminLayout>
}
function Metric({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-border bg-card p-5"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-2 text-2xl font-semibold tracking-tight">{value}</p></div>}
