
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Users, Shield } from "lucide-react";
import { UserCreationDialog } from "./components/UserCreationDialog";
import { UserFormData } from "./CreateUser";
import { useUserCreation } from "@/hooks/useUserCreation";
import { useToast } from "@/hooks/use-toast";
import { PremiumUserTable } from "./users/PremiumUserTable";
import { LoadingSpinner } from "../common/LoadingSpinner";

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    name?: string;
  };
}

interface UserListProps {
  supabaseUsers: AuthUser[];
  users: any[];
  isLoading: boolean;
  setSelectedUserId: (id: string) => void;
  setSelectedUserForPasswordChange: (user: any) => void;
  passwordForm: any;
  refreshUsers: () => void;
}

export const UserList = ({
  supabaseUsers,
  users,
  isLoading,
  setSelectedUserId,
  setSelectedUserForPasswordChange,
  passwordForm,
  refreshUsers
}: UserListProps) => {
  const [isUserCreationDialogOpen, setIsUserCreationDialogOpen] = useState(false);
  const { isCreatingUser, createUser } = useUserCreation(refreshUsers);
  const { toast } = useToast();

  const handleUserCreation = async (data: UserFormData) => {
    try {
      await createUser(data);
      setIsUserCreationDialogOpen(false);
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  // Verificar se o usuário é admin
  const isAdminUser = (authUserId: string, email: string | null) => {
    if (email === "wsgestao@gmail.com" || email === "l09022007@gmail.com") {
      return true;
    }
    const userInfo = users.find(u => u.id === authUserId);
    return ['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  };

  // Separar usuários por papel
  const adminUsers = supabaseUsers.filter(authUser => {
    if (authUser.email === "julia@gmail.com") {
      return true;
    }
    return isAdminUser(authUser.id, authUser.email);
  });
  
  const clientUsers = supabaseUsers.filter(authUser => {
    if (authUser.email === "julia@gmail.com") {
      return false;
    }
    return !isAdminUser(authUser.id, authUser.email);
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] p-8">
      {/* Header */}
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-[#efc349] text-4xl font-museo-moderno font-bold mb-2">
            Gerenciamento de Usuários
          </h1>
          <p className="text-[#b3b3b3] font-bebas-neue tracking-wide">
            Gerencie todos os usuários do sistema
          </p>
        </div>
        
        <Button 
          onClick={() => setIsUserCreationDialogOpen(true)}
          className="bg-[#efc349] hover:bg-[#d6a932] text-[#020817] font-bebas-neue font-medium transition-all duration-300 hover:scale-105"
        >
          <Plus className="mr-2 h-4 w-4" /> 
          Novo Usuário
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        <div className="bg-[#0b0f1c] border border-[#efc349] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#b3b3b3] font-bebas-neue text-sm uppercase tracking-wide">
                Total de Usuários
              </p>
              <p className="text-[#ffffff] text-3xl font-museo-moderno font-bold">
                {supabaseUsers.length}
              </p>
            </div>
            <Users className="w-8 h-8 text-[#efc349]" />
          </div>
        </div>
        
        <div className="bg-[#0b0f1c] border border-[#efc349] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#b3b3b3] font-bebas-neue text-sm uppercase tracking-wide">
                Clientes
              </p>
              <p className="text-[#ffffff] text-3xl font-museo-moderno font-bold">
                {clientUsers.length}
              </p>
            </div>
            <Users className="w-8 h-8 text-[#efc349]" />
          </div>
        </div>
        
        <div className="bg-[#0b0f1c] border border-[#efc349] rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[#b3b3b3] font-bebas-neue text-sm uppercase tracking-wide">
                Administradores
              </p>
              <p className="text-[#ffffff] text-3xl font-museo-moderno font-bold">
                {adminUsers.length}
              </p>
            </div>
            <Shield className="w-8 h-8 text-[#efc349]" />
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Seção de Clientes */}
        <PremiumUserTable
          users={clientUsers}
          userInfoList={users}
          title="Clientes"
          setSelectedUserId={setSelectedUserId}
          setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
          passwordForm={passwordForm}
          refreshUsers={refreshUsers}
          showDocumentButton={true}
          isAdminSection={false}
        />

        {/* Seção de Administradores */}
        <PremiumUserTable
          users={adminUsers}
          userInfoList={users}
          title="Administradores"
          setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
          passwordForm={passwordForm}
          refreshUsers={refreshUsers}
          isAdminSection={true}
        />
      </div>

      {/* User Creation Dialog */}
      <UserCreationDialog 
        isOpen={isUserCreationDialogOpen} 
        onClose={() => setIsUserCreationDialogOpen(false)} 
        onSubmit={handleUserCreation} 
        isCreating={isCreatingUser} 
      />
    </div>
  );
};
