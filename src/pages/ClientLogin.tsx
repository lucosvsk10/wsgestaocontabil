
import { useState, FormEvent } from "react";
import { Eye, EyeOff, Mail, Lock } from "lucide-react";
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
import { ThemeSwitcher } from "@/components/client/ThemeSwitcher";

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
      console.log("Tentando login para:", email);
      const { error, data } = await signIn(email, password);
      if (error) {
        setError(error.message);
        toast({
          title: "Erro de login",
          description: error.message,
          variant: "destructive"
        });
        console.error("Erro de login:", error.message);
      } else {
        // Create login notification after successful login
        console.log("Login bem-sucedido, criando notificação");
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
      console.error("Erro inesperado durante login:", err.message);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white dark:bg-navy-dark">
      <Navbar />
      <div className="flex-grow flex items-center justify-center p-4 py-[80px]">
        <div className="w-full max-w-md">
          {/* Login Logo/Header */}
          <div className="flex justify-center mb-6">
            <img 
              src="/lovable-uploads/4b269729-8d34-4824-8425-cc8c319161a8.png" 
              alt="WS Gestão Contábil" 
              className="h-20"
            />
          </div>

          <Card className="border border-gray-200 rounded-2xl shadow-md bg-white dark:bg-navy-deeper dark:border-gold/30 dark:shadow-lg dark:shadow-black/20">
            <CardHeader className="space-y-1 pb-2">
              <CardTitle className="text-2xl font-semibold text-center text-navy dark:text-gold">
                Acesso ao Sistema
              </CardTitle>
              <CardDescription className="text-center text-gray-500 dark:text-gray-300">
                Digite seu email e senha para acessar sua conta
              </CardDescription>
            </CardHeader>
            <CardContent>
              {error && <Alert variant="destructive" className="mb-4 bg-red-50 border-red-200 text-red-800 dark:bg-red-900/40 dark:border-red-800 dark:text-red-100">
                <AlertTitle>Erro</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="email" className="text-sm font-medium text-navy dark:text-gold">
                    Email
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="email@exemplo.com"
                      className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl dark:bg-navy-deeper dark:border-navy-lighter/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-gold/60"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor="password" className="text-sm font-medium text-navy dark:text-gold">
                      Senha
                    </label>
                    <a 
                      href="/reset-password" 
                      className="text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-gold/80 dark:hover:text-gold transition-colors"
                    >
                      Esqueceu a senha?
                    </a>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400" />
                    </div>
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl dark:bg-navy-deeper dark:border-navy-lighter/50 dark:text-white dark:placeholder-gray-400 dark:focus:border-gold/60"
                    />
                    <button 
                      type="button" 
                      onClick={() => setShowPassword(!showPassword)} 
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-blue-500 dark:hover:text-gold transition-colors"
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>
                <Button 
                  type="submit" 
                  disabled={isLoading}
                  className="w-full h-11 text-white bg-blue-600 hover:bg-blue-700 font-medium rounded-xl shadow-sm transition-all duration-200 dark:bg-gold dark:text-navy-darker dark:hover:bg-gold-light"
                >
                  {isLoading ? (
                    <>
                      <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      <span>Entrando...</span>
                    </>
                  ) : 'Entrar'}
                </Button>
              </form>
            </CardContent>
            <CardFooter className="flex flex-col space-y-4 pt-0">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-gray-300 dark:border-navy-lighter" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white dark:bg-navy-deeper px-2 text-gray-500 dark:text-gray-400">
                    ou
                  </span>
                </div>
              </div>

              <div className="text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Não possui uma conta?{' '}
                  <a 
                    href="#" 
                    className="font-medium text-blue-600 hover:text-blue-500 dark:text-gold/80 dark:hover:text-gold transition-colors"
                  >
                    Contate o administrador
                  </a>
                </p>
              </div>
            </CardFooter>
          </Card>

          <p className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
            © {new Date().getFullYear()} WS Gestão Contábil. Todos os direitos reservados.
          </p>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ClientLogin;
