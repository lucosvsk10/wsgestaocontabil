
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserType } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const usePasswordManagement = () => {
  const { toast } = useToast();
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [selectedUserForPasswordChange, setSelectedUserForPasswordChange] = useState<UserType | null>(null);

  const changeUserPassword = async (data: any) => {
    if (!selectedUserForPasswordChange) return;
    
    setIsChangingPassword(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Você precisa estar logado para realizar esta ação");
      }
      
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/changeUserPassword`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          userId: selectedUserForPasswordChange.id,
          newPassword: data.password
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao alterar senha');
      }

      toast({
        title: "Senha alterada com sucesso",
        description: `A senha de ${selectedUserForPasswordChange.name || selectedUserForPasswordChange.email} foi atualizada.`
      });

      setSelectedUserForPasswordChange(null);
    } catch (error: any) {
      console.error('Erro ao alterar senha:', error);
      toast({
        variant: "destructive",
        title: "Erro ao alterar senha",
        description: error.message
      });
    } finally {
      setIsChangingPassword(false);
    }
  };

  return {
    isChangingPassword,
    selectedUserForPasswordChange,
    setSelectedUserForPasswordChange,
    changeUserPassword
  };
};
