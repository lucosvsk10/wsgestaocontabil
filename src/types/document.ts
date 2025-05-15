export interface DocumentFormData {
  name: string;
  category: string;
  observations: string;
  file: File | null;
  expirationDate: Date | null;
  noExpiration: boolean;
}

export interface DocumentDisplayOptions {
  isLoading: boolean;
  showCategory?: boolean;
  showObservations?: boolean;
  showExpirationDate?: boolean;
  showActions?: boolean;
}

export interface DocumentSortOptions {
  field: 'name' | 'category' | 'uploaded_at' | 'expires_at';
  direction: 'asc' | 'desc';
}

export interface DocumentFilterOptions {
  category?: string | null;
  expirationStatus?: 'all' | 'active' | 'expired';
  search?: string;
}

export interface Document {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  file_url: string;
  original_filename?: string;
  type?: string;
  uploaded_at: string;
  expires_at?: string | null;
  user_id: string;
  size?: number;
  viewed?: boolean;
  viewed_at?: string | null;
  observations?: string;
  storage_key?: string;
  filename?: string;
}
