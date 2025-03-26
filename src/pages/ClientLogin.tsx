
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, UserPlus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const ClientLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  // Registration state
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  
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

  const handleRegistration = (e: React.FormEvent) => {
    e.preventDefault();
    setIsRegistering(true);

    // Validate passwords match
    if (registerPassword !== registerConfirmPassword) {
      toast({
        title: "Erro no cadastro",
        description: "As senhas não coincidem.",
        variant: "destructive",
      });
      setIsRegistering(false);
      return;
    }

    // Mock registration - In a real app, send to backend
    setTimeout(() => {
      if (registerName && registerEmail && registerPassword) {
        toast({
          title: "Cadastro realizado com sucesso!",
          description: "Agora você pode fazer login com suas credenciais.",
        });
        // Reset form and switch to login tab
        setRegisterName("");
        setRegisterEmail("");
        setRegisterPassword("");
        setRegisterConfirmPassword("");
      } else {
        toast({
          title: "Erro no cadastro",
          description: "Por favor, preencha todos os campos corretamente.",
          variant: "destructive",
        });
      }
      setIsRegistering(false);
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
              Acesse sua conta ou registre-se para continuar
            </p>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="space-y-4">
              <TabsList className="grid grid-cols-2 w-full bg-gray-800">
                <TabsTrigger value="login" className="data-[state=active]:bg-gold data-[state=active]:text-navy">
                  Login
                </TabsTrigger>
                <TabsTrigger value="register" className="data-[state=active]:bg-gold data-[state=active]:text-navy">
                  Criar Conta
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
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
              </TabsContent>
              
              <TabsContent value="register" className="space-y-4">
                <form onSubmit={handleRegistration} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <User 
                        className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                      />
                      <Input
                        type="text"
                        placeholder="Nome completo"
                        className="pl-10 bg-gray-800 border-gray-700"
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="relative">
                      <Mail 
                        className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                      />
                      <Input
                        type="email"
                        placeholder="Email"
                        className="pl-10 bg-gray-800 border-gray-700"
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
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
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
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
                        placeholder="Confirmar senha"
                        className="pl-10 bg-gray-800 border-gray-700"
                        value={registerConfirmPassword}
                        onChange={(e) => setRegisterConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button 
                    className="w-full bg-gold hover:bg-gold-light text-navy flex items-center justify-center gap-2" 
                    type="submit"
                    disabled={isRegistering}
                  >
                    <UserPlus size={18} />
                    {isRegistering ? "Criando conta..." : "Criar Conta"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
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
