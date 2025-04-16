
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { AuthUser } from "@/components/admin/types/userTable";

export const useUserProfileData = (refreshUsers: () => void) => {
  const [isEditingUser, setIsEditingUser] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const getUserName = (authUser: AuthUser) => {
    return authUser.user_metadata?.name || "Sem nome";
  };

  const handleEditName = (authUser: AuthUser) => {
    setIsEditingUser(authUser.id);
    setNewName(getUserName(authUser));
  };

  const handleSaveName = async (userId: string) => {
    if (!userId) return;
    
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: newName })
        .eq('id', userId);
        
      if (error) throw error;
      
      toast({
        title: "Nome atualizado",
        description: "O nome do usuário foi atualizado com sucesso.",
      });
      
      refreshUsers();
    } catch (error: any) {
      console.error("Erro ao atualizar nome:", error);
      toast({
        variant: "destructive",
        title: "Erro ao atualizar nome",
        description: error.message || "Ocorreu um erro ao atualizar o nome do usuário."
      });
    } finally {
      setIsEditingUser(null);
    }
  };

  const cancelEditing = () => {
    setIsEditingUser(null);
  };

  return {
    isEditingUser,
    newName,
    setNewName,
    getUserName,
    handleEditName,
    handleSaveName,
    cancelEditing
  };
};
