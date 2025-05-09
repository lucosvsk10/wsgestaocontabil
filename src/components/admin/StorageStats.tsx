
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
    <Card className="px-0 bg-white dark:bg-navy-dark border border-gray-200 dark:border-gold/20 shadow-lg">
      <CardHeader className="rounded-t-lg bg-white dark:bg-navy-dark border-b border-gray-200 dark:border-gold/30">
        <CardTitle className="text-navy dark:text-gold bg-transparent text-center text-2xl font-semibold">
          ESTATÍSTICAS DE ARMAZENAMENTO
        </CardTitle>
      </CardHeader>
      <CardContent className="rounded-b-lg bg-white dark:bg-navy-dark space-y-6 p-6">
        {isLoading ? (
          <div className="flex justify-center my-8">
            <LoadingSpinner />
          </div>
        ) : error ? (
          <div className="text-red-500 dark:text-red-400 text-center my-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800/40">
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
          <div className="text-center my-4 text-navy dark:text-white bg-orange-50 dark:bg-navy-light/20 p-4 rounded-lg border border-orange-100 dark:border-gold/10">
            Nenhum dado disponível
          </div>
        )}
      </CardContent>
    </Card>
  );
};
