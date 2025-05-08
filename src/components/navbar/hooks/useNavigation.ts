
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

export const useNavigation = () => {
  const navigate = useNavigate();
  const { signOut, isAdmin } = useAuth();
  const { toast } = useToast();
  const { notifyLogin, notifyLogout } = useNotifications();
  
  // Navigate to appropriate dashboard based on user role
  const navigateToDashboard = () => {
    if (isAdmin) {
      navigate("/admin");
    } else {
      navigate("/client");
    }
  };

  // Handle user logout
  const handleLogout = async () => {
    try {
      // Create logout notification before signing out
      await notifyLogout();
      
      const { error } = await signOut();
      
      if (error) {
        toast({
          title: "Erro ao fazer logout",
          description: error.message,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Logout realizado com sucesso",
          description: "Você foi desconectado."
        });
        
        // Navigate back to homepage
        navigate("/");
      }
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  return {
    navigateToDashboard,
    handleLogout
  };
};
