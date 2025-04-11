import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
const ClientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const {
    toast
  } = useToast();
  const {
    signIn
  } = useAuth();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const {
        error
      } = await signIn(email, password);
      if (error) throw error;
      navigate("/dashboard");
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message === "Invalid login credentials" ? "Email ou senha incorretos" : "Ocorreu um erro durante o login. Tente novamente."
      });
      setIsLoading(false);
    }
  };
  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };
  return <div className="min-h-screen flex flex-col bg-white dark:bg-navy-dark">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-4 py-[200px]">
        <Card className="w-full max-w-md border-gold/20 rounded-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="font-medium text-3xl text-gold-dark">LOGIN</CardTitle>
            <CardDescription className="text-sm text-gray-600 dark:text-gray-400">
              Acesse sua área pessoal
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required className="pl-10 bg-white dark:bg-[#46413d] border-gray-300 dark:border-gray-700" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
                  <Input type={showPassword ? "text" : "password"} id="password" placeholder="●●●●●●" value={password} onChange={e => setPassword(e.target.value)} className="pl-10 bg-white dark:bg-[#46413d] border-gray-300 dark:border-gray-700" />
                  <button type="button" onClick={togglePasswordVisibility} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>
              <Button className="w-full bg-gold hover:bg-gold-light text-navy" type="submit" disabled={isLoading}>
                {isLoading ? <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </span> : "Entrar"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-600 dark:text-gray-400">
              <a href="/" className="text-gold-dark hover:underline">
                Voltar para a página inicial
              </a>
            </div>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
    </div>;
};
export default ClientLogin;