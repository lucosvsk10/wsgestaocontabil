
// Export types
import { DocumentViewStatus } from "@/types/document";

export type UserRole = 'admin' | 'user' | 'guest';

export interface UserData {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  created_at: string;
  last_login?: string;
}

// Define UserType for use throughout admin components
export type UserType = {
  id: string;
  user_id?: string;
  name?: string;
  email?: string;
  role?: string;
  created_at?: string;
};

// Use export type to avoid conflict with DOM's Document
export type Document = {
  id: string;
  user_id: string;
  name: string;
  file_url: string;
  storage_key?: string; // Changed to optional to match common.ts
  category: string;
  subcategory?: string | null;
  observations?: string | null;
  expires_at?: string | null;
  uploaded_at: string;
  viewed_at?: string | null;
  original_filename?: string;
  filename?: string;
  size?: number;
  view_status?: DocumentViewStatus;
  viewed?: boolean;
};

export interface DocumentCategory {
  id: string;
  name: string;
  color?: string;
  created_at: string; // Changed from optional to required
  updated_at: string;
}
