
import { useState, useEffect, useCallback } from 'react';
import { Notification } from '@/types/notifications';
import { useToast } from '@/hooks/use-toast';
import { fetchNotifications, markAsRead, markAllAsRead } from './notificationService';
import { supabase } from '@/lib/supabaseClient';
import { useAuthContext } from '@/contexts/AuthContext';

export const useNotificationBell = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const { toast } = useToast();
  const { userData } = useAuthContext();

  const userId = userData?.id || '';

  const refreshNotifications = useCallback(async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const data = await fetchNotifications(userId);
      setNotifications(data);
      setUnreadCount(data.filter(notification => !notification.read_at).length);
    } catch (error) {
      console.error('Error loading notifications:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as notificações',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [userId, toast]);

  useEffect(() => {
    if (userId) {
      refreshNotifications();
    }
  }, [userId, refreshNotifications]);

  const handleMarkAsRead = useCallback(async (notificationId: string) => {
    try {
      await markAsRead(notificationId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read_at: new Date().toISOString() } 
            : notification
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    if (!userId) return;
    
    try {
      await markAllAsRead(userId);
      setNotifications(prev => 
        prev.map(notification => 
          notification.read_at ? 
            notification : 
            { ...notification, read_at: new Date().toISOString() }
        )
      );
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  }, [userId]);

  const toggleOpen = useCallback(() => {
    setIsOpen(prev => !prev);
  }, []);

  // Set up real-time subscription to notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('public:notifications')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      }, payload => {
        const newNotification = payload.new as Notification;
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        
        toast({
          title: 'Nova notificação',
          description: newNotification.message,
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, toast]);

  return {
    notifications,
    unreadCount,
    isOpen,
    isLoading,
    toggleOpen,
    handleMarkAsRead,
    handleMarkAllAsRead,
    refreshNotifications,
  };
};
