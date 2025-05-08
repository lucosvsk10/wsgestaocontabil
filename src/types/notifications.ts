
export interface Notification {
  id: string;
  user_id: string;
  document_id: string | null;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
}
