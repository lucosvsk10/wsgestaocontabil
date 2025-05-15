
import { supabase } from "@/lib/supabaseClient";
import { Notification } from "@/types/notifications";

export class NotificationService {
  async getNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching notifications:", error);
      return [];
    }
    
    return data as Notification[];
  }
  
  async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);
    
    if (error) {
      console.error("Error marking notification as read:", error);
      return false;
    }
    
    return true;
  }
  
  async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
    
    if (error) {
      console.error("Error marking all notifications as read:", error);
      return false;
    }
    
    return true;
  }
  
  async createNotification(
    userId: string, 
    message: string, 
    type: string = "default"
  ): Promise<Notification | null> {
    const notification = {
      user_id: userId,
      message,
      type,
      created_at: new Date().toISOString(),
      read_at: null
    };
    
    const { data, error } = await supabase
      .from('notifications')
      .insert(notification)
      .select()
      .single();
    
    if (error) {
      console.error("Error creating notification:", error);
      return null;
    }
    
    return data as Notification;
  }
}

export const notificationService = new NotificationService();
