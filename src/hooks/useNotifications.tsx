
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Notification } from "@/types/notifications";
import { 
  fetchUserNotifications, 
  deleteAllUserNotifications,
  createLoginNotification,
  createLogoutNotification,
  createDocumentNotification,
  markDocumentNotificationsAsRead
} from "./notifications/notificationService";
import { useNotificationSubscription } from "./notifications/useNotificationSubscription";

export type { Notification };

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [hasNewNotifications, setHasNewNotifications] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const data = await fetchUserNotifications(user.id);
      
      setNotifications(data || []);
      
      // Check if there are any document notifications
      const hasDocNotifications = data?.some(notif => notif.type === 'document') || false;
      setHasNewNotifications(hasDocNotifications);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Clear notifications
  const clearNotifications = async () => {
    if (!user?.id) return;
    
    try {
      await deleteAllUserNotifications(user.id);
      setNotifications([]);
      setHasNewNotifications(false);
      
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

  // Create login notification
  const notifyLogin = useCallback(async () => {
    if (!user?.id) return;
    try {
      await createLoginNotification(user.id);
    } catch (error) {
      console.error('Erro ao criar notificação de login:', error);
    }
  }, [user?.id]);

  // Create logout notification
  const notifyLogout = useCallback(async () => {
    if (!user?.id) return;
    try {
      await createLogoutNotification(user.id);
    } catch (error) {
      console.error('Erro ao criar notificação de logout:', error);
    }
  }, [user?.id]);

  // Create document notification
  const notifyNewDocument = useCallback(async (documentName: string) => {
    if (!user?.id) return;
    try {
      await createDocumentNotification(user.id, documentName);
    } catch (error) {
      console.error('Erro ao criar notificação de documento:', error);
    }
  }, [user?.id]);

  // Mark document notifications as read
  const markDocumentNotificationAsRead = useCallback(async (documentId?: string) => {
    if (!user?.id) return;
    try {
      await markDocumentNotificationsAsRead(user.id, documentId);
      await fetchNotifications(); // Refresh notifications after marking as read
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, [user?.id, fetchNotifications]);

  // Callback handler for real-time subscription
  const handleNewNotification = useCallback((newNotification: Notification) => {
    setNotifications(prev => [newNotification, ...prev]);
    if (newNotification.type === 'document') {
      setHasNewNotifications(true);
    }
  }, []);

  // Setup real-time notification subscription
  useNotificationSubscription({
    userId: user?.id,
    onNewNotification: handleNewNotification
  });

  // Initial load of notifications
  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
    }
  }, [user?.id, fetchNotifications]);

  return {
    notifications,
    hasNewNotifications,
    isLoading,
    clearNotifications,
    refreshNotifications: fetchNotifications,
    notifyLogin,
    notifyLogout,
    notifyNewDocument,
    markDocumentNotificationAsRead
  };
};
