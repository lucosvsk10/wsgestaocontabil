
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Announcement } from '@/types/announcements';
import { useAuth } from '@/contexts/AuthContext';

export const useAnnouncements = () => {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveAnnouncements = async () => {
    try {
      const { data, error } = await supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());

      if (error) throw error;

      // Filter announcements based on target type and user status
      const filteredAnnouncements = (data || []).filter(announcement => {
        switch (announcement.target_type) {
          case 'all_users':
            return true;
          case 'logged_users':
            return !!user;
          case 'public_visitors':
            return !user;
          case 'specific_user':
            return user?.id === announcement.target_user_id;
          default:
            return false;
        }
      });

      setAnnouncements(filteredAnnouncements);
    } catch (error) {
      console.error('Error fetching announcements:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (announcementId: string) => {
    try {
      const sessionId = sessionStorage.getItem('session_id') || 
        (() => {
          const id = Math.random().toString(36).substring(2);
          sessionStorage.setItem('session_id', id);
          return id;
        })();

      await supabase
        .from('announcement_views')
        .insert([{
          announcement_id: announcementId,
          user_id: user?.id || null,
          session_id: !user ? sessionId : null
        }]);
    } catch (error) {
      console.error('Error marking announcement as viewed:', error);
    }
  };

  const checkIfViewed = async (announcementId: string): Promise<boolean> => {
    try {
      const sessionId = sessionStorage.getItem('session_id');
      
      let query = supabase
        .from('announcement_views')
        .select('id')
        .eq('announcement_id', announcementId);

      if (user) {
        query = query.eq('user_id', user.id);
      } else if (sessionId) {
        query = query.eq('session_id', sessionId);
      } else {
        return false;
      }

      const { data, error } = await query.limit(1);
      
      if (error) throw error;
      return (data || []).length > 0;
    } catch (error) {
      console.error('Error checking if announcement was viewed:', error);
      return false;
    }
  };

  useEffect(() => {
    fetchActiveAnnouncements();
  }, [user]);

  return {
    announcements,
    loading,
    markAsViewed,
    checkIfViewed,
    refetch: fetchActiveAnnouncements
  };
};
