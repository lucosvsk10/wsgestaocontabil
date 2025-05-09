
export interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

export interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  user_metadata?: {
    name?: string;
  };
}

export interface UserTableProps {
  users: any[];
  userInfoList: any[];
  title: string;
  setSelectedUserId?: (id: string) => void;
  setSelectedUserForPasswordChange: (user: UserType) => void;
  passwordForm: any;
  refreshUsers: () => void;
  showDocumentButton?: boolean;
  isAdminSection?: boolean;
}

// Import the Document type from utils/auth/types.ts instead of redefining it
import { Document } from "@/utils/auth/types";
export type { Document };

// Document interface is removed to prevent conflict
