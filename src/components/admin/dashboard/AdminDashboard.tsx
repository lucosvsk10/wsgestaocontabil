import {
  Users,
  FileText,
  PieChart,
  HardDrive,
  Bell,
  Calendar,
  Megaphone,
  ArrowUpRight,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useDashboardData } from './useDashboardData';
import type { AuthUser } from '@/components/admin/types/userTable';
import type { Document, UserType } from '@/types/admin';
interface AdminDashboardProps {
  users: UserType[];
  supabaseUsers: AuthUser[];
  documents: Document[];
}
export const AdminDashboard = ({ users, supabaseUsers, documents }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const clientUsers = supabaseUsers.filter(authUser => {
    const userInfo = users.find(u => u.id === authUser.id);
    return !['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  });
  const { stats, formatRecentDate, isLoading } = useDashboardData();

  const storagePercentage = stats.storageStats
    ? Math.min(
        100,
        ((stats.storageStats.totalStorageGB || 0) / (stats.storageStats.storageLimitGB || 100)) *
          100
      )
    : 0;

  const statsData = [
    {
      title: 'Clientes Ativos',
      value: clientUsers.length,
      icon: <Users className="h-6 w-6" />,
      link: '/admin/users',
      detail: 'Acessos disponíveis',
    },
    {
      title: 'Documentos Ativos',
      value: stats.totalDocuments,
      icon: <FileText className="h-6 w-6" />,
      link: '/admin/storage',
      detail: `${stats.recentDocumentsCount} enviados em 7 dias`,
    },
    {
      title: 'Enquetes Criadas',
      value: stats.pollCount,
      icon: <PieChart className="h-6 w-6" />,
      link: '/admin/polls',
      detail: 'Total cadastrado',
    },
    {
      title: 'Armazenamento',
      value: stats.storageStats
        ? `${stats.storageStats.totalStorageMB.toFixed(1)}MB`
        : 'Calculando...',
      icon: <HardDrive className="h-6 w-6" />,
      link: '/admin/storage',
      detail: `${storagePercentage.toFixed(1)}% do limite utilizado`,
    },
    {
      title: 'Documentos Recentes',
      value: stats.recentDocumentsCount,
      icon: <FileText className="h-6 w-6" />,
      link: '/admin/storage',
      detail: 'Recebidos nos últimos 7 dias',
    },
    {
      title: 'Próximos Prazos',
      value: stats.upcomingFiscalEvents,
      icon: <Calendar className="h-6 w-6" />,
      link: '/admin/calendar',
      detail: 'Eventos nos próximos 30 dias',
    },
    {
      title: 'Avisos Ativos',
      value: stats.activeAnnouncements,
      icon: <Megaphone className="h-6 w-6" />,
      link: '/admin/announcements',
      detail: `${stats.totalAnnouncements} avisos cadastrados`,
    },
    {
      title: 'Agenda Fiscal',
      value: stats.totalFiscalEvents,
      icon: <Calendar className="h-6 w-6" />,
      link: '/admin/calendar',
      detail: 'Eventos fiscais cadastrados',
    },
  ];
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner />
      </div>
    );
  }
  return (
    <div className="space-y-8 p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl text-[#020817] dark:text-white mb-2 font-thin">Dashboard</h1>
          <p className="text-gray-600 dark:text-[#b3b3b3]">
            Visão geral do sistema e atividades recentes
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => navigate('/admin/users')}
            className="bg-[#020817] hover:bg-[#0f172a] text-white dark:bg-transparent dark:border dark:border-white/20 dark:text-white dark:hover:bg-white/5"
          >
            <Users className="h-4 w-4 mr-2" />
            Gerenciar Usuários
          </Button>
          <Button
            onClick={() => navigate('/admin/polls')}
            variant="outline"
            className="border-gray-300 text-[#020817] hover:bg-gray-50 dark:border-white/20 dark:text-white dark:hover:bg-white/5"
          >
            <PieChart className="h-4 w-4 mr-2" />
            Enquetes
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {statsData.map((stat, index) => (
          <Card
            key={index}
            className="group cursor-pointer transition-colors duration-200 bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-white/10 hover:border-gray-400 dark:hover:border-white/30"
            onClick={() => navigate(stat.link)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-[#b3b3b3] mb-1">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-[#020817] dark:text-[#f4f4f4]">
                    {stat.value}
                  </p>
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{stat.detail}</p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center border border-gray-200 text-gray-500 dark:border-white/10 dark:text-white/80">
                  {stat.icon}
                </div>
              </div>
              <div className="mt-4 flex items-center gap-1 text-xs font-medium text-gray-500 transition-colors group-hover:text-[#020817] dark:text-gray-400 dark:group-hover:text-white">
                Ver detalhes <ArrowUpRight className="h-3.5 w-3.5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Activity & Storage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-[#020817] dark:text-white font-extralight">
                Documentos Recentes
              </h3>
              <Button
                size="sm"
                variant="ghost"
                className="h-8 text-xs dark:text-white dark:hover:bg-white/5"
                onClick={() => navigate('/admin/storage')}
              >
                Ver todos
              </Button>
            </div>
            <div className="space-y-3">
              {stats.recentDocuments.slice(0, 5).map((doc, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-[#efc349]/20 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-[#020817] dark:text-[#f4f4f4] truncate">
                      {doc.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#b3b3b3]">
                      Por: {doc.userName || 'Usuário desconhecido'}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-[#b3b3b3]">
                      {formatRecentDate(doc.uploaded_at)}
                    </p>
                  </div>
                </div>
              ))}
              {stats.recentDocuments.length === 0 && (
                <p className="text-sm text-gray-500 dark:text-[#b3b3b3] text-center py-4">
                  Nenhum documento recente encontrado
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* System Info */}
        <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg text-[#020817] dark:text-white font-extralight">
                Informações do Sistema
              </h3>
              <Bell className="h-5 w-5 text-gray-400 dark:text-white/80" />
            </div>

            <div className="space-y-3">
              {/* Documentos Enviados Recentemente */}
              <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/30">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-green-600 dark:text-green-400" />
                    <span className="text-sm font-medium text-green-800 dark:text-green-300">
                      Documentos Enviados
                    </span>
                  </div>
                  <span className="text-lg font-bold text-green-600 dark:text-green-400">
                    {stats.recentDocumentsCount}
                  </span>
                </div>
                <p className="text-xs text-green-700 dark:text-green-400/80 mb-2">Últimos 7 dias</p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 h-8"
                  onClick={() => navigate('/admin/storage')}
                >
                  Ver Documentos →
                </Button>
              </div>

              {/* Eventos Fiscais */}
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700/30">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    <span className="text-sm font-medium text-blue-800 dark:text-blue-300">
                      Eventos Fiscais Próximos
                    </span>
                  </div>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    {stats.upcomingFiscalEvents}
                  </span>
                </div>
                <p className="text-xs text-blue-700 dark:text-blue-400/80 mb-2">
                  Nos próximos 30 dias
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/30 h-8"
                  onClick={() => navigate('/admin/calendar')}
                >
                  Ver Agenda →
                </Button>
              </div>

              {/* Armazenamento */}
              {stats.storageStats && (
                <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-700/30">
                  <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                      <HardDrive className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-300">
                        Armazenamento
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                    {stats.storageStats.totalStorageGB?.toFixed(2) || '0'} GB de{' '}
                    {stats.storageStats.storageLimitGB || 100} GB
                  </p>
                  <div className="w-full bg-gray-200 dark:bg-[#020817] rounded-full h-2 mb-2">
                    <div
                      className="bg-[#020817] dark:bg-white h-2 rounded-full transition-all duration-300"
                      style={{
                        width: `${storagePercentage}%`,
                      }}
                    />
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900/30 h-8"
                    onClick={() => navigate('/admin/storage')}
                  >
                    Ver Detalhes →
                  </Button>
                </div>
              )}

              {/* Avisos Ativos */}
              <div className="p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700/30">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <Bell className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    <span className="text-sm font-medium text-purple-800 dark:text-purple-300">
                      Avisos Ativos
                    </span>
                  </div>
                  <span className="text-lg font-bold text-purple-600 dark:text-purple-400">
                    {stats.activeAnnouncements}
                  </span>
                </div>
                <p className="text-xs text-purple-700 dark:text-purple-400/80 mb-2">
                  Últimos 30 dias
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="w-full text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-900/30 h-8"
                  onClick={() => navigate('/admin/announcements')}
                >
                  Gerenciar Avisos →
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card className="bg-white dark:bg-[#0b0f1c] border border-gray-200 dark:border-white/10">
        <CardContent className="p-6">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h3 className="text-lg text-[#020817] dark:text-white font-extralight">
                Ações Rápidas
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Atalhos para as rotinas administrativas mais usadas.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <Button
              onClick={() => navigate('/admin/users')}
              variant="outline"
              className="h-12 justify-start border-gray-200 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              <Users className="h-4 w-4 mr-2" />
              Adicionar Usuário
            </Button>
            <Button
              onClick={() => navigate('/admin/polls')}
              variant="outline"
              className="h-12 justify-start border-gray-200 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              <PieChart className="h-4 w-4 mr-2" />
              Nova Enquete
            </Button>
            <Button
              onClick={() => navigate('/admin/simulations')}
              variant="outline"
              className="h-12 justify-start border-gray-200 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Simulação IRPF
            </Button>
            <Button
              onClick={() => navigate('/admin/calendar')}
              variant="outline"
              className="h-12 justify-start border-gray-200 dark:border-white/10 dark:text-white dark:hover:bg-white/5"
            >
              <Calendar className="h-4 w-4 mr-2" />
              Agenda Fiscal
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Floating Action Button */}
    </div>
  );
};
