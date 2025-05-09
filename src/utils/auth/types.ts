
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

export interface UserData {
  id: string;
  email?: string;
  name?: string;
  role?: string;
  created_at?: string;
}

export interface AuthContextType {
  user: any | null;
  session: Session | null;
  userData: UserData | null;
  isLoading: boolean;
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data: any | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshUserData: () => Promise<void>;
  setUser: (user: any | null) => void;
  setUserData: (userData: UserData | null) => void;
}
