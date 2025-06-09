
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
import { callEdgeFunction } from "@/utils/edgeFunctions";

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
      console.log("Carregando notificações para o usuário:", user.id);
      const data = await fetchUserNotifications(user.id);
      console.log("Notificações carregadas:", data?.length || 0);
      
      setNotifications(data);
      
      // Check if there are any document notifications that haven't been read yet
      // Since we don't have read_at in the database, we'll consider type for identification
      const hasUnreadDocNotifications = data?.some(notif => 
        notif.type === 'Novo Documento'
      ) || false;
      
      setHasNewNotifications(hasUnreadDocNotifications);
      console.log("Há novas notificações de documentos?", hasUnreadDocNotifications);
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
      console.log("Limpando todas as notificações para o usuário:", user.id);
      await deleteAllUserNotifications(user.id);
      setNotifications([]);
      setHasNewNotifications(false);
      
      toast({
        title: "Histórico limpo",
        description: "O histórico de notificações foi limpo"
      });
      console.log("Histórico de notificações limpo com sucesso");
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
      console.log("Criando notificação de login para o usuário:", user.id);
      await createLoginNotification(user.id);
    } catch (error) {
      console.error('Erro ao criar notificação de login:', error);
    }
  }, [user?.id]);

  // Create logout notification
  const notifyLogout = useCallback(async () => {
    if (!user?.id) return;
    try {
      console.log("Criando notificação de logout para o usuário:", user.id);
      await createLogoutNotification(user.id);
    } catch (error) {
      console.error('Erro ao criar notificação de logout:', error);
    }
  }, [user?.id]);

  // Create document notification via edge function
  const notifyNewDocument = useCallback(async (userId: string, documentName: string) => {
    if (!userId) throw new Error("ID do usuário é necessário para criar notificação");
    try {
      console.log(`Chamando edge function para notificação do usuário ${userId} sobre documento: ${documentName}`);
      
      interface NotifyDocumentResponse {
        success: boolean;
        notification?: any;
        error?: string;
      }

      const result = await callEdgeFunction<NotifyDocumentResponse>('notify_new_document', {
        user_id: userId,
        document_name: documentName
      });
      
      if (result.success) {
        console.log("Notificação salva:", result.notification);
        return result.notification;
      } else {
        throw new Error(result.error || "Erro desconhecido ao criar notificação");
      }
    } catch (error) {
      console.error('Erro ao criar notificação:', error);
      throw error;
    }
  }, []);

  // Mark document notifications as read
  const markDocumentNotificationAsRead = useCallback(async (documentId?: string) => {
    if (!user?.id) return;
    try {
      console.log("Marcando notificação de documento como lida para o usuário:", user.id);
      await markDocumentNotificationsAsRead(user.id, documentId);
      await fetchNotifications(); // Refresh notifications after marking as read
      console.log("Notificação marcada como lida e lista atualizada");
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  }, [user?.id, fetchNotifications]);

  // Callback handler for real-time subscription
  const handleNewNotification = useCallback((newNotification: Notification) => {
    console.log("Nova notificação recebida em tempo real:", newNotification);
    setNotifications(prev => [newNotification, ...prev]);
    if (newNotification.type === 'Novo Documento') {
      setHasNewNotifications(true);
      console.log("Novo indicador de documento não lido definido como true");
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
      console.log("Carregando notificações iniciais para o usuário:", user.id);
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
