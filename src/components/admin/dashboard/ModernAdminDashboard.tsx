
import { Users, FileText, PieChart, Clock, HardDrive, Bell, Calendar, Plus, TrendingUp, Activity } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { useDashboardData } from "./useDashboardData";

interface ModernAdminDashboardProps {
  users: any[];
  supabaseUsers: any[];
  documents: any[];
}

export const ModernAdminDashboard = ({
  users,
  supabaseUsers,
  documents
}: ModernAdminDashboardProps) => {
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }

  const stats = [
    {
      title: "Clientes Ativos",
      value: clientUsers.length,
      icon: <Users className="h-6 w-6" />,
      link: "/admin/users",
      trend: "+12%",
      description: "vs. mês anterior"
    },
    {
      title: "Total Documentos",
      value: totalDocumentsCount,
      icon: <FileText className="h-6 w-6" />,
      link: "/admin/user-documents",
      trend: "+8%",
      description: "novos esta semana"
    },
    {
      title: "Enquetes Ativas",
      value: pollCount,
      icon: <PieChart className="h-6 w-6" />,
      link: "/admin/polls",
      trend: "3",
      description: "aguardando resposta"
    },
    {
      title: "Armazenamento",
      value: storageStats ? `${storageStats.totalStorageMB.toFixed(1)}MB` : "0MB",
      icon: <HardDrive className="h-6 w-6" />,
      link: "/admin/storage",
      trend: storageStats ? `${((storageStats.totalStorageMB / 100) * 100).toFixed(0)}%` : "0%",
      description: "de 100MB usados"
    }
  ];

  const recentActivities = [
    { action: "Novo documento enviado", user: "João Silva", time: "há 15 min", type: "document" },
    { action: "Usuário cadastrado", user: "Maria Santos", time: "há 1 hora", type: "user" },
    { action: "Enquete respondida", user: "Pedro Costa", time: "há 2 horas", type: "poll" },
    { action: "Login realizado", user: "Ana Oliveira", time: "há 3 horas", type: "login" }
  ];

  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extralight text-[#020817] dark:text-[#efc349] mb-2">
            Dashboard Administrativo
          </h1>
          <p className="text-gray-600 dark:text-[#b3b3b3]">
            Visão geral do sistema e atividades recentes
          </p>
        </div>
        <div className="flex gap-3">
          <Button 
            onClick={() => navigate("/admin/users")} 
            className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
          >
            <Users className="h-4 w-4 mr-2" />
            Gerenciar Usuários
          </Button>
          <Button 
            onClick={() => navigate("/admin/polls")} 
            className="bg-transparent border border-[#efc349] text-[#020817] dark:text-[#efc349] hover:bg-[#efc349]/10 font-extralight"
          >
            <PieChart className="h-4 w-4 mr-2" />
            Criar Enquete
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => (
          <Card 
            key={index} 
            className="cursor-pointer transition-all duration-300 hover:scale-105 bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30 rounded-2xl hover:shadow-lg group"
            onClick={() => navigate(stat.link)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-extralight text-gray-600 dark:text-[#b3b3b3] uppercase tracking-wider">
                    {stat.title}
                  </p>
                  <p className="text-3xl font-extralight text-[#020817] dark:text-[#f4f4f4]">
                    {stat.value}
                  </p>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3 w-3 text-green-500" />
                    <span className="text-xs text-green-500">{stat.trend}</span>
                    <span className="text-xs text-gray-500 dark:text-[#b3b3b3]">{stat.description}</span>
                  </div>
                </div>
                <div className="p-3 rounded-2xl bg-gray-100 dark:bg-[#efc349]/10 text-[#020817] dark:text-[#efc349] group-hover:scale-110 transition-transform">
                  {stat.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Documents */}
        <Card className="lg:col-span-2 bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30 rounded-2xl">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                Documentos Recentes
              </CardTitle>
              <FileText className="h-5 w-5 text-gray-400 dark:text-[#efc349]" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {recentDocuments.slice(0, 5).map((doc, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#020817]/50 hover:bg-gray-100 dark:hover:bg-[#020817]/70 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm font-extralight text-[#020817] dark:text-[#f4f4f4] truncate max-w-[200px]">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#b3b3b3]">
                      {formatRecentDate(doc.created_at)}
                    </p>
                  </div>
                </div>
                <Badge 
                  variant="outline" 
                  className="border-[#efc349] text-[#efc349] bg-transparent text-xs"
                >
                  {doc.category}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Activities and System Info */}
        <div className="space-y-6">
          {/* Recent Activities */}
          <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                Atividades Recentes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentActivities.map((activity, index) => (
                <div key={index} className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-[#efc349]/20 flex items-center justify-center mt-0.5">
                    <Activity className="h-4 w-4 text-[#efc349]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-extralight text-[#020817] dark:text-[#f4f4f4]">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#b3b3b3]">
                      {activity.user} • {activity.time}
                    </p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* System Info */}
          <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30 rounded-2xl">
            <CardHeader>
              <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">Último Login</span>
                <span className="text-sm font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  {lastLogin || "Não disponível"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">Usuários Online</span>
                <span className="text-sm font-extralight text-[#020817] dark:text-[#f4f4f4]">
                  {Math.floor(Math.random() * 5) + 1}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">Versão</span>
                <span className="text-sm font-extralight text-[#020817] dark:text-[#f4f4f4]">1.2.0</span>
              </div>
              {storageStats && (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm text-gray-600 dark:text-[#b3b3b3]">Armazenamento</span>
                    <span className="text-sm font-extralight text-[#020817] dark:text-[#f4f4f4]">
                      {storageStats.totalStorageMB.toFixed(1)}MB / 100MB
                    </span>
                  </div>
                  <Progress 
                    value={Math.min(100, storageStats.totalStorageMB / 100 * 100)} 
                    className="h-2 bg-gray-200 dark:bg-[#020817]"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-[#efc349]/30 rounded-2xl">
        <CardHeader>
          <CardTitle className="text-lg font-extralight text-[#020817] dark:text-[#efc349]">
            Ações Rápidas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              onClick={() => navigate("/admin/users")} 
              className="h-12 justify-start bg-transparent border border-[#efc349]/30 text-[#020817] dark:text-[#f4f4f4] hover:bg-[#efc349]/10 hover:border-[#efc349] font-extralight"
            >
              <Users className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
            <Button 
              onClick={() => navigate("/admin/polls")} 
              className="h-12 justify-start bg-transparent border border-[#efc349]/30 text-[#020817] dark:text-[#f4f4f4] hover:bg-[#efc349]/10 hover:border-[#efc349] font-extralight"
            >
              <PieChart className="h-4 w-4 mr-2" />
              Nova Enquete
            </Button>
            <Button 
              onClick={() => navigate("/admin/tax-simulations")} 
              className="h-12 justify-start bg-transparent border border-[#efc349]/30 text-[#020817] dark:text-[#f4f4f4] hover:bg-[#efc349]/10 hover:border-[#efc349] font-extralight"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Simulação IRPF
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Button */}
      <Button 
        onClick={() => navigate("/admin/users")} 
        className="fixed bottom-8 right-8 h-14 w-14 rounded-full bg-transparent border-2 border-[#efc349] text-[#efc349] hover:bg-[#efc349]/10 shadow-lg z-50" 
        size="icon"
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  );
};
