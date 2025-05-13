
import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Mail, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

const ClientLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos.',
        variant: 'destructive',
      });
      return;
    }
    
    setLoading(true);
    try {
      const {error} = await signIn(email, password);
      
      if (error) {
        throw error;
      }
      
      toast({
        title: 'Login realizado com sucesso',
        description: 'Você será redirecionado para o painel.',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Erro ao fazer login:', error);
      
      let errorMessage = 'Ocorreu um erro ao fazer login.';
      
      if (error.message) {
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Credenciais inválidas. Por favor, verifique seu email e senha.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Por favor, verifique sua caixa de entrada.';
        }
      }
      
      toast({
        title: 'Erro',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen w-full px-4 bg-white dark:bg-navy-dark">
      <div className="w-full max-w-md">
        {/* Login Logo/Header */}
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/4b269729-8d34-4824-8425-cc8c319161a8.png" 
            alt="WS Gestão Contábil" 
            className="h-20"
          />
        </div>

        <Card className="shadow-md border-gray-200 rounded-2xl bg-white dark:border-gold/20 dark:bg-navy-deeper">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-2xl font-semibold text-center text-navy dark:text-gold">
              Acesso ao Sistema
            </CardTitle>
            <CardDescription className="text-center text-gray-500 dark:text-gray-400">
              Digite seu email e senha para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-sm font-medium text-navy dark:text-white"
                >
                  Email
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl dark:bg-navy-light/20 dark:border-navy-lighter"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label 
                    htmlFor="password" 
                    className="text-sm font-medium text-navy dark:text-white"
                  >
                    Senha
                  </Label>
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
                    placeholder="******"
                    className="pl-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-xl dark:bg-navy-light/20 dark:border-navy-lighter"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-gold"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 text-white bg-blue-600 hover:bg-blue-700 dark:bg-gold dark:text-navy dark:hover:bg-gold-light font-medium rounded-xl transition-all duration-200 shadow-sm"
              >
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
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
  );
};

export default ClientLogin;
