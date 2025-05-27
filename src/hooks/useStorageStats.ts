
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface UserStorageData {
  userId: string;
  sizeMB: number;
  documentCount: number;
}

interface StorageStats {
  totalStorageMB: number;
  userStorage: UserStorageData[];
}

export const useStorageStats = () => {
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const fetchStorageStats = async () => {
    setIsLoading(true);
    try {
      // Fetch documents to calculate storage
      const { data: documents, error } = await supabase
        .from('documents')
        .select('user_id, file_size');

      if (error) {
        console.error('Error fetching documents:', error);
        setStorageStats({ totalStorageMB: 0, userStorage: [] });
        return;
      }

      if (!documents) {
        setStorageStats({ totalStorageMB: 0, userStorage: [] });
        return;
      }

      // Calculate total storage and per-user storage
      let totalSize = 0;
      const userStorageMap = new Map<string, { size: number; count: number }>();

      documents.forEach(doc => {
        const size = doc.file_size || 0;
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
      const totalStorageMB = totalSize / (1024 * 1024);
      const userStorage: UserStorageData[] = Array.from(userStorageMap.entries())
        .map(([userId, data]) => ({
          userId,
          sizeMB: data.size / (1024 * 1024),
          documentCount: data.count
        }))
        .sort((a, b) => b.sizeMB - a.sizeMB);

      setStorageStats({
        totalStorageMB,
        userStorage
      });
    } catch (error) {
      console.error('Error calculating storage stats:', error);
      setStorageStats({ totalStorageMB: 0, userStorage: [] });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    storageStats,
    isLoading,
    fetchStorageStats
  };
};
