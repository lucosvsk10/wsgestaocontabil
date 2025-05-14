
import { Notification } from "@/types/notifications";
import { supabase } from "@/lib/supabaseClient";

export interface NotificationCountResult {
  count: number;
  hasUnread: boolean;
}

export const fetchNotifications = async (userId: string): Promise<Notification[]> => {
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  return data || [];
};

export const markAsRead = async (notificationId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notificationId);

  if (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
};

export const markAllAsRead = async (userId: string): Promise<void> => {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('Error marking all notifications as read:', error);
    throw error;
  }
};

export const getUnreadCount = async (userId: string): Promise<NotificationCountResult> => {
  const { data, error, count } = await supabase
    .from('notifications')
    .select('id', { count: 'exact' })
    .eq('user_id', userId)
    .is('read_at', null);

  if (error) {
    console.error('Error counting unread notifications:', error);
    throw error;
  }

  return {
    count: count || 0,
    hasUnread: (count || 0) > 0
  };
};
