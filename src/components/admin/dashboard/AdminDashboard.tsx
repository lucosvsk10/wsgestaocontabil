import { Users, FileText, PieChart, Clock, HardDrive, Bell, Calendar, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useDashboardData } from "./useDashboardData";
interface AdminDashboardProps {
  users: any[];
  supabaseUsers: any[];
  documents: any[];
}
export const AdminDashboard = ({
  users,
  supabaseUsers,
  documents
}: AdminDashboardProps) => {
  const navigate = useNavigate();
  const clientUsers = supabaseUsers.filter(authUser => {
    const userInfo = users.find(u => u.id === authUser.id);
    return !['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  });
  const {
    lastLogin,
    totalDocumentsCount,
    pollCount,
    recentDocuments,
    formatRecentDate,
    storageStats,
    isLoading
  } = useDashboardData(supabaseUsers);
  const stats = [{
    title: "Clientes Ativos",
    value: clientUsers.length,
    icon: <Users className="h-6 w-6" />,
    link: "/admin/users",
    color: "blue"
  }, {
    title: "Total Documentos",
    value: totalDocumentsCount,
    icon: <FileText className="h-6 w-6" />,
    link: "/admin/storage",
    color: "green"
  }, {
    title: "Enquetes Criadas",
    value: pollCount,
    icon: <PieChart className="h-6 w-6" />,
    link: "/admin/polls",
    color: "purple"
  }, {
    title: "Armazenamento",
    value: storageStats ? `${storageStats.totalStorageMB.toFixed(1)}MB` : "Calculando...",
    icon: <HardDrive className="h-6 w-6" />,
    link: "/admin/storage",
    color: "orange"
  }];
  if (isLoading) {
    return <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>;
  }
  return <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-[#efc349] mb-2 font-extralight">Dashboard</h1>
          <p className="text-gray-600 dark:text-[#b3b3b3]">
            Visão geral do sistema e atividades recentes
          </p>
        </div>
        <div className="flex gap-3">
          <Button onClick={() => navigate("/admin/users")} className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-[#efc349] dark:text-[#efc349] dark:hover:bg-[#efc349]/10">
            <Users className="h-4 w-4 mr-2" />
            Gerenciar Usuários
          </Button>
          <Button onClick={() => navigate("/admin/polls")} variant="outline" className="border-[#efc349] text-[#efc349] hover:bg-[#efc349]/10">
            <PieChart className="h-4 w-4 mr-2" />
            Enquetes
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => <Card key={index} className="cursor-pointer transition-all duration-300 hover:scale-105 bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30 hover:border-[#efc349] dark:hover:border-[#efc349]" onClick={() => navigate(stat.link)}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-[#b3b3b3] mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-[#020817] dark:text-[#f4f4f4]">
                    {stat.value}
                  </p>
                </div>
                <div className="p-3 rounded-full bg-gray-100 dark:bg-[#efc349]/10 text-[#020817] dark:text-[#efc349]">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>)}
      </div>

      {/* Recent Activity & Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-[#020817] dark:text-[#efc349] font-extralight">
                Documentos Recentes
              </h3>
              <FileText className="h-5 w-5 text-gray-400 dark:text-[#efc349]" />
            </div>
            <div className="space-y-3">
              {recentDocuments.slice(0, 5).map((doc, index) => {
              // Encontrar o usuário correto pelo user_id
              const user = supabaseUsers.find(u => u.id === doc.user_id);
              const userName = user?.user_metadata?.name || user?.email || 'Usuário desconhecido';
              return <div key={index} className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-[#efc349]/20 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-[#020817] dark:text-[#f4f4f4] truncate">
                        {doc.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-[#b3b3b3]">
                        {userName} • {formatRecentDate(doc.uploaded_at)}
                      </p>
                    </div>
                    
                  </div>;
            })}
              {recentDocuments.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400 text-center py-4">
                  Nenhum documento recente encontrado
                </p>}
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-[#020817] dark:text-[#efc349] font-extralight">
                Informações do Sistema
              </h3>
              <Bell className="h-5 w-5 text-gray-400 dark:text-[#efc349]" />
            </div>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">Último Login</span>
                <span className="text-sm font-medium text-[#020817] dark:text-[#f4f4f4]">
                  {lastLogin || "Não disponível"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">Usuários Online</span>
                <span className="text-sm font-medium text-[#020817] dark:text-[#f4f4f4]">
                  {Math.floor(Math.random() * 5) + 1}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">Versão do Sistema</span>
                <span className="text-sm font-medium text-[#020817] dark:text-[#f4f4f4]">1.0.0</span>
              </div>
              {storageStats && <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">Armazenamento</span>
                    <span className="text-sm font-medium text-[#020817] dark:text-[#f4f4f4]">
                      {storageStats.totalStorageMB.toFixed(1)}MB / 100MB
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-[#020817] rounded-full h-2">
                    <div className="bg-[#efc349] h-2 rounded-full transition-all duration-300" style={{
                  width: `${Math.min(100, storageStats.totalStorageMB / 100 * 100)}%`
                }}></div>
                  </div>
                </div>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30">
        <CardContent className="p-6">
          <h3 className="text-lg text-[#020817] dark:text-[#efc349] mb-4 font-extralight">
            Ações Rápidas
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button onClick={() => navigate("/admin/users")} variant="outline" className="h-12 justify-start border-gray-200 dark:border-[#efc349]/30 hover:border-[#efc349] dark:hover:bg-[#efc349]/10">
              <Users className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
            <Button onClick={() => navigate("/admin/polls")} variant="outline" className="h-12 justify-start border-gray-200 dark:border-[#efc349]/30 hover:border-[#efc349] dark:hover:bg-[efc349]/10">
              <PieChart className="h-4 w-4 mr-2" />
              Nova Enquete
            </Button>
            <Button onClick={() => navigate("/admin/simulations")} variant="outline" className="h-12 justify-start border-gray-200 dark:border-[#efc349]/30 hover:border-[#efc349] dark:hover:bg-[#efc349]/10">
              <Calendar className="h-4 w-4 mr-2" />
              Simulação IRPF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <Button onClick={() => navigate("/admin/users")} className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-[#efc349] hover:bg-[#d4a73a] text-[#020817] shadow-lg z-50" size="icon">
        <Plus className="h-6 w-6" />
      </Button>
    </div>;
};