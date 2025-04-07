
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useUserCreation = (onUserCreated: () => void) => {
  const { toast } = useToast();
  const [isCreatingUser, setIsCreatingUser] = useState(false);

  const createUser = async (data: any) => {
    setIsCreatingUser(true);
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Você precisa estar logado para criar usuários");
      }
      
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          name: data.name,
          isAdmin: data.isAdmin
        })
      });

      const responseData = await response.json();
      
      if (!response.ok) {
        throw new Error(responseData.error || "Erro ao criar usuário");
      }

      // Notify successful creation
      toast({
        title: "Usuário criado com sucesso",
        description: `${data.name} (${data.email}) foi cadastrado no sistema como ${data.isAdmin ? 'administrador' : 'cliente'}.`
      });

      // Call callback to refresh users
      onUserCreated();
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast({
        variant: "destructive",
        title: "Erro ao criar usuário",
        description: error.message
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  return {
    isCreatingUser,
    createUser
  };
};
