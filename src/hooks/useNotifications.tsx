
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types/notifications';
import { NotificationService } from '@/hooks/notifications/notificationService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const notificationService = new NotificationService();

  const fetchNotifications = async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Ensure all notification objects have the necessary fields
      const typedNotifications: Notification[] = data.map(notification => ({
        ...notification,
        read_at: notification.read_at || null
      }));

      setNotifications(typedNotifications);
      setUnreadCount(typedNotifications.filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const updatedNotifications = notifications.map(n => {
        if (n.id === notificationId) {
          return { ...n, read_at: new Date().toISOString() };
        }
        return n;
      });

      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read_at).length);

      // Update in database
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: new Date().toISOString() })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!user) return;
    
    try {
      const now = new Date().toISOString();
      const updatedNotifications = notifications.map(n => ({ ...n, read_at: now }));
      
      setNotifications(updatedNotifications);
      setUnreadCount(0);
      
      // Update all in database
      const { error } = await supabase
        .from('notifications')
        .update({ read_at: now })
        .eq('user_id', user.id)
        .is('read_at', null);
        
      if (error) throw error;
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const removeNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;

      const updatedNotifications = notifications.filter(n => n.id !== notificationId);
      setNotifications(updatedNotifications);
      setUnreadCount(updatedNotifications.filter(n => !n.read_at).length);
    } catch (error) {
      console.error('Error removing notification:', error);
    }
  };

  // Add the missing clearNotifications method
  const clearNotifications = async () => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      setNotifications([]);
      setUnreadCount(0);
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  // Add createNotification method
  const createNotification = async (message: string, type: string = 'info') => {
    if (!user) return null;
    
    try {
      const notification = await notificationService.createNotification(user.id, message, type);
      if (notification) {
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      }
      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      return null;
    }
  };

  // Add computed property for hasNewNotifications
  const hasNewNotifications = unreadCount > 0;

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Subscribe to new notifications
      const subscription = supabase
        .channel('notifications_changes')
        .on('postgres_changes', { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        }, payload => {
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();
      
      return () => {
        subscription.unsubscribe();
      };
    }
  }, [user]);

  return {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    createNotification,
    hasNewNotifications,
    notificationService
  };
};
