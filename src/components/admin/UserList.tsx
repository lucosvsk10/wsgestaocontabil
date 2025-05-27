import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserType } from "@/types/admin";
import { UserTable } from "./UserTable";
import { UserListDarkMode } from "./UserListDarkMode";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useStorageStats } from "@/hooks/useStorageStats";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UserCreationDialog } from "./components/UserCreationDialog";
import { UserFormData } from "./CreateUser";
import { useUserCreation } from "@/hooks/useUserCreation";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/contexts/ThemeContext";

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
  users: UserType[];
  isLoading: boolean;
  setSelectedUserId: (id: string) => void;
  setSelectedUserForPasswordChange: (user: UserType) => void;
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
  const { theme } = useTheme();
  const [isUserCreationDialogOpen, setIsUserCreationDialogOpen] = useState(false);
  const { isCreatingUser, createUser } = useUserCreation(refreshUsers);
  const { toast } = useToast();

  // Storage stats
  const {
    storageStats,
    isLoading: isLoadingStorage,
    error,
    fetchStorageStats
  } = useStorageStats();

  useEffect(() => {
    fetchStorageStats();
  }, []);

  const handleUserCreation = async (data: UserFormData) => {
    try {
      await createUser(data);
      setIsUserCreationDialogOpen(false);
    } catch (error) {
      console.error("Error creating user:", error);
    }
  };

  // Use dark mode component if theme is dark
  if (theme === 'dark') {
    return (
      <UserListDarkMode
        supabaseUsers={supabaseUsers}
        users={users}
        isLoading={isLoading}
        setSelectedUserId={setSelectedUserId}
        setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
        passwordForm={passwordForm}
        refreshUsers={refreshUsers}
      />
    );
  }

  // Keep existing light mode logic
  const isAdminUser = (authUserId: string, email: string | null) => {
    if (email === "wsgestao@gmail.com" || email === "l09022007@gmail.com") {
      return true;
    }
    const userInfo = users.find(u => u.id === authUserId);
    return ['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  };

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

  const totalDocuments = storageStats?.userStorage.reduce((acc, user) => {
    const estimatedDocCount = Math.ceil(user.sizeMB / 0.5);
    return acc + estimatedDocCount;
  }, 0) || 0;

  const storageLimitMB = 100;
  const usedStorageMB = storageStats?.totalStorageMB || 0;
  const remainingStorageMB = Math.max(0, storageLimitMB - usedStorageMB);

  return (
    <div className="space-y-12">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-[#020817] dark:text-[#efc349] mb-4 text-3xl font-extralight">Lista de Usuários</h1>
          <p className="text-gray-600 dark:text-white/70">Gerencie todos os usuários do sistema</p>
        </div>
        <Button onClick={() => setIsUserCreationDialogOpen(true)} className="transition-all duration-300 hover:scale-105">
          <Plus className="mr-2 h-4 w-4" /> 
          Novo Usuário
        </Button>
      </div>

      {/* Storage Statistics */}
      <div className="p-8 space-y-6 bg-white dark:bg-transparent rounded-xl border border-gray-100 dark:border-none">
        <h3 className="text-xl text-[#020817] dark:text-[#efc349] font-extralight">Estatísticas de Armazenamento</h3>
        
        {isLoadingStorage ? (
          <div className="flex justify-center py-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center py-4">
            Erro ao carregar estatísticas: {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <p className="text-sm text-[#6b7280] dark:text-white/70">Espaço Utilizado</p>
              <p className="text-2xl text-[#020817] dark:text-white font-thin">
                {usedStorageMB.toFixed(2)} MB de {storageLimitMB} MB
              </p>
              <div className="w-full bg-gray-200 rounded-full h-3 mt-3 dark:bg-gray-700">
                <div 
                  className="bg-[#2563eb] h-3 rounded-full dark:bg-[#efc349] transition-all duration-300" 
                  style={{ width: `${Math.min(100, usedStorageMB / storageLimitMB * 100)}%` }}
                ></div>
              </div>
            </div>
            
            <div className="space-y-3">
              <p className="text-sm text-[#6b7280] dark:text-white/70">Espaço Disponível</p>
              <p className="text-2xl text-[#020817] dark:text-white font-extralight">
                {remainingStorageMB.toFixed(2)} MB restantes
              </p>
            </div>
          </div>
        )}
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : (
        <div className="space-y-12">
          <UserTable 
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

          <UserTable 
            users={adminUsers} 
            userInfoList={users} 
            title="Administradores" 
            setSelectedUserForPasswordChange={setSelectedUserForPasswordChange} 
            passwordForm={passwordForm} 
            refreshUsers={refreshUsers} 
            isAdminSection={true} 
          />
        </div>
      )}

      <UserCreationDialog 
        isOpen={isUserCreationDialogOpen} 
        onClose={() => setIsUserCreationDialogOpen(false)} 
        onSubmit={handleUserCreation} 
        isCreating={isCreatingUser} 
      />
    </div>
  );
};
