
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
