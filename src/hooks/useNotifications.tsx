import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Notification } from "@/types/notifications";
import { 
  fetchUserNotifications, 
  markNotificationAsRead, 
  markAllNotificationsAsRead, 
  markDocumentNotificationsAsRead,
  deleteAllUserNotifications 
} from "./notifications/notificationService";
import { useNotificationSubscription } from "./notifications/useNotificationSubscription";

export type { Notification };

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await fetchUserNotifications(user.id);
      
      setNotifications(data || []);
      
      // Calculate unread notifications count
      const unread = data?.filter(notif => !notif.is_read)?.length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Mark a notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);

      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      // Update unread counter
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Mark all notifications as read
  const markAllAsRead = async () => {
    if (!user?.id || notifications.length === 0) return;

    try {
      await markAllNotificationsAsRead(user.id);

      // Update local state
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      // Reset unread counter
      setUnreadCount(0);
      
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas"
      });
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
    }
  };

  // Clear notifications (UI only)
  const clearNotifications = () => {
    if (!user?.id) return;
    
    try {
      deleteAllUserNotifications(user.id);
      setNotifications([]);
      setUnreadCount(0);
      
      toast({
        title: "Histórico limpo",
        description: "O histórico de notificações foi limpo"
      });
    } catch (error) {
      console.error('Erro ao limpar notificações:', error);
      toast({
        variant: "destructive",
        title: "Erro",
        description: "Não foi possível limpar o histórico de notificações"
      });
    }
  };

  // Mark notification of a specific document as read
  const markDocumentNotificationAsRead = async (documentId: string) => {
    if (!user?.id || !documentId) return;
    
    try {
      // Find notifications related to this document
      const docNotifications = notifications.filter(n => 
        n.document_id === documentId && !n.is_read
      );
      
      if (docNotifications.length === 0) return;
      
      // Update in database
      await markDocumentNotificationsAsRead(documentId, user.id);
      
      // Update local state
      setNotifications(prev => 
        prev.map(n => 
          n.document_id === documentId ? { ...n, is_read: true } : n
        )
      );
      
      // Update counter
      setUnreadCount(prev => Math.max(0, prev - docNotifications.length));
      
    } catch (error) {
      console.error('Erro ao marcar notificações do documento como lidas:', error);
    }
  };

  // Callback handlers for real-time subscription
  const handleNewNotification = useCallback((newNotification: Notification) => {
    setNotifications(prev => [newNotification, ...prev]);
    setUnreadCount(prev => prev + 1);
  }, []);

  const handleNotificationUpdate = useCallback((updatedNotification: Notification) => {
    setNotifications(prev => 
      prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
    );
    
    // Recalculate unread counter if read status changed
    if (notifications.some(n => n.id === updatedNotification.id && n.is_read !== updatedNotification.is_read)) {
      const newUnreadCount = notifications
        .map(n => n.id === updatedNotification.id ? updatedNotification : n)
        .filter(n => !n.is_read)
        .length;
      
      setUnreadCount(newUnreadCount);
    }
  }, [notifications]);

  // Setup real-time notification subscription
  useNotificationSubscription({
    userId: user?.id,
    onNewNotification: handleNewNotification,
    onNotificationUpdate: handleNotificationUpdate
  });

  // Initial load of notifications
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markAsRead,
    markAllAsRead,
    markDocumentNotificationAsRead,
    clearNotifications,
    refreshNotifications: fetchNotifications
  };
};
