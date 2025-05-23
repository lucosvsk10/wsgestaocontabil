import { Document as CommonDocument, DocumentCategory } from "./common";

// Estendendo o tipo Document para manter compatibilidade com código existente
export interface Document extends CommonDocument {}

// Corrigir a re-exportação usando 'export type'
export type { Document } from './common';

// Exportando CategoryDocument para manter compatibilidade
export { DocumentCategory };

// Outros tipos existentes...
export type UserType = {
  id: string;
  email: string;
  name: string;
  role: string;
  created_at?: string;
};
