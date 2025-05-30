
import { useState } from "react";
import { UserTable } from "./UserTable";
import { CreateUser } from "./CreateUser";
import { PasswordChangeModal } from "./PasswordChangeModal";
import { CompanyDataModal } from "./modals/CompanyDataModal";
import { useUserTable } from "./hooks/useUserTable";

interface UserListProps {
  supabaseUsers: any[];
  users: any[];
  isLoading: boolean;
  setSelectedUserId: (userId: string | null) => void;
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
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [selectedCompanyUser, setSelectedCompanyUser] = useState<{ id: string; name: string } | null>(null);

  const {
    showPasswordModal,
    setShowPasswordModal,
    selectedUserForPasswordChange,
    handlePasswordChangeSuccess,
    handlePasswordChange,
    handleUserCreation,
    handleDeleteUser,
    handleNameEdit,
    isCreatingUser
  } = useUserTable(refreshUsers, setSelectedUserForPasswordChange);

  const handleManageCompany = (user: any) => {
    setSelectedCompanyUser({
      id: user.id,
      name: user.user_metadata?.name || user.email || 'Usuário'
    });
    setShowCompanyModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-extralight text-[#020817] dark:text-[#efc349]">
          Gerenciamento de Usuários
        </h2>
      </div>

      <CreateUser 
        onUserCreated={handleUserCreation}
        isCreating={isCreatingUser}
      />

      <UserTable
        supabaseUsers={supabaseUsers}
        users={users}
        isLoading={isLoading}
        onPasswordChange={handlePasswordChange}
        onDeleteUser={handleDeleteUser}
        onEditName={handleNameEdit}
        onManageCompany={handleManageCompany}
      />

      <PasswordChangeModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
        selectedUserForPasswordChange={selectedUserForPasswordChange}
        setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
        changeUserPassword={() => {}}
        isChangingPassword={false}
        passwordForm={passwordForm}
      />

      {selectedCompanyUser && (
        <CompanyDataModal
          open={showCompanyModal}
          onOpenChange={setShowCompanyModal}
          userId={selectedCompanyUser.id}
          userName={selectedCompanyUser.name}
        />
      )}
    </div>
  );
};
