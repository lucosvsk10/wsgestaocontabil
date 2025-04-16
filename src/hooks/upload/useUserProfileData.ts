
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";
import { AuthUser } from "@/components/admin/types/userTable";

export const useUserProfileData = (refreshUsers: () => void) => {
  const [isEditingUser, setIsEditingUser] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);

  const getUserName = (authUser: AuthUser) => {
    return authUser.user_metadata?.name || "Sem nome";
  };

  const handleEditName = (authUser: AuthUser) => {
    setIsEditingUser(authUser.id);
    setNewName(getUserName(authUser));
    setNameError(null);
  };

  const validateName = (name: string): boolean => {
    // Remove white spaces and check if there are at least 3 characters
    const trimmedName = name.trim();
    if (trimmedName.length < 3) {
      setNameError("O nome deve ter pelo menos 3 caracteres (desconsiderando espaços).");
      return false;
    }
    setNameError(null);
    return true;
  };

  const handleSaveName = async (userId: string) => {
    if (!userId) return;
    
    if (!validateName(newName)) {
      return;
    }
    
    try {
      // Update name in users table
      const { error: dbError } = await supabase
        .from('users')
        .update({ name: newName.trim() })
        .eq('id', userId);
        
      if (dbError) throw dbError;
      
      // Update name in auth.user_metadata
      const { error: authError } = await supabase.auth.admin.updateUserById(
        userId,
        { user_metadata: { name: newName.trim() } }
      );
      
      if (authError) throw authError;
      
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
    setNameError(null);
  };

  return {
    isEditingUser,
    newName,
    setNewName,
    nameError,
    getUserName,
    handleEditName,
    handleSaveName,
    cancelEditing
  };
};
