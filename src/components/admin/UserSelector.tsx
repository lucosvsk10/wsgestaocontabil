
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserType } from "@/types/admin";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ensureUserProfile } from "@/utils/auth/userProfile";
import { useToast } from "@/hooks/use-toast";

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
  const { toast } = useToast();
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);

  // Verificar sessão ativa para debug
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        console.warn("Sem sessão ativa. Políticas RLS podem bloquear operações.");
      } else {
        console.log("Sessão autenticada ativa:", data.session.user.email);
      }
    };
    
    checkSession();
  }, []);

  // Garantir que o perfil do usuário está sempre criado ao selecionar
  useEffect(() => {
    if (selectedUserId) {
      const ensureSelectedUserProfile = async () => {
        const selectedUser = users.find(u => u.id === selectedUserId);
        if (selectedUser) {
          try {
            await ensureUserProfile(
              selectedUserId,
              selectedUser.email || "",
              selectedUser.name || "Usuário"
            );
          } catch (error) {
            console.warn("Erro ao garantir perfil de usuário selecionado:", error);
          }
        }
      };
      
      ensureSelectedUserProfile();
    }
  }, [selectedUserId, users]);

  const handleSelectUser = async (user: UserType) => {
    try {
      // Definir usuário selecionado imediatamente para feedback ao usuário
      setSelectedUserId(user.id);
      
      // Indicar que estamos processando este usuário
      setProcessingUserId(user.id);
      
      // Tentar garantir que o perfil do usuário existe em segundo plano
      const { data, error } = await ensureUserProfile(
        user.id, 
        user.email || "", 
        user.name || "Usuário"
      );

      if (error) {
        console.warn(`Aviso: Problemas ao verificar perfil do usuário ${user.name || user.email}`, error);
        // Não exibimos toast de erro aqui para não interromper o fluxo principal
      } else {
        console.log("Perfil do usuário confirmado:", data);
      }
    } catch (error) {
      console.error("Erro ao selecionar usuário:", error);
      toast({
        variant: "destructive",
        title: "Erro ao selecionar usuário",
        description: "Houve um problema ao acessar as informações do usuário."
      });
    } finally {
      setProcessingUserId(null);
    }
  };

  return (
    <Card className="md:col-span-1 bg-orange-200 dark:bg-navy-dark border border-gold/20">
      <CardHeader>
        <CardTitle className="text-navy dark:text-gold">Seleção de Usuário</CardTitle>
      </CardHeader>
      <CardContent className="py-0 my-0">
        {isLoadingUsers ? (
          <div className="flex justify-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gold"></div>
          </div>
        ) : (
          <>
            <p className="text-navy dark:text-white">
              Selecione um usuário para gerenciar seus documentos
            </p>
            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 mt-4">
              {users.map(user => (
                <Button 
                  key={user.id} 
                  variant={selectedUserId === user.id ? "default" : "outline"} 
                  className={`w-full justify-start text-left ${
                    selectedUserId === user.id 
                      ? 'bg-gold text-navy hover:bg-gold-light' 
                      : 'bg-orange-300/50 dark:bg-navy-light/50 text-navy dark:text-white hover:bg-gold/50 dark:hover:bg-gold/50 hover:text-navy dark:hover:text-navy border-gold/20'
                  }`}
                  onClick={() => handleSelectUser(user)}
                  disabled={processingUserId === user.id}
                >
                  <User className="mr-2 h-4 w-4" />
                  <div className="truncate">
                    <span>{user.name || "Usuário"}</span>
                    <span className={`text-xs ${
                      selectedUserId === user.id 
                        ? 'text-navy/70' 
                        : 'text-navy/70 dark:text-white/70'
                    } block truncate`}>
                      {user.email}
                    </span>
                  </div>
                  {processingUserId === user.id && (
                    <div className="ml-2 animate-spin h-3 w-3 border border-b-0 border-r-0 rounded-full" />
                  )}
                </Button>
              ))}
              {users.length === 0 && (
                <p className="text-navy dark:text-white">
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
