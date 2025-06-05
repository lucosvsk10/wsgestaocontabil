
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.id) {
      fetchStats();
    }
  }, [user?.id]);

  const fetchStats = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      // Buscar documentos do usuário
      const { data: documents, error: documentsError } = await supabase
        .from('documents')
        .select('id')
        .eq('user_id', user.id);

      if (documentsError) throw documentsError;

      // Buscar simulações do usuário (todas as tipos)
      const [taxSimulations, inssSimulations, prolaboreSimulations] = await Promise.all([
        supabase
          .from('tax_simulations')
          .select('id')
          .eq('user_id', user.id),
        supabase
          .from('inss_simulations')
          .select('id')
          .eq('user_id', user.id),
        supabase
          .from('prolabore_simulations')
          .select('id')
          .eq('user_id', user.id)
      ]);

      const totalSimulations = 
        (taxSimulations.data?.length || 0) + 
        (inssSimulations.data?.length || 0) + 
        (prolaboreSimulations.data?.length || 0);

      // Buscar comunicados ativos
      const { data: announcements, error: announcementsError } = await supabase
        .from('client_announcements')
        .select('id')
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

      if (announcementsError) throw announcementsError;

      // Buscar eventos fiscais próximos (próximos 30 dias)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const { data: events, error: eventsError } = await supabase
        .from('fiscal_events')
        .select('id')
        .gte('date', new Date().toISOString().split('T')[0])
        .lte('date', thirtyDaysFromNow.toISOString().split('T')[0])
        .neq('status', 'completed');

      if (eventsError) throw eventsError;

      setStats({
        documentsCount: documents?.length || 0,
        simulationsCount: totalSimulations,
        announcementsCount: announcements?.length || 0,
        upcomingEvents: events?.length || 0
      });
    } catch (error) {
      console.error('Erro ao buscar estatísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  return { stats, loading, refetch: fetchStats };
};
