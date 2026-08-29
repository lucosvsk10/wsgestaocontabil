import { useState } from "react";
import { Lock, LogOut, MonitorCog } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { AdminPageHeader, AdminSection } from "@/components/admin/ui/AdminPage";

export const SettingsView=()=>{
 const {toast}=useToast();const {signOut,user}=useAuth();
 const [newPassword,setNewPassword]=useState(''),[confirm,setConfirm]=useState(''),[loading,setLoading]=useState(false),[error,setError]=useState('');
 const changePassword=async(e:React.FormEvent)=>{e.preventDefault();setError('');if(newPassword.length<8){setError('Use uma senha com pelo menos 8 caracteres.');return}if(newPassword!==confirm){setError('As senhas não conferem.');return}setLoading(true);const {error:authError}=await supabase.auth.updateUser({password:newPassword});if(authError)setError(authError.message);else{setNewPassword('');setConfirm('');toast({title:'Senha alterada',description:'Sua senha foi atualizada com sucesso.'})}setLoading(false)};
 return <div>
  <AdminPageHeader eyebrow="Administração" title="Configurações" description="Preferências do Admin e segurança da sua conta."/>
  <div className="mt-6 grid gap-5 lg:grid-cols-2">
   <AdminSection className="p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/45"><Lock className="h-5 w-5"/></span><div><h2 className="font-semibold">Segurança da conta</h2><p className="text-xs text-muted-foreground">{user?.email}</p></div></div><form onSubmit={changePassword} className="mt-6 space-y-4"><Field label="Nova senha"><Input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)}/></Field><Field label="Confirmar nova senha"><Input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field>{error&&<p className="text-sm text-destructive">{error}</p>}<Button className="w-full" disabled={loading}>{loading?'Salvando...':'Alterar senha'}</Button></form><Button variant="outline" className="mt-3 w-full text-destructive hover:text-destructive" onClick={()=>void signOut()}><LogOut className="mr-2 h-4 w-4"/>Sair da conta</Button></AdminSection>
   <AdminSection className="p-6"><div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/45"><MonitorCog className="h-5 w-5"/></span><div><h2 className="font-semibold">Aparência</h2><p className="text-xs text-muted-foreground">Escolha o tema do painel administrativo.</p></div></div><div className="mt-6 rounded-xl border border-border/60 bg-muted/10 p-4"><p className="mb-3 text-xs font-medium text-muted-foreground">Tema</p><ThemeToggle/></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><Info label="Ambiente" value="Produção"/><Info label="Interface" value="Admin v2"/></div></AdminSection>
  </div>
 </div>
}
function Field({label,children}:{label:string;children:React.ReactNode}){return <label className="block space-y-2"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>}
function Info({label,value}:{label:string;value:string}){return <div className="rounded-xl border border-border/55 bg-muted/10 p-4"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 font-semibold">{value}</p></div>}
