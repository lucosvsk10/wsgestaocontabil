import { Download, RefreshCw, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStorageStats } from '@/hooks/useStorageStats';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { useMemo, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

const formatSize = (bytes: number) => {
  if (!bytes) return '0 B';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(sizes.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / Math.pow(1024, index)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${sizes[index]}`;
};

export const StorageView = () => {
  const { storageStats, isLoading, fetchStorageStats } = useStorageStats();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('usage');
  const { toast } = useToast();

  const rows = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    return [...(storageStats?.userStorage || [])]
      .filter(user => `${user.userName || user.name || ''} ${user.userEmail || user.email || ''}`.toLowerCase().includes(normalizedSearch))
      .sort((a, b) => {
        if (sortBy === 'name') return (a.userName || a.name || '').localeCompare(b.userName || b.name || '');
        if (sortBy === 'documents') return (b.documentsCount || 0) - (a.documentsCount || 0);
        return b.sizeBytes - a.sizeBytes;
      });
  }, [searchTerm, sortBy, storageStats]);

  const totalDocuments = (storageStats?.userStorage || []).reduce((sum, user) => sum + (user.documentsCount || 0), 0);
  const activeCompanies = (storageStats?.userStorage || []).filter(user => user.sizeBytes > 0).length;
  const usedPercentage = storageStats ? Math.min(100, (storageStats.totalStorageGB / storageStats.storageLimitGB) * 100) : 0;

  const handleExportReport = () => {
    if (!storageStats) {
      toast({ variant: 'destructive', title: 'Dados indisponíveis', description: 'Atualize a página e tente novamente.' });
      return;
    }
    const header = 'Empresa,Email,Documentos,Tamanho total\n';
    const data = storageStats.userStorage.map(user =>
      `"${user.userName || user.name || 'Sem nome'}","${user.userEmail || user.email || 'Sem e-mail'}",${user.documentsCount || 0},"${formatSize(user.sizeBytes)}"`
    ).join('\n');
    const blob = new Blob([header + data], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `armazenamento-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Relatório exportado', description: 'O arquivo CSV foi gerado com os dados atuais.' });
  };

  if (isLoading) return <div className="flex min-h-[420px] items-center justify-center"><LoadingSpinner /></div>;

  return (
    <div className="admin-page">
      <header className="admin-page-header">
        <div>
          <p className="admin-eyebrow">Documentos e capacidade</p>
          <h1 className="admin-title">Armazenamento</h1>
          <p className="admin-subtitle">Monitore o volume de arquivos por empresa e identifique onde a capacidade está concentrada.</p>
        </div>
        <div className="flex gap-2">
          <Button className="admin-button-secondary h-9" onClick={fetchStorageStats}><RefreshCw className="mr-2 h-3.5 w-3.5" />Atualizar</Button>
          <Button className="admin-button-primary h-9" onClick={handleExportReport}><Download className="mr-2 h-3.5 w-3.5" />Exportar CSV</Button>
        </div>
      </header>

      <section className="admin-kpi-grid">
        <div className="admin-kpi"><p className="admin-kpi-label">Espaço utilizado</p><p className="admin-kpi-value">{formatSize(storageStats?.totalStorageBytes || 0)}</p><p className="admin-kpi-meta">{usedPercentage.toFixed(2)}% da capacidade</p></div>
        <div className="admin-kpi"><p className="admin-kpi-label">Capacidade contratada</p><p className="admin-kpi-value">{storageStats?.storageLimitGB || 100} GB</p><p className="admin-kpi-meta">Limite total do ambiente</p></div>
        <div className="admin-kpi"><p className="admin-kpi-label">Documentos</p><p className="admin-kpi-value">{totalDocuments.toLocaleString('pt-BR')}</p><p className="admin-kpi-meta">Arquivos contabilizados</p></div>
        <div className="admin-kpi"><p className="admin-kpi-label">Empresas com arquivos</p><p className="admin-kpi-value">{activeCompanies}</p><p className="admin-kpi-meta">Utilizando armazenamento</p></div>
      </section>

      <section className="admin-surface">
        <div className="admin-surface-header">
          <div><h2 className="admin-section-title">Uso total da capacidade</h2><p className="admin-section-description">Volume consolidado de todos os documentos ativos.</p></div>
          <span className="text-xs font-bold text-blue-600 dark:text-blue-400">{usedPercentage.toFixed(2)}%</span>
        </div>
        <div className="p-5">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${usedPercentage}%` }} /></div>
          <div className="mt-2 flex justify-between text-[11px] text-[var(--admin-muted)]"><span>{(storageStats?.totalStorageGB || 0).toFixed(3)} GB utilizados</span><span>{((storageStats?.storageLimitGB || 100) - (storageStats?.totalStorageGB || 0)).toFixed(3)} GB disponíveis</span></div>
        </div>
      </section>

      <div className="admin-toolbar">
        <div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--admin-muted)]" /><Input value={searchTerm} onChange={event => setSearchTerm(event.target.value)} placeholder="Buscar empresa ou e-mail" className="h-9 border-[var(--admin-line)] bg-transparent pl-10 shadow-none" /></div>
        <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="h-9 w-full border-[var(--admin-line)] bg-transparent shadow-none sm:w-52"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="usage">Maior utilização</SelectItem><SelectItem value="documents">Mais documentos</SelectItem><SelectItem value="name">Ordem alfabética</SelectItem></SelectContent></Select>
      </div>

      <section className="admin-surface">
        <div className="admin-surface-header"><div><h2 className="admin-section-title">Armazenamento por empresa</h2><p className="admin-section-description">{rows.length} {rows.length === 1 ? 'empresa encontrada' : 'empresas encontradas'}.</p></div></div>
        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead><tr><th>Empresa</th><th>E-mail</th><th>Documentos</th><th>Participação</th><th className="text-right">Espaço utilizado</th></tr></thead>
            <tbody>
              {rows.length > 0 ? rows.map(user => {
                const share = storageStats?.totalStorageBytes ? (user.sizeBytes / storageStats.totalStorageBytes) * 100 : 0;
                return <tr key={user.userId}><td className="font-semibold">{user.userName || user.name || 'Empresa sem nome'}</td><td className="text-[var(--admin-muted)]">{user.userEmail || user.email || 'Sem e-mail'}</td><td>{(user.documentsCount || 0).toLocaleString('pt-BR')}</td><td><div className="flex min-w-[150px] items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"><div className="h-full rounded-full bg-blue-600" style={{ width: `${Math.max(share, share > 0 ? 2 : 0)}%` }} /></div><span className="w-14 text-right text-[11px] text-[var(--admin-muted)]">{share.toFixed(2)}%</span></div></td><td className="text-right font-semibold tabular-nums">{formatSize(user.sizeBytes)}</td></tr>;
              }) : <tr><td colSpan={5}><div className="admin-empty"><strong className="text-sm text-[var(--admin-ink)]">Nenhuma empresa encontrada</strong><span className="mt-1 text-xs">Revise os termos usados na busca.</span></div></td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
