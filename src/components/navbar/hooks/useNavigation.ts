
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useNavigation = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { toast } = useToast();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
      toast({
        title: "Logout realizado",
        description: "Você foi desconectado com sucesso."
      });
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
      toast({
        variant: "destructive",
        title: "Erro ao fazer logout",
        description: "Ocorreu um erro ao tentar desconectar."
      });
    }
  };
  
  const navigateToDashboard = () => {
    if (isAdmin) {
      navigate('/admin');
    } else {
      navigate('/client');
    }
  };

  return {
    handleLogout,
    navigateToDashboard
  };
};
