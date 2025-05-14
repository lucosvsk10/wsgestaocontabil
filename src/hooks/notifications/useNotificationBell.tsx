
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Notification } from '@/types/notifications';

export const useNotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up realtime subscription
      const subscription = supabase
        .channel('notifications_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchNotifications();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(5);
        
      if (error) throw error;
      
      if (data) {
        const typedData = data.map(item => ({
          ...item,
          read_at: item.read_at || null,
          type: item.type || null
        })) as Notification[];
        
        setNotifications(typedData);
        // Count unread for badge
        const unread = typedData.filter(n => !n.read_at).length;
        setUnreadCount(unread);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error.message);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(n => 
          n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n
        )
      );
      
      // Update unread count
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error.message);
    }
  };

  const markAllAsRead = async () => {
    if (!user || notifications.length === 0) return;
    
    try {
      const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
      
      if (unreadIds.length === 0) return;
      
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .in('id', unreadIds);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.map(n => ({
          ...n, 
          read_at: n.read_at || new Date().toISOString()
        }))
      );
      
      // Reset unread count
      setUnreadCount(0);
      
      toast({
        title: "Notificações",
        description: "Todas as notificações foram marcadas como lidas.",
      });
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error.message);
      toast({
        title: "Erro",
        description: "Não foi possível marcar as notificações como lidas.",
        variant: "destructive",
      });
    }
  };

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
  };
};
