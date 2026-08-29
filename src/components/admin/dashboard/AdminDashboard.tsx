import { Users, FileText, PieChart, HardDrive, Bell, Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { AdminPageHeader } from "@/components/admin/ui/AdminPage";
import { useDashboardData } from "./useDashboardData";

interface AdminDashboardProps {
  users: any[];
  supabaseUsers: any[];
  documents: any[];
}

export const AdminDashboard = ({ users, supabaseUsers }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const clientUsers = supabaseUsers.filter(authUser => {
    const userInfo = users.find(user => user.id === authUser.id);
    return !['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  });

  const { stats, formatRecentDate, isLoading } = useDashboardData();

  const statsData = [
    { title: "Acessos de clientes", value: clientUsers.length, icon: Users, link: "/admin/users" },
    { title: "Total de documentos", value: stats.totalDocuments, icon: FileText, link: "/admin/storage" },
    { title: "Enquetes criadas", value: stats.pollCount, icon: PieChart, link: "/admin/polls" },
    { title: "Armazenamento", value: stats.storageStats ? `${stats.storageStats.totalStorageMB.toFixed(1)} MB` : "Calculando...", icon: HardDrive, link: "/admin/storage" }
  ];

  if (isLoading) return <div className="flex min-h-[55vh] items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="ws-storage-style mx-auto w-full max-w-[1480px] space-y-6 px-4 py-5 sm:px-5 sm:py-6 lg:px-8">
      <AdminPageHeader
        eyebrow="Visão geral"
        title="Dashboard"
        description="Resumo da operação, acessos, documentos e atividades recentes."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => navigate('/admin/empresas')}><Users className="mr-2 h-4 w-4" />Clientes</Button>
            <Button onClick={() => navigate('/admin/polls')} variant="outline"><PieChart className="mr-2 h-4 w-4" />Enquetes</Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsData.map(stat => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title} className="cursor-pointer border-0 bg-card shadow-sm transition hover:-translate-y-0.5" onClick={() => navigate(stat.link)}>
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div><p className="text-xs font-medium uppercase tracking-[.08em] text-muted-foreground">{stat.title}</p><p className="mt-2 text-2xl font-light tracking-tight">{stat.value}</p></div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/55 text-muted-foreground"><Icon className="h-5 w-5" /></div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <Card className="border-0 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/35 px-5 py-4"><div><h3 className="font-light">Documentos recentes</h3><p className="text-xs text-muted-foreground">Últimos arquivos enviados no sistema</p></div><FileText className="h-4 w-4 text-muted-foreground" /></div>
            <div>
              {stats.recentDocuments.slice(0, 5).map((doc, index) => (
                <div key={`${doc.name}-${index}`} className={`flex items-center justify-between gap-4 border-b border-border/25 px-5 py-3.5 last:border-b-0 ${index % 2 ? 'bg-muted/[.08]' : ''}`}>
                  <div className="min-w-0"><p className="truncate text-sm font-medium">{doc.name}</p><p className="mt-0.5 text-xs text-muted-foreground">{doc.userName || 'Usuário desconhecido'} · {formatRecentDate(doc.uploaded_at)}</p></div>
                </div>
              ))}
              {stats.recentDocuments.length === 0 && <p className="px-5 py-10 text-center text-sm text-muted-foreground">Nenhum documento recente encontrado.</p>}
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 bg-card shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border/35 px-5 py-4"><div><h3 className="font-light">Operação</h3><p className="text-xs text-muted-foreground">Indicadores rápidos do sistema</p></div><Bell className="h-4 w-4 text-muted-foreground" /></div>
            <div className="divide-y divide-border/25">
              <MetricRow icon={<FileText className="h-4 w-4" />} label="Documentos enviados" description="Últimos 7 dias" value={stats.recentDocumentsCount} action="Ver documentos" onClick={() => navigate('/admin/storage')} />
              <MetricRow icon={<Calendar className="h-4 w-4" />} label="Eventos fiscais próximos" description="Próximos 30 dias" value={stats.upcomingFiscalEvents} action="Ver agenda" onClick={() => navigate('/admin/agenda')} />
              <MetricRow icon={<Bell className="h-4 w-4" />} label="Avisos ativos" description="Últimos 30 dias" value={stats.activeAnnouncements} action="Gerenciar avisos" onClick={() => navigate('/admin/announcements')} />
              {stats.storageStats && (
                <div className="px-5 py-4">
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2 text-sm font-medium"><HardDrive className="h-4 w-4 text-muted-foreground" />Armazenamento</div><span className="text-xs text-muted-foreground">{stats.storageStats.totalStorageGB?.toFixed(2) || '0'} / {stats.storageStats.storageLimitGB || 100} GB</span></div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((stats.storageStats.totalStorageGB || 0) / (stats.storageStats.storageLimitGB || 100)) * 100)}%` }} /></div>
                  <Button size="sm" variant="ghost" className="mt-2 px-0 text-xs" onClick={() => navigate('/admin/storage')}>Ver detalhes</Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-0 bg-card shadow-sm">
        <CardContent className="p-5">
          <div className="mb-4"><h3 className="font-light">Ações rápidas</h3><p className="text-xs text-muted-foreground">Atalhos para as tarefas mais usadas</p></div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <Button onClick={() => navigate('/admin/users')} variant="outline" className="h-11 justify-start"><Users className="mr-2 h-4 w-4" />Documentos dos clientes</Button>
            <Button onClick={() => navigate('/admin/polls')} variant="outline" className="h-11 justify-start"><PieChart className="mr-2 h-4 w-4" />Nova enquete</Button>
            <Button onClick={() => navigate('/admin/simulations')} variant="outline" className="h-11 justify-start"><Calendar className="mr-2 h-4 w-4" />Simulações</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

function MetricRow({ icon, label, description, value, action, onClick }: { icon: React.ReactNode; label: string; description: string; value: number; action: string; onClick: () => void }) {
  return <div className="flex items-center justify-between gap-4 px-5 py-4"><div className="flex min-w-0 items-center gap-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted/55 text-muted-foreground">{icon}</div><div><p className="text-sm font-medium">{label}</p><p className="text-xs text-muted-foreground">{description}</p></div></div><div className="flex items-center gap-3"><span className="text-xl font-light">{value}</span><Button size="sm" variant="ghost" onClick={onClick}>{action}</Button></div></div>;
}
