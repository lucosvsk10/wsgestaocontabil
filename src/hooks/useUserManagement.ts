
import { useDatabaseUsersManagement } from "./auth/useDatabaseUsersManagement";
import { useAuthUsersManagement } from "./auth/useAuthUsersManagement";
import { useUserCreation } from "./useUserCreation";
import { usePasswordManagement } from "./usePasswordManagement";

export const useUserManagement = () => {
  // Database users hook
  const { 
    users, 
    isLoadingUsers, 
    fetchUsers 
  } = useDatabaseUsersManagement();
  
  // Auth users hook
  const {
    supabaseUsers,
    isLoadingAuthUsers,
    fetchAuthUsers
  } = useAuthUsersManagement();

  // Function to refresh all user data
  const refreshUsers = () => {
    fetchUsers();
    fetchAuthUsers();
  };

  // User creation hook
  const { isCreatingUser, createUser } = useUserCreation(refreshUsers);

  // Password management hook
  const {
    isChangingPassword,
    selectedUserForPasswordChange,
    setSelectedUserForPasswordChange,
    changeUserPassword
  } = usePasswordManagement();

  return {
    // Users data
    users,
    supabaseUsers,
    isLoadingUsers,
    isLoadingAuthUsers,
    
    // User creation
    isCreatingUser,
    createUser,
    
    // Password management
    isChangingPassword,
    selectedUserForPasswordChange,
    setSelectedUserForPasswordChange,
    changeUserPassword,
    
    // Refresh function
    fetchAuthUsers,
    fetchUsers,
    refreshUsers
  };
};
