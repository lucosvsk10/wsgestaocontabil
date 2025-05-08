
import { useState, useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/types/notifications";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/utils/documentUtils";
import { ReactNode } from 'react';

interface UseNotificationSubscriptionProps {
  userId: string | undefined;
  onNewNotification: (notification: Notification) => void;
}

/**
 * Hook to handle real-time notification subscriptions
 */
export const useNotificationSubscription = ({
  userId,
  onNewNotification
}: UseNotificationSubscriptionProps) => {
  const { toast } = useToast();

  useEffect(() => {
    if (!userId) return;
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`
        },
        (payload) => {
          console.log("Nova notificação recebida:", payload);
          // Handle new notification
          const newNotification = payload.new as Notification;
          onNewNotification(newNotification);
          
          // Show toast for new notification
          toast({
            title: newNotification.type || "Notificação",
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
      .subscribe();

    console.log("Canal de notificações inscrito para o usuário:", userId);

    // Cleanup subscription
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, onNewNotification, toast]);

  return null;
};
