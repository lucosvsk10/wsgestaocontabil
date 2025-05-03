
export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  document_id: string | null;
  document_name: string | null;
  document_category: string | null;
  is_read: boolean;
  created_at: string;
}
