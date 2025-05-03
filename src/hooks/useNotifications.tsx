
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Notification } from '@/types/notification';
import {
  fetchUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification as createNotificationAPI,
  countUnreadNotifications
} from '@/utils/notifications/notificationsAPI';

export { Notification };

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Fetch notifications
  const fetchNotifications = async () => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await fetchUserNotifications(user.id);
      
      if (error) throw error;
      
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.is_read).length || 0);
    } catch (error: any) {
      console.error('Error fetching notifications:', error);
      toast({
        variant: "destructive",
        title: "Erro ao carregar notificações",
        description: error.message
      });
    } finally {
      setIsLoading(false);
    }
  };
  
  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const { success, error } = await markNotificationAsRead(notificationId);
      
      if (error) throw error;
      
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => 
            n.id === notificationId ? { ...n, is_read: true } : n
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id || notifications.length === 0) return;
    
    try {
      const { success, error } = await markAllNotificationsAsRead(user.id);
      
      if (error) throw error;
      
      if (success) {
        // Update local state
        setNotifications(prev => 
          prev.map(n => ({ ...n, is_read: true }))
        );
        setUnreadCount(0);
      }
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Create a notification
  const createNotification = async (title: string, message: string, documentId?: string) => {
    if (!user?.id) return;
    
    try {
      const { success, error } = await createNotificationAPI(
        user.id, 
        title, 
        message, 
        documentId
      );
      
      if (error) throw error;
      
      // Refresh notifications after creating a new one
      if (success) {
        await fetchNotifications();
      }
    } catch (error: any) {
      console.error('Error creating notification:', error);
    }
  };

  // Check for unread notifications on initial load
  const checkUnreadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const { count, error } = await countUnreadNotifications(user.id);
      
      if (error) throw error;
      
      if (count && count > 0) {
        setUnreadCount(count);
        
        // Show a toast notification about unread items
        toast({
          title: "Notificações não lidas",
          description: `Você tem ${count} notificação${count > 1 ? 's' : ''} não lida${count > 1 ? 's' : ''}.`
        });
      }
    } catch (error: any) {
      console.error('Error checking unread notifications:', error);
    }
  };
  
  // Set up realtime subscription for new notifications
  useEffect(() => {
    if (!user?.id) return;
    
    // Initial fetch
    fetchNotifications();
    
    // Also check for unread notifications on initial load
    checkUnreadNotifications();
    
    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications-channel')
      .on(
        'postgres_changes',
        {
          event: '*',  // Listen for all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log("Notification change detected:", payload);
          
          // If a new notification was added, show a toast and update the count
          if (payload.eventType === 'INSERT') {
            const newNotification = payload.new as Notification;
            
            // Show a toast for the new notification
            toast({
              title: newNotification.title,
              description: newNotification.message,
              duration: 5000,
            });
            
            // Update unread count without refetching everything
            setUnreadCount(prev => prev + 1);
          }
          
          // Refresh notifications when there are changes
          fetchNotifications();
        }
      )
      .subscribe();
    
    // Clean up subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);
  
  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    createNotification,
    fetchNotifications
  };
};
