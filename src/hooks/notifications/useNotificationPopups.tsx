
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const processedNotificationsRef = useRef<Set<string>>(new Set());

  const dismissPopup = useCallback((id: string) => {
    console.log('Fechando popup:', id);
    setActivePopups(prev => prev.filter(popup => popup.id !== id));
  }, []);

  const clearAllPopups = useCallback(() => {
    console.log('Limpando todos os popups');
    setActivePopups([]);
    processedNotificationsRef.current.clear();
  }, []);

  const processNotification = useCallback((notification: any) => {
    console.log('Processando notificação para popup:', notification);
    
    // Evitar processar a mesma notificação múltiplas vezes
    if (processedNotificationsRef.current.has(notification.id)) {
      console.log('Notificação já foi processada:', notification.id);
      return;
    }

    const isDocumentNotification = notification.type === 'Novo Documento';
    const isFiscalEventNotification = notification.type === 'Evento Fiscal';

    console.log('Tipo da notificação:', notification.type, {
      isDocumentNotification,
      isFiscalEventNotification
    });

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

      console.log('Criando popup:', popupData);
      setActivePopups(prev => [...prev, popupData]);
      processedNotificationsRef.current.add(notification.id);
    } else {
      console.log('Tipo de notificação não gera popup:', notification.type);
    }
  }, []);

  // Subscription para notificações em tempo real
  useEffect(() => {
    if (!user?.id) {
      console.log('Usuário não logado, não criando subscription de popups');
      return;
    }

    console.log('Criando subscription de notificações para popups - usuário:', user.id);

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
          console.log('Nova notificação recebida via realtime para popup:', newNotification);
          processNotification(newNotification);
        }
      )
      .subscribe((status) => {
        console.log('Status da subscription de popups:', status);
      });

    return () => {
      console.log('Removendo subscription de popups');
      supabase.removeChannel(channel);
    };
  }, [user?.id, processNotification]);

  // Limpar notificações processadas quando o usuário muda
  useEffect(() => {
    if (user?.id) {
      processedNotificationsRef.current.clear();
      console.log('Limpando notificações processadas para novo usuário');
    }
  }, [user?.id]);

  return {
    activePopups,
    dismissPopup,
    clearAllPopups
  };
};
