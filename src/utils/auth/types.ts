
export interface Document {
  id: string;
  name: string;
  original_filename?: string;
  file_url: string;
  filename?: string;
  category?: string;
  uploaded_at: string;
  observations?: string;
  expires_at: string | null;
  user_id: string;
  viewed?: boolean;
  type?: string;
  size?: number;
  storage_key?: string;
}

export interface AuthContextType {
  user: any | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    data: any | null;
  }>;
  signOut: () => Promise<{
    error: Error | null;
  }>;
}
