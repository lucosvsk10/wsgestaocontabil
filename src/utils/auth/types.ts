import { Document as CommonDocument } from "@/types/common";

// Estendendo o tipo Document para manter compatibilidade com código existente
export interface Document extends CommonDocument {}

// Adicionar a exportação de UserData
export type UserData = {
  id?: string;
  user_id?: string;
  name?: string;
  fullname?: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  created_at?: string;
};

// Outros tipos existentes no arquivo
export interface User {
  id: string;
  email: string;
  name?: string;
  role?: string;
}

export interface AuthState {
  user: User | null;
  loading: boolean;
  error: string | null;
}
