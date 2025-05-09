
import { Card } from "@/components/ui/card";

interface StorageUsageSummaryProps {
  totalStorageBytes: number;
  formatSize: (size: number) => string;
  isLoading: boolean;
}

export const StorageUsageSummary = ({ 
  totalStorageBytes, 
  formatSize, 
  isLoading 
}: StorageUsageSummaryProps) => {
  return (
    <div className="text-center p-4 bg-gray-50 dark:bg-navy-light/30 rounded-lg border border-gray-200 dark:border-gold/20">
      <h3 className="text-lg font-semibold text-navy dark:text-gold mb-2">
        Uso Total de Armazenamento
      </h3>
      <p className="text-2xl font-bold text-navy dark:text-white">
        {isLoading ? "Calculando..." : formatSize(totalStorageBytes)}
      </p>
    </div>
  );
};
