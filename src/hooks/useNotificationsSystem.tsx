
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  document_id: string | null;
  document_name: string | null;
  document_category: string | null;
  is_read: boolean;
  created_at: string;
}

export const useNotificationsSystem = () => {
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
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          documents:document_id (
            name,
            category
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process the joined data to include document fields directly in the notification
      const processedData = data.map(item => ({
        ...item,
        document_name: item.documents?.name || null,
        document_category: item.documents?.category || null,
        documents: undefined // Remove the nested documents object
      }));
      
      setNotifications(processedData);
      setUnreadCount(processedData.filter(n => !n.is_read).length || 0);
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
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
    }
  };
  
  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id || notifications.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
      if (error) throw error;
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      setUnreadCount(0);
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
    }
  };
  
  // Create a notification
  const createNotification = async (title: string, message: string, documentId?: string) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('notifications')
        .insert({
          user_id: user.id,
          title,
          message,
          document_id: documentId || null
        });
      
      if (error) throw error;
      
      // Refresh notifications after creating a new one
      await fetchNotifications();
    } catch (error: any) {
      console.error('Error creating notification:', error);
    }
  };

  // Check for unread notifications on initial load
  const checkUnreadNotifications = async () => {
    if (!user?.id) return;
    
    try {
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);
      
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
    
    // Check for unread notifications on initial load
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
