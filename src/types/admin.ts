
export interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

// Re-export Document type from our main type module to avoid duplication
export type { Document } from "@/utils/auth/types";
