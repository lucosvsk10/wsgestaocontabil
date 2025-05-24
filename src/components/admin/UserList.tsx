
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserType } from "@/types/admin";
import { UserTable } from "./UserTable";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { useStorageStats } from "@/hooks/useStorageStats";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { UserCreationDialog } from "./components/UserCreationDialog";
import { UserFormData } from "./CreateUser";
import { useUserCreation } from "@/hooks/useUserCreation";
import { useToast } from "@/hooks/use-toast";

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
  // User creation dialog state
  const [isUserCreationDialogOpen, setIsUserCreationDialogOpen] = useState(false);
  const {
    isCreatingUser,
    createUser
  } = useUserCreation(refreshUsers);
  const {
    toast
  } = useToast();

  // Storage stats
  const {
    storageStats,
    isLoading: isLoadingStorage,
    error,
    fetchStorageStats
  } = useStorageStats();

  // Fetch storage stats when component mounts
  useEffect(() => {
    fetchStorageStats();
  }, []);

  // Handle user creation submission
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
    // Hard-coded admin emails sempre são considerados admin
    if (email === "wsgestao@gmail.com" || email === "l09022007@gmail.com") {
      return true;
    }
    const userInfo = users.find(u => u.id === authUserId);
    return ['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  };

  // Separar usuários por papel (administradores e clientes)
  const adminUsers = supabaseUsers.filter(authUser => {
    // Verificar julia@gmail.com explicitamente para garantir que apareça como fiscal
    if (authUser.email === "julia@gmail.com") {
      return true; // Incluir na seção de administradores
    }
    return isAdminUser(authUser.id, authUser.email);
  });
  
  const clientUsers = supabaseUsers.filter(authUser => {
    // Verificar julia@gmail.com explicitamente para garantir que não apareça como cliente
    if (authUser.email === "julia@gmail.com") {
      return false; // Não incluir na seção de clientes
    }
    return !isAdminUser(authUser.id, authUser.email);
  });

  // Calculate the total number of documents
  const totalDocuments = storageStats?.userStorage.reduce((acc, user) => {
    // Since we don't have document count in the API response, we'll estimate based on average file size
    // This is a placeholder and would ideally be replaced with actual document count
    const estimatedDocCount = Math.ceil(user.sizeMB / 0.5); // Assuming average document is 0.5MB
    return acc + estimatedDocCount;
  }, 0) || 0;

  // Storage limit in MB (can be adjusted later)
  const storageLimitMB = 100;
  const usedStorageMB = storageStats?.totalStorageMB || 0;
  const remainingStorageMB = Math.max(0, storageLimitMB - usedStorageMB);

  return (
    <Card className="border border-[#e6e6e6] bg-white shadow-sm rounded-lg dark:border dark:border-[#efc349] dark:bg-transparent">
      <CardHeader className="border-b border-[#e6e6e6] bg-white rounded-t-lg dark:border-[#efc349] dark:bg-transparent">
        <div className="flex justify-between items-center">
          <CardTitle className="text-2xl font-semibold text-[#020817] dark:text-[#efc349]">Lista de Usuários</CardTitle>
          <Button onClick={() => setIsUserCreationDialogOpen(true)} className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349] dark:hover:text-[#020817]">
            <Plus className="mr-2 h-4 w-4 text-[#efc349] dark:text-[#efc349]" /> Novo Usuário
          </Button>
        </div>
      </CardHeader>

      {/* Storage Statistics */}
      <CardContent className="border-b border-[#e6e6e6] mb-4 pb-4 dark:border-[#efc349]">
        <div className="rounded-lg p-4 shadow-sm bg-white border border-[#e6e6e6] dark:bg-transparent dark:border dark:border-[#efc349]">
          <h3 className="mb-3 text-lg font-semibold text-[#020817] dark:text-[#efc349]">Estatísticas de Armazenamento</h3>
          
          {isLoadingStorage ? (
            <div className="flex justify-center py-4">
              <LoadingSpinner />
            </div>
          ) : error ? (
            <div className="text-red-500 text-center py-2">
              Erro ao carregar estatísticas: {error}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded p-3 border border-[#e6e6e6] bg-white shadow-sm dark:border dark:border-[#efc349] dark:bg-transparent">
                <p className="text-sm text-[#6b7280] dark:text-white/70">Espaço Utilizado</p>
                <p className="text-lg font-semibold text-[#020817] dark:text-white">
                  {usedStorageMB.toFixed(2)} MB de {storageLimitMB} MB
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2 dark:bg-gray-600">
                  <div 
                    className="bg-[#2563eb] h-2.5 rounded-full dark:bg-[#efc349]" 
                    style={{width: `${Math.min(100, usedStorageMB / storageLimitMB * 100)}%`}}
                  ></div>
                </div>
              </div>
              
              <div className="rounded p-3 border border-[#e6e6e6] bg-white shadow-sm dark:border dark:border-[#efc349] dark:bg-transparent">
                <p className="text-sm text-[#6b7280] dark:text-white/70">Espaço Disponível</p>
                <p className="text-lg font-semibold text-[#020817] dark:text-white">
                  {remainingStorageMB.toFixed(2)} MB restantes
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>

      <CardContent className="space-y-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : (
          <>
            {/* Seção de Clientes */}
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

            {/* Seção de Administradores */}
            <UserTable 
              users={adminUsers} 
              userInfoList={users} 
              title="Administradores" 
              setSelectedUserForPasswordChange={setSelectedUserForPasswordChange} 
              passwordForm={passwordForm} 
              refreshUsers={refreshUsers} 
              isAdminSection={true} 
            />
          </>
        )}
      </CardContent>

      {/* User Creation Dialog */}
      <UserCreationDialog 
        isOpen={isUserCreationDialogOpen} 
        onClose={() => setIsUserCreationDialogOpen(false)} 
        onSubmit={handleUserCreation} 
        isCreating={isCreatingUser} 
      />
    </Card>
  );
};
