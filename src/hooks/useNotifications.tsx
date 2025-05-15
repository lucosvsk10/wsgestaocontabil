
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types/notifications';
import { NotificationService } from './notifications/notificationService';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    try {
      const notificationsData = await NotificationService.fetchNotifications(user.id);
      setNotifications(notificationsData);
      setUnreadCount(notificationsData.filter(n => n.read_at === null).length);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);
  
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);
  
  const createNotification = async (message: string, type?: string) => {
    if (!user) return null;
    
    const result = await NotificationService.createNotification(user.id, message, type || null);
    fetchNotifications();
    return result;
  };
  
  const markAsRead = async (notificationId: string) => {
    if (!user) return false;
    
    const success = await NotificationService.markAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    return success;
  };
  
  const markAllAsRead = async () => {
    if (!user) return false;
    
    const success = await NotificationService.markAllAsRead(user.id);
    if (success) {
      const now = new Date().toISOString();
      setNotifications(prev => 
        prev.map(n => n.read_at === null ? { ...n, read_at: now } : n)
      );
      setUnreadCount(0);
    }
    return success;
  };
  
  const deleteNotification = async (notificationId: string) => {
    if (!user) return false;
    
    const success = await NotificationService.deleteNotification(notificationId);
    if (success) {
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
      setUnreadCount(prev => {
        const notif = notifications.find(n => n.id === notificationId);
        return notif && notif.read_at === null ? prev - 1 : prev;
      });
    }
    return success;
  };
  
  const clearAllNotifications = async () => {
    if (!user) return false;
    
    const success = await NotificationService.clearAllNotifications(user.id);
    if (success) {
      setNotifications([]);
      setUnreadCount(0);
    }
    return success;
  };
  
  return {
    notifications,
    unreadCount,
    isLoading,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    clearAllNotifications,
    hasNewNotifications: unreadCount > 0,
    clearNotifications: clearAllNotifications
  };
};
