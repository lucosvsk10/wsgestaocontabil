export interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

// Re-export Document type from our main type module to avoid duplication
export type { Document } from "@/utils/auth/types";

export interface Document {
  id: string;
  name: string;
  user_id: string;
  size?: number;
  type?: string;
  file_url: string;
  uploaded_at: string;
  filename?: string;
  original_filename?: string;
  storage_key?: string;
  category: string;
  observations?: string | null;
  expires_at: string | null;
  viewed: boolean;
  viewed_at?: string | null;
}
