
import { UserType } from "@/types/admin";
import { PasswordChangeModal } from "@/components/admin/PasswordChangeModal";

interface AdminPasswordChangeModalProps {
  selectedUserForPasswordChange: UserType | null;
  setSelectedUserForPasswordChange: (user: UserType | null) => void;
  changeUserPassword: (data: any) => void;
  isChangingPassword: boolean;
  passwordForm: any;
  passwordChangeModalOpen: boolean;
  setPasswordChangeModalOpen: (value: boolean) => void;
}

export const AdminPasswordChangeModal = ({
  selectedUserForPasswordChange,
  setSelectedUserForPasswordChange,
  changeUserPassword,
  isChangingPassword,
  passwordForm,
  passwordChangeModalOpen,
  setPasswordChangeModalOpen
}: AdminPasswordChangeModalProps) => {
  if (!selectedUserForPasswordChange) return null;
  
  return (
    <PasswordChangeModal 
      selectedUserForPasswordChange={selectedUserForPasswordChange}
      setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
      changeUserPassword={changeUserPassword}
      isChangingPassword={isChangingPassword}
      passwordForm={passwordForm}
      open={passwordChangeModalOpen}
      onOpenChange={setPasswordChangeModalOpen}
    />
  );
};
