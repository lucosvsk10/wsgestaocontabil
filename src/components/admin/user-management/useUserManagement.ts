
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useUserCreation } from "@/hooks/useUserCreation";
import { UserFormData } from "../CreateUser";
import { UserType } from "@/types/admin";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    name?: string;
  };
}

interface UseUserManagementProps {
  supabaseUsers: AuthUser[];
  users: UserType[];
  refreshUsers: () => void;
}

export const useUserManagement = ({
  supabaseUsers,
  users,
  refreshUsers
}: UseUserManagementProps) => {
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState("newest");
  const [isUserCreationDialogOpen, setIsUserCreationDialogOpen] = useState(false);
  const [selectedUserForDeletion, setSelectedUserForDeletion] = useState<AuthUser | null>(null);
  
  const { isCreatingUser, createUser } = useUserCreation(refreshUsers);

  const isAdminUser = (authUserId: string, email: string | null) => {
    if (email === "wsgestao@gmail.com" || email === "l09022007@gmail.com") {
      return true;
    }
    const userInfo = users.find(u => u.id === authUserId);
    return ['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  };

  const adminUsers = supabaseUsers.filter(authUser => {
    if (authUser.email === "julia@gmail.com") return true;
    return isAdminUser(authUser.id, authUser.email);
  });

  const clientUsers = supabaseUsers.filter(authUser => {
    if (authUser.email === "julia@gmail.com") return false;
    return !isAdminUser(authUser.id, authUser.email);
  });

  const handleUserCreation = async (data: UserFormData) => {
    try {
      await createUser(data);
      setIsUserCreationDialogOpen(false);
      toast({
        title: "Usuário criado com sucesso",
        description: "O novo usuário foi adicionado ao sistema."
      });
      // Força atualização da lista após criação
      refreshUsers();
    } catch (error) {
      console.error("Error creating user:", error);
      toast({
        title: "Erro ao criar usuário",
        description: "Ocorreu um erro ao criar o usuário. Tente novamente.",
        variant: "destructive"
      });
    }
  };

  const handleDeleteUser = (userId: string) => {
    const userToDelete = supabaseUsers.find(u => u.id === userId);
    if (userToDelete) {
      setSelectedUserForDeletion(userToDelete);
    }
  };

  const handleDeleteSuccess = () => {
    setSelectedUserForDeletion(null);
    refreshUsers();
  };

  return {
    searchTerm,
    setSearchTerm,
    sortOrder,
    setSortOrder,
    isUserCreationDialogOpen,
    setIsUserCreationDialogOpen,
    isCreatingUser,
    adminUsers,
    clientUsers,
    selectedUserForDeletion,
    setSelectedUserForDeletion,
    handleUserCreation,
    handleDeleteUser,
    handleDeleteSuccess
  };
};
