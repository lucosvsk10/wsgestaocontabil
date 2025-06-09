
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface DashboardStats {
  totalUsers: number;
  totalDocuments: number;
  totalAnnouncements: number;
  totalFiscalEvents: number;
  recentDocuments: any[];
}

export const useDashboardData = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalDocuments: 0,
    totalAnnouncements: 0,
    totalFiscalEvents: 0,
    recentDocuments: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch users count
      const { count: usersCount } = await supabase
        .from('user_profiles')
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

      // Fetch recent documents
      const { data: recentDocs } = await supabase
        .from('documents')
        .select(`
          id,
          name,
          uploaded_at,
          user_profiles!inner(full_name)
        `)
        .order('uploaded_at', { ascending: false })
        .limit(5);

      setStats({
        totalUsers: usersCount || 0,
        totalDocuments: documentsCount || 0,
        totalAnnouncements: announcementsCount || 0,
        totalFiscalEvents: fiscalEventsCount || 0,
        recentDocuments: recentDocs || []
      });
    } catch (error) {
      console.error('Erro ao buscar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchDashboardData };
};
