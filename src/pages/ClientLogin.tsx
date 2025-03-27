
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, Mail, AlertCircle, MessageSquare } from "lucide-react";
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

  const ADMIN_EMAIL = "wsgestao@gmail.com";
  const ADMIN_PASSWORD = "melquesedeque";

  const getRegisteredUsers = () => {
    const users = localStorage.getItem("registeredUsers");
    return users ? JSON.parse(users) : [];
  };

  const validateLogin = (email, password) => {
    if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      return { success: true, isAdmin: true };
    }
    
    const users = getRegisteredUsers();
    const user = users.find(u => u.email === email);
    if (!user) {
      return { success: false, message: "Usuário não encontrado" };
    }
    if (user.password !== password) {
      return { success: false, message: "Senha incorreta" };
    }
    return { success: true, user, isAdmin: false };
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);

    const validation = validateLogin(email, password);
    
    setTimeout(() => {
      if (validation.success) {
        if (validation.isAdmin) {
          localStorage.setItem("adminAuth", "true");
          toast({
            title: "Login de administrador realizado com sucesso!",
            description: "Bem-vindo à área do administrador.",
          });
          navigate("/admin");
        } else {
          localStorage.setItem("clientAuth", "true");
          localStorage.setItem("currentUser", JSON.stringify(validation.user));
          toast({
            title: "Login realizado com sucesso!",
            description: "Bem-vindo à área do cliente.",
          });
          navigate("/cliente");
        }
      } else {
        toast({
          title: "Erro no login",
          description: validation.message,
          variant: "destructive",
        });
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleWhatsAppRequest = () => {
    window.open("https://wa.me/+5500000000000?text=Olá,%20gostaria%20de%20solicitar%20uma%20conta%20na%20plataforma%20WS%20Gestão.", "_blank");
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-gold">Área do Cliente</CardTitle>
            <p className="text-sm text-gray-400">
              Acesse sua conta para continuar
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
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
            
            <div className="mt-6 pt-4 border-t border-gray-800">
              <Button 
                className="w-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center gap-2" 
                type="button"
                onClick={handleWhatsAppRequest}
              >
                <MessageSquare size={18} />
                Solicitar Conta via WhatsApp
              </Button>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-center text-sm text-gray-400">
              <span>Problemas com seu cadastro? </span>
              <a 
                href="#" 
                className="text-gold hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  toast({
                    title: "Suporte",
                    description: "Entre em contato conosco para obter ajuda com seu cadastro.",
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
