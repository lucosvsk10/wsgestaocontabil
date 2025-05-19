
export interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

// Renomeando a interface Document para AppDocument para evitar colisão com o DOM Document
import { Document as AppDocument } from "@/utils/auth/types";
export type { AppDocument };

