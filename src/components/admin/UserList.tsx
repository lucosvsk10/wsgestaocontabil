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
  user_metadata?: { name?: string };
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

export const UserList = ({ supabaseUsers, users, isLoading, refreshUsers }: UserListProps) => {
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

  if (isLoading) return <div className="flex min-h-[60vh] items-center justify-center bg-background"><LoadingSpinner /></div>;

  return (
    <div className="bg-background px-4 py-5 text-foreground sm:px-5 sm:py-6 lg:px-8">
      <div className="mx-auto max-w-[1480px] space-y-6">
        <UserListHeader onCreateUser={() => setIsUserCreationDialogOpen(true)} />

        <div className="rounded-2xl border border-border/55 bg-card p-4 shadow-sm">
          <UserSearchAndFilter searchTerm={searchTerm} setSearchTerm={setSearchTerm} sortOrder={sortOrder} setSortOrder={setSortOrder} />
        </div>

        <UserTableComponent usersList={clientUsers} users={users} title="Acessos de clientes" searchTerm={searchTerm} sortOrder={sortOrder} onDeleteUser={handleDeleteUser} />
        <UserTableComponent usersList={adminUsers} users={users} title="Administradores" isAdmin={true} searchTerm={searchTerm} sortOrder={sortOrder} onDeleteUser={handleDeleteUser} />

        <UserCreationDialog isOpen={isUserCreationDialogOpen} onClose={() => setIsUserCreationDialogOpen(false)} onSubmit={handleUserCreation} isCreating={isCreatingUser} />
        {selectedUserForDeletion && <DeleteUserDialog open={true} onOpenChange={(open) => !open && setSelectedUserForDeletion(null)} authUser={selectedUserForDeletion} onSuccess={handleDeleteSuccess} />}
      </div>
    </div>
  );
};
