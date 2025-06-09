
export interface CompanyData {
  id: string;
  user_id: string;
  name: string;
  cnpj: string;
  email: string;
  phone: string;
  address: string;
  opening_date: string;
  tax_regime: string;
  accountant_name: string;
  accountant_contact: string;
  created_at: string;
  updated_at: string;
  
  // Admin-only fields
  registration_status?: string | null;
  last_federal_update?: string | null;
  last_query_date?: string | null;
  internal_tags?: string[] | null;
  client_status?: string | null;
  internal_observations?: string | null;
  internal_responsible?: string | null;
}

export interface UserStats {
  totalDocuments: number;
  pendingDocuments: number;
  expiredDocuments: number;
  recentUploads: number;
}
