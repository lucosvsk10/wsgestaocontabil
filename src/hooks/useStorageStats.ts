
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserStorageData {
  userId: string;
  name: string | null;
  email: string | null;
  sizeBytes: number;
  sizeKB: number;
  sizeMB: number;
}

export interface StorageStats {
  totalStorageBytes: number;
  totalStorageKB: number;
  totalStorageMB: number;
  userStorage: UserStorageData[];
}

export const useStorageStats = () => {
  const { toast } = useToast();
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStorageStats = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (!accessToken) {
        throw new Error("Você precisa estar logado para acessar as estatísticas de armazenamento");
      }
      
      const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/storage-stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Erro ao obter estatísticas de armazenamento");
      }

      const data = await response.json();
      setStorageStats(data);
    } catch (error: any) {
      console.error('Erro ao obter estatísticas de armazenamento:', error);
      setError(error.message);
      toast({
        variant: "destructive",
        title: "Erro ao obter estatísticas de armazenamento",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    storageStats,
    isLoading,
    error,
    fetchStorageStats
  };
};
