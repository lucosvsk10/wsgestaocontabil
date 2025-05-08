
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserType } from "@/types/admin";
import { UserTable } from "./UserTable";
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

  return (
    <Card className="px-0 bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
      <CardHeader className="rounded-full bg-white dark:bg-navy-dark">
        <CardTitle className="text-navy dark:text-gold bg-transparent text-center text-2xl font-normal">LISTA DE USUARIOS</CardTitle>
      </CardHeader>
      <CardContent className="rounded-full bg-white dark:bg-navy-dark space-y-6">
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
    </Card>
  );
};
