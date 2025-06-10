
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  type: string | null;
}

// Define a database notification type that matches what Supabase sees
export type DatabaseNotification = {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  type: string | null;
};

// Tipos específicos para pop-ups de notificações
export interface NotificationPopupData {
  id: string;
  type: 'novo_documento' | 'agenda_fiscal';
  title: string;
  message: string;
  actionUrl: string;
  actionText: string;
  userId?: string; // Para documentos específicos
  documentId?: string;
  fiscalEventId?: string;
  createdAt: string;
}
