
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserType } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const useDatabaseUsersManagement = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);

  // Function to fetch users from the database
  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase.from('users').select('*').order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: error.message
      });
    } finally {
      setIsLoadingUsers(false);
    }
  };

  // Load users on initial render
  useEffect(() => {
    fetchUsers();
  }, []);

  return {
    users,
    isLoadingUsers,
    fetchUsers
  };
};
