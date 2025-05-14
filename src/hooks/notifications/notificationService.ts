
import { supabase } from '@/lib/supabaseClient';
import { Notification } from '@/types/notifications';

export class NotificationService {
  async createNotification(userId: string, message: string, type: string = 'info'): Promise<Notification | null> {
    try {
      const notificationData = {
        user_id: userId,
        message,
        type,
        created_at: new Date().toISOString(),
        read_at: null
      };

      const { data, error } = await supabase
        .from('notifications')
        .insert(notificationData)
        .select()
        .single();

      if (error) {
        console.error('Error creating notification:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Exception creating notification:', error);
      return null;
    }
  }

  async markAsRead(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);

      if (error) {
        console.error('Error marking notification as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception marking notification as read:', error);
      return false;
    }
  }

  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read_at: new Date().toISOString() 
        })
        .eq('user_id', userId)
        .is('read_at', null);

      if (error) {
        console.error('Error marking all notifications as read:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception marking all notifications as read:', error);
      return false;
    }
  }

  async deleteNotification(notificationId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) {
        console.error('Error deleting notification:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Exception deleting notification:', error);
      return false;
    }
  }
}
