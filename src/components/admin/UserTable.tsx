
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserRow } from "./tables/UserRow";
import { EmptyTableMessage } from "./tables/EmptyTableMessage";
import { UserTableHeader } from "./tables/UserTableHeader";

interface UserTableProps {
  supabaseUsers: any[];
  users: any[];
  isLoading: boolean;
  onPasswordChange: (user: any) => void;
  onDeleteUser: (user: any) => void;
  onEditName: (user: any) => void;
  onManageCompany?: (user: any) => void;
}

export const UserTable = ({ 
  supabaseUsers, 
  users, 
  isLoading, 
  onPasswordChange, 
  onDeleteUser, 
  onEditName,
  onManageCompany
}: UserTableProps) => {
  if (isLoading) {
    return <div className="text-center py-4">Carregando usuários...</div>;
  }

  const filteredAdminUsers = supabaseUsers.filter(user => 
    user.user_metadata?.role === 'admin' || user.email?.includes('admin')
  );

  const filteredClientUsers = supabaseUsers.filter(user => 
    !filteredAdminUsers.find(admin => admin.id === user.id)
  );

  return (
    <div className="space-y-8">
      {/* Admin Users Section */}
      <div>
        <UserTableHeader title="Administradores" count={filteredAdminUsers.length} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Data de Criação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredAdminUsers.length === 0 ? (
              <EmptyTableMessage message="Nenhum administrador encontrado" colSpan={2} />
            ) : (
              filteredAdminUsers.map((authUser) => {
                const userInfo = users.find(u => u.id === authUser.id);
                return (
                  <UserRow
                    key={authUser.id}
                    authUser={authUser}
                    userInfo={userInfo}
                    isAdminSection={true}
                    displayName={authUser.user_metadata?.name || authUser.email || "Sem nome"}
                    onEditName={() => onEditName(authUser)}
                    onChangePassword={() => onPasswordChange(authUser)}
                    onDelete={() => onDeleteUser(authUser)}
                    showDocumentButton={false}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Client Users Section */}
      <div>
        <UserTableHeader title="Clientes" count={filteredClientUsers.length} />
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nome</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredClientUsers.length === 0 ? (
              <EmptyTableMessage message="Nenhum cliente encontrado" colSpan={4} />
            ) : (
              filteredClientUsers.map((authUser) => {
                const userInfo = users.find(u => u.id === authUser.id);
                return (
                  <UserRow
                    key={authUser.id}
                    authUser={authUser}
                    userInfo={userInfo}
                    isAdminSection={false}
                    displayName={authUser.user_metadata?.name || "Sem nome"}
                    onEditName={() => onEditName(authUser)}
                    onChangePassword={() => onPasswordChange(authUser)}
                    onDelete={() => onDeleteUser(authUser)}
                    onManageCompany={() => onManageCompany?.(authUser)}
                  />
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
