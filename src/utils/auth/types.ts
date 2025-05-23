
import { Document as CommonDocument } from "@/types/common";

// Estendendo o tipo Document para manter compatibilidade com código existente
export interface Document extends CommonDocument {}

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

// Adicionando o tipo UserData que estava faltando
export interface UserData {
  id: string;
  email: string;
  name?: string;
  role?: string;
  created_at?: string;
}
