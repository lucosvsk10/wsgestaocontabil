
import { useState, useEffect, useCallback, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/documentUtils";

export interface Notification {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  // Carregar notificações
  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setNotifications(data || []);
      
      // Calcular o número de notificações não lidas
      const unread = data?.filter(notif => !notif.is_read)?.length || 0;
      setUnreadCount(unread);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  // Marcar uma notificação como lida
  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);

      if (error) throw error;

      // Atualizar o estado local
      setNotifications(prev => 
        prev.map(n => 
          n.id === notificationId ? { ...n, is_read: true } : n
        )
      );
      
      // Atualizar contador de não lidas
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
    }
  };

  // Marcar todas as notificações como lidas
  const markAllAsRead = async () => {
    if (!user?.id || notifications.length === 0) return;

    try {
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) throw error;

      // Atualizar o estado local
      setNotifications(prev => 
        prev.map(n => ({ ...n, is_read: true }))
      );
      
      // Zerar contador
      setUnreadCount(0);
      
      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas"
      });
    } catch (error) {
      console.error('Erro ao marcar todas notificações como lidas:', error);
    }
  };

  // Limpar histórico de notificações (apenas na interface)
  const clearNotifications = () => {
    setNotifications([]);
    setUnreadCount(0);
    toast({
      title: "Histórico limpo",
      description: "O histórico de notificações foi limpo"
    });
  };

  // Marcar notificação de um documento específico como lida
  const markDocumentNotificationAsRead = async (documentId: string) => {
    if (!user?.id || !documentId) return;
    
    try {
      // Encontrar notificações relacionadas a este documento
      const docNotifications = notifications.filter(n => 
        n.document_id === documentId && !n.is_read
      );
      
      if (docNotifications.length === 0) return;
      
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('document_id', documentId)
        .eq('user_id', user.id)
        .eq('is_read', false);
        
      if (error) throw error;
      
      // Atualizar estado local
      setNotifications(prev => 
        prev.map(n => 
          n.document_id === documentId ? { ...n, is_read: true } : n
        )
      );
      
      // Atualizar contador
      setUnreadCount(prev => Math.max(0, prev - docNotifications.length));
      
    } catch (error) {
      console.error('Erro ao marcar notificações do documento como lidas:', error);
    }
  };

  // Configurar canal de tempo real para receber novas notificações
  useEffect(() => {
    if (!user?.id) return;

    // Carregar notificações iniciais
    fetchNotifications();

    // Inscrever para atualizações em tempo real na tabela notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log("Nova notificação recebida:", payload);
          // Adicionar nova notificação ao estado
          const newNotification = payload.new as Notification;
          setNotifications(prev => [newNotification, ...prev]);
          setUnreadCount(prev => prev + 1);
          
          // Mostrar toast para nova notificação
          toast({
            title: newNotification.title,
            description: (
              <div className="flex flex-col space-y-1">
                <p>{newNotification.message}</p>
                <span className="text-xs text-gray-500">
                  {formatDate(newNotification.created_at)}
                </span>
              </div>
            ) as ReactNode,
            duration: 5000,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`
        },
        (payload) => {
          console.log("Notificação atualizada:", payload);
          // Atualizar notificação existente no estado
          const updatedNotification = payload.new as Notification;
          setNotifications(prev => 
            prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
          );
          
          // Recalcular contador de não lidas se necessário
          if (payload.old.is_read !== updatedNotification.is_read) {
            setUnreadCount(prev => 
              updatedNotification.is_read ? prev - 1 : prev + 1
            );
          }
        }
      )
      .subscribe();

    console.log("Canal de notificações inscrito para o usuário:", user.id);

    // Limpar inscrição quando o componente desmontar
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, fetchNotifications, toast]);

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
