
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

