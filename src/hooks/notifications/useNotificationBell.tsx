
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Notification, DatabaseNotification } from '@/types/notifications';

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
        // Convert database notifications to application notifications
        const typedData: Notification[] = data.map(item => ({
          ...item,
          read_at: null, // Since read_at doesn't exist in the database, default to null
          type: item.type || null
        }));
        
        setNotifications(typedData);
        
        // Count unread for badge - all are considered unread since we don't have read_at in DB yet
        setUnreadCount(typedData.length);
      }
    } catch (error: any) {
      console.error('Error fetching notifications:', error.message);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      // Since we don't have read_at in the database, we'll just delete the notification
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);
        
      if (error) throw error;
      
      // Update local state
      setNotifications(prevNotifications => 
        prevNotifications.filter(n => n.id !== notificationId)
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
      // Delete all notifications since we don't have read_at in the database
      const { error } = await supabase
        .from('notifications')
        .delete()
        .in('id', notifications.map(n => n.id));
        
      if (error) throw error;
      
      // Clear notifications
      setNotifications([]);
      
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
