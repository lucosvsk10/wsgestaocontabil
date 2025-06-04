
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useQuickStatsData = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    documentsCount: 0,
    simulationsCount: 0,
    announcementsCount: 0,
    upcomingEvents: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user?.id]);

  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);

      // Buscar documentos do usuário
      const { count: documentsCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Buscar simulações do usuário
      const { count: simulationsCount } = await supabase
        .from('tax_simulations')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Buscar comunicados ativos
      const { count: announcementsCount } = await supabase
        .from('client_announcements')
        .select('*', { count: 'exact', head: true })
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      // Buscar eventos futuros
      const { count: upcomingEvents } = await supabase
        .from('fiscal_events')
        .select('*', { count: 'exact', head: true })
        .gte('date', new Date().toISOString().split('T')[0])
        .neq('status', 'completed');

      setStats({
        documentsCount: documentsCount || 0,
        simulationsCount: simulationsCount || 0,
        announcementsCount: announcementsCount || 0,
        upcomingEvents: upcomingEvents || 0
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return { stats, isLoading, refreshStats: fetchStats };
};
