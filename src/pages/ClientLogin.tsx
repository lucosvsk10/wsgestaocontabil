import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, FileCheck2, LockKeyhole, ShieldCheck } from "lucide-react";
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
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error: signInError } = await signIn(email, password);
      if (signInError) {
        setError("Não foi possível entrar. Confira seu e-mail e sua senha.");
        toast({ title: "Não foi possível entrar", description: signInError.message, variant: "destructive" });
        return;
      }

      await notifyLogin();
      toast({ title: "Login realizado", description: "Bem-vindo de volta." });
      const redirectPath = new URLSearchParams(location.search).get("redirect");
      navigate(redirectPath || "/dashboard");
    } catch (err: any) {
      setError("Ocorreu um erro inesperado. Tente novamente.");
      console.error("Erro durante login:", err?.message || err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f3f4f6] text-[#111827]">
      <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
        <section className="relative hidden overflow-hidden border-r border-[#dde2e7] bg-[#eaedf0] lg:flex lg:flex-col lg:justify-between lg:p-10 xl:p-14">
          <div className="absolute -left-28 top-1/3 h-80 w-80 rounded-full border border-[#d4d9df]" />
          <div className="absolute -left-12 top-[38%] h-56 w-56 rounded-full border border-[#d7dce1]" />
          <div className="absolute bottom-[-120px] right-[-80px] h-96 w-96 rounded-full bg-[#e2e6ea]" />

          <div className="relative z-10">
            <img src="/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" alt="WS Gestão Contábil" className="h-8 object-contain" />
          </div>

          <div className="relative z-10 max-w-xl pb-10">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#d2d7dd] bg-[#f3f4f6] px-3 py-1.5 text-xs font-medium text-[#5f6875]">
              <ShieldCheck size={14} /> Ambiente seguro e organizado
            </div>
            <h1 className="max-w-lg text-4xl font-semibold leading-[1.08] tracking-[-0.045em] xl:text-5xl">Sua operação fiscal em um lugar só.</h1>
            <p className="mt-5 max-w-lg text-[15px] leading-7 text-[#66707d]">Acesse documentos, empresas e ferramentas da WS com uma experiência simples, clara e feita para o trabalho do dia a dia.</p>

            <div className="mt-9 grid max-w-lg grid-cols-2 gap-3">
              <div className="rounded-xl border border-[#d7dce2] bg-[#f0f2f4]/90 p-4 backdrop-blur-sm">
                <div className="mb-7 grid h-9 w-9 place-items-center rounded-lg bg-[#dde1e5] text-[#374151]"><FileCheck2 size={18} /></div>
                <p className="text-sm font-semibold">Documentos fiscais</p>
                <p className="mt-1 text-xs leading-5 text-[#727b87]">Emissão e acompanhamento em um fluxo único.</p>
              </div>
              <div className="rounded-xl border border-[#d7dce2] bg-[#f0f2f4]/90 p-4 backdrop-blur-sm">
                <div className="mb-7 grid h-9 w-9 place-items-center rounded-lg bg-[#dde1e5] text-[#374151]"><LockKeyhole size={18} /></div>
                <p className="text-sm font-semibold">Acesso protegido</p>
                <p className="mt-1 text-xs leading-5 text-[#727b87]">Cada ambiente permanece separado e controlado.</p>
              </div>
            </div>
          </div>

          <p className="relative z-10 text-xs text-[#8a929d]">WS Gestão Contábil</p>
        </section>

        <section className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-12">
          <div className="w-full max-w-[430px]">
            <div className="mb-10 flex items-center justify-center lg:hidden">
              <img src="/lovable-uploads/f7fdf0cf-f16c-4df7-a92c-964aadea9539.png" alt="WS Gestão Contábil" className="h-8 object-contain" />
            </div>

            <div className="mb-8">
              <p className="text-sm font-medium text-[#6b7280]">Acesso à plataforma</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-[-0.035em]">Bem-vindo de volta</h2>
              <p className="mt-2 text-sm leading-6 text-[#727b87]">Entre com seus dados para continuar.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">E-mail</label>
                <Input id="email" type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-12 rounded-lg border-[#d6dbe1] bg-[#eaedf0] px-3.5 text-[#111827] shadow-none placeholder:text-[#9aa1aa] focus-visible:ring-1 focus-visible:ring-[#9ca3af]" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between"><label htmlFor="password" className="text-sm font-medium">Senha</label><button type="button" className="text-xs font-medium text-[#6b7280] transition-colors hover:text-[#111827]">Esqueci minha senha</button></div>
                <div className="relative">
                  <Input id="password" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Sua senha" value={password} onChange={(e) => setPassword(e.target.value)} required className="h-12 rounded-lg border-[#d6dbe1] bg-[#eaedf0] px-3.5 pr-11 text-[#111827] shadow-none placeholder:text-[#9aa1aa] focus-visible:ring-1 focus-visible:ring-[#9ca3af]" />
                  <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-[#7b8491] transition-colors hover:bg-[#dde1e5] hover:text-[#111827]" aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>

              {error && <div role="alert" className="rounded-lg border border-[#e4b8b8] bg-[#f8eaea] px-3.5 py-3 text-sm text-[#9f3030]">{error}</div>}

              <Button type="submit" disabled={isLoading} className="h-12 w-full gap-2 rounded-lg bg-[#111827] text-sm font-semibold text-white shadow-none hover:bg-[#202938]">
                {isLoading ? "Entrando..." : <><span>Entrar</span><ArrowRight size={17} /></>}
              </Button>
            </form>

            <div className="mt-8 border-t border-[#dde2e7] pt-6 text-center">
              <p className="text-sm text-[#727b87]">Ainda não utiliza a plataforma? <span className="font-medium text-[#374151]">Conheça o produto em breve.</span></p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

export default ClientLogin;
