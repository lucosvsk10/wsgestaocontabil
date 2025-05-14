
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/types/notifications";
import { NotificationService } from "./notificationService";
import { supabase } from '@/lib/supabaseClient';

export const useNotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();
  const notificationService = new NotificationService();

  const countUnread = (notifs: Notification[]) => {
    return notifs.filter(n => !n.read_at).length;
  };

  const toggleOpen = () => {
    setIsOpen(!isOpen);
  };

  const refreshNotifications = useCallback(async () => {
    if (!user) return;
    
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
      setUnreadCount(countUnread(typedNotifications));
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    
    const success = await notificationService.markAsRead(notificationId);
    
    if (success) {
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId 
            ? { ...n, read_at: new Date().toISOString() } 
            : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    
    const success = await notificationService.markAllAsRead(user.id);
    
    if (success) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  };

  useEffect(() => {
    if (user) {
      refreshNotifications();
    }
  }, [user, refreshNotifications]);

  return {
    notifications,
    unreadCount,
    isOpen,
    isLoading,
    toggleOpen,
    handleMarkAsRead,
    handleMarkAllAsRead,
    refreshNotifications
  };
};
