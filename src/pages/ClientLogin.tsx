
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ClientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Mock login - In a real app, validate with backend
    setTimeout(() => {
      if (email && password) {
        // Store authentication status
        localStorage.setItem("clientAuth", "true");
        toast({
          title: "Login realizado com sucesso!",
          description: "Bem-vindo à área do cliente.",
        });
        navigate("/cliente");
      } else {
        toast({
          title: "Erro no login",
          description: "Por favor, verifique suas credenciais.",
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-gold">Área do Cliente</CardTitle>
            <p className="text-sm text-gray-400">
              Entre com suas credenciais para acessar sua conta
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <div className="relative">
                  <User 
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
                <div className="flex items-center justify-end">
                  <a 
                    href="#" 
                    className="text-sm text-gold hover:underline"
                    onClick={(e) => {
                      e.preventDefault();
                      toast({
                        title: "Recuperação de senha",
                        description: "Instruções de recuperação foram enviadas para seu email.",
                      });
                    }}
                  >
                    Esqueceu a senha?
                  </a>
                </div>
              </div>
              <Button 
                className="w-full bg-gold hover:bg-gold-light text-navy" 
                type="submit"
                disabled={isLoading}
              >
                {isLoading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-400">
              <span>Não tem uma conta? </span>
              <a 
                href="#" 
                className="text-gold hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  toast({
                    title: "Solicitação de conta",
                    description: "Entre em contato conosco para criar sua conta de cliente.",
                  });
                }}
              >
                Entre em contato
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
