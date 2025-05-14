
import { useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "./use-toast";
import { supabase } from "@/lib/supabaseClient";
import { 
  fetchNotifications, 
  markAsRead, 
  markAllAsRead 
} from "./notifications/notificationService";

export const useNotifications = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const getUserNotifications = useCallback(async () => {
    if (!user) return [];
    return await fetchNotifications(user.id);
  }, [user]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    return await markAsRead(notificationId);
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!user) return false;
    return await markAllAsRead(user.id);
  }, [user]);

  const deleteAllNotifications = useCallback(async () => {
    if (!user) return false;
    
    try {
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("user_id", user.id);
        
      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting all notifications:", error);
      return false;
    }
  }, [user]);

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
      return true;
    } catch (error) {
      console.error("Error creating notification:", error);
      return false;
    }
  }, [user]);

  return {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteAllNotifications,
    createNotification,
  };
};
