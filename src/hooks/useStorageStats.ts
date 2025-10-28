
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface UserStorageData {
  userId: string;
  userName: string | null;
  userEmail: string | null;
  name: string | null;
  email: string | null;
  sizeBytes: number;
  sizeKB: number;
  sizeMB: number;
  documentsCount: number;
}

export interface StorageStats {
  totalStorageBytes: number;
  totalStorageKB: number;
  totalStorageMB: number;
  totalStorageGB: number;
  storageLimitGB: number;
  userStorage: UserStorageData[];
}

export const useStorageStats = () => {
  const { toast } = useToast();
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStorageStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First, try to get storage stats through the edge function for accurate data
      const session = await supabase.auth.getSession();
      const accessToken = session.data.session?.access_token;
      
      if (accessToken) {
        try {
          const response = await fetch(`https://nadtoitgkukzbghtbohm.supabase.co/functions/v1/storage-stats`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken}`
            }
          });

          if (response.ok) {
            const data = await response.json();
            setStorageStats(data);
            setIsLoading(false);
            return; // Exit function early if edge function succeeds
          } else {
            console.warn('Edge function response not OK:', response.status);
            // Continue to fallback method
          }
        } catch (edgeFnError) {
          console.error('Error calling storage-stats edge function:', edgeFnError);
          // Continue to fallback method if edge function fails
        }
      }
      
      // Fallback: Calculate from documents table if edge function failed
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('user_id, size');
      
      if (docError) throw docError;
      
      // Calculate total storage
      const totalBytes = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
      const totalKB = Math.round(totalBytes / 1024 * 100) / 100;
      const totalMB = Math.round(totalBytes / (1024 * 1024) * 100) / 100;
      
      // Get per-user stats with document counts
      const { data: userDocs, error: userError } = await supabase
        .from('documents')
        .select('user_id, size');
      
      if (userError) throw userError;
      
      // Group by user_id and count documents
      const userStorageMap: Record<string, { size: number; count: number }> = {};
      userDocs.forEach(doc => {
        if (doc.user_id && doc.size) {
          if (!userStorageMap[doc.user_id]) {
            userStorageMap[doc.user_id] = { size: 0, count: 0 };
          }
          userStorageMap[doc.user_id].size += doc.size;
          userStorageMap[doc.user_id].count += 1;
        }
      });
      
      // Get user info
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email');
      
      if (usersError) throw usersError;
      
      // Build user storage data
      const userStorage: UserStorageData[] = Object.entries(userStorageMap).map(([userId, data]) => {
        const user = users.find(u => u.id === userId);
        return {
          userId,
          userName: user?.name || 'Usuário sem nome',
          userEmail: user?.email || 'Sem email',
          name: user?.name,
          email: user?.email,
          sizeBytes: data.size,
          sizeKB: Math.round(data.size / 1024 * 100) / 100,
          sizeMB: Math.round(data.size / (1024 * 1024) * 100) / 100,
          documentsCount: data.count
        };
      });
      
      const stats = {
        totalStorageBytes: totalBytes,
        totalStorageKB: totalKB,
        totalStorageMB: totalMB,
        totalStorageGB: Math.round(totalBytes / (1024 * 1024 * 1024) * 100) / 100,
        storageLimitGB: 100,
        userStorage
      };
      
      setStorageStats(stats);
    } catch (error: any) {
      console.error('Erro ao obter estatísticas de armazenamento:', error);
      setError(error.message || 'Erro desconhecido ao buscar estatísticas de armazenamento');
      
      // Set fallback empty data to prevent infinite loading
      setStorageStats({
        totalStorageBytes: 0,
        totalStorageKB: 0,
        totalStorageMB: 0,
        totalStorageGB: 0,
        storageLimitGB: 100,
        userStorage: []
      });
      
      toast({
        variant: "destructive",
        title: "Erro ao obter estatísticas de armazenamento",
        description: error.message || 'Tente novamente mais tarde'
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Only auto-fetch on mount
  useEffect(() => {
    fetchStorageStats();
  }, [fetchStorageStats]);

  return {
    storageStats,
    isLoading,
    error,
    fetchStorageStats
  };
};
