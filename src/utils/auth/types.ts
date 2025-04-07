
import { User } from '@supabase/supabase-js';

export interface UserData {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

export interface Document {
  id: string;
  name: string;
  file_url: string;
  uploaded_at: string;
}
