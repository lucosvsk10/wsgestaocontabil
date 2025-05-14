
import { supabase } from "@/lib/supabaseClient";
import { Notification } from "@/types/notifications";

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    return data as Notification[];
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return [];
  }
};

export const markAsRead = async (notificationId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", notificationId);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return false;
  }
};

export const markAllAsRead = async (userId: string): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from("notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);

    if (error) {
      throw error;
    }

    return true;
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return false;
  }
};
