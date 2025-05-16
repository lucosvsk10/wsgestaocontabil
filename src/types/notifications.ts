
export interface Notification {
  id: string;
  user_id: string;
  message: string;
  created_at: string;
  read_at: string | null;
  type: string | null;
}
