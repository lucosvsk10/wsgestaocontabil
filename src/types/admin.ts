
import { Document as AuthDocument } from "@/utils/auth/types";

export interface Document extends AuthDocument {
  id: string;
  name: string;
  original_filename?: string;
  filename?: string;
  file_url: string;
  uploaded_at: string;
  user_id: string;
  storage_key?: string;
  category: string;
  subcategory?: string;
  observations?: string;
  expires_at?: string | null;
  viewed?: boolean;
  size?: number;
}

export interface DocumentCategory {
  id: string;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

// Outros tipos existentes...
export type UserType = {
  id: string;
  email: string;
  name: string;
  role: string;
};
