import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ClientLogin = () => {
  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // Registration state
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, isAdmin, signIn, signUp } = useAuth();

  // If already logged in, redirect based on role
  if (user) {
    if (isAdmin) {
      navigate("/admin");
    } else {
      navigate("/client");
    }
    return null;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const { error } = await signIn(email, password);
      
      if (error) throw error;
      
      // The redirect will be handled in the AuthContext
      // based on the user's role
      
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer login",
        description: error.message === "Invalid login credentials" 
          ? "Email ou senha incorretos" 
          : "Ocorreu um erro durante o login. Tente novamente."
      });
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (registerPassword !== confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: "As senhas não coincidem."
      });
      return;
    }
    
    if (registerPassword.length < 6) {
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: "A senha deve ter pelo menos 6 caracteres."
      });
      return;
    }
    
    setIsLoading(true);
    
    try {
      const { error } = await signUp(registerEmail, registerPassword, name);
      
      if (error) throw error;
      
      toast({
        title: "Cadastro realizado",
        description: "Sua conta foi criada com sucesso. Você já pode fazer login.",
      });
      
      // Reset form and switch to login tab
      setRegisterEmail("");
      setRegisterPassword("");
      setConfirmPassword("");
      setName("");
      setActiveTab("login");
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "Erro no cadastro",
        description: error.message.includes("already registered") 
          ? "Este email já está registrado" 
          : "Ocorreu um erro durante o cadastro. Tente novamente."
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
            <CardTitle className="text-2xl font-bold text-gold">Área do Cliente</CardTitle>
            <CardDescription className="text-sm text-gray-400">
              Acesse sua conta para continuar
            </CardDescription>
          </CardHeader>
          
          <Tabs defaultValue={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid grid-cols-2 w-full bg-gray-800">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Cadastro</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="py-2">
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
            </TabsContent>
            
            <TabsContent value="register" className="py-2">
              <CardContent>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div className="space-y-2">
                    <div className="relative">
                      <UserPlus
                        className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                      />
                      <Input
                        type="text"
                        placeholder="Nome completo"
                        className="pl-10 bg-gray-800 border-gray-700"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
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
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
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
                        Cadastrando...
                      </span>
                    ) : (
                      "Cadastrar"
                    )}
                  </Button>
                </form>
              </CardContent>
            </TabsContent>
          </Tabs>
          
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
