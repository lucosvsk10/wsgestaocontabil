
export interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

// Import the Document type from utils/auth/types.ts instead of redefining it
import { Document } from "@/utils/auth/types";
export type { Document };

// Document interface is removed to prevent conflict
