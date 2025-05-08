import { useState, FormEvent } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
const ClientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    signIn
  } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const {
    toast
  } = useToast();
  const {
    notifyLogin
  } = useNotifications();
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const {
        error,
        data
      } = await signIn(email, password);
      if (error) {
        setError(error.message);
        toast({
          title: "Erro de login",
          description: error.message,
          variant: "destructive"
        });
      } else {
        // Create login notification after successful login
        await notifyLogin();
        toast({
          title: "Login realizado com sucesso",
          description: "Bem vindo de volta!"
        });

        // Navigate to the dashboard or redirectURL if provided
        const redirectPath = new URLSearchParams(location.search).get('redirect');
        navigate(redirectPath || '/dashboard');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };
  return <div className="min-h-screen flex flex-col bg-orange-100 dark:bg-navy-dark">
      <Navbar />
      <div className="flex-grow flex items-center justify-center p-4 py-[80px]">
        <Card className="w-full max-w-md border-gold/20 px-0 mx-0">
          <CardHeader className="space-y-1 flex flex-col items-center">
            <CardTitle className="text-2xl text-center text-navy dark:text-gold font-normal">LOGIN</CardTitle>
            <CardDescription className="text-center">
              Entre com seu email e senha
            </CardDescription>
          </CardHeader>
          <CardContent>
            {error && <Alert variant="destructive" className="mb-4">
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>}
            <form onSubmit={handleSubmit}>
              <div className="grid gap-4 py-[15px]">
                <div className="grid gap-2">
                  <label htmlFor="email" className="text-sm font-medium leading-none text-navy dark:text-gold">
                    Email
                  </label>
                  <Input id="email" type="email" placeholder="email@example.com" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white dark:bg-navy-light" />
                </div>
                <div className="grid gap-2">
                  <label htmlFor="password" className="text-sm font-medium leading-none text-navy dark:text-gold">
                    Senha
                  </label>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required className="bg-white dark:bg-navy-light" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-300">
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Entrando..." : "Entrar"}
                </Button>
              </div>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-2">
            <div className="text-center text-sm text-navy dark:text-gold">Não possui uma conta? Entre em contato.</div>
          </CardFooter>
        </Card>
      </div>
      <Footer />
    </div>;
};
export default ClientLogin;