
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
      <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] flex justify-center items-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fdfdfd] dark:bg-[#020817] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <UserListHeader onCreateUser={() => setIsUserCreationDialogOpen(true)} />

        {/* Search and Filter */}
        <UserSearchAndFilter
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          sortOrder={sortOrder}
          setSortOrder={setSortOrder}
        />

        {/* User Tables */}
        <UserTableComponent
          usersList={clientUsers}
          users={users}
          title="Clientes"
          searchTerm={searchTerm}
          sortOrder={sortOrder}
          onDeleteUser={handleDeleteUser}
        />
        
        <UserTableComponent
          usersList={adminUsers}
          users={users}
          title="Administradores"
          isAdmin={true}
          searchTerm={searchTerm}
          sortOrder={sortOrder}
          onDeleteUser={handleDeleteUser}
        />

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
    </div>
  );
};
