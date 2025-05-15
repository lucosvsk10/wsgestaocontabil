
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { notificationService } from './notificationService';
import { Notification } from '@/types/notifications';

export function useNotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const data = await notificationService.getNotifications(user.id);
      
      // Ensure all notifications have the read_at field
      const notificationsWithReadAt = data.map(notification => ({
        ...notification,
        read_at: notification.read_at || null
      }));
      
      setNotifications(notificationsWithReadAt);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  // Calculate unread count
  const unreadCount = notifications.filter(n => !n.read_at).length;
  const hasNewNotifications = unreadCount > 0;

  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    if (!user) return;
    
    const success = await notificationService.markAsRead(notificationId);
    if (success) {
      setNotifications(notifications.map(n => 
        n.id === notificationId 
          ? { ...n, read_at: new Date().toISOString() } 
          : n
      ));
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user) return;
    
    const success = await notificationService.markAllAsRead(user.id);
    if (success) {
      setNotifications(notifications.map(n => 
        !n.read_at ? { ...n, read_at: new Date().toISOString() } : n
      ));
    }
  };

  // Remove a notification
  const removeNotification = async (notificationId: string) => {
    if (!user) return;
    
    const success = await notificationService.removeNotification(notificationId);
    if (success) {
      setNotifications(notifications.filter(n => n.id !== notificationId));
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    if (!user) return;

    fetchNotifications();

    const subscription = supabase
      .channel('notifications-bell')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [user, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    hasNewNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    removeNotification,
    notificationService,
  };
}
