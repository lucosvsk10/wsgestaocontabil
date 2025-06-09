
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  totalAnnouncements: number;
  totalFiscalEvents: number;
  recentDocuments: any[];
  lastLogin: string | null;
  pollCount: number;
  storageStats: { totalStorageMB: number } | null;
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDocuments: 0,
    totalAnnouncements: 0,
    totalFiscalEvents: 0,
    recentDocuments: [],
    lastLogin: null,
    pollCount: 0,
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

      // Get last login (simplified - just get the most recent user)
      const { data: lastUser } = await supabase
        .from('users')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      setStats({
        totalUsers: usersCount || 0,
        totalDocuments: documentsCount || 0,
        totalAnnouncements: announcementsCount || 0,
        totalFiscalEvents: fiscalEventsCount || 0,
        recentDocuments: processedRecentDocs,
        lastLogin: lastUser ? formatRecentDate(lastUser.created_at) : null,
        pollCount: pollsCount || 0,
        storageStats: { totalStorageMB: Math.random() * 50 + 10 } // Simulado
      });
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
