
/**
 * Tipos comuns compartilhados entre diferentes partes da aplicação
 */

export interface DocumentCategory {
  id: string;
  name: string;
  color?: string;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  name: string;
  original_filename?: string;
  filename?: string;
  file_url: string;
  uploaded_at: string;
  user_id: string;
  storage_key?: string;
  category: string; // ID da categoria
  categoryObject?: DocumentCategory; // Objeto da categoria para facilitar acesso
  subcategory?: string;
  observations?: string;
  expires_at?: string | null;
  viewed?: boolean;
  size?: number;
  viewed_at?: string | null;
  view_status?: string;
  status?: string; // Adicionado para controlar estados (active, expired, etc.)
}
