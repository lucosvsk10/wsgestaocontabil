
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { UserType } from "@/types/admin";
import { useToast } from "@/hooks/use-toast";

export const useUsersFetch = () => {
  const { toast } = useToast();
  const [users, setUsers] = useState<UserType[]>([]);
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingAuthUsers, setIsLoadingAuthUsers] = useState(true);

  // Load users on initial render
  useEffect(() => {
    fetchUsers();
    fetchAuthUsers();
  }, []);

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

  // Function to fetch authenticated users
  const fetchAuthUsers = async () => {
    try {
      setIsLoadingAuthUsers(true);
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Você precisa estar logado para acessar os usuários");
      }
      
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/listUsers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao carregar usuários");
      }

      const result = await response.json();
      setSupabaseUsers(result.users || []);
    } catch (error: any) {
      console.error('Erro ao carregar usuários do auth.users:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: error.message
      });
    } finally {
      setIsLoadingAuthUsers(false);
    }
  };

  return {
    users,
    supabaseUsers,
    isLoadingUsers,
    isLoadingAuthUsers,
    fetchUsers,
    fetchAuthUsers
  };
};
