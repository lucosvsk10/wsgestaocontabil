
import { Users, FileText, PieChart, Clock, TrendingUp, Database } from "lucide-react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { PremiumStatisticsCard } from "./PremiumStatisticsCard";
import { RecentActivity } from "./RecentActivity";
import { QuickActionButton } from "./QuickActionButton";
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#020817] flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020817] p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-[#efc349] text-4xl font-museo-moderno font-bold mb-2">
          Dashboard Administrativo
        </h1>
        <p className="text-[#b3b3b3] font-bebas-neue tracking-wide">
          Visão geral do sistema e atividades recentes
        </p>
      </div>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <PremiumStatisticsCard
          icon={<Users className="w-6 h-6" />}
          title="Clientes Ativos"
          value={clientUsers.length}
          subtitle="Total de usuários cadastrados"
          trend={{ value: "12%", isPositive: true }}
        />
        
        <PremiumStatisticsCard
          icon={<FileText className="w-6 h-6" />}
          title="Documentos"
          value={totalDocumentsCount}
          subtitle="Arquivos no sistema"
          trend={{ value: "8%", isPositive: true }}
        />
        
        <PremiumStatisticsCard
          icon={<PieChart className="w-6 h-6" />}
          title="Enquetes Criadas"
          value={pollCount}
          subtitle="Pesquisas ativas"
          trend={{ value: "3%", isPositive: true }}
        />
        
        <PremiumStatisticsCard
          icon={<Database className="w-6 h-6" />}
          title="Armazenamento"
          value={storageStats ? `${storageStats.totalStorageMB.toFixed(1)}MB` : 'Calculando...'}
          subtitle="Espaço utilizado"
          trend={{ value: "2%", isPositive: false }}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Activity */}
        <div className="lg:col-span-2">
          <RecentActivity />
        </div>

        {/* System Overview */}
        <div className="space-y-6">
          <div className="bg-[#0b0f1c] border border-[#efc349] rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp className="w-5 h-5 text-[#efc349]" />
              <h3 className="text-[#efc349] text-lg font-museo-moderno font-semibold">
                Performance
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[#b3b3b3] font-bebas-neue text-sm">Sistema Online</span>
                <span className="text-green-400 font-bebas-neue text-sm">99.9%</span>
              </div>
              
              <div className="w-full bg-[#020817] rounded-full h-2">
                <div className="bg-green-400 h-2 rounded-full" style={{ width: '99.9%' }}></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-[#b3b3b3] font-bebas-neue text-sm">Último Backup</span>
                <span className="text-[#ffffff] font-bebas-neue text-sm">2h atrás</span>
              </div>
            </div>
          </div>

          <div className="bg-[#0b0f1c] border border-[#efc349] rounded-xl p-6">
            <h3 className="text-[#efc349] text-lg font-museo-moderno font-semibold mb-4">
              Acesso Rápido
            </h3>
            
            <div className="space-y-3">
              <button className="w-full text-left p-3 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#ffffff] font-bebas-neue transition-all duration-300">
                Gerenciar Usuários
              </button>
              <button className="w-full text-left p-3 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#ffffff] font-bebas-neue transition-all duration-300">
                Criar Enquete
              </button>
              <button className="w-full text-left p-3 rounded-lg bg-[#1e293b] hover:bg-[#334155] text-[#ffffff] font-bebas-neue transition-all duration-300">
                Relatórios
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Action Button */}
      <QuickActionButton />
    </div>
  );
};
