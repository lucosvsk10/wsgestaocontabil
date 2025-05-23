
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Icons } from '@/components/icons/Icons';
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
import { Mail, Lock } from 'lucide-react';

const ClientLogin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
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
    <div className="flex justify-center items-center min-h-screen w-full px-4 bg-gray-50 dark:bg-deepNavy">
      <div className="w-full max-w-md">
        {/* Login Logo/Header */}
        <div className="flex justify-center mb-6">
          <img 
            src="/lovable-uploads/4b269729-8d34-4824-8425-cc8c319161a8.png" 
            alt="WS Gestão Contábil" 
            className="h-20"
          />
        </div>

        <Card className="shadow-lg border-gray-200 dark:border-gold/30 rounded-lg dark:bg-transparent backdrop-blur-sm">
          <CardHeader className="space-y-1 pb-2">
            <CardTitle className="text-2xl font-semibold text-center text-navy dark:text-gold">
              Acesso ao Sistema
            </CardTitle>
            <CardDescription className="text-center text-gray-500 dark:text-[#d9d9d9]">
              Digite seu email e senha para acessar sua conta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label 
                  htmlFor="email" 
                  className="text-sm font-medium text-navy dark:text-[#d9d9d9]"
                >
                  Email
                </Label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                    <Mail className="h-5 w-5 text-gray-400 dark:text-gold" />
                  </div>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="exemplo@email.com"
                    className="pl-10 bg-white dark:bg-transparent border-gray-300 dark:border-gold/30 focus:ring-2 focus:ring-blue-500 dark:focus:ring-gold/40 rounded-lg"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label 
                    htmlFor="password" 
                    className="text-sm font-medium text-navy dark:text-[#d9d9d9]"
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
                    <Lock className="h-5 w-5 text-gray-400 dark:text-gold" />
                  </div>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="******"
                    className="pl-10 bg-white dark:bg-transparent border-gray-300 dark:border-gold/30 focus:ring-2 focus:ring-blue-500 dark:focus:ring-gold/40 rounded-lg"
                  />
                </div>
              </div>
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-11 text-white bg-blue-600 hover:bg-blue-700 dark:bg-transparent dark:border dark:border-gold/40 dark:text-[#d9d9d9] dark:hover:bg-gold/10 font-medium rounded-lg transition-all duration-200 shadow-md"
              >
                {loading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" />
                    <span>Entrando...</span>
                  </>
                ) : 'Entrar'}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-0">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-300 dark:border-gold/30" />
              </div>
              <div className="relative flex justify-center text-xs">
                <span className="bg-white dark:bg-deepNavy px-2 text-gray-500 dark:text-[#d9d9d9]">
                  ou
                </span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-sm text-gray-500 dark:text-[#d9d9d9]">
                Não possui uma conta?{' '}
                <a 
                  href="#" 
                  className="font-medium text-blue-600 hover:text-blue-500 dark:text-gold/80 dark:hover:text-gold transition-colors"
                >
                  Entre em contato - WhatsApp: 82999324884
                </a>
              </p>
            </div>
          </CardFooter>
        </Card>

        <p className="mt-8 text-center text-sm text-gray-500 dark:text-[#d9d9d9]">
          © {new Date().getFullYear()} WS Gestão Contábil. Todos os direitos reservados.
        </p>
      </div>
    </div>
  );
};

export default ClientLogin;
