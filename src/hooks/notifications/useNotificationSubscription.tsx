
import { useEffect } from 'react';
import { supabase } from "@/integrations/supabase/client";
import { Notification, DatabaseNotification } from "@/types/notifications";
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
          const dbNotification = payload.new as DatabaseNotification;
          
          // Convert to application notification
          const completeNotification: Notification = {
            ...dbNotification,
            read_at: null, // Since read_at doesn't exist in the database, default to null
            type: dbNotification.type || null
          };
          
          onNewNotification(completeNotification);
          
          // Show toast for new notification
          toast({
            title: completeNotification.type || "Notificação",
            description: (
              <div className="flex flex-col space-y-1">
                <p>{completeNotification.message}</p>
                <span className="text-xs text-gray-500">
                  {formatDate(completeNotification.created_at)}
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
