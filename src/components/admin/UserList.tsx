
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
  // Função para encontrar o role de um usuário
  const getUserRole = (authUserId: string, email: string | null) => {
    // Verificar se é o usuário especial "wsgestao@gmail.com"
    if (email === "wsgestao@gmail.com") {
      return "geral";
    }
    const userInfo = users.find(u => u.id === authUserId);
    return userInfo?.role || "client";
  };

  // Verificar se o usuário é admin (qualquer tipo de administrador)
  const isAdminUser = (authUserId: string, email: string | null) => {
    // Hard-coded admin emails sempre são considerados admin
    if (email === "wsgestao@gmail.com" || email === "l09022007@gmail.com") {
      return true;
    }
    const role = getUserRole(authUserId, email);
    return ['fiscal', 'contabil', 'geral'].includes(role);
  };

  // Separar usuários por papel (administradores e clientes)
  const adminUsers = supabaseUsers.filter(authUser => {
    const role = getUserRole(authUser.id, authUser.email);
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
  return <Card className="px-0 bg-[#393532] dark:bg-[#2d2a28] border border-gold/20">
      <CardHeader className="rounded-full bg-[#393532] dark:bg-[#2d2a28]">
        <CardTitle className="text-[#e8cc81] bg-transparent text-center text-2xl font-normal">LISTA DE USUARIOS</CardTitle>
      </CardHeader>
      <CardContent className="rounded-full bg-[#393532] dark:bg-[#2d2a28] space-y-6">
        {isLoading ? <LoadingSpinner /> : <>
            {/* Seção de Clientes */}
            <UserTable users={clientUsers} userInfoList={users} title="Clientes" roleLabel="Cliente" roleClassName="bg-blue-900 text-blue-100" setSelectedUserId={setSelectedUserId} setSelectedUserForPasswordChange={setSelectedUserForPasswordChange} passwordForm={passwordForm} refreshUsers={refreshUsers} showDocumentButton={true} isAdminSection={false} />

            {/* Seção de Administradores */}
            <UserTable users={adminUsers} userInfoList={users} title="Administradores" roleLabel="Administrador" roleClassName="bg-purple-900 text-purple-100" setSelectedUserForPasswordChange={setSelectedUserForPasswordChange} passwordForm={passwordForm} refreshUsers={refreshUsers} specialEmail="wsgestao@gmail.com" specialRoleLabel="Geral" specialRoleClassName="bg-[#e8cc81] text-navy" isAdminSection={true} />
          </>}
      </CardContent>
    </Card>;
};
