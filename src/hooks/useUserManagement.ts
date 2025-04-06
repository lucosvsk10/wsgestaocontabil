import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserType } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const useUserManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingAuthUsers, setIsLoadingAuthUsers] = useState(true);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [selectedUserForPasswordChange, setSelectedUserForPasswordChange] = useState<UserType | null>(null);

  // Carregar usuários
  useEffect(() => {
    fetchUsers();
  }, []);

  // Carregar usuários do auth.users usando a edge function
  useEffect(() => {
    fetchAuthUsers();
  }, []);

  // Função para buscar usuários do banco de dados
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: error.message
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Função para buscar usuários autenticados
  const fetchAuthUsers = async () => {
    try {
      setIsLoadingAuthUsers(true);
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Você precisa estar logado para acessar os usuários");
      }
      
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/admin-operations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          action: "getUsers"
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao carregar usuários");
      }

      setSupabaseUsers(result.users || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários do auth.users:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: error.message
      });
    } finally {
      setIsLoadingAuthUsers(false);
    }
  };

  // Função para criar um novo usuário
  const createUser = async (data: any) => {
    setIsCreatingUser(true);
    try {
      // 1. Registrar o usuário no Auth
      const { error: signUpError, data: authData } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
      });

      if (signUpError) throw signUpError;

      if (authData?.user) {
        // 2. Adicionar informações do usuário na tabela users
        const { error: profileError } = await supabase.from('users').insert({
          id: authData.user.id,
          email: data.email,
          name: data.name,
          role: data.isAdmin ? 'admin' : 'client',
        });

        if (profileError) throw profileError;

        // 3. Atualizar a lista de usuários
        await fetchUsers();
        
        // 4. Atualizar a lista de usuários do auth
        await fetchAuthUsers();

        toast({
          title: "Usuário criado com sucesso",
          description: `${data.name} (${data.email}) foi cadastrado no sistema como ${data.isAdmin ? 'administrador' : 'cliente'}.`
        });
      }
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

  // Função para alterar a senha de um usuário
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
    users,
    supabaseUsers,
    isLoadingUsers,
    isLoadingAuthUsers,
    isCreatingUser,
    isChangingPassword,
    selectedUserForPasswordChange,
    setSelectedUserForPasswordChange,
    createUser,
    changeUserPassword,
    fetchAuthUsers,
    fetchUsers
  };
};
