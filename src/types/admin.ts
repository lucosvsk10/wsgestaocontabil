
import { Document as CommonDocument } from "./common";

// Estendendo o tipo Document para manter compatibilidade com código existente
export interface Document extends CommonDocument {}

// Reexportando o tipo DocumentCategory corretamente
export type { DocumentCategory } from "./common";

// Outros tipos existentes...
export type UserType = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
};
