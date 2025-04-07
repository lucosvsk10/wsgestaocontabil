
import { useDatabaseUsers } from "./useDatabaseUsers";
import { useAuthUsers } from "./useAuthUsers";

export const useUsersFetch = () => {
  const { users, isLoadingUsers, fetchUsers } = useDatabaseUsers();
  const { supabaseUsers, isLoadingAuthUsers, fetchAuthUsers } = useAuthUsers();

  // Function to refresh all user data
  const refreshUsers = () => {
    fetchUsers();
    fetchAuthUsers();
  };

  return {
    users,
    supabaseUsers,
    isLoadingUsers,
    isLoadingAuthUsers,
    fetchUsers,
    fetchAuthUsers,
    refreshUsers
  };
};
