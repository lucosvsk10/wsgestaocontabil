
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Notification } from '@/types/notifications';
import { NotificationService } from "./notificationService";

export const useNotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  
  useEffect(() => {
    const fetchNotifications = async () => {
      if (!user?.id) return;
      
      setIsLoading(true);
      try {
        const data = await NotificationService.fetchNotifications(user.id);
        setNotifications(data);
        setUnreadCount(data.filter(n => n.read_at === null).length);
      } catch (error) {
        console.error("Error in useNotificationBell:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    if (user) {
      fetchNotifications();
    }
  }, [user]);
  
  const markAsRead = async (notificationId: string) => {
    const success = await NotificationService.markAsRead(notificationId);
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
  
  const markAllAsRead = async () => {
    if (!user?.id) return;
    
    const success = await NotificationService.markAllAsRead(user.id);
    if (success) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setUnreadCount(0);
    }
  };
  
  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
  };
};
