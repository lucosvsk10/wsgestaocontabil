
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const useUserTable = (refreshUsers: () => void, setSelectedUserForPasswordChange: (user: any) => void) => {
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUserForPasswordChangeLocal, setSelectedUserForPasswordChangeLocal] = useState<any>(null);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const { toast } = useToast();

  const handlePasswordChangeSuccess = () => {
    setShowPasswordModal(false);
    setSelectedUserForPasswordChangeLocal(null);
    toast({
      title: "Sucesso",
      description: "Senha alterada com sucesso."
    });
  };

  const handlePasswordChange = (user: any) => {
    setSelectedUserForPasswordChangeLocal(user);
    setSelectedUserForPasswordChange(user);
    setShowPasswordModal(true);
  };

  const handleUserCreation = async (userData: any) => {
    setIsCreatingUser(true);
    try {
      // Implementar lógica de criação de usuário
      toast({
        title: "Sucesso",
        description: "Usuário criado com sucesso."
      });
      refreshUsers();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao criar usuário.",
        variant: "destructive"
      });
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleDeleteUser = async (user: any) => {
    try {
      // Implementar lógica de exclusão
      toast({
        title: "Sucesso",
        description: "Usuário excluído com sucesso."
      });
      refreshUsers();
    } catch (error) {
      toast({
        title: "Erro",
        description: "Erro ao excluir usuário.",
        variant: "destructive"
      });
    }
  };

  const handleNameEdit = (user: any) => {
    // Implementar lógica de edição de nome
    console.log("Editar nome do usuário:", user);
  };

  return {
    showPasswordModal,
    setShowPasswordModal,
    selectedUserForPasswordChange: selectedUserForPasswordChangeLocal,
    handlePasswordChangeSuccess,
    handlePasswordChange,
    handleUserCreation,
    handleDeleteUser,
    handleNameEdit,
    isCreatingUser
  };
};
