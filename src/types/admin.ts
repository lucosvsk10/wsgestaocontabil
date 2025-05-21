
export interface UserType {
  id: string;
  name: string | null;
  email: string | null;
  role: string | null;
  created_at: string | null;
}

// Importando e exportando o tipo Document de auth/types.ts
import { Document } from "@/utils/auth/types";
export type { Document };
