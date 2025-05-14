
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { fetchNotifications, markAsRead, markAllAsRead } from "./notificationService";
import { Notification } from "@/types/notifications";

export const useNotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  const { user } = useAuth();

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
      const fetched = await fetchNotifications(user.id);
      setNotifications(fetched);
      setUnreadCount(countUnread(fetched));
    } catch (error) {
      console.error("Error refreshing notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    
    const success = await markAsRead(notificationId);
    
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
    
    const success = await markAllAsRead(user.id);
    
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
