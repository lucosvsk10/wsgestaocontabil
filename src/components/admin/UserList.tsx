
import { LoadingSpinner } from "../common/LoadingSpinner";
import { UserCreationDialog } from "./components/UserCreationDialog";
import { DeleteUserDialog } from "./DeleteUserDialog";
import { UserListHeader } from "./user-management/UserListHeader";
import { UserSearchAndFilter } from "./user-management/UserSearchAndFilter";
import { UserTableComponent } from "./user-management/UserTableComponent";
import { useUserManagement } from "./user-management/useUserManagement";
import { UserType } from "@/types/admin";

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
  passwordForm: unknown;
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
  const {
    searchTerm,
    setSearchTerm,
    sortOrder,
    setSortOrder,
    isUserCreationDialogOpen,
    setIsUserCreationDialogOpen,
    isCreatingUser,
    adminUsers,
    clientUsers,
    selectedUserForDeletion,
    setSelectedUserForDeletion,
    handleUserCreation,
    handleDeleteUser,
    handleDeleteSuccess
  } = useUserManagement({ supabaseUsers, users, refreshUsers });

  if (isLoading) {
    return (
      <div className="flex min-h-[420px] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="admin-page">
        {/* Header */}
        <UserListHeader onCreateUser={() => setIsUserCreationDialogOpen(true)} />

        {/* Search and Filter */}
        <UserSearchAndFilter
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />

        <section className="admin-kpi-grid">
          <div className="admin-kpi"><p className="admin-kpi-label">Clientes</p><p className="admin-kpi-value">{clientUsers.length}</p><p className="admin-kpi-meta">Empresas cadastradas</p></div>
          <div className="admin-kpi"><p className="admin-kpi-label">Equipe interna</p><p className="admin-kpi-value">{adminUsers.length}</p><p className="admin-kpi-meta">Acessos administrativos</p></div>
          <div className="admin-kpi"><p className="admin-kpi-label">Total de acessos</p><p className="admin-kpi-value">{supabaseUsers.length}</p><p className="admin-kpi-meta">Usuários autenticados</p></div>
          <div className="admin-kpi"><p className="admin-kpi-label">Resultado da busca</p><p className="admin-kpi-value">{clientUsers.filter(user => `${user.email || ''} ${user.user_metadata?.name || ''}`.toLowerCase().includes(searchTerm.toLowerCase())).length}</p><p className="admin-kpi-meta">Clientes encontrados</p></div>
        </section>

        <UserTableComponent usersList={clientUsers} users={users} title="Empresas e clientes" searchTerm={searchTerm} sortOrder={sortOrder} onDeleteUser={handleDeleteUser} />
        <UserTableComponent usersList={adminUsers} users={users} title="Equipe administrativa" isAdmin={true} searchTerm={searchTerm} sortOrder={sortOrder} onDeleteUser={handleDeleteUser} />

        {/* User Creation Dialog */}
        <UserCreationDialog
          isOpen={isUserCreationDialogOpen}
          onClose={() => setIsUserCreationDialogOpen(false)}
          onSubmit={handleUserCreation}
          isCreating={isCreatingUser}
        />

        {/* User Deletion Dialog */}
        {selectedUserForDeletion && (
          <DeleteUserDialog
            open={true}
            onOpenChange={(open) => !open && setSelectedUserForDeletion(null)}
            authUser={selectedUserForDeletion}
            onSuccess={handleDeleteSuccess}
          />
        )}
    </div>
  );
};
