import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserType } from "@/types/admin";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureUserProfile } from "@/utils/authUtils";

interface UserSelectorProps {
  users: UserType[];
  selectedUserId: string | null;
  setSelectedUserId: (id: string) => void;
  isLoadingUsers: boolean;
}

export const UserSelector = ({ 
  users, 
  selectedUserId, 
  setSelectedUserId,
  isLoadingUsers
}: UserSelectorProps) => {
  // Ensure that all auth users have corresponding profiles in the users table
  useEffect(() => {
    const syncUserProfiles = async () => {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (!authData.session) return;
        
        // This would typically be done through an edge function since we can't
        // directly query auth.users from the client
        // For now, we'll sync profiles when a user is selected
      } catch (error) {
        console.error("Error checking auth users:", error);
      }
    };
    
    syncUserProfiles();
  }, []);

  const handleSelectUser = async (user: UserType) => {
    try {
      // Primeiro defina o usuário selecionado para feedback imediato
      setSelectedUserId(user.id);
      
      // Em segundo plano, tente garantir que o perfil existe
      ensureUserProfile(
        user.id, 
        user.email || "", 
        user.name || "Usuário"
      ).then(({ error }) => {
        if (error) {
          console.log("Aviso: Perfil de usuário não encontrado, mas continuaremos usando o ID:", user.id);
          console.error("Erro ao garantir perfil do usuário:", error);
        }
      }).catch(error => {
        console.error("Erro ao selecionar usuário:", error);
      });
    } catch (error) {
      console.error("Error selecting user:", error);
      // Mesmo com erro, mantenha o usuário selecionado
    }
  };

  return (
    <Card className="md:col-span-1 bg-[#393532]">
      <CardHeader className="bg-[#393532] rounded-2xl">
        <CardTitle className="text-[#e8cc81]">Seleção de Usuário</CardTitle>
      </CardHeader>
      <CardContent className="py-0 my-0 bg-[#393532]">
        {isLoadingUsers ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
          </div>
        ) : (
          <>
            <p className="text-[#e9aa91]">
              Selecione um usuário para gerenciar seus documentos
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
              {users.map(user => (
                <Button 
                  key={user.id} 
                  variant={selectedUserId === user.id ? "default" : "outline"} 
                  className="w-full justify-start text-left" 
                  onClick={() => handleSelectUser(user)}
                >
                  <User className="mr-2 h-4 w-4" />
                  <div className="truncate">
                    <span>{user.name || "Usuário"}</span>
                    <span className="text-xs text-gray-400 block truncate">
                      {user.email}
                    </span>
                  </div>
                </Button>
              ))}
              {users.length === 0 && (
                <p className="text-[#e9aa91]">
                  Nenhum usuário encontrado
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
