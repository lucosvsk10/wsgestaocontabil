
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
 * Creates a notification for a user
 * @param userId User ID to create notification for
 * @param message Notification message
 * @param type Notification type
 */
export const createNotification = async (userId: string, message: string, type?: string) => {
  if (!userId || !message) throw new Error("User ID and message are required");
  
  const notification = {
    user_id: userId,
    message,
    type
  };
  
  const { data, error } = await supabase
    .from('notifications')
    .insert(notification)
    .select()
    .single();
    
  if (error) throw error;
  
  return data;
};

/**
 * Creates a login notification
 * @param userId User ID
 */
export const createLoginNotification = async (userId: string) => {
  return createNotification(userId, "Login realizado com sucesso.", "login");
};

/**
 * Creates a logout notification
 * @param userId User ID
 */
export const createLogoutNotification = async (userId: string) => {
  return createNotification(userId, "Logout realizado com sucesso.", "logout");
};

/**
 * Creates a new document notification
 * @param userId User ID
 * @param documentName Document name
 */
export const createDocumentNotification = async (userId: string, documentName: string) => {
  return createNotification(userId, `Novo documento recebido: ${documentName}`, "document");
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

/**
 * Mark document-related notifications as read
 * @param userId User ID
 * @param documentId Document ID
 */
export const markDocumentNotificationsAsRead = async (userId: string, documentId?: string) => {
  if (!userId) throw new Error("User ID is required");
  
  let query = supabase
    .from('notifications')
    .update({ type: 'document_read' })
    .eq('user_id', userId)
    .eq('type', 'document');
    
  // If a document ID is specified, only mark notifications for that document as read
  if (documentId) {
    // Assumes the document ID is contained in the message
    // This is a simple implementation - for a more robust solution, we might need to store document_id in notifications
    query = query.ilike('message', `%${documentId}%`);
  }
    
  const { error } = await query;
    
  if (error) throw error;
};
