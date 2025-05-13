
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  type: string | null;
  created_at: string;
  read_at?: string | null;
}
