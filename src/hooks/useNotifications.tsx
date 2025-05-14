
import { useCallback, useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "./use-toast";
import { supabase } from "@/lib/supabaseClient";
import { Notification } from "@/types/notifications";
import { 
  fetchNotifications, 
  markAsRead, 
  markAllAsRead 
} from "./notifications/notificationService";

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasNewNotifications, setHasNewNotifications] = useState(false);

  const loadNotifications = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const data = await fetchNotifications(user.id);
      setNotifications(data);
      setHasNewNotifications(data.some(n => !n.read_at));
      setIsLoading(false);
    } catch (error) {
      console.error("Error loading notifications:", error);
      setIsLoading(false);
    }
  }, [user]);

  // Load notifications when user changes
  useEffect(() => {
    if (user) {
      loadNotifications();
    } else {
      setNotifications([]);
      setHasNewNotifications(false);
    }
  }, [user, loadNotifications]);

  const getUserNotifications = useCallback(async () => {
    if (!user) return [];
    return await fetchNotifications(user.id);
  }, [user]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    const success = await markAsRead(notificationId);
    if (success) {
      setNotifications(prev => 
        prev.map(n => n.id === notificationId 
          ? { ...n, read_at: new Date().toISOString() }
          : n
        )
      );
      await loadNotifications();
    }
    return success;
  }, [loadNotifications]);

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return false;
    const success = await markAllAsRead(user.id);
    if (success) {
      setNotifications(prev => 
        prev.map(n => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      setHasNewNotifications(false);
    }
    return success;
  }, [user]);

  const deleteAllNotifications = useCallback(async () => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
        
      if (error) throw error;
      setNotifications([]);
      setHasNewNotifications(false);
      return true;
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      return false;
    }
  }, [user]);

  const clearNotifications = useCallback(async () => {
    return await deleteAllNotifications();
  }, [deleteAllNotifications]);

  const createNotification = useCallback(async (message: string, type: string = "info") => {
    if (!user) return false;
    
    try {
      const { error } = await supabase.from("notifications").insert({
        user_id: user.id,
        message,
        type,
        created_at: new Date().toISOString()
      });
      
      if (error) throw error;
      await loadNotifications();
      return true;
    } catch (error) {
      console.error("Error creating notification:", error);
      return false;
    }
  }, [user, loadNotifications]);

  const notifyLogin = useCallback(async () => {
    return await createNotification("Você fez login com sucesso.", "login");
  }, [createNotification]);

  const notifyLogout = useCallback(async () => {
    return await createNotification("Você saiu da sua conta.", "logout");
  }, [createNotification]);

  const notifyNewDocument = useCallback(async (documentName: string) => {
    return await createNotification(`Novo documento disponível: ${documentName}`, "document");
  }, [createNotification]);

  const markDocumentNotificationAsRead = useCallback(async (notificationId: string) => {
    return await markNotificationRead(notificationId);
  }, [markNotificationRead]);

  return {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteAllNotifications,
    createNotification,
    notifyLogin,
    notifyLogout,
    notifyNewDocument,
    markDocumentNotificationAsRead,
    hasNewNotifications,
    notifications,
    isLoading,
    clearNotifications
  };
};
