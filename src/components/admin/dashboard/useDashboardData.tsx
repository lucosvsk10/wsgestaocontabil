
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useStorageStats } from '@/hooks/useStorageStats';

interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  totalAnnouncements: number;
  totalFiscalEvents: number;
  recentDocuments: any[];
  pollCount: number;
  expiringDocuments: number;
  upcomingFiscalEvents: number;
  activeAnnouncements: number;
  storageStats: { 
    totalStorageMB: number;
    totalStorageGB: number;
    storageLimitGB: number;
  } | null;
}

export const useDashboardData = () => {
  const { storageStats } = useStorageStats();
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDocuments: 0,
    totalAnnouncements: 0,
    totalFiscalEvents: 0,
    recentDocuments: [],
    pollCount: 0,
    expiringDocuments: 0,
    upcomingFiscalEvents: 0,
    activeAnnouncements: 0,
    storageStats: null
  });
  const [loading, setLoading] = useState(true);

  const formatRecentDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) return 'Agora há pouco';
    if (diffHours < 24) return `${diffHours}h atrás`;
    if (diffDays < 7) return `${diffDays}d atrás`;
    return date.toLocaleDateString('pt-BR');
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Atualizar estatísticas de armazenamento quando os dados reais estiverem disponíveis
  useEffect(() => {
    if (storageStats) {
      setStats(prev => ({
        ...prev,
        storageStats: {
          totalStorageMB: Number((storageStats.totalStorageMB || 0).toFixed(2)),
          totalStorageGB: Number((storageStats.totalStorageGB || 0).toFixed(2)),
          storageLimitGB: storageStats.storageLimitGB || 100
        }
      }));
    }
  }, [storageStats]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch users count (corrigido para usar 'users' ao invés de 'user_profiles')
      const { count: usersCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true });

      // Fetch documents count
      const { count: documentsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true });

      // Fetch announcements count
      const { count: announcementsCount } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true });

      // Fetch fiscal events count
      const { count: fiscalEventsCount } = await supabase
        .from('fiscal_events')
        .select('*', { count: 'exact', head: true });

      // Fetch polls count
      const { count: pollsCount } = await supabase
        .from('polls')
        .select('*', { count: 'exact', head: true });

      // Fetch recent documents with user info
      const { data: recentDocs } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          uploaded_at,
          users!inner(name)
        `)
        .order('uploaded_at', { ascending: false })
        .limit(5);

      // Process recent documents to add user name
      const processedRecentDocs = (recentDocs || []).map(doc => ({
        ...doc,
        userName: doc.users?.name || 'Usuário desconhecido'
      }));

      // Documentos expirando nos próximos 30 dias
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { count: expiringDocsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .not('expires_at', 'is', null)
        .gte('expires_at', new Date().toISOString())
        .lte('expires_at', thirtyDaysFromNow.toISOString());

      // Eventos fiscais próximos (próximos 30 dias)
      const { count: upcomingEventsCount } = await supabase
        .from('fiscal_events')
        .select('*', { count: 'exact', head: true })
        .gte('date', new Date().toISOString().split('T')[0])
        .lte('date', thirtyDaysFromNow.toISOString().split('T')[0]);

      // Avisos ativos (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const { count: activeAnnouncementsCount } = await supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true)
        .gte('created_at', thirtyDaysAgo.toISOString());

      setStats(prev => ({
        ...prev,
        totalUsers: usersCount || 0,
        totalDocuments: documentsCount || 0,
        totalAnnouncements: announcementsCount || 0,
        totalFiscalEvents: fiscalEventsCount || 0,
        recentDocuments: processedRecentDocs,
        pollCount: pollsCount || 0,
        expiringDocuments: expiringDocsCount || 0,
        upcomingFiscalEvents: upcomingEventsCount || 0,
        activeAnnouncements: activeAnnouncementsCount || 0
      }));
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return { 
    stats, 
    loading, 
    refetch: fetchDashboardData,
    formatRecentDate,
    isLoading: loading
  };
};
