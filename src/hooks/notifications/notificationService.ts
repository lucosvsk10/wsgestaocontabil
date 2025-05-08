
import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/types/notifications";

/**
 * Fetches all notifications for a user
 * @param userId User ID to fetch notifications for
 */
export const fetchUserNotifications = async (userId: string) => {
  if (!userId) throw new Error("User ID is required");
  
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  
  return data || [];
};

/**
 * Marks a notification as read
 * @param notificationId ID of the notification to mark as read
 */
export const markNotificationAsRead = async (notificationId: string) => {
  if (!notificationId) throw new Error("Notification ID is required");
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', notificationId);
    
  if (error) throw error;
};

/**
 * Marks all notifications for a user as read
 * @param userId User ID to mark all notifications as read for
 */
export const markAllNotificationsAsRead = async (userId: string) => {
  if (!userId) throw new Error("User ID is required");
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId)
    .eq('is_read', false);
    
  if (error) throw error;
};

/**
 * Marks notifications related to a document as read
 * @param documentId ID of the document
 * @param userId User ID
 */
export const markDocumentNotificationsAsRead = async (documentId: string, userId: string) => {
  if (!documentId || !userId) throw new Error("Document ID and User ID are required");
  
  const { error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('document_id', documentId)
    .eq('user_id', userId)
    .eq('is_read', false);
    
  if (error) throw error;
};

/**
 * Deletes all notifications for a user
 * @param userId User ID to delete notifications for
 */
export const deleteAllUserNotifications = async (userId: string) => {
  if (!userId) throw new Error("User ID is required");
  
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);
    
  if (error) throw error;
};
