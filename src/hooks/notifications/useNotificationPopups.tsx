
import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { NotificationPopupData } from '@/types/notifications';

interface UseNotificationPopupsReturn {
  activePopups: NotificationPopupData[];
  dismissPopup: (id: string) => void;
  clearAllPopups: () => void;
}

export const useNotificationPopups = (): UseNotificationPopupsReturn => {
  const { user } = useAuth();
  const [activePopups, setActivePopups] = useState<NotificationPopupData[]>([]);
  const [processedNotifications, setProcessedNotifications] = useState<Set<string>>(new Set());

  const dismissPopup = useCallback((id: string) => {
    setActivePopups(prev => prev.filter(popup => popup.id !== id));
  }, []);

  const clearAllPopups = useCallback(() => {
    setActivePopups([]);
  }, []);

  const processNotification = useCallback((notification: any) => {
    // Evitar processar a mesma notificação múltiplas vezes
    if (processedNotifications.has(notification.id)) return;

    const isDocumentNotification = notification.type === 'Novo Documento';
    const isFiscalEventNotification = notification.type === 'Evento Fiscal';

    if (isDocumentNotification || isFiscalEventNotification) {
      const popupData: NotificationPopupData = {
        id: notification.id,
        type: isDocumentNotification ? 'novo_documento' : 'agenda_fiscal',
        title: isDocumentNotification ? 'Novo Documento Recebido' : 'Novo Evento na Agenda Fiscal',
        message: notification.message,
        actionUrl: isDocumentNotification ? '/client/documents' : '/client/fiscal-calendar',
        actionText: isDocumentNotification ? 'Ver Documentos' : 'Ver Agenda',
        userId: notification.user_id,
        createdAt: notification.created_at
      };

      setActivePopups(prev => [...prev, popupData]);
      setProcessedNotifications(prev => new Set(prev).add(notification.id));
    }
  }, [processedNotifications]);

  // Subscription para notificações em tempo real
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel(`notification-popups-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new;
          console.log('Nova notificação recebida para popup:', newNotification);
          
          // Verificar se é uma notificação que deve gerar popup
          if (newNotification.type === 'Novo Documento' || newNotification.type === 'Evento Fiscal') {
            processNotification(newNotification);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, processNotification]);

  // Subscription para eventos fiscais
  useEffect(() => {
    if (!user?.id) return;

    const fiscalChannel = supabase
      .channel('fiscal-events-popups')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fiscal_events',
        },
        async (payload) => {
          const newEvent = payload.new;
          console.log('Novo evento fiscal criado:', newEvent);
          
          // Criar notificação para todos os usuários sobre novo evento fiscal
          const popupData: NotificationPopupData = {
            id: `fiscal-${newEvent.id}-${Date.now()}`,
            type: 'agenda_fiscal',
            title: 'Novo Evento na Agenda Fiscal',
            message: `Novo evento: ${newEvent.title}`,
            actionUrl: '/client/fiscal-calendar',
            actionText: 'Ver Agenda',
            fiscalEventId: newEvent.id,
            createdAt: newEvent.created_at
          };

          setActivePopups(prev => [...prev, popupData]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(fiscalChannel);
    };
  }, [user?.id]);

  return {
    activePopups,
    dismissPopup,
    clearAllPopups
  };
};
