
import { supabase } from '@/lib/supabaseClient';
import { Notification } from '@/types/notifications';

export class NotificationService {
  static async fetchNotifications(userId: string): Promise<Notification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error('Error fetching notifications:', error);
      return [];
    }
    
    return data as Notification[];
  }
  
  static async markAsRead(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);
      
    if (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
    
    return true;
  }
  
  static async markAllAsRead(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('user_id', userId)
      .is('read_at', null);
      
    if (error) {
      console.error('Error marking all notifications as read:', error);
      return false;
    }
    
    return true;
  }
  
  static async createNotification(userId: string, message: string, type: string = null): Promise<any> {
    const { data, error } = await supabase
      .from('notifications')
      .insert([
        { 
          user_id: userId,
          message,
          type
        }
      ]);
      
    if (error) {
      console.error('Error creating notification:', error);
      return null;
    }
    
    return data;
  }
  
  static async deleteNotification(notificationId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
      
    if (error) {
      console.error('Error deleting notification:', error);
      return false;
    }
    
    return true;
  }
  
  static async clearAllNotifications(userId: string): Promise<boolean> {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
      
    if (error) {
      console.error('Error clearing notifications:', error);
      return false;
    }
    
    return true;
  }
}

export default NotificationService;
