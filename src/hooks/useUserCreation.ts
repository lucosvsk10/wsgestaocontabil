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
      if (!accessToken) throw new Error("Você precisa estar logado para criar usuários");

      let userRole = data.role || 'client';
      if (!['admin', 'fiscal', 'contabil', 'geral', 'client'].includes(userRole)) userRole = 'client';

      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/create-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          email: data.email,
          username: data.username,
          password: data.password,
          name: data.name,
          isAdmin: data.isAdmin,
          role: userRole,
          user_metadata: { name: data.name }
        })
      });

      const responseData = await response.json();
      if (!response.ok) throw new Error(responseData.error || "Erro ao criar usuário");

      const credential = userRole === 'client' ? responseData?.user?.username : responseData?.user?.email;
      toast({
        title: "Usuário criado com sucesso",
        description: `${data.name}${credential ? ` (${credential})` : ''} foi cadastrado no sistema.`
      });
      onUserCreated();
      return responseData;
    } catch (error: any) {
      console.error('Erro ao criar usuário:', error);
      toast({ variant: "destructive", title: "Erro ao criar usuário", description: error.message });
      throw error;
    } finally {
      setIsCreatingUser(false);
    }
  };

  return { isCreatingUser, createUser };
};