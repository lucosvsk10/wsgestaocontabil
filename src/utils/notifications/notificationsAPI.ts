
import { supabase } from '@/integrations/supabase/client';
import { Notification } from '@/types/notification';

// Fetch notifications for current user
export const fetchUserNotifications = async (userId: string) => {
  if (!userId) return { data: [], error: new Error('User ID is required') };
  
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        documents:document_id (
          name,
          category
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Process the joined data to include document fields directly in the notification
    const processedData = data.map(item => ({
      ...item,
      document_name: item.documents?.name || null,
      document_category: item.documents?.category || null,
      documents: undefined // Remove the nested documents object
    }));
    
    return { data: processedData, error: null };
  } catch (error: any) {
    console.error('Error fetching notifications:', error);
    return { data: [], error };
  }
};

// Mark a notification as read
export const markNotificationAsRead = async (notificationId: string) => {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId);
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error marking notification as read:', error);
    return { success: false, error };
  }
};

// Mark all user notifications as read
export const markAllNotificationsAsRead = async (userId: string) => {
  if (!userId) return { success: false, error: new Error('User ID is required') };
  
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error marking all notifications as read:', error);
    return { success: false, error };
  }
};

// Create a new notification
export const createNotification = async (
  userId: string,
  title: string,
  message: string,
  documentId?: string
) => {
  if (!userId) return { success: false, error: new Error('User ID is required') };
  
  try {
    const { error } = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        title,
        message,
        document_id: documentId || null
      });
    
    if (error) throw error;
    return { success: true, error: null };
  } catch (error: any) {
    console.error('Error creating notification:', error);
    return { success: false, error };
  }
};

// Count unread notifications
export const countUnreadNotifications = async (userId: string) => {
  if (!userId) return { count: 0, error: null };
  
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);
    
    if (error) throw error;
    return { count: count || 0, error: null };
  } catch (error: any) {
    console.error('Error counting unread notifications:', error);
    return { count: 0, error };
  }
};
