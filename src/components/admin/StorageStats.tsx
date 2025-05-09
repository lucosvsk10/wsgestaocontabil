
import { useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useStorageStats } from "@/hooks/useStorageStats";
import { LoadingSpinner } from "../common/LoadingSpinner";
import { StorageUsageSummary } from "./storage/StorageUsageSummary";
import { StorageDistributionChart } from "./storage/StorageDistributionChart";
import { StorageDetailsTable } from "./storage/StorageDetailsTable";
import { formatSize } from "@/utils/storage/formatSize";

export const StorageStats = () => {
  const { storageStats, isLoading, error, fetchStorageStats } = useStorageStats();

  useEffect(() => {
    fetchStorageStats();
  }, []);

  return (
    <Card className="px-0 bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-md">
      <CardHeader className="rounded-full bg-white dark:bg-navy-dark">
        <CardTitle className="text-navy dark:text-gold bg-transparent text-center text-2xl font-normal">
          ESTATÍSTICAS DE ARMAZENAMENTO
        </CardTitle>
      </CardHeader>
      <CardContent className="rounded-full bg-white dark:bg-navy-dark space-y-6">
        {isLoading ? (
          <div className="flex justify-center my-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-red-500 text-center my-4">
            {error}
          </div>
        ) : storageStats ? (
          <div className="space-y-8">
            {/* Total storage usage */}
            <StorageUsageSummary 
              totalStorageBytes={storageStats.totalStorageBytes}
              formatSize={formatSize}
              isLoading={isLoading}
            />

            {/* Chart */}
            <StorageDistributionChart 
              storageData={storageStats.userStorage}
              formatSize={formatSize}
            />

            {/* Table */}
            <StorageDetailsTable 
              storageData={storageStats.userStorage}
              formatSize={formatSize}
            />
          </div>
        ) : (
          <div className="text-center my-4 text-navy dark:text-white">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
};
