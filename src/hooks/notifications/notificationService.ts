import { supabase } from "@/integrations/supabase/client";
import { Notification } from "@/types/notifications";

/**
 * Fetches all notifications for a user
 * @param userId User ID to fetch notifications for
 */
export const fetchUserNotifications = async (userId: string): Promise<Notification[]> => {
  if (!userId) throw new Error("User ID is required");
  
  console.log("Buscando notificações para o usuário:", userId);
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error("Erro ao buscar notificações:", error);
    throw error;
  }
  
  console.log(`${data?.length || 0} notificações encontradas`);
  
  // Make sure to include read_at field for each notification
  return (data || []).map(notification => ({
    ...notification,
    read_at: notification.read_at || null
  })) as Notification[];
};

/**
 * Creates a notification for a user
 * @param userId User ID to create notification for
 * @param message Notification message
 * @param type Notification type
 */
export const createNotification = async (userId: string, message: string, type?: string) => {
  if (!userId || !message) throw new Error("User ID and message are required");
  
  console.log(`Criando notificação tipo "${type}" para usuário:`, userId);
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
    
  if (error) {
    console.error("Erro ao criar notificação:", error);
    throw error;
  }
  
  console.log("Notificação criada com sucesso:", data);
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
  return createNotification(userId, `Novo documento recebido: ${documentName}`, "Novo Documento");
};

/**
 * Deletes all notifications for a user
 * @param userId User ID to delete notifications for
 */
export const deleteAllUserNotifications = async (userId: string) => {
  if (!userId) throw new Error("User ID is required");
  
  console.log("Excluindo todas as notificações para o usuário:", userId);
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('user_id', userId);
    
  if (error) {
    console.error("Erro ao excluir notificações:", error);
    throw error;
  }
  
  console.log("Todas as notificações foram excluídas com sucesso");
};

/**
 * Mark document-related notifications as read
 * @param userId User ID
 * @param documentId Document ID
 */
export const markDocumentNotificationsAsRead = async (userId: string, documentId?: string) => {
  if (!userId) throw new Error("User ID is required");
  
  console.log(`Marcando notificações de documento como lidas para usuário: ${userId} ${documentId ? `(documento: ${documentId})` : ''}`);
  
  let query = supabase
    .from('notifications')
    .update({ type: 'document_read' })
    .eq('user_id', userId)
    .eq('type', 'Novo Documento');
    
  // If a document ID is specified, only mark notifications for that document as read
  if (documentId) {
    // Assumes the document ID is contained in the message
    // This is a simple implementation - for a more robust solution, we might need to store document_id in notifications
    query = query.ilike('message', `%${documentId}%`);
  }
    
  const { error } = await query;
    
  if (error) {
    console.error("Erro ao marcar notificações como lidas:", error);
    throw error;
  }
  
  console.log("Notificações marcadas como lidas com sucesso");
};
