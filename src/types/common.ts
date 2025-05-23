
// Tipo centralizado de DocumentCategory
export interface DocumentCategory {
  id: string;
  name: string;
  color?: string;
  created_at?: string;
  icon_name?: string;
}

// Tipo centralizado de Document
export interface Document {
  id: string;
  name: string;
  category: string;
  filename: string;
  url: string;
  user_id: string;
  uploaded_at: string;
  expires_at?: string;
  original_filename?: string;
  size?: number;
  viewed?: boolean;
  observations?: string;
}
