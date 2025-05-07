export interface Document {
  id: string;
  user_id: string;
  name: string;
  filename?: string;
  original_filename?: string;
  category: string;
  file_url: string;
  observations?: string;
  uploaded_at: string;
  expires_at: string | null;
  storage_key?: string;
  size?: number;
  type?: string;
  viewed?: boolean;
  viewed_at?: string;
}
