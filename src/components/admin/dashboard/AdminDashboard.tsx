import { ArrowUpRight, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useDashboardData } from './useDashboardData';
import type { UserType } from '@/types/admin';

interface AuthUser {
  id: string;
}

interface AdminDashboardProps {
  users: UserType[];
  supabaseUsers: AuthUser[];
  documents: unknown[];
}

const formatNumber = (value: number) => new Intl.NumberFormat('pt-BR').format(value || 0);

export const AdminDashboard = ({ users, supabaseUsers }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const { stats, formatRecentDate, isLoading, refetch } = useDashboardData();
  const clientUsers = supabaseUsers.filter(authUser => {
    const userInfo = users.find(user => user.id === authUser.id);
    return !['fiscal', 'contabil', 'geral'].includes(userInfo?.role || '');
  });

  const storageUsed = stats.storageStats?.totalStorageGB || 0;
  const storageLimit = stats.storageStats?.storageLimitGB || 100;
  const storagePercentage = Math.min(100, (storageUsed / storageLimit) * 100);
  const updatedAt = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date());

  if (isLoading) {
    return <div className="flex min-h-[420px] items-center justify-center"><LoadingSpinner /></div>;
  }

  const metrics = [
    { label: 'Clientes ativos', value: formatNumber(clientUsers.length), meta: 'Empresas com acesso ao portal' },
    { label: 'Documentos ativos', value: formatNumber(stats.totalDocuments), meta: `${formatNumber(stats.recentDocumentsCount)} recebidos nos últimos 7 dias` },
    { label: 'Prazos fiscais', value: formatNumber(stats.upcomingFiscalEvents), meta: 'Vencimentos nos próximos 30 dias' },
    { label: 'Armazenamento', value: `${storageUsed.toFixed(2)} GB`, meta: `${storagePercentage.toFixed(2)}% de ${storageLimit} GB` },
  ];

  const operationalItems = [
    { label: 'Documentos recebidos', value: formatNumber(stats.recentDocumentsCount), detail: 'Últimos 7 dias', status: stats.recentDocumentsCount > 0 ? 'Em atividade' : 'Sem movimento', path: '/admin/storage' },
    { label: 'Agenda fiscal', value: formatNumber(stats.upcomingFiscalEvents), detail: 'Próximos 30 dias', status: stats.upcomingFiscalEvents > 0 ? 'Requer acompanhamento' : 'Sem vencimentos', path: '/admin/agenda' },
    { label: 'Avisos publicados', value: formatNumber(stats.activeAnnouncements), detail: 'Ativos nos últimos 30 dias', status: stats.activeAnnouncements > 0 ? 'Publicado' : 'Sem avisos', path: '/admin/announcements' },
    { label: 'Enquetes', value: formatNumber(stats.pollCount), detail: 'Total cadastrado', status: 'Base atual', path: '/admin/polls' },
  ];

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Visão geral</p>
          <h1 className="admin-title">Painel de controle</h1>
          <p className="admin-subtitle">Acompanhe a operação do escritório, os documentos recebidos e os próximos prazos em uma única visão.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="mr-2 hidden text-xs text-[var(--admin-muted)] md:inline">Atualizado em {updatedAt}</span>
          <Button className="admin-button-secondary h-9" onClick={refetch}><RefreshCw className="mr-2 h-3.5 w-3.5" /> Atualizar</Button>
          <Button className="admin-button-primary h-9" onClick={() => navigate('/admin/lancamentos')}>Central de lançamentos</Button>
        </div>
      </header>

      <section className="admin-kpi-grid" aria-label="Indicadores principais">
        {metrics.map(metric => (
          <div key={metric.label} className="admin-kpi">
            <p className="admin-kpi-label">{metric.label}</p>
            <p className="admin-kpi-value">{metric.value}</p>
            <p className="admin-kpi-meta">{metric.meta}</p>
          </div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.65fr)_minmax(330px,0.75fr)]">
        <section className="admin-surface">
          <div className="admin-surface-header">
            <div>
              <h2 className="admin-section-title">Documentos recentes</h2>
              <p className="admin-section-description">Últimos arquivos enviados pelas empresas.</p>
            </div>
            <button type="button" onClick={() => navigate('/admin/storage')} className="flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400">
              Ver armazenamento <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead><tr><th>Documento</th><th>Empresa</th><th>Recebido</th><th>Situação</th></tr></thead>
              <tbody>
                {stats.recentDocuments.length > 0 ? stats.recentDocuments.map(doc => (
                  <tr key={doc.id}>
                    <td className="max-w-[360px] font-semibold"><span className="block truncate">{doc.name}</span></td>
                    <td>{doc.userName || 'Empresa não identificada'}</td>
                    <td className="whitespace-nowrap text-[var(--admin-muted)]">{formatRecentDate(doc.uploaded_at)}</td>
                    <td><span className="admin-status admin-status-blue">Disponível</span></td>
                  </tr>
                )) : (
                  <tr><td colSpan={4}><div className="admin-empty min-h-40"><strong className="text-sm text-[var(--admin-ink)]">Nenhum documento recente</strong><span className="mt-1 text-xs">Os novos envios aparecerão nesta tabela.</span></div></td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="admin-surface">
          <div className="admin-surface-header">
            <div><h2 className="admin-section-title">Operação do escritório</h2><p className="admin-section-description">Indicadores que exigem acompanhamento.</p></div>
          </div>
          <div className="divide-y divide-[var(--admin-line)]">
            {operationalItems.map(item => (
              <button key={item.label} type="button" onClick={() => navigate(item.path)} className="grid w-full grid-cols-[1fr_auto] gap-4 px-[1.15rem] py-3.5 text-left transition-colors hover:bg-[var(--admin-blue-soft)]">
                <span><span className="block text-xs font-semibold text-[var(--admin-ink)]">{item.label}</span><span className="mt-1 block text-[11px] text-[var(--admin-muted)]">{item.detail}</span></span>
                <span className="text-right"><span className="block text-base font-bold text-[var(--admin-ink)]">{item.value}</span><span className="mt-1 block text-[10px] text-[var(--admin-muted)]">{item.status}</span></span>
              </button>
            ))}
          </div>
          <div className="border-t border-[var(--admin-line)] px-[1.15rem] py-4">
            <div className="mb-2 flex items-center justify-between text-[11px]"><span className="font-semibold text-[var(--admin-ink)]">Capacidade utilizada</span><span className="text-[var(--admin-muted)]">{storagePercentage.toFixed(2)}%</span></div>
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${storagePercentage}%` }} /></div>
          </div>
        </section>
      </div>

      <section className="admin-surface">
        <div className="admin-surface-header"><div><h2 className="admin-section-title">Atalhos operacionais</h2><p className="admin-section-description">Acesso direto às rotinas mais usadas.</p></div></div>
        <div className="grid divide-y divide-[var(--admin-line)] md:grid-cols-3 md:divide-x md:divide-y-0">
          {[
            ['Empresas e usuários', 'Cadastros, acessos e documentos', '/admin/users'],
            ['Agenda fiscal', 'Prazos e compromissos do escritório', '/admin/agenda'],
            ['Lançamentos contábeis', 'Competências, conferência e exportação', '/admin/lancamentos'],
          ].map(([title, description, path]) => (
            <button key={title} type="button" onClick={() => navigate(path)} className="group flex items-center justify-between gap-4 p-4 text-left hover:bg-[var(--admin-blue-soft)]">
              <span><span className="block text-xs font-semibold text-[var(--admin-ink)]">{title}</span><span className="mt-1 block text-[11px] text-[var(--admin-muted)]">{description}</span></span>
              <ArrowUpRight className="h-4 w-4 shrink-0 text-[var(--admin-muted)] group-hover:text-blue-600" />
            </button>
          ))}
        </div>
      </section>
    </div>
  );
};
