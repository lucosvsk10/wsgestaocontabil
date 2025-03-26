
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, User, UserPlus, Mail, KeyRound, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
  
  // Verification code state
  const [showVerification, setShowVerification] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [expectedCode, setExpectedCode] = useState("");
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [pendingRegistration, setPendingRegistration] = useState(null);
  
  // Password validation
  const [passwordError, setPasswordError] = useState("");
  
  const navigate = useNavigate();
  const { toast } = useToast();

  // Admin credentials
  const ADMIN_EMAIL = "wsgestao@gmail.com";
  const ADMIN_PASSWORD = "melquesedeque";

  // Load registered users from localStorage
  const getRegisteredUsers = () => {
    const users = localStorage.getItem("registeredUsers");
    return users ? JSON.parse(users) : [];
  };

  // Save registered users to localStorage
  const saveRegisteredUser = (user) => {
    const users = getRegisteredUsers();
    users.push(user);
    localStorage.setItem("registeredUsers", JSON.stringify(users));
  };

  // Check if user exists and password is correct
  const validateLogin = (email, password) => {
    // Check if admin credentials
    if (email === wsgestao@gmail.com && password === melquesedeque) {
      return { success: true, isAdmin: true };
    }
    
    // Check regular users
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

  // Generate a random 6-digit verification code
  const generateVerificationCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleLogin = (e) => {
    e.preventDefault();
    setIsLoading(true);

    const validation = validateLogin(email, password);
    
    setTimeout(() => {
      if (validation.success) {
        if (validation.isAdmin) {
          // Admin login
          localStorage.setItem("adminAuth", "true");
          toast({
            title: "Login de administrador realizado com sucesso!",
            description: "Bem-vindo à área do administrador.",
          });
          navigate("/admin");
        } else {
          // Regular user login
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

  const validatePassword = (password) => {
    if (password.length < 8) {
      return "A senha deve ter no mínimo 8 caracteres";
    }
    return "";
  };

  const handleRegistration = (e) => {
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

    // Validate password strength
    const passwordValidation = validatePassword(registerPassword);
    if (passwordValidation) {
      setPasswordError(passwordValidation);
      toast({
        title: "Erro no cadastro",
        description: passwordValidation,
        variant: "destructive",
      });
      setIsRegistering(false);
      return;
    }

    // Check if email is already registered
    const users = getRegisteredUsers();
    if (users.some(user => user.email === registerEmail)) {
      toast({
        title: "Erro no cadastro",
        description: "Este email já está registrado.",
        variant: "destructive",
      });
      setIsRegistering(false);
      return;
    }

    // Generate verification code
    const code = generateVerificationCode();
    setExpectedCode(code);
    
    // Create pending registration
    setPendingRegistration({
      name: registerName,
      email: registerEmail,
      password: registerPassword
    });
    
    // Show verification code screen
    setShowVerification(true);
    setIsRegistering(false);
  };

  const handleVerifyCode = (e) => {
    e.preventDefault();
    setVerifyingCode(true);
    
    // Simulate API delay
    setTimeout(() => {
      if (verificationCode === expectedCode) {
        // Register the user
        saveRegisteredUser(pendingRegistration);
        
        toast({
          title: "Verificação bem-sucedida",
          description: "Sua conta foi criada com sucesso. Agora você pode fazer login.",
        });
        
        // Reset form and states
        setRegisterName("");
        setRegisterEmail("");
        setRegisterPassword("");
        setRegisterConfirmPassword("");
        setVerificationCode("");
        setShowVerification(false);
        setPendingRegistration(null);
      } else {
        toast({
          title: "Código inválido",
          description: "O código de verificação está incorreto. Por favor, tente novamente.",
          variant: "destructive",
        });
      }
      setVerifyingCode(false);
    }, 1000);
  };

  const cancelVerification = () => {
    setShowVerification(false);
    setPendingRegistration(null);
    setVerificationCode("");
  };

  // Show verification UI instead of tabs when in verification mode
  if (showVerification) {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col">
        <Navbar />
        
        <main className="flex-grow flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md bg-gray-900 border-gray-800">
            <CardHeader className="space-y-1 text-center">
              <CardTitle className="text-2xl font-bold text-gold">Verificação de Conta</CardTitle>
              <p className="text-sm text-gray-400">
                Digite o código de verificação enviado para seu email
              </p>
            </CardHeader>
            <CardContent>
              <Alert className="mb-6 bg-blue-950 border-blue-800">
                <AlertCircle className="h-4 w-4 text-blue-400" />
                <AlertTitle className="text-blue-400">Este é seu código de verificação:</AlertTitle>
                <AlertDescription className="font-bold text-center text-2xl mt-2 text-white">
                  {expectedCode}
                </AlertDescription>
              </Alert>
              
              <form onSubmit={handleVerifyCode} className="space-y-4">
                <div className="space-y-2">
                  <div className="relative">
                    <KeyRound 
                      className="absolute left-3 top-3 h-5 w-5 text-gray-400" 
                    />
                    <Input
                      type="text"
                      placeholder="Código de verificação"
                      className="pl-10 bg-gray-800 border-gray-700 text-center text-xl letter-spacing-wide"
                      value={verificationCode}
                      onChange={(e) => setVerificationCode(e.target.value)}
                      maxLength={6}
                      required
                    />
                  </div>
                </div>
                <Button 
                  className="w-full bg-gold hover:bg-gold-light text-navy" 
                  type="submit"
                  disabled={verifyingCode}
                >
                  {verifyingCode ? "Verificando..." : "Verificar Código"}
                </Button>
                <Button 
                  className="w-full bg-gray-800 hover:bg-gray-700 text-gray-300" 
                  type="button"
                  onClick={cancelVerification}
                  disabled={verifyingCode}
                >
                  Cancelar
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    );
  }

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
                        placeholder="Senha (mínimo 8 caracteres)"
                        className="pl-10 bg-gray-800 border-gray-700"
                        value={registerPassword}
                        onChange={(e) => {
                          setRegisterPassword(e.target.value);
                          setPasswordError(validatePassword(e.target.value));
                        }}
                        required
                      />
                      {passwordError && (
                        <div className="mt-1">
                          <Alert variant="destructive" className="py-2 bg-red-950 border-red-800">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="text-xs ml-2">{passwordError}</AlertTitle>
                          </Alert>
                        </div>
                      )}
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
                    disabled={isRegistering || Boolean(passwordError)}
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
