import { Users, FileText, PieChart, Clock } from "lucide-react";
import { formatDate } from "../utils/dateUtils";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { StatisticsCard } from "./StatisticsCard";
import { SystemSummary } from "./SystemSummary";
import { RecentDocumentsTable } from "./RecentDocumentsTable";
import { useDashboardData } from "./useDashboardData";
interface AdminDashboardViewProps {
  users: any[];
  supabaseUsers: any[];
  documents: any[];
}
export const AdminDashboardView = ({
  users,
  supabaseUsers,
  documents
}: AdminDashboardViewProps) => {
  // Get non-admin users (clients)
  const clientUsers = supabaseUsers.filter(authUser => {
    const userInfo = users.find(u => u.id === authUser.id);
    return !['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  });

  // Use custom hook for dashboard data
  const {
    lastLogin,
    totalDocumentsCount,
    pollCount,
    recentDocuments,
    formatRecentDate,
    storageStats,
    isLoading
  } = useDashboardData(supabaseUsers);
  return <div className="space-y-6">
      <h2 className="mb-6 text-navy-dark dark:text-white font-extralight text-3xl">Dashboard</h2>
      
      {isLoading ? <div className="flex justify-center py-8">
          <LoadingSpinner />
        </div> : <>
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatisticsCard icon={<Users className="h-8 w-8" />} title="Clientes ativos" value={clientUsers.length} iconBgClass="bg-blue-100 dark:bg-blue-900/30" iconColor="text-blue-600 dark:text-blue-400" />
            
            <StatisticsCard icon={<FileText className="h-8 w-8" />} title="Documentos" value={totalDocumentsCount} iconBgClass="bg-green-100 dark:bg-green-900/30" iconColor="text-green-600 dark:text-green-400" />
            
            <StatisticsCard icon={<PieChart className="h-8 w-8" />} title="Enquetes criadas" value={pollCount} iconBgClass="bg-purple-100 dark:bg-purple-900/30" iconColor="text-purple-600 dark:text-purple-400" />
            
            <StatisticsCard icon={<Clock className="h-8 w-8" />} title="Último login" value={lastLogin || "Não disponível"} iconBgClass="bg-amber-100 dark:bg-amber-900/30" iconColor="text-amber-600 dark:text-amber-400" />
          </div>
          
          {/* System Summary */}
          <SystemSummary clientsCount={clientUsers.length} documentsCount={totalDocumentsCount} storageUsed={storageStats ? `${storageStats.totalStorageMB.toFixed(2)} MB` : 'Calculando...'} appVersion="1.0.0" />
          
          {/* Recent Documents */}
          <RecentDocumentsTable documents={recentDocuments} formatRecentDate={formatRecentDate} />
        </>}
    </div>;
};