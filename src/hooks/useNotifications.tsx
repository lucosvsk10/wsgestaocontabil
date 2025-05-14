
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useAuth } from "@/contexts/AuthContext";
import { v4 as uuidv4 } from "uuid";
import { Notification } from "@/types/notifications";

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (error) throw error;

      setNotifications(data || []);
      setHasNewNotifications(data?.some(n => n.read_at === null) || false);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      fetchNotifications();
      
      // Subscribe to changes in notifications
      const channel = supabase
        .channel('notification_changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New notification:', payload);
            setNotifications(current => [payload.new as Notification, ...current]);
            setHasNewNotifications(true);
          }
        )
        .subscribe();
      
      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user?.id, fetchNotifications]);

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", notificationId);

      if (error) throw error;

      setNotifications(current =>
        current.map(n => n.id === notificationId ? { ...n, read_at: new Date().toISOString() } : n)
      );
      
      // Check if any unread notifications remain
      const unreadExists = notifications.some(n => n.id !== notificationId && n.read_at === null);
      setHasNewNotifications(unreadExists);
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("user_id", user.id)
        .is("read_at", null);

      if (error) throw error;

      setNotifications(current =>
        current.map(n => n.read_at === null ? { ...n, read_at: new Date().toISOString() } : n)
      );
      
      setHasNewNotifications(false);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const createNotification = async (message: string, type: string = "general") => {
    if (!user?.id) return;
    
    try {
      const newNotification = {
        id: uuidv4(),
        user_id: user.id,
        message,
        type,
        created_at: new Date().toISOString(),
        read_at: null
      };
      
      const { error } = await supabase
        .from("notifications")
        .insert(newNotification);

      if (error) throw error;
      
      // Local update not needed as subscription will handle this
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  };

  const notifyNewDocument = async (documentName: string) => {
    await createNotification(`Novo documento enviado: ${documentName}`, "document");
  };

  const markDocumentNotificationAsRead = async (documentId: string) => {
    if (!user?.id) return;
    
    try {
      // This is a simplified version - in a real app, you'd likely have a more
      // complex way to identify document-specific notifications
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .eq("type", "document")
        .like("message", `%${documentId}%`)
        .is("read_at", null);

      if (error) throw error;
      
      // Mark found notifications as read
      if (data && data.length > 0) {
        for (const notification of data) {
          await markNotificationAsRead(notification.id);
        }
      }
    } catch (error) {
      console.error("Error marking document notification as read:", error);
    }
  };

  const notifyLogin = async () => {
    await createNotification("Login realizado com sucesso", "auth");
  };

  const notifyLogout = async () => {
    await createNotification("Logout realizado", "auth");
  };

  const clearNotifications = async () => {
    if (!user?.id) return;
    
    try {
      // In a real app, you might archive instead of delete
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
      
      setNotifications([]);
      setHasNewNotifications(false);
    } catch (error) {
      console.error("Error clearing notifications:", error);
    }
  };

  return {
    notifications,
    isLoading,
    hasNewNotifications,
    fetchNotifications,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    createNotification,
    notifyNewDocument,
    markDocumentNotificationAsRead,
    notifyLogin,
    notifyLogout,
    clearNotifications
  };
};
