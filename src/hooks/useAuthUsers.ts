import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export const useAuthUsers = () => {
  const { toast } = useToast();
  const [supabaseUsers, setSupabaseUsers] = useState<any[]>([]);
  const [isLoadingAuthUsers, setIsLoadingAuthUsers] = useState(true);

  const requestUsers = async (accessToken: string) => fetch(
    "https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/listUsers",
    {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const fetchAuthUsers = async () => {
    try {
      setIsLoadingAuthUsers(true);
      let { data: { session } } = await supabase.auth.getSession();

      // Várias telas administrativas não dependem de auth.users. Se o Admin
      // estiver operando sem uma sessão Supabase ativa, não polua a interface
      // inteira com um toast de Unauthorized.
      if (!session?.access_token) {
        setSupabaseUsers([]);
        return;
      }

      let response = await requestUsers(session.access_token);

      // Tokens antigos podem permanecer no storage depois de horas com o ADM
      // aberto. Renova uma única vez antes de considerar a chamada inválida.
      if (response.status === 401) {
        const refreshed = await supabase.auth.refreshSession();
        session = refreshed.data.session;
        if (!refreshed.error && session?.access_token) {
          response = await requestUsers(session.access_token);
        }
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401) {
          setSupabaseUsers([]);
          return;
        }
        throw new Error(errorData.error || "Erro ao carregar usuários");
      }

      const result = await response.json();
      setSupabaseUsers(result.users || []);
    } catch (error: any) {
      console.error("Erro ao carregar usuários do auth.users:", error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar usuários",
        description: error.message,
      });
    } finally {
      setIsLoadingAuthUsers(false);
    }
  };

  useEffect(() => {
    void fetchAuthUsers();
  }, []);

  return {
    supabaseUsers,
    isLoadingAuthUsers,
    fetchAuthUsers,
  };
};
