
import { useState } from "react";
import { AuthUser } from "../types/userTable";

export const useUserTable = (users: AuthUser[]) => {
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc' | null>(null);

  const toggleSort = () => {
    if (sortDirection === null) {
      setSortDirection('asc');
    } else if (sortDirection === 'asc') {
      setSortDirection('desc');
    } else {
      setSortDirection(null);
    }
  };

  // Sort users by name if sort direction is set
  const sortedUsers = [...users].sort((a, b) => {
    if (sortDirection === null) return 0;
    
    const nameA = a.user_metadata?.name || "Sem nome";
    const nameB = b.user_metadata?.name || "Sem nome";
    
    if (sortDirection === 'asc') {
      return nameA.localeCompare(nameB);
    } else {
      return nameB.localeCompare(nameA);
    }
  });

  return {
    sortDirection,
    toggleSort,
    sortedUsers
  };
};
