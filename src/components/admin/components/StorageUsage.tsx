
import { useState, useEffect } from "react";
import { Progress } from "@/components/ui/progress";
import { useStorageStats } from "@/hooks/useStorageStats";
import { HardDrive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface StorageUsageProps {
  userId: string;
}

export const StorageUsage = ({ userId }: StorageUsageProps) => {
  const [isLoading, setIsLoading] = useState(true);
  const [userStorage, setUserStorage] = useState<{
    sizeBytes: number;
    sizeKB: number;
    sizeMB: number;
    percentage: number;
    documentCount: number;
  } | null>(null);

  const { storageStats, fetchStorageStats } = useStorageStats();
  
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await fetchStorageStats();
      setIsLoading(false);
    };
    
    loadData();
  }, [userId, fetchStorageStats]);
  
  useEffect(() => {
    if (storageStats) {
      // Find user storage data
      const userData = storageStats.userStorage.find(item => item.userId === userId);
      
      if (userData) {
        // Calculate percentage of used storage (assume 50MB limit)
        const storageLimit = 50 * 1024 * 1024; // 50 MB in bytes
        const percentage = Math.min(100, (userData.sizeBytes / storageLimit) * 100);
        
        // Calculate document count based on documents array
        // We're assuming approximately 1 document per 500KB for this example
        // In a real app, you'd count the actual documents from the database
        const estimatedDocumentCount = Math.ceil(userData.sizeBytes / (500 * 1024));
        
        setUserStorage({
          sizeBytes: userData.sizeBytes,
          sizeKB: userData.sizeKB,
          sizeMB: userData.sizeMB,
          percentage,
          documentCount: estimatedDocumentCount
        });
      } else {
        // No storage data found for this user
        setUserStorage({
          sizeBytes: 0,
          sizeKB: 0,
          sizeMB: 0,
          percentage: 0,
          documentCount: 0
        });
      }
    }
  }, [storageStats, userId]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (!userStorage) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        Sem dados de armazenamento
      </div>
    );
  }

  const formatSize = (sizeBytes: number): string => {
    if (sizeBytes < 1024) {
      return `${sizeBytes} B`;
    } else if (sizeBytes < 1024 * 1024) {
      return `${userStorage.sizeKB.toFixed(2)} KB`;
    } else {
      return `${userStorage.sizeMB.toFixed(2)} MB`;
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-1">
          <HardDrive size={14} className="text-navy dark:text-gold" />
          <span className="dark:text-white">{formatSize(userStorage.sizeBytes)} de 50 MB</span>
        </div>
        <span className="text-xs text-navy/60 dark:text-white/60">
          {userStorage.documentCount} documento{userStorage.documentCount !== 1 ? 's' : ''}
        </span>
      </div>
      
      <Progress 
        value={userStorage.percentage} 
        className="h-2 bg-gray-200 dark:bg-gray-700" 
      />
      
      <Button 
        variant="link" 
        size="sm" 
        className="p-0 h-auto text-xs text-navy/70 dark:text-gold/70 hover:text-navy dark:hover:text-gold"
        onClick={() => fetchStorageStats()}
      >
        Atualizar
      </Button>
    </div>
  );
};
