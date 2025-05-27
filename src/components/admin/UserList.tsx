
import { ModernUserList } from "./users/ModernUserList";
import { UserType } from "@/types/admin";
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
  return (
    <ModernUserList
      supabaseUsers={supabaseUsers}
      users={users}
      isLoading={isLoading}
      setSelectedUserForPasswordChange={setSelectedUserForPasswordChange}
      passwordForm={passwordForm}
      refreshUsers={refreshUsers}
    />
  );
};
