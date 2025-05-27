
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface UserStorageData {
  userId: string;
  name?: string;
  email?: string;
  sizeBytes: number;
  sizeMB: number;
  documentCount: number;
}

interface StorageStats {
  totalStorageMB: number;
  totalStorageBytes: number;
  userStorage: UserStorageData[];
}

export const useStorageStats = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStorageStats = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Fetch documents to calculate storage using correct column names
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('user_id, size');

      if (documentsError) {
        console.error('Error fetching documents:', documentsError);
        setError('Erro ao buscar documentos');
        setStorageStats({ totalStorageMB: 0, totalStorageBytes: 0, userStorage: [] });
        return;
      }

      if (!documents) {
        setStorageStats({ totalStorageMB: 0, totalStorageBytes: 0, userStorage: [] });
        return;
      }

      // Fetch user information
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, name, email');

      if (usersError) {
        console.error('Error fetching users:', usersError);
      }

      // Fetch auth users
      const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
      const authUsers = authData?.users || [];

      // Calculate total storage and per-user storage
      let totalSize = 0;
      const userStorageMap = new Map<string, { size: number; count: number }>();

      documents.forEach(doc => {
        const size = doc.size || 0;
        totalSize += size;

        if (doc.user_id) {
          const current = userStorageMap.get(doc.user_id) || { size: 0, count: 0 };
          userStorageMap.set(doc.user_id, {
            size: current.size + size,
            count: current.count + 1
          });
        }
      });

      // Convert to MB and create user storage array
      const totalStorageBytes = totalSize;
      const totalStorageMB = totalSize / (1024 * 1024);
      const userStorage: UserStorageData[] = Array.from(userStorageMap.entries())
        .map(([userId, data]) => {
          const user = users?.find(u => u.id === userId);
          const authUser = authUsers.find(u => u.id === userId);
          
          return {
            userId,
            name: user?.name || authUser?.user_metadata?.name || null,
            email: user?.email || authUser?.email || null,
            sizeBytes: data.size,
            sizeMB: data.size / (1024 * 1024),
            documentCount: data.count
          };
        })
        .sort((a, b) => b.sizeBytes - a.sizeBytes);

      setStorageStats({
        totalStorageBytes,
        totalStorageMB,
        userStorage
      });
    } catch (error) {
      console.error('Error calculating storage stats:', error);
      setError('Erro interno ao calcular estatísticas');
      setStorageStats({ totalStorageMB: 0, totalStorageBytes: 0, userStorage: [] });
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
