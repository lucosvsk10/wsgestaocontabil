
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { authenticateUser, initializeUserData } from "@/data/users";

const AdminLogin = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Initialize user data when the component mounts
  useEffect(() => {
    // Force initialize the user data to ensure admin users are available
    initializeUserData();
    console.log("AdminLogin: User data initialized");
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      const user = authenticateUser(email, password);
      console.log("Login attempt:", { email, found: !!user, isAdmin: user?.isAdmin });
      
      if (user && user.isAdmin) {
        localStorage.setItem("adminAuth", "true");
        localStorage.setItem("userId", user.id);
        toast({
          title: "Login de administrador realizado com sucesso!",
          description: "Bem-vindo à área do administrador.",
        });
        navigate("/admin");
      } else {
        toast({
          title: "Erro no login",
          description: "Credenciais de administrador inválidas",
          variant: "destructive",
        });
      }
      
      setIsLoading(false);
    }, 600);
  };

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <Navbar />
      
      <main className="flex-grow flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md bg-gray-900 border-gray-800">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold text-gold">Login Administrativo</CardTitle>
            <p className="text-sm text-gray-400">
              Acesso restrito apenas para administradores
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
              <a 
                href="/login" 
                className="text-gold hover:underline"
              >
                Voltar para login de cliente
              </a>
            </div>
          </CardFooter>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
};

export default AdminLogin;
