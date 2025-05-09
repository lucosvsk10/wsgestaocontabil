
import { useState, useEffect } from "react";
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
            return;
          }
        } catch (edgeFnError) {
          console.error('Error calling storage-stats edge function:', edgeFnError);
          // Continue to fallback method if edge function fails
        }
      }
      
      // Fallback: Calculate from documents table if edge function failed
      const { data: documents, error: docError } = await supabase
        .from('documents')
        .select('size');
      
      if (docError) throw docError;
      
      // Calculate total storage
      const totalBytes = documents.reduce((sum, doc) => sum + (doc.size || 0), 0);
      const totalKB = Math.round(totalBytes / 1024 * 100) / 100;
      const totalMB = Math.round(totalBytes / (1024 * 1024) * 100) / 100;
      
      // Get per-user stats
      const { data: userDocs, error: userError } = await supabase
        .from('documents')
        .select('user_id, size');
      
      if (userError) throw userError;
      
      // Group by user_id
      const userStorageMap: Record<string, number> = {};
      userDocs.forEach(doc => {
        if (doc.user_id && doc.size) {
          userStorageMap[doc.user_id] = (userStorageMap[doc.user_id] || 0) + doc.size;
        }
      });
      
      // Get user info
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email');
      
      if (usersError) throw usersError;
      
      // Build user storage data
      const userStorage: UserStorageData[] = Object.entries(userStorageMap).map(([userId, size]) => {
        const user = users.find(u => u.id === userId);
        return {
          userId,
          name: user?.name,
          email: user?.email,
          sizeBytes: size,
          sizeKB: Math.round(size / 1024 * 100) / 100,
          sizeMB: Math.round(size / (1024 * 1024) * 100) / 100
        };
      });
      
      setStorageStats({
        totalStorageBytes: totalBytes,
        totalStorageKB: totalKB,
        totalStorageMB: totalMB,
        userStorage
      });
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

  // Auto-fetch on mount
  useEffect(() => {
    fetchStorageStats();
  }, []);

  return {
    storageStats,
    isLoading,
    error,
    fetchStorageStats
  };
};
