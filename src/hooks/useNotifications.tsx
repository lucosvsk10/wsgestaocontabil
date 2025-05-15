
import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/types/notifications';
import { supabase } from '@/lib/supabaseClient';
import { useAuth } from '@/contexts/AuthContext';
import { NotificationService } from './notifications/notificationService';

const notificationService = new NotificationService(supabase);

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await notificationService.getNotifications(user.id);
      
      if (error) {
        console.error('Error fetching notifications:', error);
        return;
      }
      
      if (data) {
        setNotifications(data);
        const unread = data.filter(n => n.read_at === null).length;
        setUnreadCount(unread);
      }
    } catch (error) {
      console.error('Error in fetchNotifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const createNotification = useCallback(async (
    message: string, 
    type: string = null
  ) => {
    if (!user) return null;

    try {
      const { data, error } = await notificationService.createNotification({
        user_id: user.id,
        message,
        type
      });
      
      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }
      
      if (data) {
        await fetchNotifications();
        return data;
      }
    } catch (error) {
      console.error('Error in createNotification:', error);
    }
    return null;
  }, [user, fetchNotifications]);

  const markAsRead = useCallback(async (notificationId: string) => {
    if (!user) return false;

    try {
      const { error } = await notificationService.markAsRead(notificationId);
      
      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }
      
      await fetchNotifications();
      return true;
    } catch (error) {
      console.error('Error in markAsRead:', error);
      return false;
    }
  }, [user, fetchNotifications]);

  const markAllAsRead = useCallback(async () => {
    if (!user || notifications.length === 0) return false;

    try {
      // For each unread notification, mark it as read
      const unreadNotifications = notifications.filter(n => n.read_at === null);
      const promises = unreadNotifications.map(notification => 
        notificationService.markAsRead(notification.id)
      );
      
      await Promise.all(promises);
      await fetchNotifications();
      return true;
    } catch (error) {
      console.error('Error in markAllAsRead:', error);
      return false;
    }
  }, [user, notifications, fetchNotifications]);

  const deleteNotification = useCallback(async (notificationId: string) => {
    if (!user) return false;

    try {
      const { error } = await notificationService.deleteNotification(notificationId);
      
      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }
      
      await fetchNotifications();
      return true;
    } catch (error) {
      console.error('Error in deleteNotification:', error);
      return false;
    }
  }, [user, fetchNotifications]);

  const clearAllNotifications = useCallback(async () => {
    if (!user || notifications.length === 0) return false;

    try {
      const { error } = await notificationService.deleteAllNotifications(user.id);
      
      if (error) {
        console.error('Error clearing notifications:', error);
        return false;
      }
      
      await fetchNotifications();
      return true;
    } catch (error) {
      console.error('Error in clearAllNotifications:', error);
      return false;
    }
  }, [user, notifications, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    refresh: fetchNotifications
  };
};
