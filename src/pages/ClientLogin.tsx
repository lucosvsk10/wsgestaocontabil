
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ClientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();

  // If already logged in, redirect
  if (user) {
    navigate("/client");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      
      toast({
        title: "Login realizado",
        description: "Bem-vindo à área do cliente.",
      });
      navigate("/client");
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message === "Invalid login credentials" 
          ? "Email ou senha incorretos" 
          : "Ocorreu um erro durante o login. Tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-gold">Login</CardTitle>
            <p className="text-sm text-gray-400">
              Acesse sua conta para continuar
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <Mail 
                    className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                  />
                  <Input
                    type="email"
                    placeholder="Email"
                    className="pl-10 bg-gray-800 border-gray-700"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="relative">
                  <Lock
                    className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                  />
                  <Input
                    type="password"
                    placeholder="Senha"
                    className="pl-10 bg-gray-800 border-gray-700"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>
              <Button 
                className="w-full bg-gold hover:bg-gold-light text-navy" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-navy" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Entrando...
                  </span>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-xs text-gray-600">
              <a 
                href="/admin-login" 
                className="hover:text-gray-400 transition-colors"
              >
                Acesso administrativo
              </a>
            </div>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default ClientLogin;
