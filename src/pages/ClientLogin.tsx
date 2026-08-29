import { FormEvent, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

const ClientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { notifyLogin } = useNotifications();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault(); setError(null); setIsLoading(true);
    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) { setError("Não foi possível entrar. Confira seu e-mail e sua senha."); toast({ title: "Não foi possível entrar", description: signInError.message, variant: "destructive" }); return; }
      await notifyLogin();
      const redirectPath = new URLSearchParams(location.search).get("redirect");
      navigate(redirectPath || "/dashboard");
    } catch (err: any) { setError("Ocorreu um erro inesperado. Tente novamente."); console.error(err?.message || err); }
    finally { setIsLoading(false); }
  };

  return <main className="min-h-screen bg-[#f3f4f6] text-[#111827]"><div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
    <section className="relative hidden overflow-hidden border-r border-[#dde2e7] bg-[#eaedf0] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14"><div className="absolute -left-44 top-[27%] h-[520px] w-[520px] rounded-full border border-[#d3d8de]"/><div className="absolute -left-20 top-[35%] h-[380px] w-[380px] rounded-full border border-[#d6dbe0]"/><div className="absolute bottom-[-150px] right-[-100px] h-[460px] w-[460px] rounded-full bg-[#e2e6ea]"/><div className="relative z-10"><img src="/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" alt="WS Gestão Contábil" className="h-8 object-contain"/></div><div className="relative z-10 max-w-2xl pb-10"><div className="mb-6 inline-flex rounded-full border border-[#d2d7dd] bg-[#f3f4f6] px-3.5 py-1.5 text-xs font-medium text-[#5f6875]">Ambiente seguro e organizado</div><h1 className="max-w-2xl text-5xl font-semibold leading-[1.03] tracking-[-0.055em] xl:text-6xl 2xl:text-7xl">Sua operação fiscal em um lugar só.</h1><p className="mt-6 max-w-xl text-[15px] leading-7 text-[#66707d]">Acesse documentos, empresas e ferramentas da WS com uma experiência simples, clara e feita para o trabalho do dia a dia.</p><div className="mt-10 grid max-w-xl grid-cols-2 gap-3"><div className="rounded-xl border border-[#d7dce2] bg-[#f0f2f4]/90 p-5"><p className="text-sm font-semibold">Documentos fiscais</p><p className="mt-2 text-xs leading-5 text-[#727b87]">Emissão e acompanhamento em um fluxo único.</p></div><div className="rounded-xl border border-[#d7dce2] bg-[#f0f2f4]/90 p-5"><p className="text-sm font-semibold">Acesso protegido</p><p className="mt-2 text-xs leading-5 text-[#727b87]">Cada ambiente permanece separado e controlado.</p></div></div></div><p className="relative z-10 text-xs text-[#8a929d]">WS Gestão Contábil</p></section>
    <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12"><div className="w-full max-w-[430px]"><div className="mb-10 flex items-center justify-center lg:hidden"><img src="/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" alt="WS Gestão Contábil" className="h-8 object-contain"/></div><div className="mb-8"><p className="text-sm font-medium text-[#6b7280]">Acesso à plataforma</p><h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Bem-vindo de volta</h2><p className="mt-2 text-sm leading-6 text-[#727b87]">Entre com seus dados para continuar.</p></div><form onSubmit={handleSubmit} className="space-y-5"><div className="space-y-2"><label htmlFor="email" className="text-sm font-medium">E-mail</label><Input id="email" type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required className="h-12 !border-[#cfd5dc] !bg-white !text-[#111827] dark:!bg-white dark:!text-[#111827] caret-[#111827] placeholder:!text-[#9aa1aa]"/></div><div className="space-y-2"><div className="flex items-center justify-between"><label htmlFor="password" className="text-sm font-medium">Senha</label><button type="button" className="text-xs font-medium text-[#6b7280]">Esqueci minha senha</button></div><div className="relative"><Input id="password" type={showPassword?"text":"password"} autoComplete="current-password" placeholder="Sua senha" value={password} onChange={e=>setPassword(e.target.value)} required className="h-12 !border-[#cfd5dc] !bg-white !text-[#111827] dark:!bg-white dark:!text-[#111827] caret-[#111827] pr-20 placeholder:!text-[#9aa1aa]"/><button type="button" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-1/2 -translate-y-1/2 px-1.5 py-1 text-xs font-medium text-[#6b7280]">{showPassword?"Ocultar":"Mostrar"}</button></div></div>{error&&<div role="alert" className="rounded-lg border border-[#e4b8b8] bg-[#f8eaea] px-3.5 py-3 text-sm text-[#9f3030]">{error}</div>}<Button type="submit" disabled={isLoading} className="h-12 w-full rounded-lg bg-[#111827] text-sm font-semibold text-white hover:bg-[#202938]">{isLoading?"Entrando...":"Entrar"}</Button></form><div className="mt-8 border-t border-[#dde2e7] pt-6 text-center"><p className="text-sm text-[#727b87]">Acesso exclusivo para usuários autorizados.</p></div></div></section>
  </div></main>;
};
export default ClientLogin;
