
export interface UserType {
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
  user_id: string;
  uploaded_at: string;
  expires_at: string | null;
  category: string;
  size?: number;
  type?: string;
  original_filename?: string;
  filename?: string;
  storage_key?: string;
  viewed?: boolean;
}
