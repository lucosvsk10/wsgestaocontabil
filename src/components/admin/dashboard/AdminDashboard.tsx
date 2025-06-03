
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatisticsCard } from "./StatisticsCard";
import { RecentDocumentsTable } from "./RecentDocumentsTable";
import { SystemSummary } from "./SystemSummary";
import { FileText, HardDrive, Users, Calendar } from "lucide-react";
import { useDashboardData } from "./useDashboardData";
import { useNavigate } from "react-router-dom";

interface AdminDashboardProps {
  users: any[];
  supabaseUsers: any[];
  documents: any[];
}

export const AdminDashboard = ({ users, supabaseUsers, documents }: AdminDashboardProps) => {
  const { statistics, recentDocuments, isLoading } = useDashboardData(users, supabaseUsers, documents);
  const navigate = useNavigate();

  const handleStorageClick = () => {
    navigate('/admin/user-documents');
  };

  const handleDocumentsClick = () => {
    navigate('/admin/user-documents');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#020817] dark:border-[#efc349]"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-white">
            Dashboard Administrativo
          </h1>
          <p className="text-gray-600 dark:text-gray-300 font-extralight mt-2">
            Visão geral do sistema de gestão documental
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatisticsCard
          title="Total de Usuários"
          value={statistics.totalUsers}
          icon={<Users />}
          trend={{ value: "+12%", isPositive: true }}
        />
        <Button
          variant="ghost"
          className="p-0 h-auto"
          onClick={handleDocumentsClick}
        >
          <StatisticsCard
            title="Total de Documentos"
            value={statistics.totalDocuments}
            icon={<FileText />}
            trend={{ value: "+8%", isPositive: true }}
          />
        </Button>
        <Button
          variant="ghost"
          className="p-0 h-auto"
          onClick={handleStorageClick}
        >
          <StatisticsCard
            title="Armazenamento"
            value={statistics.storageUsed}
            icon={<HardDrive />}
            trend={{ value: "+5%", isPositive: true }}
          />
        </Button>
        <StatisticsCard
          title="Eventos Agenda"
          value={statistics.fiscalEvents}
          icon={<Calendar />}
          trend={{ value: "+3%", isPositive: true }}
        />
      </div>

      {/* Recent Documents and System Summary */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-[#e6e6e6] dark:border-[#efc349]/20 bg-white dark:bg-[#0b1320]">
          <CardHeader className="bg-white dark:bg-[#0b1320]">
            <CardTitle className="font-extralight text-[#020817] dark:text-[#efc349]">
              Documentos Recentes
            </CardTitle>
          </CardHeader>
          <CardContent className="bg-white dark:bg-[#0b1320]">
            <RecentDocumentsTable documents={recentDocuments} />
          </CardContent>
        </Card>

        <SystemSummary statistics={statistics} />
      </div>
    </div>
  );
};
