
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAuthUsers = () => {
  const { toast } = useToast();
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([]);
  const [isLoadingAuthUsers, setIsLoadingAuthUsers] = useState(true);

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

  // Load auth users on initial render
  useEffect(() => {
    fetchAuthUsers();
  }, []);

  return {
    supabaseUsers,
    isLoadingAuthUsers,
    fetchAuthUsers
  };
};
