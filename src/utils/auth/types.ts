
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
  original_filename?: string;
  file_url: string;
  filename?: string;
  category: string;
  subcategory?: string;  // Added subcategory field
  uploaded_at: string;
  observations?: string;
  expires_at: string | null;
  user_id: string;
  viewed: boolean;
  viewed_at?: string | null;
  type?: string;
  size?: number;
  storage_key?: string;
}

export interface AuthContextType {
  user: any | null;
  userData: UserData | null;
  isLoading: boolean;
  isAdmin?: boolean;
  role: 'admin' | 'user' | 'guest' | null; // Added the role property
  signIn: (email: string, password: string) => Promise<{
    error: Error | null;
    data: any | null;
  }>;
  signOut: () => Promise<{
    error: Error | null;
  }>;
  setUser?: React.Dispatch<React.SetStateAction<any | null>>;
  setUserData?: React.Dispatch<React.SetStateAction<UserData | null>>;
}
