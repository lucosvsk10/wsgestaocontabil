
import { SupabaseClient } from '@supabase/supabase-js';
import { Notification } from '@/types/notifications';

export interface CreateNotificationParams {
  user_id: string;
  message: string;
  type?: string | null;
}

export class NotificationService {
  private supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getNotifications(userId: string) {
    return this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
  }

  async createNotification(params: CreateNotificationParams) {
    return this.supabase
      .from('notifications')
      .insert({
        user_id: params.user_id,
        message: params.message,
        type: params.type || null,
        read_at: null
      })
      .select()
      .single();
  }

  async markAsRead(notificationId: string) {
    return this.supabase
      .from('notifications')
      .update({
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);
  }

  async deleteNotification(notificationId: string) {
    return this.supabase
      .from('notifications')
      .delete()
      .eq('id', notificationId);
  }

  async deleteAllNotifications(userId: string) {
    return this.supabase
      .from('notifications')
      .delete()
      .eq('user_id', userId);
  }
}
