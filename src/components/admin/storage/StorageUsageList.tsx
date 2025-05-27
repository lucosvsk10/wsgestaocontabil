
import { Progress } from "@/components/ui/progress";
import { User } from "lucide-react";

interface UserStorageData {
  userId: string;
  name: string | null;
  email: string | null;
  sizeBytes: number;
  sizeKB: number;
  sizeMB: number;
}

interface StorageUsageListProps {
  userStorage: UserStorageData[];
  searchTerm: string;
  sortBy: string;
}

export const StorageUsageList = ({ userStorage, searchTerm, sortBy }: StorageUsageListProps) => {
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
  };

  const filteredAndSorted = userStorage
    .filter(user => {
      const name = user.name?.toLowerCase() || '';
      const email = user.email?.toLowerCase() || '';
      return name.includes(searchTerm.toLowerCase()) || email.includes(searchTerm.toLowerCase());
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'usage':
          return b.sizeBytes - a.sizeBytes;
        case 'name':
          return (a.name || a.email || '').localeCompare(b.name || b.email || '');
        default:
          return 0;
      }
    })
    .slice(0, 10);

  return (
    <div className="space-y-4">
      {filteredAndSorted.map((user) => {
        const percentage = (user.sizeBytes / (100 * 1024 * 1024)) * 100; // Assuming 100MB limit
        
        return (
          <div key={user.userId} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="text-sm font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  {user.name || user.email || 'Usuário sem nome'}
                </span>
              </div>
              <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">
                {formatSize(user.sizeBytes)}
              </span>
            </div>
            <Progress value={Math.min(percentage, 100)} className="h-2" />
          </div>
        );
      })}
      
      {filteredAndSorted.length === 0 && (
        <div className="text-center py-8 text-gray-500 dark:text-[#b3b3b3]">
          Nenhum usuário encontrado
        </div>
      )}
    </div>
  );
};
