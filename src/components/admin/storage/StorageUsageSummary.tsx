
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
    <div className="text-center p-6 bg-gray-50 dark:bg-navy-dark/70 rounded-lg border border-gray-200 dark:border-gold/30 shadow-md">
      <h3 className="text-lg font-semibold text-navy dark:text-gold mb-3">
        Uso Total de Armazenamento
      </h3>
      <p className="text-3xl font-bold text-navy dark:text-gold/90">
        {isLoading ? "Calculando..." : formatSize(totalStorageBytes)}
      </p>
    </div>
  );
};
