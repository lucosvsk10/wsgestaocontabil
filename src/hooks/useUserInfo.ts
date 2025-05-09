
import { useState } from "react";
import { UserType } from "@/types/admin";

export const useUserInfo = () => {
  const [loading, setLoading] = useState<boolean>(false);
  
  const getUserInfo = (userId: string, users: UserType[], authUsers: any[]) => {
    const dbUser = users.find(user => user.id === userId);
    const authUser = authUsers.find(user => user.id === userId);
    
    return {
      name: authUser?.user_metadata?.name || dbUser?.name || 'Usuário sem nome',
      email: authUser?.email || dbUser?.email || 'Sem email',
      role: dbUser?.role || 'user',
      createdAt: authUser?.created_at || dbUser?.created_at || new Date().toISOString()
    };
  };
  
  return { getUserInfo, loading };
};
